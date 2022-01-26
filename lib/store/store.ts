import { makeAutoObservable, runInAction } from "mobx";

import {
  AdapterCredentials,
  Project,
  SourceAdapter,
  TargetAdapter,
  Task,
  TimeEntry,
} from "../adapters/types";
import { endOfMonth, isSameDay, startOfMonth, subMonths } from "date-fns";
import { Alert, AsyncState, DateRange, StoreOptions } from "./types";
import { AxiosError } from "axios";

export class Store<S extends AdapterCredentials, T extends AdapterCredentials> {
  alert: Alert | null = null;
  dateRange: DateRange = defaultDateRange();

  source: AsyncState<SourceAdapter<S>> = { isLoading: false };
  sourceTimeEntries: AsyncState<Array<TimeEntry>> = {
    isLoading: false,
  };
  sourceTimeEntriesSelection: Array<string> = [];

  target: AsyncState<TargetAdapter<T>> = { isLoading: false };
  targetProjects: AsyncState<Array<Project>> = { isLoading: false };
  targetTasks: AsyncState<Array<Task>> = { isLoading: false };
  selectedTargetProject: Project["id"] = "";
  selectedTargetTask: Task["id"] = "";
  targetTimeEntries: AsyncState<Array<TimeEntry>> = {
    isLoading: false,
  };

  submissionState: AsyncState<{
    failed: Array<{ entry: TimeEntry; error: Error }>;
    submitted: Array<TimeEntry>;
  }> = { isLoading: false };

  constructor(private readonly options: StoreOptions<S, T>) {
    makeAutoObservable(this);
  }

  get isAuthenticated(): boolean {
    return Boolean(this.target.value && this.source.value);
  }

  get alreadySyncedSourceEntries(): Array<string> {
    return (
      this.sourceTimeEntries.value
        ?.filter(this.isEntryAlreadySynchronized.bind(this))
        .map(({ id }) => id) || []
    );
  }

  setAlert(alert: Alert | null) {
    this.alert = alert;
  }

  setDateRange(dateRange: DateRange) {
    this.dateRange = dateRange;
    if (this.target.value && this.selectedTargetTask)
      this.getTargetTimeEntries();
    if (this.source.value) this.getSourceTimeEntries();
  }

  setTargetTask(taskId: Task["id"]) {
    this.selectedTargetTask = taskId;
    this.getTargetTimeEntries();
  }

  setTargetProject(projectId: Project["id"]) {
    this.selectedTargetProject = projectId;
    this.getTargetTasks(projectId);
  }

  async loadStoredCredentials() {
    const [sourceCredentials, targetCredentials] = await Promise.all([
      this.options.credentialStorage.get<S>(this.options.source.name),
      this.options.credentialStorage.get<T>(this.options.target.name),
    ]);

    if (sourceCredentials) this.authSource(sourceCredentials);
    if (targetCredentials) this.authTarget(targetCredentials);
  }

  forgetSourceCredentials() {
    this.options.credentialStorage.reset(this.options.source.name);
    this.source = { isLoading: false };
    this.sourceTimeEntriesSelection = [];
    this.sourceTimeEntries = { isLoading: false };
  }

  forgetTargetCredentials() {
    this.options.credentialStorage.reset(this.options.target.name);
    this.target = { isLoading: false };
    this.selectedTargetTask = "";
    this.selectedTargetProject = "";
    this.targetProjects = { isLoading: false };
    this.targetTasks = { isLoading: false };
    this.targetTimeEntries = { isLoading: false };
  }

  async authTarget(credentials: T) {
    const { error, value: adapter } = await this.asyncAction(
      this.target,
      async () => {
        await this.options.target.adapter.init(credentials);
        return this.options.target.adapter;
      }
    );

    if (error || !adapter)
      await this.options.credentialStorage.reset(this.options.target.name);
    else {
      this.setAlert({
        type: "success",
        message: "Successfully authenticated!",
      });
      this.getTargetProjects();
      if (!this.selectedTargetTask) this.setTargetTaskNotSelectedError();
      this.options.credentialStorage.set(
        this.options.target.name,
        adapter.credentials
      );
    }
  }

  async authSource(credentials: S) {
    const { error, value: adapter } = await this.asyncAction(
      this.source,
      async () => {
        await this.options.source.adapter.init(credentials);
        return this.options.source.adapter;
      }
    );

    if (error || !adapter)
      await this.options.credentialStorage.reset(this.options.source.name);
    else {
      this.setAlert({
        type: "success",
        message: "Successfully authenticated!",
      });
      this.getSourceTimeEntries();
      this.options.credentialStorage.set(
        this.options.source.name,
        adapter.credentials
      );
    }
  }

