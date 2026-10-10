import { useState } from 'react';
import type { Nav } from '../app/App';
import { ChevronIcon, KeyIcon } from '../app/icons';
import { BackLink, Brand, Segmented } from '../app/ui';
import { article, articles, categories, type Article, type Category } from '../core/learn';

type Filter = 'all' | Category;

/** Its place in the whole set, as "01". */
const number = (item: Article) => String(articles.indexOf(item) + 1).padStart(2, '0');

function Contents({ items, nav }: { items: Article[]; nav: Nav }) {
  return (
    <ol className="contents">
      {items.map((item) => (
        <li key={item.id}>
          <button type="button" className="contents__row" onClick={() => nav.go({ name: 'article', id: item.id })}>
            <span className="contents__number" aria-hidden="true">
              {number(item)}
            </span>
            <span className="contents__text">
              <span className="contents__title">{item.title}</span>
              <span className="contents__line">{item.line}</span>
            </span>
            <span className="contents__time">{item.minutes} min</span>
            <ChevronIcon size={16} />
          </button>
        </li>
      ))}
    </ol>
  );
}

/** Short reads, as a table of contents by topic. */
export default function LearnPage({ nav }: { nav: Nav }) {
  const [filter, setFilter] = useState<Filter>('all');
  const topics = (Object.keys(categories) as Category[]).filter((id) => filter === 'all' || id === filter);
  return (
    <div className="page learn">
      <Brand />
      <h1 className="title">Learn</h1>
      <Segmented
        label="Topic"
        value={filter}
        options={[{ id: 'all', label: 'All' }, ...(Object.keys(categories) as Category[]).map((id) => ({ id, label: categories[id] }))]}
        onChange={setFilter}
        small
      />
      {topics.map((topic) => (
        <section key={topic} className="learn__topic" aria-label={categories[topic]}>
          {filter === 'all' && <h2 className="card__eyebrow learn__heading">{categories[topic]}</h2>}
          <Contents items={articles.filter((item) => item.category === topic)} nav={nav} />
        </section>
      ))}
    </div>
  );
}

export function ArticlePage({ nav, id }: { nav: Nav; id: string }) {
  const item = article(id);
  if (!item)
    return (
      <div className="page">
        <BackLink label="Learn" onBack={nav.back} />
      </div>
    );
  const index = articles.indexOf(item);
  const next = articles[index + 1];
  return (
    <article className="page reading">
      <BackLink label="Learn" onBack={nav.back} />
      <header className="reading__head">
        <p className="card__eyebrow">
          {number(item)} · {categories[item.category]} · {item.minutes} min read
        </p>
        <h1 className="title">{item.title}</h1>
        <p className="reading__lead">{item.line}</p>
      </header>
      {item.sections.map((section, i) => (
        <section key={i} className="reading__section">
          {section.heading && <h2 className="reading__heading">{section.heading}</h2>}
          <p>{section.text}</p>
        </section>
      ))}
      <aside className="card takeaway">
        <KeyIcon size={22} />
        <div>
          <h2 className="card__title card__title--small">Key takeaway</h2>
          <p>{item.takeaway}</p>
        </div>
      </aside>
      <section className="sources">
        <h2 className="label">Sources</h2>
        <ol>
          {item.sources.map((source) => (
            <li key={source}>{source}</li>
          ))}
        </ol>
      </section>
      {next && (
        <button type="button" className="card card--link" onClick={() => nav.swap({ name: 'article', id: next.id })}>
          <span className="card__eyebrow">Next · {number(next)}</span>
          <span className="card__title card__title--small">{next.title}</span>
        </button>
      )}
    </article>
  );
}
