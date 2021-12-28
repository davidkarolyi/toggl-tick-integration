import { createContext, useContext } from "react";
import { makeAutoObservable, runInAction } from "mobx";
import { AlertColor } from "@mui/material";
import {
  Project,
  ReaderAdapter,
  Task,
  TimeEntry,
  WriterAdapter,
} from "./adapters/types";
import { TogglAdapter } from "./adapters/toggl";
import { TickAdapter } from "./adapters/tick";
import { startOfToday, subWeeks } from "date-fns";
import { DateRange } from "@mui/lab";

export class Store {
  alert: Alert | null = null;
  dateRange: DateRange<Date> = [subWeeks(startOfToday(), 2), startOfToday()];

  tick: AsyncState<ReaderAdapter & WriterAdapter> = { isLoading: false };
  toggl: AsyncState<ReaderAdapter> = { isLoading: false };

  tickProjects: AsyncState<Array<Project>> = { isLoading: false };
  tickTasks: AsyncState<Array<Task>> = { isLoading: false };

  targetProject: Project["id"] = "";
  targetTask: Task["id"] = "";

  togglTimeEntries: AsyncState<Array<TimeEntry>> = {
    isLoading: false,
  };
  togglTimeEntriesSelection: Array<string> = [];
  tickTimeEntries: AsyncState<Array<TimeEntry>> = {
    isLoading: false,
  };

  submissionState: AsyncState<{
    failed: Array<{ entry: TimeEntry; error: Error }>;
    submitted: Array<TimeEntry>;
  }> = { isLoading: false };

  constructor() {
    makeAutoObservable(this);
  }

  get isAuthenticated(): boolean {
    return Boolean(this.tick.value && this.toggl.value);
  }

  setAlert(alert: Alert | null) {
    this.alert = alert;
  }

  setDateRange(dateRange: DateRange<Date>) {
    this.dateRange = dateRange;
    if (this.tick.value && this.targetTask) this.getTickTimeEntries();
    if (this.toggl.value) this.getTogglTimeEntries();
  }

  setTargetTask(taskId: Task["id"]) {
    this.targetTask = taskId;
    this.getTickTimeEntries();
  }

  setTargetProject(projectId: Project["id"]) {
    this.targetProject = projectId;
    this.getTickTasks(projectId);
  }

  async authTick(email: string, password: string) {
    const { error } = await this.asyncAction(this.tick, () =>
      TickAdapter.init(email, password)
    );
    if (!error) {
      this.setAlert({
        type: "success",
        message: "Successfully authenticated!",
      });
      this.getTickProjects();
      if (!this.targetTask) this.setTargetTaskNotSelectedError();
    }
  }

  async authToggl(token: string) {
    const { error } = await this.asyncAction(this.toggl, async () =>
      TogglAdapter.init(token)
    );

    if (!error) {
      this.setAlert({
        type: "success",
        message: "Successfully authenticated!",
      });
      this.getTogglTimeEntries();
    }
  }

  async getTickProjects() {
    const { error, value: projects } = await this.asyncAction(
      this.tickProjects,
      async () => this.tick.value?.getProjects()
    );

    if (
      !error &&
      this.targetProject &&
      projects?.map(({ id }) => id).includes(this.targetProject)
    ) {
      this.getTickTasks(this.targetProject);
    }
  }

  getTickTasks(projectId: Task["projectId"]) {
    this.asyncAction(this.tickTasks, async () =>
      this.tick.value?.getTasks(projectId)
    );
  }

  getTickTimeEntries() {
    if (!this.targetTask) this.setTargetTaskNotSelectedError();
    else {
      this.asyncAction(this.tickTimeEntries, async () => {
        const entries = await this.tick.value?.getTimeEntries(
          this.dateRange[0] as Date,
          this.dateRange[1] as Date
        );
        return entries?.filter((entry) => entry.taskId === this.targetTask);
      });
    }
  }

  async getTogglTimeEntries() {
    const { value: entries, error } = await this.asyncAction(
      this.togglTimeEntries,
      async () => {
        const entries = await this.toggl.value?.getTimeEntries(
          this.dateRange[0] as Date,
          this.dateRange[1] as Date
        );
        return entries;
      }
    );

    if (!error && entries) {
      // select all time entries by default
      this.setTogglTimeEntriesSelection(entries.map((entry) => entry.id));
    }
  }

  setTargetTaskNotSelectedError() {
    this.tickTimeEntries = {
      error: new Error("Please select the target task in Tick."),
      isLoading: false,
    };
  }

  setTogglTimeEntriesSelection(selection: Array<string>) {
    this.togglTimeEntriesSelection = selection;
  }

  async submitSelectedEntries() {
    const { value, error } = await this.asyncAction(
      this.submissionState,
      async () => {
        if (!this.togglTimeEntries.value) {
          throw new Error("There are no time entries to submit.");
        }

        const submitted: Array<TimeEntry> = [];
        const failed: Array<{ entry: TimeEntry; error: Error }> = [];

        for (const entry of this.togglTimeEntries.value) {
          try {
            if (this.togglTimeEntriesSelection.includes(entry.id)) {
              await this.tick.value?.createTimeEntry({
                ...entry,
                taskId: this.targetTask,
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

    if (!error && value?.submitted.length) this.getTickTimeEntries();

    if (!value?.failed.length) {
      this.setAlert({
        type: "success",
        message: `Successfully created all ${
          value!.submitted.length
        } entries in Tick.`,
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
      this.setAlert({ type: "error", message: (error as Error).message });
      runInAction(() => {
        state.isLoading = false;
        state.error = error as Error;
      });
    }
    return state;
  }
}

const store = new Store();

// React Context
const storeContext = createContext(store);
export const useStore = () => useContext(storeContext);

// Types
export type AsyncState<T> = {
  isLoading: boolean;
  value?: T;
  error?: Error;
};

export type Alert = { type: AlertColor; message: string };

export type Platform = "toggl" | "tick";
