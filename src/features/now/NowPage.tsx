import { useState, useSyncExternalStore } from 'react';
import { useClock } from '../../app/hooks/useClock';
import { usePersonalDay } from '../../app/hooks/usePersonalDay';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { otherCalendars } from '../../app/calendars/otherCalendars';
import LighterView from '../today/LighterView';
import TodayWeather from '../today/TodayWeather';
import NotForMe from '../today/NotForMe';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useNavigate } from '../../app/navigationContext';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService, lifeService, scheduleService } from '../../app/services';
import { goalLines } from '../../core/compass/goals';
import { ChevronRightIcon, SproutIcon } from '../../components/icons/Icons';
import Landscape from '../../components/layout/Landscape';
import SettingsButton from '../../components/layout/SettingsButton';
import { RETURN_AFTER_DAYS, daysAway, fromEarlierDays, pauseOffer, readyToCheckBack } from '../../core/rhythm/rhythm';
import { addDays, atTime } from '../../core/scheduling/dates';
import { stoicLineFor } from '../../core/stoic/dailyLine';
import {
  answeredPauseOffers,
  displayName,
  isLookAheadSetAside,
  keepConcern,
  lighterToday,
  setLighterToday,
  subscribePreferences,
  keptConcerns,
  previousVisitDate,
} from '../../data/storage/preferences';
import { fromAWhileAgo } from '../../core/rhythm/aWhileAgo';
import AWhileAgo from '../today/AWhileAgo';
import PauseOfferCard from '../pause/PauseOfferCard';
import { formatLocalDay } from '../schedule/format';
import AlsoToday from '../today/AlsoToday';
import CheckBackNudges from '../today/CheckBackNudges';
import DayChangeSheet, { type DayChangeTarget } from '../today/DayChangeSheet';
import DayTimeline from '../today/DayTimeline';
import DoneToday from '../today/DoneToday';
import NowCard from '../today/NowCard';
import RevisitNudges, { useDecisionsToRevisit } from '../today/RevisitNudges';
import TodayThree from '../today/TodayThree';
import WelcomeBack from '../today/WelcomeBack';
import Intention from '../today/Intention';
import CloseDay from '../today/CloseDay';
import OpenTime from '../today/OpenTime';
import { setDaysAheadOpening } from '../days/daysAhead';
import Overlaps from '../today/Overlaps';
import { nextOpen, overlaps } from '../../core/rhythm/overlaps';

import { itemSpan, openStretches } from '../../core/rhythm/openTime';
import { loadQuietHours } from '../../data/storage/preferences';
import BackupOffer from '../today/BackupOffer';
import DailyLine from '../today/DailyLine';
import { closingFrom } from '../../core/rhythm/personalDay';
import { greeting } from '../today/greeting';
import { blockTitle, buildDayTimeline, dayTitle } from '../today/timeline';
import CaptureBar from './components/CaptureBar';
import ImportantItems from './components/ImportantItems';
import LookAhead from './components/LookAhead';
import NowEmptyState from './components/NowEmptyState';
import ScheduledItems from './components/ScheduledItems';
import UnsortedPreview from './components/UnsortedPreview';
import WaitingItems from './components/WaitingItems';
import { useNow } from './hooks/useNow';

/**
 * Today, kept calm: at most one message card, then capture, what is happening
 * now, the person's own three, and the day's timeline. Everything else folds
 * into one line of counts.
 */
