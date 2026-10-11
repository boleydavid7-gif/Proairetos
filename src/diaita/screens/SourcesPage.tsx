import { BackIcon } from '../../app/family/icons';
import type { DiaitaNav } from '../app/App';
import { SOURCES } from '../core/rhythm';

const TOPICS: { key: keyof typeof SOURCES; topic: string }[] = [
  { key: 'sleep', topic: 'Sleep length' },
  { key: 'caffeine', topic: 'Last caffeine' },
  { key: 'nap', topic: 'Naps before nights' },
  { key: 'light', topic: 'Light and sleep after nights' },
  { key: 'night-meals', topic: 'Eating on nights' },
  { key: 'hygiene', topic: 'Wind-down, meals and sleep after the last night' },
];

export default function SourcesPage({ nav }: { nav: DiaitaNav }) {
  return (
    <div className="page diaita-page">
      <div className="page-top">
        <button type="button" className="back-link" onClick={nav.back}><BackIcon size={18} />More</button>
      </div>
      <h1 className="title">Sources</h1>
      <ul className="rows diaita-sources">
        {TOPICS.map(({ key, topic }) => (
          <li key={key} className="diaita-source">
            <strong>{topic}</strong>
            <span className="muted">{SOURCES[key]}</span>
          </li>
        ))}
      </ul>
      <p className="hint">General information, not medical advice.</p>
    </div>
  );
}
