import { AxiosError } from "axios";
import { makeAutoObservable } from "mobx";
import { AsyncStateManager } from "./helpers/async";
import { Alert } from "./types";

export class AlertStore {
  value: Alert | null = null;

  constructor() {
    makeAutoObservable(this);

    AsyncStateManager.onError((error) => {
      const axiosError = error as AxiosError;
      if (axiosError.isAxiosError && axiosError.response?.data) {
        this.set({
          type: "error",
          message: `${axiosError.message}. Check the browser console for detailed error response.`,
        });
        console.error(axiosError.response.data);
      } else
        this.set({
          type: "error",
          message: (error as Error).message,
        });
    });
  }

  set(alert: Alert | null) {
    this.value = alert;
  }
}
