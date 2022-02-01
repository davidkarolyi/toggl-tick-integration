import { Storage, StoredValue } from "./types";

export class LocalStorage implements Storage {
  async get<T extends StoredValue>(key: string): Promise<T | null> {
    try {
      const encodedValue = localStorage.getItem(key);
      return encodedValue ? this.unmarshal<T>(encodedValue) : null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async set<T extends StoredValue>(key: string, value: T): Promise<void> {
    const encodedValue = this.marshal(value);
    localStorage.setItem(key, encodedValue);
  }

  async reset(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  private marshal<T extends StoredValue>(value: T): string {
    return typeof value === "string" ? `${value}` : JSON.stringify(value);
  }

  private unmarshal<T extends StoredValue>(encodedValue: string): T {
    try {
      const parsedValue = JSON.parse(encodedValue);
      if (typeof parsedValue !== "object")
        throw new Error("The parsed value is not an object");
      return parsedValue;
    } catch (error) {
      return encodedValue as T;
    }
  }
}
