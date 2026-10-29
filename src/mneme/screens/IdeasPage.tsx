import { useEffect, useMemo, useState } from 'react';
import { ChevronIcon, PlusIcon } from '../../app/family/icons';
import { ideas, migrateLegacyIdeas, newId, type Idea, type IdeaStage } from '../app/state';

const stages: { id: IdeaStage; label: string; hint: string }[] = [
  { id: 'spark', label: 'New ideas', hint: 'Raw thoughts' },
  { id: 'shape', label: 'Developing', hint: 'Worth exploring' },
  { id: 'next', label: 'Next step', hint: 'Ready to act' },
  { id: 'parked', label: 'Later', hint: 'Keep for later' },
];

export default function IdeasPage() {
  const allIdeas = ideas.use();
  const [dump, setDump] = useState('');
  const [stage, setStage] = useState<IdeaStage | 'all'>('all');

  useEffect(() => { migrateLegacyIdeas(); }, []);

  const visible = useMemo(() => allIdeas
    .filter((idea) => stage === 'all' || idea.stage === stage)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [allIdeas, stage]);

  const addDump = () => {
    const thoughts = dump.split(/\n\s*\n|\n(?=\s*[-•])/).map((item) => item.replace(/^\s*[-•]\s*/, '').trim()).filter(Boolean);
    if (!thoughts.length) return;
    const now = new Date().toISOString();
    thoughts.forEach((text, index) => ideas.put({ id: newId('idea'), text, stage: 'spark', createdAt: now, updatedAt: new Date(Date.now() + index).toISOString() }));
    setDump('');
  };

  const move = (idea: Idea, next: IdeaStage) => ideas.put({ ...idea, stage: next, updatedAt: new Date().toISOString() });
  const remove = (idea: Idea) => ideas.remove(idea.id);

  return <main className="mneme-page mneme-ideas">
    <div className="mneme-header-actions-source" data-header-actions aria-hidden="true"><button type="button" aria-label="Focus idea dump" onClick={() => document.getElementById('mneme-idea-dump')?.focus()}><PlusIcon size={22} /></button></div>
    <div className="mneme-heading-row"><h1>Ideas</h1><span className="mneme-idea-total">{allIdeas.length}</span></div>
    <section className="mneme-idea-composer" aria-labelledby="idea-dump-title">
      <div className="mneme-idea-composer__heading"><span className="mneme-idea-action__mark">✦</span><span><strong id="idea-dump-title">Idea dump</strong></span></div>
      <textarea id="mneme-idea-dump" value={dump} onChange={(event) => setDump(event.target.value)} rows={5} />
      <button type="button" className="mneme-primary mneme-primary--wide" onClick={addDump} disabled={!dump.trim()}>Add to New ideas</button>
    </section>
    <section className="mneme-idea-desk" aria-label="Idea desk"><div className="mneme-idea-desk__heading"><strong>Sort your ideas</strong><span className="mneme-idea-desk__count">{visible.length}</span></div><div className="mneme-idea-stages"><button type="button" aria-selected={stage === 'all'} onClick={() => setStage('all')}>All<small>{allIdeas.length}</small></button>{stages.map((item) => <button type="button" key={item.id} aria-selected={stage === item.id} onClick={() => setStage(item.id)}>{item.label}<small>{allIdeas.filter((idea) => idea.stage === item.id).length}</small></button>)}</div></section>
    {visible.length ? <div className="mneme-idea-list">{visible.map((idea) => <IdeaCard key={idea.id} idea={idea} onMove={(next) => move(idea, next)} onRemove={() => remove(idea)} />)}</div> : null}
  </main>;
}

function IdeaCard({ idea, onMove, onRemove }: { idea: Idea; onMove: (stage: IdeaStage) => void; onRemove: () => void }) {
  const title = idea.text.split(/\n|[.!?](?:\s|$)/)[0].trim() || 'Untitled idea';
  const body = idea.text.slice(title.length).trim();
  return <article className="mneme-idea-card"><div className="mneme-idea-card__mark">✦</div><div className="mneme-idea-card__content"><strong>{title}</strong>{body && <p>{body}</p>}<div className="mneme-idea-card__actions"><select value={idea.stage} onChange={(event) => onMove(event.target.value as IdeaStage)} aria-label="Idea stage">{stages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><button type="button" onClick={onRemove}>Clear</button></div></div><ChevronIcon size={20} /></article>;
}
