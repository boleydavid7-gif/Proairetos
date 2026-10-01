export default function NowHeader() {
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <header className="page-header">
      <h1 className="page-header__title">Today</h1>
      <p className="page-header__subtitle">{date}</p>
    </header>
  );
}
