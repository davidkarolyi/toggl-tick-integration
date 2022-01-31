import { AlertColor } from "@mui/material";
import { AdapterCredentials } from "../adapters/types";
import { AlertStore } from "./alert";
import { IntegrationStore } from "./integration";
import { SourceStore } from "./source";
import { TargetStore } from "./target";

export interface RootStore<
  S extends AdapterCredentials = {},
  T extends AdapterCredentials = {}
> {
  alert: AlertStore;
  source: SourceStore<S>;
  target: TargetStore<T>;
  integration: IntegrationStore<S, T>;
}

export type AsyncState<T, Err = Error> = {
  isLoading: boolean;
  value?: T;
  error?: Err;
};

export type Alert = { type: AlertColor; message: string };

export type DateRange = [Date, Date];
