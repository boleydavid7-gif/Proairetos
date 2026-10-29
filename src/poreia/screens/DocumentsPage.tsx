import { useEffect, useRef, useState } from 'react';
import { offerUndo, say } from '../../app/family/shell';
import { BackLink } from '../../askesis/app/ui';
import { prepareFile } from '../../features/items/attachments/prepare';
import { Sym } from '../../lamplight/icons';
import type { PoreiaNav } from '../app/App';
import { filesFor, putFile, removeFile, type DocFile } from '../app/docFiles';
import { docs, newId, nowStamp, today, trips } from '../app/state';
import { DOC_KINDS, docKindLabel, docsFor, expiryFact, masked, needsLook, type DocKind, type TravelDoc } from '../core/documents';
import RouteEmpty from '../components/RouteEmpty';

/** Passports, visas, insurance and the like: every trip's, or one trip's when opened from it. */
export default function DocumentsPage({ nav, tripId }: { nav: PoreiaNav; tripId?: string }) {
  const all = docs.use();
  const trip = trips.use().find((each) => each.id === tripId);
  const shown = trip ? docsFor(all, trip.id) : [...all].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
  return (
    <div className="page poreia-page">
      <BackLink label={trip?.name ?? 'More'} onBack={nav.back} />
      <div className="page-top">
        <h1 className="title">Documents</h1>
      </div>
      {shown.length ? (
        <ul className="rows">
          {shown.map((doc) => {
            const fact = expiryFact(doc, trip, today());
            return (
              <li key={doc.id}>
                <button type="button" className="row" onClick={() => nav.go({ name: 'document', id: doc.id, tripId })}>
                  <span className="row__text">
                    <span>{doc.name}</span>
                    <span className="row__detail">{[docKindLabel(doc.kind), doc.number && masked(doc.number), !trip && doc.tripId && trips.get(doc.tripId)?.name].filter(Boolean).join(' · ')}</span>
                    {fact && <span className={needsLook(doc, trip, today()) ? 'row__detail poreia-doc__fact is-near' : 'row__detail'}>{fact}</span>}
                  </span>
                  <Sym name="chevron" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <RouteEmpty glyph="shield" title="No documents yet">
          <button type="button" className="button-main" onClick={() => nav.go({ name: 'document', tripId })}>
            Add a document
          </button>
        </RouteEmpty>
      )}
      {shown.length > 0 && (
        <button type="button" className="button-main" onClick={() => nav.go({ name: 'document', tripId })}>
          Add a document
        </button>
      )}
    </div>
  );
}

const empty = (tripId?: string) => ({ kind: 'passport' as DocKind, name: '', number: '', phone: '', expires: '', notes: '', onlyThisTrip: Boolean(tripId) });

/** One document: its details, its photos (on this device only), Edit, Delete with undo. */
export function DocumentPage({ nav, id, tripId }: { nav: PoreiaNav; id?: string; tripId?: string }) {
  const doc = docs.use().find((each) => each.id === id);
  const [editing, setEditing] = useState(!id);
  const [form, setForm] = useState(() =>
    doc ? { kind: doc.kind, name: doc.name, number: doc.number ?? '', phone: doc.phone ?? '', expires: doc.expires ?? '', notes: doc.notes ?? '', onlyThisTrip: Boolean(doc.tripId) } : empty(tripId),
  );
  const [shown, setShown] = useState(false);
  const trip = trips.get(doc?.tripId ?? tripId ?? '');

  if (id && !doc) {
    return (
      <div className="page poreia-page">
        <BackLink label="Documents" onBack={nav.back} />
        <p className="muted">This document isn’t here anymore.</p>
      </div>
    );
  }

  const save = () => {
    if (!form.name.trim()) return;
    const stamp = nowStamp();
    const record: TravelDoc = {
      id: doc?.id ?? newId(),
      kind: form.kind,
      name: form.name.trim(),
      number: form.number.trim() || undefined,
      phone: form.phone.trim() || undefined,
      expires: form.expires || undefined,
      tripId: form.onlyThisTrip ? (doc?.tripId ?? tripId) : undefined,
      notes: form.notes.trim() || undefined,
      createdAt: doc?.createdAt ?? stamp,
      updatedAt: stamp,
    };
    docs.put(record);
    if (doc) setEditing(false);
    else nav.swap({ name: 'document', id: record.id, tripId });
  };

  if (editing || !doc) {
    return (
      <div className="page poreia-page">
        <BackLink label={doc ? doc.name : 'Documents'} onBack={doc ? () => setEditing(false) : nav.back} />
        <div className="page-top">
          <h1 className="title">{doc ? 'Edit document' : 'New document'}</h1>
        </div>
        <section className="card">
          <label className="field">
            <span className="field__label">Kind</span>
            <select className="input" value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as DocKind })}>
              {DOC_KINDS.map((each) => (
                <option key={each.id} value={each.id}>
                  {each.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Name</span>
            <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">{form.kind === 'insurance' ? 'Policy number' : form.kind === 'loyalty' ? 'Member number' : 'Number'}</span>
            <input className="input" value={form.number} autoComplete="off" spellCheck={false} onChange={(event) => setForm({ ...form, number: event.target.value })} />
          </label>
          {form.kind === 'insurance' && (
            <label className="field">
              <span className="field__label">Phone for help</span>
              <input className="input" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </label>
          )}
          <label className="field">
            <span className="field__label">Ends</span>
            <input className="input" type="date" value={form.expires} onChange={(event) => setForm({ ...form, expires: event.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">Notes</span>
            <textarea className="input area" rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
          {(doc?.tripId ?? tripId) && (
            <label className="toggle-row">
              <span>Only for {trips.get(doc?.tripId ?? tripId ?? '')?.name ?? 'this trip'}</span>
              <input type="checkbox" role="switch" checked={form.onlyThisTrip} onChange={(event) => setForm({ ...form, onlyThisTrip: event.target.checked })} />
            </label>
          )}
          <button type="button" className="button-main" disabled={!form.name.trim()} onClick={save}>
            Save
          </button>
        </section>
      </div>
    );
  }

  const fact = expiryFact(doc, trip, today());
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      say('Copied');
    } catch {
      say('Couldn’t copy. Select it instead.');
    }
  };

  return (
    <div className="page poreia-page">
      <BackLink label="Documents" onBack={nav.back} />
      <div className="detail-head poreia-trip__head">
        <h1 className="title">{doc.name}</h1>
        <p className="muted">{[docKindLabel(doc.kind), trip && doc.tripId ? trip.name : undefined].filter(Boolean).join(' · ')}</p>
      </div>
      <section className="card">
        <dl className="detail-list">
          {doc.number && (
            <>
              <dt>Number</dt>
              <dd className="poreia-doc__number">
                <span>{shown ? doc.number : masked(doc.number)}</span>
                <button type="button" className="text-link" onClick={() => setShown(!shown)}>
                  {shown ? 'Hide' : 'Show'}
                </button>
                <button type="button" className="text-link" onClick={() => copy(doc.number!)}>
                  Copy
                </button>
              </dd>
            </>
          )}
          {doc.phone && (
            <>
              <dt>Phone</dt>
              <dd>
                <a href={`tel:${doc.phone.replace(/[^\d+]/g, '')}`}>{doc.phone}</a>
              </dd>
            </>
          )}
          {fact && (
            <>
              <dt>Ends</dt>
              <dd className={needsLook(doc, trip, today()) ? 'poreia-doc__fact is-near' : undefined}>{fact}</dd>
            </>
          )}
          {doc.notes && (
            <>
              <dt>Notes</dt>
              <dd>{doc.notes}</dd>
            </>
          )}
        </dl>
      </section>
      <DocPhotos doc={doc} />
      <div className="button-row">
        <button type="button" className="button-quiet" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button
          type="button"
          className="text-link"
          onClick={() => {
            docs.remove(doc.id);
            // The photos stay through the undo, then go.
            const timer = window.setTimeout(() => {
              if (!docs.get(doc.id)) void filesFor(doc.id).then((files) => files.forEach((file) => void removeFile(file.id)));
            }, 12_000);
            offerUndo(`“${doc.name}” deleted`, () => {
              window.clearTimeout(timer);
              docs.put(doc);
            });
            nav.back();
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/** Photos of a document (a boarding pass, the photo page), kept on this phone only; tap one to see it large. */
function DocPhotos({ doc }: { doc: TravelDoc }) {
  const [files, setFiles] = useState<(DocFile & { url: string })[]>([]);
  const [open, setOpen] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const load = () =>
    filesFor(doc.id).then((list) =>
      setFiles((before) => {
        before.forEach((each) => URL.revokeObjectURL(each.url));
        return list.sort((a, b) => a.at.localeCompare(b.at)).map((file) => ({ ...file, url: URL.createObjectURL(new Blob([file.data], { type: file.type })) }));
      }),
    );
  useEffect(() => {
    void load();
  }, [doc.id]);
  const big = files.find((each) => each.id === open);

  return (
    <section className="card">
      <h2 className="card__title">Photos</h2>
      {files.length > 0 && (
        <div className="poreia-doc__photos">
          {files.map((file) => (
            <button key={file.id} type="button" className="poreia-doc__photo" aria-label={`See ${file.name}`} onClick={() => setOpen(file.id)}>
              {file.type.startsWith('image/') ? <img src={file.url} alt="" /> : <span>{file.name}</span>}
            </button>
          ))}
        </div>
      )}
      {big && (
        <div className="poreia-doc__big">
          {big.type.startsWith('image/') ? <img src={big.url} alt={big.name} /> : <a href={big.url} download={big.name}>{big.name}</a>}
          <div className="button-row">
            <button type="button" className="button-quiet" onClick={() => setOpen(undefined)}>
              <Sym name="close" size={18} /> Close
            </button>
            <button
              type="button"
              className="text-link"
              onClick={async () => {
                const kept = { id: big.id, docId: big.docId, name: big.name, type: big.type, data: big.data, at: big.at };
                await removeFile(big.id);
                setOpen(undefined);
                await load();
                offerUndo('Photo removed', () => void putFile(kept).then(load));
              }}
            >
              Remove
            </button>
          </div>
        </div>
      )}
      <p className="fine">On this phone only: not synced, backed up or shared.</p>
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={async (event) => {
          const chosen = event.target.files?.[0];
          event.target.value = '';
          if (!chosen) return;
          const ready = await prepareFile(chosen);
          await putFile({ id: newId(), docId: doc.id, ...ready, at: nowStamp() });
          await load();
        }}
      />
      <button type="button" className="button-quiet" onClick={() => input.current?.click()}>
        Add a photo
      </button>
    </section>
  );
}
