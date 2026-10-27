/*
 * Reading the text in a photo, on the device (Tesseract, WebAssembly). The worker, its core and the English data are
 * served from this site (`/ocr/`, copied there by the build); the photo never leaves the phone.
 */

import { mediaUrl } from '../mediaBase';
import { isNativeApp } from '../native/platform';

type Worker = { recognize: (image: Blob) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> };

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

/** A camera photo made small enough to read quickly (2000 px on the long side), in gray. */
async function prepared(file: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.filter = 'grayscale(1) contrast(1.3)';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), 'image/png'));
  } catch {
    return file;
  }
}

export async function readPhotoText(file: Blob, onProgress?: (share: number) => void): Promise<string> {
  if (isNativeApp()) return readNativePhotoText(file);
  progress = onProgress;
  try {
    const reader = await start();
    const { data } = await reader.recognize(await prepared(file));
    return data.text;
  } finally {
    progress = undefined;
  }
}
