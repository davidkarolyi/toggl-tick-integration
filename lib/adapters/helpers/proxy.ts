import axios, { AxiosRequestConfig } from "axios";

// Runs requests through the backend,
// so CORS headers won't be a problem with Tick.
export function proxy(config: ProxyRequestConfig) {
  return axios({ method: "POST", url: "/api/proxy", data: config });
}

export type ProxyRequestConfig = Pick<
  AxiosRequestConfig,
  "url" | "method" | "headers" | "params" | "data"
>;
