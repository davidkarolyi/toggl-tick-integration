export interface ReaderAdapter {
  getTimeEntries(from: Date, to: Date): Promise<Array<TimeEntry>>;
  getProjects(): Promise<Array<Project>>;
  getTasks(projectId: Project["id"]): Promise<Array<Task>>;
}

export interface WriterAdapter {
  createTimeEntry(entry: TimeEntry): Promise<void>;
}

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
