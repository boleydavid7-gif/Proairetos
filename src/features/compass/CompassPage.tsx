import CompassRose from '../../components/brand/CompassRose';
import PageHeader from '../../components/layout/PageHeader';

export default function CompassPage() {
  return (
    <div className="page">
      <PageHeader title="Compass" subtitle="Keep sight of what matters to you." />
      <div className="empty-state empty-state--centered">
        <CompassRose size={96} tone="dark" />
        <p className="empty-state__title">Your values will live here.</p>
        <p className="empty-state__detail">
          Up to five values you choose, and the things you want to remember or put aside.
        </p>
      </div>
    </div>
  );
}
