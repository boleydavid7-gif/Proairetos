import { FamilyMark, MARK_LIGHT } from '../../app/family/marks';
import { Sym } from '../../lamplight/icons';

export function PoreiaMark({ size = 30, light = false }: { size?: number; light?: boolean }) {
  return <FamilyMark app="poreia" size={size} color={light ? MARK_LIGHT : 'currentColor'} />;
}

export const HomeIcon = (props: { size?: number }) => <Sym name="home" {...props} />;
export const TripsIcon = (props: { size?: number }) => <Sym name="work" {...props} />;
export const CalendarIcon = (props: { size?: number }) => <Sym name="calendar" {...props} />;
export const PtoIcon = (props: { size?: number }) => <Sym name="wallet" {...props} />;
export const DiscoverIcon = (props: { size?: number }) => <Sym name="search" {...props} />;
export const MoreIcon = (props: { size?: number }) => <Sym name="more" {...props} />;
export const PlusIcon = (props: { size?: number }) => <Sym name="plus" {...props} />;
export const CheckIcon = (props: { size?: number }) => <Sym name="check" {...props} />;
export const ArrowLeftIcon = (props: { size?: number }) => <Sym name="arrowLeft" {...props} />;
export const ChevronIcon = (props: { size?: number }) => <Sym name="chevron" {...props} />;
export const TargetIcon = (props: { size?: number }) => <Sym name="target" {...props} />;
export const WorkIcon = (props: { size?: number }) => <Sym name="work" {...props} />;
export const HeartIcon = (props: { size?: number }) => <Sym name="heart" {...props} />;
