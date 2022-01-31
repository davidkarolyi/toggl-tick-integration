import { makeAutoObservable } from "mobx";

import {
  AdapterCredentials,
  Project,
  TargetAdapter,
  Task,
  TimeEntry,
} from "../adapters/types";
import { RootStore } from "./types";
import { AsyncState } from "./async";
import { CredentialStorage } from "../storage/types";

export class TargetStore<C extends AdapterCredentials> {
  authenticatedAdapter: AsyncState<TargetAdapter<C>> = new AsyncState(
    this,
    "authenticatedAdapter"
  );
  projects: AsyncState<Array<Project>> = new AsyncState(this, "projects");
  tasks: AsyncState<Array<Task>> = new AsyncState(this, "tasks");
  timeEntries: AsyncState<Array<TimeEntry>> = new AsyncState(
    this,
    "timeEntries"
  );
  isDeletionAllowed: boolean = false;
  timeEntriesSelection: Array<string> = [];
  selectedProject: Project["id"] = "";
  selectedTask: Task["id"] = "";

  get name(): string {
    return this.options.platformName;
  }

  get isAuthenticated(): boolean {
    return Boolean(this.authenticatedAdapter.value);
  }

  constructor(readonly options: Options<C>) {
    makeAutoObservable(this);
  }

  async loadStoredCredentials() {
    const credentials = await this.options.credentialStorage.get<C>(
      this.options.platformName
    );

    if (credentials) this.auth(credentials);
  }

  forgetCredentials() {
    this.options.credentialStorage.reset(this.options.platformName);
    this.authenticatedAdapter.reset();
    this.selectedTask = "";
    this.selectedProject = "";
    this.projects.reset();
    this.tasks.reset();
    this.timeEntries.reset();
    this.timeEntriesSelection = [];
    this.isDeletionAllowed = false;
  }

  async auth(credentials: C) {
    await this.authenticatedAdapter.update(async () => {
      await this.options.adapter.init(credentials);
      return this.options.adapter;
    });

    if (this.authenticatedAdapter.error || !this.authenticatedAdapter.value)
      await this.options.credentialStorage.reset(this.options.platformName);
    else {
      this.options.rootStore.alert.set({
        type: "success",
        message: "Successfully authenticated!",
      });
      this.getProjects();
      if (!this.selectedTask) this.setTaskNotSelectedError();
      this.options.credentialStorage.set(
        this.options.platformName,
        this.authenticatedAdapter.value.credentials
      );
    }
  }

  async getProjects() {
    await this.projects.update(async () => {
      if (!this.authenticatedAdapter.value)
        throw new Error("Haven't authenticated yet");
      return this.authenticatedAdapter.value.getProjects();
    });

    if (
      !this.projects.error &&
      this.selectedProject &&
      this.projects.value?.map(({ id }) => id).includes(this.selectedProject)
    )
      this.getTasks(this.selectedProject);
  }

  getTasks(projectId: Task["projectId"]) {
    this.tasks.update(async () => {
      if (!this.authenticatedAdapter.value)
        throw new Error("Haven't authenticated yet");
      return this.authenticatedAdapter.value.getTasks(projectId);
    });
  }

  async getTimeEntries() {
    if (!this.selectedTask) this.setTaskNotSelectedError();
    else {
      await this.timeEntries.update(async () => {
        if (!this.authenticatedAdapter.value)
          throw new Error("Haven't authenticated yet");
        const entries = await this.authenticatedAdapter.value.getTimeEntries(
          ...this.options.rootStore.integration.dateRange
        );
        return entries?.filter((entry) => entry.taskId === this.selectedTask);
      });

      if (!this.timeEntries.error)
        this.options.rootStore.integration.selectDifferences();
    }
  }

  toggleIsDeletionAllowed() {
    this.timeEntriesSelection = [];
    this.isDeletionAllowed = !this.isDeletionAllowed;
    this.options.rootStore.integration.selectDifferences();
  }

  setSelectedProject(id: Project["id"]) {
    if (id === this.selectedProject) return;
    this.selectedProject = id;
    this.timeEntriesSelection = [];
    this.isDeletionAllowed = false;
    this.selectedTask = "";
    this.setTaskNotSelectedError();
    this.getTasks(id);
  }

  setSelectedTask(id: Task["id"]) {
    this.selectedTask = id;
    this.getTimeEntries();
  }

  setTaskNotSelectedError() {
    this.timeEntries.setError(
      new Error(
        `Please select the target task in ${this.options.platformName}.`
      )
    );
  }

  setTimeEntriesSelection(selection: Array<string>) {
    this.timeEntriesSelection = selection;
  }
}

type Options<C extends AdapterCredentials> = {
  rootStore: RootStore<{}, C>;
  platformName: string;
  adapter: TargetAdapter<C>;
  credentialStorage: CredentialStorage;
};
