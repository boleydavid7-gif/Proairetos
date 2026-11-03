import { useState } from 'react';
import { linkTo } from '../../app/family/opening';
import { Sym } from '../../lamplight/icons';
import type { LifeRecord } from '../../core/life-records';
import { canArchiveLifeRecord } from '../../core/life-records/library';

type Props = {
  record: LifeRecord;
  saved: boolean;
  selectionMode: boolean;
  selected: boolean;
  availableValues: { id: string; name: string }[];
  relatedRecords: LifeRecord[];
  busy: boolean;
  onToggleFavorite: (record: LifeRecord) => void;
  onToggleSelected: (record: LifeRecord, selected: boolean) => void;
  onOpen: (record: LifeRecord) => void;
  onArchive: (record: LifeRecord) => void;
  onRestore: (record: LifeRecord) => void;
  onUnlink: (record: LifeRecord, valueId: string) => void;
  onLinkValue: (record: LifeRecord, valueId: string) => void;
  onFilterValue: (valueId: string) => void;
  onFindRelated: (record: LifeRecord) => void;
  onSaveReflection: (record: LifeRecord, body: string) => Promise<boolean>;
};

function hrefFor(record: LifeRecord): string | undefined {
  if (record.kind === 'workout' && record.sourceApp === 'dynamis') return linkTo('dynamis', 'workout:' + record.sourceId);
  if (record.kind === 'workout' && record.sourceApp === 'askesis') return linkTo('askesis', 'entry:' + record.sourceId);
  if (record.kind === 'meal' && record.sourceApp === 'soma') return linkTo('soma', 'recipe:' + record.sourceId);
  if (record.kind === 'study' && record.sourceApp === 'theoria') return '/theoria/?open=pomodoro:sessions';
  if (record.kind === 'note' && record.sourceApp === 'mneme') return linkTo('mneme', 'note:' + record.sourceId);
  if (record.kind === 'idea' && record.sourceApp === 'mneme') return linkTo('mneme', 'ideas');
  if (record.kind === 'trip' && record.sourceApp === 'poreia') return linkTo('poreia', record.key.endsWith(':journal') ? 'journal' : 'trip:' + record.sourceId);
  if (record.kind === 'financial' && record.sourceApp === 'oikonomia') return linkTo('oikonomia', 'more');
  return undefined;
}

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date unavailable';
}

