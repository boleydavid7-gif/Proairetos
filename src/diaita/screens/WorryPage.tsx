import { useEffect, useState } from 'react';
import { BackIcon, PlusIcon } from '../../app/family/icons';
import { offerUndo } from '../../app/family/shell';
import { kindOf } from '../../core/life-items/kinds';
import type { LifeItem } from '../../core/life-items/types';
import type { DiaitaNav } from '../app/App';
import { worries } from '../app/state';

/*
 * Worry time writes into Proairetos: each worry is a Concern capture there, so there is one place for what is on
 * the person's mind (Capture, Today's chips, Think it through, search), not a second list here. The services load
 * only on this page. Worries written here before move over once and leave Diaita's own list.
 */
type Life = typeof import('../../app/services')['lifeService'];

let movedOnce = false;

async function moveOldWorries(life: Life): Promise<void> {
  if (movedOnce) return;
  movedOnce = true;
  for (const worry of worries.list()) {
    await life.add(worry.concern, 'CONCERN', { source: 'CAPTURE', notes: worry.nextStep ? `Next: ${worry.nextStep}` : undefined });
    worries.remove(worry.id);
  }
}

function useConcerns(): { life?: Life; concerns: LifeItem[] } {
  const [life, setLife] = useState<Life>();
  const [concerns, setConcerns] = useState<LifeItem[]>([]);
  useEffect(() => {
    let live = true;
    let stop = () => undefined as void;
    void import('../../app/services').then(async ({ lifeService }) => {
      await moveOldWorries(lifeService).catch(() => undefined);
      const read = async () => {
        const all = await lifeService.list();
        if (live) setConcerns(all.filter((item) => item.status === 'OPEN' && kindOf(item) === 'CONCERN').sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      };
      if (!live) return;
      setLife(lifeService);
      stop = lifeService.subscribe(() => void read());
      await read();
    });
    return () => {
      live = false;
      stop();
    };
  }, []);
  return { life, concerns };
}

function WorryForm({ life, onDone }: { life: Life; onDone: () => void }) {
  const [concern, setConcern] = useState('');
  const [nextStep, setNextStep] = useState('');
  const save = async () => {
    const item = await life.add(concern.trim(), 'CONCERN', { source: 'CAPTURE', notes: nextStep.trim() ? `Next: ${nextStep.trim()}` : undefined });
    offerUndo(`“${item.title}” added`, async () => {
      await life.deleteItem(item.id);
    });
    onDone();
  };
  return (
    <section className="card diaita-worry-form">
      <label className="field">
        <span className="field__label">What is on your mind?</span>
        <textarea className="input" rows={3} value={concern} onChange={(event) => setConcern(event.target.value)} autoFocus />
      </label>
      <label className="field">
        <span className="field__label">One next step (optional)</span>
        <input className="input" value={nextStep} onChange={(event) => setNextStep(event.target.value)} />
      </label>
      <div className="button-row">
        <button type="button" className="button-quiet" onClick={onDone}>Cancel</button>
        <button type="button" className="button-main" disabled={!concern.trim()} onClick={() => void save()}>Save</button>
      </div>
    </section>
  );
}

function WorryRow({ life, item }: { life: Life; item: LifeItem }) {
  const remove = async () => {
    const { undo } = await life.deleteItem(item.id);
    offerUndo(`“${item.title}” removed`, undo);
  };
  return (
    <li className="row diaita-worry-row">
      <span className="row__text"><span>{item.title}</span>{item.notes && <span className="row__detail">{item.notes}</span>}</span>
      <a className="text-link" href={`/?open=think-through&text=${encodeURIComponent(item.title)}`}>Think it through</a>
      <button type="button" className="text-link" onClick={() => void remove()}>Remove</button>
    </li>
  );
}

export default function WorryPage({ nav }: { nav: DiaitaNav }) {
  const { life, concerns } = useConcerns();
  const [adding, setAdding] = useState(false);
  return (
    <div className="page diaita-page">
      <div className="page-top">
        <button type="button" className="back-link" onClick={nav.back}><BackIcon size={18} />Back</button>
        <h1 className="title">Worry time</h1>
      </div>
      {life && !adding && <button type="button" className="button-main" onClick={() => setAdding(true)}><PlusIcon size={18} />Add a worry</button>}
      {life && adding && <WorryForm life={life} onDone={() => setAdding(false)} />}
      {life && concerns.length > 0 && <ul className="rows diaita-worry-list">{concerns.map((item) => <WorryRow key={item.id} life={life} item={item} />)}</ul>}
      <a className="text-link" href="/capture">Concerns in Proairetos</a>
    </div>
  );
}
