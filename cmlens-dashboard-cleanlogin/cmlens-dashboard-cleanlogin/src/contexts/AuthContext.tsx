import React, { createContext, useContext, useEffect, useState } from 'react';

// PostgreSQL Authentication - No Firebase dependencies
const API_BASE_URL = import.meta.env.PROD
  ? 'https://cmlens-dashboard-production.up.railway.app'
  : 'http://localhost:8080';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: number;
  teamName: string | null;
}

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Store and retrieve token from localStorage
  const getToken = () => localStorage.getItem('authToken');
  const setToken = (token: string) => localStorage.setItem('authToken', token);
  const removeToken = () => localStorage.removeItem('authToken');

  async function signup(email: string, password: string, displayName?: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          firstName: displayName || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // Store token and set user
      setToken(data.token);
      setCurrentUser({
        uid: data.user.id,
        email: data.user.email,
        displayName: data.user.firstName || null,
        role: data.user.role,
        teamName: data.user.teamName || null,
      });
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  async function login(email: string, password: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token and set user
      setToken(data.token);
      setCurrentUser({
        uid: data.user.id,
        email: data.user.email,
        displayName: data.user.firstName || null,
        role: data.user.role,
        teamName: data.user.teamName || null,
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      const token = getToken();
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      removeToken();
      setCurrentUser(null);
    }
  }

  async function resetPassword(email: string) {
    // TODO: Implement password reset endpoint
    console.log('Password reset not yet implemented');
    throw new Error('Password reset not yet implemented. Please contact an administrator.');
  }

  // Check for existing session on mount
  useEffect(() => {
    async function checkAuth() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Session expired');
        }

        const data = await response.json();
        setCurrentUser({
          uid: data.id,
          email: data.email,
          displayName: data.firstName || null,
          role: data.role,
          teamName: data.teamName || null,
        });
      } catch (error) {
        console.error('Auth check error:', error);
        removeToken();
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  const value = {
    currentUser,
    login,
    signup,
    logout,
    resetPassword,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
