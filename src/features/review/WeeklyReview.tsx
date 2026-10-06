import { kindOf } from '../../core/life-items/kinds';
import { useBackHandler } from '../../app/back/backStack';
import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useNavigate } from '../../app/navigationContext';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService, lifeService, reflectionService, scheduleService } from '../../app/services';
import { ArrowLeftIcon } from '../../components/icons/Icons';
import PageHeader from '../../components/layout/PageHeader';
import { addDays, atTime, toLocalDate } from '../../core/scheduling/dates';
import QuickSortSheet from '../capture/QuickSortSheet';
import CaptureBar from '../now/components/CaptureBar';
import { formatLocalDay, formatTimeOf } from '../schedule/format';
import RevisitNudges, { useDecisionsToRevisit } from '../today/RevisitNudges';
import { blockTitle } from '../today/timeline';

const steps = [
  { title: 'Clear your head', hint: 'Anything on your mind? Capture it here, a line each. Sorting comes next.' },
  { title: 'Sort what came in', hint: 'Give each capture a type, or leave it for later.' },
  { title: 'Waiting', hint: 'Anything you have heard back about, or want to check on?' },
  { title: 'The week ahead', hint: 'What you have scheduled for the next seven days.' },
  { title: 'Decisions', hint: 'Choices ready to look back on.' },
  { title: 'Your values', hint: 'Which of these do you want to keep in sight this week?' },
] as const;

function SortStep() {
  const items = useServiceData(lifeService.subscribe, () => lifeService.list()) ?? [];
  const [sorting, setSorting] = useState(false);
  const unsorted = items.filter((item) => kindOf(item) === undefined && (item.status === 'OPEN' || item.status === 'WAITING'));
  if (unsorted.length === 0 && !sorting) return <p className="empty-note">Everything is sorted.</p>;
  return (
    <div className="stack-tight">
      <p className="empty-note">{unsorted.length === 1 ? '1 thing not sorted yet.' : `${unsorted.length} things not sorted yet.`}</p>
      <button type="button" className="chip chip--wide" onClick={() => setSorting(true)}>
        Sort through them
      </button>
      {sorting && (
        <QuickSortSheet items={items} today={toLocalDate(new Date())} unsortedFirst onClose={() => setSorting(false)} />
      )}
    </div>
  );
}

function WaitingStep() {
  const { openItem } = useOverlays();
  const items = useServiceData(lifeService.subscribe, () => lifeService.list()) ?? [];
  const waiting = items.filter((item) => item.status === 'WAITING');
  if (waiting.length === 0) return <p className="empty-note">Nothing is waiting.</p>;
  return (
    <div className="stack-tight">
      {waiting.map((item) => (
        <div key={item.id} className="item-card">
          <button type="button" className="item-card__open" onClick={() => openItem(item.id)}>
            <span className="item-card__title">{item.title}</span>
            {item.checkBackAt && (
              <span className="item-card__meta">Check back {formatLocalDay(toLocalDate(new Date(item.checkBackAt)))}</span>
            )}
          </button>
          <div className="chip-row">
            <button type="button" className="chip" onClick={() => lifeService.setStatus(item.id, 'OPEN')}>
              Heard back
            </button>
            <button type="button" className="chip" onClick={() => openItem(item.id)}>
              Change check-back date
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function WeekAheadStep() {
  const today = toLocalDate(new Date());
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index));
  const occurrences =
    useServiceData(
      scheduleService.subscribe,
      () => scheduleService.occurrencesBetween(atTime(today, '00:00'), atTime(addDays(today, 7), '00:00')),
      [today],
    ) ?? [];
  const items = useServiceData(lifeService.subscribe, () => lifeService.list()) ?? [];

  return (
    <ol className="week-ahead">
      {days.map((date) => {
        const shifts = occurrences.filter((o) => o.date === date);
        const scheduled = items
          .filter((item) => (item.status === 'OPEN' || item.status === 'WAITING') && item.scheduledAt)
          .filter((item) => toLocalDate(new Date(item.scheduledAt!)) === date)
          .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
        return (
          <li key={date} className="week-ahead__day">
            <span className="week-ahead__date">{formatLocalDay(date)}</span>
            <span className="week-ahead__entries">
              {shifts.length === 0 && scheduled.length === 0 && <span className="week-ahead__quiet">Open day</span>}
              {shifts.map((o) => (
                <span key={o.start.toISOString()}>
                  {blockTitle(o)} · {formatTimeOf(o.start)} – {formatTimeOf(o.end)}
                </span>
              ))}
              {scheduled.map((item) => (
                <span key={item.id}>
                  {formatTimeOf(new Date(item.scheduledAt!))} {item.title}
                </span>
              ))}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function DecisionsStep() {
  const due = useDecisionsToRevisit();
  return due.length === 0 ? <p className="empty-note">No decisions are ready to look back on.</p> : <RevisitNudges />;
}

function ValuesStep({ note, onNote }: { note: string; onNote: (note: string) => void }) {
  const values = useServiceData(compassService.subscribe, () => compassService.values()) ?? [];
  return (
    <div className="stack-tight">
      {values.length > 0 ? (
        <ul className="look-ahead__values">
          {values.map((value) => (
            <li key={value.id}>{value.name}</li>
          ))}
        </ul>
      ) : (
        <p className="empty-note">No values chosen yet. You can add them in Compass whenever you like.</p>
      )}
      <textarea
        className="field-input field-input--area"
        rows={4}
        aria-label="A note for the week"
        placeholder="A few words for the week ahead"
        value={note}
        onChange={(event) => onNote(event.target.value)}
      />
    </div>
  );
}

/** A guided weekly review. Every step can be skipped; nothing is scored. */
export default function WeeklyReview() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [note, setNote] = useState('');
  const [finished, setFinished] = useState(false);
  const last = step === steps.length - 1;
  useBackHandler(true, () => navigate('reflect'));

  async function finish() {
    await reflectionService
      .write({ body: note.trim() || 'Weekly review', kind: 'REVIEW', promptKey: 'weekly-review' })
      .catch(() => undefined);
    setFinished(true);
  }

  if (finished) {
    return (
      <div className="page">
        <PageHeader title="Review done" subtitle="That is the week looked at. Begin wherever you like." />
        <button type="button" className="chip chip--accent chip--wide" onClick={() => navigate('today')}>
          Go to Today
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={() => (step === 0 ? navigate('reflect') : setStep(step - 1))}>
        <ArrowLeftIcon size={18} />
        {step === 0 ? 'Reflect' : steps[step - 1].title}
      </button>
      <div className="review-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
        {steps.map((s, index) => (
          <span key={s.title} className="review-progress__dot" data-active={index <= step || undefined} />
        ))}
      </div>
      <PageHeader title={steps[step].title} subtitle={steps[step].hint} />

      {step === 0 && <CaptureBar />}
      {step === 1 && <SortStep />}
      {step === 2 && <WaitingStep />}
      {step === 3 && <WeekAheadStep />}
      {step === 4 && <DecisionsStep />}
      {step === 5 && <ValuesStep note={note} onNote={setNote} />}

      <div className="editor-actions">
        <button type="button" className="button-quiet" onClick={() => navigate('reflect')}>
          Stop here
        </button>
        <span className="editor-actions__spacer" />
        <button type="button" className="button-accent" onClick={() => (last ? finish() : setStep(step + 1))}>
          {last ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}
