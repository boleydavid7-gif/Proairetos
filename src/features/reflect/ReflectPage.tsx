import { directionAlong, transition } from '../../app/transitions';
import lake from '../../assets/images/scenes/lake.webp';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useNavigate } from '../../app/navigationContext';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { reflectionService } from '../../app/services';
import { BookIcon, BreatheIcon, ChevronRightIcon, MoreIcon, PenIcon } from '../../components/icons/Icons';
import PageHeader from '../../components/layout/PageHeader';
import { periodRange, type ReflectPeriod } from '../../core/reflections/periods';
import { toLocalDate } from '../../core/scheduling/dates';
import { useRuns } from '../../app/askesis/runs';
import RunEntry from './RunEntry';
import type { Reflection } from '../../core/reflections/types';
import DecisionsSection from './DecisionsSection';
import GentleLine from '../../components/ui/GentleLine';
import { dayLabel } from './format';
import { promptText } from './prompts';
import { entryMark } from './weather';
import { formatTemp } from '../../core/weather/sky';

const periods: { id: ReflectPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

function TimelineEntry({ reflection, showDay }: { reflection: Reflection; showDay: boolean }) {
  const [open, setOpen] = useState(false);
  const { openDecision, offerUndo } = useOverlays();
  const time = new Date(reflection.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const mark = reflection.decisionId ? { icon: PenIcon, label: 'Note on a decision' } : entryMark(reflection);
  const Icon = mark.icon;
  const prompt = reflection.decisionId ? 'Note on a decision' : promptText(reflection.promptKey);

  return (
    <li className="timeline-entry">
      <span className="timeline-entry__mark" role="img" aria-label={mark.label}>
        <Icon size={30} />
      </span>
      <div className="timeline-entry__body">
        <div className="timeline-entry__head">
          <span className="timeline-entry__time">
            {showDay ? `${dayLabel(reflection.createdAt)}, ${time}` : time}
            {reflection.sky && <span className="timeline-entry__temp"> · {formatTemp(reflection.sky)}</span>}
          </span>
          <button
            type="button"
            className="check-row__more"
            aria-label="More"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <MoreIcon size={20} />
          </button>
        </div>
        {prompt && <span className="timeline-entry__prompt">{prompt}</span>}
        <button
          type="button"
          className={`timeline-entry__text${open ? ' timeline-entry__text--full' : ''}`}
          onClick={() => (reflection.decisionId ? openDecision(reflection.decisionId) : setOpen(!open))}
        >
          {reflection.body}
        </button>
        {open && (
          <div className="reflection-entry__actions">
            {reflection.decisionId && (
              <button type="button" className="button-quiet" onClick={() => openDecision(reflection.decisionId!)}>
                Open decision
              </button>
            )}
            <button
              type="button"
              className="button-quiet"
              onClick={async () => {
                const deletion = await reflectionService.remove(reflection.id);
                offerUndo('Reflection deleted', deletion.undo);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function MoreRow({ icon, title, detail, onClick }: { icon: React.ReactNode; title: string; detail: string; onClick: () => void }) {
  return (
    <button type="button" className="settings-row" onClick={onClick}>
      <span className="settings-row__icon">{icon}</span>
      <span className="settings-row__text">
        <span>{title}</span>
        <span className="settings-row__detail">{detail}</span>
      </span>
      <ChevronRightIcon size={18} className="settings-row__chevron" />
    </button>
  );
}

export default function ReflectPage() {
  const shows = useTodayParts();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<ReflectPeriod>('today');
  const reflections = useServiceData(reflectionService.subscribe, () => reflectionService.listFor(period), [period]);
  const all = useServiceData(reflectionService.subscribe, () => reflectionService.all()) ?? [];
  // Runs logged in Askesis sit in the same timeline, if the person keeps them in view.
  const runs = useRuns();
  const range = periodRange(period, new Date());
  const ran = shows('askesis')
    ? (runs?.workouts ?? []).filter((entry) => entry.date >= toLocalDate(range.start) && entry.date < toLocalDate(range.end))
    : [];
  const timeline = [
    ...(reflections ?? []).map((reflection) => ({ at: reflection.createdAt, reflection })),
    ...ran.map((run) => ({ at: run.createdAt, run })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const lastReview = all
    .filter((reflection) => reflection.promptKey === 'weekly-review')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return (
    <div className="page">
      <PageHeader title="Reflect" subtitle="Look back, notice patterns, and return to what matters." settings />

      {shows('meditate') && (
        <button type="button" className="meditate-card" onClick={() => navigate('meditate')}>
          <span className="meditate-card__scene" style={{ backgroundImage: `url(${lake})` }} aria-hidden="true" />
          <span className="meditate-card__text">
            <span className="meditate-card__title">Meditate</span>
            <span className="meditate-card__detail">Sessions, breathing, sounds, and music.</span>
          </span>
          <ChevronRightIcon size={20} />
        </button>
      )}

      <div className="segmented" role="tablist" aria-label="Period">
        {periods.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={period === option.id}
            className="segmented__option"
            onClick={() =>
              transition(
                directionAlong(
                  periods.map((each) => each.id),
                  period,
                  option.id,
                ),
                () => setPeriod(option.id),
                'panel',
              )
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      {reflections && (
        <section key={period} className="vt-panel" aria-label="Your reflections">
          {timeline.length === 0 ? (
            <>
              <p className="empty-note">Nothing written {period === 'today' ? 'today' : `this ${period}`} yet.</p>
              <GentleLine />
            </>
          ) : (
            <ol className="timeline">
              {timeline.map((entry) =>
                'run' in entry ? (
                  <RunEntry key={entry.run.id} entry={entry.run} unit={runs!.unit} showDay={period !== 'today'} />
                ) : (
                  <TimelineEntry key={entry.reflection.id} reflection={entry.reflection} showDay={period !== 'today'} />
                ),
              )}
            </ol>
          )}
        </section>
      )}

      <button type="button" className="add-reflection" onClick={() => navigate('journal')}>
        <PenIcon size={18} />
        Add a reflection
      </button>

      <div className="settings-list">
        {shows('insights') && (
        <MoreRow
          icon={<BreatheIcon size={22} />}
          title="Insights"
          detail="What you recorded, gathered by week and month."
          onClick={() => navigate('insights')}
        />
        )}
        {shows('weekly-review') && (
        <MoreRow
          icon={<BookIcon size={22} />}
          title="Weekly review"
          detail={`About 15 minutes, every step optional.${lastReview ? ` Last one ${dayLabel(lastReview.createdAt).toLowerCase()}.` : ''}`}
          onClick={() => navigate('review')}
        />
        )}
      </div>

      {shows('decisions') && <DecisionsSection />}
    </div>
  );
}
