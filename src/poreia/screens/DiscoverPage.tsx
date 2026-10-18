import { useEffect, useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { CalendarIcon, CheckIcon, ChevronIcon, DiscoverIcon, PlusIcon, TripsIcon } from '../app/icons';
import { useItineraryItems, usePlaces, useTrips } from '../app/state';
import { newId } from '../core/id';
import { COLLECTIONS, CURATED_PLACES, normalizedPlaceKey, placeFromIdea, searchCuratedPlaces, type CuratedPlace } from '../core/discover';
import type { ItineraryItem, PlaceIdea, Trip } from '../core/trips';
import { putItineraryItem, putPlace, putTrip } from '../data/store';
import { PageTop, PoreiaHeader } from '../app/ui';

type DisplayPlace = CuratedPlace & { saved?: PlaceIdea };
const RECENT_SEARCHES_KEY = 'poreia.discover.recentSearches';
const RECENT_PLACES_KEY = 'poreia.discover.recentPlaces';
const readList = (key: string): string[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch { return []; }
};
const writeList = (key: string, values: string[]) => { try { localStorage.setItem(key, JSON.stringify(values.slice(0, 8))); } catch { /* Optional browsing state. */ } };
const placeKey = (place: DisplayPlace) => normalizedPlaceKey(place.name, place.location, place.saved?.providerId || place.id);
const displaySaved = (place: PlaceIdea): DisplayPlace => ({ ...placeFromIdea(place), saved: place });

function PlaceCard({ place, compared, onOpen, onCompare }: { place: DisplayPlace; compared: boolean; onOpen: () => void; onCompare: () => void }) {
  return <article className="poreia-discover-card"><button type="button" className="poreia-discover-card__open" onClick={onOpen}><span className="poreia-discover-card__art" aria-hidden="true"><DiscoverIcon size={28} /></span><span className="poreia-discover-card__body"><strong>{place.name}</strong><small>{place.location} · {place.category}</small><span>{place.description}</span></span></button><div className="poreia-discover-card__actions"><button type="button" className="text-link" onClick={onOpen}>{place.saved ? 'Saved place' : 'View details'}</button><button type="button" className="text-link" aria-pressed={compared} onClick={onCompare}>{compared ? 'Compared' : 'Compare'}</button></div></article>;
}

function ManualPlaceForm({ onSaved }: { onSaved: (place: PlaceIdea) => void }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const save = async () => {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const place: PlaceIdea = { id: newId(), name: name.trim(), location: location.trim() || undefined, externalUrl: url.trim() || undefined, note: note.trim() || undefined, source: 'manual', provider: 'User entered', category: 'Saved place', collection: 'Saved places', createdAt: now, updatedAt: now };
    await putPlace(place);
    onSaved(place);
  };
  return <form className="card poreia-form poreia-discover-manual-form" onSubmit={(event) => { event.preventDefault(); void save(); }}><div className="poreia-section-head"><h2>Save a place</h2><PlusIcon size={22} /></div><label className="field"><span className="field__label">Name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="A place worth considering" required /></label><label className="field"><span className="field__label">City or region</span><input className="input" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Optional" /></label><label className="field"><span className="field__label">Research link</span><input className="input" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" /></label><label className="field"><span className="field__label">Your note</span><textarea className="input" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why it belongs on the list" /></label><button type="submit" className="button-main">Save place</button></form>;
}

export default function DiscoverPage({ nav }: { nav: Nav }) {
  const savedPlaces = usePlaces();
  const trips = useTrips();
  const itineraryItems = useItineraryItems();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [collection, setCollection] = useState('');
  const [selected, setSelected] = useState<DisplayPlace>();
  const [manualOpen, setManualOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => readList(RECENT_SEARCHES_KEY));
  const [recentIds, setRecentIds] = useState(() => readList(RECENT_PLACES_KEY));
  const [compareKeys, setCompareKeys] = useState<string[]>([]);
  const [tripChoice, setTripChoice] = useState('');
  const [newTripName, setNewTripName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const savedDisplays = useMemo(() => savedPlaces.map(displaySaved), [savedPlaces]);
  const allDisplays = useMemo(() => {
    const curated = CURATED_PLACES.map((place) => ({ ...place, saved: savedPlaces.find((saved) => normalizedPlaceKey(saved.name, saved.location, saved.providerId) === normalizedPlaceKey(place.name, place.location, place.id)) }));
    const custom = savedDisplays.filter((saved) => !curated.some((place) => placeKey(place) === placeKey(saved)));
    return [...curated, ...custom];
  }, [savedDisplays, savedPlaces]);
  const results = useMemo(() => {
    const near = location.trim().toLowerCase();
    const curated = searchCuratedPlaces(query, collection).filter((place) => !near || place.location.toLowerCase().includes(near)).map((place) => allDisplays.find((item) => item.id === place.id) || place);
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const saved = savedDisplays.filter((place) => {
      const haystack = (place.name + ' ' + place.location + ' ' + place.category + ' ' + place.collection).toLowerCase();
      return (!collection || place.collection === collection) && (!near || place.location.toLowerCase().includes(near)) && words.every((word) => haystack.includes(word));
    });
    const combined = [...curated, ...saved];
    return combined.filter((place, index) => combined.findIndex((item) => placeKey(item) === placeKey(place)) === index);
  }, [allDisplays, collection, location, query, savedDisplays]);
  const recentPlaces = useMemo(() => recentIds.map((id) => allDisplays.find((place) => place.id === id)).filter((place): place is DisplayPlace => Boolean(place)).slice(0, 4), [allDisplays, recentIds]);
  const compared = useMemo(() => compareKeys.map((key) => allDisplays.find((place) => placeKey(place) === key)).filter((place): place is DisplayPlace => Boolean(place)), [allDisplays, compareKeys]);

  useEffect(() => {
    if (!selected) return;
    const id = selected.saved?.id || selected.id;
    const next = [id, ...recentIds.filter((item) => item !== id)];
    setRecentIds(next);
    writeList(RECENT_PLACES_KEY, next);
  }, [selected]);
  const rememberSearch = () => {
    const value = query.trim();
    if (!value) return;
    const next = [value, ...recentSearches.filter((item) => item.toLowerCase() !== value.toLowerCase())];
    setRecentSearches(next);
    writeList(RECENT_SEARCHES_KEY, next);
  };
  const openPlace = (place: DisplayPlace) => { setSelected(place); setManualOpen(false); setTripChoice(place.saved?.tripId || ''); setNewTripName(place.name); setMessage(''); setError(''); };
  useEffect(() => {
    const pendingId = localStorage.getItem('poreia.discover.open');
    if (!pendingId || selected) return;
    const place = allDisplays.find((item) => item.id === pendingId || item.saved?.providerId === pendingId);
    if (place) {
      localStorage.removeItem('poreia.discover.open');
      openPlace(place);
    }
  }, [allDisplays, selected]);
  const toggleCompare = (place: DisplayPlace) => { const key = placeKey(place); setCompareKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : current.length < 3 ? [...current, key] : current); };
  const ensureSaved = async (place: DisplayPlace, tripId?: string): Promise<PlaceIdea> => {
    const existing = savedPlaces.find((saved) => normalizedPlaceKey(saved.name, saved.location, saved.providerId) === normalizedPlaceKey(place.name, place.location, place.saved?.providerId || place.id));
    const now = new Date().toISOString();
    const next: PlaceIdea = { ...(existing || { id: newId(), createdAt: now }), name: place.name, location: place.location, note: place.description, category: place.category, collection: place.collection, source: place.saved?.source || 'curated', provider: place.saved?.provider || 'Lamplight curated guide', providerId: place.saved?.providerId || place.id, externalUrl: place.url, ...(tripId ? { tripId } : existing?.tripId ? { tripId: existing.tripId } : {}), updatedAt: now };
    await putPlace(next);
    return next;
  };
  const createTrip = async (place: DisplayPlace): Promise<string> => {
    const now = new Date().toISOString();
    const trip: Trip = { id: newId(), name: newTripName.trim() || place.name, destination: place.location, status: 'planning', travelers: [], createdAt: now, updatedAt: now };
    await putTrip(trip);
    setTripChoice(trip.id);
    return trip.id;
  };
  const savePlace = async () => {
    if (!selected) return;
    setSaving(true); setMessage(''); setError('');
    try { const tripId = tripChoice === 'new' ? await createTrip(selected) : tripChoice || selected.saved?.tripId; await ensureSaved(selected, tripId); setMessage(tripId ? 'Saved to this trip.' : 'Saved for later in Discover.'); } catch { setError('That place could not be saved. Try again.'); } finally { setSaving(false); }
  };
  const addToItinerary = async () => {
    if (!selected) return;
    setSaving(true); setMessage(''); setError('');
    try {
      const tripId = tripChoice === 'new' ? await createTrip(selected) : tripChoice || selected.saved?.tripId;
      if (!tripId) { setError('Choose a trip before adding an itinerary stop.'); return; }
      const saved = await ensureSaved(selected, tripId);
      if (saved.itineraryItemId && itineraryItems.some((item) => item.id === saved.itineraryItemId)) { setMessage('This place is already on the itinerary.'); return; }
      const now = new Date().toISOString();
      const item: ItineraryItem = { id: newId(), tripId, title: selected.name, location: selected.location, mapLink: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(selected.name + ' ' + selected.location), status: 'planned', travelers: [], createdAt: now, updatedAt: now };
      await putItineraryItem(item);
      await putPlace({ ...saved, itineraryItemId: item.id, updatedAt: now });
      setMessage('Added to the trip itinerary.');
    } catch { setError('The itinerary stop could not be saved. Try again.'); } finally { setSaving(false); }
  };
  const externalSearchUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((query || location || 'travel destination') + ' ' + location);
  const collectionPlaces = results.filter((place) => !collection || place.collection === collection).slice(0, 6);

  return <div className="page poreia-page"><PageTop><button type="button" className="back-link" onClick={nav.back}>Back</button></PageTop><PoreiaHeader compact eyebrow="Find somewhere worth going" title="Discover" description="Find a place, save the idea, and make it part of a trip."><button type="button" className="button-quiet" onClick={() => nav.swap({ name: 'trips' })}><TripsIcon size={18} /> Your trips</button></PoreiaHeader>
    <div className="page page--under-hero poreia-discover-page">
      <form className="poreia-discover-search" onSubmit={(event) => { event.preventDefault(); rememberSearch(); }}><label className="field"><span className="field__label">Search destinations and places</span><input className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="City, park, restaurant, or attraction" /></label><button type="submit" className="button-main"><DiscoverIcon size={18} /> Search</button></form>
      <div className="poreia-discover-location"><label className="field"><span className="field__label">Explore near</span><input className="input" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Anywhere · enter a city or region" /></label><span className="hint">Location access is optional.</span></div>
      {query && <section className="poreia-section"><div className="poreia-section-head"><div><p className="label">Search results</p><h2>{results.length ? results.length + ' places to explore' : 'No curated matches yet'}</h2></div><a className="text-link" href={externalSearchUrl} target="_blank" rel="noreferrer">Search Maps</a></div>{results.length ? <div className="poreia-discover-grid">{results.map((place) => <PlaceCard key={placeKey(place)} place={place} compared={compareKeys.includes(placeKey(place))} onOpen={() => openPlace(place)} onCompare={() => toggleCompare(place)} />)}</div> : <div className="card poreia-empty"><DiscoverIcon size={28} /><p className="muted">No configured provider returned a result. You can search Google Maps or save a place manually below.</p><a className="button-quiet" href={externalSearchUrl} target="_blank" rel="noreferrer">Open external search</a></div>}</section>}
      {!query && !selected && <><section className="poreia-section"><div className="poreia-section-head"><div><p className="label">Curated starter guide</p><h2>{location.trim() ? 'Ideas near ' + location.trim() : 'Start with a kind of escape'}</h2></div><span className="label">No provider required</span></div><div className="poreia-collection-list">{COLLECTIONS.slice(0, 6).map((item) => <button type="button" className={'poreia-collection-card' + (collection === item ? ' is-selected' : '')} key={item} onClick={() => setCollection(collection === item ? '' : item)}><span>{item}</span><small>{CURATED_PLACES.filter((place) => place.collection === item && (!location.trim() || place.location.toLowerCase().includes(location.trim().toLowerCase()))).length} ideas</small></button>)}</div></section><section className="poreia-section"><div className="poreia-section-head"><h2>{collection || 'Weekend escapes'}</h2><button type="button" className="text-link" onClick={() => setCollection('')}>{collection ? 'Show all' : 'Clear'}</button></div>{collectionPlaces.length ? <div className="poreia-discover-grid">{collectionPlaces.map((place) => <PlaceCard key={placeKey(place)} place={place} compared={compareKeys.includes(placeKey(place))} onOpen={() => openPlace(place)} onCompare={() => toggleCompare(place)} />)}</div> : <p className="muted">No curated places match this location yet. Try another city or explore anywhere.</p>}</section><section className="poreia-section"><div className="poreia-section-head"><h2>Recently viewed</h2><span className="label">{recentPlaces.length}</span></div>{recentPlaces.length ? <div className="poreia-list">{recentPlaces.map((place) => <button type="button" className="poreia-row poreia-row--button" key={placeKey(place)} onClick={() => openPlace(place)}><DiscoverIcon size={22} /><span className="poreia-row__text"><strong>{place.name}</strong><small>{place.location} · {place.category}</small></span><ChevronIcon size={18} /></button>)}</div> : <p className="muted">Open a destination to keep it here for quick return.</p>}</section><section className="poreia-section"><div className="poreia-section-head"><h2>Saved places</h2><span className="label">{savedDisplays.length}</span></div>{savedDisplays.length ? <div className="poreia-list">{savedDisplays.slice(0, 5).map((place) => <button type="button" className="poreia-row poreia-row--button" key={placeKey(place)} onClick={() => openPlace(place)}><DiscoverIcon size={22} /><span className="poreia-row__text"><strong>{place.name}</strong><small>{place.location} · {place.saved?.tripId ? 'Saved to a trip' : 'Saved for later'}</small></span><ChevronIcon size={18} /></button>)}</div> : <div className="card poreia-empty"><DiscoverIcon size={28} /><p className="muted">Save a destination, attraction, or restaurant to return to it here.</p></div>}</section></>}
      {selected && <section className="poreia-section poreia-discover-detail"><div className="poreia-section-head"><button type="button" className="text-link" onClick={() => setSelected(undefined)}>Back to Discover</button><span className="label">{selected.saved ? 'Saved place' : 'Curated guide'}</span></div><div className="poreia-discover-detail__hero"><span className="poreia-discover-card__art" aria-hidden="true"><DiscoverIcon size={32} /></span><div><p className="label">{selected.category} · {selected.location}</p><h2>{selected.name}</h2><p>{selected.description}</p></div></div><div className="poreia-discover-facts"><span><strong>Best for</strong>{selected.collection}</span><span><strong>Season</strong>{selected.season}</span><span><strong>Source</strong>{selected.saved?.provider || 'Lamplight curated guide'}</span></div><div className="button-row"><a className="button-quiet" href={selected.url} target="_blank" rel="noreferrer">Research online</a><button type="button" className="button-quiet" onClick={() => toggleCompare(selected)}>{compareKeys.includes(placeKey(selected)) ? 'Remove comparison' : 'Compare destination'}</button></div><SavePanel place={selected} trips={trips} tripChoice={tripChoice} newTripName={newTripName} onTripChoice={setTripChoice} onNewTripName={setNewTripName} onSave={() => void savePlace()} onItinerary={() => void addToItinerary()} saving={saving} message={message} error={error} /></section>}
      {compared.length >= 2 && <section className="card poreia-discover-compare"><div className="poreia-section-head"><h2>Compare destinations</h2><button type="button" className="text-link" onClick={() => setCompareKeys([])}>Clear</button></div><div className="poreia-discover-compare__grid">{compared.map((place) => <div key={placeKey(place)}><strong>{place.name}</strong><small>{place.location}</small><span>{place.collection}</span><span>{place.season}</span><button type="button" className="text-link" onClick={() => toggleCompare(place)}>Remove</button></div>)}</div></section>}
      <section className="card poreia-discover-manual"><div><strong>Have your own lead?</strong><p>Save a destination or travel link even when no provider is connected.</p></div><button type="button" className="button-main" onClick={() => { setManualOpen(true); setSelected(undefined); }}>Save a place</button></section>
      {manualOpen && <ManualPlaceForm onSaved={(place) => { setManualOpen(false); openPlace(displaySaved(place)); setMessage('Saved for later in Discover.'); }} />}
      {recentSearches.length > 0 && <div className="poreia-discover-recent-searches"><span className="field__label">Recent searches</span>{recentSearches.map((item) => <button type="button" className="chip" key={item} onClick={() => setQuery(item)}>{item}</button>)}</div>}
    </div>
  </div>;
}

function SavePanel({ place, trips, tripChoice, newTripName, onTripChoice, onNewTripName, onSave, onItinerary, saving, message, error }: { place: DisplayPlace; trips: Trip[]; tripChoice: string; newTripName: string; onTripChoice: (value: string) => void; onNewTripName: (value: string) => void; onSave: () => void; onItinerary: () => void; saving: boolean; message: string; error: string }) {
  const hasTrip = Boolean(tripChoice || place.saved?.tripId);
  return <section className="card poreia-discover-save"><div className="poreia-section-head"><div><p className="label">Keep planning</p><h2>Save {place.name}</h2></div><CheckIcon size={22} /></div><label className="field"><span className="field__label">Add to a trip</span><select className="input" value={tripChoice} onChange={(event) => onTripChoice(event.target.value)}><option value="">Save for later</option><option value="new">Create a new trip</option>{trips.filter((trip) => trip.status !== 'canceled').map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}</select></label>{tripChoice === 'new' && <label className="field"><span className="field__label">New trip name</span><input className="input" value={newTripName} onChange={(event) => onNewTripName(event.target.value)} placeholder={place.name} /></label>}<div className="button-row"><button type="button" className="button-main" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : hasTrip ? 'Save to trip' : 'Save place'}</button>{hasTrip && <button type="button" className="button-quiet" onClick={onItinerary} disabled={saving}><CalendarIcon size={18} /> Add to itinerary</button>}</div>{message && <p className="form-success" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}</section>;
}
