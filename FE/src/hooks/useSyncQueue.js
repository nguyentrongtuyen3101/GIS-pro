import { useCallback, useEffect, useRef, useState } from "react";
import { placeApi } from "../api/placeApi.js";
import { placesQueueDb } from "../db/placesQueue.js";
import { getDeviceId, newClientId } from "../utils/device.js";
import { ApiError } from "../api/client.js";

const RETRY_INTERVAL_MS = 20000;

export function useSyncQueue(userId, { onSynced, onError, onReconnectSynced } = {}) {
  const [queueItems, setQueueItems] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const syncingRef = useRef(new Set());

  const refreshQueueState = useCallback(async () => {
    if (!userId) return;
    const items = await placesQueueDb.getAllByUser(userId);
    setQueueItems(items);
  }, [userId]);

  const attemptSync = useCallback(
    async (item) => {
      // Offline thì không thử gọi API nữa — cứ để nguyên "pending" chờ có mạng,
      // tránh nhảy sang "failed" gây hiểu nhầm là lỗi thật.
      if (!navigator.onLine) return false;
      if (syncingRef.current.has(item.clientId)) return false;
      syncingRef.current.add(item.clientId);

      try {
        const res = await placeApi.createPlace(item.userId, {
          clientId: item.clientId,
          deviceId: item.deviceId,
          name: item.name,
          lat: item.lat,
          lng: item.lng,
        });
        await placesQueueDb.remove(item.clientId);
        onSynced?.(res, item);
        return true;
      } catch (err) {
        // Lỗi 4xx (validate sai...) coi như thất bại vĩnh viễn, vẫn để "failed"
        // để user tự xử lý (sửa lại rồi thử lại thủ công) thay vì retry vô hạn.
        const message =
          err instanceof ApiError ? err.message : "Mất kết nối, sẽ tự thử lại";
        await placesQueueDb.updateStatus(item.clientId, {
          status: "failed",
          errorMessage: message,
          attempts: (item.attempts || 0) + 1,
          lastAttemptAt: Date.now(),
        });
        onError?.(err, item);
        return false;
      } finally {
        syncingRef.current.delete(item.clientId);
        await refreshQueueState();
      }
    },
    [onSynced, onError, refreshQueueState]
  );

  const flushQueue = useCallback(async () => {
    if (!userId || !navigator.onLine) return 0;
    const pending = await placesQueueDb.getPendingOrFailedByUser(userId);
    let succeeded = 0;
    for (const item of pending) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await attemptSync(item);
      if (ok) succeeded += 1;
    }
    return succeeded;
  }, [userId, attemptSync]);

  const enqueueAndSync = useCallback(
    async ({ name, lat, lng }) => {
      const item = {
        clientId: newClientId(),
        userId,
        deviceId: getDeviceId(),
        name,
        lat,
        lng,
        status: "pending",
        errorMessage: null,
        attempts: 0,
        createdAt: Date.now(),
      };
      await placesQueueDb.add(item);
      await refreshQueueState();
      attemptSync(item); // chạy nền, không block UI
      return item;
    },
    [userId, refreshQueueState, attemptSync]
  );

  const retry = useCallback(
    async (clientId) => {
      const items = await placesQueueDb.getAllByUser(userId);
      const item = items.find((i) => i.clientId === clientId);
      if (item) attemptSync(item);
    },
    [userId, attemptSync]
  );

  const discard = useCallback(
    async (clientId) => {
      await placesQueueDb.remove(clientId);
      await refreshQueueState();
    },
    [refreshQueueState]
  );

  // load queue lần đầu + thử flush ngay khi app mở lên
  useEffect(() => {
    if (!userId) return;
    refreshQueueState();
    flushQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // lắng nghe online/offline
  useEffect(() => {
    async function handleOnline() {
      setIsOnline(true);
      const succeeded = await flushQueue();
      if (succeeded > 0) onReconnectSynced?.(succeeded);
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushQueue, onReconnectSynced]);

  // retry định kỳ phòng trường hợp online nhưng API vẫn lỗi tạm thời
  useEffect(() => {
    const interval = setInterval(() => {
      flushQueue();
    }, RETRY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [flushQueue]);

  return { queueItems, isOnline, enqueueAndSync, retry, discard };
}