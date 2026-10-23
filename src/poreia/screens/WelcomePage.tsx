import { Welcome } from '../../app/family/shell';
import { AppMark } from '../../app/family/icons';
import photo from '../../assets/images/scenes/poreia.webp';
import photoWide from '../../assets/images/scenes/poreia-wide.webp';
import type { PoreiaNav } from '../app/App';
import { settings } from '../app/state';

export default function WelcomePage({ nav }: { nav: PoreiaNav }) {
  return (
    <Welcome
      name="Poreia"
      mark={<AppMark app="poreia" size={44} light />}
      line="Trips, from first idea to home again."
      about="Plan trips, find stays and flights, keep every booking in one place, and track the budget and time off each takes."
      photo={photo}
      photoWide={photoWide}
      onBegin={() => {
        settings.save({ ...settings.load(), started: true });
        nav.swap({ name: 'trips' });
      }}
    />
  );
}
