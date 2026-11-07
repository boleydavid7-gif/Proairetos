import { FamilyMark } from '../../app/family/marks';

type Props = {
  size?: number;
  tone?: 'light' | 'dark';
};

/** Praxis's mark: the hourglass from its icon, without the tile, gold in the dark study room. */
export default function PraxisMark({ size = 64, tone = 'dark' }: Props) {
  return <FamilyMark app="praxis" size={size} color={tone === 'dark' ? '#e3c89f' : '#2f5a3e'} label="Praxis mark" />;
}
