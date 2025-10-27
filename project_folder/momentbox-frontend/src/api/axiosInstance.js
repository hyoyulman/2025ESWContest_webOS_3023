// src/api/axiosInstance.js
import axios from "axios";

const axiosInstance = axios.create({
  //baseURL: "https://192.168.0.111:5001",
  baseURL: "",
  headers: { // ★★★ 이 부분을 추가합니다 ★★★
    'Content-Type': 'application/json',
  }
});

// 요청 보낼 때마다 토큰 자동으로 붙이기
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token && token.split('.').length === 3) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    if (config.headers?.Authorization) delete config.headers.Authorization;
  }
  return config;
});

// --- 응답 인터셉터 추가 ---
// 401 오류(토큰 만료 등) 발생 시 자동 로그아웃 처리
axiosInstance.interceptors.response.use(
  (response) => response, // 성공 응답은 그대로 반환
  (error) => {
    if (error.response && error.response.status === 401) {
      // 기존 토큰 삭제
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");

      // 사용에게 알리고 로그인 페이지로 리디렉션
      alert("로그인 세션이 만료되었습니다. 다시 로그인해주세요.");
      window.location.href = "/login";
    }
    // 그 외 다른 오류는 그대로 반환
    return Promise.reject(error);
  }
);

export default axiosInstance;
