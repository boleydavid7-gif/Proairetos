import { toLocalDate } from '../../core/scheduling/dates';
import { Switch } from '../../askesis/app/ui';
import { dailyLines, lineOf, type LineApp } from './dailyLines';

/** The app's line for today, at the foot of its first page. */
export function DailyLine({ app }: { app: LineApp }) {
  const off = dailyLines.use().off;
  if (off.includes(app)) return null;
  const line = lineOf(app, toLocalDate(new Date()));
  return (
    <figure className="daily-line">
      <blockquote>{line.text}</blockquote>
      <figcaption>{line.by}</figcaption>
    </figure>
  );
}

/** The switch for it, in the app's More. */
export function DailyLineSwitch({ app }: { app: LineApp }) {
  const off = dailyLines.use().off;
  const on = !off.includes(app);
  return <Switch on={on} label="Daily line" detail="Stoic and Buddhist, in turn" onToggle={() => dailyLines.save({ off: on ? [...off, app] : off.filter((each) => each !== app) })} />;
}
