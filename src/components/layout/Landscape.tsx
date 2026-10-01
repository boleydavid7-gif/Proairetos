import valley from '../../assets/images/scenes/valley.webp';

/** The landscape from onboarding, resting at the foot of a page and fading up into it. */
export default function Landscape() {
  return (
    <div aria-hidden="true" className="page-landscape">
      <div className="page-landscape__photo" style={{ backgroundImage: `url(${valley})` }} />
    </div>
  );
}
