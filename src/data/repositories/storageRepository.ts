export interface StorageRepository {
  connect(): Promise<unknown>;
  disconnect(): Promise<void>;
}
