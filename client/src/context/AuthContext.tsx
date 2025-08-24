import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Types for authentication
interface User {
  id: string;
  email: string;
}

interface UserApiKey {
  id: string;
  service: string;
  keyName: string;
  createdAt: string;
}

interface AuthContextType {
  // User state
  user: User | null;
  loading: boolean;
  
  // Authentication methods
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // API key management
  apiKeys: UserApiKey[];
  addApiKey: (service: string, apiKey: string, keyName?: string) => Promise<void>;
  removeApiKey: (keyId: string) => Promise<void>;
  refreshApiKeys: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<UserApiKey[]>([]);

  // Check authentication status on app load
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Include session cookies
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        if (data.user) {
          // Load user's API keys if authenticated
          await refreshApiKeys();
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh API keys from server
  const refreshApiKeys = useCallback(async () => {
    if (!user) {
      setApiKeys([]);
      return;
    }

    try {
      const response = await fetch('/api/auth/api-keys', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const keys = await response.json();
        setApiKeys(keys);
      } else {
        console.error('Failed to fetch API keys');
        setApiKeys([]);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      setApiKeys([]);
    }
  }, [user]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login method
  const login = async (email: string, password: string): Promise<void> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    setUser(data.user);
    await refreshApiKeys();
  };

  // Signup method
  const signup = async (email: string, password: string): Promise<void> => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0] || error.error || 'Registration failed');
    }

    const data = await response.json();
    setUser(data.user);
    await refreshApiKeys();
  };

  // Logout method
  const logout = async (): Promise<void> => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      console.error('Logout request failed, but clearing local state anyway');
    }

    setUser(null);
    setApiKeys([]);
  };

  // Add API key method
  const addApiKey = async (service: string, apiKey: string, keyName?: string): Promise<void> => {
    const response = await fetch('/api/auth/api-keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        service, 
        apiKey, 
        keyName: keyName || `${service.charAt(0).toUpperCase() + service.slice(1)} Key` 
      }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add API key');
    }

    // Refresh the API keys list
    await refreshApiKeys();
  };

  // Remove API key method
  const removeApiKey = async (keyId: string): Promise<void> => {
    const response = await fetch(`/api/auth/api-keys/${keyId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove API key');
    }

    // Remove from local state immediately for better UX
    setApiKeys(prev => prev.filter(key => key.id !== keyId));
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    apiKeys,
    addApiKey,
    removeApiKey,
    refreshApiKeys,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};