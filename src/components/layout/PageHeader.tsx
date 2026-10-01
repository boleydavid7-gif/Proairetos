type Props = {
  title: string;
  subtitle?: string;
};

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <header className="page-header">
      <h1 className="page-header__title">{title}</h1>
      {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
    </header>
  );
}
