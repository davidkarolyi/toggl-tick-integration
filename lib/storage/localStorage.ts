import { AdapterCredentials } from "../adapters/types";
import { CredentialStorage } from "./types";

export class LocalStorage implements CredentialStorage {
  async get<C extends AdapterCredentials>(platform: string): Promise<C | null> {
    try {
      const encodedCredentials = localStorage.getItem(platform);
      return encodedCredentials ? this.unmarshal<C>(encodedCredentials) : null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async set<C extends AdapterCredentials>(
    platform: string,
    credentials: C
  ): Promise<void> {
    const encodedCredentials = this.marshal(credentials);
    localStorage.setItem(platform, encodedCredentials);
  }

  async reset(platform: string): Promise<void> {
    localStorage.removeItem(platform);
  }

  private marshal<C extends AdapterCredentials>(credentials: C): string {
    return JSON.stringify(credentials);
  }

  private unmarshal<C extends AdapterCredentials>(
    encodedCredentials: string
  ): C {
    return JSON.parse(encodedCredentials);
  }
}
