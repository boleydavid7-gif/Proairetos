import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { decisionService } from '../../app/services';
import { ChevronRightIcon } from '../../components/icons/Icons';

/** Decisions whose look-back day has come, chosen by the person when they decided. */
export function useDecisionsToRevisit() {
  return useServiceData(decisionService.subscribe, () => decisionService.toRevisit()) ?? [];
}

export default function RevisitNudges() {
  const { openDecision } = useOverlays();
  const due = useDecisionsToRevisit();
  if (due.length === 0) return null;

  return (
    <section className="stack-tight" aria-label="Decisions to look back on">
      <h2 className="section-label">Decisions to look back on</h2>
      {due.map((decision) => (
        <button key={decision.id} type="button" className="list-card list-card--button" onClick={() => openDecision(decision.id)}>
          <span className="list-card__text">
            <span className="list-card__title">{decision.question}</span>
            <span className="list-card__detail">You chose: {decision.choice}</span>
          </span>
          <ChevronRightIcon size={18} className="list-card__chevron" />
        </button>
      ))}
    </section>
  );
}
