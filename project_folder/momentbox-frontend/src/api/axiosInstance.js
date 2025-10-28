// src/api/axiosInstance.js
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "", // Adjust if needed
  headers: {
    'Content-Type': 'application/json',
  }
});

// 요청 인터셉터 (변경 없음)
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token && token.split('.').length === 3) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    if (config.headers?.Authorization) delete config.headers.Authorization;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// --- 응답 인터셉터 수정 (리프레시 로직 추가) ---
axiosInstance.interceptors.response.use(
  (response) => response, // 성공 응답은 그대로 반환
  async (error) => {
    const originalRequest = error.config;

    // 401 오류이고, 재시도 요청이 아닐 경우 (무한 루프 방지)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // 재시도 플래그 설정
      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken) {
        try {
          // 리프레시 엔드포인트 호출 (Authorization 헤더 없이)
          const { data } = await axios.post('/api/auth/refresh', {}, {
             headers: {
               Authorization: `Bearer ${refreshToken}` // 리프레시 토큰 사용
             }
           });


          if (data.status === 'success' && data.access_token) {
            const newAccessToken = data.access_token;

            // 새 토큰 저장
            localStorage.setItem('accessToken', newAccessToken);

            // axiosInstance 기본 헤더 및 실패했던 요청의 헤더 업데이트
            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

            // 실패했던 원래 요청 재시도
            return axiosInstance(originalRequest);
          } else {
            // 리프레시 실패 (백엔드에서 유효하지 않다고 응답)
            throw new Error("Invalid refresh token response");
          }
        } catch (refreshError) {
          // 리프레시 토큰 요청 자체 실패 또는 유효하지 않은 경우
          console.error("Unable to refresh token:", refreshError);
          // 로그아웃 처리 (AuthContext의 logout 함수를 직접 호출하기 어려우므로 로컬 스토리지 정리 및 리디렉션)
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
          return Promise.reject(refreshError); // 에러 전파
        }
      } else {
        // 리프레시 토큰이 없는 경우 바로 로그아웃
        console.log("No refresh token available, logging out.");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(error); // 원래 401 에러 전파
      }
    }

    // 401 오류가 아니거나 이미 재시도한 경우는 그대로 에러 반환
    return Promise.reject(error);
  }
);

export default axiosInstance;