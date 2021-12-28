import { proxy } from "./proxy";
import {
  Project,
  ReaderAdapter,
  Task,
  TimeEntry,
  WriterAdapter,
} from "./types";

const BASE_URL = "https://www.tickspot.com";
const API_URL = `${BASE_URL}/api/v2`;

export class TickAdapter implements ReaderAdapter, WriterAdapter {
  private constructor(private readonly credentials: TickCredentials) {}

  private get authHeaders() {
    return {
      Authorization: `Token token=${this.credentials.token}`,
      "User-Agent": `TogglTickIntegration (${this.credentials.email})`,
    };
  }

  private get subURL() {
    return `${BASE_URL}/${this.credentials.subscriptionId}/api/v2`;
  }

  static async init(email: string, password: string) {
    const { data: body } = await proxy({
      method: "GET",
      url: `${API_URL}/roles.json`,
      headers: {
        "User-Agent": `TogglTickIntegration (${email})`,
        Authorization: "Basic " + btoa(`${email}:${password}`),
      },
    });

    return new TickAdapter({
      token: body[0].api_token,
      email,
      subscriptionId: body[0].subscription_id,
    });
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
        start_date: from.toISOString().split("T")[0],
        end_date: to.toISOString().split("T")[0],
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
}

type TickCredentials = {
  token: string;
  email: string;
  subscriptionId: string;
};
