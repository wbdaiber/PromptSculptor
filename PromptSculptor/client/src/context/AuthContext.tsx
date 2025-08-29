import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getCurrentUser, getUserApiKeys, addUserApiKey, deleteUserApiKey, login as apiLogin, signup as apiSignup, logout as apiLogout } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

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
      const data = await getCurrentUser();
      setUser(data.user);
      if (data.user) {
        // Load user's API keys if authenticated
        try {
          const apiKeyData = await getUserApiKeys();
          setApiKeys(apiKeyData.keys || apiKeyData);
        } catch (error) {
          console.error('Failed to fetch API keys during auth check:', error);
          setApiKeys([]);
        }
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
      const data = await getUserApiKeys();
      setApiKeys(data.keys || data);
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
    const data = await apiLogin(email, password);
    setUser(data.user);
    
    // Load user's API keys after login
    try {
      const apiKeyData = await getUserApiKeys();
      setApiKeys(apiKeyData.keys || apiKeyData);
    } catch (error) {
      console.error('Failed to fetch API keys after login:', error);
      setApiKeys([]);
    }
  };

  // Signup method
  const signup = async (email: string, password: string): Promise<void> => {
    const data = await apiSignup(email, password);
    setUser(data.user);
    
    // New users won't have API keys yet, but initialize empty array
    setApiKeys([]);
  };

  // Logout method
  const logout = async (): Promise<void> => {
    try {
      await apiLogout();
    } catch (error) {
      console.error('Logout request failed, but clearing local state anyway');
    }

    setUser(null);
    setApiKeys([]);
    
    // Clear all cached query data to prevent showing previous user's data
    queryClient.clear();
    
    // Specifically remove template queries to ensure they are cleared
    queryClient.removeQueries({ queryKey: ['/api/templates'] });
    queryClient.removeQueries({ queryKey: ['/api/prompts'] });
    
    // Force immediate refetch of templates for demo mode
    queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
  };

  // Add API key method
  const addApiKey = async (service: string, apiKey: string, keyName?: string): Promise<void> => {
    await addUserApiKey(
      service, 
      apiKey, 
      keyName || `${service.charAt(0).toUpperCase() + service.slice(1)} Key`
    );

    // Refresh the API keys list
    await refreshApiKeys();
  };

  // Remove API key method
  const removeApiKey = async (keyId: string): Promise<void> => {
    await deleteUserApiKey(keyId);

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