const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Backend luôn trả về envelope dạng:
 * { status, message, error, data, timestamp }
 * Hàm này gọi fetch, parse JSON, và ném lỗi rõ ràng nếu request thất bại.
 */
async function request(path, { method = "GET", body, raw = false } = {}) {
  if (!BASE_URL) {
    throw new ApiError(
      "Chưa cấu hình VITE_API_BASE_URL trong file .env",
      0,
      null
    );
  }

  let url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    // response không có body JSON (hiếm khi xảy ra với API này)
  }

  if (!res.ok || (json && json.error)) {
    const message = json?.message || `Lỗi gọi API (${res.status})`;
    throw new ApiError(message, res.status, json);
  }

  return raw ? json : json?.data;
}

export const apiClient = {
  get: (path, opts) => request(path, { method: "GET", ...opts }),
  post: (path, body, opts) => request(path, { method: "POST", body, ...opts }),
  del: (path, body, opts) => request(path, { method: "DELETE", body, ...opts }),
};
