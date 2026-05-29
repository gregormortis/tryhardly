'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from './api';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  xp: number;
  level: number;
  avatarUrl?: string;
  bio?: string;
  adventurerClass?: string;
  reputationScore?: number;
  totalQuestsCompleted?: number;
  totalQuestsPosted?: number;
  verified?: boolean;
  role?: string;
  guild?: { id: string; name: string; tag: string };
  stripeAccountId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    const stored = localStorage.getItem('token');
    if (stored) {
      setToken(stored);
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchCurrentUser() {
    try {
      // /auth/me returns the user object directly; /users/me wraps it as { user }.
      // Accept either shape so a backend change can't silently log users out.
      const data = await api.get<User | { user: User }>('/auth/me');
      const u = (data as { user?: User })?.user ?? (data as User);
      if (u && u.id) {
        setUser(u);
      } else {
        throw new Error('Invalid /auth/me payload');
      }
    } catch {
      if (typeof window !== 'undefined') localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const data = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function register(username: string, email: string, password: string) {
    const data = await api.post<{ token: string; user: User }>('/auth/register', { username, email, password });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    await fetchCurrentUser();
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
