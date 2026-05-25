import React, { createContext, useContext, useState } from 'react';
import type { Employee } from '../types';

interface AuthContextType {
  user: Employee | null;
  login: (employee: Employee) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Employee | null>(() => {
    const savedUser = localStorage.getItem('dts_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser) as Employee;
      return parsed;
    }
    return null;
  });

  const login = (employee: Employee) => {
    setUser(employee);
    localStorage.setItem('dts_user', JSON.stringify(employee));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('dts_user');
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
