export class ApiResponse {
  static success({
    data = null,
    message = "Success",
    status = 200,
  } = {}) {
    return {
      status,
      message,
      error: null,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static error({
    message = "Internal Server Error",
    error = "Error",
    status = 500,
  } = {}) {
    return {
      status,
      message,
      error,
      data: null,
      timestamp: new Date().toISOString(),
    };
  }
}