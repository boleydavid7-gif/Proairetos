type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function Surface({ children, className = '' }: Props) {
  return <section className={`surface ${className}`}>{children}</section>;
}
