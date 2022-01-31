import { makeAutoObservable, runInAction } from "mobx";

export class AsyncState<T, Err = Error> {
  private static defaultErrorHandler?: (error: unknown) => void;
  value?: T;
  error?: Err;
  isPending: boolean = false;

  private get selfRef(): AsyncState<T, Err> {
    if (typeof this.refToStore !== "object")
      throw new Error("Invalid reference to store");
    if (this.refToStore[this.fieldName] !== this)
      throw new Error("Invalid field name");

    return this.refToStore[this.fieldName];
  }

  static onError(callback: (error: unknown) => void) {
    AsyncState.defaultErrorHandler = callback;
  }

  constructor(
    private readonly refToStore: any,
    private readonly fieldName: string
  ) {
    makeAutoObservable(this);
  }

  async update(populator: () => Promise<T>) {
    console.log(this.selfRef);

    try {
      runInAction(() => {
        this.selfRef.isPending = true;
      });
      const value = await populator();
      runInAction(() => {
        this.selfRef.value = value;
      });
    } catch (error) {
      runInAction(() => {
        this.selfRef.error = error as Err;
      });
      if (AsyncState.defaultErrorHandler) AsyncState.defaultErrorHandler(error);
    } finally {
      runInAction(() => {
        this.selfRef.isPending = false;
      });
    }
  }

  setError(error: Err) {
    this.selfRef.reset();
    runInAction(() => {
      this.selfRef.error = error;
    });
  }

  setValue(value: T) {
    this.selfRef.reset();
    runInAction(() => {
      this.selfRef.value = value;
    });
  }

  reset() {
    runInAction(() => {
      this.selfRef.value = undefined;
      this.selfRef.error = undefined;
      this.selfRef.isPending = false;
    });
  }
}
