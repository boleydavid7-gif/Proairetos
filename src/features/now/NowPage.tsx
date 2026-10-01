import NowHeader from './components/NowHeader';
import CaptureBar from './components/CaptureBar';
import NextCommitment from './components/NextCommitment';
import ItemList from './components/ItemList';
import WaitingItems from './components/WaitingItems';
import UnsortedPreview from './components/UnsortedPreview';
import NowEmptyState from './components/NowEmptyState';
import { useNow } from './hooks/useNow';

export default function NowPage() {
  const now = useNow();

  return (
    <div className="page">
      <NowHeader />
      <CaptureBar />
      {now && (now.isEmpty ? (
        <NowEmptyState />
      ) : (
        <>
          <NextCommitment commitment={now.nextCommitment} />
          <ItemList label="Marked important" items={now.important} />
          <WaitingItems items={now.waiting} />
          <UnsortedPreview count={now.unsortedCount} />
        </>
      ))}
    </div>
  );
}
