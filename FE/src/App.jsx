import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "./context/AppContext.jsx";
import LoginGate from "./components/LoginGate.jsx";
import TopBar from "./components/TopBar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import MapView from "./components/MapView.jsx";
import DuplicatesModal from "./components/DuplicatesModal.jsx";
import { placeApi } from "./api/placeApi.js";
import { useSyncQueue } from "./hooks/useSyncQueue.js";
import "./App.css";

const DEFAULT_RADIUS = 500;

export default function App() {
  const { user } = useApp();

  if (!user) return <LoginGate />;

  return <MainScreen key={user.id} user={user} />;
}

function MainScreen({ user }) {
  const mapRef = useRef(null);

  const [places, setPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const [selection, setSelection] = useState(null);
  const [saving, setSaving] = useState(false);

  const [nearby, setNearby] = useState(null);

  const [toast, setToast] = useState(null);

  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [processingGroupId, setProcessingGroupId] = useState(null);

  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 3000);
  }, []);

  const loadPlaces = useCallback(async () => {
    setPlacesLoading(true);
    try {
      const data = await placeApi.getPlacesByUser(user.id);
      setPlaces(data || []);
    } catch (err) {
      showToast(err.message);
    } finally {
      setPlacesLoading(false);
    }
  }, [user.id, showToast]);

  const loadDuplicateGroups = useCallback(async () => {
    setDuplicatesLoading(true);
    try {
      const data = await placeApi.getPotentialDuplicates(user.id);
      setDuplicateGroups(data || []);
    } catch (err) {
      showToast(err.message);
    } finally {
      setDuplicatesLoading(false);
    }
  }, [user.id, showToast]);

  const handleSynced = useCallback(
    (res) => {
      showToast(res.message || "Đã đồng bộ địa điểm");
      loadPlaces();
      loadDuplicateGroups();
    },
    [showToast, loadPlaces, loadDuplicateGroups]
  );

  const handleSyncError = useCallback(
    (err, item) => {
      // chỉ toast ở lần lỗi ĐẦU TIÊN — các lần retry nền sau đó lỗi lại thì thôi,
      // tránh spam toast mỗi 30s, item vẫn hiện badge "Lỗi" trong sidebar
      if ((item.attempts || 0) === 0) {
        showToast(`Không lưu được "${item.name}" — sẽ tự thử lại`);
      }
    },
    [showToast]
  );

  const handleReconnectSynced = useCallback(
    (count) => {
      showToast(`✅ Đã có mạng — đồng bộ xong ${count} địa điểm`);
    },
    [showToast]
  );

  const { queueItems, isOnline, enqueueAndSync, retry, discard } = useSyncQueue(user.id, {
    onSynced: handleSynced,
    onError: handleSyncError,
    onReconnectSynced: handleReconnectSynced,
  });

  useEffect(() => {
    loadPlaces();
    loadDuplicateGroups();
  }, [loadPlaces, loadDuplicateGroups]);

  // gộp địa điểm đã xác nhận trên server + các item đang pending/failed ở local
  const displayPlaces = [
    ...queueItems.map((item) => ({
      id: `queue-${item.clientId}`,
      clientId: item.clientId,
      name: item.name,
      lat: item.lat,
      lng: item.lng,
      syncStatus: item.status, // 'pending' | 'failed'
      errorMessage: item.errorMessage,
    })),
    ...places.map((p) => ({ ...p, syncStatus: "synced" })),
  ];

  // --- nearby search ---
  const runNearbySearch = useCallback(
    async (lat, lng, radius) => {
      setNearby({ origin: { lat, lng }, radius, results: [], loading: true });
      try {
        const results = await placeApi.findNearby(user.id, lat, lng, radius);
        setNearby({ origin: { lat, lng }, radius, results: results || [], loading: false });
      } catch (err) {
        showToast(err.message);
        setNearby({ origin: { lat, lng }, radius, results: [], loading: false });
      }
    },
    [user.id, showToast]
  );

  function handleNearbyRadiusSubmit(newRadius) {
    if (!nearby) return;
    runNearbySearch(nearby.origin.lat, nearby.origin.lng, newRadius);
  }

  function handleFocusNearbyPlace(place) {
    mapRef.current?.panTo(place.lat, place.lng, 17);
  }

  // --- map selection handlers ---
  function handlePoiSelected(payload) {
    setSelection({
      editable: false,
      name: payload.name,
      address: payload.address,
      lat: payload.lat,
      lng: payload.lng,
      placeId: payload.placeId,
    });
    runNearbySearch(payload.lat, payload.lng, nearby?.radius || DEFAULT_RADIUS);
  }

  function handleRawSelected(payload) {
    setSelection({
      editable: true,
      suggestedName: payload.suggestedName,
      lat: payload.lat,
      lng: payload.lng,
    });
    runNearbySearch(payload.lat, payload.lng, nearby?.radius || DEFAULT_RADIUS);
  }

  function handleSavedMarkerSelected(place) {
    setSelection(null);
    mapRef.current?.panTo(place.lat, place.lng, 17);
    runNearbySearch(place.lat, place.lng, nearby?.radius || DEFAULT_RADIUS);
  }

  async function handleSaveSelection(name) {
    setSaving(true);
    try {
      await enqueueAndSync({ name, lat: selection.lat, lng: selection.lng });
      setSelection(null);
      showToast(isOnline ? "Đã lưu, đang đồng bộ..." : "Đã lưu offline, sẽ đồng bộ khi có mạng");
    } finally {
      setSaving(false);
    }
  }

  function handleCancelSelection() {
    setSelection(null);
  }

  // --- sidebar: my places ---
  function handleFocusPlace(place) {
    mapRef.current?.panTo(place.lat, place.lng, 17);
    runNearbySearch(place.lat, place.lng, nearby?.radius || DEFAULT_RADIUS);
  }

  async function handleDeletePlace(place) {
    // item chưa đồng bộ (pending/failed) — chỉ có ở local, xóa khỏi hàng đợi thôi
    if (place.syncStatus && place.syncStatus !== "synced") {
      await discard(place.clientId);
      showToast("Đã hủy địa điểm chưa đồng bộ");
      return;
    }

    if (!window.confirm(`Xóa "${place.name}"?`)) return;
    setDeletingId(place.id);
    try {
      await placeApi.deletePlaces([place.id]);
      setPlaces((prev) => prev.filter((p) => p.id !== place.id));
      showToast("Đã xóa địa điểm");
    } catch (err) {
      showToast(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  function handleRetryPlace(place) {
    retry(place.clientId);
    showToast(`Đang thử lưu lại "${place.name}"...`);
  }

  // --- duplicates modal ---
  function openDuplicates() {
    setDuplicatesOpen(true);
    loadDuplicateGroups();
  }

  async function handleDismissGroup(groupId) {
    setProcessingGroupId(groupId);
    try {
      await placeApi.deletePotentialDuplicate(groupId);
      setDuplicateGroups((prev) => prev.filter((g) => g.duplicateGroupId !== groupId));
      showToast("Đã đồng bộ nhóm nghi vấn");
    } catch (err) {
      showToast(err.message);
    } finally {
      setProcessingGroupId(null);
    }
  }

  async function handleConfirmDuplicate(groupId, keepId, allIds) {
    const deleteIds = allIds.filter((id) => id !== keepId);
    setProcessingGroupId(groupId);
    try {
      if (deleteIds.length > 0) {
        await placeApi.deletePlaces(deleteIds);
      }
      await placeApi.deletePotentialDuplicate(groupId);
      setDuplicateGroups((prev) => prev.filter((g) => g.duplicateGroupId !== groupId));
      setPlaces((prev) => prev.filter((p) => !deleteIds.includes(p.id)));
      showToast("Đã gộp địa điểm trùng");
    } catch (err) {
      showToast(err.message);
    } finally {
      setProcessingGroupId(null);
    }
  }

  return (
    <div className="app-shell">
      <TopBar
        duplicateCount={duplicateGroups.length}
        onOpenDuplicates={openDuplicates}
        isOnline={isOnline}
      />

      <div className="app-body">
        <Sidebar
          selection={selection}
          onSaveSelection={handleSaveSelection}
          onCancelSelection={handleCancelSelection}
          saving={saving}
          nearby={nearby}
          onNearbyRadiusSubmit={handleNearbyRadiusSubmit}
          onNearbyClose={() => setNearby(null)}
          onFocusNearbyPlace={handleFocusNearbyPlace}
          places={displayPlaces}
          placesLoading={placesLoading}
          onFocusPlace={handleFocusPlace}
          onDeletePlace={handleDeletePlace}
          onRetryPlace={handleRetryPlace}
          deletingId={deletingId}
        />

        <main className="app-map">
          <MapView
            ref={mapRef}
            myPlaces={places}
            onPoiSelected={handlePoiSelected}
            onRawSelected={handleRawSelected}
            onSavedMarkerSelected={handleSavedMarkerSelected}
          />
        </main>
      </div>

      {toast && <div className="app-toast">{toast}</div>}

      <DuplicatesModal
        open={duplicatesOpen}
        groups={duplicateGroups}
        loading={duplicatesLoading}
        processingGroupId={processingGroupId}
        onClose={() => setDuplicatesOpen(false)}
        onDismissGroup={handleDismissGroup}
        onConfirmDuplicate={handleConfirmDuplicate}
      />
    </div>
  );
}
