import { Welcome } from '../../app/family/shell';
import { AppMark } from '../../app/family/icons';
import photo from '../../assets/images/scenes/sunrise.webp';
import photoWide from '../../assets/images/scenes/sunrise-wide.webp';
import type { DiaitaNav } from '../app/App';
import { settings } from '../app/state';

export default function WelcomePage({ nav }: { nav: DiaitaNav }) {
  return (
    <Welcome
      name="Diaita"
      mark={<AppMark app="diaita" size={44} light />}
      line="Sleep, light, food and caffeine, planned around your days."
      about="Reads your schedule from Proairetos: days, evenings, nights or none."
      photo={photo}
      photoWide={photoWide}
      onBegin={() => {
        settings.save({ ...settings.load(), started: true });
        nav.swap({ name: 'today' });
      }}
    />
  );
}
