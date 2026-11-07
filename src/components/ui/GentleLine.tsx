import { gentleLineFor } from '../../core/stoic/gentleLines';
import { toLocalDate } from '../../core/scheduling/dates';

/** A quiet line under an empty state. */
export default function GentleLine() {
  return <p className="gentle-line">{gentleLineFor(toLocalDate(new Date()))}</p>;
}
