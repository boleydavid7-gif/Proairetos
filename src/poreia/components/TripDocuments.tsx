import { useState } from 'react';
import { CheckIcon, PlusIcon } from '../app/icons';
import type { Trip, TripDocument } from '../core/trips';
import { newId } from '../core/id';
import { putTrip } from '../data/store';

export default function TripDocuments({ trip }: { trip: Trip }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const documents = trip.documents ?? [];
  const save = async () => { if (!name.trim()) return; const now = new Date().toISOString(); const document: TripDocument = { id: newId(), name: name.trim(), url: url.trim() || undefined, note: note.trim() || undefined, createdAt: now, updatedAt: now }; await putTrip({ ...trip, documents: [...documents, document], updatedAt: now }); setName(''); setUrl(''); setNote(''); };
  return <section className="poreia-section poreia-trip-documents"><div className="poreia-section-head"><div><p className="label">Trip documents</p><h2>Keep important links together</h2></div><CheckIcon size={22} /></div>{documents.length ? <div className="poreia-list">{documents.map((document) => <div className="poreia-row poreia-row--stack" key={document.id}><span className="poreia-row__text"><strong>{document.name}</strong><small>{document.note || 'Saved for this trip'}</small></span>{document.url && <a className="text-link" href={document.url} target="_blank" rel="noreferrer">Open</a>}</div>)}</div> : <div className="card poreia-empty"><CheckIcon size={28} /><p className="muted">Save confirmation links, insurance details, and other travel references here. Private file storage is not connected yet.</p></div>}<form className="card poreia-form" onSubmit={(event) => { event.preventDefault(); void save(); }}><label className="field"><span className="field__label">Document or link name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Travel insurance" required /></label><label className="field"><span className="field__label">Link (optional)</span><input className="input" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" /></label><label className="field"><span className="field__label">Note</span><input className="input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Policy number or check-in detail" /></label><button type="submit" className="button-main"><PlusIcon size={18} /> Add document</button></form></section>;
}
