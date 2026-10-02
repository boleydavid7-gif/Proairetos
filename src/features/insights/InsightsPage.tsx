import { useState, type ReactNode } from 'react';
import { useBackHandler } from '../../app/back/backStack';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useNavigate } from '../../app/navigationContext';
import { compassService, lifeService, reflectionService } from '../../app/services';
import { ArrowLeftIcon, CheckIcon, ClockIcon, CompassIcon, NoteIcon, ScalesIcon, SunIcon } from '../../components/icons/Icons';
import PageHeader from '../../components/layout/PageHeader';
import { gatherInsights, insightRange, previousRange, sideBySide, type InsightPeriod, type TimeOfDay } from '../../core/reflections/insights';
import { captureKinds } from '../capture/captureKinds';
import Observations from '../reflect/Observations';
import { weatherOptions } from '../reflect/weather';

const periods: { id: InsightPeriod; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'all', label: 'All time' },
];

const timeLabels: Record<TimeOfDay, string> = { MORNING: 'Morning', AFTERNOON: 'Afternoon', EVENING: 'Evening', NIGHT: 'Night' };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function InsightCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="insight-card" aria-label={title}>
      <span className="insight-card__icon">{icon}</span>
      <div className="insight-card__body">
        <h2 className="insight-card__title">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function subscribeAll(listener: () => void) {
  const unsubscribers = [lifeService, reflectionService, compassService].map((service) => service.subscribe(listener));
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

/**
 * What the person recorded, gathered by period. Counts and lists only: no
 * trends, no conclusions, no advice. The meaning is theirs to find.
 */
export default function InsightsPage() {
  const navigate = useNavigate();
  useBackHandler(true, () => navigate('reflect'));
  const [period, setPeriod] = useState<InsightPeriod>('week');
  const insights = useServiceData(
    subscribeAll,
    async () => {
      const [items, reflections, values, events] = await Promise.all([
        lifeService.list(),
        reflectionService.all(),
        compassService.values(),
        lifeService.historyForAll(),
      ]);
      const now = new Date();
      const range = insightRange(period, now);
      const before = previousRange(period, now);
      return {
        ...gatherInsights(range, items, reflections, values, events),
        sideBySide: before ? sideBySide(range, before, items, events, reflections) : undefined,
      };
    },
    [period],
  );

  const weatherTotal = insights ? Object.values(insights.weather.counts).reduce((a, b) => a + b, 0) : 0;
  const captureTotal = insights ? Object.values(insights.captured.counts).reduce((a, b) => a + b, 0) + insights.captured.untagged : 0;

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={() => navigate('reflect')}>
        <ArrowLeftIcon size={18} />
        Reflect
      </button>
      <PageHeader title="Insights" subtitle="What you recorded, gathered in one place. What it means is yours to decide." />

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

      {insights && (
        <>
          <InsightCard icon={<SunIcon size={26} />} title="Inner weather you noted">
            {weatherTotal === 0 ? (
              <p className="insight-card__note">
                None noted yet. When you write in the journal you can add one, if you like.
              </p>
            ) : (
              <>
                <ul className="weather-counts">
                  {weatherOptions.map(({ id, label, icon: Icon }) => (
                    <li key={id} className={insights.weather.counts[id] === 0 ? 'weather-counts__none' : undefined}>
                      <Icon size={22} />
                      <span className="weather-counts__n">{insights.weather.counts[id]}</span>
                      <span className="visually-hidden">{label}</span>
                    </li>
                  ))}
                </ul>
                {insights.weather.unmarked > 0 && (
                  <p className="insight-card__note">{plural(insights.weather.unmarked, 'entry', 'entries')} without one.</p>
                )}
              </>
            )}
          </InsightCard>

          <InsightCard icon={<NoteIcon size={26} />} title="What you captured">
            {captureTotal === 0 ? (
              <p className="insight-card__note">Nothing captured in this period.</p>
            ) : (
              <dl className="insight-counts">
                {captureKinds.map((kind) => (
                  <div key={kind.id}>
                    <dt>{kind.label}</dt>
                    <dd>{insights.captured.counts[kind.id]}</dd>
                  </div>
                ))}
                <div>
                  <dt>Not sorted</dt>
                  <dd>{insights.captured.untagged}</dd>
                </div>
              </dl>
            )}
          </InsightCard>

          <InsightCard icon={<ClockIcon size={26} />} title="When you wrote">
            {insights.reflections === 0 ? (
              <p className="insight-card__note">No reflections in this period.</p>
            ) : (
              <dl className="insight-counts">
                {(Object.keys(timeLabels) as TimeOfDay[]).map((time) => (
                  <div key={time}>
                    <dt>{timeLabels[time]}</dt>
                    <dd>{insights.writtenAt[time]}</dd>
                  </div>
                ))}
              </dl>
            )}
          </InsightCard>

          <InsightCard icon={<CheckIcon size={26} />} title="When things got done">
            {Object.values(insights.doneAt).every((n) => n === 0) ? (
              <p className="insight-card__note">Nothing marked done in this period.</p>
            ) : (
              <dl className="insight-counts">
                {(Object.keys(timeLabels) as TimeOfDay[]).map((time) => (
                  <div key={time}>
                    <dt>{timeLabels[time]}</dt>
                    <dd>{insights.doneAt[time]}</dd>
                  </div>
                ))}
              </dl>
            )}
          </InsightCard>

          {insights.sideBySide && (
            <InsightCard icon={<ScalesIcon size={26} />} title={period === 'week' ? 'This week and last' : 'This month and last'}>
              <table className="side-by-side">
                <thead>
                  <tr>
                    <th scope="col"><span className="visually-hidden">What</span></th>
                    <th scope="col">{period === 'week' ? 'This week' : 'This month'}</th>
                    <th scope="col">{period === 'week' ? 'Last week' : 'Last month'}</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.sideBySide.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      <td>{row.now}</td>
                      <td>{row.before}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </InsightCard>
          )}

          {insights.values.length > 0 && (
            <InsightCard icon={<CompassIcon size={26} />} title="Your values in what you recorded">
              <ul className="insight-lines">
                {insights.values.map((row) => (
                  <li key={row.name}>
                    <strong>{row.name}</strong>:{' '}
                    {[
                      row.entries && plural(row.entries, 'entry', 'entries'),
                      row.items && `${plural(row.items, 'item')} linked`,
                      row.done && `${row.done} done`,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </li>
                ))}
              </ul>
            </InsightCard>
          )}

          <Observations period={period} />
        </>
      )}
    </div>
  );
}
