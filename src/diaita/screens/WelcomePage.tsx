import { Welcome } from '../../app/family/shell';
import { AppMark } from '../../app/family/icons';
import photo from '../../assets/images/scenes/diaita-stoic.webp';
import photoWide from '../../assets/images/scenes/diaita-stoic-wide.webp';
import type { DiaitaNav } from '../app/App';
import { settings } from '../app/state';

export default function WelcomePage({ nav }: { nav: DiaitaNav }) {
  return (
    <Welcome
      name="Diaita"
      mark={<AppMark app="diaita" size={44} light />}
      line="Sleep, light, food and caffeine."
      about="Planned around your schedule in Proairetos: days, evenings, nights or none."
      photo={photo}
      photoWide={photoWide}
      onBegin={() => {
        settings.save({ ...settings.load(), started: true });
        nav.swap({ name: 'today' });
      }}
    />
  );
}
