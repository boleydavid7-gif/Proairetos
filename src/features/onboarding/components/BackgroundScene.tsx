import valleyWide from '../../../assets/images/scenes/valley-wide.webp';
import seaWide from '../../../assets/images/scenes/poreia-wide.webp';

/**
 * One drawn scene that travels with the steps: the valley pans a little each time, the coast comes in for the sails, and
 * the light moves from dusk through the lamp to morning (`--pan`, `--dusk`, `--lamp`, `--morning` from the layout).
 */
export default function BackgroundScene({ scene = 'valley' }: { scene?: 'valley' | 'sea' }) {
  return (
    <div aria-hidden="true" className="onboarding-background" data-scene={scene}>
      <div className="onboarding-background__photo" style={{ backgroundImage: `url(${valleyWide})` }} />
      <div className="onboarding-background__photo onboarding-background__sea" style={{ backgroundImage: `url(${seaWide})` }} />
      <div className="onboarding-background__dusk" />
      <div className="onboarding-background__lamp" />
      <div className="onboarding-background__morning" />
      <div className="onboarding-background__wash" />
    </div>
  );
}
