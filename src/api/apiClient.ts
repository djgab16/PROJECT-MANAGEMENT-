import axios from 'axios';

// Set your C# ASP.NET Core API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach the JWT Access Token automatically
apiClient.interceptors.request.use(
  (config) => {
    const savedUser = localStorage.getItem('dts_user');
    if (savedUser) {
      try {
        const authData = JSON.parse(savedUser);
        if (authData && authData.accessToken) {
          config.headers.Authorization = `Bearer ${authData.accessToken}`;
        }
      } catch (e) {
        console.error('Error parsing auth data from localStorage', e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to automatically refresh token on 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const savedUser = localStorage.getItem('dts_user');
      if (savedUser) {
        try {
          const authData = JSON.parse(savedUser);
          const refreshToken = authData.refreshToken;

          if (refreshToken && refreshToken !== 'api_refresh_token') {
            // Call the refresh endpoint
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            if (response.status === 200) {
              const newAuthData = response.data;
              
              // Save updated tokens
              localStorage.setItem('dts_token', newAuthData.accessToken);
              localStorage.setItem('dts_user', JSON.stringify({
                ...authData,
                accessToken: newAuthData.accessToken,
                refreshToken: newAuthData.refreshToken,
              }));

              // Retry the original request with new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newAuthData.accessToken}`;
              }
              return apiClient(originalRequest);
            }
          }
        } catch (refreshError) {
          console.error('Session expired. Logging out...', refreshError);
          localStorage.removeItem('dts_token');
          localStorage.removeItem('dts_user');
          localStorage.removeItem('dts_user_profile');
          window.location.href = '/login'; // Redirect to login page
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
