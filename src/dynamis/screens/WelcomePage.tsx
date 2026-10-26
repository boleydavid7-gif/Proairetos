import { Welcome } from '../../app/family/shell';
import { AppMark } from '../../app/family/icons';
import photo from '../../assets/images/scenes/dynamis-stoic.webp';
import photoWide from '../../assets/images/scenes/dynamis-stoic-wide.webp';
import type { DynamisNav } from '../app/App';
import { settings } from '../app/state';

export default function WelcomePage({ nav }: { nav: DynamisNav }) {
  return (
    <Welcome
      name="Dynamis"
      mark={<AppMark app="dynamis" size={44} light />}
      line="Strength and mobility."
      about="Full-body sessions at a gym, at home or with no equipment. Every set logged."
      photo={photo}
      photoWide={photoWide}
      onBegin={() => {
        settings.save({ ...settings.load(), started: true });
        nav.swap({ name: 'plan' });
      }}
    />
  );
}
