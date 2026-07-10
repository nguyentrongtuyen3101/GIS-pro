import { useState } from "react";
import "./NearbyPanel.css";

export default function NearbyPanel({
  radius,
  results,
  loading,
  onRadiusSubmit,
  onFocusPlace,
  onClose,
}) {
  const [radiusInput, setRadiusInput] = useState(radius);

  function handleSubmit(e) {
    e.preventDefault();
    const value = Number(radiusInput);
    if (!value || value <= 0) return;
    onRadiusSubmit(value);
  }

  return (
    <div className="nearby-panel">
      <div className="nearby-panel__header">
        <h3>Địa điểm gần đây</h3>
        <button type="button" className="place-form__close" onClick={onClose}>
          ✕
        </button>
      </div>

      <form className="nearby-panel__radius" onSubmit={handleSubmit}>
        <input
          type="number"
          min="1"
          value={radiusInput}
          onChange={(e) => setRadiusInput(e.target.value)}
        />
        <span className="nearby-panel__unit">mét</span>
        <button type="submit" className="btn btn-outline" disabled={loading}>
          {loading ? "..." : "Tìm lại"}
        </button>
      </form>

      {results.length === 0 ? (
        <p className="empty-state">Không có địa điểm nào trong bán kính này</p>
      ) : (
        <ul className="nearby-panel__list">
          {results.map((p) => (
            <li key={p.id} className="nearby-panel__item" onClick={() => onFocusPlace(p)}>
              <span className="nearby-panel__name">{p.name}</span>
              <span className="nearby-panel__distance">{Math.round(p.distance)} m</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
