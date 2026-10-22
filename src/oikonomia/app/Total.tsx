import { RollingNumber } from '../../lamplight/RollingNumber';
import { formatMoney } from '../core/bills';

/** A summary's main amount: rolled to its new value when it is in one currency, else the text as written. */
export function Total({ summary }: { summary: { main: string; figure?: { currency: string; cents: number } } }) {
  const { figure } = summary;
  if (!figure) return <>{summary.main}</>;
  return <RollingNumber key={figure.currency} value={figure.cents} format={(cents) => formatMoney(Math.round(cents), figure.currency)} />;
}
