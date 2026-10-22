import { Placeholder } from '../../lamplight/Placeholder';
import { useEffect, useRef, useState } from 'react';
import { CameraIcon, ChevronIcon } from '../../app/family/icons';
import { offerUndo } from '../../app/family/shell';
import type { PhytonNav } from '../app/App';
import { findPlant, putPlant } from '../app/state';
import { holdPhoto, identify, IDENTIFY_SOURCE, scoreText, type Match, type Organ } from '../app/identify';
import { speciesForLatin } from '../core/species';

const ORGANS: { id: Organ; label: string }[] = [
  { id: 'leaf', label: 'Leaf' },
  { id: 'flower', label: 'Flower' },
  { id: 'fruit', label: 'Fruit' },
  { id: 'bark', label: 'Bark' },
  { id: 'auto', label: 'Whole plant' },
];

type Shot = { file: File; url: string; organ: Organ };

/** Up to three photos of one plant, sent to Pl@ntNet on a tap; the person picks the match. */
export default function IdentifyPage({ nav, plantId }: { nav: PhytonNav; plantId?: string }) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<Match[] | undefined>();
  const picker = useRef<HTMLInputElement>(null);
  const existing = plantId ? findPlant(plantId) : undefined;
  useEffect(() => () => shots.forEach((shot) => URL.revokeObjectURL(shot.url)), []);

  const add = (files: FileList | null) => {
    const next = [...shots];
    for (const file of Array.from(files ?? [])) if (next.length < 3 && file.type.startsWith('image/')) next.push({ file, url: URL.createObjectURL(file), organ: next.length === 0 ? 'leaf' : 'flower' });
    setShots(next);
    setMatches(undefined);
  };

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      setMatches(await identify(shots.map(({ file, organ }) => ({ file, organ }))));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not go through. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const choose = (match: Match) => {
    const species = speciesForLatin(match.latin, match.genus);
    const given = match.common[0] ? match.common[0][0].toUpperCase() + match.common[0].slice(1) : match.latin;
    if (existing) {
      putPlant({ ...existing, species: species?.key ?? existing.species, latin: match.latin });
      offerUndo(`${existing.name}: ${species?.name ?? match.latin}`, () => putPlant(existing));
      nav.back();
      return;
    }
    holdPhoto(shots[0]?.file);
    nav.swap({ name: 'plant', species: species?.key, latin: match.latin, given: species ? undefined : given });
  };

  return (
    <div className="page phyton-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Cancel</button>
        <p className="label">{existing ? existing.name : 'Identify'}</p>
        <span />
      </div>

      <h1 className="title">What plant is this?</h1>
      <p className="muted">A leaf or a flower, close and in focus, works best. Up to three photos of the same plant.</p>

      {shots.length > 0 && (
        <ul className="shots">
          {shots.map((shot, index) => (
            <li key={shot.url} className="shot">
              <img src={shot.url} alt={`Photo ${index + 1}`} />
              <div className="chip-row" role="group" aria-label={`Photo ${index + 1} shows`}>
                {ORGANS.map((organ) => (
                  <button key={organ.id} type="button" className="chip" aria-pressed={shot.organ === organ.id} onClick={() => setShots(shots.map((each, at) => (at === index ? { ...each, organ: organ.id } : each)))}>
                    {organ.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  URL.revokeObjectURL(shot.url);
                  setShots(shots.filter((_, at) => at !== index));
                  setMatches(undefined);
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <input ref={picker} type="file" accept="image/*" capture="environment" multiple hidden onChange={(event) => { add(event.target.files); event.target.value = ''; }} />
      <div className="button-row">
        {shots.length < 3 && (
          <button type="button" className={shots.length ? 'button-quiet' : 'button-main'} onClick={() => picker.current?.click()}>
            <CameraIcon size={18} />{shots.length ? 'Another photo' : 'Take or choose a photo'}
          </button>
        )}
        {shots.length > 0 && <button type="button" className="button-main" disabled={busy} onClick={() => void run()}>{busy ? 'Identifying…' : 'Identify'}</button>}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {busy && <Placeholder label="Identifying" kind="rows" count={3} />}

      {matches && !busy && (
        <section aria-label="Matches">
          {matches.length === 0 ? (
            <p className="muted">No match. Try a closer photo of a leaf or a flower.</p>
          ) : (
            <>
              <p className="label">Most likely first</p>
              <ul className="rows">
                {matches.map((match) => {
                  const known = speciesForLatin(match.latin, match.genus);
                  const exact = known && known.latin.toLowerCase() === match.latin.toLowerCase();
                  const common = match.common[0] ? match.common[0][0].toUpperCase() + match.common[0].slice(1) : undefined;
                  return (
                    <li key={match.latin}>
                      <button type="button" className="row row--plain" onClick={() => choose(match)}>
                        <span className="row__text">
                          <span>{common ?? match.latin}</span>
                          <span className="row__detail">{[common ? match.latin : match.family, known && (exact ? 'Care notes' : `Care as for ${known.name}`)].filter(Boolean).join(' · ')}</span>
                        </span>
                        <span className="match-score">{scoreText(match.score)}</span>
                        <ChevronIcon size={18} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {matches[0].score < 0.3 && <p className="muted">Not sure. Another photo, of a flower if it has one, can help.</p>}
            </>
          )}
        </section>
      )}

      <p className="fine">{IDENTIFY_SOURCE}</p>
    </div>
  );
}
