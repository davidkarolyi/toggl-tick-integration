import { makeAutoObservable, runInAction } from "mobx";

import {
  AdapterCredentials,
  Project,
  TargetAdapter,
  Task,
  TimeEntry,
} from "../adapters/types";
import { AsyncState, RootStore } from "./types";
import { AxiosError } from "axios";
import { CredentialStorage } from "../storage/types";
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
    const credentials = await this.options.credentialStorage.get<C>(
      this.options.platformName
    );

    if (credentials) this.auth(credentials);
  }

  forgetCredentials() {
    this.options.credentialStorage.reset(this.options.platformName);
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
        adapter.credentials
      );
    }
  }

  async getProjects() {
    await AsyncStateManager.updateState(this.projects, async () =>
      this.authenticatedAdapter.value?.getProjects()
    );

    if (
      !this.projects.error &&
      this.selectedProject &&
      this.projects.value?.map(({ id }) => id).includes(this.selectedProject)
    ) {
      this.getTasks(this.selectedProject);
    }
  }

  getTasks(projectId: Task["projectId"]) {
    AsyncStateManager.updateState(this.tasks, async () =>
      this.authenticatedAdapter.value?.getTasks(projectId)
    );
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
    this.setTaskNotSelectedError();
    this.getTasks(id);
  }

  setSelectedTask(id: Task["id"]) {
    this.selectedTask = id;
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
  credentialStorage: CredentialStorage;
};
