import { makeAutoObservable, runInAction } from "mobx";

import {
  AdapterCredentials,
  SourceAdapter,
  TimeEntry,
} from "../adapters/types";
import { AsyncState, RootStore } from "./types";
import { AxiosError } from "axios";
import { CredentialStorage } from "../storage/types";

export class SourceStore<C extends AdapterCredentials> {
  authenticatedAdapter: AsyncState<SourceAdapter<C>> = { isLoading: false };
  timeEntries: AsyncState<Array<TimeEntry>> = {
    isLoading: false,
  };
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
    const credentials = await this.options.credentialStorage.get<C>(
      this.options.platformName
    );
    if (credentials) this.auth(credentials);
  }

  forgetCredentials() {
    this.options.credentialStorage.reset(this.options.platformName);
    this.authenticatedAdapter = { isLoading: false };
    this.timeEntriesSelection = [];
    this.timeEntries = { isLoading: false };
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
      this.getTimeEntries();
      this.options.credentialStorage.set(
        this.options.platformName,
        adapter.credentials
      );
    }
  }

  async getTimeEntries() {
    const { error } = await this.asyncAction(this.timeEntries, async () => {
      const entries = await this.authenticatedAdapter.value?.getTimeEntries(
        ...this.options.rootStore.integration.dateRange
      );
      return entries;
    });

    if (!error) this.options.rootStore.integration.selectDifferences();
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
  rootStore: RootStore<C>;
  platformName: string;
  adapter: SourceAdapter<C>;
  credentialStorage: CredentialStorage;
};
