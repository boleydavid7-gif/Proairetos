import { useState, useSyncExternalStore, type FormEvent } from 'react';
import type { LifeItem } from '../core/life-items/types';
import { tap } from '../app/feel';
import { answer, cardsFromText, CARDS_SOURCE, newCard, nextDay, ready, type Card } from './cards';

/*
 * The cards live in one setting, `proairetos.praxisCards`, so they go with the person's backups and (sealed)
 * to their other devices like any other setting.
 */
const KEY = 'proairetos.praxisCards';
const listeners = new Set<() => void>();
let cache: { raw: string | null; cards: Card[] } = { raw: null, cards: [] };

function readCards(): Card[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cache.cards;
  }
  if (raw === cache.raw) return cache.cards;
  try {
    cache = { raw, cards: raw ? (JSON.parse(raw) as Card[]) : [] };
  } catch {
    cache = { raw, cards: [] };
  }
  return cache.cards;
}
function saveCards(cards: Card[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cards));
  } catch {
    // Storage full: the change shows until the page closes.
  }
  for (const listener of listeners) listener();
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => event.key === KEY && listener();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
};
export const useCards = () => useSyncExternalStore(subscribe, readCards);
export const cardsReady = (today: string) => ready(readCards(), today).length;

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const dayLabel = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

export function CardsView({ blocks, today, say }: { blocks: LifeItem[]; today: string; say: (message: string, undo?: () => void) => void }) {
  const cards = useCards();
  const [blockId, setBlockId] = useState<string>('');
  const [sitting, setSitting] = useState<string[]>();
  const [shown, setShown] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [many, setMany] = useState(false);
  const [lines, setLines] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const filter = blockId || undefined;
  const withCards = blocks.filter((block) => cards.some((card) => card.blockId === block.id));
  const readyNow = ready(cards, today, filter);
  const current = sitting && cards.find((card) => card.id === sitting[0]);

  const begin = () => {
    setSitting(readyNow.map((card) => card.id));
    setShown(false);
  };
  const respond = (knew: boolean) => {
    if (!current || !sitting) return;
    if (knew) tap();
    const before = cards;
    saveCards(cards.map((card) => (card.id === current.id ? answer(card, knew, today) : card)));
    const rest = sitting.slice(1);
    setSitting(rest.length ? rest : undefined);
    setShown(false);
    if (!rest.length) say('Done for now', () => saveCards(before));
  };
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (many) {
      const pairs = cardsFromText(lines);
      if (!pairs.length) return;
      saveCards([...cards, ...pairs.map((pair) => newCard(pair.front, pair.back, today, newId(), filter))]);
      say(`${pairs.length} ${pairs.length === 1 ? 'card' : 'cards'} added`, () => saveCards(cards));
      setLines('');
      return;
    }
    if (!front.trim() || !back.trim()) return;
    saveCards([...cards, newCard(front, back, today, newId(), filter)]);
    setFront('');
    setBack('');
  };
  const remove = (card: Card) => {
    saveCards(cards.filter((each) => each.id !== card.id));
    say('Card removed', () => saveCards(cards));
  };
  const titleOf = (id?: string) => blocks.find((block) => block.id === id)?.title;
  const next = nextDay(cards, today, filter);
  const listed = cards.filter((card) => !filter || card.blockId === filter);

  return (
    <section className="praxis-view">
      <div className="praxis-page-heading"><div><p className="praxis-eyebrow">Recall</p><h1>Cards</h1></div></div>
      {withCards.length > 0 && (
        <div className="praxis-chips" role="group" aria-label="Which cards">
          <button type="button" className="praxis-chip" aria-pressed={!blockId} onClick={() => setBlockId('')}>All</button>
          {withCards.map((block) => (
            <button key={block.id} type="button" className="praxis-chip" aria-pressed={blockId === block.id} onClick={() => setBlockId(block.id)}>{block.title}</button>
          ))}
        </div>
      )}

      <article className="praxis-card praxis-wide-card praxis-recall">
        {current ? (
          <>
            <p className="praxis-eyebrow">{titleOf(current.blockId) ?? 'Card'}</p>
            <h2 className="praxis-recall__front">{current.front}</h2>
            {shown ? (
              <>
                <p className="praxis-recall__back">{current.back}</p>
                <div className="praxis-recall__answers">
                  <button type="button" className="praxis-button praxis-button--quiet" onClick={() => respond(false)}>Again</button>
                  <button type="button" className="praxis-button" onClick={() => respond(true)}>Knew it</button>
                </div>
              </>
            ) : (
              <button type="button" className="praxis-button" onClick={() => setShown(true)}>Show the answer</button>
            )}
            <button type="button" className="praxis-text-button" onClick={() => setSitting(undefined)}>Stop here</button>
          </>
        ) : readyNow.length > 0 ? (
          <>
            <h2>{readyNow.length === 1 ? 'One card is ready' : `${readyNow.length} cards are ready`}</h2>
            <button type="button" className="praxis-button" onClick={begin}>Look at them</button>
          </>
        ) : (
          <p className="praxis-empty">{listed.length === 0 ? 'Add a question and its answer below.' : next ? `The next ones come round on ${dayLabel(next)}.` : 'Nothing ready.'}</p>
        )}
      </article>

      <form className="praxis-card praxis-wide-card praxis-card-form" onSubmit={add}>
        <div className="praxis-card-heading">
          <p className="praxis-eyebrow">New card{filter ? ` · ${titleOf(filter)}` : ''}</p>
          <button type="button" className="praxis-text-button" onClick={() => setMany(!many)}>{many ? 'One at a time' : 'Several at once'}</button>
        </div>
        {many ? (
          <label><span>One per line: question :: answer</span><textarea rows={5} value={lines} onChange={(event) => setLines(event.target.value)} placeholder={'Aorta :: the largest artery\nCapital of Peru :: Lima'} /></label>
        ) : (
          <>
            <label><span>Question</span><input value={front} maxLength={300} onChange={(event) => setFront(event.target.value)} /></label>
            <label><span>Answer</span><textarea rows={2} value={back} maxLength={600} onChange={(event) => setBack(event.target.value)} /></label>
          </>
        )}
        <button type="submit" className="praxis-button praxis-button--quiet" disabled={many ? !lines.trim() : !front.trim() || !back.trim()}>Add</button>
      </form>

      {listed.length > 0 && (
        <article className="praxis-card praxis-wide-card">
          <button type="button" className="praxis-text-button" aria-expanded={listOpen} onClick={() => setListOpen(!listOpen)}>
            {listOpen ? 'Hide the cards' : 'See the cards'}
          </button>
          {listOpen && (
            <ul className="praxis-card-list">
              {listed.map((card) => (
                <li key={card.id}>
                  <span><strong>{card.front}</strong><small>{card.back}</small><small>Next: {card.due <= today ? 'ready' : dayLabel(card.due)}</small></span>
                  <button type="button" className="praxis-text-button" aria-label={`Remove ${card.front}`} onClick={() => remove(card)}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </article>
      )}
      <p className="praxis-source">{CARDS_SOURCE}</p>
    </section>
  );
}
