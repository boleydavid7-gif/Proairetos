import { runLength, todaysRun, useRuns } from '../../app/askesis/runs';
import { ChevronRightIcon, MountainIcon } from '../../components/icons/Icons';
import NotForMe from './NotForMe';
import { linkTo } from '../../app/family/opening';

/** Today's session from Askesis, if one is planned and not done yet. Opens Askesis. */
export default function TodayRun({ today }: { today: string }) {
  const runs = useRuns();
  const run = todaysRun(runs, today);
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
          <span className="quiet-row__detail">Today in Askesis. {run.summary}.</span>
        </span>
        <ChevronRightIcon size={18} className="quiet-row__chevron" />
      </a>
      <NotForMe part="askesis" />
    </div>
  );
}
