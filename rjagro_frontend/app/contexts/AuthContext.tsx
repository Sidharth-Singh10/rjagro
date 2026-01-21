'use client'
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types/auth';
import { useRouter } from 'next/navigation';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);


  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if "token" cookie exists
        const getCookie = (name: string) => {
          const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
          return match ? match[2] : null;
        };

        const tokenCookie = getCookie('token');
        if (!tokenCookie) {
          router.push('/');
          return;
        }

        // Optionally, decode JWT and check expiry
        const decodeJwt = (token: string) => {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload;
          } catch {
            return null;
          }
        };

        const payload = decodeJwt(tokenCookie);
        if (!payload || (payload.exp && Date.now() >= payload.exp * 1000)) {
          router.push('/');
          return;
        }

        // If token is valid, restore user from localStorage
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const parsedUser: User = JSON.parse(savedUser);
          setUser(parsedUser);
        }
        setToken(tokenCookie);
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('user');
        await logout();
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, [router]);

  const login = (userData: User, authToken: string): void => {
    try {
      setUser(userData);
      setToken(authToken);
      document.cookie = `token=${authToken}; path=/;`;
      // Only save user data to localStorage (token is in HTTP-only cookie)
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving auth data:', error);
      throw new Error('Failed to save authentication data');
    }
  };


  const logout = async (): Promise<void> => {
    try {
      setUser(null);
      setToken(null);
      localStorage.removeItem('user');
      // Remove all cookies (or just the "token" cookie)
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if logout API fails, clear local state
      setUser(null);
      setToken(null);
      localStorage.removeItem('user');
    }
  };

  const contextValue: AuthContextType = {
    user,
    token,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;