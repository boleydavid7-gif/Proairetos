import { vi } from 'vitest';

// A server that has the reminder sources but not yet the preview columns.
const written: Record<string, unknown>[][] = [];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      delete: () => ({ eq: () => ({ eq: () => ({ is: async () => ({ error: null }) }) }) }),
      upsert: async (rows: Record<string, unknown>[]) => {
        written.push(rows);
        return 'preview_title' in rows[0]
          ? { error: { code: 'PGRST204', message: "Could not find the 'preview_body' column of 'reminders' in the schema cache" } }
          : { error: null };
      },
    }),
  }),
}));

describe('reminders on a server without previews', () => {
  it('still sends each app’s sealed words and source', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'key');
    vi.resetModules();
    const { replaceSourceReminders } = await import('../../data/sync/supabase');
    await replaceSourceReminders('user', 'ergon', [{ id: 'a', fire_at: '2026-10-14T09:00:00Z', sealed: 'S', preview_title: 'Bins', preview_body: 'Out', preview_open: 'ergon' }]);
    expect(written.at(-1)).toEqual([{ id: 'a', fire_at: '2026-10-14T09:00:00Z', sealed: 'S', source: 'ergon', user_id: 'user' }]);
    vi.unstubAllEnvs();
  });
});
