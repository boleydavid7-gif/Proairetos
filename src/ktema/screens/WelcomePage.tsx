import { Welcome } from '../../app/family/shell';
import { AppMark } from '../../app/family/icons';
import photo from '../../assets/images/scenes/ktema.webp';
import photoWide from '../../assets/images/scenes/ktema-wide.webp';
import type { KtemaNav } from '../app/App';
import { settings } from '../app/state';

export default function WelcomePage({ nav }: { nav: KtemaNav }) {
  return (
    <Welcome
      name="Ktema"
      mark={<AppMark app="ktema" size={44} light />}
      line="Home, car and belongings."
      about="Models, serial numbers, receipts and warranties, and the upkeep that comes around by date or by mileage."
      photo={photo}
      photoWide={photoWide}
      onBegin={() => {
        settings.save({ ...settings.load(), started: true });
        nav.swap({ name: 'today' });
        // The first step: a thing to begin with. Cancel or Save lands on Today.
        nav.go({ name: 'thing' });
      }}
    />
  );
}
