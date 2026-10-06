import { useState } from 'react';
import type React from 'react';
import type { TheoriaBook, TheoriaProvider, TheoriaSource } from '../core/books';

export type NewBookForm = { title: string; author: string; source: TheoriaSource; provider: TheoriaProvider; sourceUrl: string; fileName?: string; file?: File; categories: string[] };
export type InsightKind = 'highlight' | 'note' | 'reflection';

export function AddBookDialog({ onClose, onSave }: { onClose: () => void; onSave: (form: NewBookForm) => Promise<void> }) {
  const [source, setSource] = useState<TheoriaSource>('cloud');
  const [provider, setProvider] = useState<TheoriaProvider>('google-drive');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [fileName, setFileName] = useState<string>();
  const [file, setFile] = useState<File>();
  const [category, setCategory] = useState('Philosophy');
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title, author, source, provider, sourceUrl, fileName, file: source === 'upload' ? file : undefined, categories: [category] });
    setSaving(false);
  };
  const filePicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFile(file);
    if (!title) setTitle(file.name.replace(/\.(epub|pdf|txt|md)$/i, '').replace(/[-_]+/g, ' '));
  };
  return <Modal onClose={onClose}><form className="theoria-modal" onSubmit={submit}><button type="button" className="theoria-modal-close" onClick={onClose} aria-label="Close">×</button><p className="theoria-eyebrow">New source</p><h2>Add to your library.</h2><p className="theoria-modal-intro">Keep the source here; the original file or link stays where you own it.</p><div className="theoria-source-tabs">{(['cloud', 'web', 'upload', 'manual'] as const).map((kind) => <button type="button" key={kind} className={source === kind ? 'is-active' : ''} onClick={() => setSource(kind)}>{kind === 'cloud' ? 'Cloud link' : kind === 'web' ? 'Web article' : kind === 'upload' ? 'Import file' : 'Manual'}</button>)}</div><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Meditations" autoFocus /></label><label>Author <span>optional</span><input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Marcus Aurelius" /></label><label>Collection<select value={category} onChange={(event) => setCategory(event.target.value)}>{['Philosophy', 'Science', 'Psychology', 'History', 'Leadership', 'Personal'].map((item) => <option value={item} key={item}>{item}</option>)}</select></label>{source === 'cloud' && <><label>Storage provider<select value={provider} onChange={(event) => setProvider(event.target.value as TheoriaProvider)}><option value="google-drive">Google Drive</option><option value="dropbox">Dropbox</option><option value="onedrive">OneDrive</option><option value="other">Other cloud storage</option></select></label><label>Share link<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://drive.google.com/..." /></label></>}{source === 'web' && <label>Article link<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." /></label>}{source === 'upload' && <label>EPUB, PDF, TXT, or Markdown<input type="file" accept=".epub,.pdf,.txt,.md,text/plain,text/markdown,application/pdf,application/epub+zip" onChange={filePicked} /><small>{fileName ?? 'Choose a file to keep a reference on your shelf.'}</small></label>}{source === 'manual' && <label>Reading link <span>optional</span><input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." /></label>}<div className="theoria-modal-actions"><button type="button" className="theoria-secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="theoria-primary-button" disabled={saving || !title.trim()}>{saving ? 'Adding…' : 'Add to library'}</button></div></form></Modal>;
}

export function InsightDialog({ shelf, onClose, onSave }: { shelf: readonly TheoriaBook[]; onClose: () => void; onSave: (bookId: string, kind: InsightKind, text: string, location?: string) => Promise<void> }) {
  const [bookId, setBookId] = useState(shelf[0]?.id ?? '');
  const [kind, setKind] = useState<InsightKind>('highlight');
  const [text, setText] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!bookId || !text.trim()) return; setSaving(true); await onSave(bookId, kind, text.trim(), location.trim()); setSaving(false); };
  return <Modal onClose={onClose}><form className="theoria-modal" onSubmit={submit}><button type="button" className="theoria-modal-close" onClick={onClose} aria-label="Close">×</button><p className="theoria-eyebrow">Keep an idea</p><h2>Capture what stayed.</h2><p className="theoria-modal-intro">Save a passage or your own thought beside the source it belongs to.</p><div className="theoria-source-tabs">{(['highlight', 'note', 'reflection'] as const).map((item) => <button type="button" className={kind === item ? 'is-active' : ''} onClick={() => setKind(item)} key={item}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div><label>Source<select value={bookId} onChange={(event) => setBookId(event.target.value)}>{shelf.map((book) => <option value={book.id} key={book.id}>{book.title}</option>)}</select></label><label>{kind === 'highlight' ? 'Passage' : kind === 'note' ? 'Your note' : 'Reflection'}<textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={kind === 'highlight' ? 'A line worth returning to…' : kind === 'note' ? 'What did this make you notice?' : 'How does this apply?'} autoFocus /></label>{kind === 'highlight' && <label>Location <span>optional</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Chapter 2 or page 48" /></label>}<div className="theoria-modal-actions"><button type="button" className="theoria-secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="theoria-primary-button" disabled={saving || !text.trim()}>{saving ? 'Saving…' : 'Save insight'}</button></div></form></Modal>;
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div className="theoria-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>{children}</div>;
}
