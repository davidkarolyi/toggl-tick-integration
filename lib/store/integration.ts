import { makeAutoObservable } from "mobx";

import { AdapterCredentials, TimeEntry } from "../adapters/types";
import { isSameDay } from "date-fns";
import { AsyncState, DateRange, RootStore } from "./types";
import { TransactionResult } from "../transaction/types";
import { Transaction } from "../transaction/transaction";
import { AsyncStateManager } from "./helpers/async";
import { defaultDateRange } from "./helpers/date_range";

export class IntegrationStore<
  S extends AdapterCredentials,
  T extends AdapterCredentials
> {
  dateRange: DateRange = defaultDateRange();
  submissionResult: AsyncState<TransactionResult> =
    AsyncStateManager.defaultState();
  refreshState: AsyncState<void> = AsyncStateManager.defaultState();

  constructor(readonly options: Options<S, T>) {
    makeAutoObservable(this);
  }

  get alreadySyncedSourceEntries(): Array<string> {
    return (
      this.options.rootStore.source.timeEntries.value
        ?.filter(this.isSourceEntryAlreadySynchronized.bind(this))
        .map(({ id }) => id) || []
    );
  }

  get targetEntriesNotExistingInSource(): Array<string> {
    return (
      this.options.rootStore.target.timeEntries.value
        ?.filter((entry) => !this.doesTargetEntryExistsInSource(entry))
        .map(({ id }) => id) || []
    );
  }

  get isSubmitable(): boolean {
    const { source, target } = this.options.rootStore;

    const atLeastOneItemSelected = Boolean(
      source.timeEntriesSelection.length ||
        (target.timeEntriesSelection.length && target.isDeletionAllowed)
    );

    return (
      source.isAuthenticated &&
      target.isAuthenticated &&
      Boolean(target.selectedTask) &&
      atLeastOneItemSelected
    );
  }

  setDateRange(dateRange: DateRange) {
    const { target, source } = this.options.rootStore;

    this.dateRange = dateRange;
    if (target.authenticatedAdapter.value && target.selectedTask)
      target.getTimeEntries();
    if (source.authenticatedAdapter.value) source.getTimeEntries();
  }

  refresh() {
    AsyncStateManager.updateState(this.refreshState, async () => {
      const { target, source } = this.options.rootStore;

      await Promise.all([source.getTimeEntries(), target.getTimeEntries()]);

      this.selectDifferences();
    });
  }

  async submit() {
    const { target, source } = this.options.rootStore;

    await AsyncStateManager.updateState(this.submissionResult, () => {
      const transaction = new Transaction(target.options.adapter);

      source.timeEntries.value
        ?.filter(({ id }) => source.timeEntriesSelection.includes(id))
        .forEach((entry) =>
          transaction.create({ ...entry, taskId: target.selectedTask })
        );
      if (target.isDeletionAllowed)
        target.timeEntries.value
          ?.filter(({ id }) => target.timeEntriesSelection.includes(id))
          .forEach((entry) => transaction.delete(entry));

      return transaction.execute();
    });

    this.setSubmissionResultAlert();
    target.getTimeEntries();
  }

  private setSubmissionResultAlert() {
    if (!this.submissionResult.value) return;
    const { alert, target } = this.options.rootStore;
    const result = this.submissionResult.value;

    if (!result.failedToCreate.length && !result.failedToDelete.length) {
      return alert.set({
        type: "success",
        message: `Successfully applied all changes to ${target.name}`,
      });
    }

    let message = "";
    if (result.failedToCreate.length && !result.failedToDelete.length)
      message = `Failed to create ${result.failedToCreate.length} entries in`;
    else if (!result.failedToCreate.length && result.failedToDelete.length)
      message = `Failed to delete ${result.failedToDelete.length} entries from`;
    else
      message = `Failed to create ${result.failedToCreate.length}, and delete ${result.failedToDelete.length} entries from`;
    message += ` ${target.name}. Check the browser console for more details.`;

    alert.set({
      type: "warning",
      message,
    });

    console.error({ ...result });
  }

  selectDifferences() {
    const { source, target } = this.options.rootStore;

    const notSyncedEntries =
      source.timeEntries.value
        ?.filter((entry) => !this.isSourceEntryAlreadySynchronized(entry))
        .map(({ id }) => id) || [];

    source.setTimeEntriesSelection(notSyncedEntries);
    target.setTimeEntriesSelection(this.targetEntriesNotExistingInSource);
  }

  private isSourceEntryAlreadySynchronized(entry: TimeEntry): boolean {
    const { target } = this.options.rootStore;

    return (
      target.timeEntries.value?.some((targetEntry) =>
        this.areEntriesSimilar(entry, targetEntry)
      ) || false
    );
  }

  private doesTargetEntryExistsInSource(entry: TimeEntry): boolean {
    const { source } = this.options.rootStore;
    return (
      source.timeEntries.value?.some((sourceEntry) =>
        this.areEntriesSimilar(entry, sourceEntry)
      ) || false
    );
  }

  private areEntriesSimilar(entryA: TimeEntry, entryB: TimeEntry): boolean {
    return (
      entryA.description.trim() === entryB.description.trim() &&
      isSameDay(entryA.date, entryB.date) &&
      Math.abs(entryA.durationInSeconds - entryB.durationInSeconds) < 60
    );
  }
}

type Options<S extends AdapterCredentials, T extends AdapterCredentials> = {
  rootStore: RootStore<S, T>;
};