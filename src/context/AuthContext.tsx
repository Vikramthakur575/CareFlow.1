import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/index.ts';
import { authApi, setStoredToken, getStoredToken } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  quickDemoLogin: (role: 'patient' | 'admin') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check current session on initial load
  useEffect(() => {
    async function checkAuth() {
      const token = getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await authApi.me();
        setUser(data.user);
      } catch (err) {
        // Token expired or invalid
        setStoredToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setStoredToken(res.token);
    setUser(res.user);
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const res = await authApi.register(name, email, password, phone);
    setStoredToken(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Continue client cleanup even if network fails
    }
    setStoredToken(null);
    setUser(null);
  };

  const quickDemoLogin = async (role: 'patient' | 'admin') => {
    if (role === 'admin') {
      await login('admin@careflow.com', 'admin123');
    } else {
      await login('sarah.jenkins@example.com', 'patient123');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, quickDemoLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
