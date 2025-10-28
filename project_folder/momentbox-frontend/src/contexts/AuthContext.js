import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance'; 

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authTokens, setAuthTokens] = useState({ accessToken: null, refreshToken: null });
  const [loading, setLoading] = useState(true);

  const login = useCallback((userData, tokens) => {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
    setUser(userData);
    setAuthTokens(tokens);
    localStorage.setItem('accessToken', tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    } else {
       localStorage.removeItem('refreshToken'); 
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAuthTokens({ accessToken: null, refreshToken: null });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken'); 
    delete axiosInstance.defaults.headers.common['Authorization'];
  }, []);

  useEffect(() => {
    const checkUserStatus = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken'); 

      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        const response = await axiosInstance.get('/api/auth/profile');

        setUser({ email: response.data.email, id: response.data.id });
        setAuthTokens({ accessToken, refreshToken }); 

      } catch (error) {
        console.error("자동 로그인 실패: 유효하지 않은 토큰 또는 API 오류", error);
        logout();
      } finally {
        setLoading(false);
      }
    };
    checkUserStatus();
  }, [logout]); 

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