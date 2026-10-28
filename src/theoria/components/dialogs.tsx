import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { TheoriaBook, TheoriaProvider, TheoriaSource, TheoriaReflection, TheoriaNotebook } from '../core/books';
import type { ReaderSelection } from './views';
import type { BookMetadata } from '../data/metadata';
import { inspectReadingFile } from '../data/importers';
import { Sym } from '../../lamplight/icons';
import { Waiting } from '../../lamplight/Waiting';
import MoreDetails from '../../app/family/MoreDetails';

export type NewBookForm = { title: string; author: string; description: string; source: TheoriaSource; provider: TheoriaProvider; sourceUrl: string; fileName?: string; file?: File; coverUrl?: string; coverFile?: File; publisher?: string; language?: string; publicationDate?: string; categories: string[] };
export type InsightKind = 'highlight' | 'note' | 'reflection';
export type InsightDraft = { id?: string; text: string; location?: string; chapter?: string; answers?: TheoriaReflection['answers']; toReflect?: boolean };
export type NotePageDraft = { notebookId: string; sectionId: string; title: string; body: string; bookId?: string; chapterId?: string };

export function AddBookDialog({ onClose, onSave, onMany, onLookup, initialFile }: { onClose: () => void; onSave: (form: NewBookForm) => Promise<void>; onMany: (files: File[]) => void; onLookup: (title: string, author: string) => Promise<BookMetadata>; initialFile?: File }) {
  const folderInput = useRef<HTMLInputElement>(null);
  const manyInput = useRef<HTMLInputElement>(null);
  // React has no prop for choosing a folder; the attribute is set on the element itself.
  useEffect(() => {
    folderInput.current?.setAttribute('webkitdirectory', '');
  }, []);
  const many = (list: FileList | null) => {
    const files = [...(list ?? [])];
    if (files.length) onMany(files);
  };
  const [source, setSource] = useState<TheoriaSource>('upload');
  const [provider, setProvider] = useState<TheoriaProvider>('google-drive');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [fileName, setFileName] = useState<string>();
  const [file, setFile] = useState<File>();
  const [category, setCategory] = useState('Personal');
  const [coverUrl, setCoverUrl] = useState<string>();
  const [coverFile, setCoverFile] = useState<File>();
  const [publisher, setPublisher] = useState<string>();
  const [language, setLanguage] = useState<string>();
  const [publicationDate, setPublicationDate] = useState<string>();
  const [metadataFound, setMetadataFound] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!title.trim() || (source === 'upload' && !file)) return; setSaving(true); try { await onSave({ title, author, description, source, provider, sourceUrl, fileName, file: source === 'upload' ? file : undefined, coverUrl, coverFile, publisher, language, publicationDate, categories: [category] }); } finally { setSaving(false); } };
  const filePicked = (event: React.ChangeEvent<HTMLInputElement>) => pick(event.target.files?.[0]);
  // A book opened with Theoria on a computer arrives already chosen.
  useEffect(() => {
    if (initialFile) pick(initialFile);
  }, [initialFile]);
  function pick(picked: File | undefined) {
    if (!picked) return;
    setFileName(picked.name);
    setFile(picked);
    // A file named "Title - Author" gives both; otherwise the name, tidied, stands in for the title.
    const bare = picked.name.replace(/\.(epub|pdf|txt|md)$/i, '');
    const parts = bare.split(/\s+[-–]\s+/);
    const tidy = (words: string) => words.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
    const fromName = tidy(parts.length === 2 ? parts[0] : bare.replace(/-+/g, ' '));
    if (!title) setTitle(fromName);
    if (parts.length === 2) setAuthor((current) => current || tidy(parts[1]));
    // The book's own title and author are better than its file name; fill them in unless the reader has typed something.
    void inspectReadingFile(picked)
      .then((found) => {
        if (found.title) setTitle((current) => (!current || current === fromName ? (found.title as string) : current));
        if (found.author) setAuthor((current) => current || (found.author as string));
      })
      .catch(() => undefined);
  }
  const findDetails = async () => { if (!title.trim()) return; setLookingUp(true); setLookupError(''); try { const metadata = await onLookup(title, author); setTitle(metadata.title ?? title); setAuthor(metadata.author ?? author); setDescription((current) => current.trim() || metadata.description || ''); setCoverUrl(metadata.coverUrl); setCoverFile(metadata.coverFile); setPublisher(metadata.publisher); setLanguage(metadata.language); setPublicationDate(metadata.publicationDate); setMetadataFound(true); } catch (error) { setLookupError(error instanceof Error ? error.message : 'Book details could not be found.'); } finally { setLookingUp(false); } };
  const ACCEPT = '.epub,.pdf,.txt,.md,text/plain,text/markdown,application/pdf,application/epub+zip';
  // The file comes first: choosing it fills the title and author, so a book is added in two taps. The rest waits
  // under More details. A link (cloud, web, manual) asks for the link first in the same way.
  const ready = source === 'upload' ? Boolean(file) : true;
  return (
    <Modal onClose={onClose}>
      <form className="theoria-modal" onSubmit={submit}>
        <button type="button" className="theoria-modal-close" onClick={onClose} aria-label="Close"><Sym name="close" /></button>
        <h2>Add a book</h2>
        <div className="theoria-source-tabs">
          {(['upload', 'cloud', 'web', 'manual'] as const).map((kind) => <button type="button" key={kind} className={source === kind ? 'is-active' : ''} onClick={() => setSource(kind)}>{kind === 'upload' ? 'A file' : kind === 'cloud' ? 'Cloud link' : kind === 'web' ? 'Web article' : 'Manual'}</button>)}
        </div>
        {source === 'upload' && (
          <>
            <label className={'theoria-pick' + (file ? ' has-file' : '')}>
              <Sym name={file ? 'check' : 'plus'} size={22} />
              <span className="theoria-pick__words"><strong>{fileName ?? 'Choose a file'}</strong><small>{file ? 'Choose another' : 'EPUB, PDF, text or Markdown'}</small></span>
              <input type="file" accept={ACCEPT} onChange={filePicked} />
            </label>
            {!file && (
              <div className="theoria-add-many">
                <span>Or many at once</span>
                <button type="button" className="theoria-secondary-button" onClick={() => manyInput.current?.click()}>Several files</button>
                <button type="button" className="theoria-secondary-button" onClick={() => folderInput.current?.click()}>A whole folder</button>
                <input ref={manyInput} type="file" multiple hidden accept={ACCEPT} onChange={(event) => { many(event.target.files); event.target.value = ''; }} />
                <input ref={folderInput} type="file" multiple hidden onChange={(event) => { many(event.target.files); event.target.value = ''; }} />
              </div>
            )}
          </>
        )}
        {source === 'cloud' && <><label>Share link<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." /></label><label>Storage<select value={provider} onChange={(event) => setProvider(event.target.value as TheoriaProvider)}><option value="google-drive">Google Drive</option><option value="dropbox">Dropbox</option><option value="onedrive">OneDrive</option><option value="other">Other cloud storage</option></select></label></>}
        {source === 'web' && <label>Article link<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." /></label>}
        {source === 'manual' && <label>Reading link (optional)<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." /></label>}
        {ready && (
          <>
            <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Book title" /></label>
            <label>Author (optional)<input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Author name" /></label>
            <MoreDetails>
              <div className="theoria-metadata-actions"><button type="button" className="theoria-secondary-button" onClick={() => void findDetails()} disabled={lookingUp || !title.trim()}>{lookingUp ? <Waiting>Finding details…</Waiting> : 'Find cover and details'}</button>{metadataFound && <span>Details added</span>}</div>
              {lookupError && <p className="theoria-form-error" role="alert">{lookupError}</p>}
              {coverUrl && <div className="theoria-metadata-preview"><img src={coverUrl} alt="" /><span><strong>{title}</strong><small>{publisher ?? 'Cover found'}</small></span></div>}
              <label>Description (optional)<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A short description for your shelf" /></label>
              <label>Collection<select value={category} onChange={(event) => setCategory(event.target.value)}>{['Philosophy', 'Science', 'Psychology', 'History', 'Leadership', 'Personal'].map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
            </MoreDetails>
          </>
        )}
        <div className="theoria-modal-actions"><button type="button" className="theoria-secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="theoria-primary-button" disabled={saving || !title.trim() || (source === 'upload' && !file)}>{saving ? 'Adding…' : 'Add to library'}</button></div>
      </form>
    </Modal>
  );
}

export type BookDetailsDraft = { title: string; author: string; description: string };

export function EditBookDialog({ book, onClose, onSave }: { book: TheoriaBook; onClose: () => void; onSave: (draft: BookDetailsDraft) => Promise<void> }) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author ?? '');
  const [description, setDescription] = useState(book.description ?? '');
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!title.trim()) return; setSaving(true); try { await onSave({ title: title.trim(), author: author.trim(), description: description.trim() }); } finally { setSaving(false); } };
  return <Modal onClose={onClose}><form className="theoria-modal" onSubmit={submit}><button type="button" className="theoria-modal-close" onClick={onClose} aria-label="Close"><Sym name="close" /></button><h2>Edit details</h2><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label><label>Author<input value={author} onChange={(event) => setAuthor(event.target.value)} /></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A short description for your shelf" /></label><div className="theoria-modal-actions"><button type="button" className="theoria-secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="theoria-primary-button" disabled={saving || !title.trim()}>{saving ? <Waiting>Saving…</Waiting> : 'Save details'}</button></div></form></Modal>;
}

