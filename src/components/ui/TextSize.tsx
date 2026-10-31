import { TEXT_SIZES, type TextSize } from '../../data/storage/preferences';

const NAMES: Record<TextSize, string> = {
  small: 'Smaller',
  default: 'Default',
  large: 'Large',
  larger: 'Larger',
  largest: 'Largest',
  huge: 'Huge',
};

/** Text size as a slider between a small and a large A, as the phone's own setting shows it. */
export default function TextSizeSlider({ value, onChange }: { value: TextSize; onChange: (size: TextSize) => void }) {
  const at = Math.max(0, TEXT_SIZES.indexOf(value));
  return (
    <label className="text-size">
      <span className="text-size__a text-size__a--small" aria-hidden="true">A</span>
      <input
        type="range"
        min={0}
        max={TEXT_SIZES.length - 1}
        step={1}
        value={at}
        aria-label="Text size"
        aria-valuetext={NAMES[value]}
        onChange={(event) => onChange(TEXT_SIZES[Number(event.target.value)])}
      />
      <span className="text-size__a text-size__a--large" aria-hidden="true">A</span>
    </label>
  );
}
