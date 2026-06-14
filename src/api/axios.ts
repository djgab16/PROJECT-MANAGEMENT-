import axios from 'axios';

// The backend is running on https://localhost:5001 or http://localhost:5000 generally.
// For now we'll set it to a generic ASP.NET Core URL and use environment variables if available.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: API_URL,
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

// Intercept responses to handle 401 Unauthorized globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const token = localStorage.getItem('dts_token');
      // Only redirect to login if there was actually a token stored (i.e. this is an
      // expired-session case, not the initial auth-check on a fresh load without a token).
      // Also skip the redirect for the profile-check route itself so AuthContext can handle
      // the failure gracefully without a hard reload loop.
      const isProfileCheck = error.config?.url?.includes('/api/auth/profile');
      if (token && !isProfileCheck) {
        localStorage.removeItem('dts_token');
        localStorage.removeItem('dts_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
