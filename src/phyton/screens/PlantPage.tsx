import { WriteTag } from '../../app/family/DeviceExtras';
import { archiveName, downloadZip } from '../../app/family/downloadZip';
import { useEffect, useRef, useState } from 'react';
import { CameraIcon, LeafIcon } from '../../app/family/icons';
import { offerUndo, say } from '../../app/family/shell';
import { Switch } from '../../askesis/app/ui';
import { daysBetween, toLocalDate } from '../../core/scheduling/dates';
import type { PhytonNav } from '../app/App';
import { findPlant, myName, newId, putPlant, removePlant, settings, usePlants } from '../app/state';
import { useForecast, useRain } from '../app/rain';
import { hotDays } from '../core/outdoors';
import { takeHeldPhoto } from '../app/identify';
import { moist, PlantThumb, watered } from '../app/ui';
import { dayText, everyNow, everyText, feed, journal, LOG_TEXT, learnedEvery, namesIn, nextCheck, nextFeed, PLACES, repot, wateredText, type Plant } from '../core/plants';
import { CARE_SOURCE, DRY_TEXT, LIGHT_TEXT, NOT_LISTED, TOXIC_TEXT, speciesBy } from '../core/species';
import { importPhotos, photosFor, putPhoto, removePhoto, smallPhoto, usePhotos } from '../data/photos';

async function keepPhoto(plantId: string, file: Blob): Promise<void> {
  const small = await smallPhoto(file);
  await putPhoto({ id: newId(), plantId, date: toLocalDate(new Date()), type: small.type, data: await small.arrayBuffer() });
}

function PlantForm({ existing, species: speciesKey, latin, given, onDone }: { existing?: Plant; species?: string; latin?: string; given?: string; onDone: (saved?: Plant) => void }) {
  const all = usePlants();
  const today = toLocalDate(new Date());
  const type = speciesBy(existing?.species ?? speciesKey);
  const me = myName(settings.use());
  const [name, setName] = useState(existing?.name ?? given ?? type?.name ?? '');
  const [place, setPlace] = useState(existing?.place ?? '');
  const [outside, setOutside] = useState(existing?.outside ?? (type?.kind === 'Garden' || type?.kind === 'Vegetable or fruit'));
  const [every, setEvery] = useState(existing?.every ?? type?.water ?? 7);
  const [feedEvery, setFeedEvery] = useState(existing ? existing.feedEvery ?? 0 : type?.feed ?? 0);
  const [start, setStart] = useState(existing?.start ?? today);
  const [who, setWho] = useState(existing?.who ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const nameField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!existing) nameField.current?.focus();
  }, []);
  const names = namesIn(all, [me]);

  const save = () => {
    const next: Plant = {
      ...(existing ?? { id: newId(), log: [], createdAt: new Date().toISOString(), species: type?.key, latin: latin ?? type?.latin }),
      name: name.trim(),
      place: place.trim() || undefined,
      outside: outside || undefined,
      every: Math.max(1, every),
      feedEvery: feedEvery > 0 ? feedEvery : undefined,
      start: existing?.log.length ? existing.start : start,
      who: who.trim() || undefined,
      note: note.trim() || undefined,
    };
    putPlant(next);
    if (existing) offerUndo('Saved', () => putPlant(existing));
    else {
      const photo = takeHeldPhoto();
      if (photo) void keepPhoto(next.id, photo).catch(() => undefined);
    }
    onDone(next);
  };

  return (
    <div className="page phyton-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={() => onDone()}>Cancel</button>
        <p className="label">{existing ? 'Edit' : 'Add a plant'}</p>
        <button type="button" className="text-link" disabled={!name.trim()} onClick={save}>Save</button>
      </div>

      {(type || latin) && (
        <p className="muted plant-type">{type ? type.name : ''}{type && ' · '}<i>{latin ?? type?.latin}</i></p>
      )}

      <label className="field">
        <span className="field__label">Name</span>
        <input ref={nameField} className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Kitchen pothos" />
      </label>
      <label className="field">
        <span className="field__label">Where (optional)</span>
        <input className="input" list="phyton-places" value={place} onChange={(event) => setPlace(event.target.value)} />
        <datalist id="phyton-places">{PLACES.map((each) => <option key={each} value={each} />)}</datalist>
      </label>
      <section className="card switches">
        <Switch on={outside} label="Outside" detail="Rain counts as watering" onToggle={() => setOutside(!outside)} />
      </section>

      <fieldset className="field">
        <legend className="field__label">Check the soil</legend>
        <div className="stepper">
          <button type="button" className="stepper__button" aria-label="Fewer days" onClick={() => setEvery(Math.max(1, every - 1))}>−</button>
          <span className="stepper__value">{everyText(every)}</span>
          <button type="button" className="stepper__button" aria-label="More days" onClick={() => setEvery(Math.min(60, every + 1))}>+</button>
        </div>
        <p className="hint">In spring and summer; longer in winter. Your waterings take over from here.</p>
      </fieldset>

      <fieldset className="field">
        <legend className="field__label">Feed</legend>
        <div className="stepper">
          <button type="button" className="stepper__button" aria-label="Less often" onClick={() => setFeedEvery(Math.max(0, feedEvery - 1))}>−</button>
          <span className="stepper__value">{feedEvery === 0 ? 'Not reminded' : feedEvery === 1 ? 'Every week' : `Every ${feedEvery} weeks`}</span>
          <button type="button" className="stepper__button" aria-label="More often" onClick={() => setFeedEvery(Math.min(12, feedEvery + 1))}>+</button>
        </div>
      </fieldset>

      {!existing?.log.length && (
        <label className="field">
          <span className="field__label">First check</span>
          <input className="input" type="date" value={start} onChange={(event) => setStart(event.target.value || today)} />
        </label>
      )}
      <label className="field">
        <span className="field__label">Who looks after it (optional)</span>
        <input className="input" list="phyton-names" value={who} onChange={(event) => setWho(event.target.value)} placeholder="Anyone" />
        <datalist id="phyton-names">{names.map((each) => <option key={each} value={each} />)}</datalist>
      </label>
      <label className="field">
        <span className="field__label">Note (optional)</span>
        <input className="input" value={note} onChange={(event) => setNote(event.target.value)} />
      </label>

      <button type="button" className="button-main" disabled={!name.trim()} onClick={save}>Save</button>
    </div>
  );
}

