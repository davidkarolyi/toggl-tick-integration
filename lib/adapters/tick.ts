import { localizedPlainDateToISOString } from "./helpers/date";
import { proxy } from "./helpers/proxy";
import { Project, TargetAdapter, Task, TimeEntry } from "./types";

export const BASE_URL = "https://www.tickspot.com";
const API_URL = `${BASE_URL}/api/v2`;

export class TickAdapter implements TargetAdapter<TickCredentials> {
  private tokenCredentials?: TokenCredentials;

  get credentials(): TokenCredentials {
    if (this.tokenCredentials) return this.tokenCredentials;
    else throw new Error("Adapter haven't initialized yet");
  }

  private get authHeaders() {
    return {
      Authorization: `Token token=${this.credentials.token}`,
      "User-Agent": `TogglTickIntegration (${this.credentials.email})`,
    };
  }

  private get subURL() {
    return `${BASE_URL}/${this.credentials.subscriptionId}/api/v2`;
  }

  async init(credentials: TickCredentials) {
    if ("token" in credentials) {
      this.tokenCredentials = credentials;
    } else {
      const { data: body } = await proxy({
        method: "GET",
        url: `${API_URL}/roles.json`,
        headers: {
          "User-Agent": `TogglTickIntegration (${credentials.email})`,
          Authorization:
            "Basic " + btoa(`${credentials.email}:${credentials.password}`),
        },
      });

      this.tokenCredentials = {
        token: body[0].api_token,
        email: credentials.email,
        subscriptionId: body[0].subscription_id,
      };
    }

    await this.testCredentials();
  }

  async getProjects(): Promise<Array<Project>> {
    const { data: body } = await proxy({
      method: "GET",
      url: `${this.subURL}/projects.json`,
      headers: this.authHeaders,
    });

    return body.reduce(
      (projects: Array<Project>, project: { id: number; name: string }) => {
        return [...projects, { id: `${project.id}`, name: project.name }];
      },
      []
    );
  }

  async getTasks(projectId: string): Promise<Task[]> {
    const { data: body } = await proxy({
      method: "GET",
      url: `${this.subURL}/projects/${projectId}/tasks.json`,
      headers: this.authHeaders,
    });

    return body.map(
      (task: { name: string; id: number; project_id: number }): Task => ({
        id: `${task.id}`,
        projectId: `${task.project_id}`,
        name: task.name,
      })
    );
  }

  async getTimeEntries(from: Date, to: Date): Promise<TimeEntry[]> {
    const { data: body } = await proxy({
      method: "GET",
      url: `${this.subURL}/entries.json`,
      headers: this.authHeaders,
      params: {
        start_date: localizedPlainDateToISOString(from),
        end_date: localizedPlainDateToISOString(to),
      },
    });

    return body.map(
      (entry: {
        id: number;
        date: string;
        notes: string;
        hours: number;
        task_id: number;
      }): TimeEntry => ({
        id: `${entry.id}`,
        taskId: `${entry.task_id || ""}`,
        description: entry.notes,
        date: new Date(entry.date),
        durationInSeconds: Math.floor(entry.hours * 60 * 60),
      })
    );
  }

  async createTimeEntry(entry: TimeEntry): Promise<void> {
    await proxy({
      method: "POST",
      url: `${this.subURL}/entries.json`,
      headers: this.authHeaders,
      data: {
        date: entry.date.toISOString().split("T")[0],
        hours: entry.durationInSeconds / 60 / 60,
        notes: entry.description,
        task_id: entry.taskId,
      },
    });
  }

  async deleteTimeEntry(id: string): Promise<void> {
    await proxy({
      method: "DELETE",
      url: `${this.subURL}/entries/${id}.json`,
      headers: this.authHeaders,
    });
  }

  private async testCredentials() {
    await proxy({
      method: "GET",
      url: `${this.subURL}/users.json`,
      headers: this.authHeaders,
    });
  }
}

type EmailPasswordCredentials = {
  email: string;
  password: string;
};

type TokenCredentials = {
  token: string;
  email: string;
  subscriptionId: string;
};

export type TickCredentials = EmailPasswordCredentials | TokenCredentials;
