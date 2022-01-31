import { runInAction } from "mobx";
import { AsyncState } from "../types";

export class AsyncStateManager {
  private static defaultErrorHandler?: (error: unknown) => void;

  static onError(callback: (error: unknown) => void) {
    AsyncStateManager.defaultErrorHandler = callback;
  }

  static defaultState<T, Err = Error>(): AsyncState<T, Err> {
    return {
      isLoading: false,
    };
  }

  static async updateState<T, Err>(
    state: AsyncState<T, Err>,
    populator: () => Promise<T>
  ) {
    runInAction(() => {
      state.isLoading = true;
    });

    try {
      const value = await populator();
      runInAction(() => {
        state.value = value;
        state.error = undefined;
      });
    } catch (error) {
      runInAction(() => {
        state.error = error as Err;
      });
      if (AsyncStateManager.defaultErrorHandler)
        AsyncStateManager.defaultErrorHandler(error);
    } finally {
      runInAction(() => {
        state.isLoading = false;
      });
    }
  }
}
