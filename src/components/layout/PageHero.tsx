import type { ReactNode } from 'react';
import sunrise from '../../assets/images/scenes/sunrise.webp';
import sunriseWide from '../../assets/images/scenes/sunrise-wide.webp';
import morning from '../../assets/images/scenes/morning.webp';
import morningWide from '../../assets/images/scenes/morning-wide.webp';
import type { CSSProperties } from 'react';
import SearchButton from './SearchButton';
import SettingsButton from './SettingsButton';

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Which part of the landscape shows under the title. */
  focus?: 'peaks' | 'sunrise';
};

/** A page header over the landscape from onboarding, fading into the page. */
export default function PageHero({ title, subtitle, focus = 'peaks' }: Props) {
  return (
    <header className={`page-hero page-hero--${focus}`}>
      <div aria-hidden="true" className="page-hero__photo" style={{ backgroundImage: `url(${sunrise})`, '--photo-wide': `url(${sunriseWide})`, '--photo-light': `url(${morning})`, '--photo-light-wide': `url(${morningWide})` } as CSSProperties} />
      <div aria-hidden="true" className="page-hero__wash" />
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
