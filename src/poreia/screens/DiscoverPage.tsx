import { useState } from 'react';
import type { Nav } from '../app/App';
import { DiscoverIcon, PlusIcon } from '../app/icons';
import { usePlaces } from '../app/state';
import { newId } from '../core/id';
import type { PlaceIdea } from '../core/trips';
import { putPlace } from '../data/store';
import { PageTop, PoreiaHeader } from '../app/ui';

export default function DiscoverPage({ nav }: { nav: Nav }) {
  const places = usePlaces();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const save = async () => {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const place: PlaceIdea = { id: newId(), name: name.trim(), location: location.trim() || undefined, note: note.trim() || undefined, createdAt: now, updatedAt: now };
    await putPlace(place);
    setName('');
    setLocation('');
    setNote('');
  };
  return <div className="page poreia-page"><PageTop><button type="button" className="back-link" onClick={nav.back}>Back</button></PageTop><PoreiaHeader eyebrow="Collect possibilities" title="Discover" />
    <div className="page page--under-hero">
      <form className="card poreia-form" onSubmit={(event) => { event.preventDefault(); void save(); }}><div className="poreia-section-head"><h2>Save a place</h2><PlusIcon size={22} /></div><label className="field"><span className="field__label">Name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="A place worth considering" required /></label><label className="field"><span className="field__label">Location or link</span><input className="input" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City, region, or web link" /></label><label className="field"><span className="field__label">Your note</span><textarea className="input" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why it belongs on the list" /></label><button type="submit" className="button-main">Save idea</button></form>
      <section className="poreia-section"><div className="poreia-section-head"><h2>Saved places</h2><span className="label">{places.length}</span></div>{places.length === 0 ? <div className="card poreia-empty"><DiscoverIcon size={28} /><p className="muted">Keep destination ideas here before you commit to a trip.</p></div> : <div className="poreia-list">{places.map((place) => <div className="poreia-row" key={place.id}><DiscoverIcon size={22} /><span className="poreia-row__text"><strong>{place.name}</strong><small>{place.location || 'Location to decide'}{place.note ? ` · ${place.note}` : ''}</small></span></div>)}</div>}</section>
    </div>
  </div>;
}
