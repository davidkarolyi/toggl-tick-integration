import { makeAutoObservable } from "mobx";

import {
  AdapterCredentials,
  Project,
  TargetAdapter,
  Task,
  TimeEntry,
} from "../adapters/types";
import { AsyncState, RootStore } from "./types";
import { Storage } from "../storage/types";
import { AsyncStateManager } from "./helpers/async";

export class TargetStore<C extends AdapterCredentials> {
  authenticatedAdapter: AsyncState<TargetAdapter<C>> =
    AsyncStateManager.defaultState();
  projects: AsyncState<Array<Project>> = AsyncStateManager.defaultState();
  tasks: AsyncState<Array<Task>> = AsyncStateManager.defaultState();
  timeEntries: AsyncState<Array<TimeEntry>> = {
    isLoading: false,
  };
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
    const credentials = await this.options.storage.get<C>(
      this.options.platformName
    );

    if (credentials) this.auth(credentials);
  }

  async loadStoredSelectedProject() {
    const selectedProject = await this.options.storage.get<string>(
      `${this.options.platformName}_selectedProject`
    );

    if (!selectedProject) return;
    else if (!this.projects.value?.find(({ id }) => id === selectedProject))
      await this.options.storage.reset(
        `${this.options.platformName}_selectedProject`
      );
    else this.setSelectedProject(selectedProject);
  }

  async loadStoredSelectedTask() {
    const selectedTask = await this.options.storage.get<string>(
      `${this.options.platformName}_selectedTask`
    );

    if (!selectedTask) return;
    else if (!this.tasks.value?.find(({ id }) => id === selectedTask))
      await this.options.storage.reset(
        `${this.options.platformName}_selectedTask`
      );
    else this.setSelectedTask(selectedTask);
  }

  forgetCredentials() {
    this.options.storage.reset(this.options.platformName);
    this.options.storage.reset(`${this.options.platformName}_selectedTask`);
    this.options.storage.reset(`${this.options.platformName}_selectedProject`);
    this.authenticatedAdapter = AsyncStateManager.defaultState();
    this.selectedTask = "";
    this.selectedProject = "";
    this.projects = AsyncStateManager.defaultState();
    this.tasks = AsyncStateManager.defaultState();
    this.timeEntries = AsyncStateManager.defaultState();
    this.timeEntriesSelection = [];
    this.isDeletionAllowed = false;
  }

  async auth(credentials: C) {
    await AsyncStateManager.updateState(this.authenticatedAdapter, async () => {
      await this.options.adapter.init(credentials);
      return this.options.adapter;
    });

    const { error, value: adapter } = this.authenticatedAdapter;

    if (error || !adapter)
      await this.options.storage.reset(this.options.platformName);
    else {
      this.options.rootStore.alert.set({
        type: "success",
        message: "Successfully authenticated!",
      });
      this.getProjects();
      if (!this.selectedTask) this.setTaskNotSelectedError();
      this.options.storage.set(this.options.platformName, adapter.credentials);
    }
  }

  async getProjects() {
    await AsyncStateManager.updateState(this.projects, async () =>
      this.authenticatedAdapter.value?.getProjects()
    );

    if (this.projects.error) return;

    if (!this.selectedProject) await this.loadStoredSelectedProject();

    if (
      this.selectedProject &&
      this.projects.value?.map(({ id }) => id).includes(this.selectedProject)
    ) {
      this.getTasks(this.selectedProject);
    }
  }

  async getTasks(projectId: Task["projectId"]) {
    await AsyncStateManager.updateState(this.tasks, async () =>
      this.authenticatedAdapter.value?.getTasks(projectId)
    );

    if (!this.tasks.error && !this.selectedTask)
      await this.loadStoredSelectedTask();
  }

  async getTimeEntries() {
    if (!this.selectedTask) this.setTaskNotSelectedError();
    else {
      await AsyncStateManager.updateState(this.timeEntries, async () => {
        const entries = await this.authenticatedAdapter.value?.getTimeEntries(
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
    this.options.storage.set(
      `${this.options.platformName}_selectedProject`,
      id
    );
    this.setTaskNotSelectedError();
    this.getTasks(id);
  }

  setSelectedTask(id: Task["id"]) {
    if (id === this.selectedTask) return;
    this.selectedTask = id;
    this.options.storage.set(`${this.options.platformName}_selectedTask`, id);
    this.getTimeEntries();
  }

  setTaskNotSelectedError() {
    this.timeEntries = {
      error: new Error(
        `Please select the target task in ${this.options.platformName}.`
      ),
      isLoading: false,
    };
  }

  setTimeEntriesSelection(selection: Array<string>) {
    this.timeEntriesSelection = selection;
  }
}

type Options<C extends AdapterCredentials> = {
  rootStore: RootStore<{}, C>;
  platformName: string;
  adapter: TargetAdapter<C>;
  storage: Storage;
};
