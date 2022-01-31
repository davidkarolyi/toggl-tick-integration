import { autorun, makeAutoObservable, when } from "mobx";

import {
  AdapterCredentials,
  SourceAdapter,
  TimeEntry,
} from "../adapters/types";
import { RootStore } from "./types";
import { AsyncState } from "./async";
import { CredentialStorage } from "../storage/types";

export class SourceStore<C extends AdapterCredentials> {
  authenticatedAdapter: AsyncState<SourceAdapter<C>> = new AsyncState();
  timeEntries: AsyncState<Array<TimeEntry>> = new AsyncState();
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
    this.authenticatedAdapter.reset();
    this.timeEntries.reset();
    this.timeEntriesSelection = [];
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
      this.getTimeEntries();
      this.options.credentialStorage.set(
        this.options.platformName,
        this.authenticatedAdapter.value.credentials
      );
    }
  }

  async getTimeEntries() {
    await this.timeEntries.update(async () => {
      if (!this.authenticatedAdapter.value)
        throw new Error("Haven't authenticated yet");
      const entries = await this.authenticatedAdapter.value?.getTimeEntries(
        ...this.options.rootStore.integration.dateRange
      );
      return entries;
    });

    if (!this.timeEntries.error)
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
  credentialStorage: CredentialStorage;
};