export function CaptureDialog({ kind, selection, initial, onClose, onSave }: { kind: InsightKind; selection?: ReaderSelection; initial?: InsightDraft; onClose: () => void; onSave: (kind: InsightKind, draft: InsightDraft) => Promise<void> }) {
  const [text, setText] = useState(initial?.text ?? selection?.text ?? '');
  const [location, setLocation] = useState(initial?.location ?? selection?.location ?? '');
  const [answers, setAnswers] = useState<TheoriaReflection['answers']>(initial?.answers ?? {});
  const [saving, setSaving] = useState(false);
  const [toReflect, setToReflect] = useState(false);
  const updateAnswer = (key: keyof NonNullable<TheoriaReflection['answers']>, value: string) => setAnswers((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!text.trim() && kind !== 'reflection') return; setSaving(true); try { await onSave(kind, { text: text.trim(), location: location.trim() || undefined, chapter: selection?.chapterTitle, answers, toReflect }); } finally { setSaving(false); } };
  const label = kind === 'highlight' ? 'Passage' : kind === 'note' ? 'Note' : 'Reflection';
  return <Modal onClose={onClose}><form className="theoria-modal theoria-capture-modal" onSubmit={submit}><button type="button" className="theoria-modal-close" onClick={onClose} aria-label="Close"><Sym name="close" /></button><h2>{kind === 'highlight' ? 'New highlight' : kind === 'note' ? 'New note' : 'New reflection'}</h2>{selection?.chapterTitle && <p className="theoria-modal-intro">{selection.chapterTitle + ' · ' + selection.location}</p>}<label>{label}<textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={kind === 'highlight' ? 'Selected passage' : kind === 'note' ? 'What did you notice?' : 'Write freely. A reflection can be brief.'} autoFocus /></label>{kind === 'reflection' && <div className="theoria-reflection-prompts"><label>What stood out?<textarea value={answers?.stoodOut ?? ''} onChange={(event) => updateAnswer('stoodOut', event.target.value)} /></label><label>Why did this catch your attention?<textarea value={answers?.why ?? ''} onChange={(event) => updateAnswer('why', event.target.value)} /></label><label>What does this challenge?<textarea value={answers?.challenge ?? ''} onChange={(event) => updateAnswer('challenge', event.target.value)} /></label><label>How does this apply?<textarea value={answers?.apply ?? ''} onChange={(event) => updateAnswer('apply', event.target.value)} /></label><label>What do I want to remember?<textarea value={answers?.remember ?? ''} onChange={(event) => updateAnswer('remember', event.target.value)} /></label></div>}{kind === 'reflection' && !initial?.id && <label className="theoria-check"><input type="checkbox" checked={toReflect} onChange={(event) => setToReflect(event.target.checked)} /> Also keep a line in Proairetos Reflect</label>}{kind === 'highlight' && <label>Location <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Chapter or paragraph" /></label>}<div className="theoria-modal-actions"><button type="button" className="theoria-secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="theoria-primary-button" disabled={saving || (!text.trim() && kind !== 'reflection')}>{saving ? <Waiting>Saving…</Waiting> : 'Save ' + label.toLowerCase()}</button></div></form></Modal>;
}

export function NotebookDialog({ onClose, onSave }: { onClose: () => void; onSave: (title: string, section: string) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [section, setSection] = useState('Notes');
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!title.trim()) return; setSaving(true); try { await onSave(title.trim(), section.trim() || 'Notes'); } finally { setSaving(false); } };
  return <Modal onClose={onClose}><form className="theoria-modal" onSubmit={submit}><button type="button" className="theoria-modal-close" onClick={onClose} aria-label="Close"><Sym name="close" /></button><h2>New notebook</h2><label>Notebook title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A subject or question" autoFocus /></label><label>First section<input value={section} onChange={(event) => setSection(event.target.value)} placeholder="A section name" /></label><div className="theoria-modal-actions"><button type="button" className="theoria-secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="theoria-primary-button" disabled={saving || !title.trim()}>Create notebook</button></div></form></Modal>;
}

