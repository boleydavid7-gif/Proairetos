import type { Nav } from '../app/App';
import { BoltIcon, CupIcon, MoonIcon, SunIcon } from '../app/icons';
import { ScreenHeader } from '../app/ui';

export default function PatternsPage({ nav }: { nav: Nav }) {
  return <div className="hydros-screen hydros-detail"><ScreenHeader title="Key Patterns" onBack={nav.back} /><div className="pattern-detail-list"><Pattern icon={<SunIcon />} title="Work days" text="Your intake is often higher on work days." /><Pattern icon={<MoonIcon />} title="Afternoon" text="A lower point often comes in the afternoon." /><Pattern icon={<BoltIcon />} title="Training days" text="You tend to drink more on training days." /><Pattern icon={<CupIcon />} title="Caffeine" text="Less caffeine after 3 PM lines up with better sleep." /></div></div>;
}
function Pattern({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <article className="pattern-detail-row"><span>{icon}</span><div><strong>{title}</strong><p>{text}</p></div></article>; }
