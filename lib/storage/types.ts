export interface Storage {
  get<T extends StoredValue>(key: string): Promise<T | null>;
  set<T extends StoredValue>(key: string, value: T): Promise<void>;
  reset(key: string): Promise<void>;
}

export type StoredValue = string | Record<string, unknown>;
