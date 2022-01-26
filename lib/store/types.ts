import { AlertColor } from "@mui/material";
import {
  AdapterCredentials,
  SourceAdapter,
  TargetAdapter,
} from "../adapters/types";
import { CredentialStorage } from "../storage/types";

export type StoreOptions<
  S extends AdapterCredentials,
  T extends AdapterCredentials
> = {
  credentialStorage: CredentialStorage;
  source: {
    name: string;
    adapter: SourceAdapter<S>;
  };
  target: {
    name: string;
    adapter: TargetAdapter<T>;
  };
};

export type AsyncState<T> = {
  isLoading: boolean;
  value?: T;
  error?: Error;
};

export type Alert = { type: AlertColor; message: string };

export type DateRange = [Date, Date];
