import axios, { AxiosRequestConfig } from "axios";

// Runs requests through the backend,
// so CORS headers won't be a problem with Tick.
// WARNING: This is only safe when used locally
export function proxy(config: AxiosRequestConfig) {
  return axios({ method: "POST", url: "/api/proxy", data: config });
}
