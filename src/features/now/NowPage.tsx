import { useState } from 'react';
import { useClock } from '../../app/hooks/useClock';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useNavigate } from '../../app/navigationContext';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService, scheduleService } from '../../app/services';
import { ChevronRightIcon } from '../../components/icons/Icons';
import { RETURN_AFTER_DAYS, daysAway, fromEarlierDays, pauseOffer, readyToCheckBack } from '../../core/rhythm/rhythm';
import { answeredPauseOffers, previousVisitDate } from '../../data/storage/preferences';
import PauseOfferCard from '../pause/PauseOfferCard';
import CheckBackNudges from '../today/CheckBackNudges';
import WelcomeBack from '../today/WelcomeBack';
import { addDays, atTime, toLocalDate } from '../../core/scheduling/dates';
import { formatLocalDay } from '../schedule/format';
import DayChangeSheet, { type DayChangeTarget } from '../today/DayChangeSheet';
import DayTimeline from '../today/DayTimeline';
import NowCard from '../today/NowCard';
import { buildDayTimeline, dayTitle } from '../today/timeline';
import CaptureBar from './components/CaptureBar';
import ImportantItems from './components/ImportantItems';
import LookAhead from './components/LookAhead';
import NowEmptyState from './components/NowEmptyState';
import ScheduledItems from './components/ScheduledItems';
import UnsortedPreview from './components/UnsortedPreview';
import WaitingItems from './components/WaitingItems';
import { useNow } from './hooks/useNow';

export default function NowPage() {
  const clock = useClock();
  const navigate = useNavigate();
  const { openItem, startFocus, openPause } = useOverlays();
  const [away] = useState(() => daysAway(previousVisitDate(), new Date()));
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const today = toLocalDate(clock);
  const [offset, setOffset] = useState(0);
  const [changing, setChanging] = useState<DayChangeTarget | null>(null);
  const date = addDays(today, offset);
  const isToday = offset === 0;

  const now = useNow();
  const items = useServiceData(lifeService.subscribe, () => lifeService.list()) ?? [];
  const patterns = useServiceData(scheduleService.subscribe, () => scheduleService.patterns());
  const dayOccurrences = useServiceData(scheduleService.subscribe, () => scheduleService.day(date), [date]) ?? [];
  const nearOccurrences =
    useServiceData(
      scheduleService.subscribe,
      () => scheduleService.occurrencesBetween(atTime(addDays(today, -1), '00:00'), atTime(addDays(today, 3), '00:00')),
      [today],
    ) ?? [];

  const entries = patterns ? buildDayTimeline(date, dayOccurrences, items, patterns) : [];
  const earlier = fromEarlierDays(items, clock);
  const earlierIds = new Set(earlier.map((item) => item.id));
  const ready = readyToCheckBack(items, clock);
  const readyIds = new Set(ready.map((item) => item.id));
  const showWelcome = isToday && away >= RETURN_AFTER_DAYS && !welcomeDismissed;
  const offer = patterns ? pauseOffer(clock, nearOccurrences, patterns, answeredPauseOffers()) : undefined;
  const hasAnything = entries.length > 0 || (now && !now.isEmpty);

  return (
    <div className="page">
      <header className="page-header day-header">
        <div className="day-header__row">
          <button type="button" className="day-header__step" aria-label="Previous day" onClick={() => setOffset(offset - 1)}>
            <ChevronRightIcon size={22} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <h1 className="page-header__title">{dayTitle(date, today)}</h1>
          <button type="button" className="day-header__step" aria-label="Next day" onClick={() => setOffset(offset + 1)}>
            <ChevronRightIcon size={22} />
          </button>
        </div>
        <p className="page-header__subtitle">
          {formatLocalDay(date, { weekday: 'long', month: 'long', day: 'numeric' })}
          {!isToday && (
            <button type="button" className="day-header__back" onClick={() => setOffset(0)}>
              Back to today
            </button>
          )}
        </p>
      </header>

      {isToday && (
        <div className="day-tools">
          <button type="button" className="chip" onClick={() => startFocus()}>
            Focus
          </button>
          <button type="button" className="chip" onClick={openPause}>
            Pause
          </button>
        </div>
      )}

      {showWelcome && <WelcomeBack days={away} earlier={earlier} onDismiss={() => setWelcomeDismissed(true)} />}
      {isToday && offer && <PauseOfferCard key={offer.start.toISOString()} occurrence={offer} />}
      {isToday && <LookAhead />}
      {isToday && <CaptureBar />}
      {isToday && <NowCard now={clock} occurrences={nearOccurrences} items={items} />}

      {entries.length > 0 && (
        <section className="stack-tight" aria-label="Your day">
          <div className="section-heading">
            <h2 className="section-label">{isToday ? 'Your day' : 'That day'}</h2>
            <button type="button" className="text-link" onClick={() => navigate('schedule')}>
              Schedule
            </button>
          </div>
          <DayTimeline
            date={date}
            entries={entries}
            now={isToday ? clock : undefined}
            onChangeDay={setChanging}
            onOpenItem={openItem}
          />
        </section>
      )}

      {patterns && patterns.length === 0 && (
        <button type="button" className="list-card list-card--button" onClick={() => navigate('schedule')}>
          <span className="list-card__text">
            <span className="list-card__title">Add your schedule</span>
            <span className="list-card__detail list-card__detail--full">
              Work hours, rotating shifts, or protected time. It repeats on its own.
            </span>
          </span>
          <ChevronRightIcon size={18} className="list-card__chevron" />
        </button>
      )}

      {isToday && now && (
        <>
          <CheckBackNudges items={ready} />
          <ImportantItems items={now.important} />
          <WaitingItems items={now.waiting.filter((item) => !readyIds.has(item.id))} />
          <UnsortedPreview count={now.unsortedCount} />
          {!showWelcome && earlier.length > 0 && (
            <details className="earlier">
              <summary>
                From earlier days <span className="closed-list__count">{earlier.length}</span>
              </summary>
              <ScheduledItems label="From earlier days" items={(now.scheduled ?? []).filter((item) => earlierIds.has(item.id))} />
            </details>
          )}
        </>
      )}

      {isToday && now && !hasAnything && patterns && patterns.length > 0 && <NowEmptyState />}
      {!isToday && entries.length === 0 && <p className="empty-note">Nothing scheduled.</p>}

      {changing && <DayChangeSheet target={changing} onClose={() => setChanging(null)} />}
    </div>
  );
}
