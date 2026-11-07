import { vi } from 'vitest';

// The server sends due rows once a minute. A refresh in that minute must not clear a row whose time has come,
// since the new list starts from now and would not bring it back.
const filters: [string, ...unknown[]][][] = [];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      delete: () => {
        const seen: [string, ...unknown[]][] = [];
        filters.push(seen);
        const chain = {
          eq: (...args: unknown[]) => (seen.push(['eq', ...args]), chain),
          is: (...args: unknown[]) => (seen.push(['is', ...args]), chain),
          gt: (...args: unknown[]) => (seen.push(['gt', ...args]), chain),
          then: (resolve: (value: { error: null }) => void) => resolve({ error: null }),
        };
        return chain;
      },
      upsert: async () => ({ error: null }),
    }),
  }),
}));

describe('replacing reminders', () => {
  it('clears only rows still to come, for one app and for all', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'key');
    vi.resetModules();
    const { replaceReminders, replaceSourceReminders } = await import('../../data/sync/supabase');
    const before = Date.now();
    await replaceSourceReminders('user', 'ergon', []);
    await replaceReminders('user', []);
    for (const seen of filters) {
      expect(seen).toContainEqual(['is', 'sent_at', null]);
      const gt = seen.find(([kind]) => kind === 'gt');
      expect(gt?.[1]).toBe('fire_at');
      expect(Date.parse(String(gt?.[2]))).toBeGreaterThanOrEqual(before - 1000);
    }
    expect(filters).toHaveLength(2);
    vi.unstubAllEnvs();
  });
});
