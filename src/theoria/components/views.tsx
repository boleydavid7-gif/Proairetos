import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { statusLabel, type ReadingFont, type ReadingTheme, type TheoriaBook, type TheoriaHighlight, type TheoriaNote, type TheoriaReflection } from '../core/books';
import TheoriaMark from '../../components/brand/TheoriaMark';

export type InsightItem = { text: string; location?: string; book: TheoriaBook; kind: 'highlight' | 'note' | 'reflection'; createdAt: string };

export function Cover({ book, index = 0 }: { book: TheoriaBook; index?: number }) {
  return book.coverUrl
    ? <img className="theoria-cover" src={book.coverUrl} alt={`${book.title} cover`} />
    : <div className={`theoria-cover theoria-cover--${index % 4}`}><span>{book.title}</span><small>{book.author ?? 'Theoria edition'}</small></div>;
}

const dailyQuotes = [
  { quote: 'The happiness of your life depends upon the quality of your thoughts.', source: 'Marcus Aurelius · Meditations' },
  { quote: 'You yourself must strive. The Buddhas only point the way.', source: 'Dhammapada · 276' },
  { quote: 'The roots of education are bitter, but the fruit is sweet.', source: 'Aristotle · Nicomachean Ethics' },
  { quote: 'What we learn with pleasure we never forget.', source: 'Alfred Mercier' },
  { quote: 'The mind is everything. What you think you become.', source: 'Dhammapada · 1' },
];

function dailyQuote(date = new Date()) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return dailyQuotes[Math.abs(day) % dailyQuotes.length];
}

