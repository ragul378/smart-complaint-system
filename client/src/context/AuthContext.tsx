import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getAuthToken, removeAuthToken, setAuthToken } from '../services/api';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'USER' | 'STAFF' | 'ADMIN';
  department_id?: number;
  department_name?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  register: (name: string, email: string, pass: string, phone?: string, role?: string, deptId?: number) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
  isUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get<{ user: User }>('/auth/me');
      setUser(res.user);
    } catch (err) {
      removeAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.post<{ user: User; token: string }>('/auth/login', { email, password: pass });
    setAuthToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (name: string, email: string, pass: string, phone?: string, role = 'USER', deptId?: number) => {
    const res = await api.post<{ user: User; token: string }>('/auth/register', {
      name,
      email,
      password: pass,
      phone,
      role,
      department_id: deptId,
    });
    setAuthToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF';
  const isUser = user?.role === 'USER';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        isAdmin,
        isStaff,
        isUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
