import valley from '../../../assets/images/onboarding/valley.webp';

export default function BackgroundScene() {
  return (
    <div aria-hidden="true" className="onboarding-background">
      <div className="onboarding-background__photo" style={{ backgroundImage: `url(${valley})` }} />
      <div className="onboarding-background__wash" />
    </div>
  );
}
