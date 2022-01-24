import axios, { AxiosError, AxiosResponse } from "axios";
import type { NextApiRequest, NextApiResponse } from "next";
import { BASE_URL as TICK_BASE_URL } from "../../lib/adapters/tick";
import { BASE_URL as TOGGL_BASE_URL } from "../../lib/adapters/toggl";
import { ProxyRequestConfig } from "../../lib/adapters/types";

const BASE_URL_ALLOW_LIST = [TICK_BASE_URL, TOGGL_BASE_URL];
const VALID_REQUEST_CONFIG_FIELDS = [
  "url",
  "method",
  "headers",
  "params",
  "data",
] as const;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AxiosResponse["data"]>
) {
  try {
    const { data, status } = await axios(sanitizeRequestConfig(req.body));
    res.status(status).json(data);
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.isAxiosError) {
      res
        .status(axiosError.response?.status || 500)
        .json(axiosError.response?.data);
    } else {
      res.status(400).json({ message: (error as Error).message });
    }
  }
}

function sanitizeRequestConfig(config: ProxyRequestConfig): ProxyRequestConfig {
  if (typeof config !== "object")
    throw new Error("Request config is not an object");
  const sanitizedConfig: ProxyRequestConfig = {};

  for (const field of VALID_REQUEST_CONFIG_FIELDS) {
    if (!(field in config)) continue;
    if (
      field === "url" &&
      !BASE_URL_ALLOW_LIST.find((baseURL) => config.url?.startsWith(baseURL))
    )
      throw new Error("The given URL is not allowed");

    sanitizedConfig[field] = config[field];
  }

  return sanitizedConfig;
}
