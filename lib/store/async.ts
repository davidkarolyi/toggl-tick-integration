import { makeAutoObservable, makeObservable, observable } from "mobx";

export class AsyncState<T, Err = Error> {
  private static defaultErrorHandler?: (error: unknown) => void;
  value?: T;
  error?: Err;
  isPending: boolean = false;

  static onError(callback: (error: unknown) => void) {
    AsyncState.defaultErrorHandler = callback;
  }

  constructor() {
    makeAutoObservable(this);
  }

  async update(populator: () => Promise<T>) {
    try {
      this.isPending = true;
      this.value = await populator();
    } catch (error) {
      this.error = error as Err;
      if (AsyncState.defaultErrorHandler) AsyncState.defaultErrorHandler(error);
    } finally {
      this.isPending = false;
    }
  }

  setError(error: Err) {
    this.reset();
    this.error = error;
  }

  setValue(value: T) {
    this.reset();
    this.value = value;
  }

  reset() {
    this.value = undefined;
    this.error = undefined;
    this.isPending = false;
  }
}
