import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import "./TopBar.css";

export default function TopBar({ duplicateCount = 0, onOpenDuplicates, isOnline = true }) {
  const { user, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="top-bar">
      <div className="top-bar__brand">
        Place<span>Finder</span>
      </div>

      <div className="top-bar__actions">
        {!isOnline && (
          <span className="top-bar__offline" title="Mất kết nối — dữ liệu sẽ tự đồng bộ khi có mạng">
            ⚠ Mất kết nối
          </span>
        )}

        <button
          type="button"
          className="top-bar__dup-btn"
          onClick={onOpenDuplicates}
          title="Địa điểm nghi vấn trùng"
        >
          <span role="img" aria-label="duplicates">
            🗂️
          </span>
          {duplicateCount > 0 && (
            <span className="top-bar__dup-badge">{duplicateCount}</span>
          )}
        </button>

        <div className="top-bar__user" ref={menuRef}>
          <button
            type="button"
            className="top-bar__user-btn"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="top-bar__avatar">
              {user?.username?.[0]?.toUpperCase() || "?"}
            </span>
            <span className="top-bar__username">{user?.username}</span>
            <span className="top-bar__caret">▾</span>
          </button>

          {menuOpen && (
            <div className="top-bar__menu">
              <button
                type="button"
                className="top-bar__menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
              >
                Thêm tài khoản
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
