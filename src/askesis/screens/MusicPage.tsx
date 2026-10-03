import { useEffect, useRef, useState } from 'react';
import { letGo, wakeAudio } from '../../app/sound/engine';
import type { Nav } from '../app/App';
import { PauseIcon, PlayIcon, PlusIcon } from '../app/icons';
import { addSongs, playSongs, removeSong, stopSongs, useNowPlaying, useSongs } from '../app/music';
import { useSettings } from '../app/state';
import { BackLink, Segmented, Switch, useUndo } from '../app/ui';
import { saveSettings } from '../data/store';

/** Music for guided sessions: songs kept here, another app's, or none. */
export default function MusicPage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const songs = useSongs();
  const song = useNowPlaying();
  const undo = useUndo();
  const [trying, setTrying] = useState(false);
  const [added, setAdded] = useState<string>();
  const input = useRef<HTMLInputElement>(null);

  const stop = () => {
    stopSongs();
    letGo();
    setTrying(false);
  };
  // Leaving the page stops a song played here.
  const tryingNow = useRef(trying);
  tryingNow.current = trying;
  useEffect(
    () => () => {
      if (tryingNow.current) {
        stopSongs();
        letGo();
      }
    },
    [],
  );

  const play = async () => {
    wakeAudio();
    setTrying(true);
    if (!(await playSongs(settings.shuffle))) stop();
  };

  return (
    <div className="page">
      <BackLink label="More" onBack={nav.back} />
      <h1 className="title">Music</h1>

      <section className="field">
        <h2 className="label">During a session</h2>
        <Segmented
          label="During a session"
          value={settings.music}
          options={[
            { id: 'none', label: 'None' },
            { id: 'mine', label: 'Songs here' },
            { id: 'other', label: 'Another app' },
          ]}
          onChange={(music) => saveSettings({ ...settings, music })}
        />
        {settings.music === 'other' && (
          <p className="hint">Start it in your music app first. The screen stays on so the bells are heard over it.</p>
        )}
      </section>

      {settings.music !== 'other' && (
        <>
          <div className="card switches">
            <Switch on={settings.shuffle} label="Shuffle" onToggle={() => saveSettings({ ...settings, shuffle: !settings.shuffle })} />
          </div>

          <section className="field" aria-label="Songs">
            <div className="music-head">
              <h2 className="label">Songs</h2>
              {songs && songs.length > 0 && (
                <button type="button" className="text-link music-play" onClick={() => (trying && song.name ? stop() : void play())}>
                  {trying && song.name ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
                  {trying && song.name ? 'Stop' : 'Play'}
                </button>
              )}
            </div>
            {trying && song.name && <p className="hint">♪ {song.name}</p>}
            {songs && songs.length === 0 && <p className="muted">No songs yet.</p>}
            <ul className="song-list">
              {songs?.map((each) => (
                <li key={each.id} className="song-list__item">
                  <span className="song-list__name">{each.name}</span>
                  <button
                    type="button"
                    className="text-link"
                    onClick={async () => {
                      const putBack = await removeSong(each.id);
                      undo('Song removed', () => void putBack());
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <input
              ref={input}
              type="file"
              accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac"
              multiple
              hidden
              onChange={async (event) => {
                const files = [...(event.target.files ?? [])];
                event.target.value = '';
                const count = await addSongs(files);
                setAdded(count === 0 ? 'Those files are not songs this phone can play.' : undefined);
                if (count > 0 && settings.music === 'none') saveSettings({ ...settings, music: 'mine' });
              }}
            />
            <button type="button" className="button-quiet" onClick={() => input.current?.click()}>
              <PlusIcon size={18} /> Add songs
            </button>
            {added && (
              <p className="hint" role="status">
                {added}
              </p>
            )}
            <p className="hint">From your phone’s files, kept on this phone. Songs in streaming apps stay in those apps.</p>
          </section>
        </>
      )}
    </div>
  );
}
