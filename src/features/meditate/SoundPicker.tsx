import { useSheet } from '../../components/ui/useSheet';
import { soundCatalogue } from '../../app/sound/soundscapes';
import { soundIcons } from './soundIcons';

/** Chooses what plays under a sit: nothing, a sound, or music. */
export default function SoundPicker({ value, onChoose, onClose }: { value: string; onChoose: (id: string) => void; onClose: () => void }) {
  const { dialog, panel, close } = useSheet();
  const choose = (id: string) => {
    onChoose(id);
    close();
  };
  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label="Sound"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && close()}
    >
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={close}>
          Close
        </button>
        <p className="sheet__title sheet__title--static">Sound</p>
        <div className="sound-choice" role="radiogroup" aria-label="Sound">
          <button type="button" role="radio" aria-checked={value === 'none'} className="sound-choice__row" onClick={() => choose('none')}>
            <span className="sound-choice__icon" aria-hidden="true" />
            <span>Silence</span>
          </button>
          {(['sound', 'music'] as const).map((kind) => (
            <div key={kind} className="stack-tight">
              <p className="sheet__label">{kind === 'sound' ? 'Sounds' : 'Music'}</p>
              {soundCatalogue
                .filter((entry) => entry.kind === kind)
                .map((entry) => {
                  const Icon = soundIcons[entry.icon];
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="radio"
                      aria-checked={value === entry.id}
                      className="sound-choice__row"
                      onClick={() => choose(entry.id)}
                    >
                      <span className="sound-choice__icon">{Icon && <Icon size={20} />}</span>
                      <span>{entry.title}</span>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </dialog>
  );
}
