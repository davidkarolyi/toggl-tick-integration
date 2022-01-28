import { AxiosRequestConfig } from "axios";

export interface SourceAdapter<C extends AdapterCredentials> {
  credentials: C;
  isAuthenticated: boolean;
  init(credentials: C): Promise<void>;
  getTimeEntries(from: Date, to: Date): Promise<Array<TimeEntry>>;
}

export interface TargetAdapter<C extends AdapterCredentials> {
  credentials: C;
  isAuthenticated: boolean;
  init(credentials: C): Promise<void>;
  getTimeEntries(from: Date, to: Date): Promise<Array<TimeEntry>>;
  getProjects(): Promise<Array<Project>>;
  getTasks(projectId: Project["id"]): Promise<Array<Task>>;
  createTimeEntry(entry: TimeEntry): Promise<void>;
  deleteTimeEntry(id: TimeEntry["id"]): Promise<void>;
}

export type AdapterCredentials = Record<string, unknown>;

export type Project = {
  id: string;
  name: string;
};

export type Task = {
  id: string;
  projectId: Project["id"];
  name: string;
};

export type TimeEntry = {
  id: string;
  taskId: Task["id"];
  description: string;
  date: Date;
  durationInSeconds: number;
};