function Photos({ plant }: { plant: Plant }) {
  const photos = usePhotos(plant.id);
  const picker = useRef<HTMLInputElement>(null);
  const restorePicker = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const saveCopy = async () => {
    setSaving(true);
    try {
      downloadZip(`phyton-${archiveName(plant.name)}-photos-${new Date().toISOString().slice(0, 10)}`, [
        { path: 'manifest.json', data: JSON.stringify({ app: 'phyton', plantId: plant.id, plant: plant.name, exportedAt: new Date().toISOString(), photos: photos.map(({ photo }) => ({ id: photo.id, date: photo.date, type: photo.type })) }) },
        ...photos.map(({ photo }) => ({ path: `photos/${photo.date}-${photo.id}.jpg`, data: photo.data })),
      ]);
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="card">
      <div className="section-head">
        <h2 className="card__title card__title--small">Photos</h2>
        <div className="chip-row">
          {photos.length > 0 && <button type="button" className="text-link" disabled={saving} onClick={() => void saveCopy()}>{saving ? 'Saving…' : 'Save a copy'}</button>}
          <button type="button" className="text-link" disabled={restoring} onClick={() => restorePicker.current?.click()}>{restoring ? 'Restoring…' : 'Restore a copy'}</button>
          <button type="button" className="text-link" onClick={() => picker.current?.click()}><CameraIcon size={16} />Add</button>
        </div>
      </div>
      <input
        ref={picker}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void keepPhoto(plant.id, file).catch(() => say('That photo could not be read.'));
        }}
      />
      <input ref={restorePicker} type="file" accept=".zip,application/zip" hidden onChange={async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setRestoring(true);
        try {
          const count = await importPhotos(file, plant.id);
          say(count ? `${count} ${count === 1 ? 'photo' : 'photos'} restored` : 'No photos were found in that archive');
        } catch {
          say('That archive could not be opened here');
        } finally {
          setRestoring(false);
        }
      }} />
      {photos.length === 0 && <p className="muted">A photo now and then shows how it grows. Kept on this device.</p>}
      {photos.length > 0 && <p className="fine">Kept on this device, not in backups or sync. Save a copy before changing devices.</p>}
      {photos.length > 1 && (
        <figure className="then-now">
          <div className="then-now__pair">
            {[photos[0], photos[photos.length - 1]].map(({ photo, url }, index) => (
              <div key={photo.id} className="then-now__one">
                <img src={url} alt={`${plant.name}, ${photo.date}`} />
                <span className="plant-photos__date">{index === 0 ? 'Then' : 'Now'} · {photoDate(photo.date)}</span>
              </div>
            ))}
          </div>
          <figcaption className="muted">{apart(photos[0].photo.date, photos[photos.length - 1].photo.date)}</figcaption>
        </figure>
      )}
      {photos.length > 0 && (
        <ul className="plant-photos" aria-label="Every photo, newest first">
          {[...photos].reverse().map(({ photo, url }) => (
            <li key={photo.id}>
              <img src={url} alt={`${plant.name}, ${photo.date}`} />
              <span className="plant-photos__date">{photoDate(photo.date)}</span>
              <button
                type="button"
                className="text-link"
                aria-label={`Remove the photo from ${photo.date}`}
                onClick={() => {
                  void removePhoto(photo.id);
                  offerUndo('Photo removed', () => void putPhoto(photo));
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const photoDate = (date: string) => new Date(`${date}T12:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** "3 weeks apart", "5 months apart", "1 year and 2 months apart"; same day says so. */
export function apart(from: string, to: string): string {
  const days = daysBetween(from, to);
  if (days <= 0) return 'The same day';
  if (days < 14) return `${days} ${days === 1 ? 'day' : 'days'} apart`;
  if (days < 61) return `${Math.round(days / 7)} weeks apart`;
  const months = Math.round(days / 30.44);
  if (months < 12) return `${months} months apart`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return `${years} ${years === 1 ? 'year' : 'years'}${rest ? ` and ${rest} ${rest === 1 ? 'month' : 'months'}` : ''} apart`;
}

function PlantView({ nav, plant, onEdit }: { nav: PhytonNav; plant: Plant; onEdit: () => void }) {
  const current = settings.use();
  const rain = useRain(current.rain);
  const forecast = useForecast(current.rain);
  const today = toLocalDate(new Date());
  const type = speciesBy(plant.species);
  const day = nextCheck(plant, today, current.hemisphere, rain, hotDays(forecast));
  const learned = learnedEvery(plant, current.hemisphere);
  const fedNext = nextFeed(plant, today, current.hemisphere);
  const me = myName(current) || plant.who;
  const mark = (next: Plant, words: string) => {
    putPlant(next);
    offerUndo(words, () => putPlant(plant));
  };
  const [writing, setWriting] = useState<'pest' | 'note'>();
  const [words, setWords] = useState('');
  const keepLine = () => {
    if (!writing || (writing === 'note' && !words.trim())) return;
    mark(journal(plant, today, writing, words, me), writing === 'pest' ? 'Pests noted' : 'Note kept');
    setWriting(undefined);
    setWords('');
  };

  return (
    <div className="page phyton-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Back</button>
        <p className="label">Plant</p>
        <button type="button" className="text-link" onClick={onEdit}>Edit</button>
      </div>

      <div className="detail-head">
        <PlantThumb plant={plant} size={64} />
        <div>
          <h1 className="title">{plant.name}</h1>
          <p className="muted">{[type?.name !== plant.name ? type?.name : undefined, plant.place, plant.outside ? 'Outside' : undefined].filter(Boolean).join(' · ')}</p>
          {(plant.latin ?? type?.latin) && <p className="muted"><i>{plant.latin ?? type?.latin}</i></p>}
        </div>
      </div>

      <section className="card">
        <span className="card__eyebrow">{day <= today ? `Check the soil · ${dayText(day, today)}` : `Next check · ${dayText(day, today)}`}</span>
        <p className="muted">{wateredText(plant, today, rain)}</p>
        <div className="button-row">
          <button type="button" className="button-main" onClick={() => watered(plant, today)}>Watered</button>
          <button type="button" className="button-quiet" onClick={() => moist(plant, today)}>Still moist</button>
        </div>
      </section>

      <dl className="detail-list">
        <dt>Watering</dt>
        <dd>{everyText(everyNow(plant, today, current.hemisphere))} this month{learned !== plant.every ? ', from your waterings' : ''}</dd>
        {plant.feedEvery && <><dt>Feed</dt><dd>{plant.feedEvery === 1 ? 'Every week' : `Every ${plant.feedEvery} weeks`}, spring and summer{fedNext ? ` · next ${dayText(fedNext, today)}` : ''}</dd></>}
        {plant.who && <><dt>Who</dt><dd>{plant.who}</dd></>}
        {plant.note && <><dt>Note</dt><dd>{plant.note}</dd></>}
      </dl>

      <div className="chip-row">
        <button type="button" className="chip" onClick={() => mark(feed(plant, today, me), `${plant.name} fed`)}>Fed</button>
        <button type="button" className="chip" onClick={() => mark(repot(plant, today, me), `${plant.name} repotted`)}>Repotted</button>
        <button type="button" className="chip" onClick={() => mark(journal(plant, today, 'prune', undefined, me), `${plant.name} pruned`)}>Pruned</button>
        <button type="button" className="chip" aria-pressed={writing === 'pest'} onClick={() => setWriting(writing === 'pest' ? undefined : 'pest')}>Pests seen</button>
        <button type="button" className="chip" aria-pressed={writing === 'note'} onClick={() => setWriting(writing === 'note' ? undefined : 'note')}>Note</button>
        {!type && <button type="button" className="chip" onClick={() => nav.go({ name: 'identify', plantId: plant.id })}><CameraIcon size={15} />Identify</button>}
      </div>

      {writing && (
        <form className="card plant-journal" onSubmit={(event) => { event.preventDefault(); keepLine(); }}>
          <label className="field">
            <span className="field__label">{writing === 'pest' ? 'What and where (optional)' : 'Note'}</span>
            <input className="input" value={words} maxLength={140} autoComplete="off" placeholder={writing === 'pest' ? 'Fungus gnats in the soil' : 'New leaf unfurling'} onChange={(event) => setWords(event.target.value)} />
          </label>
          <div className="button-row">
            <button type="button" className="button-quiet" onClick={() => { setWriting(undefined); setWords(''); }}>Cancel</button>
            <button type="submit" className="button-main" disabled={writing === 'note' && !words.trim()}>Keep</button>
          </div>
        </form>
      )}

      {type ? (
        <section className="card">
          <h2 className="card__title card__title--small">Care</h2>
          <dl className="detail-list">
            <dt>Light</dt><dd>{LIGHT_TEXT[type.light]}</dd>
            <dt>Water</dt><dd>{DRY_TEXT[type.dry]}</dd>
            {type.humid && <><dt>Air</dt><dd>Likes humid air</dd></>}
            <dt>Pets</dt><dd className={type.toxic && type.toxic !== 'none' ? 'plant-toxic' : undefined}>{type.toxic ? TOXIC_TEXT[type.toxic] : NOT_LISTED}</dd>
            {type.note && <><dt>Note</dt><dd>{type.note}</dd></>}
          </dl>
          <p className="fine">{CARE_SOURCE}</p>
        </section>
      ) : (
        <p className="muted">No care notes for this one. The days you set, then your waterings, decide when it comes round.</p>
      )}

      <Photos plant={plant} />

      {plant.log.length > 0 && (
        <section className="card">
          <h2 className="card__title card__title--small">Record</h2>
          <ul className="notes-list">
            {[...plant.log].reverse().slice(0, 12).map((each, index) => (
              <li key={`${each.date}-${index}`} className="note-line">
                <span>{new Date(`${each.date}T12:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · {each.kind === 'note' && each.text ? each.text : LOG_TEXT[each.kind]}{each.kind === 'pest' && each.text ? `: ${each.text}` : ''}</span>
                <span className="muted">{each.by ?? ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <WriteTag path={`/phyton/?open=plant:${plant.id}`} />
      <button
        type="button"
        className="text-link remove-link"
        onClick={() => {
          removePlant(plant.id);
          offerUndo(`${plant.name} removed`, () => putPlant(plant));
          // Its photos go once the undo has passed, unless it came back.
          window.setTimeout(() => {
            if (!findPlant(plant.id)) void photosFor(plant.id).then((list) => list.forEach((photo) => void removePhoto(photo.id)));
          }, 9000);
          nav.back();
        }}
      >
        Remove
      </button>
    </div>
  );
}

export default function PlantPage({ nav, id, species, latin, given }: { nav: PhytonNav; id?: string; species?: string; latin?: string; given?: string }) {
  const all = usePlants();
  const existing = id ? all.find((plant) => plant.id === id) ?? findPlant(id) : undefined;
  const [editing, setEditing] = useState(!id);
  if (id && !existing) {
    return (
      <div className="page phyton-page">
        <div className="page-top"><button type="button" className="back-link" onClick={nav.back}>Back</button></div>
        <p className="muted"><LeafIcon size={18} /> Not found on this device.</p>
      </div>
    );
  }
  if (existing && !editing) return <PlantView nav={nav} plant={existing} onEdit={() => setEditing(true)} />;
  return (
    <PlantForm
      key={existing?.id ?? 'new'}
      existing={existing}
      species={species}
      latin={latin}
      given={given}
      onDone={(saved) => {
        if (existing) setEditing(false);
        else if (saved) nav.swap({ name: 'plant', id: saved.id });
        else nav.back();
      }}
    />
  );
}
