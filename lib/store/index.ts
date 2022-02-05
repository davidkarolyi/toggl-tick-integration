import { createContext, useContext } from "react";
import { TickAdapter, TickCredentials } from "../adapters/tick";
import { TogglAdapter, TogglCredentials } from "../adapters/toggl";
import { LocalStorage } from "../storage/localStorage";
import { AlertStore } from "./alert";
import { IntegrationStore } from "./integration";
import { SourceStore } from "./source";
import { TargetStore } from "./target";
import { RootStore } from "./types";

class TogglTickStore implements RootStore<TogglCredentials, TickCredentials> {
  alert: AlertStore;
  source: SourceStore<TogglCredentials>;
  target: TargetStore<TickCredentials>;
  integration: IntegrationStore<TogglCredentials, TickCredentials>;

  constructor() {
    const storage = new LocalStorage();

    this.alert = new AlertStore();
    this.source = new SourceStore({
      rootStore: this,
      platformName: "Toggl",
      adapter: new TogglAdapter(),
      storage,
    });
    this.target = new TargetStore({
      rootStore: this,
      platformName: "Tick",
      adapter: new TickAdapter(),
      storage,
    });
    this.integration = new IntegrationStore({
      rootStore: this,
    });
  }
}

const store = new TogglTickStore();

const storeContext = createContext(store);
export const useStore = () => useContext(storeContext);
