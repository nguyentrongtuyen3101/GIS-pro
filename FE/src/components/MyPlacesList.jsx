import "./MyPlacesList.css";

function StatusBadge({ status }) {
  if (status === "pending") {
    return <span className="sync-badge sync-badge--pending">Đang đồng bộ</span>;
  }
  if (status === "failed") {
    return <span className="sync-badge sync-badge--failed">Lỗi đồng bộ</span>;
  }
  if (status === "synced") {
    return <span className="sync-badge sync-badge--synced">Đã đồng bộ</span>;
  }
  return null;
}

export default function MyPlacesList({ places, loading, onFocus, onDelete, onRetry, deletingId }) {
  return (
    <div className="my-places">
      <h3 className="my-places__title">Địa điểm đã lưu ({places.length})</h3>

      {loading ? (
        <p className="empty-state">Đang tải...</p>
      ) : places.length === 0 ? (
        <p className="empty-state">Chưa có địa điểm nào được lưu</p>
      ) : (
        <ul className="my-places__list">
          {places.map((p) => {
            const isUnsynced = p.syncStatus && p.syncStatus !== "synced";
            return (
              <li
                key={p.id}
                className={`my-places__item${isUnsynced ? " my-places__item--unsynced" : ""}${
                  p.syncStatus === "failed" ? " my-places__item--failed" : ""
                }`}
              >
                <button type="button" className="my-places__info" onClick={() => onFocus(p)}>
                  <span
                    className={`my-places__dot${
                      p.syncStatus === "failed" ? " my-places__dot--failed" : ""
                    }`}
                  />
                  <span className="my-places__name">{p.name}</span>
                  <StatusBadge status={p.syncStatus} />
                </button>

                {p.syncStatus === "failed" && (
                  <button
                    type="button"
                    className="my-places__retry"
                    onClick={() => onRetry(p)}
                    title="Thử lưu lại"
                  >
                    ↻
                  </button>
                )}

                <button
                  type="button"
                  className="my-places__delete"
                  onClick={() => onDelete(p)}
                  disabled={deletingId === p.id}
                  title={isUnsynced ? "Hủy địa điểm này" : "Xóa địa điểm"}
                >
                  {deletingId === p.id ? "..." : "🗑"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
