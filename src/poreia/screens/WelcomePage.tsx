import type { Nav } from '../app/App';
import { PoreiaMark } from '../app/icons';

export default function WelcomePage({ onStarted }: { nav: Nav; onStarted: () => void }) {
  return (
    <div className="welcome poreia-welcome">
      <div className="welcome__shade" />
      <div className="welcome__content">
        <PoreiaMark size={52} light />
        <h1 className="welcome__name">Poreia</h1>
        <p className="welcome__line">A better way to get away.</p>
        <p className="welcome__about">Plan vacation windows around your work, family, leave and the things that still need doing.</p>
        <div className="welcome__actions"><button type="button" className="button-main" onClick={onStarted}>Begin</button></div>
      </div>
    </div>
  );
}
