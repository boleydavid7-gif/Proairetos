import { apiUrl } from '../../app/apiBase';
import { useState } from 'react';
import type { Nav } from '../app/App';
import { holdDraft } from '../app/draft';
import { BackLink, Segmented } from '../app/ui';
import { fromJsonLd, fromText } from '../core/importRecipe';

/**
 * Bringing a recipe in: from a link (the page is read through the app's own
 * bridge, which keeps nothing) or from pasted text. Either way the recipe is
 * shown to look over before it is kept.
 */
export default function ImportPage({ nav }: { nav: Nav }) {
  const [how, setHow] = useState<'link' | 'text'>('link');
  const [link, setLink] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  const readLink = async () => {
    const address = link.trim().replace(/^(?!https?:\/\/)/, 'https://');
    setBusy(true);
    setProblem(undefined);
    try {
      const response = await fetch(apiUrl(`/api/recipe?url=${encodeURIComponent(address)}`));
      const body = (await response.json()) as { url?: string; blocks?: string[]; title?: string; image?: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'That page could not be read.');
      const draft = fromJsonLd(body.blocks ?? [], body.url ?? address);
      if (!draft || (!draft.ingredients.length && !draft.steps.length)) {
        setProblem('No recipe was found on that page. Copy the recipe text and paste it here instead.');
        setHow('text');
        return;
      }
      holdDraft({ ...draft, image: draft.image ?? body.image });
      nav.swap({ name: 'edit' });
    } catch (cause) {
      // A TypeError is the browser saying the network could not be reached.
      setProblem(cause instanceof Error && !(cause instanceof TypeError) ? cause.message : 'That page could not be reached. Check the connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <BackLink label="Back" onBack={nav.back} />
      <h1 className="title">Import a recipe</h1>
      <Segmented
        label="From"
        value={how}
        options={[
          { id: 'link', label: 'A link' },
          { id: 'text', label: 'Pasted text' },
        ]}
        onChange={setHow}
      />

      {how === 'link' ? (
        <>
          <label className="field">
            <span className="label">The recipe’s web address</span>
            <input
              className="input"
              type="url"
              inputMode="url"
              autoCapitalize="none"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://www.example.com/recipe/…"
            />
          </label>
          <button type="button" className="button-main" disabled={!link.trim() || busy} onClick={() => void readLink()}>
            {busy ? 'Reading the page…' : 'Bring it in'}
          </button>
        </>
      ) : (
        <>
          <label className="field">
            <span className="label">The recipe, as text</span>
            <textarea
              className="area"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={'Lentil soup\nIngredients\n1 cup lentils\n1 onion\nMethod\nSoften the onion…'}
            />
          </label>
          <button
            type="button"
            className="button-main"
            disabled={!text.trim()}
            onClick={() => {
              holdDraft(fromText(text));
              nav.swap({ name: 'edit' });
            }}
          >
            Split it up
          </button>
        </>
      )}
      {problem && (
        <p className="hint" role="status">
          {problem}
        </p>
      )}
    </div>
  );
}
