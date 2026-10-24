import { runLength, todaysRun, useRuns } from '../../app/askesis/runs';
import { ChevronRightIcon, MountainIcon } from '../../components/icons/Icons';
import NotForMe from './NotForMe';
import { linkTo } from '../../app/family/opening';
import { useFittedWeek } from '../../app/family/trainingWeek';

/** Today's session from Askesis, if one is planned and not done yet. Opens Askesis. */
export default function TodayRun({ today }: { today: string }) {
  const runs = useRuns();
  useFittedWeek(today, [runs]);
  const run = todaysRun(runs, today);
  if (!runs) return null;
  if (!run && !runs.plan) {
    return (
      <div className="quiet-row-wrap">
        <a className="quiet-row" href={linkTo('askesis', 'train')}>
          <span className="quiet-row__icon" aria-hidden="true">
            <MountainIcon size={20} />
          </span>
          <span className="quiet-row__text">
            <span>Start your running plan</span>
            <span className="quiet-row__detail">Askesis · built around your week</span>
          </span>
          <ChevronRightIcon size={18} className="quiet-row__chevron" />
        </a>
        <NotForMe part="askesis" />
      </div>
    );
  }
  if (!run) return null;
  const length = runLength(run);
  return (
    <div className="quiet-row-wrap">
      <a className="quiet-row" href={linkTo('askesis', `workout:${run.id}`)}>
        <span className="quiet-row__icon" aria-hidden="true">
          <MountainIcon size={20} />
        </span>
        <span className="quiet-row__text">
          <span>
            {run.title}
            {length ? ` · ${length}` : ''}
          </span>
          <span className="quiet-row__detail">{run.summary.replace(/(\d) x /g, '$1 × ')} · Askesis, around your week</span>
        </span>
        <ChevronRightIcon size={18} className="quiet-row__chevron" />
      </a>
      <NotForMe part="askesis" />
    </div>
  );
}
