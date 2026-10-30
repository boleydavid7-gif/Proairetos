import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react';
import { settings, type Note } from '../app/state';
import { cancelTranscription, transcribeNote, transcription } from '../app/transcribe/jobs';
import { segmentAt, transcriptText } from '../app/transcribe/segments';

// Whisper's languages most people will want; Automatic hears it from the recording.
const LANGUAGES: Array<[string, string]> = [
  ['', 'Automatic'], ['en', 'English'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['it', 'Italian'],
  ['pt', 'Portuguese'], ['nl', 'Dutch'], ['sv', 'Swedish'], ['pl', 'Polish'], ['ru', 'Russian'], ['uk', 'Ukrainian'],
  ['tr', 'Turkish'], ['ar', 'Arabic'], ['hi', 'Hindi'], ['zh', 'Chinese'], ['ja', 'Japanese'], ['ko', 'Korean'],
  ['vi', 'Vietnamese'], ['id', 'Indonesian'], ['tl', 'Tagalog'], ['el', 'Greek'], ['he', 'Hebrew'],
];

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

// The transcript card on a voice note: Transcribe, its progress, and the timed sentences, each playing from its moment.
export function Transcript({ note, audio, body, onUseText }: { note: Note; audio: RefObject<HTMLAudioElement | null>; body: string; onUseText: (text: string) => void }) {
  const job = useSyncExternalStore(transcription.subscribe, () => transcription.get(note.id));
  const prefs = settings.use();
  const [playing, setPlaying] = useState(-1);
  const segments = note.transcript?.segments ?? [];
  const text = transcriptText(segments);

  useEffect(() => {
    const player = audio.current;
    if (!player || !segments.length) return;
    const follow = () => setPlaying(player.paused && player.currentTime === 0 ? -1 : segmentAt(segments, player.currentTime));
    player.addEventListener('timeupdate', follow);
    player.addEventListener('seeked', follow);
    return () => {
      player.removeEventListener('timeupdate', follow);
      player.removeEventListener('seeked', follow);
    };
  }, [audio, segments]);

  const playFrom = (seconds: number) => {
    const player = audio.current;
    if (!player) return;
    player.currentTime = seconds;
    void player.play().catch(() => undefined);
  };

  const busy = job && job.phase !== 'error';
  const status = !job
    ? ''
    : job.phase === 'waiting'
      ? 'Waiting…'
      : job.phase === 'reading'
        ? 'Reading the recording…'
        : job.phase === 'downloading'
          ? `Downloading the speech model · ${Math.round(job.progress * 100)}%`
          : job.phase === 'hearing'
            ? job.total > 1 ? `Transcribing · ${Math.min(job.done + 1, job.total)} of ${job.total}` : 'Transcribing…'
            : job.message;

  return <section className="mneme-transcript" aria-label="Transcript">
    <div className="mneme-transcript__tools">
      <button type="button" className="mneme-primary" disabled={Boolean(busy)} onClick={() => transcribeNote(note.id)}>{segments.length ? 'Transcribe again' : 'Transcribe'}</button>
      <label className="mneme-inline-field"><span>Language</span><select className="field-input" value={prefs.language ?? ''} disabled={Boolean(busy)} onChange={(event) => settings.save({ ...prefs, language: event.target.value || undefined })}>{LANGUAGES.map(([code, name]) => <option key={code || 'auto'} value={code}>{name}</option>)}</select></label>
      <label className="mneme-inline-field"><span>Model</span><select className="field-input" value={prefs.accuracy ?? 'standard'} disabled={Boolean(busy)} onChange={(event) => settings.save({ ...prefs, accuracy: event.target.value as 'standard' | 'accurate' })}><option value="standard">Standard · 77 MB</option><option value="accurate">More accurate · 250 MB</option></select></label>
    </div>
    {status && <p className={`mneme-transcript__status${job?.phase === 'error' ? ' is-error' : ''}`} role="status">{status}{job?.phase === 'waiting' && <button type="button" className="mneme-link-button" onClick={() => cancelTranscription(note.id)}>Cancel</button>}</p>}
    {job?.phase === 'downloading' && <progress className="mneme-transcript__bar" value={job.progress} max={1} />}
    {job?.phase === 'hearing' && job.total > 1 && <progress className="mneme-transcript__bar" value={job.done} max={job.total} />}
    {segments.length > 0 && <>
      <ol className="mneme-transcript__lines">{segments.map((segment, index) => <li key={`${segment.start}-${index}`}><button type="button" aria-current={index === playing ? 'true' : undefined} onClick={() => playFrom(segment.start)}><time>{clock(segment.start)}</time><span>{segment.text}</span></button></li>)}</ol>
      {text && body.trim() !== text.trim() && <button type="button" className="mneme-link-button" onClick={() => onUseText(text)}>Use as the note’s text</button>}
    </>}
    <p className="mneme-transcript__private">Heard on this device; the recording isn’t sent anywhere.</p>
  </section>;
}
