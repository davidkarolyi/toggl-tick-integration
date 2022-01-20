import { AdapterCredentials } from "../adapters/types";

export interface CredentialStorage {
  get<C extends AdapterCredentials>(platform: string): Promise<C | null>;
  set<C extends AdapterCredentials>(
    platform: string,
    credentials: C
  ): Promise<void>;
  reset(platform: string): Promise<void>;
}
