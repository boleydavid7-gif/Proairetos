import { Welcome } from '../../app/family/shell';
import { AppMark } from '../../app/family/icons';
import photo from '../../assets/images/scenes/melete-stoic.webp';
import photoWide from '../../assets/images/scenes/melete-stoic-wide.webp';
import type { MeleteNav } from '../app/App';
import { settings } from '../app/state';

export default function WelcomePage({ nav }: { nav: MeleteNav }) {
  return (
    <Welcome
      name="Meletē"
      mark={<AppMark app="melete" size={44} light />}
      line="Study time that fits your week."
      about="Add your subjects and their dates, see when you’re free, and schedule study time."
      photo={photo}
      photoWide={photoWide}
      onBegin={() => {
        settings.save({ ...settings.load(), started: true });
        nav.swap({ name: 'today' });
        nav.go({ name: 'subject' });
      }}
    />
  );
}
