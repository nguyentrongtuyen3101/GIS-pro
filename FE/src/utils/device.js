import { v4 as uuidv4 } from "uuid";

const DEVICE_ID_KEY = "place_finder_device_id";

/**
 * deviceId phải ổn định qua các lần load app trên cùng 1 trình duyệt,
 * dùng để backend phân biệt "cùng thiết bị gửi lại" khi cần.
 */
export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `web-${uuidv4()}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * clientId là UUID MỚI cho MỖI lần tạo place (để backend nhận diện
 * request trùng do retry mạng qua unique constraint clientId+userId).
 */
export function newClientId() {
  return uuidv4();
}
