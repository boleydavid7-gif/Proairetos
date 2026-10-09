import type { Bill } from '../../oikonomia/core/bills';
import { billsSoon } from '../../app/family/glance';
import { useStore } from '../../app/family/read';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { ChevronRightIcon, ListIcon } from '../../components/icons/Icons';
import NotForMe from './NotForMe';

/**
 * Bills with a date in the next few days and no payment recorded, only if the person switched them on in
 * Settings > What's included, and only when there is one. It opens Oikonomia. Nothing here counts, scores
 * or advises.
 */
export default function TodayFamily({ today }: { today: string }) {
  const shows = useTodayParts();
  const bills = useStore<Bill>('oikonomiaBills', shows('bills'));
  if (!shows('bills')) return null;
  const soon = billsSoon(bills, today);
  if (soon.length === 0) return null;
  return (
    <div className="quiet-row-wrap">
      <a className="quiet-row" href="/oikonomia/">
        <span className="quiet-row__icon" aria-hidden="true">
          <ListIcon size={20} />
        </span>
        <span className="quiet-row__text">
          <span>
            {soon
              .slice(0, 2)
              .map((bill) => `${bill.name} ${bill.when}`)
              .join(' · ')}
          </span>
          <span className="quiet-row__detail">{soon.length > 2 ? `And ${soon.length - 2} more in Oikonomia.` : 'Coming up in Oikonomia.'}</span>
        </span>
        <ChevronRightIcon size={18} className="quiet-row__chevron" />
      </a>
      <NotForMe part="bills" />
    </div>
  );
}
