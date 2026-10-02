import SearchButton from './SearchButton';
import SettingsButton from './SettingsButton';

type Props = {
  title: string;
  subtitle?: string;
  /** Shows the settings gear in the top corner, as on the main tabs. */
  settings?: boolean;
};

export default function PageHeader({ title, subtitle, settings = false }: Props) {
  return (
    <header className="page-header">
      {settings && (
        <div className="page-header__actions">
          <SearchButton />
          <SettingsButton />
        </div>
      )}
      <h1 className="page-header__title">{title}</h1>
      {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
    </header>
  );
}
