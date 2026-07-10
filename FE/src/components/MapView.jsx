import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { geoApi } from "../api/geoApi.js";
import "./MapView.css";

const DEFAULT_CENTER = [10.762622, 106.660172]; // TP.HCM

function pinIcon(color) {
  return L.divIcon({
    className: "pin-icon",
    html: `<svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.3 21.7 0 14 0z" fill="${color}" stroke="#1a1a1a" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="5.5" fill="#1a1a1a"/>
    </svg>`,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -34],
  });
}

const SAVED_ICON = pinIcon("#ff7a1a"); // cam — địa điểm đã lưu
const SEARCH_ICON = pinIcon("#3d8bff"); // xanh — kết quả tìm kiếm (POI, khóa tên)
const SELECTED_ICON = pinIcon("#3ddc84"); // xanh lá — điểm đang chọn để lưu

const MapView = forwardRef(function MapView(
  { myPlaces = [], onPoiSelected, onRawSelected, onSavedMarkerSelected, onSearchMarkerSelected },
  ref
) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const savedMarkersRef = useRef([]);
  const searchMarkersRef = useRef([]);
  const selectedMarkerRef = useRef(null);

  const [searchValue, setSearchValue] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchError, setSearchError] = useState("");

  // --- khởi tạo map (chạy đúng 1 lần) ---
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map(mapDivRef.current, {
      center: DEFAULT_CENTER,
      zoom: 14,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    map.on("click", (e) => handleRawClick(e.latlng.lat, e.latlng.lng));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- vẽ lại marker địa điểm đã lưu mỗi khi myPlaces thay đổi ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    savedMarkersRef.current.forEach((m) => map.removeLayer(m));
    savedMarkersRef.current = myPlaces
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => {
        const marker = L.marker([p.lat, p.lng], { icon: SAVED_ICON }).addTo(map);
        marker.bindTooltip(p.name, { direction: "top" });
        marker.on("click", () => onSavedMarkerSelected?.(p));
        return marker;
      });
  }, [myPlaces, onSavedMarkerSelected]);

  function clearSearchMarkers() {
    const map = mapRef.current;
    searchMarkersRef.current.forEach((m) => map.removeLayer(m));
    searchMarkersRef.current = [];
  }

  function dropSelectedMarker(lat, lng) {
    const map = mapRef.current;
    if (selectedMarkerRef.current) map.removeLayer(selectedMarkerRef.current);
    selectedMarkerRef.current = L.marker([lat, lng], { icon: SELECTED_ICON }).addTo(map);
  }

  async function handleRawClick(lat, lng) {
    dropSelectedMarker(lat, lng);
    let suggestedName = "";
    try {
      suggestedName = await geoApi.reverse(lat, lng);
    } catch {
      // không sao — để trống, user tự nhập tên
    }
    onRawSelected?.({ lat, lng, suggestedName });
  }

  async function handleSearch(e) {
    e.preventDefault();
    const q = searchValue.trim();
    if (!q || !mapRef.current) return;

    setSearching(true);
    setSearchError("");
    try {
      const center = mapRef.current.getCenter();
      const results = await geoApi.search(q, { lat: center.lat, lng: center.lng });

      clearSearchMarkers();

      if (results.length === 0) {
        setSearchError("Không tìm thấy địa điểm phù hợp");
        return;
      }

      const bounds = [];
      searchMarkersRef.current = results.map((r) => {
        bounds.push([r.lat, r.lng]);
        const marker = L.marker([r.lat, r.lng], { icon: SEARCH_ICON }).addTo(mapRef.current);
        marker.bindTooltip(r.name, { direction: "top" });
        marker.on("click", () => {
          dropSelectedMarker(r.lat, r.lng);
          onSearchMarkerSelected?.(r);
          onPoiSelected?.(r);
        });
        return marker;
      });

      mapRef.current.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
    } catch (err) {
      setSearchError(err.message || "Lỗi tìm kiếm");
    } finally {
      setSearching(false);
    }
  }

  function handleLocateMe() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current.setView([latitude, longitude], 16);
        setLocating(false);
        handleRawClick(latitude, longitude);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  useImperativeHandle(ref, () => ({
    panTo(lat, lng, zoom = 16) {
      if (!mapRef.current) return;
      mapRef.current.setView([lat, lng], zoom);
      dropSelectedMarker(lat, lng);
    },
  }));

  return (
    <div className="map-view">
      <form className="map-search" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Tìm kiếm địa điểm..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={searching}>
          {searching ? "..." : "Tìm"}
        </button>
      </form>
      {searchError && <div className="map-search__error">{searchError}</div>}

      <button
        type="button"
        className="map-locate-btn"
        onClick={handleLocateMe}
        disabled={locating}
        title="Lấy vị trí hiện tại"
      >
        {locating ? "..." : "📍"}
      </button>

      <div ref={mapDivRef} className="map-canvas" />
    </div>
  );
});

export default MapView;