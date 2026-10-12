import { Welcome } from '../../app/family/shell';
import { AppMark } from '../../app/family/icons';
import photo from '../../assets/images/scenes/phyton.webp';
import photoWide from '../../assets/images/scenes/phyton-wide.webp';
import type { PhytonNav } from '../app/App';
import { settings } from '../app/state';

export default function WelcomePage({ nav }: { nav: PhytonNav }) {
  return (
    <Welcome
      name="Phyton"
      mark={<AppMark app="phyton" size={44} light />}
      line="Your plants, and when to look at them."
      about="Each plant comes round to be checked. Touch the soil, mark Watered or Still moist, and the days between follow what it needs."
      photo={photo}
      photoWide={photoWide}
      onBegin={() => {
        settings.save({ ...settings.load(), started: true });
        nav.swap({ name: 'today' });
      }}
    />
  );
}
