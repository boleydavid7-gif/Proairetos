type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Card({ children, className = '' }: CardProps) {
  return (
    <section className={`card ${className}`}>
      {children}
    </section>
  );
}
