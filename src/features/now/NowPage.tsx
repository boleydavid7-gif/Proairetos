import PageHeader from '../../components/layout/PageHeader';
import CaptureBar from './components/CaptureBar';
import NextCommitment from './components/NextCommitment';
import ImportantItems from './components/ImportantItems';
import WaitingItems from './components/WaitingItems';
import UnsortedPreview from './components/UnsortedPreview';
import NowEmptyState from './components/NowEmptyState';
import { useNow } from './hooks/useNow';

export default function NowPage() {
  const now = useNow();
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
          <ImportantItems items={now.important} />
          <WaitingItems items={now.waiting} />
          <UnsortedPreview count={now.unsortedCount} />
        </>
      ))}
    </div>
  );
}
