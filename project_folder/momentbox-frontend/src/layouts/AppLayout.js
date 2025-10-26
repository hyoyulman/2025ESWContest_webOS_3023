import React, { useState, useCallback, useEffect } from "react";
import { Outlet, NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./AppLayout.css";

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const [sideOpen, setSideOpen] = useState(false);

  const openSide = useCallback(() => setSideOpen(true), []);
  const closeSide = useCallback(() => setSideOpen(false), []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    logout?.();
    navigate("/login", { replace: true });
  };

  const onHamburger = () => {
    openSide();          // 사이드 열기
  };

  // ESC로 닫기
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") closeSide(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSide]);

  // 라우트 변경 시 자동 닫기
  useEffect(() => { closeSide(); }, [location.pathname, closeSide]);

  // 공통 클래스 헬퍼 (활성표시)
  const cls = (isActive) => "nav__item" + (isActive ? " is-active" : "");

  return (
    <div className="shell">
      {/* 상단 배너 */}
      <header className="appbar">
        <button
          type="button"
          aria-label="메뉴"
          className="appbar__hamburger"
          onClick={onHamburger}
        >
          <span /><span /><span />
        </button>

        <h1 className="appbar__brand">
          <Link to="/main">MomentBox</Link>
        </h1>

        <div className="appbar__right">
          <button className="btn-ghost" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* 오버레이: 클릭 시 닫기 */}
      <div
        className={`side-dim ${sideOpen ? "show" : ""}`}
        onClick={closeSide}
        aria-hidden={!sideOpen}
      />

      {/* 사이드바 */}
      <aside className={`side-menu ${sideOpen ? "open" : ""}`} aria-hidden={!sideOpen}>
        <button type="button" className="side-close" onClick={closeSide} aria-label="닫기">×</button>

        <nav className="side-nav">
          {/* 홈 */}
          <NavLink to="/main" className={({isActive}) => cls(isActive)} onClick={closeSide}>
            홈
          </NavLink>

          {/* 일기 쓰기 */}
          <NavLink to="/aidiary" className={({isActive}) => cls(isActive)} onClick={closeSide}>
            일기 쓰기
          </NavLink>

          {/* 캘린더 */}
          <NavLink to="/calendar" className={({isActive}) => cls(isActive)} onClick={closeSide}>
            캘린더 / 일기 편집
          </NavLink>

          {/* 임시: 일기 편집 */}
          <NavLink to="/ai-diary-edit" className={({isActive}) => cls(isActive)} onClick={closeSide}>
            일기편집(임시)
          </NavLink>

          {/* ✅ 갤러리 */}
          <NavLink to="/gallery" className={({isActive}) => cls(isActive)} onClick={closeSide}>
            갤러리
          </NavLink>

          {/* 대시보드 */}
          <NavLink to="/dashboard" className={({isActive}) => cls(isActive)} onClick={closeSide}>
            스마트홈 대시보드
          </NavLink>

          {/* 게임 */}
          <NavLink to="/game" className={({isActive}) => cls(isActive)} onClick={closeSide}>
            게임
          </NavLink>

          
        </nav>

        <div className="side-divider"></div>
      </aside>

      {/* 본문 */}
      <main className="app__content">
        <Outlet />
      </main>
    </div>
  );
}
