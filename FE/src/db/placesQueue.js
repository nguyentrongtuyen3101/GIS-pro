import { openDB } from "idb";

const DB_NAME = "place-finder-db";
const DB_VERSION = 1;
const STORE = "placesQueue";

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE, { keyPath: "clientId" });
        store.createIndex("by_userId", "userId");
        store.createIndex("by_status", "status");
      },
    });
  }
  return dbPromise;
}

/**
 * Trạng thái 1 item trong hàng đợi (song song với PlaceSyncStatus bên Prisma):
 * - pending: vừa tạo ở FE, chưa xác nhận được server đã lưu
 * - synced:  server đã xác nhận lưu thành công (item này sẽ bị xóa khỏi queue
 *            ngay sau khi xác nhận — synced chỉ là trạng thái thoáng qua)
 * - failed:  đã thử gọi API nhưng lỗi (mất mạng, lỗi validate, lỗi server...)
 */
export const placesQueueDb = {
  async add(item) {
    const db = await getDb();
    await db.put(STORE, item);
  },

  async updateStatus(clientId, patch) {
    const db = await getDb();
    const existing = await db.get(STORE, clientId);
    if (!existing) return;
    await db.put(STORE, { ...existing, ...patch });
  },

  async remove(clientId) {
    const db = await getDb();
    await db.delete(STORE, clientId);
  },

  async getAllByUser(userId) {
    const db = await getDb();
    const all = await db.getAllFromIndex(STORE, "by_userId", userId);
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },

  async getPendingOrFailedByUser(userId) {
    const all = await this.getAllByUser(userId);
    return all.filter((item) => item.status === "pending" || item.status === "failed");
  },
};
