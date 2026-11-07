// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const items = new Map<string, { id: string; title: string; status: string; type: string; createdAt: string }>();
const offers: string[] = [];
vi.mock('../../app/services', () => ({
  lifeService: {
    list: async () => [...items.values()],
    get: async (id: string) => items.get(id) ?? null,
    capture: async (title: string, type: string) => {
      const item = { id: `i${items.size + 1}`, title, status: 'OPEN', type, createdAt: `2026-11-0${items.size + 1}` };
      items.set(item.id, item);
      return item;
    },
    setStatus: async (id: string, status: string) => {
      const item = items.get(id)!;
      items.set(id, { ...item, status });
      return { item, undo: async () => void items.set(id, item) };
    },
    deleteItem: async (id: string) => void items.delete(id),
  },
}));
vi.mock('../../lamplight/undo', () => ({ offerUndo: (message: string) => void offers.push(message) }));

import { applyAssistant, assistantAvailable, assistantOn, setAssistantOn, tools } from '../../app/assistant/webmcp';

type Registered = { name: string; signal?: AbortSignal };
let registered: Registered[] = [];

beforeEach(() => {
  items.clear();
  offers.length = 0;
  registered = [];
  localStorage.clear();
  (document as unknown as { modelContext?: unknown }).modelContext = {
    registerTool: async (tool: { name: string }, options?: { signal?: AbortSignal }) => void registered.push({ name: tool.name, signal: options?.signal }),
  };
});
afterEach(() => {
  delete (document as unknown as { modelContext?: unknown }).modelContext;
});

describe('the browser assistant', () => {
  it('is not offered where the browser has no such API, and nothing is registered until the person turns it on', () => {
    delete (document as unknown as { modelContext?: unknown }).modelContext;
    expect(assistantAvailable()).toBe(false);
    (document as unknown as { modelContext?: unknown }).modelContext = { registerTool: async () => undefined };
    expect(assistantAvailable()).toBe(true);
    applyAssistant();
    expect(registered).toEqual([]);
    expect(assistantOn()).toBe(false);
  });

  it('offers three to-do tools when on, and takes them back when turned off', () => {
    setAssistantOn(true);
    expect(registered.map((tool) => tool.name)).toEqual(['list_open_to_dos', 'add_to_do', 'mark_to_do_done']);
    const signals = registered.map((tool) => tool.signal!);
    expect(signals.every((signal) => !signal.aborted)).toBe(true);
    setAssistantOn(false);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(assistantOn()).toBe(false);
  });

  it('marks what it reads as untrusted and read only, and never reaches past to-dos', () => {
    const list = tools().find((tool) => tool.name === 'list_open_to_dos')!;
    expect(list.annotations).toEqual({ readOnlyHint: true, untrustedContentHint: true });
    expect(tools().map((tool) => tool.name).join(' ')).not.toMatch(/reflect|journal|health|delete/);
  });

  it('adds, lists and finishes to-dos, each change shown with an undo', async () => {
    const [list, add, done] = tools() as unknown as { execute: (args: unknown) => Promise<string> }[];
    expect(await add.execute({ title: '   ' })).toMatch(/empty/);
    expect(await add.execute({ title: 'Book the dentist' })).toMatch(/Added “Book the dentist”/);
    expect(offers).toEqual(['“Book the dentist” added by the assistant']);
    const shown = JSON.parse(await list.execute({})) as { id: string; title: string }[];
    expect(shown.map((item) => item.title)).toEqual(['Book the dentist']);
    expect(await done.execute({ id: shown[0].id })).toMatch(/done/);
    expect(offers[1]).toBe('“Book the dentist” done, by the assistant');
    expect(JSON.parse(await list.execute({}))).toEqual([]);
    expect(await done.execute({ id: 'nope' })).toMatch(/not open/);
  });

  it('caps what one call returns', async () => {
    const [list, add] = tools() as unknown as { execute: (args: unknown) => Promise<string> }[];
    for (let index = 0; index < 25; index += 1) await add.execute({ title: `To-do ${index}` });
    expect(JSON.parse(await list.execute({ limit: 500 })).length).toBe(20);
    expect(JSON.parse(await list.execute({ limit: 3 })).length).toBe(3);
  });
});
