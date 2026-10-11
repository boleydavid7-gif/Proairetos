import { useState } from 'react';
import { yearsOf, type Year } from '../../core/year/year';
import './year.css';

/**
 * Your year in one app: plain facts as tiles, then the lines behind them. Years with records are offered as chips;
 * nothing is compared with another year.
 */
export default function YearPage({ dates, build, onBack, className = '' }: { dates: readonly (string | undefined)[]; build: (year: number) => Year; onBack: () => void; className?: string }) {
  const thisYear = new Date().getFullYear();
  const years = yearsOf(dates, thisYear);
  const [year, setYear] = useState(thisYear);
  const shown = build(year);
  const empty = !shown.facts.length && !shown.lists.length;
  return (
    <div className={`page year-page ${className}`}>
      <div className="page-top"><button type="button" className="back-link" onClick={onBack}>Back</button></div>
      <h1 className="title">Your year</h1>
      {years.length > 1 && (
        <div className="year-chips" role="group" aria-label="Year">
          {years.map((each) => (
            <button key={each} type="button" className="chip" aria-pressed={each === year} onClick={() => setYear(each)}>{each}</button>
          ))}
        </div>
      )}
      {empty ? (
        <p className="muted year-empty">Nothing written down in {year}.</p>
      ) : (
        <>
          {shown.facts.length > 0 && (
            <dl className="year-facts">
              {shown.facts.map((fact) => (
                <div key={fact.label} className="year-fact">
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {shown.lists.map((list) => (
            <section key={list.title} className="card year-list">
              <h2 className="card__title card__title--small">{list.title}</h2>
              <ul>{list.lines.map((line, index) => <li key={index}>{line}</li>)}</ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
