import { useBackHandler } from '../../app/back/backStack';
import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useNavigate } from '../../app/navigationContext';
import { scheduleService } from '../../app/services';
import { ArrowLeftIcon, ChevronRightIcon } from '../../components/icons/Icons';
import PageHeader from '../../components/layout/PageHeader';
import { mondayOnOrBefore, toLocalDate } from '../../core/scheduling/dates';
import { cycleLength } from '../../core/scheduling/patterns';
import { scheduleTemplates, type ScheduleTemplate } from '../../core/scheduling/templates';
import type { SchedulePattern } from '../../core/scheduling/types';
import type { PatternInput } from '../../services/schedule/scheduleService';
import PatternEditor from './PatternEditor';
import { formatLocalDay } from './format';

type Mode = { view: 'list' } | { view: 'templates' } | { view: 'edit'; patternId?: string; initial: PatternInput };

function fromTemplate(template: ScheduleTemplate): PatternInput {
  const today = toLocalDate(new Date());
  return {
    name: template.kind === 'PROTECTED' ? '' : 'Work',
    kind: template.kind,
    layout: template.weekly ? 'WEEKLY' : 'CYCLE',
    anchorDate: template.weekly ? mondayOnOrBefore(today) : today,
    segments: structuredClone(template.segments),
  };
}

function toInput(pattern: SchedulePattern): PatternInput {
  const { name, kind, layout, anchorDate, segments, endDate, pauseWhenEnds } = pattern;
  return structuredClone({ name, kind, layout, anchorDate, segments, endDate, pauseWhenEnds });
}

function summary(pattern: SchedulePattern): string {
  const kind = pattern.kind === 'PROTECTED' ? 'Protected time' : 'Work or commitment';
  const shape =
    pattern.layout === 'WEEKLY'
      ? 'Weekly'
      : `${cycleLength(pattern.segments)}-day cycle from ${formatLocalDay(pattern.anchorDate, { month: 'short', day: 'numeric' })}`;
  return `${kind} · ${shape}`;
}

export default function ScheduleScreen() {
  const navigate = useNavigate();
  const patterns = useServiceData(scheduleService.subscribe, () => scheduleService.patterns());
  const [mode, setMode] = useState<Mode>({ view: 'list' });
  const toList = () => setMode({ view: 'list' });
  useBackHandler(true, () => navigate('today'));
  useBackHandler(mode.view !== 'list', toList);

  const back = (
    <button type="button" className="back-link" onClick={() => (mode.view === 'list' ? navigate('today') : toList())}>
      <ArrowLeftIcon size={18} />
      {mode.view === 'list' ? 'Today' : 'Your schedule'}
    </button>
  );

  if (mode.view === 'edit') {
    return (
      <div className="page">
        {back}
        <PageHeader title={mode.patternId ? 'Edit schedule' : 'New schedule'} />
        <PatternEditor key={mode.patternId ?? 'new'} patternId={mode.patternId} initial={mode.initial} onDone={toList} />
      </div>
    );
  }

  if (mode.view === 'templates') {
    return (
      <div className="page">
        {back}
        <PageHeader title="New schedule" subtitle="Start from a shape close to yours. Everything can be changed." />
        <div className="stack-tight">
          {scheduleTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              className="list-card list-card--button"
              onClick={() => setMode({ view: 'edit', initial: fromTemplate(template) })}
            >
              <span className="list-card__text">
                <span className="list-card__title">{template.name}</span>
                <span className="list-card__detail list-card__detail--full">{template.description}</span>
              </span>
              <ChevronRightIcon size={18} className="list-card__chevron" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {back}
      <PageHeader title="Your schedule" subtitle="Work, study, care, and time you protect. It repeats on its own." />

      {patterns && patterns.length === 0 && (
        <div className="empty-state">
          <p className="empty-state__title">No schedule yet.</p>
          <p className="empty-state__detail">
            Add your work hours or rotation and they will appear on Today, including days off and overnight shifts.
          </p>
        </div>
      )}

      {patterns && patterns.length > 0 && (
        <div className="stack-tight">
          {patterns.map((pattern) => (
            <button
              key={pattern.id}
              type="button"
              className="list-card list-card--button"
              onClick={() => setMode({ view: 'edit', patternId: pattern.id, initial: toInput(pattern) })}
            >
              <span className={`kind-dot kind-dot--${pattern.kind.toLowerCase()}`} aria-hidden="true" />
              <span className="list-card__text">
                <span className="list-card__title">{pattern.name}</span>
                <span className="list-card__detail">{summary(pattern)}</span>
              </span>
              <ChevronRightIcon size={18} className="list-card__chevron" />
            </button>
          ))}
        </div>
      )}

      <button type="button" className="chip chip--accent chip--wide" onClick={() => setMode({ view: 'templates' })}>
        Add a schedule
      </button>
    </div>
  );
}
