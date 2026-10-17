import { apiUrl } from '../../app/apiBase';
import { useRef, useState } from 'react';
import type { Nav } from '../app/App';
import { holdDraft } from '../app/draft';
import { BackLink, Segmented } from '../app/ui';
import { fromJsonLd, fromText } from '../core/importRecipe';
import { readPhotoText } from '../../app/family/ocr';
import { Waiting } from '../../lamplight/Waiting';
import FromAnotherApp from './FromAnotherApp';

function RecipePhoto({ onUse }: { onUse: (text: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState<number>();
  const [text, setText] = useState('');
  const [problem, setProblem] = useState('');

  const read = (file: File) => {
    setProblem('');
    setText('');
    setReading(0);
    void readPhotoText(file, setReading)
      .then(setText)
      .catch(() => setProblem('Couldn’t read the card. Try a closer, straighter photo in good light.'))
      .finally(() => setReading(undefined));
  };

  return (
    <div className="recipe-photo-import">
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) read(file);
        }}
      />
      {!text && (
        <>
          <p className="hint">Read a recipe card on this device. The photo stays here.</p>
          <button type="button" className="button-main" disabled={reading !== undefined} onClick={() => input.current?.click()}>
            {reading !== undefined ? <Waiting>{`Reading… ${Math.round(reading * 100)}%`}</Waiting> : 'Take a photo'}
          </button>
        </>
      )}
      {problem && <p className="hint" role="alert">{problem}</p>}
      {text && (
        <>
          <label className="field">
            <span className="label">Text from the photo</span>
            <textarea className="area recipe-photo-import__text" rows={12} value={text} onChange={(event) => setText(event.target.value)} />
          </label>
          <div className="button-row">
            <button type="button" className="button-main" onClick={() => onUse(text)}>
              Use this text
            </button>
            <button type="button" className="button-quiet" onClick={() => input.current?.click()}>
              Another photo
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Bringing a recipe in: from a link (the page is read through the app's own
 * bridge, which keeps nothing), pasted text, a photo, or another recipe app's
 * export. Every recipe is shown to look over or choose before it is kept.
 */
export default function ImportPage({ nav, how: opening }: { nav: Nav; how?: 'app' }) {
  const [how, setHow] = useState<'link' | 'text' | 'photo' | 'app'>(opening ?? 'link');
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
          { id: 'link', label: 'Link' },
          { id: 'text', label: 'Text' },
          { id: 'photo', label: 'Photo' },
          { id: 'app', label: 'File' },
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
            {busy ? <Waiting>Reading the page…</Waiting> : 'Bring it in'}
          </button>
        </>
      ) : how === 'text' ? (
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
      ) : how === 'app' ? (
        <FromAnotherApp nav={nav} />
      ) : (
        <RecipePhoto
          onUse={(photoText) => {
            holdDraft(fromText(photoText));
            nav.swap({ name: 'edit' });
          }}
        />
      )}
      {problem && (
        <p className="hint" role="status">
          {problem}
        </p>
      )}
    </div>
  );
}
