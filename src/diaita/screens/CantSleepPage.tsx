import { useEffect, useState } from 'react';
import { BackIcon, MoonIcon, TimerIcon } from '../../app/family/icons';
import { player } from '../../app/sound/player';
import type { DiaitaNav } from '../app/App';
import { CANT_SLEEP_STEPS, shuffleWord } from '../core/cantSleep';

const SOUNDS = [
  { id: null, label: 'Silence' },
  { id: 'rain', label: 'Rain' },
  { id: 'fan', label: 'Fan' },
  { id: 'stillness-one', label: 'Stillness I' },
] as const;

type Phase = 'start' | 'get-up' | 'shuffle';

export default function CantSleepPage({ nav }: { nav: DiaitaNav }) {
  const [phase, setPhase] = useState<Phase>('start');
  const [word, setWord] = useState(0);
  const [sound, setSound] = useState<string | null>(null);

  useEffect(() => () => {
    player.stop(0.5);
    window.speechSynthesis?.cancel();
  }, []);

  const play = (id: string | null) => {
    setSound(id);
    if (id) player.startSit([id]);
    else player.stop(0.5);
  };

  return (
    <div className="diaita-cant-sleep">
      <button type="button" className="diaita-cant-sleep__back" onClick={nav.back}><BackIcon size={18} />Back</button>
      <div className="diaita-cant-sleep__content">
        <MoonIcon size={32} />
        {phase === 'start' && (
          <>
            <h1>Can’t sleep</h1>
            <p>If you have been awake for about 20 minutes, leave the bed. Keep the light dim and do something calm. Go back when you feel sleepy.</p>
            <button type="button" className="diaita-cant-sleep__primary" onClick={() => setPhase('get-up')}>Get up for a while</button>
            <button type="button" className="diaita-cant-sleep__secondary" onClick={() => setPhase('shuffle')}>Try ordinary words</button>
          </>
        )}
        {phase === 'get-up' && (
          <>
            <h1>Dim light, calm activity</h1>
            <p>Read a few pages, fold something, or sit somewhere else. Return to bed when sleepiness arrives.</p>
            <button type="button" className="diaita-cant-sleep__primary" onClick={() => setPhase('shuffle')}>Try ordinary words</button>
            <details className="diaita-cant-sleep__source"><summary>Source</summary><span>{CANT_SLEEP_STEPS[0].source}</span></details>
          </>
        )}
        {phase === 'shuffle' && (
          <>
            <h1>Picture an ordinary word</h1>
            <p>{shuffleWord(word)}.</p>
            <p className="diaita-cant-sleep__instruction">See it clearly, then choose another word. Let the pictures arrive without making a story.</p>
            <button type="button" className="diaita-cant-sleep__primary" onClick={() => setWord((before) => before + 1)}>Another word</button>
            <details className="diaita-cant-sleep__source"><summary>Source</summary><span>{CANT_SLEEP_STEPS[1].source}</span></details>
          </>
        )}

        <section className="diaita-cant-sleep__sound">
          <p className="diaita-cant-sleep__label">Sound</p>
          <div className="diaita-cant-sleep__chips" role="group" aria-label="Sound">
            {SOUNDS.map((choice) => (
              <button key={choice.label} type="button" className="diaita-cant-sleep__chip" aria-pressed={sound === choice.id} onClick={() => play(choice.id)}>
                {sound === choice.id && <TimerIcon size={16} />}{choice.label}
              </button>
            ))}
          </div>
        </section>

        <button type="button" className="diaita-cant-sleep__secondary" onClick={() => nav.back()}><BackIcon size={16} />Close</button>
      </div>
    </div>
  );
}
