import { useEffect, useMemo, useRef, useState } from 'react';
import { useBackHandler } from '../../app/back/backStack';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useNavigate } from '../../app/navigationContext';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService, reflectionService } from '../../app/services';
import forest from '../../assets/images/scenes/forest.webp';
import morning from '../../assets/images/scenes/morning.webp';
import morningWide from '../../assets/images/scenes/morning-wide.webp';
import forestWide from '../../assets/images/scenes/forest-wide.webp';
import type { CSSProperties } from 'react';
import MicButton from '../../components/dictation/MicButton';
import { ArrowLeftIcon, TagIcon } from '../../components/icons/Icons';
import type { InnerWeather } from '../../core/reflections/types';
import { loadJournalDraft, saveJournalDraft } from '../../data/storage/preferences';
import { promptText, reflectionPrompts } from '../reflect/prompts';
import { weather as outdoor } from '../../app/weather/weather';

const skyNow = () => outdoor.skyNow();
import { weatherOptions } from '../reflect/weather';

/**
 * A full page for writing. Every addition (a prompt, inner weather, values)
 * can be left blank. Leaving keeps the draft; Save is the only thing that stores it.
 */
export default function JournalPage() {
  const navigate = useNavigate();
  const { offerUndo } = useOverlays();
  const [draft] = useState(() => loadJournalDraft());
  const [body, setBody] = useState(draft?.body ?? '');
  const [weather, setWeather] = useState<InnerWeather | undefined>(draft?.weather as InnerWeather | undefined);
  const [valueIds, setValueIds] = useState<string[]>(draft?.valueIds ?? []);
  const [promptKey, setPromptKey] = useState<string | undefined>(draft?.promptKey);
  const [tagging, setTagging] = useState(valueIds.length > 0);
  const [saving, setSaving] = useState(false);
  const values = useServiceData(compassService.subscribe, () => compassService.values()) ?? [];
  const everything = useServiceData(reflectionService.subscribe, () => reflectionService.all()) ?? [];
  const field = useRef<HTMLTextAreaElement>(null);

  // Earlier pages: only what was written here, newest first, grouped by month.
  const months = useMemo(() => {
    const starts = new Set<string | undefined>([undefined, ...reflectionPrompts.map((prompt) => prompt.key)]);
    const pages = everything
      .filter((entry) => entry.kind === 'FREE' && !entry.decisionId && starts.has(entry.promptKey) && entry.body.trim())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const groups: { label: string; pages: typeof pages }[] = [];
    for (const page of pages) {
      const label = new Date(page.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const last = groups[groups.length - 1];
      if (last?.label === label) last.pages.push(page);
      else groups.push({ label, pages: [page] });
    }
    return groups;
  }, [everything]);

  // The page opens ready to write (an effect, not autoFocus: the view mounts after a transition).
  useEffect(() => {
    field.current?.focus({ preventScroll: true });
  }, []);

  // The page grows with the writing.
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 240)}px`;
  }, [body]);

  const leave = () => navigate('reflect');
  useBackHandler(true, leave);

  useEffect(() => {
    saveJournalDraft({ body, weather, valueIds, promptKey });
  }, [body, weather, valueIds, promptKey]);

  async function save() {
    if (!body.trim()) return;
    setSaving(true);
    const written = await reflectionService.write({ body, weather, valueIds, promptKey, sky: skyNow() });
    saveJournalDraft(null);
    offerUndo('Saved to Reflect', async () => {
      await reflectionService.remove(written.id);
    });
    leave();
  }

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const hasDraft = body.trim().length > 0;

  return (
    <div className="page journal">
      <div className="journal__top">
        <button type="button" className="back-link journal__back" onClick={leave}>
          <ArrowLeftIcon size={18} />
          {hasDraft ? 'Keep as draft' : 'Reflect'}
        </button>
      </div>

      <div className="journal__scene" aria-hidden="true" style={{ backgroundImage: `url(${forest})`, '--photo-wide': `url(${forestWide})`, '--photo-light': `url(${morning})`, '--photo-light-wide': `url(${morningWide})` } as CSSProperties} />

      <header className="journal__heading">
        <p className="journal__date">{today}</p>
        <h1 className="journal__title">{promptText(promptKey) ?? 'What’s on your mind?'}</h1>
      </header>

      <details className="journal__starts" open={promptKey !== undefined}>
        <summary>A place to start</summary>
        <div className="chip-row" role="group" aria-label="A place to start">
          {reflectionPrompts.map((prompt) => (
            <button
              key={prompt.key}
              type="button"
              className="chip chip--prompt"
              aria-pressed={promptKey === prompt.key}
              onClick={() => setPromptKey(promptKey === prompt.key ? undefined : prompt.key)}
            >
              {prompt.text}
            </button>
          ))}
        </div>
      </details>

      <textarea
        ref={field}
        className="journal__input"
        rows={8}
        placeholder="Write freely…"
        aria-label="Reflection"
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />

      <section className="stack-tight" aria-label="Inner weather">
        <h2 className="section-label">Inner weather</h2>
        <div className="weather-picker">
          {weatherOptions.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className="weather-picker__option"
              aria-pressed={weather === id}
              onClick={() => setWeather(weather === id ? undefined : id)}
            >
              <Icon size={26} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {tagging && values.length > 0 && (
        <div className="chip-row" role="group" aria-label="Values">
          {values.map((value) => (
            <button
              key={value.id}
              type="button"
              className="chip chip--value"
              aria-pressed={valueIds.includes(value.id)}
              onClick={() =>
                setValueIds(valueIds.includes(value.id) ? valueIds.filter((id) => id !== value.id) : [...valueIds, value.id])
              }
            >
              {value.name}
            </button>
          ))}
        </div>
      )}

      <div className="journal__toolbar">
        <MicButton
          className="journal__tool"
          onText={(spoken) => setBody((current) => (current.trim() ? `${current.replace(/\s+$/, '')} ${spoken}` : spoken))}
        />
        {values.length > 0 && (
          <button
            type="button"
            className="journal__tool"
            aria-label="Tag with your values"
            aria-pressed={tagging}
            onClick={() => setTagging(!tagging)}
          >
            <TagIcon size={22} />
          </button>
        )}
        <button type="button" className="button-accent journal__save" disabled={!hasDraft || saving} onClick={save}>
          Save
        </button>
      </div>

      {months.length > 0 && (
        <details className="journal__earlier">
          <summary>Earlier pages</summary>
          {months.map((month) => (
            <section key={month.label} className="journal__month" aria-label={month.label}>
              <h2 className="section-label">{month.label}</h2>
              {month.pages.map((page) => (
                <details key={page.id} className="journal__page">
                  <summary>
                    <span className="journal__page-day">
                      {new Date(page.createdAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                    </span>
                    <span className="journal__page-line">{page.body.trim().split('\n')[0]}</span>
                  </summary>
                  <p className="journal__page-body">{page.body.trim()}</p>
                </details>
              ))}
            </section>
          ))}
        </details>
      )}
    </div>
  );
}