function greeting(name: string): string {
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${hello}, ${name}.` : `${hello}.`;
}

function EmptyState({ title, body, onAdd }: { title: string; body: string; onAdd: () => void }) {
  return <article className="theoria-empty-card"><TheoriaMark size={42} /><h2>{title}</h2><p>{body}</p><button type="button" className="theoria-primary-button" onClick={onAdd}>Add to library →</button></article>;
}

export function LibraryHome({ name, shelf, displayShelf, selected, onAdd, onOpen, onCapture, onNotes, onSearch, onDaily }: {
  name: string; shelf: readonly TheoriaBook[]; displayShelf: readonly TheoriaBook[]; selected: TheoriaBook;
  onAdd: () => void; onOpen: (book: TheoriaBook) => void; onCapture: () => void; onNotes: () => void; onSearch: () => void; onDaily: () => void;
}) {
  const quote = dailyQuote();
  const categories = ['Philosophy', 'Science', 'Psychology', 'History', 'Leadership', 'Personal'];
  const recent = shelf.flatMap((book) => [
    ...book.highlights.map((highlight) => ({ text: highlight.text, location: highlight.location, book, kind: 'highlight' as const, createdAt: highlight.createdAt })),
    ...book.notes.map((note) => ({ text: note.body, book, kind: 'note' as const, createdAt: note.createdAt })),
    ...book.reflections.map((reflection) => ({ text: reflection.content, book, kind: 'reflection' as const, createdAt: reflection.createdAt })),
  ]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  const isFeatured = selected.userId === 'featured';
  return <section className="theoria-view">
    <div className="theoria-heading"><div><p className="theoria-eyebrow">Library home</p><h1>{greeting(name)}</h1><p>A quieter mind leads to a deeper life.</p></div><div className="theoria-heading-actions"><button type="button" className="theoria-quiet-button" onClick={onSearch}>⌕ Search</button><button type="button" className="theoria-add-button" onClick={onAdd}>＋ Add to library</button></div></div>
    <div className="theoria-library-grid"><article className="theoria-card theoria-continue"><div className="theoria-card-kicker">{isFeatured ? 'A place to begin' : 'Continue reading'} <span>↗</span></div><div className="theoria-continue-body"><div><h2>{selected.title}</h2><p className="theoria-author">{selected.author}</p><p className="theoria-book-location">{selected.readingLocation ?? 'Book III · Reflection 12'}</p><div className="theoria-progress"><span style={{ width: `${selected.progress}%` }} /></div><small>{selected.progress}% complete</small><button type="button" className="theoria-primary-button" onClick={() => onOpen(selected)}>{isFeatured ? 'View the book' : 'Continue reading'} <span>→</span></button></div><Cover book={selected} index={0} /></div></article>
      <article className="theoria-card theoria-shelf-card"><div className="theoria-card-title"><div><p className="theoria-eyebrow">Your library</p><h2>{shelf.length ? `${shelf.length} ${shelf.length === 1 ? 'source' : 'sources'}` : 'A place for ideas'}</h2></div><button type="button" onClick={onAdd}>See all →</button></div><div className="theoria-category-row">{categories.map((category) => <button type="button" key={category}>{category}</button>)}</div><div className="theoria-shelf-grid">{displayShelf.slice(0, 4).map((book, index) => <button type="button" className={`theoria-shelf-item${book.id === selected.id ? ' is-selected' : ''}`} key={book.id} onClick={() => onOpen(book)}><Cover book={book} index={index} /><strong>{book.title}</strong><small>{book.author}</small><span><i style={{ width: `${book.progress}%` }} /></span></button>)}</div></article></div>
    <article className="theoria-daily-quote" onClick={onDaily}><div><p className="theoria-eyebrow">Today’s thought</p><span className="theoria-daily-quote-mark">“</span></div><div><p>{quote.quote}</p><small>{quote.source}</small></div><span className="theoria-daily-quote-date">Open →</span></article>
    <div className="theoria-section-heading"><div><p className="theoria-eyebrow">Recent insights</p><h2>What stayed with you.</h2></div><div className="theoria-section-actions"><button type="button" onClick={onCapture}>＋ Capture</button><button type="button" onClick={onNotes}>See all →</button></div></div>
    {recent.length ? <div className="theoria-insight-grid">{recent.map((item) => <InsightRow item={item} key={`${item.book.id}-${item.createdAt}-${item.text}`} />)}</div> : <div className="theoria-home-empty"><p>Highlights, notes, and reflections will gather here.</p><button type="button" onClick={onCapture}>Capture an idea →</button></div>}
  </section>;
}

function InsightRow({ item }: { item: InsightItem }) {
  return <article className={`theoria-insight theoria-insight--${item.kind}`}><span>{item.kind === 'highlight' ? '“' : item.kind === 'note' ? '✎' : '✦'}</span><div><p>{item.text}</p><small>{item.book.title}{item.location ? ` · ${item.location}` : ''}</small></div><button type="button" aria-label="Open insight">…</button></article>;
}

export function BookDetailView({ book, onBack, onRead, onExternal, onCapture }: { book: TheoriaBook; onBack: () => void; onRead: () => void; onExternal: () => void; onCapture: () => void }) {
  const [tab, setTab] = useState<'about' | 'highlights' | 'notes' | 'reflections'>('about');
  return <section className="theoria-detail-view"><button type="button" className="theoria-back-button" onClick={onBack}>← Library</button><div className="theoria-book-detail"><div className="theoria-detail-cover"><Cover book={book} index={1} /></div><div className="theoria-detail-copy"><p className="theoria-eyebrow">{statusLabel(book.status)} · {book.categories.join(' · ')}</p><h1>{book.title}</h1><p className="theoria-detail-author">{book.author ?? 'Unknown author'}</p><p className="theoria-detail-description">{book.description ?? 'A source waiting for your attention and the ideas you will keep.'}</p><div className="theoria-detail-actions"><button type="button" className="theoria-primary-button" onClick={onRead}>▣ Continue reading</button>{book.sourceUrl && <button type="button" className="theoria-secondary-button" onClick={onExternal}>Open original ↗</button>}</div><div className="theoria-detail-meta"><span><strong>{book.highlights.length}</strong>Highlights</span><span><strong>{book.notes.length}</strong>Notes</span><span><strong>{book.ideas.length}</strong>Ideas</span><span><strong>{book.connections.length}</strong>Connections</span></div></div></div><div className="theoria-detail-tabs">{(['about', 'highlights', 'notes', 'reflections'] as const).map((item) => <button type="button" key={item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div>{tab === 'about' && <div className="theoria-detail-about"><p>{book.description ?? 'The book information will grow as you add your own notes, passages, and connections.'}</p><div><span>Publisher <strong>{book.publisher ?? '—'}</strong></span><span>Language <strong>{book.language ?? 'English'}</strong></span><span>Source <strong>{book.source === 'cloud' ? 'Cloud link' : book.source}</strong></span></div><button type="button" onClick={onCapture}>＋ Add an insight</button></div>}{tab === 'highlights' && <InsightList items={book.highlights.map((item) => ({ text: item.text, location: item.location, book, kind: 'highlight', createdAt: item.createdAt }))} empty="Your saved passages will appear here." onAdd={onCapture} />}{tab === 'notes' && <InsightList items={book.notes.map((item) => ({ text: item.body, book, kind: 'note', createdAt: item.createdAt }))} empty="Your notes beside this book will appear here." onAdd={onCapture} />}{tab === 'reflections' && <InsightList items={book.reflections.map((item) => ({ text: item.content, book, kind: 'reflection', createdAt: item.createdAt }))} empty="Your reflections on this book will appear here." onAdd={onCapture} />}</section>;
}

function InsightList({ items, empty, onAdd }: { items: InsightItem[]; empty: string; onAdd: () => void }) {
  return items.length ? <div className="theoria-insight-grid theoria-detail-list">{items.map((item) => <InsightRow item={item} key={`${item.book.id}-${item.createdAt}-${item.text}`} />)}</div> : <div className="theoria-home-empty"><p>{empty}</p><button type="button" onClick={onAdd}>＋ Add one</button></div>;
}

export function ReaderView({ book, theme, font, onTheme, onFont, onBack, onProgress, onCapture, onExternal }: { book: TheoriaBook; theme: ReadingTheme; font: ReadingFont; onTheme: (theme: ReadingTheme) => void; onFont: (font: ReadingFont) => void; onBack: () => void; onProgress: (progress: number) => void; onCapture: () => void; onExternal: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const paragraphs = (book.contentPreview ?? '').split(/\n{2,}/).map((item) => item.trim()).filter(Boolean).slice(0, 4);
  const passage = paragraphs[0] ?? (book.title === 'Meditations' ? 'You have power over your mind — not outside events. Realize this, and you will find strength.' : 'The work of understanding begins with a line we are willing to read twice.');
  return <section className={`theoria-reader theoria-reader--${theme} theoria-reader-font--${font}`}><header className="theoria-reader-header"><button type="button" onClick={onBack}>←</button><div><strong>{book.title}</strong><small>{book.readingLocation ?? 'Reading'}</small></div><div><button type="button" aria-label="Search in book">⌕</button><button type="button" aria-label="Reader settings" onClick={() => setMenuOpen((open) => !open)}>Aa</button><button type="button" aria-label="More options">⋮</button></div></header>{menuOpen && <div className="theoria-reader-menu"><p className="theoria-eyebrow">Reading settings</p><label>Theme <select value={theme} onChange={(event) => onTheme(event.target.value as ReadingTheme)}><option value="paper">Paper</option><option value="night">Night</option><option value="sepia">Sepia</option></select></label><label>Font <select value={font} onChange={(event) => onFont(event.target.value as ReadingFont)}><option value="serif">Literata (Serif)</option><option value="sans">Inter (Sans)</option><option value="dyslexia">Dyslexia-friendly</option></select></label><button type="button" onClick={onCapture}>＋ Highlight or note</button></div>}<article className="theoria-reader-page"><p className="theoria-reader-chapter">{book.readingLocation ?? '12'}</p><h1>{passage}</h1>{paragraphs.slice(1).map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}{!paragraphs.length && <p>If you are distressed by anything external, the pain is not due to the thing itself, but to your estimate of it; and this you have the power to revoke at any moment.</p>}<blockquote onClick={onCapture}>The impediment to action advances action. What stands in the way becomes the way.</blockquote><p>Read slowly. Notice what changes when the line meets your own life.</p></article><footer className="theoria-reader-footer"><button type="button">‹</button><input type="range" min="0" max="100" value={book.progress} onChange={(event) => onProgress(Number(event.target.value))} aria-label="Reading progress" /><span>{book.progress}%</span><button type="button">›</button><button type="button" onClick={onExternal}>Open source ↗</button></footer></section>;
}

export function NotesPage({ notes, highlights, reflections, shelf, onAdd, onCapture }: { notes: InsightItem[]; highlights: InsightItem[]; reflections: InsightItem[]; shelf: readonly TheoriaBook[]; onAdd: () => void; onCapture: () => void }) {
  const [tab, setTab] = useState<'all' | 'books' | 'ideas'>('all');
  const items = tab === 'all' ? [...notes, ...highlights, ...reflections].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : tab === 'books' ? [...highlights, ...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : reflections;
  return <section className="theoria-view"><div className="theoria-heading"><div><p className="theoria-eyebrow">Notes</p><h1>Keep the margin.</h1><p>Passages, thoughts, and reflections kept beside the sources that prompted them.</p></div><button type="button" className="theoria-add-button" onClick={shelf.length ? onCapture : onAdd}>＋ {shelf.length ? 'New reflection' : 'Add a source'}</button></div><div className="theoria-page-tabs">{[['all', 'All'], ['books', 'By book'], ['ideas', 'My ideas']].map(([id, label]) => <button type="button" className={tab === id ? 'is-active' : ''} key={id} onClick={() => setTab(id as typeof tab)}>{label}</button>)}</div>{items.length ? <div className="theoria-notes-list">{items.map((item) => <InsightRow item={item} key={`${item.book.id}-${item.createdAt}-${item.text}`} />)}</div> : <EmptyState title="Your notes will live here." body="Add a book or capture a thought beside something you are reading." onAdd={onAdd} />}</section>;
}

export function ConnectionsPage({ shelf, onAdd }: { shelf: readonly TheoriaBook[]; onAdd: () => void }) {
  const names = shelf.length ? shelf.slice(0, 4) : [];
  return <section className="theoria-view"><div className="theoria-heading"><div><p className="theoria-eyebrow">Connections</p><h1>Ideas in relation.</h1><p>See the threads running between what you read and what you reflect on.</p></div><button type="button" className="theoria-add-button" onClick={onAdd}>＋ Link idea</button></div><div className="theoria-connection-layout"><article className="theoria-card theoria-connections"><div className="theoria-orbit theoria-orbit--one"><span>Self-knowledge</span><small>{names[0]?.title ?? 'Meditations'}</small></div><div className="theoria-orbit theoria-orbit--two"><span>Freedom</span><small>{names[1]?.title ?? 'The Republic'}</small></div><div className="theoria-orbit theoria-orbit--three"><span>Stoicism</span><small>{names[2]?.title ?? 'Seneca'}</small></div><div className="theoria-orbit theoria-orbit--four"><span>Personal reflection</span><small>{names[3]?.title ?? 'Your notes'}</small></div><div className="theoria-connection-core">Discipline</div><div className="theoria-connection-lines" /></article><aside className="theoria-connection-list"><p className="theoria-eyebrow">Connected ideas</p><h2>What keeps returning.</h2>{['Discipline · Freedom', 'Stoicism · Self-control', 'Personal reflection · Growth'].map((line) => <button type="button" key={line}><span>⌘</span>{line}<small>related</small></button>)}</aside></div></section>;
}

export function StudyPathsPage({ shelf, onAdd, onOpen }: { shelf: readonly TheoriaBook[]; onAdd: () => void; onOpen: (book: TheoriaBook) => void }) {
  const paths = [{ title: 'Stoic Foundations', detail: 'Meditations, Seneca, Epictetus', color: 'gold' }, { title: 'Leadership', detail: 'Character, responsibility, and clear action', color: 'violet' }, { title: 'Human Nature', detail: 'Psychology, behavior, and meaning', color: 'blue' }];
  return <section className="theoria-view"><div className="theoria-heading"><div><p className="theoria-eyebrow">Study paths</p><h1>Follow a question.</h1><p>Organize a few books around an idea you want to understand over time.</p></div><button type="button" className="theoria-add-button" onClick={onAdd}>＋ New path</button></div><div className="theoria-path-grid">{paths.map((path, index) => <article className={`theoria-path-card theoria-path-card--${path.color}`} key={path.title}><Cover book={shelf[index] ?? ({ id: path.title, userId: 'featured', title: path.title, author: path.detail, source: 'manual', categories: ['Personal'], progress: 0, status: 'want_to_read', chapters: [], highlights: [], notes: [], reflections: [], bookmarks: [], ideas: [], connections: [], createdAt: '', updatedAt: '' } as TheoriaBook)} index={index} /><div><p className="theoria-eyebrow">Study path</p><h2>{path.title}</h2><p>{path.detail}</p><button type="button" onClick={() => shelf[index] && onOpen(shelf[index])}>Open path →</button></div></article>)}</div></section>;
}

export function SearchPage({ shelf, onOpen }: { shelf: readonly TheoriaBook[]; onOpen: (book: TheoriaBook) => void }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => { const needle = query.trim().toLowerCase(); if (!needle) return []; return shelf.flatMap((book) => [{ kind: 'Book', text: `${book.title} · ${book.author ?? 'Unknown author'}`, book }, ...book.highlights.filter((item) => item.text.toLowerCase().includes(needle)).map((item) => ({ kind: 'Highlight', text: item.text, book })), ...book.notes.filter((item) => item.body.toLowerCase().includes(needle)).map((item) => ({ kind: 'Note', text: item.body, book }))]); }, [query, shelf]);
  return <section className="theoria-view"><div className="theoria-heading"><div><p className="theoria-eyebrow">Search</p><h1>Find what you kept.</h1><p>Search books, highlights, notes, and reflections in your library.</p></div></div><input className="theoria-global-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your library…" autoFocus />{query && <div className="theoria-search-results">{results.length ? results.map((result, index) => <button type="button" key={`${result.book.id}-${index}`} onClick={() => onOpen(result.book)}><span>{result.kind}</span><strong>{result.text}</strong><small>{result.book.title}</small></button>) : <p>No saved passages match that search.</p>}</div>}</section>;
}

export function ProfilePage({ name, syncPhase, onSettings }: { name: string; syncPhase: string; onSettings: () => void }) {
  return <section className="theoria-view"><div className="theoria-heading"><div><p className="theoria-eyebrow">Profile</p><h1>Your archive.</h1><p>Theoria is part of the Proairetos family, with one account and one place for your data controls.</p></div></div><div className="theoria-profile-card"><span className="theoria-profile-avatar">{(name || 'D').slice(0, 1).toUpperCase()}</span><div><h2>{name || 'David'}</h2><p>Personal library · {syncPhase === 'ready' ? 'Synced with Proairetos' : 'On this device'}</p></div><button type="button" onClick={onSettings}>Settings →</button></div><div className="theoria-profile-grid"><article><p className="theoria-eyebrow">Your approach</p><h2>Read slowly.</h2><p>Keep the ideas that change the way you see.</p></article><article><p className="theoria-eyebrow">Your data</p><h2>Private by design.</h2><p>Export, restore, and manage your library from the shared Proairetos account.</p></article></div></section>;
}

export function SettingsPage({ theme, font, onTheme, onFont }: { theme: ReadingTheme; font: ReadingFont; onTheme: (value: ReadingTheme) => void; onFont: (value: ReadingFont) => void }) {
  return <section className="theoria-view"><div className="theoria-heading"><div><p className="theoria-eyebrow">Settings</p><h1>Make room for reading.</h1><p>Choose the atmosphere and type that help you stay with a page.</p></div></div><div className="theoria-settings-list"><label><span>Reading theme</span><select value={theme} onChange={(event) => onTheme(event.target.value as ReadingTheme)}><option value="paper">Paper</option><option value="night">Night</option><option value="sepia">Sepia</option></select></label><label><span>Reading font</span><select value={font} onChange={(event) => onFont(event.target.value as ReadingFont)}><option value="serif">Literata (Serif)</option><option value="sans">Inter (Sans)</option><option value="dyslexia">Dyslexia-friendly</option></select></label><button type="button"><span>Account</span><small>Profile, security, export</small><b>→</b></button><button type="button"><span>Privacy</span><small>Data controls</small><b>→</b></button></div></section>;
}

export function DailyWisdomPage({ onBack, onCapture }: { onBack: () => void; onCapture: () => void }) {
  const quote = dailyQuote();
  return <section className="theoria-view theoria-daily-page"><button type="button" className="theoria-back-button" onClick={onBack}>← Library</button><p className="theoria-eyebrow">Today’s thought</p><h1>A line to sit with.</h1><article className="theoria-wisdom-card"><p>“{quote.quote}”</p><small>{quote.source}</small></article><label>What does this mean to you?<textarea placeholder="A reflection, if one comes…" /><button type="button" className="theoria-primary-button" onClick={onCapture}>Save reflection</button></label></section>;
}

export function buildInsightItems(shelf: readonly TheoriaBook[]) {
  const highlights: InsightItem[] = [];
  const notes: InsightItem[] = [];
  const reflections: InsightItem[] = [];
  shelf.forEach((book) => {
    book.highlights.forEach((item: TheoriaHighlight) => highlights.push({ text: item.text, location: item.location, book, kind: 'highlight', createdAt: item.createdAt }));
    book.notes.forEach((item: TheoriaNote) => notes.push({ text: item.body, book, kind: 'note', createdAt: item.createdAt }));
    book.reflections.forEach((item: TheoriaReflection) => reflections.push({ text: item.content, book, kind: 'reflection', createdAt: item.createdAt }));
  });
  return { highlights, notes, reflections };
}

export type ViewNode = ReactNode;