export default function LibraryRecordItem({
  record,
  saved,
  selectionMode,
  selected,
  availableValues,
  relatedRecords,
  busy,
  onToggleFavorite,
  onToggleSelected,
  onOpen,
  onArchive,
  onRestore,
  onUnlink,
  onLinkValue,
  onFilterValue,
  onFindRelated,
  onSaveReflection,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(record.body ?? '');
  const [linkValueId, setLinkValueId] = useState('');
  const linkedValues = availableValues.filter((value) => record.valueIds.includes(value.id));
  const unlinkedValues = availableValues.filter((value) => !record.valueIds.includes(value.id));
  const href = hrefFor(record);
  const kindLabel = ({ life: 'Life', trip: 'Travel', financial: 'Milestone' } as Partial<Record<LifeRecord['kind'], string>>)[record.kind] ?? record.kind.charAt(0).toUpperCase() + record.kind.slice(1);

  async function saveEdit() {
    if (await onSaveReflection(record, draft)) setEditing(false);
  }

  function openRecord() {
    if (record.kind === 'reflection') setExpanded((current) => !current);
    else onOpen(record);
  }

  return (
    <li className="connections-list__item">
      <article className="connections-record">
        <div className={selectionMode ? 'connections-record__meta connections-record__meta--selecting' : 'connections-record__meta'}>
          {selectionMode && (
            <label className="connections-record__select">
              <input
                type="checkbox"
                checked={selected}
                onChange={(event) => onToggleSelected(record, event.target.checked)}
                aria-label={`Select ${record.title}`}
              />
            </label>
          )}
          <span className={'connections-record__kind connections-record__kind--' + record.kind}>{kindLabel}</span>
          <span className="connections-record__source">{record.source}</span>
          <time dateTime={record.at}>{dateLabel(record.at)}</time>
          <button type="button" className="connections-save" aria-label={saved ? 'Remove from saved' : 'Save to library'} aria-pressed={saved} onClick={() => onToggleFavorite(record)}>
            <Sym name="bookmark" size={18} />
          </button>
          {canArchiveLifeRecord(record) && (
            <details className="connections-actions">
              <summary aria-label="More actions"><Sym name="more" size={19} /></summary>
              <div className="connections-actions__menu">
                {linkedValues.map((value) => (
                  <button key={value.id} type="button" disabled={busy} onClick={() => onUnlink(record, value.id)}>Disconnect {value.name}</button>
                ))}
                <button type="button" disabled={busy} onClick={() => record.archived ? onRestore(record) : onArchive(record)}>
                  {busy ? 'Saving…' : record.archived ? 'Restore to library' : 'Move to archive'}
                </button>
              </div>
            </details>
          )}
        </div>
        {href ? (
          <a className="connections-record__title" href={href}>
            <span>{record.title}</span>
            {record.detail && <small>{record.detail}</small>}
          </a>
        ) : (
          <button type="button" className="connections-record__title" aria-expanded={record.kind === 'reflection' ? expanded : undefined} onClick={openRecord}>
            <span>{record.title}</span>
            {record.detail && <small>{record.detail}</small>}
          </button>
        )}
        {record.kind === 'reflection' && expanded && (
          editing ? (
            <div className="connections-edit">
              <textarea className="field-input field-input--area" rows={5} aria-label="Edit reflection" value={draft} onChange={(event) => setDraft(event.target.value)} />
              <div className="connections-edit__actions">
                <button type="button" className="button-quiet" onClick={() => { setDraft(record.body ?? ''); setEditing(false); }}>Cancel</button>
                <button type="button" className="button-accent button--sm" disabled={!draft.trim() || busy} onClick={() => void saveEdit()}>{busy ? 'Saving…' : 'Save changes'}</button>
              </div>
            </div>
          ) : (
            <>
              {record.body && <p className="connections-record__body">{record.body}</p>}
              <button type="button" className="connections-edit-link" onClick={() => { setDraft(record.body ?? ''); setEditing(true); }}>Edit reflection</button>
            </>
          )
        )}
        {record.kind !== 'reflection' && record.body && (
          <details className="connections-record__details">
            <summary>Read details</summary>
            <p className="connections-record__body">{record.body}</p>
          </details>
        )}
        {linkedValues.length > 0 && (
          <div className="connections-record__values" aria-label="Connected values">
            {linkedValues.map((value) => (
              <span className="connections-record__value" key={value.id}>
                <button type="button" onClick={() => onFilterValue(value.id)}>{value.name}</button>
                <button type="button" className="connections-record__value-remove" aria-label={`Disconnect ${value.name}`} disabled={busy} onClick={() => onUnlink(record, value.id)}><Sym name="close" size={12} /></button>
              </span>
            ))}
          </div>
        )}
        {unlinkedValues.length > 0 && (
          <details className="connections-record__connect">
            <summary>Connect to a value</summary>
            <div className="connections-record__connect-fields">
              <select className="field-input" aria-label="Choose a value to connect" value={linkValueId} onChange={(event) => setLinkValueId(event.target.value)}>
                <option value="">Choose a value</option>
                {unlinkedValues.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}
              </select>
              <button type="button" className="button-quiet button--sm" disabled={!linkValueId} onClick={() => { onLinkValue(record, linkValueId); setLinkValueId(''); }}>Connect</button>
            </div>
          </details>
        )}
        {relatedRecords.length > 0 && (
          <details className="connections-record__related">
            <summary>Related entries <span>{relatedRecords.length}</span></summary>
            <ul>
              {relatedRecords.map((related) => {
                const relatedHref = hrefFor(related);
                return (
                  <li key={related.key}>
                    {relatedHref ? (
                      <a href={relatedHref}><span>{related.title}</span><small>{related.source} · {dateLabel(related.at)}</small></a>
                    ) : (
                      <button type="button" onClick={() => onFindRelated(related)}><span>{related.title}</span><small>{related.source} · {dateLabel(related.at)}</small></button>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </article>
    </li>
  );
}
