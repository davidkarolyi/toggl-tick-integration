import { proxy } from "./proxy";
import { Project, ReaderAdapter, Task, TimeEntry } from "./types";

const API_URL = "https://api.track.toggl.com/api/v8";

export class TogglAdapter implements ReaderAdapter {
  private constructor(private readonly token: string) {}

  private get authHeaders() {
    return {
      Authorization: "Basic " + btoa(`${this.token}:api_token`),
    };
  }

  static async init(token: string) {
    const adapter = new TogglAdapter(token);
    await adapter.testCredentials();

    return adapter;
  }

  async getProjects(): Promise<Array<Project>> {
    let projects: Array<Project> = [];
    let alreadyListed: { [projectId: number]: boolean } = {};

    for (const workspaceId of await this.getWorkspaces()) {
      const { data } = await proxy({
        method: "GET",
        url: `${API_URL}/workspaces/${workspaceId}/projects`,
        headers: this.authHeaders,
      });

      data.forEach((project: { id: number; name: string }) => {
        if (alreadyListed[project.id]) return;
        alreadyListed[project.id] = true;
        projects.push({ id: `${project.id}`, name: project.name });
      });
    }

    return projects;
  }

  async getTasks(projectId: string): Promise<Task[]> {
    const { data: body } = await proxy({
      method: "GET",
      url: `${API_URL}/projects/${projectId}/tasks`,
      headers: this.authHeaders,
    });

    return body.map(
      (task: { name: string; id: number; pid: number }): Task => ({
        id: `${task.id}`,
        projectId: `${task.pid}`,
        name: task.name,
      })
    );
  }

  async getTimeEntries(from: Date, to: Date): Promise<TimeEntry[]> {
    const { data: body } = await proxy({
      method: "GET",
      url: `${API_URL}/time_entries`,
      params: {
        start_date: from.toISOString(),
        end_date: to.toISOString(),
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

  private async getWorkspaces(): Promise<Array<number>> {
    const { data: body } = await proxy({
      method: "GET",
      url: `${API_URL}/workspaces`,
      headers: this.authHeaders,
    });

    return body.map((workspace: { id: number }) => workspace.id);
  }

  private async testCredentials(): Promise<void> {
    await proxy({
      method: "GET",
      url: `${API_URL}/me`,
      headers: this.authHeaders,
    });
  }
}
