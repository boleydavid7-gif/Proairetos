import { Welcome } from '../../app/family/shell';
import { AppMark } from '../../app/family/icons';
import photo from '../../assets/images/scenes/therapeia.webp';
import photoWide from '../../assets/images/scenes/therapeia-wide.webp';
import type { TherapeiaNav } from '../app/App';
import { settings } from '../app/state';

export default function WelcomePage({ nav }: { nav: TherapeiaNav }) {
  return (
    <Welcome
      name="Therapeia"
      mark={<AppMark app="therapeia" size={44} light />}
      line="Medicines and appointments."
      about="Doses at the times you set, or after waking and before sleep on any schedule. Refills, visits and what was taken."
      photo={photo}
      photoWide={photoWide}
      fine="Follow the directions you were given. Therapeia reminds and records; it gives no medical advice."
      onBegin={() => {
        settings.save({ ...settings.load(), started: true });
        nav.swap({ name: 'today' });
      }}
    />
  );
}
