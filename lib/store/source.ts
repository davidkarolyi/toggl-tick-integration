import { makeAutoObservable, runInAction } from "mobx";

import {
  AdapterCredentials,
  SourceAdapter,
  TimeEntry,
} from "../adapters/types";
import { AsyncState, RootStore } from "./types";
import { Storage } from "../storage/types";
import { AsyncStateManager } from "./helpers/async";

export class SourceStore<C extends AdapterCredentials> {
  authenticatedAdapter: AsyncState<SourceAdapter<C>> =
    AsyncStateManager.defaultState();
  timeEntries: AsyncState<Array<TimeEntry>> = AsyncStateManager.defaultState();
  timeEntriesSelection: Array<string> = [];

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

  forgetCredentials() {
    this.options.storage.reset(this.options.platformName);
    this.authenticatedAdapter = AsyncStateManager.defaultState();
    this.timeEntriesSelection = [];
    this.timeEntries = AsyncStateManager.defaultState();
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
      this.getTimeEntries();
      this.options.storage.set(this.options.platformName, adapter.credentials);
    }
  }

  async getTimeEntries() {
    await AsyncStateManager.updateState(this.timeEntries, async () => {
      const entries = await this.authenticatedAdapter.value?.getTimeEntries(
        ...this.options.rootStore.integration.dateRange
      );
      return entries;
    });

    if (!this.authenticatedAdapter.error)
      this.options.rootStore.integration.selectDifferences();
  }

  setTimeEntriesSelection(selection: Array<string>) {
    this.timeEntriesSelection = selection;
  }
}

type Options<C extends AdapterCredentials> = {
  rootStore: RootStore<C>;
  platformName: string;
  adapter: SourceAdapter<C>;
  storage: Storage;
};
