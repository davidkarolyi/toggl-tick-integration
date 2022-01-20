import { createContext, useContext } from "react";
import { TickAdapter } from "../adapters/tick";
import { TogglAdapter } from "../adapters/toggl";
import { LocalStorage } from "../storage/localStorage";
import { Store } from "./store";

export const store = new Store({
  credentialStorage: new LocalStorage(),
  source: {
    name: "Toggl",
    adapter: new TogglAdapter(),
  },
  target: {
    name: "Tick",
    adapter: new TickAdapter(),
  },
});

const storeContext = createContext(store);
export const useStore = () => useContext(storeContext);