export default function NowPage() {
  const clock = useClock();
  const navigate = useNavigate();
  const { openItem, startFocus, openPause } = useOverlays();
  const [away] = useState(() => daysAway(previousVisitDate(), new Date()));
  const [name] = useState(displayName);
  const [kept, setKept] = useState(keptConcerns);
  const shows = useTodayParts();
  const lighter = useSyncExternalStore(subscribePreferences, lighterToday);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [cleared, setCleared] = useState<ReadonlySet<string>>(new Set());
  const { today, rangeOf, blocks } = usePersonalDay(clock);
  const [offset, setOffset] = useState(0);
  const [changing, setChanging] = useState<DayChangeTarget | null>(null);
  const date = addDays(today, offset);
  const isToday = offset === 0;
  const line = stoicLineFor(date);

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
  const toRevisit = useDecisionsToRevisit();
  const statements = useServiceData(compassService.subscribe, () => compassService.statements()) ?? [];
  const linesForGoals = goalLines(statements, items, patterns ?? []);

  const calendarEvents =
    useServiceData(otherCalendars.subscribe, async () => otherCalendars.eventsBetween(atTime(date, '00:00'), atTime(addDays(date, 1), '00:00')), [date]) ?? [];
  const todayRange = rangeOf(today);
  const todayEvents =
    useServiceData(otherCalendars.subscribe, async () => otherCalendars.eventsBetween(todayRange.start, todayRange.end), [todayRange.start.getTime()]) ?? [];
  const busy = [
    ...nearOccurrences,
    ...todayEvents.filter((event) => !event.allDay),
    ...items.filter((item) => (item.status === 'OPEN' || item.status === 'WAITING') && item.scheduledAt).map((item) => itemSpan(item.scheduledAt!)),
  ];
  const stretches = openStretches(todayRange, clock, busy, loadQuietHours());
  const clashes = overlaps(
    items,
    [
      ...nearOccurrences.map((block) => ({ start: block.start, end: block.end, title: blockTitle(block) })),
      ...todayEvents.filter((event) => !event.allDay).map((event) => ({ start: event.start, end: event.end, title: event.title })),
    ],
    clock,
    todayRange.end,
  );
  const entries = patterns ? buildDayTimeline(date, dayOccurrences, items, patterns, calendarEvents) : [];
  const earlier = fromEarlierDays(items, clock).filter((item) => !cleared.has(item.id));
  const earlierIds = new Set(earlier.map((item) => item.id));
  const ready = readyToCheckBack(items, clock);
  const readyIds = new Set(ready.map((item) => item.id));
  const offer = patterns ? pauseOffer(clock, nearOccurrences, patterns, answeredPauseOffers()) : undefined;
  const hasAnything = entries.length > 0 || (now && !now.isEmpty);

  // Only one message at a time, most time-sensitive first.
  const message = !isToday
    ? null
    : offer
      ? 'pause'
      : away >= RETURN_AFTER_DAYS && !welcomeDismissed
        ? 'welcome'
        : !isLookAheadSetAside() && shows('look-ahead')
          ? 'look-ahead'
          : null;

  const aWhileAgo = fromAWhileAgo(items, clock, kept);
  const waiting = now?.waiting.filter((item) => !readyIds.has(item.id)) ?? [];
  const alsoSections = now
    ? [
        { id: 'check-back', label: 'Check back', count: ready.length, content: <CheckBackNudges items={ready} /> },
        {
          id: 'a-while-ago',
          label: 'From a while ago',
          count: shows('a-while-ago') ? aWhileAgo.length : 0,
          content: (
            <AWhileAgo
              items={aWhileAgo}
              onKeep={(id) => {
                keepConcern(id);
                setKept(keptConcerns());
              }}
            />
          ),
        },
        { id: 'revisit', label: 'Look back', count: toRevisit.length, content: <RevisitNudges /> },
        { id: 'important', label: 'Important', count: now.important.length, content: <ImportantItems items={now.important} /> },
        { id: 'waiting', label: 'Waiting', count: waiting.length, content: <WaitingItems items={waiting} /> },
        { id: 'unsorted', label: 'Not sorted', count: now.unsortedCount, content: <UnsortedPreview count={now.unsortedCount} /> },
        {
          id: 'earlier',
          label: 'From earlier days',
          count: message === 'welcome' ? 0 : earlier.length,
          content: (
            <ScheduledItems label="From earlier days" items={now.scheduled.filter((item) => earlierIds.has(item.id))} />
          ),
        },
      ]
    : [];

  return (
    <div className="page page--landscape">
      <header className="page-header today-header">
        <div className="page-header__actions">
          {isToday && <TodayWeather />}
          {isToday && (
            <button
              type="button"
              className="header-action"
              aria-label={lighter ? 'Show everything' : 'Lighter view'}
              aria-pressed={lighter}
              onClick={() => setLighterToday(!lighter)}
            >
              <SproutIcon size={22} />
            </button>
          )}
          <SettingsButton />
        </div>
        <h1 className="page-header__title">{isToday ? greeting(clock, name) : dayTitle(date, today)}</h1>
        {shows('line') && <DailyLine key={date} line={line} />}
        <div className="today-header__rule" aria-hidden="true" />
        <div className="day-stepper">
          <button type="button" className="day-stepper__step" aria-label="Previous day" onClick={() => setOffset(offset - 1)}>
            <ChevronRightIcon size={18} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <span className="day-stepper__date">
            {formatLocalDay(date, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <button type="button" className="day-stepper__step" aria-label="Next day" onClick={() => setOffset(offset + 1)}>
            <ChevronRightIcon size={18} />
          </button>
          {isToday ? (
            <span className="day-stepper__tools">
              <button type="button" className="chip chip--small" onClick={() => startFocus()}>
                Focus
              </button>
              <button type="button" className="chip chip--small" onClick={openPause}>
                Pause
              </button>
            </span>
          ) : (
            <button type="button" className="day-header__back" onClick={() => setOffset(0)}>
              Back to today
            </button>
          )}
        </div>
      </header>

      {isToday && lighter ? (
        <LighterView items={items} today={today} />
      ) : (
        <>

      {message === 'pause' && offer && <PauseOfferCard key={offer.start.toISOString()} occurrence={offer} />}
      {message === 'welcome' && (
        <WelcomeBack
          days={away}
          earlier={earlier}
          onDismiss={() => setWelcomeDismissed(true)}
          onCleared={(ids) => setCleared(new Set(ids))}
        />
      )}
      {message === 'look-ahead' && <LookAhead />}

      {shows('intention') && <Intention date={date} isToday={isToday} />}
      {isToday && shows('path') && <TodayThree date={today} items={items} />}
      {isToday && <NowCard now={clock} occurrences={nearOccurrences} items={items} />}

      {entries.length > 0 && (
        <section className="stack-tight" aria-label="Your day">
          <div className="section-heading">
            <h2 className="section-label">{isToday ? 'Your day' : 'That day'}</h2>
            <span className="section-heading__actions">
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setDaysAheadOpening({ start: date });
                  navigate('days');
                }}
              >
                Days ahead
              </button>
              <button type="button" className="text-link" onClick={() => navigate('schedule')}>
                Schedule
              </button>
            </span>
          </div>
          <DayTimeline
            date={date}
            entries={entries}
            now={isToday ? clock : undefined}
            onChangeDay={setChanging}
            onOpenItem={openItem}
            goalLines={linesForGoals}
            onOpenEntry={(key) => {
              setDaysAheadOpening({ start: date, focusKey: key });
              navigate('days');
            }}
          />
        </section>
      )}

      {isToday && <Overlaps overlaps={clashes} moveTo={nextOpen(stretches, clock)} />}

      {isToday && shows('open-time') && items.some((item) => item.status === 'OPEN' && !item.scheduledAt) && (
        <OpenTime stretches={stretches} items={items} today={today} />
      )}

      {patterns && patterns.length === 0 && shows('schedule-prompt') && (
        <div className="quiet-row-wrap">
          <button type="button" className="quiet-row" onClick={() => navigate('schedule')}>
            <span className="quiet-row__text">
              <span>Add your schedule</span>
              <span className="quiet-row__detail">Work, study, caring for someone, or time you protect.</span>
            </span>
            <ChevronRightIcon size={18} className="quiet-row__chevron" />
          </button>
          <NotForMe part="schedule-prompt" />
        </div>
      )}

      {isToday && shows('capture') && <CaptureBar variant="quiet" />}
      {isToday && <BackupOffer today={today} recordCount={items.length} />}
      {isToday && <AlsoToday sections={alsoSections} />}
      {isToday && <DoneToday today={today} range={rangeOf(today)} />}
      {isToday && shows('close-day') && (
        <CloseDay
          today={today}
          range={rangeOf(today)}
          items={items}
          now={clock}
          availableFrom={closingFrom(rangeOf(today), blocks)}
        />
      )}

      {isToday && now && !hasAnything && patterns && patterns.length > 0 && <NowEmptyState />}
      {!isToday && entries.length === 0 && <p className="empty-note">Nothing scheduled.</p>}

        </>
      )}

      <Landscape />

      {changing && <DayChangeSheet target={changing} onClose={() => setChanging(null)} />}
    </div>
  );
}
