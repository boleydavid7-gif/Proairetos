/** The foot of Today: the room's own ridges (Lamplight, `--room-foot`), resting at the foot of the page and fading
 *  up into it. Drawn without a sun, so the wallpaper's lamp is the one light. */
export default function Landscape() {
  return (
    <div aria-hidden="true" className="page-landscape">
      <div className="page-landscape__photo page-landscape__photo--room" />
    </div>
  );
}
