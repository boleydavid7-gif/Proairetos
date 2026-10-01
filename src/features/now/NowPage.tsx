import NowHeader from './components/NowHeader';
import CaptureBar from './components/CaptureBar';
import NextCommitment from './components/NextCommitment';
import WaitingItems from './components/WaitingItems';
import UnsortedPreview from './components/UnsortedPreview';

export default function NowPage() {
  return (
    <main className="now-page">
      <NowHeader />
      <CaptureBar />
      <NextCommitment />
      <WaitingItems />
      <UnsortedPreview />
    </main>
  );
}
