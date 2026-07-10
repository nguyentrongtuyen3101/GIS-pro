import { apiClient } from "./client.js";

export const placeApi = {
  // POST /places/create/:userId  body: { clientId, deviceId, name, lat, lng }
  // trả về { data: newPlace, message } -> lấy raw để biết isNew qua message
  createPlace: (userId, payload) =>
    apiClient.post(`/places/create/${userId}`, payload, { raw: true }),

  // GET /places/get/:userId
  getPlacesByUser: (userId) => apiClient.get(`/places/get/${userId}`),

  // GET /places/getNearby/:userId/:lat/:lng/:radius
  findNearby: (userId, lat, lng, radius) =>
    apiClient.get(`/places/getNearby/${userId}/${lat}/${lng}/${radius}`),

  // DELETE /places/delete  body: { placeIds: [] }
  deletePlaces: (placeIds) => apiClient.del("/places/delete", { placeIds }),

  // GET /places/getpotentialduplicates/:userId
  getPotentialDuplicates: (userId) =>
    apiClient.get(`/places/getpotentialduplicates/${userId}`),

  // DELETE /places/delete/:id  (id của nhóm PotentialDuplicate)
  deletePotentialDuplicate: (id) => apiClient.del(`/places/delete/${id}`),
};
