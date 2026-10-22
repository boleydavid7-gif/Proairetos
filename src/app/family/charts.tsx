import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { easeOut, easeSpring, useTweened } from '../../lamplight/tween';
import './charts.css';

/*
 * Plain charts for the family: what was recorded, over time, with no targets, ranges or verdicts. Thin marks,
 * hairline grid, the series in the app's accent (two series get a legend and their own validated pair), and a
 * readout on hover, touch or the arrow keys. Every value shown is also in the list beside the chart.
 *
 * Lit by the lamp: columns rise from their baseline one after another and carry a little light on their caps; a
 * line draws itself in over a soft wash, its newest point gives one ripple; new values travel rather than jump; the
 * readout glides from point to point and the other columns step back while one is read (useTweened, charts.css).
 */

export type ChartPoint = { at: number; values: (number | undefined)[]; label?: string };
export type ChartSeries = { name: string };

const W = 340;
const PAD = { left: 34, right: 14, top: 12, bottom: 22 };

function niceTicks(min: number, max: number): number[] {
  if (min === max) return [min];
  const span = max - min;
  const step = 10 ** Math.floor(Math.log10(span / 2));
  const unit = [1, 2, 5, 10].map((each) => each * step).find((each) => span / each <= 4) ?? step * 10;
  const ticks: number[] = [];
  for (let value = Math.ceil(min / unit) * unit; value <= max + 1e-9; value += unit) ticks.push(Math.round(value * 1000) / 1000);
  return ticks;
}

const short = (at: number) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const number = (value: number) => (Math.abs(value) >= 1000 ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : `${Math.round(value * 10) / 10}`);

