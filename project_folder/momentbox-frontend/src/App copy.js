import React, { useEffect, useState, useRef } from 'react';
import axiosInstance from './api/axiosInstance'; // axios 대신 axiosInstance를 사용합니다.
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Main from './pages/Main';
import Login from './pages/Login';
import Register from './pages/Register';
import Game from './pages/Game';
import CalendarPage from './pages/Calendar';
import AppLayout from './layouts/AppLayout';
import AiDiaryEdit from './pages/AiDiaryEdit';
import AiDiary from './pages/AiDiary';
import AiChat from './pages/AiChat';
import Dashboard from './pages/Dashboard';
import GalleryPage from './pages/GalleryPage';

/** PrivateRoute */
const PrivateRoute = ({ children, bootstrapped }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading || !bootstrapped) return <div>로딩 중...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
};

/** PublicRoute */
const PublicRoute = ({ children, bootstrapped }) => {
  const { user, loading } = useAuth();
  if (loading || !bootstrapped) return <div>로딩 중...</div>;
  return user ? <Navigate to="/main" replace /> : children;
};

function AppContent() {
  const { login, logout, setLoading } = useAuth();
  const [bootstrapped, setBootstrapped] = useState(false);

  // alert 무음 처리
  const originalAlertRef = useRef(null);
  useEffect(() => {
    originalAlertRef.current = window.alert;
    window.alert = (...args) => console.warn('[alert suppressed]:', ...args);
    return () => {
      window.alert = originalAlertRef.current || window.alert;
    };
  }, []);

  // [수정됨] 토큰 검증 로직
  useEffect(() => {
    const verifyUser = async () => {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setLoading(false);
        setBootstrapped(true);
        return;
      }
      try {
        // ★★★ axios를 axiosInstance로 변경 ★★★
        // baseURL과 인증 헤더가 자동으로 적용됩니다.
        const res = await axiosInstance.get('/api/auth/profile');
        const refreshToken = localStorage.getItem('refreshToken');
        login({ email: res.data.email }, { accessToken, refreshToken });
      } catch (err) {
        console.error('토큰 검증 실패:', err);
        logout(); // 토큰이 유효하지 않으면 로그아웃 처리
      } finally {
        setLoading(false);
        setBootstrapped(true);
      }
    };
    verifyUser();
  // ★★★ 의존성 배열에 login, logout, setLoading 추가 ★★★
  }, [setLoading]);

  return (
    <div className="App">
      <Routes>
        {/* 공개 라우트 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={
            <PublicRoute bootstrapped={bootstrapped}>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute bootstrapped={bootstrapped}>
              <Register />
            </PublicRoute>
          }
        />

        {/* 보호 라우트 */}
        <Route
          element={
            <PrivateRoute bootstrapped={bootstrapped}>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/main" element={<Main />} />
          <Route path="/game" element={<Game />} />
          <Route path="/calendar" element={<CalendarPage />} />
          {/* :id와 같은 파라미터가 있는 라우트는 보통 더 구체적인 경로이므로 아래로 내리는 것이 좋습니다. */}
          <Route path="/ai-diary-edit/:id" element={<AiDiaryEdit />} />
          <Route path="/aidiary" element={<AiDiary />} />
          <Route path="/aichat" element={<AiChat />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        {/* 나머지 모든 경로는 로그인 페이지로 리디렉션 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}