import PageHeader from '../../components/layout/PageHeader';
import CaptureBar from './components/CaptureBar';
import NextCommitment from './components/NextCommitment';
import ImportantItems from './components/ImportantItems';
import ScheduledItems from './components/ScheduledItems';
import WaitingItems from './components/WaitingItems';
import UnsortedPreview from './components/UnsortedPreview';
import NowEmptyState from './components/NowEmptyState';
import { useNow } from './hooks/useNow';

export default function NowPage() {
  const now = useNow();
  const nowIso = new Date().toISOString();
  const others = now?.scheduled.filter((item) => item.id !== now.nextCommitment?.id) ?? [];
  const comingUp = others.filter((item) => (item.scheduledAt ?? '') >= nowIso);
  const earlier = others.filter((item) => (item.scheduledAt ?? '') < nowIso);
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="page">
      <PageHeader title="Today" subtitle={date} />
      <CaptureBar />
      {now && (now.isEmpty ? (
        <NowEmptyState />
      ) : (
        <>
          <NextCommitment commitment={now.nextCommitment} />
          <ScheduledItems label="Coming up" items={comingUp} />
          <ImportantItems items={now.important} />
          <WaitingItems items={now.waiting} />
          <UnsortedPreview count={now.unsortedCount} />
          <ScheduledItems label="Earlier" items={earlier} />
        </>
      ))}
    </div>
  );
}
