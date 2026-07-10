const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

/**
 * Nominatim là dịch vụ MIỄN PHÍ của OpenStreetMap, không cần API key.
 * Có giới hạn tốc độ ~1 request/giây/IP — đủ dùng cho demo/dev,
 * nếu triển khai production nhiều traffic nên tự host Nominatim hoặc
 * dùng nhà cung cấp trả phí (LocationIQ, Geoapify...).
 */
export const geoApi = {
  // Tìm kiếm địa điểm theo tên, trả về danh sách kết quả kèm tọa độ
  async search(query, { lat, lng } = {}) {
    const params = new URLSearchParams({
      q: query,
      format: "jsonv2",
      addressdetails: "1",
      limit: "10",
    });

    // Ưu tiên kết quả gần vị trí đang xem bản đồ (không giới hạn cứng)
    if (lat != null && lng != null) {
      const delta = 0.2;
      params.set(
        "viewbox",
        `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`
      );
      params.set("bounded", "0");
    }

    const res = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("Không tìm kiếm được địa điểm");

    const json = await res.json();
    return json.map((r) => ({
      placeId: String(r.place_id),
      name: r.name?.trim() || r.display_name.split(",")[0],
      address: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
    }));
  },

  // Reverse-geocode: từ tọa độ suy ra địa chỉ gần đúng, dùng làm tên gợi ý
  async reverse(lat, lng) {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: "jsonv2",
    });

    const res = await fetch(`${NOMINATIM_BASE}/reverse?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return "";

    const json = await res.json();
    return json.display_name || "";
  },
};