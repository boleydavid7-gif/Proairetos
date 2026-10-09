import type { ReactNode } from 'react';
import valley from '../../assets/images/scenes/valley.webp';
import valleyWide from '../../assets/images/scenes/valley-wide.webp';
import morning from '../../assets/images/scenes/morning.webp';
import morningWide from '../../assets/images/scenes/morning-wide.webp';
import type { CSSProperties } from 'react';
import SearchButton from './SearchButton';
import SettingsButton from './SettingsButton';

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Which part of the landscape shows under the title. */
  focus?: 'peaks' | 'valley';
};

/** A page header over the landscape from onboarding, fading into the page. */
export default function PageHero({ title, subtitle, focus = 'peaks' }: Props) {
  return (
    <header className={`page-hero page-hero--${focus}`}>
      <div aria-hidden="true" className="page-hero__photo" style={{ backgroundImage: `url(${valley})`, '--photo-wide': `url(${valleyWide})`, '--photo-light': `url(${morning})`, '--photo-light-wide': `url(${morningWide})` } as CSSProperties} />
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
