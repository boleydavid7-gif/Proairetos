import NowHeader from './components/NowHeader';
import CaptureBar from './components/CaptureBar';
import NextCommitment from './components/NextCommitment';
import WaitingItems from './components/WaitingItems';
import UnsortedPreview from './components/UnsortedPreview';
import NowEmptyState from './components/NowEmptyState';
import { useNow } from './hooks/useNow';

export default function NowPage() {
  const now = useNow();

  return (
    <div className="now-page">
      <NowHeader />
      <CaptureBar />
      {now.isEmpty ? (
        <NowEmptyState />
      ) : (
        <>
          <NextCommitment commitment={now.nextCommitment} />
          <WaitingItems items={now.waiting} />
          <UnsortedPreview count={now.unsortedCount} />
        </>
      )}
    </div>
  );
}
