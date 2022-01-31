import { endOfDay, startOfDay } from "date-fns";
import { proxy } from "./helpers/proxy";
import { SourceAdapter, TimeEntry } from "./types";

export const BASE_URL = "https://api.track.toggl.com";
const API_URL = `${BASE_URL}/api/v8`;

export class TogglAdapter implements SourceAdapter<TogglCredentials> {
  private unsafeCredentials?: TogglCredentials;

  get credentials(): TogglCredentials {
    if (this.unsafeCredentials) return this.unsafeCredentials;
    else throw new Error("Adapter haven't initialized yet");
  }

  get isAuthenticated(): boolean {
    return Boolean(this.unsafeCredentials);
  }

  private get authHeaders() {
    return {
      Authorization: "Basic " + btoa(`${this.credentials.token}:api_token`),
    };
  }

  async init(credentials: TogglCredentials) {
    this.unsafeCredentials = credentials;
    await this.testCredentials();
  }

  async getTimeEntries(from: Date, to: Date): Promise<TimeEntry[]> {
    const { data: body } = await proxy({
      method: "GET",
      url: `${API_URL}/time_entries`,
      params: {
        start_date: startOfDay(from).toISOString(),
        end_date: endOfDay(to).toISOString(),
      },
      headers: this.authHeaders,
    });

    return body.map(
      (entry: {
        id: number;
        tid: number;
        description: string;
        start: string;
        duration: number;
      }): TimeEntry => ({
        id: `${entry.id}`,
        taskId: `${entry.tid || ""}`,
        description: entry.description,
        date: new Date(entry.start),
        durationInSeconds: entry.duration,
      })
    );
  }

  private async testCredentials(): Promise<void> {
    await proxy({
      method: "GET",
      url: `${API_URL}/me`,
      headers: this.authHeaders,
    });
  }
}

export type TogglCredentials = {
  token: string;
};
