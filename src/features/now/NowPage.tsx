import NowHeader from './components/NowHeader';
import CaptureBar from './components/CaptureBar';
import NextCommitment from './components/NextCommitment';
import WaitingItems from './components/WaitingItems';
import UnsortedPreview from './components/UnsortedPreview';
import { useNow } from './hooks/useNow';

export default function NowPage() {
  const now = useNow();

  return (
    <main className="now-page">
      <NowHeader />
      <CaptureBar />
      <NextCommitment commitment={now.nextCommitment} />
      <WaitingItems items={now.waitingItems} />
      <UnsortedPreview count={now.unsortedCount} />
    </main>
  );
}
