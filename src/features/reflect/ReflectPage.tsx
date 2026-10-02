import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useNavigate } from '../../app/navigationContext';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { reflectionService } from '../../app/services';
import { BookIcon, BreatheIcon, ChevronRightIcon, MoreIcon, PenIcon } from '../../components/icons/Icons';
import PageHeader from '../../components/layout/PageHeader';
import type { ReflectPeriod } from '../../core/reflections/periods';
import type { Reflection } from '../../core/reflections/types';
import DecisionsSection from './DecisionsSection';
import GentleLine from '../../components/ui/GentleLine';
import { dayLabel } from './format';
import { promptText } from './prompts';
import { entryMark } from './weather';

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
          <span className="timeline-entry__time">{showDay ? `${dayLabel(reflection.createdAt)}, ${time}` : time}</span>
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
  const navigate = useNavigate();
  const [period, setPeriod] = useState<ReflectPeriod>('today');
  const reflections = useServiceData(reflectionService.subscribe, () => reflectionService.listFor(period), [period]);
  const all = useServiceData(reflectionService.subscribe, () => reflectionService.all()) ?? [];
  const lastReview = all
    .filter((reflection) => reflection.promptKey === 'weekly-review')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return (
    <div className="page">
      <PageHeader title="Reflect" subtitle="Look back, notice patterns, and return to what matters." settings />

      <div className="segmented" role="tablist" aria-label="Period">
        {periods.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={period === option.id}
            className="segmented__option"
            onClick={() => setPeriod(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {reflections && (
        <section aria-label="Your reflections">
          {reflections.length === 0 ? (
            <>
              <p className="empty-note">Nothing written {period === 'today' ? 'today' : `this ${period}`} yet.</p>
              <GentleLine />
            </>
          ) : (
            <ol className="timeline">
              {reflections.map((reflection) => (
                <TimelineEntry key={reflection.id} reflection={reflection} showDay={period !== 'today'} />
              ))}
            </ol>
          )}
        </section>
      )}

      <button type="button" className="add-reflection" onClick={() => navigate('journal')}>
        <PenIcon size={18} />
        Add a reflection
      </button>

      <div className="settings-list">
        <MoreRow
          icon={<BreatheIcon size={22} />}
          title="Insights"
          detail="What you recorded, gathered by week and month."
          onClick={() => navigate('insights')}
        />
        <MoreRow
          icon={<BookIcon size={22} />}
          title="Weekly review"
          detail={`About 15 minutes, every step optional.${lastReview ? ` Last one ${dayLabel(lastReview.createdAt).toLowerCase()}.` : ''}`}
          onClick={() => navigate('review')}
        />
      </div>

      <DecisionsSection />
    </div>
  );
}
