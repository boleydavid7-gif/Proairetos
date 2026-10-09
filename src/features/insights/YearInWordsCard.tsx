import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { compassService, decisionService, reflectionService } from '../../app/services';
import { yearInWords, yearIsEmpty, yearsWithWords, type YearInWords } from '../../core/reflections/lookBack';

function subscribeAll(listener: () => void) {
  const off = [reflectionService, decisionService, compassService].map((service) => service.subscribe(listener));
  return () => off.forEach((unsubscribe) => unsubscribe());
}

const dayLabel = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function Lines({ title, lines }: { title: string; lines: { day: string; text: string }[] }) {
  if (!lines.length) return null;
  return (
    <section className="year-words__part">
      <h3 className="year-words__title">{title}</h3>
      <ul className="year-words__lines">
        {lines.map((line, index) => (
          <li key={`${line.day}-${index}`}>
            <span className="year-words__day">{dayLabel(line.day)}</span> {line.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * A year, in the person's own words: what they wrote and chose, gathered in the order it happened. Folded
 * away until opened. No counts, no conclusions.
 */
export default function YearInWordsCard() {
  const data = useServiceData(subscribeAll, async () => {
    const [reflections, decisions, statements, values] = await Promise.all([
      reflectionService.all(),
      decisionService.list(),
      compassService.statements(),
      compassService.values(),
    ]);
    return { reflections, decisions, statements, values };
  });
  const years = data ? yearsWithWords(data.reflections) : [];
  const [chosen, setChosen] = useState<number | null>(null);
  if (!data || years.length === 0) return null;
  const year = chosen ?? years[0];
  const words: YearInWords = yearInWords(data, year);

  return (
    <details className="insight-card year-words">
      <summary className="year-words__summary">A year in your own words</summary>
      {years.length > 1 && (
        <div className="chip-row" role="group" aria-label="Year">
          {years.map((option) => (
            <button key={option} type="button" className={`chip${option === year ? ' chip--accent' : ''}`} onClick={() => setChosen(option)}>
              {option}
            </button>
          ))}
        </div>
      )}
      {yearIsEmpty(words) ? (
        <p className="insight-card__note">Nothing written in {year}.</p>
      ) : (
        <>
          {words.valuesChosen.length > 0 && (
            <section className="year-words__part">
              <h3 className="year-words__title">Values you chose</h3>
              <p>{words.valuesChosen.join(', ')}</p>
            </section>
          )}
          {words.goalsReached.length > 0 && (
            <section className="year-words__part">
              <h3 className="year-words__title">Reached</h3>
              <ul className="year-words__lines">
                {words.goalsReached.map((goal) => (
                  <li key={goal.text}>
                    <span className="year-words__day">{dayLabel(goal.day)}</span> {goal.text}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Lines title="Grateful for" lines={words.grateful} />
          <Lines title="Three good things" lines={words.goodThings} />
          <Lines title="In your journal" lines={words.reflections} />
          {words.decisions.length > 0 && (
            <section className="year-words__part">
              <h3 className="year-words__title">Decisions</h3>
              <ul className="year-words__lines">
                {words.decisions.map((decision) => (
                  <li key={`${decision.day}-${decision.question}`}>
                    <span className="year-words__day">{dayLabel(decision.day)}</span> {decision.question}: {decision.choice}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </details>
  );
}
