import valley from '../../../assets/images/scenes/valley.webp';
import valleyWide from '../../../assets/images/scenes/valley-wide.webp';
import type { CSSProperties } from 'react';

export default function BackgroundScene() {
  return (
    <div aria-hidden="true" className="onboarding-background">
      <div className="onboarding-background__photo" style={{ backgroundImage: `url(${valley})`, '--photo-wide': `url(${valleyWide})` } as CSSProperties} />
      <div className="onboarding-background__wash" />
    </div>
  );
}
