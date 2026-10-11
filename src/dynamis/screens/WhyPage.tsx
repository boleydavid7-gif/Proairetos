import type { DynamisNav } from '../app/App';
import { SOURCES, WHY } from '../core/plan';

export default function WhyPage({ nav }: { nav: DynamisNav }) {
  return (
    <div className="page dynamis-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Back</button>
        <p className="label">How the plan is built</p>
        <span />
      </div>
      <ol className="dynamis-why">
        {WHY.map((each) => (
          <li key={each.line}>
            <p>{each.line}</p>
            <p className="fine">{SOURCES[each.source]}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
