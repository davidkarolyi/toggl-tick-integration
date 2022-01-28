import { makeAutoObservable } from "mobx";
import { Alert } from "./types";

export class AlertStore {
  value: Alert | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  set(alert: Alert | null) {
    this.value = alert;
  }
}
