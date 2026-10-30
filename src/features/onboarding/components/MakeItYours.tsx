import { Sym } from '../../../lamplight/icons';
import { tap } from '../../../app/feel';
import { greetingWords } from '../../../app/family/greeting';
import { LAMP_COLORS, ROOMS, colorFor, swatchOf, wallpaperOf, type ColorChoice, type Room } from '../../../app/lamplight';

export type Choices = { name: string; shifts: boolean; intention: string; room: Room; color: ColorChoice };

type Props = { choices: Choices; onChange: (choices: Choices) => void };

/**
 * Name, the room and its lamp (the welcome redraws as they are chosen), one thing that matters today (Today's
 * intention) and whether to set up a schedule next. All can be left as they are. Values are not asked for here: Today
 * offers them after a few days, and Compass holds them.
 */
export default function MakeItYours({ choices, onChange }: Props) {
  const name = choices.name.trim();
  const choose = (next: Partial<Choices>) => {
    tap();
    onChange({ ...choices, ...next });
  };
  return (
    <div className="ob-panel make-yours">
      <p className="make-yours__hello" aria-live="polite">
        {greetingWords()}
        {name ? `, ${name}` : ''}
      </p>

      <div className="ob-card make-yours__card">
        <label className="ob-field">
          <span>Your name</span>
          <input
            className="ob-input"
            autoComplete="given-name"
            maxLength={40}
            value={choices.name}
            onChange={(event) => onChange({ ...choices, name: event.target.value })}
          />
        </label>
        <label className="ob-field">
          <span>One thing that matters today <em>(optional)</em></span>
          <input
            className="ob-input"
            maxLength={120}
            value={choices.intention}
            onChange={(event) => onChange({ ...choices, intention: event.target.value })}
          />
        </label>
      </div>

      <div className="ob-card make-yours__card">
        <p className="ob-label" id="ob-room">Room</p>
        <div className="ob-rooms" role="radiogroup" aria-labelledby="ob-room">
          {ROOMS.map((room) => (
            <button
              key={room}
              type="button"
              role="radio"
              className="ob-room"
              aria-checked={choices.room === room}
              onClick={() => choose({ room })}
            >
              <span className="ob-room__art" style={{ backgroundImage: wallpaperOf(room, 'dark') }} aria-hidden="true" />
              <span className="ob-room__name">{room}</span>
            </button>
          ))}
        </div>
        <p className="ob-label" id="ob-color">Color</p>
        <div className="ob-colors" role="radiogroup" aria-labelledby="ob-color">
          {(['match', ...LAMP_COLORS] as ColorChoice[]).map((color) => (
            <button
              key={color}
              type="button"
              role="radio"
              className="ob-color"
              aria-checked={choices.color === color}
              aria-label={color === 'match' ? `Match the room (${colorFor(choices.room, 'match')})` : color}
              onClick={() => choose({ color })}
            >
              <span style={{ background: swatchOf(colorFor(choices.room, color), 'dark', choices.room) }} />
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="ob-card make-yours__toggle"
        aria-pressed={choices.shifts}
        onClick={() => choose({ shifts: !choices.shifts })}
      >
        Set up my schedule next
        <span className="make-yours__check" aria-hidden="true">{choices.shifts ? <Sym name="check" size={16} /> : null}</span>
      </button>
    </div>
  );
}