export function LineChart({ title, points, series, unit = '', height = 170 }: { title: string; points: ChartPoint[]; series: ChartSeries[]; unit?: string; height?: number }) {
  const [at, setAt] = useState<number>();
  const id = useId();
  const ordered = [...points].sort((a, b) => a.at - b.at);
  const flat = ordered.flatMap((point) => series.map((_, index) => point.values[index] ?? Number.NaN));
  const moving = useTweened(flat.map((value) => (Number.isNaN(value) ? 0 : value)), { ms: 620, ease: easeOut });
  const sorted = ordered.map((point, row) => ({
    ...point,
    values: series.map((_, index) => (Number.isNaN(flat[row * series.length + index]) ? undefined : moving[row * series.length + index])),
  }));
  const all = ordered.flatMap((point) => point.values.filter((value): value is number => value !== undefined));
  if (sorted.length < 2 || all.length < 2) return null;
  const low = Math.min(...all);
  const high = Math.max(...all);
  const pad = (high - low) * 0.12 || Math.max(1, Math.abs(high) * 0.05);
  const y0 = low - pad;
  const y1 = high + pad;
  const t0 = sorted[0].at;
  const t1 = sorted[sorted.length - 1].at;
  const x = (time: number) => PAD.left + ((time - t0) / (t1 - t0 || 1)) * (W - PAD.left - PAD.right);
  const y = (value: number) => PAD.top + (1 - (value - y0) / (y1 - y0)) * (height - PAD.top - PAD.bottom);
  const ticks = niceTicks(y0, y1).filter((tick) => tick >= y0 && tick <= y1);
  const path = (index: number) =>
    sorted
      .filter((point) => point.values[index] !== undefined)
      .map((point, step) => `${step ? 'L' : 'M'}${x(point.at).toFixed(1)},${y(point.values[index]!).toFixed(1)}`)
      .join(' ');
  const wash = series.length === 1 ? `${path(0)} L${x(t1).toFixed(1)},${height - PAD.bottom} L${x(t0).toFixed(1)},${height - PAD.bottom} Z` : undefined;
  const fade = `${id.replace(/:/g, '')}-wash`;
  const focus = at === undefined ? undefined : sorted[at];

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * W;
    let best = 0;
    sorted.forEach((point, index) => {
      if (Math.abs(x(point.at) - px) < Math.abs(x(sorted[best].at) - px)) best = index;
    });
    setAt(best);
  };
  const keys = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const from = at ?? sorted.length - 1;
    setAt(Math.max(0, Math.min(sorted.length - 1, from + (event.key === 'ArrowLeft' ? -1 : 1))));
  };

  return (
    <figure className="family-chart" aria-labelledby={id}>
      <figcaption id={id} className="family-chart__title">{title}</figcaption>
      {series.length > 1 && (
        <div className="family-chart__legend">
          {series.map((each, index) => (
            <span key={each.name}><i className={`family-chart__key family-chart__key--${index}`} />{each.name}</span>
          ))}
        </div>
      )}
      <div className="family-chart__plot">
        <svg
          viewBox={`0 0 ${W} ${height}`}
          role="img"
          aria-label={`${title}: ${sorted.length} points from ${short(t0)} to ${short(t1)}. Use the arrow keys to read each.`}
          tabIndex={0}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setAt(undefined)}
          onKeyDown={keys}
          onBlur={() => setAt(undefined)}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="family-chart__grid" x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} />
              <text className="family-chart__tick" x={PAD.left - 6} y={y(tick) + 3.5} textAnchor="end">{number(tick)}</text>
            </g>
          ))}
          <text className="family-chart__tick" x={PAD.left} y={height - 6}>{short(t0)}</text>
          <text className="family-chart__tick" x={W - PAD.right} y={height - 6} textAnchor="end">{short(t1)}</text>
          {wash && (
            <>
              <defs>
                <linearGradient id={fade} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" className="family-chart__wash-top" />
                  <stop offset="1" className="family-chart__wash-foot" />
                </linearGradient>
              </defs>
              <path className="family-chart__wash" d={wash} fill={`url(#${fade})`} />
            </>
          )}
          {series.map((each, index) => <path key={each.name} className={`family-chart__line family-chart__line--${index}`} d={path(index)} pathLength={1} />)}
          {series.map((each, index) => {
            const last = [...sorted].reverse().find((point) => point.values[index] !== undefined);
            return last ? (
              <g key={each.name}>
                <circle className={`family-chart__ripple family-chart__ripple--${index}`} cx={x(last.at)} cy={y(last.values[index]!)} r={4} />
                <circle className={`family-chart__dot family-chart__dot--${index} family-chart__dot--end`} cx={x(last.at)} cy={y(last.values[index]!)} r={4} />
              </g>
            ) : null;
          })}
          {focus && (
            <g className="family-chart__focus" style={{ transform: `translateX(${x(focus.at).toFixed(1)}px)` }}>
              <line className="family-chart__cross" x1={0} x2={0} y1={PAD.top} y2={height - PAD.bottom} />
              {focus.values.map((value, index) => (value === undefined ? null : <circle key={index} className={`family-chart__dot family-chart__dot--${index}`} cx={0} cy={y(value)} r={4} />))}
            </g>
          )}
        </svg>
        {focus && (
          <div className="family-chart__tip" style={{ left: `clamp(3.6rem, ${(x(focus.at) / W) * 100}%, calc(100% - 3.6rem))` }} role="status">
            {focus.values.map((value, index) =>
              value === undefined ? null : (
                <div key={index} className="family-chart__tip-row">
                  {series.length > 1 && <i className={`family-chart__key family-chart__key--${index}`} />}
                  <strong>{number(value)}{unit ? ` ${unit}` : ''}</strong>
                  {series.length > 1 && <span>{series[index].name}</span>}
                </div>
              ),
            )}
            <span className="family-chart__tip-when">{focus.label ?? short(focus.at)}</span>
          </div>
        )}
      </div>
    </figure>
  );
}

