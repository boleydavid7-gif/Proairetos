import { useState } from 'react';
import { useClock } from '../../app/hooks/useClock';
import { loadPauseSettings, savePauseSettings, type PauseSettings } from '../../data/storage/preferences';

type Props = {
  onClose: () => void;
};

const anchors: { id: PauseSettings['anchor']; label: string; gather: string }[] = [
  { id: 'breath', label: 'Breath', gather: 'Rest your attention on the breath, wherever you feel it most.' },
  { id: 'feet', label: 'Feet', gather: 'Feel your feet on the floor and the weight of your body.' },
  { id: 'sounds', label: 'Sounds', gather: 'Let sounds come and go. Rest your attention on hearing.' },
];

/**
 * Modelled on the MBCT three-minute breathing space: notice what is here,
 * gather attention on one anchor, then widen. One or three minutes, and the
 * anchor need not be the breath.
 */
export default function PauseScreen({ onClose }: Props) {
  const [settings, setSettings] = useState<PauseSettings>(() => loadPauseSettings());
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const now = useClock(1000).getTime();
  const anchor = anchors.find((a) => a.id === settings.anchor) ?? anchors[0];

  if (startedAt === null) {
    return (
      <div className="pause-screen" role="dialog" aria-modal="true" aria-label="Pause">
        <div className="pause-screen__center">
          <p className="pause-screen__title">A moment to arrive</p>
          <div className="mini-segmented mini-segmented--wide" role="group" aria-label="How long">
            {([1, 3] as const).map((minutes) => (
              <button
                key={minutes}
                type="button"
                aria-pressed={settings.minutes === minutes}
                onClick={() => setSettings({ ...settings, minutes })}
              >
                {minutes} minute{minutes === 1 ? '' : 's'}
              </button>
            ))}
          </div>
          <p className="pause-screen__cue">What would you like to rest your attention on?</p>
          <div className="chip-row pause-screen__anchors" role="group" aria-label="Anchor">
            {anchors.map((option) => (
              <button
                key={option.id}
                type="button"
                className="chip"
                aria-pressed={settings.anchor === option.id}
                onClick={() => setSettings({ ...settings, anchor: option.id })}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="button-accent"
            onClick={() => {
              savePauseSettings(settings);
              setStartedAt(Date.now());
            }}
          >
            Begin
          </button>
          <button type="button" className="button-quiet" onClick={onClose}>
            Not now
          </button>
        </div>
      </div>
    );
  }

  // Measured from the start time, so a dimmed screen or throttled timer never stretches it.
  const total = settings.minutes * 60;
  // The clock ticks once a second, so it can briefly read earlier than the start.
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const done = seconds >= total;
  const phase = Math.min(2, Math.floor((seconds / total) * 3));
  const breathingIn = seconds % 10 < 4;

  const phases = [
    { title: 'Notice', cue: 'What is here right now? Thoughts, feelings, sensations. No need to change anything.' },
    { title: 'Gather', cue: anchor.gather },
    { title: 'Widen', cue: 'Let your attention widen to your whole body, and the space around you.' },
  ];

  return (
    <div className="pause-screen" role="dialog" aria-modal="true" aria-label="Pause">
      <div className="pause-screen__center">
        {done ? (
          <>
            <p className="pause-screen__title">Welcome back to your day.</p>
            <button type="button" className="button-accent" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <>
            <div
              className={`breath ${settings.anchor === 'breath' ? (breathingIn ? 'breath--in' : 'breath--out') : 'breath--still'}`}
              aria-hidden="true"
            />
            <p className="pause-screen__phase">{phases[phase].title}</p>
            {settings.anchor === 'breath' && (
              <p className="pause-screen__breath" aria-live="polite">
                {breathingIn ? 'Breathe in' : 'Breathe out'}
              </p>
            )}
            <p className="pause-screen__cue">{phases[phase].cue}</p>
            <button type="button" className="button-quiet pause-screen__end" onClick={onClose}>
              End early
            </button>
          </>
        )}
      </div>
    </div>
  );
}
