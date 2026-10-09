import type { Bill } from '../../oikonomia/core/bills';
import type { Drink } from '../../hydros/core/drinks';
import type { TheoriaBook } from '../../theoria/core/books';
import { volumeLabel } from '../../hydros/core/drinks';
import { loadSettings as hydrosSettings } from '../../hydros/data/store';
import { bookInProgress, billsSoon, ouncesToday } from '../../app/family/glance';
import { useStore } from '../../app/family/read';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { BookIcon, ChevronRightIcon, ListIcon, WaveIcon } from '../../components/icons/Icons';
import NotForMe from './NotForMe';

type Row = { key: string; href: string; icon: React.ReactNode; title: string; detail: string };

/**
 * A few plain facts from the other apps, only the ones the person switched on in Settings > What's
 * included, and only when there is something to say. Each row opens its app. Nothing here counts, scores
 * or advises.
 */
export default function TodayFamily({ today }: { today: string }) {
  const shows = useTodayParts();
  const bills = useStore<Bill>('oikonomiaBills', shows('bills'));
  const drinks = useStore<Drink>('hydrosDrinks', shows('water'));
  const books = useStore<TheoriaBook>('theoriaBooks', shows('reading'));
  const rows: (Row & { part: 'bills' | 'water' | 'reading' })[] = [];

  if (shows('bills')) {
    const soon = billsSoon(bills, today);
    if (soon.length > 0) {
      rows.push({
        part: 'bills',
        key: 'bills',
        href: '/oikonomia/',
        icon: <ListIcon size={20} />,
        title: soon
          .slice(0, 2)
          .map((bill) => `${bill.name} ${bill.when}`)
          .join(' · '),
        detail: soon.length > 2 ? `And ${soon.length - 2} more in Oikonomia.` : 'Coming up in Oikonomia.',
      });
    }
  }
  if (shows('water')) {
    const oz = ouncesToday(drinks, today);
    if (oz > 0) {
      rows.push({
        part: 'water',
        key: 'water',
        href: '/hydros/',
        icon: <WaveIcon size={20} />,
        title: `${volumeLabel(oz, hydrosSettings().unit)} drunk so far`,
        detail: 'Today in Hydros.',
      });
    }
  }
  if (shows('reading')) {
    const book = bookInProgress(books);
    if (book) {
      rows.push({
        part: 'reading',
        key: 'reading',
        href: '/theoria/',
        icon: <BookIcon size={20} />,
        title: book.title,
        detail: book.author ? `Reading, by ${book.author}, in Theoria.` : 'Reading in Theoria.',
      });
    }
  }

  return (
    <>
      {rows.map((row) => (
        <div className="quiet-row-wrap" key={row.key}>
          <a className="quiet-row" href={row.href}>
            <span className="quiet-row__icon" aria-hidden="true">
              {row.icon}
            </span>
            <span className="quiet-row__text">
              <span>{row.title}</span>
              <span className="quiet-row__detail">{row.detail}</span>
            </span>
            <ChevronRightIcon size={18} className="quiet-row__chevron" />
          </a>
          <NotForMe part={row.part} />
        </div>
      ))}
    </>
  );
}
