import axios from "axios";
import { ProxyRequestConfig } from "./types";

// Runs requests through the backend,
// so CORS headers won't be a problem with Tick.
export function proxy(config: ProxyRequestConfig) {
  return axios({ method: "POST", url: "/api/proxy", data: config });
}
