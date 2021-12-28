import axios, { AxiosError, AxiosResponse } from "axios";
import type { NextApiRequest, NextApiResponse } from "next";

// WARNING: This endpoint is only safe when used locally
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AxiosResponse["data"]>
) {
  try {
    const { data, status } = await axios(req.body);
    res.status(status).json(data);
  } catch (error) {
    console.log(error);

    const axiosError = error as AxiosError;
    res
      .status(axiosError.response?.status || 500)
      .json(axiosError.response?.data);
  }
}
