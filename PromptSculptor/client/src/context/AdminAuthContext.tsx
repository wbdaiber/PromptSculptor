import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'google';
  authenticated: true;
  loginTime: number;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  isSessionValid: () => boolean;
  checkAuthStatus: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

interface AdminAuthProviderProps {
  children: React.ReactNode;
}

// No session timeout for OAuth (handled server-side)
const STORAGE_KEY = 'admin_oauth_session';

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if current session is valid (OAuth sessions don't expire client-side)
  const isSessionValid = useCallback((): boolean => {
    return admin !== null && admin.authenticated;
  }, [admin]);

  // Save session to sessionStorage
  const saveSession = useCallback((session: AdminUser) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save admin session:', error);
    }
  }, []);

  // Clear session from storage
  const clearSession = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear admin session:', error);
    }
  }, []);

  // Check authentication status with server
  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/auth/status', {
        method: 'GET',
        credentials: 'include', // Include cookies for session
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          const adminUser: AdminUser = {
            ...data.user,
            authenticated: true,
            loginTime: Date.now(),
          };
          setAdmin(adminUser);
          saveSession(adminUser);
        } else {
          setAdmin(null);
          clearSession();
        }
      } else {
        setAdmin(null);
        clearSession();
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setAdmin(null);
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [saveSession, clearSession]);

  // Admin login (redirect to OAuth)
  const login = (): void => {
    const returnTo = encodeURIComponent(window.location.pathname);
    window.location.href = `/api/admin/auth/google?returnTo=${returnTo}`;
  };

  // Admin logout
  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      setAdmin(null);
      clearSession();
    }
  }, [clearSession]);

  // Check auth status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const value: AdminAuthContextType = {
    admin,
    loading,
    login,
    logout,
    isSessionValid,
    checkAuthStatus,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

// Custom hook for using admin auth context
export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};