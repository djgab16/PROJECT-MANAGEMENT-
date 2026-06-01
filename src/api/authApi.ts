import apiClient from './apiClient';

export interface EmployeeInfo {
  employeeId: string;
  name: string;
  role: 'ADMIN' | 'OP. TEAM' | 'DRIVER';
  systemAccess: string;
  status: 'Active' | 'Pending' | 'Locked';
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  employee: EmployeeInfo;
}

export interface AuthErrorResponse {
  message: string;
  reason?: string;
}

/**
 * Logs in a user using EmployeeId and Password.
 */
export async function loginUser(employeeId: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', {
    employeeId,
    password,
  });
  return response.data;
}

/**
 * Exchanges a Refresh Token for a new pair of Access & Refresh tokens.
 */
export async function refreshSession(refreshToken: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/refresh', {
    refreshToken,
  });
  return response.data;
}

/**
 * Revokes the Refresh Token and logs the user out.
 */
export async function logoutUser(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', {
    refreshToken,
  });
}

/**
 * Returns current logged-in user profile info verified by the token.
 */
export async function getProfileInfo(): Promise<EmployeeInfo> {
  const response = await apiClient.get<EmployeeInfo>('/auth/me');
  return response.data;
}
