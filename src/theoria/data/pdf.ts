import type { TheoriaChapter } from '../core/books';

/*
 * PDFs, read on this device with PDF.js (loaded only when a PDF is opened or added). Its worker is a file
 * of this site, so the security policy holds; eval stays off.
 */
type PdfModule = typeof import('pdfjs-dist');
let loading: Promise<PdfModule> | undefined;

export function pdfjs(): Promise<PdfModule> {
  loading ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([module, worker]) => {
    module.GlobalWorkerOptions.workerSrc = worker.default;
    return module;
  });
  return loading;
}

export async function openPdf(data: ArrayBuffer) {
  const lib = await pdfjs();
  return lib.getDocument({ data: new Uint8Array(data), isEvalSupported: false }).promise;
}

const PAGES_PER_PART = 10;

/**
 * The text of every page, in parts of ten pages ("Pages 1–10"), paragraphs kept where the lines break wide.
 * A scanned PDF has no text; it is still read page by page as pictures.
 */
export async function pdfText(data: ArrayBuffer): Promise<{ chapters: TheoriaChapter[]; pageCount: number; title?: string; author?: string }> {
  const doc = await openPdf(data);
  const meta = (await doc.getMetadata().catch(() => undefined))?.info as { Title?: string; Author?: string } | undefined;
  const pages: string[] = [];
  for (let number = 1; number <= doc.numPages; number += 1) {
    const page = await doc.getPage(number);
    const content = await page.getTextContent();
    let text = '';
    let lastY: number | undefined;
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = item.transform[5];
      if (lastY !== undefined && Math.abs(y - lastY) > (item.height || 10) * 1.8) text += '\n\n';
      else if (lastY !== undefined && y !== lastY) text += ' ';
      text += item.str;
      lastY = y;
    }
    pages.push(text.replace(/[ \t]+/g, ' ').replace(/ *\n\n */g, '\n\n').trim());
  }
  const chapters: TheoriaChapter[] = [];
  for (let start = 0; start < pages.length; start += PAGES_PER_PART) {
    const slice = pages.slice(start, start + PAGES_PER_PART);
    const content = slice.filter(Boolean).join('\n\n');
    if (!content) continue;
    const last = Math.min(start + PAGES_PER_PART, pages.length);
    chapters.push({ id: `pages-${start + 1}`, title: last > start + 1 ? `Pages ${start + 1}–${last}` : `Page ${start + 1}`, order: chapters.length + 1, location: `page:${start + 1}`, content });
  }
  await doc.destroy();
  return { chapters, pageCount: pages.length, title: meta?.Title?.trim() || undefined, author: meta?.Author?.trim() || undefined };
}
