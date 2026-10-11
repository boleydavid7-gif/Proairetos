import { Welcome } from '../../app/family/shell';
import { AppMark } from '../../app/family/icons';
import photo from '../../assets/images/scenes/ergon.webp';
import photoWide from '../../assets/images/scenes/ergon-wide.webp';
import type { ErgonNav } from '../app/App';
import { settings } from '../app/state';

export default function WelcomePage({ nav }: { nav: ErgonNav }) {
  return (
    <Welcome
      name="Ergon"
      mark={<AppMark app="ergon" size={44} light />}
      line="Household chores that come round."
      about="Each one counts from when it was last done. Share them with the people you live with."
      photo={photo}
      photoWide={photoWide}
      onBegin={() => {
        settings.save({ ...settings.load(), started: true });
        nav.swap({ name: 'today' });
      }}
    />
  );
}
