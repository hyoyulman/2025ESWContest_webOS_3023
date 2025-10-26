import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance'; // API 호출을 위해 import

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // authTokens의 초기값은 null로 시작하고, useEffect에서 설정하도록 변경
  const [authTokens, setAuthTokens] = useState(null);
  const [loading, setLoading] = useState(true);

  // ★★★ [수정됨] useCallback으로 감싸서 함수가 불필요하게 재생성되는 것을 방지 ★★★
  const login = useCallback((userData, tokens) => {
    // axiosInstance의 기본 헤더를 설정하여, 로그인 직후의 API 호출에도 토큰이 포함되도록 함
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
    
    setUser(userData);
    setAuthTokens(tokens);
    localStorage.setItem('accessToken', tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
  }, []);

  // ★★★ [수정됨] useCallback으로 감싸서 함수가 불필요하게 재생성되는 것을 방지 ★★★
  const logout = useCallback(() => {
    setUser(null);
    setAuthTokens(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // axiosInstance의 기본 헤더에서 인증 정보 제거
    delete axiosInstance.defaults.headers.common['Authorization'];
  }, []);

  // ★★★ [추가됨] 앱 시작 시 로그인 상태를 복원하는 useEffect ★★★
  useEffect(() => {
    const checkUserStatus = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        // 저장된 토큰이 유효한지 서버에 확인
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        const response = await axiosInstance.get('/api/auth/profile');
        
        // 토큰이 유효하면 사용자 정보로 로그인 상태를 복원
        setUser({ email: response.data.email, id: response.data.id });
        setAuthTokens({ accessToken, refreshToken });

      } catch (error) {
        console.error("자동 로그인 실패: 유효하지 않은 토큰", error);
        logout(); // 유효하지 않은 토큰이면 로그아웃 처리
      } finally {
        setLoading(false);
      }
    };
    checkUserStatus();
  }, [logout]); // logout 함수는 useCallback으로 감싸져 있어 참조가 안정적이므로 의존성 배열에 포함

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