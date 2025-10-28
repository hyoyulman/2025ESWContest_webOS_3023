import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "", 
  headers: {
    'Content-Type': 'application/json',
  }
});

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

axiosInstance.interceptors.response.use(
  (response) => response, 
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; 
      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', {}, {
             headers: {
               Authorization: `Bearer ${refreshToken}` 
             }
           });


          if (data.status === 'success' && data.access_token) {
            const newAccessToken = data.access_token;

            localStorage.setItem('accessToken', newAccessToken);

            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

            return axiosInstance(originalRequest);
          } else {
            throw new Error("Invalid refresh token response");
          }
        } catch (refreshError) {
          console.error("Unable to refresh token:", refreshError);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
          return Promise.reject(refreshError); 
        }
      } else {
        console.log("No refresh token available, logging out.");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(error); 
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;