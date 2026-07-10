import { useEffect, useState } from "react";
import "./PlaceForm.css";

export default function PlaceForm({ selection, onSave, onCancel, saving }) {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(selection.editable ? selection.suggestedName || "" : selection.name || "");
  }, [selection]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    onSave(trimmed);
  }

  return (
    <div className="place-form">
      <div className="place-form__header">
        <span className="badge badge-orange">
          {selection.editable ? "Vị trí tự chọn" : "Địa điểm trên bản đồ"}
        </span>
        <button type="button" className="place-form__close" onClick={onCancel}>
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field-group">
          <label className="field-label" htmlFor="place-name">
            Tên địa điểm
          </label>
          <input
            id="place-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!selection.editable}
            placeholder="Nhập tên địa điểm"
            maxLength={200}
          />
        </div>

        {selection.address && (
          <div className="field-group">
            <label className="field-label">Địa chỉ</label>
            <p className="place-form__readonly-text">{selection.address}</p>
          </div>
        )}

        <div className="place-form__actions">
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Hủy
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || name.trim().length < 2}
          >
            {saving ? "Đang lưu..." : "Lưu địa điểm"}
          </button>
        </div>
      </form>
    </div>
  );
}
