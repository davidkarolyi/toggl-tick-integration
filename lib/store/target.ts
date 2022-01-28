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

export class TargetStore<C extends AdapterCredentials> {
  authenticatedAdapter: AsyncState<TargetAdapter<C>> = { isLoading: false };
  projects: AsyncState<Array<Project>> = { isLoading: false };
  tasks: AsyncState<Array<Task>> = { isLoading: false };
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
    this.authenticatedAdapter = { isLoading: false };
    this.selectedTask = "";
    this.selectedProject = "";
    this.projects = { isLoading: false };
    this.tasks = { isLoading: false };
    this.timeEntries = { isLoading: false };
    this.timeEntriesSelection = [];
    this.isDeletionAllowed = false;
  }

  async auth(credentials: C) {
    const { error, value: adapter } = await this.asyncAction(
      this.authenticatedAdapter,
      async () => {
        await this.options.adapter.init(credentials);
        return this.options.adapter;
      }
    );

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
    const { error, value: projects } = await this.asyncAction(
      this.projects,
      async () => this.authenticatedAdapter.value?.getProjects()
    );

    if (
      !error &&
      this.selectedProject &&
      projects?.map(({ id }) => id).includes(this.selectedProject)
    ) {
      this.getTasks(this.selectedProject);
    }
  }

  getTasks(projectId: Task["projectId"]) {
    this.asyncAction(this.tasks, async () =>
      this.authenticatedAdapter.value?.getTasks(projectId)
    );
  }

  async getTimeEntries() {
    if (!this.selectedTask) this.setTaskNotSelectedError();
    else {
      const { error } = await this.asyncAction(this.timeEntries, async () => {
        const entries = await this.authenticatedAdapter.value?.getTimeEntries(
          ...this.options.rootStore.integration.dateRange
        );
        return entries?.filter((entry) => entry.taskId === this.selectedTask);
      });

      if (!error) this.options.rootStore.integration.selectDifferences();
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

  private async asyncAction<V>(
    state: AsyncState<V>,
    action: () => Promise<V>
  ): Promise<AsyncState<V>> {
    state.isLoading = true;
    try {
      const value = await action();
      runInAction(() => {
        state.isLoading = false;
        state.value = value;
        state.error = undefined;
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.isAxiosError && axiosError.response?.data) {
        this.options.rootStore.alert.set({
          type: "error",
          message: `${axiosError.message}. Check the browser console for detailed error response.`,
        });
        console.error(axiosError.response.data);
      } else
        this.options.rootStore.alert.set({
          type: "error",
          message: (error as Error).message,
        });

      runInAction(() => {
        state.isLoading = false;
        state.error = error as Error;
      });
    }
    return state;
  }
}

type Options<C extends AdapterCredentials> = {
  rootStore: RootStore<{}, C>;
  platformName: string;
  adapter: TargetAdapter<C>;
  credentialStorage: CredentialStorage;
};
