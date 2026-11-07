export interface StorageAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}
