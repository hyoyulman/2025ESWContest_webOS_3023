import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance'; // API 호출을 위해 import

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authTokens, setAuthTokens] = useState({ accessToken: null, refreshToken: null });
  const [loading, setLoading] = useState(true);

  const login = useCallback((userData, tokens) => {
    // tokens 객체에 accessToken과 refreshToken이 모두 있다고 가정
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
    setUser(userData);
    setAuthTokens(tokens);
    localStorage.setItem('accessToken', tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    } else {
       localStorage.removeItem('refreshToken'); // 없으면 제거
    }
  }, []);

  // ★★★ [수정됨] useCallback으로 감싸서 함수가 불필요하게 재생성되는 것을 방지 ★★★
  const logout = useCallback(() => {
    setUser(null);
    // 토큰 상태 초기화
    setAuthTokens({ accessToken: null, refreshToken: null });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken'); // 리프레시 토큰도 제거
    delete axiosInstance.defaults.headers.common['Authorization'];
  }, []);

  // ★★★ [추가됨] 앱 시작 시 로그인 상태를 복원하는 useEffect ★★★
  useEffect(() => {
    const checkUserStatus = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken'); // 리프레시 토큰 로드

      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        const response = await axiosInstance.get('/api/auth/profile');

        // 사용자 정보와 두 토큰 모두 상태에 설정
        setUser({ email: response.data.email, id: response.data.id });
        setAuthTokens({ accessToken, refreshToken }); // 상태 업데이트

      } catch (error) {
        console.error("자동 로그인 실패: 유효하지 않은 토큰 또는 API 오류", error);
        // 401 오류가 아닌 다른 이유로 실패할 수도 있으므로 logout() 호출 유지
        logout();
      } finally {
        setLoading(false);
      }
    };
    checkUserStatus();
  }, [logout]); // login은 의존성에서 제거 가능

  const value = { user, authTokens, loading, login, logout, setLoading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};