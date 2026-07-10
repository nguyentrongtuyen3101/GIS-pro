import { apiClient } from "./client.js";

export const userApi = {
  // POST /users/login  body: { username }
  login: (username) => apiClient.post("/users/login", { username }),
};
