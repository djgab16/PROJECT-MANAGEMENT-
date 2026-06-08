import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/axios';
import type { Employee } from '../types';

interface AuthContextType {
  user: Employee | null;
  login: (employeeId: string, password: string) => Promise<Employee>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('dts_token');
      if (token) {
        try {
          const response = await apiClient.get('/api/auth/profile');
          const emp = response.data;
          setUser({ ...emp, id: String(emp.id) });
        } catch (error) {
          console.error("Failed to restore session", error);
          localStorage.removeItem('dts_token');
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (employeeId: string, password: string): Promise<Employee> => {
    try {
      const loginRes = await apiClient.post('/api/auth/login', { employeeId, password });
      const token = loginRes.data.token;
      localStorage.setItem('dts_token', token);
      
      const profileRes = await apiClient.get('/api/auth/profile');
      const emp = profileRes.data;
      const employeeData = { ...emp, id: String(emp.id) };
      setUser(employeeData);
      return employeeData;
    } catch (error: any) {
      throw error.response?.data?.message || "Login failed";
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('dts_token');
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
