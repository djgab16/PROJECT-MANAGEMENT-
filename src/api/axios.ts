import axios from 'axios';

// The backend is running on https://localhost:5001 or http://localhost:5000 generally.
// For now we'll set it to a generic ASP.NET Core URL and use environment variables if available.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 second timeout — surfaces a dead API as an error instead of a silent hang
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to add the JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dts_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses to handle 401 Unauthorized globally and refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isProfileCheck = originalRequest?.url?.includes('/api/auth/profile');

    // Check if error is 401, we haven't retried yet, and this isn't a direct login request
    if (error.response && error.response.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/api/auth/login')) {
      originalRequest._retry = true;

      const savedUser = localStorage.getItem('dts_user');
      if (savedUser) {
        try {
          const authData = JSON.parse(savedUser);
          const refreshToken = authData.refreshToken;

          // Make sure we have a real refresh token (not the mock 'api_refresh_token')
          if (refreshToken && refreshToken !== 'api_refresh_token') {
            // Call the refresh endpoint using a fresh axios instance to avoid infinite interceptor loops
            const response = await axios.post(`${API_URL}/api/auth/refresh`, {
              refreshToken,
            });

            if (response.status === 200) {
              const { accessToken, refreshToken: newRefreshToken } = response.data;

              // Save updated tokens
              localStorage.setItem('dts_token', accessToken);
              localStorage.setItem('dts_user', JSON.stringify({
                ...authData,
                accessToken,
                refreshToken: newRefreshToken,
              }));

              // Retry the original request with new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              }
              return apiClient(originalRequest);
            }
          }
        } catch (refreshError) {
          console.error('Session expired. Logging out...', refreshError);
        }
      }

      // If refresh failed or was not possible, perform logout
      const token = localStorage.getItem('dts_token');
      if (token && !isProfileCheck) {
        localStorage.removeItem('dts_token');
        localStorage.removeItem('dts_user');
        localStorage.removeItem('dts_user_profile');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
