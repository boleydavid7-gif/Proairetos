import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { decisionService } from '../../app/services';
import { ChevronRightIcon } from '../../components/icons/Icons';
import { decisionsToRevisit } from '../../core/decisions/rules';
import { toLocalDate } from '../../core/scheduling/dates';
import { formatLocalDay } from '../schedule/format';

const SHOWN = 10;

export default function DecisionsSection() {
  const { openDecision, startDecision } = useOverlays();
  const decisions = useServiceData(decisionService.subscribe, () => decisionService.list());
  if (!decisions) return null;

  const ready = new Set(decisionsToRevisit(decisions, new Date()).map((d) => d.id));

  return (
    <section className="stack-tight" aria-label="Decisions">
      <div className="section-heading">
        <h2 className="section-label">Decisions</h2>
        <button type="button" className="text-link" onClick={() => startDecision()}>
          Make a decision
        </button>
      </div>
      {decisions.length === 0 && (
        <p className="empty-note">Choices you write down will be here, so you can look back on how they went.</p>
      )}
      {decisions.slice(0, SHOWN).map((decision) => (
        <button key={decision.id} type="button" className="list-card list-card--button" onClick={() => openDecision(decision.id)}>
          <span className="list-card__text">
            <span className="list-card__title">{decision.question}</span>
            <span className="list-card__detail">
              {decision.choice} · {formatLocalDay(toLocalDate(new Date(decision.decidedAt)), { month: 'short', day: 'numeric' })}
              {ready.has(decision.id) && <span className="badge">Ready to look back</span>}
            </span>
          </span>
          <ChevronRightIcon size={18} className="list-card__chevron" />
        </button>
      ))}
    </section>
  );
}