  async getTargetProjects() {
    const { error, value: projects } = await this.asyncAction(
      this.targetProjects,
      async () => this.target.value?.getProjects()
    );

    if (
      !error &&
      this.selectedTargetProject &&
      projects?.map(({ id }) => id).includes(this.selectedTargetProject)
    ) {
      this.getTargetTasks(this.selectedTargetProject);
    }
  }

  getTargetTasks(projectId: Task["projectId"]) {
    this.asyncAction(this.targetTasks, async () =>
      this.target.value?.getTasks(projectId)
    );
  }

  async getTargetTimeEntries() {
    if (!this.selectedTargetTask) this.setTargetTaskNotSelectedError();
    else {
      const { error } = await this.asyncAction(
        this.targetTimeEntries,
        async () => {
          const entries = await this.target.value?.getTimeEntries(
            ...this.dateRange
          );
          return entries?.filter(
            (entry) => entry.taskId === this.selectedTargetTask
          );
        }
      );

      if (!error) this.selectAllNonSyncedEntries();
    }
  }

  async getSourceTimeEntries() {
    const { error } = await this.asyncAction(
      this.sourceTimeEntries,
      async () => {
        const entries = await this.source.value?.getTimeEntries(
          ...this.dateRange
        );
        return entries;
      }
    );

    if (!error) this.selectAllNonSyncedEntries();
  }

  setTargetTaskNotSelectedError() {
    this.targetTimeEntries = {
      error: new Error(
        `Please select the target task in ${this.options.target.name}.`
      ),
      isLoading: false,
    };
  }

  setSourceTimeEntriesSelection(selection: Array<string>) {
    this.sourceTimeEntriesSelection = selection;
  }

  async submitSelectedEntries() {
    const { value, error } = await this.asyncAction(
      this.submissionState,
      async () => {
        if (!this.sourceTimeEntries.value) {
          throw new Error("There are no time entries to submit.");
        }

        const submitted: Array<TimeEntry> = [];
        const failed: Array<{ entry: TimeEntry; error: Error }> = [];

        for (const entry of this.sourceTimeEntries.value) {
          try {
            if (this.sourceTimeEntriesSelection.includes(entry.id)) {
              await this.target.value?.createTimeEntry({
                ...entry,
                taskId: this.selectedTargetTask,
              });
              submitted.push(entry);
            }
          } catch (error) {
            failed.push({ entry, error: error as Error });
          }
        }

        return { failed, submitted };
      }
    );

    if (!error && value?.submitted.length) this.getTargetTimeEntries();

    if (!value?.failed.length) {
      this.setAlert({
        type: "success",
        message: `Successfully created all ${
          value!.submitted.length
        } entries in ${this.options.target.name}.`,
      });
    } else {
      this.setAlert({
        type: "warning",
        message: `Failed to create ${value?.failed.length} entries, created ${
          value?.submitted.length
        }/${
          value!.submitted.length + value!.failed.length
        }. Check the browser console for detailed error messages.`,
      });
      console.error(value);
    }
  }

  private selectAllNonSyncedEntries() {
    const selection =
      this.sourceTimeEntries.value
        ?.filter((entry) => !this.isEntryAlreadySynchronized(entry))
        .map(({ id }) => id) || [];
    this.setSourceTimeEntriesSelection(selection);
  }

  private isEntryAlreadySynchronized(entry: TimeEntry): boolean {
    return (
      this.targetTimeEntries.value?.some(
        (targetEntry) =>
          targetEntry.description.trim() === entry.description.trim() &&
          isSameDay(targetEntry.date, entry.date) &&
          Math.abs(targetEntry.durationInSeconds - entry.durationInSeconds) < 60
      ) || false
    );
  }

  private async asyncAction<T>(
    state: AsyncState<T>,
    action: () => Promise<T>
  ): Promise<AsyncState<T>> {
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
        this.setAlert({
          type: "error",
          message: `${axiosError.message}. Check the browser console for detailed error response.`,
        });
        console.error(axiosError.response.data);
      } else
        this.setAlert({ type: "error", message: (error as Error).message });

      runInAction(() => {
        state.isLoading = false;
        state.error = error as Error;
      });
    }
    return state;
  }
}

function defaultDateRange(): DateRange {
  const now = new Date();
  const previousMonth = subMonths(now, 1);

  if (now.getDate() <= 10)
    return [startOfMonth(previousMonth), endOfMonth(previousMonth)];
  else return [startOfMonth(now), endOfMonth(now)];
}
