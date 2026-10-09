import valley from '../../assets/images/scenes/valley.webp';
import valleyWide from '../../assets/images/scenes/valley-wide.webp';
import morning from '../../assets/images/scenes/morning.webp';
import morningWide from '../../assets/images/scenes/morning-wide.webp';
import type { CSSProperties } from 'react';

/** The landscape from onboarding, resting at the foot of a page and fading up into it. */
export default function Landscape() {
  return (
    <div aria-hidden="true" className="page-landscape">
      <div className="page-landscape__photo" style={{ backgroundImage: `url(${valley})`, '--photo-wide': `url(${valleyWide})`, '--photo-light': `url(${morning})`, '--photo-light-wide': `url(${morningWide})` } as CSSProperties} />
    </div>
  );
}
