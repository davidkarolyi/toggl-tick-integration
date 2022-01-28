import { TimeEntry } from "../adapters/types";

export type TransactionResult = {
  created: Array<TimeEntry>;
  failedToCreate: Array<{ entry: TimeEntry; error: Error }>;
  deleted: Array<TimeEntry>;
  failedToDelete: Array<{ entry: TimeEntry; error: Error }>;
};
