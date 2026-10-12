import { FamilyMark } from '../../app/family/marks';

type Props = { size?: number };

/** Theoria's mark: the open book from its icon, without the tile, in Theoria's gold. */
export default function TheoriaMark({ size = 40 }: Props) {
  return <FamilyMark app="theoria" size={size} color="#d9b46a" label="Theoria mark" />;
}
