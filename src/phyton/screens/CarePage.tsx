import type { PhytonNav } from '../app/App';
import { useListPermissions } from '../../app/family/sharedLists';
import { useHome } from '../app/state';
import { DRY_TEXT, LIGHT_TEXT, NOT_LISTED, TOXIC_TEXT, speciesBy } from '../core/species';

/** The care for one plant type, read before (or without) adding it. */
export default function CarePage({ nav, species }: { nav: PhytonNav; species: string }) {
  const type = speciesBy(species);
  const can = useListPermissions(useHome()?.id);
  if (!type) {
    return (
      <div className="page phyton-page">
        <div className="page-top section-head">
          <button type="button" className="back-link" onClick={nav.back}>Back</button>
          <p className="label">Plant care</p>
          <span />
        </div>
        <p className="muted">That plant is not in the list.</p>
      </div>
    );
  }
  return (
    <div className="page phyton-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Back</button>
        <p className="label">Plant care</p>
        <span />
      </div>

      <div className="detail-head">
        <div>
          <h1 className="title">{type.name}</h1>
          <p className="muted"><i>{type.latin}</i>{type.also?.length ? ` · ${type.also.slice(0, 3).join(', ')}` : ''}</p>
        </div>
      </div>

      <dl className="detail-list">
        <dt>Light</dt>
        <dd>{LIGHT_TEXT[type.light]}</dd>
        <dt>Watering</dt>
        <dd>{DRY_TEXT[type.dry]}. About every {type.water} days in spring and summer, less often in winter.</dd>
        {type.humid && <><dt>Humidity</dt><dd>Likes humid air</dd></>}
        <dt>Feeding</dt>
        <dd>{type.feed ? `Every ${type.feed === 1 ? 'week' : `${type.feed} weeks`}, spring and summer` : 'Rarely needs feeding'}</dd>
        <dt>Pets</dt>
        <dd>{type.toxic ? TOXIC_TEXT[type.toxic] : NOT_LISTED}</dd>
        {type.note && <><dt>Note</dt><dd>{type.note}</dd></>}
      </dl>

      {can.write && (
        <div className="button-row">
          <button type="button" className="button-main" onClick={() => nav.swap({ name: 'plant', species: type.key })}>Add to my plants</button>
        </div>
      )}
      <p className="fine">Care: RHS, Missouri Botanical Garden and university extension guides. Pets: ASPCA.</p>
    </div>
  );
}
