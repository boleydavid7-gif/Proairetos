import { Sym } from '../../lamplight/icons';

/** A count chosen with − and + (the family's `.stepper`, as iOS's own stepper), so it never has to be typed over. */
export function CountStepper({ label, value, min = 1, max = 20, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (next: number) => void }) {
  return (
    <div className="field">
      <span className="field__label" id={`count-${label}`}>{label}</span>
      <div className="stepper" role="group" aria-labelledby={`count-${label}`}>
        <button type="button" className="stepper__button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
          <Sym name="minus" />
        </button>
        <span className="stepper__value" aria-live="polite">{value}</span>
        <button type="button" className="stepper__button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
          <Sym name="plus" />
        </button>
      </div>
    </div>
  );
}
