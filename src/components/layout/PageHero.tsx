import { ArrowLeftIcon } from '../icons/Icons';
import type { ReactNode } from 'react';
import SearchButton from './SearchButton';
import SettingsButton from './SettingsButton';

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** A way back, for a page opened from another (Compass from Reflect). */
  back?: { label: string; onBack: () => void };
};

/** A page header with its title low, over the room's wallpaper (Lamplight), so the lamp stays the one light. */
export default function PageHero({ title, subtitle, back }: Props) {
  return (
    <header className="page-hero">
      {back && (
        <button type="button" className="page-hero__back" onClick={back.onBack}>
          <ArrowLeftIcon size={20} />
          <span>{back.label}</span>
        </button>
      )}
      <div className="page-hero__actions">
        <SearchButton />
        <SettingsButton />
      </div>
      <div className="page-hero__text">
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <div className="page-header__subtitle">{subtitle}</div>}
      </div>
    </header>
  );
}
