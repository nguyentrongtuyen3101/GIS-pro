import { ApiResponse } from "../utils/response.utils.js";

export const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json(
    ApiResponse.error({
      status: statusCode,
      message: err.message,
      error: err.name,
    })
  );
};