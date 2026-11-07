import { useSyncExternalStore } from 'react';
import { offerUndo } from '../../lamplight/undo';
import { lifeService } from '../services';

/*
 * The browser's assistant, through WebMCP (Chrome's `document.modelContext`, an origin trial from Chrome 149): the page
 * offers a few named tools and the assistant calls them instead of reading the screen and clicking. Everything here is
 * the person's choice: nothing is offered until they turn it on in Settings > The app > Browser assistant, the setting
 * stays on this device, and it exists only where the browser has the API. Only to-dos are reachable; Reflect, the
 * Journal, health and the other apps are not. Every change is shown with an undo.
 */
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean; consequentialHint?: boolean };
  execute: (args: never) => Promise<string>;
};
type ModelContext = { registerTool(tool: Tool, options?: { signal?: AbortSignal }): Promise<void> };

const KEY = 'proairetosWebMcp';
const listeners = new Set<() => void>();
let registered: AbortController | undefined;

const modelContext = (): ModelContext | undefined => (document as unknown as { modelContext?: ModelContext }).modelContext;

/** Whether this browser can offer tools to its assistant at all. */
export const assistantAvailable = (): boolean => typeof modelContext()?.registerTool === 'function';

export function assistantOn(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export const MAX_TITLE = 200;
export const MAX_LISTED = 20;

/** The tools, kept apart from the registration so they can be checked on their own. */
export function tools(): Tool[] {
  return [
    {
      name: 'list_open_to_dos',
      description: 'Lists the person’s open to-dos, newest first, with the id of each.',
      inputSchema: { type: 'object', properties: { limit: { type: 'number', description: `How many, at most ${MAX_LISTED}` } } },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute({ limit }: { limit?: number }) {
        const open = (await lifeService.list()).filter((item) => item.status === 'OPEN' && item.type === 'DO');
        const shown = open.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, Math.max(1, Math.min(MAX_LISTED, Number(limit) || 10)));
        return JSON.stringify(shown.map((item) => ({ id: item.id, title: item.title })));
      },
    },
    {
      name: 'add_to_do',
      description: 'Adds a to-do in the person’s own words. The person sees it and can undo it.',
      inputSchema: { type: 'object', properties: { title: { type: 'string', description: 'The to-do' } }, required: ['title'] },
      async execute({ title }: { title: string }) {
        const text = String(title ?? '').trim().slice(0, MAX_TITLE);
        if (!text) return 'Nothing was added: the title was empty.';
        const item = await lifeService.capture(text, 'DO');
        offerUndo(`“${item.title}” added by the assistant`, async () => void (await lifeService.deleteItem(item.id)));
        return `Added “${item.title}” (${item.id}).`;
      },
    },
    {
      name: 'mark_to_do_done',
      description: 'Marks one open to-do done, by the id from list_open_to_dos. The person can undo it.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      async execute({ id }: { id: string }) {
        const found = await lifeService.get(String(id));
        if (!found || found.status !== 'OPEN' || found.type !== 'DO') return 'That to-do is not open.';
        const change = await lifeService.setStatus(found.id, 'DONE');
        offerUndo(`“${found.title}” done, by the assistant`, change.undo);
        return `Marked “${found.title}” done.`;
      },
    },
  ];
}

function changed(): void {
  for (const listener of listeners) listener();
}

/** Offers the tools or takes them back, as the person's choice stands. */
export function applyAssistant(): void {
  registered?.abort();
  registered = undefined;
  const context = modelContext();
  if (!context || !assistantOn()) return;
  const controller = new AbortController();
  registered = controller;
  for (const tool of tools()) void context.registerTool(tool, { signal: controller.signal }).catch(() => undefined);
}

export function setAssistantOn(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, 'on');
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the choice cannot be kept.
  }
  applyAssistant();
  changed();
}

export const startWebMcp = applyAssistant;

export function useAssistantOn(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    assistantOn,
    () => false,
  );
}
