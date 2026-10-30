import seaWide from '../../../assets/images/scenes/poreia-wide.webp';

/**
 * The person's own room (the wallpaper Today wears), dark until the lamp is lit; the coast comes in for the sails.
 * `--ob-wall` and `--ob-lamp` come from the layout, so a room or color chosen later redraws it at once.
 */
export default function BackgroundScene({ scene = 'room' }: { scene?: 'room' | 'sea' }) {
  return (
    <div aria-hidden="true" className="onboarding-background" data-scene={scene}>
      <div className="onboarding-background__wall" />
      <div className="onboarding-background__sea" style={{ backgroundImage: `url(${seaWide})` }} />
      <div className="onboarding-background__dark" />
      <div className="onboarding-background__lamp" />
      <div className="onboarding-background__wash" />
    </div>
  );
}
