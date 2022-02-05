import {
  AdapterCredentials,
  TargetAdapter,
  TimeEntry,
} from "../adapters/types";
import { TransactionResult } from "./types";

export class Transaction<C extends AdapterCredentials> {
  private result?: TransactionResult;
  private entriesToDelete: Array<TimeEntry> = [];
  private entriesToCreate: Array<TimeEntry> = [];

  constructor(private readonly target: TargetAdapter<C>) {}

  delete(entry: TimeEntry) {
    this.entriesToDelete.push(entry);
  }

  create(entry: TimeEntry) {
    this.entriesToCreate.push(entry);
  }

  async execute(): Promise<TransactionResult> {
    if (!this.target.isAuthenticated)
      throw new Error("Target adapter haven't authenticated yet");
    if (this.result) throw new Error("Transaction was already executed");

    this.result = {
      created: [],
      failedToCreate: [],
      deleted: [],
      failedToDelete: [],
    };

    await this.deleteEntries();
    await this.createEntries();

    return this.result;
  }

  private async deleteEntries() {
    for (const entry of this.entriesToDelete) {
      try {
        await this.target.deleteTimeEntry(entry.id);
        this.result!.deleted.push(entry);
      } catch (error) {
        this.result!.failedToDelete.push({ entry, error: error as Error });
      }
    }
  }

  private async createEntries() {
    for (const entry of this.entriesToCreate) {
      try {
        await this.target.createTimeEntry(entry);
        this.result!.created.push(entry);
      } catch (error) {
        this.result!.failedToCreate.push({ entry, error: error as Error });
      }
    }
  }
}
