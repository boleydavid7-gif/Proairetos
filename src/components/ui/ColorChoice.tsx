import { tagColors, type TagColor } from '../../core/look/tagColors';

/** A row of colour swatches; tapping the chosen one clears it. */
export default function ColorChoice({ value, onChange, label = 'Colour' }: { value?: TagColor; onChange: (color: TagColor | undefined) => void; label?: string }) {
  return (
    <div className="color-choice" role="group" aria-label={label}>
      {tagColors.map((color) => (
        <button
          key={color.id}
          type="button"
          className={`color-choice__swatch tag--${color.id}`}
          aria-label={color.label}
          aria-pressed={value === color.id}
          onClick={() => onChange(value === color.id ? undefined : color.id)}
        />
      ))}
    </div>
  );
}
