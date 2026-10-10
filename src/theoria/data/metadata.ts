export type BookMetadata = {
  title?: string;
  author?: string;
  description?: string;
  publisher?: string;
  language?: string;
  publicationDate?: string;
  coverUrl?: string;
  coverFile?: File;
  sourceUrl?: string;
};

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  first_sentence?: string[];
  publisher?: string[];
  language?: string[];
};

type OpenLibraryWork = {
  description?: string | { value?: string };
  first_sentence?: string | { value?: string };
  covers?: number[];
};

function clean(value?: string): string | undefined {
  const text = value?.replace(/\s+/g, ' ').trim();
  return text || undefined;
}

function descriptionValue(value: OpenLibraryWork['description'] | OpenLibraryWork['first_sentence']): string | undefined {
  return typeof value === 'string' ? clean(value) : clean(value?.value);
}

function score(doc: OpenLibraryDoc, title: string, author: string): number {
  const expectedTitle = title.toLowerCase().trim();
  const candidateTitle = (doc.title ?? '').toLowerCase().trim();
  const expectedAuthor = author.toLowerCase().trim();
  const candidateAuthor = (doc.author_name ?? []).join(' ').toLowerCase();
  let value = 0;
  if (candidateTitle === expectedTitle) value += 12;
  else if (candidateTitle.includes(expectedTitle) || expectedTitle.includes(candidateTitle)) value += 6;
  if (expectedAuthor && candidateAuthor.includes(expectedAuthor)) value += 8;
  if (doc.cover_i) value += 3;
  if (doc.first_publish_year) value += 1;
  return value;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'book';
}

async function downloadCover(url: string, title: string): Promise<File | undefined> {
  try {
    const response = await fetch(url, { headers: { Accept: 'image/*' } });
    if (!response.ok) return undefined;
    const blob = await response.blob();
    return new File([blob], `${slug(title)}-cover.jpg`, { type: blob.type || 'image/jpeg' });
  } catch {
    return undefined;
  }
}

/** Looks up public bibliographic metadata and downloads the matching cover when available. */
export async function lookupBookMetadata(title: string, author = ''): Promise<BookMetadata> {
  const cleanTitle = clean(title);
  if (!cleanTitle) throw new Error('Enter a title before finding book details.');
  const params = new URLSearchParams({ title: cleanTitle, limit: '8', fields: 'key,title,author_name,first_publish_year,cover_i,first_sentence,publisher,language' });
  if (author.trim()) params.set('author', author.trim());
  const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Book details could not be found right now.');
  const payload = await response.json() as { docs?: OpenLibraryDoc[] };
  const docs = (payload.docs ?? []).filter((doc) => doc.title?.trim()).sort((a, b) => score(b, cleanTitle, author) - score(a, cleanTitle, author));
  const match = docs[0];
  if (!match?.title) throw new Error('No matching book was found.');

  let work: OpenLibraryWork | undefined;
  if (match.key?.startsWith('/works/')) {
    try {
      const workResponse = await fetch(`https://openlibrary.org${match.key}.json`, { headers: { Accept: 'application/json' } });
      if (workResponse.ok) work = await workResponse.json() as OpenLibraryWork;
    } catch {
      work = undefined;
    }
  }
  const coverId = match.cover_i ?? work?.covers?.[0];
  const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : undefined;
  const description = descriptionValue(work?.description) ?? descriptionValue(work?.first_sentence) ?? clean(match.first_sentence?.[0]);
  const resolvedTitle = clean(match.title) ?? cleanTitle;
  const metadata: BookMetadata = {
    title: resolvedTitle,
    author: clean(match.author_name?.[0]) ?? clean(author),
    description,
    publisher: clean(match.publisher?.[0]),
    language: clean(match.language?.[0]),
    publicationDate: match.first_publish_year ? String(match.first_publish_year) : undefined,
    coverUrl,
    sourceUrl: match.key ? `https://openlibrary.org${match.key}` : undefined,
  };
  if (coverUrl) metadata.coverFile = await downloadCover(coverUrl, resolvedTitle);
  return metadata;
}
