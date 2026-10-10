import { remindChoices, remindLabel, remindersOf } from '../../core/notify/notices';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import ColorChoice from '../../components/ui/ColorChoice';
import { useSheet } from '../../components/ui/useSheet';
import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { attachmentService, compassService, decisionService, lifeService } from '../../app/services';
import Attachments from './attachments/Attachments';
import { CalendarIcon, FeatherIcon, StarIcon } from '../../components/icons/Icons';
import { buildIcs } from '../../core/calendar/ics';
import type { LifeItem, LifeItemStatus, PlanGroup } from '../../core/life-items/types';
import type { ChosenValue } from '../../core/values/types';
import { itemKinds, kindOf } from '../../core/life-items/kinds';
import { endAt, formatDay, fromDateInput, toDateInput, toTimeInput } from './dateFields';
import { atTime, toLocalDate } from '../../core/scheduling/dates';
import { describeEvent } from './historyLabels';
import RepeatSection from './RepeatSection';

type Props = {
  itemId: string;
  onClose: () => void;
};

const closeLabels: Partial<Record<LifeItemStatus, string>> = {
  DONE: 'Done',
  LET_GO: 'Let go',
};

function WaitingSection({ item }: { item: LifeItem }) {
  const [choosing, setChoosing] = useState(false);
  const [checkBack, setCheckBack] = useState('');

  if (item.status === 'WAITING') {
    return (
      <section className="sheet__section" aria-label="Waiting">
        <p className="sheet__label">Waiting</p>
        <label className="field-row">
          <span>Check back</span>
          <input
            type="date"
            className="field-input"
            value={toDateInput(item.checkBackAt)}
            onChange={(event) => lifeService.setCheckBack(item.id, fromDateInput(event.target.value))}
          />
        </label>
        <button type="button" className="chip" onClick={() => lifeService.setStatus(item.id, 'OPEN')}>
          No longer waiting
        </button>
      </section>
    );
  }

  if (item.status !== 'OPEN') return null;

  if (!choosing) {
    return (
      <button type="button" className="chip chip--wide" onClick={() => setChoosing(true)}>
        Waiting on someone or something
      </button>
    );
  }

  return (
    <section className="sheet__section" aria-label="Start waiting">
      <p className="sheet__label">Waiting</p>
      <label className="field-row">
        <span>Check back</span>
        <input
          type="date"
          className="field-input"
          value={checkBack}
          onChange={(event) => setCheckBack(event.target.value)}
        />
      </label>
      <p className="sheet__hint">A check-back date brings it back to Today.</p>
      <div className="chip-row">
        <button
          type="button"
          className="chip chip--accent"
          onClick={() => lifeService.setStatus(item.id, 'WAITING', { checkBackAt: fromDateInput(checkBack) })}
        >
          Start waiting
        </button>
        <button type="button" className="button-quiet" onClick={() => setChoosing(false)}>
          Cancel
        </button>
      </div>
    </section>
  );
}

function ValueConnections({ item, values }: { item: LifeItem; values: ChosenValue[] }) {
  if (values.length === 0) return null;
  const connected = new Set(item.valueIds ?? []);

  return (
    <section className="sheet__section" aria-label="Connected values">
      <p className="sheet__label">Connected to</p>
      <div className="chip-row" role="group" aria-label="Your values">
        {values.map((value) => (
          <button
            key={value.id}
            type="button"
            className="chip chip--value"
            aria-pressed={connected.has(value.id)}
            onClick={() =>
              connected.has(value.id)
                ? lifeService.disconnectValue(item.id, value.id)
                : lifeService.connectValue(item.id, value.id)
            }
          >
            {value.name}
          </button>
        ))}
      </div>
    </section>
  );
}

const toLines = (text: string) => text.split('\n');
const fromLines = (lines: string[] | undefined) => (lines ?? []).join('\n');

