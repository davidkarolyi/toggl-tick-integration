import { makeAutoObservable } from "mobx";
import { AsyncState } from "./async";
import { Alert } from "./types";

export class AlertStore {
  value: Alert | null = null;

  constructor() {
    makeAutoObservable(this);
    AsyncState.onError((error) => {
      this.set({ type: "error", message: (error as Error).message });
    });
  }

  set(alert: Alert | null) {
    this.value = alert;
  }
}