/** Columns for one value per day (hours slept), oldest first; a day with nothing recorded is a gap. */
export function ColumnChart({ title, days, unit = '', height = 150 }: { title: string; days: { label: string; long: string; value?: number }[]; unit?: string; height?: number }) {
  const [at, setAt] = useState<number>();
  const id = useId();
  const values = days.map((day) => day.value).filter((value): value is number => value !== undefined);
  const heights = useTweened(days.map((day) => day.value ?? 0), { from: 0, ms: 640, stagger: 28, ease: easeSpring });
  if (values.length < 2) return null;
  const top = Math.max(...values) * 1.1;
  const lit = `${id.replace(/:/g, '')}-lit`;
  const latest = days.reduce((found, day, index) => (day.value !== undefined && day.value > 0 ? index : found), -1);
  const ticks = niceTicks(0, top).filter((tick) => tick <= top);
  const slot = (W - PAD.left - PAD.right) / days.length;
  const bar = Math.min(24, slot - 4);
  const base = height - PAD.bottom;
  const y = (value: number) => PAD.top + (1 - value / top) * (base - PAD.top);
  const focus = at === undefined ? undefined : days[at];
  const keys = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const from = at ?? days.length - 1;
    setAt(Math.max(0, Math.min(days.length - 1, from + (event.key === 'ArrowLeft' ? -1 : 1))));
  };

  return (
    <figure className={`family-chart${at !== undefined ? ' is-reading' : ''}`} aria-labelledby={id}>
      <figcaption id={id} className="family-chart__title">{title}</figcaption>
      <div className="family-chart__plot">
        <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={`${title}. Use the arrow keys to read each day.`} tabIndex={0} onKeyDown={keys} onBlur={() => setAt(undefined)} onPointerLeave={() => setAt(undefined)}>
          <defs>
            <linearGradient id={lit} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" className="family-chart__bar-top" />
              <stop offset="1" className="family-chart__bar-foot" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="family-chart__grid" x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} />
              <text className="family-chart__tick" x={PAD.left - 6} y={y(tick) + 3.5} textAnchor="end">{number(tick)}</text>
            </g>
          ))}
          {days.map((day, index) => {
            const cx = PAD.left + slot * index + slot / 2;
            const show = days.length <= 7 || index % 2 === days.length % 2 || index === days.length - 1;
            return (
              <g key={day.long} onPointerEnter={() => setAt(index)} onPointerDown={() => setAt(index)}>
                <rect className="family-chart__hit" x={cx - slot / 2} y={PAD.top} width={slot} height={base - PAD.top} />
                {day.value !== undefined && day.value > 0 && heights[index] > 0 && (() => {
                  const capY = Math.min(base - 0.5, y(heights[index]));
                  const r = Math.min(4, (base - capY) / 2);
                  return (
                    <g className={`family-chart__column${at === index ? ' is-on' : ''}`}>
                      <path className="family-chart__bar" fill={`url(#${lit})`} d={`M${cx - bar / 2},${base} V${capY + r} q0,-${r} ${r},-${r} H${cx + bar / 2 - r} q${r},0 ${r},${r} V${base} Z`} />
                      <path className="family-chart__cap" d={`M${cx - bar / 2 + r},${capY + 0.75} H${cx + bar / 2 - r}`} />
                      {index === latest && at === undefined && (
                        <text className="family-chart__value" x={cx} y={capY - 6} textAnchor="middle">{number(day.value)}</text>
                      )}
                    </g>
                  );
                })()}
                {show && <text className="family-chart__tick" x={cx} y={height - 6} textAnchor="middle">{day.label}</text>}
              </g>
            );
          })}
          <line className="family-chart__axis" x1={PAD.left} x2={W - PAD.right} y1={base} y2={base} />
        </svg>
        {focus && (
          <div className="family-chart__tip" style={{ left: `clamp(3.6rem, ${((PAD.left + slot * at! + slot / 2) / W) * 100}%, calc(100% - 3.6rem))` }} role="status">
            <div className="family-chart__tip-row"><strong>{focus.value === undefined ? 'Nothing kept' : `${number(focus.value)}${unit ? ` ${unit}` : ''}`}</strong></div>
            <span className="family-chart__tip-when">{focus.long}</span>
          </div>
        )}
      </div>
    </figure>
  );
}
