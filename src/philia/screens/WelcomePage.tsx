import { Welcome } from '../../app/family/shell';
import { AppMark } from '../../app/family/icons';
import photo from '../../assets/images/scenes/philia.webp';
import photoWide from '../../assets/images/scenes/philia-wide.webp';
import type { PhiliaNav } from '../app/App';
import { settings } from '../app/state';

export default function WelcomePage({ nav }: { nav: PhiliaNav }) {
  return (
    <Welcome
      name="Philia"
      mark={<AppMark app="philia" size={44} light />}
      line="The people in your life."
      about="Birthdays, things to remember, gift ideas and time together."
      photo={photo}
      photoWide={photoWide}
      onBegin={() => {
        settings.save({ ...settings.load(), started: true });
        nav.swap({ name: 'home' });
      }}
    />
  );
}
