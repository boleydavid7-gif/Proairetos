import sunrise from '../../assets/images/scenes/sunrise.webp';
import sunriseWide from '../../assets/images/scenes/sunrise-wide.webp';
import morning from '../../assets/images/scenes/morning.webp';
import morningWide from '../../assets/images/scenes/morning-wide.webp';
import type { CSSProperties } from 'react';

/** The landscape from onboarding, resting at the foot of a page and fading up into it. */
export default function Landscape() {
  return (
    <div aria-hidden="true" className="page-landscape">
      <div className="page-landscape__photo" style={{ backgroundImage: `url(${sunrise})`, '--photo-wide': `url(${sunriseWide})`, '--photo-light': `url(${morning})`, '--photo-light-wide': `url(${morningWide})` } as CSSProperties} />
    </div>
  );
}
