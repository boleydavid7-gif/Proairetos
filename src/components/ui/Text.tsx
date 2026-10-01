type Props = {
  children: React.ReactNode;
  muted?: boolean;
  className?: string;
};

export default function Text({ children, muted = false, className = '' }: Props) {
  return <span className={`${muted ? 'text-muted' : ''} ${className}`}>{children}</span>;
}
