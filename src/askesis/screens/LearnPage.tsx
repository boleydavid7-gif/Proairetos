import { useState } from 'react';
import type { Nav } from '../app/App';
import { ChevronIcon, ClockIcon, KeyIcon } from '../app/icons';
import { scene } from '../app/scenes';
import { BackLink, Brand, Hero, Segmented } from '../app/ui';
import { article, articles, categories, type Category } from '../core/learn';

type Filter = 'all' | Category;

export default function LearnPage({ nav }: { nav: Nav }) {
  const [filter, setFilter] = useState<Filter>('all');
  const shown = articles.filter((item) => filter === 'all' || item.category === filter);
  return (
    <div className="page">
      <Brand />
      <h1 className="title">Learn</h1>
      <p className="lead">Understand your body. Train with purpose. Every piece names its sources.</p>
      <Segmented
        label="Topic"
        value={filter}
        options={[{ id: 'all', label: 'All' }, ...(Object.keys(categories) as Category[]).map((id) => ({ id, label: categories[id] }))]}
        onChange={setFilter}
        small
      />
      <ul className="articles">
        {shown.map((item) => (
          <li key={item.id}>
            <button type="button" className="article-row" onClick={() => nav.go({ name: 'article', id: item.id })}>
              <img src={scene(item.scene)} alt="" className="article-row__image" />
              <span className="article-row__text">
                <span className="article-row__title">{item.title}</span>
                <span className="article-row__line">{item.line}</span>
                <span className="article-row__time">
                  <ClockIcon size={14} /> {item.minutes} min
                </span>
              </span>
              <ChevronIcon size={18} />
            </button>
          </li>
        ))}
      </ul>
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
    <article className="reading">
      <Hero image={scene(item.scene)}>
        <BackLink label="Learn" onBack={nav.back} />
      </Hero>
      <div className="page page--under-hero">
        <p className="card__eyebrow">
          {categories[item.category]} · {item.minutes} min read
        </p>
        <h1 className="title">{item.title}</h1>
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
            <span className="card__eyebrow">Next</span>
            <span className="card__title card__title--small">{next.title}</span>
          </button>
        )}
      </div>
    </article>
  );
}
