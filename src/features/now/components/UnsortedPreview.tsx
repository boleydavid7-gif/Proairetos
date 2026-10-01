import { InboxIcon } from '../../../components/icons/Icons';
import ListCard from '../../../components/ui/ListCard';

type Props = {
  count: number;
};

export default function UnsortedPreview({ count }: Props) {
  if (count === 0) return null;

  return (
    <ListCard
      icon={<InboxIcon size={22} />}
      title={`${count} capture${count === 1 ? '' : 's'} not sorted yet`}
      detail="Sort them in Capture whenever you like."
    />
  );
}
