import { Welcome } from '../../app/family/shell';
import { AppMark } from '../../app/family/icons';
import photo from '../../assets/images/scenes/phyton-stoic.webp';
import photoWide from '../../assets/images/scenes/phyton-stoic-wide.webp';
import type { PhytonNav } from '../app/App';
import { settings } from '../app/state';

export default function WelcomePage({ nav }: { nav: PhytonNav }) {
  return (
    <Welcome
      name="Phyton"
      mark={<AppMark app="phyton" size={44} light />}
      line="Plants, and when to check them."
      about="Check soil moisture and log watering. Reminders follow each plant’s needs."
      photo={photo}
      photoWide={photoWide}
      onBegin={() => {
        settings.save({ ...settings.load(), started: true });
        nav.swap({ name: 'today' });
      }}
    />
  );
}
