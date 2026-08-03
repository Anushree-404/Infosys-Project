'use client';

/**
 * Authentication Context
 * Provides auth state and actions across the application
 */

import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import type { User, AuthState, LoginInput, RegisterInput } from '@/types';
import * as authService from '@/services/auth.service';
import { getProfile } from '@/services/profile.service';
import { getAccessToken, clearAccessToken } from '@/services/api';
import toast from 'react-hot-toast';

// ============================================================
// TYPES
// ============================================================

interface AuthContextType extends AuthState {
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: { user: User; accessToken: string } }
  | { type: 'CLEAR_AUTH' };

// ============================================================
// REDUCER
// ============================================================

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'CLEAR_AUTH':
      return {
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
};

// ============================================================
// CONTEXT
// ============================================================

const AuthContext = createContext<AuthContextType | null>(null);

// ============================================================
// PROVIDER
// ============================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  /**
   * Initialize auth state on app load
   * Try to restore session using stored token
   */
  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();

      if (!token) {
        // Try to refresh using httpOnly cookie
        try {
          await authService.refreshToken();
          const user = await getProfile();
          const newToken = getAccessToken();
          if (newToken && user) {
            dispatch({ type: 'SET_USER', payload: { user, accessToken: newToken } });
          } else {
            dispatch({ type: 'CLEAR_AUTH' });
          }
        } catch {
          dispatch({ type: 'CLEAR_AUTH' });
        }
        return;
      }

      // Token exists - fetch user profile
      try {
        const user = await getProfile();
        dispatch({ type: 'SET_USER', payload: { user, accessToken: token } });
      } catch {
        clearAccessToken();
        dispatch({ type: 'CLEAR_AUTH' });
      }
    };

    initAuth();
  }, []);

  /**
   * Login action
   */
  const login = useCallback(async (data: LoginInput) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { user, accessToken } = await authService.login(data);
      dispatch({ type: 'SET_USER', payload: { user, accessToken } });
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}! 🌱`);
    } catch (error: unknown) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  }, []);

  /**
   * Register action
   */
  const register = useCallback(async (data: RegisterInput) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { user, accessToken } = await authService.register(data);
      dispatch({ type: 'SET_USER', payload: { user, accessToken } });
      toast.success(`Welcome to Irrigation System, ${user.fullName.split(' ')[0]}! 🎉`);
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  }, []);

  /**
   * Logout action
   */
  const logout = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await authService.logout();
    } finally {
      dispatch({ type: 'CLEAR_AUTH' });
      toast.success('Logged out successfully');
    }
  }, []);

  /**
   * Refresh user profile
   */
  const refreshUser = useCallback(async () => {
    try {
      const user = await getProfile();
      const token = getAccessToken();
      if (token) {
        dispatch({ type: 'SET_USER', payload: { user, accessToken: token } });
      }
    } catch {
      // Silent fail
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================
// HOOK
// ============================================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
