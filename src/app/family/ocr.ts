/*
 * Reading the text in a photo, on the device (Tesseract, WebAssembly). The worker, its core and the English data are
 * served from this site (`/ocr/`, copied there by the build); the photo never leaves the phone.
 *
 * A photo is straightened and made black on white by the light around each pixel (`core/ocr/image.ts`), then read; if
 * what was read gives the form nothing (`accept`), it is read again as one block of text and then as a single column
 * from the plain gray picture. A PDF's own text is used when it has any, else its first page is read as a picture.
 */
import { adaptiveThreshold, skewDegrees, toGray } from '../../core/ocr/image';

import { mediaUrl } from '../mediaBase';
import { isNativeApp } from '../native/platform';

type Worker = { recognize: (image: Blob) => Promise<{ data: { text: string } }>; setParameters: (parameters: Record<string, string>) => Promise<unknown>; terminate: () => Promise<unknown> };

let worker: Promise<Worker> | null = null;
let progress: ((share: number) => void) | undefined;

async function asBase64(file: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the photo.'));
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('Could not prepare the photo for OCR.');
  return dataUrl.slice(comma + 1);
}

/** Uses Apple Vision on iOS and ML Kit on Android through the Capacitor plugin. */
async function readNativePhotoText(file: Blob): Promise<string> {
  const { ocr } = await import('capacitor-vision');
  const result = await ocr.scan({ image: await asBase64(file) });
  return result.text.join('\n');
}

function start(): Promise<Worker> {
  worker ??= import('tesseract.js').then(({ createWorker }) =>
    createWorker('eng', 1, {
      workerPath: mediaUrl('/ocr/worker.min.js'),
      corePath: mediaUrl('/ocr'),
      langPath: mediaUrl('/ocr'),
      workerBlobURL: false,
      logger: (message: { status: string; progress: number }) => {
        if (message.status === 'recognizing text') progress?.(message.progress);
      },
    }) as unknown as Promise<Worker>,
  ).catch((cause) => {
    worker = null;
    throw cause;
  });
  return worker;
}

const LONG_SIDE = 2000;

function canvasOf(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] | undefined {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  return context ? [canvas, context] : undefined;
}

const toBlob = (canvas: HTMLCanvasElement, fallback: Blob) => new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob ?? fallback), 'image/png'));

/** One picture ready to read, and the same picture in plain gray for a second try. */
async function prepared(file: Blob): Promise<{ clean: Blob; plain: Blob }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, LONG_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    const first = canvasOf(width, height);
    if (!first) return { clean: file, plain: file };
    first[1].drawImage(bitmap, 0, 0, first[0].width, first[0].height);
    const flat = first[1].getImageData(0, 0, first[0].width, first[0].height);
    const binary = adaptiveThreshold(toGray(flat.data), flat.width, flat.height);
    const angle = skewDegrees(binary, flat.width, flat.height);
    // Turn the picture level on a white page big enough to hold it.
    const turn = (angle * Math.PI) / 180;
    const wide = Math.abs(width * Math.cos(turn)) + Math.abs(height * Math.sin(turn));
    const tall = Math.abs(width * Math.sin(turn)) + Math.abs(height * Math.cos(turn));
    const level = canvasOf(wide, tall);
    if (!level) return { clean: file, plain: file };
    const [levelCanvas, levelContext] = level;
    levelContext.fillStyle = '#fff';
    levelContext.fillRect(0, 0, levelCanvas.width, levelCanvas.height);
    levelContext.translate(levelCanvas.width / 2, levelCanvas.height / 2);
    levelContext.rotate(turn);
    levelContext.drawImage(bitmap, (-width) / 2, (-height) / 2, width, height);
    bitmap.close();
    levelContext.setTransform(1, 0, 0, 1, 0, 0);
    const picture = levelContext.getImageData(0, 0, levelCanvas.width, levelCanvas.height);
    const gray = toGray(picture.data);
    const clean = adaptiveThreshold(gray, picture.width, picture.height);
    const plainPixels = new Uint8ClampedArray(picture.data.length);
    const cleanPixels = new Uint8ClampedArray(picture.data.length);
    for (let i = 0, j = 0; j < gray.length; i += 4, j += 1) {
      // A little more contrast than the camera gave, for the plain try.
      const stretched = Math.max(0, Math.min(255, (gray[j] - 128) * 1.3 + 128));
      plainPixels.set([stretched, stretched, stretched, 255], i);
      cleanPixels.set([clean[j], clean[j], clean[j], 255], i);
    }
    levelContext.putImageData(new ImageData(plainPixels, picture.width, picture.height), 0, 0);
    const plain = await toBlob(levelCanvas, file);
    levelContext.putImageData(new ImageData(cleanPixels, picture.width, picture.height), 0, 0);
    return { clean: await toBlob(levelCanvas, file), plain };
  } catch {
    return { clean: file, plain: file };
  }
}

/** The passes, in order: black on white as it came, as one block of text, a single column from the plain gray. */
const PASSES: { picture: 'clean' | 'plain'; mode: string }[] = [
  { picture: 'clean', mode: '3' },
  { picture: 'clean', mode: '6' },
  { picture: 'plain', mode: '4' },
];

const isPdf = (file: Blob & { name?: string }) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name ?? '');

async function readPicture(file: Blob, onProgress?: (share: number) => void, accept?: (text: string) => boolean): Promise<string> {
  if (isNativeApp()) return readNativePhotoText(file);
  progress = onProgress;
  try {
    const reader = await start();
    const pictures = await prepared(file);
    let first: string | undefined;
    for (const [index, pass] of PASSES.entries()) {
      progress = (share) => onProgress?.((index + share) / PASSES.length);
      await reader.setParameters({ tessedit_pageseg_mode: pass.mode });
      const { data } = await reader.recognize(pictures[pass.picture]);
      first ??= data.text;
      if (!accept || accept(data.text)) return data.text;
    }
    return first ?? '';
  } finally {
    progress = undefined;
  }
}

/** A PDF's text (first two pages), or, when it is a scan with none, its first page drawn and read like a photo. */
async function readPdf(file: Blob, onProgress?: (share: number) => void, accept?: (text: string) => boolean): Promise<string> {
  const { openPdf } = await import('../../theoria/data/pdf');
  const doc = await openPdf(await file.arrayBuffer());
  let text = '';
  for (let number = 1; number <= Math.min(2, doc.numPages); number += 1) {
    const page = await doc.getPage(number);
    const content = await page.getTextContent();
    let lastY: number | undefined;
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = item.transform[5];
      if (lastY !== undefined && Math.abs(y - lastY) > 2) text += '\n';
      else if (lastY !== undefined) text += ' ';
      text += item.str;
      lastY = y;
    }
    text += '\n';
  }
  if (text.replace(/\s/g, '').length >= 30 && (!accept || accept(text))) return text;
  const page = await doc.getPage(1);
  const view = page.getViewport({ scale: 2 });
  const drawn = canvasOf(view.width, view.height);
  if (!drawn) return text;
  await page.render({ canvasContext: drawn[1], viewport: view }).promise;
  const picture = await toBlob(drawn[0], file);
  const read = await readPicture(picture, onProgress, accept);
  return read.replace(/\s/g, '').length > text.replace(/\s/g, '').length ? read : text;
}

/** The words in a photo or a PDF. `accept` says whether what was read is enough, or another try is made. */
export async function readPhotoText(file: Blob, onProgress?: (share: number) => void, accept?: (text: string) => boolean): Promise<string> {
  return isPdf(file) ? readPdf(file, onProgress, accept) : readPicture(file, onProgress, accept);
}
