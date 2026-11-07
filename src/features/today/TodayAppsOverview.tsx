import AppGroup from './AppGroup';
import { NotTodayFold, SwipeDay } from './SwipeLine';
import { TodayPursuit } from './TodayFamily';
import { AttentionLine, PracticeLine } from './HomeRows';
import { useAddedApps } from '../../app/family/added';
import { useTodayAppsVisibility } from '../../app/hooks/useTodayAppsVisibility';
import { useHomeRows } from '../../app/providers/home';
import type { HomeRow } from '../../core/providers';
import { DAILY_PRACTICE_APPS, type AttentionApp } from '../../core/today/apps';
import { GearIcon } from '../../components/icons/Icons';

type DayRange = { start: Date; end: Date };

/*
 * Today's two groups of lines from the other apps. Each app puts its own lines here through its provider (the manifest
 * says which apps do and what a line may state); this draws them in the family's quiet rows. An app that is not added,
 * or that the person set aside in What's included, is not asked for anything.
 */

/** These apps' groups are drawn even with no lines, as they always were (the page hides an empty one). */
const ALWAYS_DRAWN = new Set<string>(['oikonomia', 'philia', 'poreia']);

function AttentionGroup({ app, rows, today }: { app: AttentionApp; rows: HomeRow[]; today: string }) {
  if (!rows.length && !ALWAYS_DRAWN.has(app)) return null;
  return (
    <AppGroup app={app} compact>
      {rows.map((row) => <AttentionLine key={`${row.ref.kind}:${row.ref.id}:${row.swipe?.id ?? ''}`} row={row} today={today} />)}
    </AppGroup>
  );
}

/** The ongoing practices: one small, current signal from each installed app. */
export function DailyPractices({ today, range }: { today: string; range: DayRange }) {
  const added = useAddedApps();
  const hidden = useTodayAppsVisibility();
  const rows = useHomeRows('practice', { today, start: range.start, end: range.end });
  const visible = DAILY_PRACTICE_APPS.filter((app) => added.includes(app) && !hidden.has(app));
  if (!visible.length) return null;

  return (
    <section className="today-app-overview today-app-overview--daily" aria-labelledby="daily-practices-title">
      <div className="section-heading">
        <h2 id="daily-practices-title" className="section-label">Daily practices</h2>
        <a className="today-customize" href="/?open=settings%3Atoday" aria-label="Customize daily practices" title="Customize daily practices"><GearIcon size={18} /></a>
      </div>
      <div className="today-app-overview__card">
        {visible.map((app) => (
          <AppGroup key={app} app={app} compact>
            {rows.filter((row) => row.ref.app === app).map((row) => <PracticeLine key={row.ref.id} row={row} />)}
          </AppGroup>
        ))}
      </div>
    </section>
  );
}

/** Relevant, actionable signals from the other apps. Empty apps take no space. */
export function WorthYourAttention({ today, range }: { today: string; range: DayRange }) {
  const added = useAddedApps();
  const hidden = useTodayAppsVisibility();
  const rows = useHomeRows('attention', { today, start: range.start, end: range.end });
  const visible = (app: AttentionApp) => added.includes(app) && !hidden.has(app);
  const drawn = (app: AttentionApp) => visible(app) && <AttentionGroup app={app} rows={rows.filter((row) => row.ref.app === app)} today={today} />;

  return (
    <section className="today-app-overview today-app-overview--attention" aria-labelledby="worth-attention-title">
      <div className="section-heading">
        <h2 id="worth-attention-title" className="section-label">Worth your attention</h2>
        <a className="today-customize" href="/?open=settings%3Atoday" aria-label="Customize what appears here" title="Customize what appears here"><GearIcon size={18} /></a>
      </div>
      <div className="today-app-overview__card">
        <SwipeDay.Provider value={today}>
          {drawn('ergon')}
          {drawn('ktema')}
          {drawn('oikonomia')}
          {drawn('philia')}
          {drawn('phyton')}
          {drawn('poreia')}
          {drawn('soma')}
          {drawn('therapeia')}
          <AppGroup app="proairetos" name="Compass" compact><TodayPursuit /></AppGroup>
          <div className="today-group today-group--aside"><NotTodayFold /></div>
        </SwipeDay.Provider>
      </div>
    </section>
  );
}
