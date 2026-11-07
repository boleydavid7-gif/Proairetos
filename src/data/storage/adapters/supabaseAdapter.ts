export type StorageConnection = {
  connected: boolean;
};

export const supabaseAdapter = {
  async connect(): Promise<StorageConnection> {
    return { connected: true };
  },

  async disconnect(): Promise<void> {
    return;
  },
};
