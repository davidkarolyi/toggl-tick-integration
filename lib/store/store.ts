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
  allowDeletionFromTarget: boolean = false;
  targetTimeEntriesSelection: Array<string> = [];

  submissionResult: AsyncState<{
    created: Array<TimeEntry>;
    failedToCreate: Array<{ entry: TimeEntry; error: Error }>;
    deleted: Array<TimeEntry>;
    failedToDelete: Array<{ entry: TimeEntry; error: Error }>;
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

  get isSubmitable(): boolean {
    const atLeastOneItemSelected = Boolean(
      this.sourceTimeEntriesSelection.length ||
        (this.targetTimeEntriesSelection.length && this.allowDeletionFromTarget)
    );

    return (
      this.isAuthenticated &&
      Boolean(this.selectedTargetTask) &&
      atLeastOneItemSelected
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
    if (projectId === this.selectedTargetProject) return;
    this.selectedTargetProject = projectId;
    this.targetTimeEntriesSelection = [];
    this.allowDeletionFromTarget = false;
    this.selectedTargetTask = "";
    this.setTargetTaskNotSelectedError();
    this.getTargetTasks(projectId);
  }

  toggleAllowDeletionFromTarget() {
    this.targetTimeEntriesSelection = [];
    this.allowDeletionFromTarget = !this.allowDeletionFromTarget;
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
    this.targetTimeEntriesSelection = [];
    this.allowDeletionFromTarget = false;
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

  setTargetTimeEntriesSelection(selection: Array<string>) {
    this.targetTimeEntriesSelection = selection;
  }

  async submitSelectedEntries() {
    const { error } = await this.asyncAction(
      this.submissionResult,
      async () => {
        const created: Array<TimeEntry> = [];
        const failedToCreate: Array<{ entry: TimeEntry; error: Error }> = [];
        const deleted: Array<TimeEntry> = [];
        const failedToDelete: Array<{ entry: TimeEntry; error: Error }> = [];

        for (const entry of this.sourceTimeEntries.value || []) {
          try {
            if (this.sourceTimeEntriesSelection.includes(entry.id)) {
              await this.target.value?.createTimeEntry({
                ...entry,
                taskId: this.selectedTargetTask,
              });
              created.push(entry);
            }
          } catch (error) {
            failedToCreate.push({ entry, error: error as Error });
          }
        }

        for (const entry of this.targetTimeEntries.value || []) {
          try {
            if (this.targetTimeEntriesSelection.includes(entry.id)) {
              await this.target.value?.deleteTimeEntry(entry.id);
              deleted.push(entry);
            }
          } catch (error) {
            failedToDelete.push({ entry, error: error as Error });
          }
        }

        return { failedToCreate, created, deleted, failedToDelete };
      }
    );

    if (!error) {
      this.setSubmissionResultAlert();
      this.getTargetTimeEntries();
    }
  }

  private setSubmissionResultAlert() {
    if (!this.submissionResult.value) return;
    const result = this.submissionResult.value;

    if (!result.failedToCreate.length && !result.failedToDelete.length) {
      return this.setAlert({
        type: "success",
        message: `Successfully applied all changes to ${this.options.target.name}`,
      });
    }

    let message = "";
    if (result.failedToCreate.length && !result.failedToDelete.length)
      message = `Failed to create ${result.failedToCreate.length} entries in`;
    else if (!result.failedToCreate.length && result.failedToDelete.length)
      message = `Failed to delete ${result.failedToDelete.length} entries from`;
    else
      message = `Failed to create ${result.failedToCreate.length}, and delete ${result.failedToDelete.length} entries from`;
    message += ` ${this.options.target.name}. Check the browser console for more details.`;

    this.setAlert({
      type: "warning",
      message,
    });

    console.error({ ...result });
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