/** The Stoic split for Thinking about items: what is up to me, and what is not. */
/** For a worry: the written practice, starting from the person's own words. */
function ThinkThroughLink({ item }: { item: LifeItem }) {
  const { openThinkThrough } = useOverlays();
  return (
    <button
      type="button"
      className="chip chip--wide"
      onClick={() => openThinkThrough({ itemId: item.id, text: item.title })}
    >
      Think it through
    </button>
  );
}

function ControlSplitSection({ item }: { item: LifeItem }) {
  const [mine, setMine] = useState(fromLines(item.controlSplit?.inMyControl));
  const [notMine, setNotMine] = useState(fromLines(item.controlSplit?.notInMyControl));
  const [open, setOpen] = useState(Boolean(item.controlSplit));

  if (item.type !== 'THINKING_ABOUT' && kindOf(item) !== 'CONCERN') return null;
  const isConcern = kindOf(item) === 'CONCERN';
  const mineLines = (item.controlSplit?.inMyControl ?? []).filter((line) => line !== item.nextStep);

  const save = () => {
    const unchanged =
      mine === fromLines(item.controlSplit?.inMyControl) && notMine === fromLines(item.controlSplit?.notInMyControl);
    if (!unchanged)
      lifeService.setControlSplit(item.id, { inMyControl: toLines(mine), notInMyControl: toLines(notMine) });
  };

  if (!open) {
    return (
      <button type="button" className="chip chip--wide" onClick={() => setOpen(true)}>
        {isConcern ? 'What part of this is up to you?' : 'Sort what is in your control'}
      </button>
    );
  }

  return (
    <section className="sheet__section control-split" aria-label="What is in your control">
      <p className="sheet__label">What is in your control</p>
      <p className="sheet__hint">One per line.</p>
      <div className="control-split__columns">
        <label className="control-split__column">
          <span>In my control</span>
          <textarea
            aria-label="In my control"
            className="field-input field-input--area"
            rows={4}
            value={mine}
            onChange={(event) => setMine(event.target.value)}
            onBlur={save}
          />
        </label>
        <label className="control-split__column">
          <span>Not in my control</span>
          <textarea
            aria-label="Not in my control"
            className="field-input field-input--area"
            rows={4}
            value={notMine}
            onChange={(event) => setNotMine(event.target.value)}
            onBlur={save}
          />
        </label>
      </div>
      {mineLines.length > 0 && (
        <div className="control-split__pivot">
          <p className="sheet__hint">Turn something in your control into the next step:</p>
          <div className="chip-row">
            {mineLines.map((line) => (
              <button key={line} type="button" className="chip" onClick={() => lifeService.setNextStep(item.id, line)}>
                {line}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** Thinking about -> Decision. Shows decisions already made from this item. */
function DecisionSection({ item }: { item: LifeItem }) {
  const { startDecision, openDecision } = useOverlays();
  const decisions = useServiceData(decisionService.subscribe, () => decisionService.list()) ?? [];
  const made = decisions.filter((decision) => decision.lifeItemId === item.id);
  if (item.type !== 'THINKING_ABOUT' && made.length === 0) return null;

  return (
    <section className="sheet__section" aria-label="Decision">
      {made.map((decision) => (
        <button key={decision.id} type="button" className="decision-link" onClick={() => openDecision(decision.id)}>
          <span className="sheet__label">Decided</span>
          <span>{decision.choice}</span>
        </button>
      ))}
      {item.type === 'THINKING_ABOUT' && (item.status === 'OPEN' || item.status === 'WAITING') && (
        <button
          type="button"
          className="chip chip--wide"
          onClick={() => startDecision({ itemId: item.id, title: item.title })}
        >
          Make a decision
        </button>
      )}
    </section>
  );
}

/**
 * One concrete next action, optionally with when/where and an if-obstacle
 * plan: the two parts of an implementation intention.
 */
function NextStepSection({ item }: { item: LifeItem }) {
  const { startFocus } = useOverlays();
  const [draft, setDraft] = useState('');
  const [cue, setCue] = useState(item.nextStepCue ?? '');
  const [obstacle, setObstacle] = useState(item.ifObstacle ?? '');
  const isActive = item.status === 'OPEN' || item.status === 'WAITING';
  if (!isActive || (item.type !== 'DO' && item.type !== 'THINKING_ABOUT' && item.type !== null)) return null;

  const save = () => {
    if (draft.trim()) {
      lifeService.setNextStep(item.id, draft);
      setDraft('');
    }
  };

  return (
    <section className="sheet__section next-step" aria-label="Next step">
      <p className="sheet__label">Next small step</p>
      {item.nextStep ? (
        <>
          <div className="next-step__current">
            <p className="next-step__text">{item.nextStep}</p>
            <button
              type="button"
              className="chip"
              onClick={() => {
                setCue('');
                setObstacle('');
                lifeService.setNextStep(item.id, undefined);
              }}
            >
              Step done
            </button>
          </div>
          <label className="plan-field">
            <span>When or where</span>
            <input
              className="field-input"
              placeholder="e.g. after breakfast, at my desk"
              maxLength={140}
              value={cue}
              onChange={(event) => setCue(event.target.value)}
              onBlur={() => cue !== (item.nextStepCue ?? '') && lifeService.setStepPlan(item.id, { nextStepCue: cue })}
            />
          </label>
          <label className="plan-field">
            <span>If something gets in the way, I will</span>
            <input
              className="field-input"
              placeholder="e.g. do just the first two minutes"
              maxLength={140}
              value={obstacle}
              onChange={(event) => setObstacle(event.target.value)}
              onBlur={() =>
                obstacle !== (item.ifObstacle ?? '') && lifeService.setStepPlan(item.id, { ifObstacle: obstacle })
              }
            />
          </label>
        </>
      ) : (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <input
            className="field-input"
            aria-label="Next small step"
            placeholder="The very next thing you could do"
            maxLength={140}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={save}
          />
        </form>
      )}
      <button type="button" className="chip chip--wide" onClick={() => startFocus({ id: item.id, title: item.title })}>
        Focus on this
      </button>
    </section>
  );
}

/** Lines of a list, one per line. On a routine they come back unticked each time. */
function ChecklistSection({ item }: { item: LifeItem }) {
  const current = (item.checklist ?? []).map((line) => line.text).join('\n');
  const [text, setText] = useState(current);
  const [open, setOpen] = useState(Boolean(item.checklist));

  if (!open) {
    return (
      <button type="button" className="chip chip--wide" onClick={() => setOpen(true)}>
        Add a list
      </button>
    );
  }

  return (
    <section className="sheet__section" aria-label="List">
      <p className="sheet__label">List</p>
      <textarea
        className="field-input field-input--area"
        rows={4}
        aria-label="List lines, one per line"
        placeholder="One per line"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          if (text !== current) lifeService.setChecklist(item.id, text.split('\n'));
        }}
      />
      {item.repeat && <p className="sheet__hint">Ticks clear each time it comes back.</p>}
    </section>
  );
}

/** The person's own grouping and day on Plan. */
/** Which goal this is a step toward, if any. Only shown once the person has a goal. */
/** Where it happens and a colour: the person's own labels for Days ahead. */
function LookSection({ item }: { item: LifeItem }) {
  const [location, setLocation] = useState(item.location ?? '');
  return (
    <section className="sheet__section" aria-label="Where and colour">
      <p className="sheet__label">Where</p>
      <input
        className="field-input"
        aria-label="Where"
        placeholder="A place, if it helps"
        value={location}
        onChange={(event) => setLocation(event.target.value)}
        onBlur={() => location !== (item.location ?? '') && lifeService.setLook(item.id, { location })}
      />
      <p className="sheet__label">Colour</p>
      <ColorChoice value={item.color} onChange={(color) => lifeService.setLook(item.id, { color: color ?? null })} />
    </section>
  );
}

function GoalSection({ item }: { item: LifeItem }) {
  const statements = useServiceData(compassService.subscribe, () => compassService.statements()) ?? [];
  const goals = statements.filter(
    (statement) => statement.type === 'GOAL' && (!statement.reachedAt || statement.id === item.goalId),
  );
  if (goals.length === 0) return null;
  return (
    <section className="sheet__section" aria-label="Working toward">
      <p className="sheet__label">A step toward</p>
      <div className="chip-row" role="group" aria-label="Goal">
        {goals.map((goal) => (
          <button
            key={goal.id}
            type="button"
            className="chip"
            aria-pressed={item.goalId === goal.id}
            onClick={() => lifeService.setGoal(item.id, item.goalId === goal.id ? undefined : goal.id)}
          >
            {goal.body}
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * When, as one field: a day, and a time if it has one. With a time it sits
 * on that day's timeline; without, it is planned for the day.
 */
function WhenSection({ item }: { item: LifeItem }) {
  const timedAt = item.scheduledAt ? new Date(item.scheduledAt) : undefined;
  const [day, setDay] = useState(timedAt ? toLocalDate(timedAt) : (item.plannedFor ?? ''));
  const [time, setTime] = useState(timedAt ? toTimeInput(timedAt) : '');
  const [until, setUntil] = useState(item.endsAt ? toTimeInput(new Date(item.endsAt)) : '');

  async function save(nextDay: string, nextTime: string, nextUntil = until) {
    if (!nextDay) {
      if (item.scheduledAt) await lifeService.schedule(item.id, undefined);
      if (item.plannedFor) await lifeService.setPlannedFor(item.id, undefined);
      return;
    }
    if (nextTime) {
      await lifeService.scheduleSpan(item.id, atTime(nextDay, nextTime).toISOString(), endAt(nextDay, nextTime, nextUntil));
      if (item.plannedFor) await lifeService.setPlannedFor(item.id, undefined);
    } else {
      if (item.scheduledAt) await lifeService.schedule(item.id, undefined);
      await lifeService.setPlannedFor(item.id, nextDay);
    }
  }

  return (
    <section className="sheet__section" aria-label="When">
      <p className="sheet__label">When</p>
      <div className="block-fields">
        <label className="block-fields__time">
          <span>Day</span>
          <input
            type="date"
            className="field-input"
            aria-label="Day"
            value={day}
            onChange={(event) => {
              setDay(event.target.value);
              void save(event.target.value, event.target.value ? time : '');
              if (!event.target.value) setTime('');
            }}
          />
        </label>
        <label className="block-fields__time">
          <span>Time</span>
          <input
            type="time"
            className="field-input"
            aria-label="Time"
            value={time}
            disabled={!day}
            onChange={(event) => setTime(event.target.value)}
            onBlur={() => day && void save(day, time)}
          />
        </label>
      </div>
      {time && (
        <label className="block-fields__time when-until">
          <span>Until</span>
          <input
            type="time"
            className="field-input"
            aria-label="Until"
            value={until}
            onChange={(event) => setUntil(event.target.value)}
            onBlur={() => day && void save(day, time, until)}
          />
        </label>
      )}
      {item.scheduledAt && <RemindChoice item={item} />}
      {(day || time) && (
        <button
          type="button"
          className="button-quiet when-clear"
          onClick={() => {
            setDay('');
            setTime('');
            setUntil('');
            void save('', '', '');
          }}
        >
          Clear
        </button>
      )}
    </section>
  );
}

/** When to be reminded of a timed thing: any of a few times before, or none. */
function RemindChoice({ item }: { item: LifeItem }) {
  const chosen = remindersOf(item);
  const toggle = (minutes: number) =>
    void lifeService.setRemind(
      item.id,
      chosen.includes(minutes) ? chosen.filter((each) => each !== minutes) : [...chosen, minutes],
    );
  return (
    <div className="remind-choice">
      <p className="sheet__label">Remind me</p>
      <div className="chip-row" role="group" aria-label="Remind me">
        {remindChoices.map((minutes) => (
          <button
            key={minutes}
            type="button"
            className="chip chip--small"
            aria-pressed={chosen.includes(minutes)}
            onClick={() => toggle(minutes)}
          >
            {remindLabel(minutes)}
          </button>
        ))}
        <button
          type="button"
          className="chip chip--small"
          aria-pressed={chosen.length === 0}
          onClick={() => void lifeService.setRemind(item.id, [])}
        >
          No reminder
        </button>
      </div>
    </div>
  );
}

function PlanSection({ item }: { item: LifeItem }) {
  const groups: { id: PlanGroup; label: string }[] = [
    { id: 'MAINTENANCE', label: 'Maintenance' },
    { id: 'MEANINGFUL', label: 'Meaningful' },
  ];
  return (
    <section className="sheet__section" aria-label="Plan">
      <p className="sheet__label">Group</p>
      <div className="chip-row" role="group" aria-label="Plan group">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            className="chip"
            aria-pressed={item.planGroup === group.id}
            onClick={() => lifeService.setPlanGroup(item.id, item.planGroup === group.id ? undefined : group.id)}
          >
            {group.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function SheetBody({ item, onClose }: { item: LifeItem; onClose: () => void }) {
  const shows = useTodayParts();
  const { offerUndo } = useOverlays();
  const history = useServiceData(lifeService.subscribe, () => lifeService.history(item.id), [item.id]) ?? [];
  const values = useServiceData(compassService.subscribe, () => compassService.values()) ?? [];
  const valueNames = Object.fromEntries(values.map((value) => [value.id, value.name]));
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? '');
  const isActive = item.status === 'OPEN' || item.status === 'WAITING';
  // More starts open when something in it is already set, so nothing chosen is hidden.
  const [moreOpen, setMoreOpen] = useState(
    () =>
      Boolean(
        item.notes ||
        item.repeat ||
        item.goalId ||
        item.location ||
        item.color ||
        item.planGroup ||
        item.important ||
        item.light,
      ) ||
      (item.valueIds?.length ?? 0) > 0 ||
      item.status === 'WAITING',
  );

  async function close(status: 'DONE' | 'LET_GO') {
    const change = await lifeService.setStatus(item.id, status);
    onClose();
    offerUndo(`${closeLabels[status]}: ${item.title}`, change.undo);
  }

  return (
    <>
      <input
        className="sheet__title"
        aria-label="Title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => {
          if (title.trim() && title.trim() !== item.title) lifeService.edit(item.id, { title });
          else setTitle(item.title);
        }}
      />

      {!isActive && (
        <p className="sheet__status">
          {item.status === 'DONE' ? 'Done' : 'Let go'} · {formatDay(item.updatedAt)}
        </p>
      )}

      <div className="chip-row" role="group" aria-label="Kind">
        {itemKinds.map((kind) => (
          <button
            key={kind.id}
            type="button"
            className="chip"
            aria-pressed={kindOf(item) === kind.id}
            onClick={() => lifeService.setKind(item.id, kindOf(item) === kind.id ? undefined : kind.id)}
          >
            {kind.label}
          </button>
        ))}
      </div>

      {kindOf(item) === 'CONCERN' && <ControlSplitSection item={item} />}
      {kindOf(item) === 'CONCERN' && <ThinkThroughLink item={item} />}

      <NextStepSection item={item} />

      <WhenSection item={item} />

      {item.checklist && <ChecklistSection item={item} />}

      <Attachments itemId={item.id} />

      <details
        className="sheet__more"
        open={moreOpen}
        onToggle={(event) => setMoreOpen((event.target as HTMLDetailsElement).open)}
      >
        <summary>More</summary>
        <div className="sheet__more-body">
          <button
            type="button"
            className="toggle-row"
            aria-pressed={item.important}
            onClick={() => lifeService.setImportant(item.id, !item.important)}
          >
            <StarIcon filled={item.important} size={20} />
            <span>{item.important ? 'Marked important' : 'Mark important'}</span>
          </button>

          {shows('energy') && (
<button
            type="button"
            className="toggle-row"
            aria-pressed={Boolean(item.light)}
            onClick={() => lifeService.setLight(item.id, !item.light)}
          >
            <FeatherIcon size={20} />
            <span>{item.light ? 'Takes little energy' : 'Mark as taking little energy'}</span>
          </button>
)}

          <PlanSection item={item} />

          {(item.scheduledAt || item.plannedFor) && <AddToCalendar item={item} />}

          {shows('goals') && <GoalSection item={item} />}

          <LookSection item={item} />

          <RepeatSection item={item} />

          {kindOf(item) !== 'CONCERN' && <ControlSplitSection item={item} />}

          {shows('decisions') && <DecisionSection item={item} />}

          <ValueConnections item={item} values={values} />

          <WaitingSection item={item} />

          <section className="sheet__section" aria-label="Notes">
            <p className="sheet__label">Notes</p>
            <textarea
              className="field-input field-input--area"
              rows={3}
              aria-label="Notes"
              placeholder="Anything you want to keep with this"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={() => {
                if (notes !== (item.notes ?? '')) lifeService.edit(item.id, { notes });
              }}
            />
          </section>

          {!item.checklist && <ChecklistSection item={item} />}
        </div>
      </details>

      {history.length > 0 && (
        <details className="sheet__history">
          <summary>History</summary>
          <ol>
            {history.map((event) => (
              <li key={event.id}>
                <span>{describeEvent(event, valueNames)}</span>
                <time dateTime={event.timestamp}>{formatDay(event.timestamp)}</time>
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="sheet__footer">
        <button
          type="button"
          className="button-quiet sheet__delete"
          onClick={async () => {
            // Its photos and files go with it; undo brings both back.
            const files = await attachmentService.removeForItem(item.id);
            const deletion = await lifeService.deleteItem(item.id);
            onClose();
            offerUndo(`Deleted: ${item.title}`, async () => {
              await deletion.undo();
              await files.undo();
            });
          }}
        >
          Delete
        </button>
        <span className="editor-actions__spacer" />
        {isActive ? (
          <>
            {item.repeat && (
              <button
                type="button"
                className="button-quiet"
                onClick={async () => {
                  const change = await lifeService.skipRoutine(item.id);
                  onClose();
                  offerUndo(`Skipped this time: ${item.title}`, change.undo);
                }}
              >
                Skip this time
              </button>
            )}
            <button type="button" className="button-quiet" onClick={() => close('LET_GO')}>
              Let go
            </button>
            <button type="button" className="button-accent" onClick={() => close('DONE')}>
              Done
            </button>
          </>
        ) : (
          <button type="button" className="button-accent" onClick={() => lifeService.setStatus(item.id, 'OPEN')}>
            Reopen
          </button>
        )}
      </div>
    </>
  );
}

/** One item as a file any calendar app opens: its day or its time, with where and a note if there are some. */
function AddToCalendar({ item }: { item: LifeItem }) {
  function download() {
    const start = item.scheduledAt ? new Date(item.scheduledAt) : undefined;
    const end = start ? (item.endsAt ? new Date(item.endsAt) : new Date(start.getTime() + (item.plannedMinutes ?? 30) * 60_000)) : undefined;
    const text = buildIcs(
      [{ uid: item.id, title: item.title, ...(start && end ? { start, end } : { date: item.plannedFor }), location: item.location, notes: item.notes }],
      { name: item.title, now: new Date() },
    );
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${item.title.replace(/[^\w -]+/g, '').trim().slice(0, 40) || 'item'}.ics`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <button type="button" className="toggle-row" onClick={download}>
      <CalendarIcon size={20} />
      <span>Add to your calendar</span>
    </button>
  );
}

export default function ItemSheet({ itemId, onClose }: Props) {
  const { dialog, panel, close } = useSheet();
  const item = useServiceData(lifeService.subscribe, () => lifeService.get(itemId), [itemId]);

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label={item?.title ?? 'Item'}
      onClose={onClose}
      onClick={(event) => {
        // A tap on the backdrop (the dialog itself, outside the panel) closes it.
        if (event.target === dialog.current) close();
      }}
    >
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={() => close()}>
          Close
        </button>
        {item && <SheetBody key={item.id} item={item} onClose={() => close()} />}
        {item === null && <p className="empty-note">This item is no longer here.</p>}
      </div>
    </dialog>
  );
}