export function NotePageDialog({ notebooks, shelf, current, onClose, onSave }: { notebooks: readonly TheoriaNotebook[]; shelf: readonly TheoriaBook[]; current?: NotePageDraft & { id?: string }; onClose: () => void; onSave: (draft: NotePageDraft & { id?: string }) => Promise<void> }) {
  const firstNotebook = notebooks[0];
  const [notebookId, setNotebookId] = useState(current?.notebookId ?? firstNotebook?.id ?? '');
  const notebook = notebooks.find((item) => item.id === notebookId) ?? firstNotebook;
  const [sectionId, setSectionId] = useState(current?.sectionId ?? notebook?.sections[0]?.id ?? '');
  const [title, setTitle] = useState(current?.title ?? '');
  const [body, setBody] = useState(current?.body ?? '');
  const [bookId, setBookId] = useState(current?.bookId ?? '');
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!title.trim() || !notebookId || !sectionId) return; setSaving(true); try { await onSave({ id: current?.id, notebookId, sectionId, title: title.trim(), body, bookId: bookId || undefined }); } finally { setSaving(false); } };
  const insert = (value: string) => setBody((currentBody) => currentBody + (currentBody ? '\\n' : '') + value);
  return <Modal onClose={onClose}><form className="theoria-modal theoria-note-editor" onSubmit={submit}><button type="button" className="theoria-modal-close" onClick={onClose} aria-label="Close"><Sym name="close" /></button><h2>{current ? 'Edit page' : 'New page'}</h2><label>Notebook<select value={notebookId} onChange={(event) => { setNotebookId(event.target.value); setSectionId(notebooks.find((item) => item.id === event.target.value)?.sections[0]?.id ?? ''); }}>{notebooks.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label><label>Section<select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>{notebook?.sections.map((section) => <option value={section.id} key={section.id}>{section.title}</option>)}</select></label><label>Related book <select value={bookId} onChange={(event) => setBookId(event.target.value)}><option value="">Personal note</option>{shelf.map((book) => <option value={book.id} key={book.id}>{book.title}</option>)}</select></label><label>Page title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A thought to keep" autoFocus /></label><div className="theoria-editor-toolbar"><button type="button" onClick={() => insert('**bold**')}>Bold</button><button type="button" onClick={() => insert('> quote')}>Quote</button><button type="button" onClick={() => insert('- list item')}>List</button></div><label>Page body<textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write what you are learning…" /></label><div className="theoria-modal-actions"><button type="button" className="theoria-secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="theoria-primary-button" disabled={saving || !title.trim() || !notebookId || !sectionId}>{saving ? <Waiting>Saving…</Waiting> : 'Save page'}</button></div></form></Modal>;
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div className="theoria-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>{children}</div>;
}
