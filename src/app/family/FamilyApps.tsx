import { APPS, type AppId } from '../../core/apps/manifest';
import { useAddedApps, type AddOn } from './added';
import { GLYPHS, LampIcon, Sym } from '../../lamplight/icons';
import { FEEDBACK_EMAIL } from '../siteAddress';
import { feedbackLink } from './feedback';

/** The apps of the family, the same list in every one (the one open is left out). */
export type FamilyApp = AppId;

/** Names, addresses, icons, lines and colors come from the application manifest (src/core/apps/manifest.ts). A retired app (Praxis) is not listed. */
export const familyApps: readonly { id: FamilyApp; name: string; href: string; icon: string; line: string; about?: string; tint?: { ground: string; accent: string; ink: string } }[] = APPS.filter((app) => app.status !== 'retired').map((app) => ({
  id: app.id,
  name: app.name,
  href: app.urls.href,
  icon: app.icon,
  line: app.line,
  ...(app.about ? { about: app.about } : {}),
  ...(app.tint ? { tint: app.tint } : {}),
}));

export default function FamilyApps({ current }: { current: FamilyApp }) {
  const added = useAddedApps();
  const shown = familyApps.filter((app) => app.id !== current && (app.id === 'proairetos' || added.includes(app.id as AddOn)));
  return (
    <section className="family-apps" aria-label="The family">
      <p className="label">The family</p>
      <ul className="rows">
        {shown.map((app) => (
            <li key={app.id}>
              <a className="row" href={app.href}>
                <span className="row__icon">
                  <img className="row__app" src={app.icon} alt="" width={26} height={26} />
                </span>
                <span className="row__text">
                  <span>{app.name}</span>
                  <span className="row__detail">{app.line}</span>
                </span>
              </a>
            </li>
          ))}
        <li>
          <a className="row" href="/?open=settings:store">
            <span className="row__icon family-apps__store" aria-hidden="true">
              <Sym name="plus" />
            </span>
            <span className="row__text">
              <span>App Store</span>
              
            </span>
          </a>
        </li>
      </ul>
      <ul className="rows family-apps__feedback">
        <li>
          <a className="row" href={feedbackLink(familyApps.find((app) => app.id === current)?.name ?? 'Proairetos')}>
            <span className="row__icon" aria-hidden="true">
              <LampIcon glyph={GLYPHS.pencil} size={22} />
            </span>
            <span className="row__text">
              <span>Send feedback</span>
              <span className="row__detail">{FEEDBACK_EMAIL}</span>
            </span>
          </a>
        </li>
      </ul>
    </section>
  );
}
