import { useEffect, useMemo, useRef, useState } from 'react';
import { attachmentService } from '../../app/services';
import { TrashIcon } from '../../app/family/icons';
import type { MnemeNav } from '../app/App';
import { collections, notes } from '../app/state';
import { offerUndo } from '../../app/family/shell';
import { Transcript } from './Transcript';

export default function NotePage({ nav, id }: { nav: MnemeNav; id: string }) {
  const note = notes.use().find((item) => item.id === id);
  const allCollections = collections.use();
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [collectionId, setCollectionId] = useState(note?.collectionId ?? '');
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [audioUrl, setAudioUrl] = useState('');
  const player = useRef<HTMLAudioElement | null>(null);
  // A transcript finishing while the page is open fills what is still empty here, as it did in the stored note.
  const heardAt = note?.transcript?.at;
  useEffect(() => {
    if (!heardAt || !note) return;
    setBody((current) => (current.trim() ? current : note.body));
    setTitle((current) => (!current.trim() || current === 'Voice note' ? note.title : current));
    // Only when a new transcript arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heardAt]);
  const save = () => {
    if (!note) return;
    notes.put({ ...note, title: title.trim(), body: body.trim(), collectionId: collectionId || undefined, pinned, updatedAt: new Date().toISOString() });
    nav.back();
  };
  useEffect(() => {
    let active = true;
    if (!note?.recording) return () => { active = false; };
    void attachmentService.forItem(note.id).then((items) => {
      const recording = items.find((item) => item.id === note.recording?.attachmentId && item.data.byteLength > 0);
      if (!active || !recording) return;
      setAudioUrl(URL.createObjectURL(new Blob([recording.data], { type: recording.type })));
    });
    return () => {
      active = false;
      setAudioUrl((current) => { if (current) URL.revokeObjectURL(current); return ''; });
    };
  }, [note?.id, note?.recording?.attachmentId]);
  const remove = async () => { if (note) { await attachmentService.removeForItem(note.id); notes.remove(note.id); nav.back(); } };
  const updated = useMemo(() => note ? new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '', [note]);
  if (!note) return <main className="mneme-page mneme-empty"><h1>Note not found</h1><button type="button" className="mneme-primary" onClick={nav.back}>Back to notes</button></main>;
  return <main className="mneme-page mneme-note-page"><div className="mneme-header-actions-source" data-header-actions aria-hidden="true"><button type="button" aria-label="Save note" onClick={save}>Save</button></div><button type="button" className="mneme-back-source" data-back aria-hidden="true" onClick={nav.back}>Back</button><div className="mneme-note-editor"><p className="mneme-kicker">Edited {updated}</p><input className="mneme-title-input" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Note title" /><textarea className="mneme-body-input" value={body} onChange={(event) => setBody(event.target.value)} aria-label="Note body" rows={13} /><div className="mneme-editor-tools"><label className="mneme-toggle"><input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} /> <span>{pinned ? 'Pinned' : 'Pin note'}</span></label><label className="mneme-inline-field"><span>Collection</span><select className="field-input" value={collectionId} onChange={(event) => setCollectionId(event.target.value)}><option value="">Inbox</option>{allCollections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>{note.recording && <section className="mneme-saved-recording"><strong>Voice recording</strong><span>{audioUrl ? 'Stored with this note' : 'Audio is still arriving from sync'}</span>{audioUrl && <audio ref={player} className="mneme-audio" controls src={audioUrl} />}<Transcript note={note} audio={player} body={body} onUseText={(text) => { const before = body; setBody(text); offerUndo('Transcript put in the note', () => setBody(before)); }} /></section>}<button type="button" className="mneme-delete" onClick={() => void remove()}><TrashIcon size={22} /> Delete note</button></div></main>;
}
