import { useState, useSyncExternalStore } from 'react';
import { BackIcon } from '../../app/family/icons';
import { tap } from '../../app/feel';
import { player } from '../../app/sound/player';
import { soundEntry } from '../../app/sound/soundscapes';
import type { DiaitaNav } from '../app/App';
import { SLEEP_MUSIC, SLEEP_SOUNDS, SLEEP_TIMERS, playSleepSounds, saveSleepChoice, sleepChoice, stopSleepSounds, timeSleepSounds, useSleepSounds, type SleepSoundChoice } from '../app/sleepSounds';
import { timeText } from '../core/rhythm';

const timerName = (minutes: number) => (minutes === 0 ? 'Until I stop' : minutes < 60 ? `${minutes} min` : minutes === 60 ? '1 hour' : `${minutes / 60} hours`);

/** Sleep sounds: one sound and one piece of music, played until a timer fades them out. */
export default function SleepSoundsPage({ nav }: { nav: DiaitaNav }) {
  const [choice, setChoice] = useState<SleepSoundChoice>(sleepChoice);
  const playing = useSleepSounds();
  const loading = useSyncExternalStore(player.subscribe, () => player.state().loading.length > 0);
  const problem = useSyncExternalStore(player.subscribe, () => player.state().problem);

  const change = (next: SleepSoundChoice, retime = false) => {
    setChoice(next);
    saveSleepChoice(next);
    if (!playing) return;
    if (retime) timeSleepSounds(next.minutes);
    else playSleepSounds(next);
  };
  const chips = (ids: readonly string[], picked: string | undefined, pick: (id: string | undefined) => void, label: string) => (
    <div className="chip-row" role="group" aria-label={label}>
      <button type="button" className="chip" aria-pressed={!picked} onClick={() => pick(undefined)}>None</button>
      {ids.map((id) => (
        <button key={id} type="button" className="chip" aria-pressed={picked === id} onClick={() => pick(id)}>{soundEntry(id)?.title ?? id}</button>
      ))}
    </div>
  );
  const nothing = !choice.sound && !choice.music;

  return (
    <div className="page diaita-page diaita-sounds">
      <div className="page-top">
        <button type="button" className="back-link" onClick={nav.back}><BackIcon size={18} />Back</button>
      </div>
      <h1 className="title">Sleep sounds</h1>

      <section className="card diaita-sounds__now" data-ll-lit={playing ? true : undefined} aria-live="polite">
        {playing ? (
          <>
            <span className="card__eyebrow">Playing</span>
            <strong>{playing.ids.map((id) => soundEntry(id)?.title).filter(Boolean).join(' and ')}</strong>
            <span className="muted">{playing.endsAt ? `Fades out by ${timeText(new Date(playing.endsAt))}` : 'Plays until you stop'}{loading ? ' · Getting ready…' : ''}</span>
            <button type="button" className="button-quiet" onClick={() => { tap(); stopSleepSounds(); }}>Stop</button>
          </>
        ) : (
          <button type="button" className="button-main" disabled={nothing} onClick={() => { tap(); playSleepSounds(choice); }}>Play</button>
        )}
        {problem && <p className="muted">{soundEntry(problem)?.title ?? 'That sound'} couldn’t be loaded. Check the connection and try again.</p>}
      </section>

      <section className="diaita-sounds__part">
        <h2 className="ll-section-label">Sound</h2>
        {chips(SLEEP_SOUNDS, choice.sound, (sound) => change({ ...choice, sound }), 'Sound')}
      </section>
      <section className="diaita-sounds__part">
        <h2 className="ll-section-label">Music</h2>
        {chips(SLEEP_MUSIC, choice.music, (music) => change({ ...choice, music }), 'Music')}
      </section>
      <section className="diaita-sounds__part">
        <h2 className="ll-section-label">Timer</h2>
        <div className="chip-row" role="group" aria-label="Timer">
          {SLEEP_TIMERS.map((minutes) => (
            <button key={minutes} type="button" className="chip" aria-pressed={choice.minutes === minutes} onClick={() => change({ ...choice, minutes }, true)}>{timerName(minutes)}</button>
          ))}
        </div>
      </section>
    </div>
  );
}
