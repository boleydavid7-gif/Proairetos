export type StorageConnection = {
  provider: 'supabase' | 'local' | 'memory';
  connected: boolean;
};

export const database: StorageConnection = {
  provider: 'memory',
  connected: false,
};
