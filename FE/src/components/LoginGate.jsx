import { useState } from "react";
import { userApi } from "../api/userApi.js";
import { useApp } from "../context/AppContext.jsx";
import "./LoginGate.css";

export default function LoginGate() {
  const { login } = useApp();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setErrorMsg("Username phải có ít nhất 3 ký tự");
      return;
    }
    if (/\s/.test(trimmed)) {
      setErrorMsg("Username không được chứa dấu cách");
      return;
    }

    setLoading(true);
    try {
      const user = await userApi.login(trimmed);
      login(user);
    } catch (err) {
      setErrorMsg(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-gate">
      <div className="login-gate__backdrop" />
      <div className="login-gate__panel">
        <h1 className="login-gate__title">
          Place<span>Finder</span>
        </h1>
        <p className="login-gate__subtitle">
          Nhập tên của bạn để bắt đầu khám phá và lưu địa điểm
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label" htmlFor="username">
              Tên người dùng
            </label>
            <input
              id="username"
              type="text"
              autoFocus
              placeholder="VD: pep_nguyen"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {errorMsg && <p className="login-gate__error">{errorMsg}</p>}

          <button type="submit" className="btn btn-primary login-gate__submit" disabled={loading}>
            {loading ? "Đang vào..." : "Vào ứng dụng"}
          </button>
        </form>
      </div>
    </div>
  );
}
