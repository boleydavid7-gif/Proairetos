import { strFromU8, unzipSync } from 'fflate';
import { validateImportFile } from './cloudStorage';
import type { TheoriaChapter } from '../core/books';
import { splitText } from './files';
import { pdfText } from './pdf';

export type ImportedReading = {
  title?: string;
  author?: string;
  publisher?: string;
  language?: string;
  contentFormat: 'text' | 'markdown' | 'epub' | 'pdf';
  contentPreview?: string;
  chapters?: TheoriaChapter[];
  coverFile?: File;
  pageCount?: number;
};

/** A few lines to recognise the book by; the whole text is kept on this device, never in the record. */
export const PREVIEW_LENGTH = 600;

function extension(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() ?? '';
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/\s([,.;!?])/g, '$1').trim();
}

function filePath(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash < 0 ? '' : path.slice(0, slash + 1);
}

function resolvePath(base: string, target: string): string {
  const parts = `${base}${target}`.split('/');
  const out: string[] = [];
  parts.forEach((part) => { if (!part || part === '.') return; if (part === '..') out.pop(); else out.push(part); });
  return out.join('/');
}

function xmlText(document: Document, names: string[]): string | undefined {
  for (const name of names) {
    const node = document.querySelector(name) ?? document.getElementsByTagNameNS('*', name)[0];
    if (node?.textContent?.trim()) return cleanText(node.textContent);
  }
  return undefined;
}

function htmlText(value: string): string {
  const document = new DOMParser().parseFromString(value, 'text/html');
  document.querySelectorAll('script,style,nav').forEach((node) => node.remove());
  const blocks = [...document.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote')]
    .map((node) => cleanText(node.textContent ?? ''))
    .filter(Boolean);
  return (blocks.length ? blocks : [cleanText(document.body.textContent ?? '')]).join('\n\n').trim();
}

function htmlTitle(value: string, fallback: string): string {
  const document = new DOMParser().parseFromString(value, 'text/html');
  const node = document.querySelector('h1,h2,h3,title');
  const title = cleanText(node?.textContent ?? '');
  return title.slice(0, 120) || fallback;
}

async function inspectText(file: File, format: 'text' | 'markdown'): Promise<ImportedReading> {
  const text = (await file.text()).replace(/\r\n/g, '\n').trim();
  return { contentFormat: format, contentPreview: text.slice(0, PREVIEW_LENGTH) || undefined, chapters: splitText(text, format === 'markdown') };
}

async function inspectEpub(file: File): Promise<ImportedReading> {
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const container = archive['META-INF/container.xml'];
  if (!container) throw new Error('This EPUB is missing its container metadata.');
  const containerDocument = new DOMParser().parseFromString(strFromU8(container), 'application/xml');
  const rootfile = containerDocument.querySelector('rootfile')?.getAttribute('full-path');
  if (!rootfile || !archive[rootfile]) throw new Error('This EPUB does not contain a readable package file.');
  const opfDocument = new DOMParser().parseFromString(strFromU8(archive[rootfile]), 'application/xml');
  const metadata = opfDocument.querySelector('metadata');
  const manifest = new Map<string, { href: string; mediaType: string }>();
  opfDocument.querySelectorAll('manifest item').forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) manifest.set(id, { href: resolvePath(filePath(rootfile), decodeURIComponent(href.split('#')[0])), mediaType: item.getAttribute('media-type') ?? '' });
  });
  const chapters: TheoriaChapter[] = [];
  const chapterText: string[] = [];
  opfDocument.querySelectorAll('spine itemref').forEach((item, index) => {
    const id = item.getAttribute('idref');
    const entry = id ? manifest.get(id) : undefined;
    const archiveValue = entry && archive[entry.href];
    if (!entry || !archiveValue) return;
    const source = strFromU8(archiveValue);
    const text = htmlText(source);
    if (!text) return;
    const title = htmlTitle(source, `Chapter ${index + 1}`);
    chapters.push({ id: id ?? `chapter-${index + 1}`, title, order: index + 1, location: entry.href, content: text });
    chapterText.push(text);
  });
  const coverMeta = [...opfDocument.querySelectorAll('metadata meta')].find((meta) => meta.getAttribute('name')?.toLowerCase() === 'cover');
  const coverId = coverMeta?.getAttribute('content') ?? [...manifest.keys()].find((id) => /cover/i.test(id));
  const coverEntry = coverId ? manifest.get(coverId) : undefined;
  const coverBytes = coverEntry ? archive[coverEntry.href] : undefined;
  const coverFile = coverEntry && coverBytes
    ? new File([coverBytes], `cover.${coverEntry.mediaType.split('/')[1] || 'jpg'}`, { type: coverEntry.mediaType || 'image/jpeg' })
    : undefined;
  return {
    contentFormat: 'epub',
    title: metadata ? xmlText(metadata.ownerDocument!, ['dc\\:title', 'title']) : undefined,
    author: metadata ? xmlText(metadata.ownerDocument!, ['dc\\:creator', 'creator']) : undefined,
    publisher: metadata ? xmlText(metadata.ownerDocument!, ['dc\\:publisher', 'publisher']) : undefined,
    language: metadata ? xmlText(metadata.ownerDocument!, ['dc\\:language', 'language']) : undefined,
    chapters,
    contentPreview: chapterText.join('\n\n').slice(0, PREVIEW_LENGTH) || undefined,
    coverFile,
  };
}

export async function inspectReadingFile(file: File): Promise<ImportedReading> {
  validateImportFile(file);
  const kind = extension(file);
  if (kind === 'txt') return inspectText(file, 'text');
  if (kind === 'md') return inspectText(file, 'markdown');
  if (kind === 'epub') return inspectEpub(file);
  const read = await pdfText(await file.arrayBuffer());
  const preview = read.chapters.map((chapter) => chapter.content ?? '').join('\n\n').slice(0, PREVIEW_LENGTH);
  return { contentFormat: 'pdf', title: read.title, author: read.author, chapters: read.chapters, pageCount: read.pageCount, contentPreview: preview || undefined };
}

/** Reads a private cloud source after the app has received its signed URL. */
export async function inspectReadingBuffer(buffer: ArrayBuffer, fileName: string, fileType = ''): Promise<ImportedReading> {
  const file = new File([buffer], fileName, { type: fileType || (fileName.toLowerCase().endsWith('.epub') ? 'application/epub+zip' : 'text/plain') });
  return inspectReadingFile(file);
}
