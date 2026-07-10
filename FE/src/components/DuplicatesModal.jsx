import { useState } from "react";
import "./DuplicatesModal.css";

export default function DuplicatesModal({
  open,
  groups,
  loading,
  processingGroupId,
  onClose,
  onDismissGroup,
  onConfirmDuplicate,
}) {
  const [selectedByGroup, setSelectedByGroup] = useState({});

  if (!open) return null;

  function selectKeep(groupId, placeId) {
    setSelectedByGroup((prev) => ({ ...prev, [groupId]: placeId }));
  }

  return (
    <div className="dup-modal__overlay" onClick={onClose}>
      <div className="dup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dup-modal__header">
          <h2>Địa điểm nghi vấn trùng</h2>
          <button type="button" className="place-form__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="dup-modal__body">
          {loading ? (
            <p className="empty-state">Đang tải...</p>
          ) : groups.length === 0 ? (
            <p className="empty-state">Không có địa điểm nào nghi ngờ trùng 🎉</p>
          ) : (
            groups.map((group) => {
              const keepId = selectedByGroup[group.duplicateGroupId];
              const isProcessing = processingGroupId === group.duplicateGroupId;

              return (
                <div className="dup-group" key={group.duplicateGroupId}>
                  <ul className="dup-group__places">
                    {group.places.map((place) => (
                      <li key={place.id} className="dup-group__place">
                        <label>
                          <input
                            type="radio"
                            name={`keep-${group.duplicateGroupId}`}
                            checked={keepId === place.id}
                            onChange={() => selectKeep(group.duplicateGroupId, place.id)}
                          />
                          <span className="dup-group__place-name">{place.name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>

                  <div className="dup-group__actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={isProcessing}
                      onClick={() => onDismissGroup(group.duplicateGroupId)}
                    >
                      Không phải trùng
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!keepId || isProcessing}
                      onClick={() =>
                        onConfirmDuplicate(
                          group.duplicateGroupId,
                          keepId,
                          group.places.map((p) => p.id)
                        )
                      }
                    >
                      {isProcessing ? "Đang xử lý..." : "Xác nhận trùng, giữ mục đã chọn"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
