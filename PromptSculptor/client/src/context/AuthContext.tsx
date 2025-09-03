import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getCurrentUser, getUserApiKeys, addUserApiKey, deleteUserApiKey, login as apiLogin, signup as apiSignup, logout as apiLogout, changePassword as apiChangePassword, deleteAccount as apiDeleteAccount } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

// Types for authentication
interface User {
  id: string;
  username: string;
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
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // Password and account management
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  
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
  const [authOperationInProgress, setAuthOperationInProgress] = useState(false);

  // Use ref to track current auth operation
  const authOperationRef = useRef<Promise<void> | null>(null);

  // Synchronized authentication check with operation locking
  const checkAuth = useCallback(async () => {
    // Prevent concurrent auth operations
    if (authOperationRef.current) {
      await authOperationRef.current;
      return;
    }

    const authOperation = async () => {
      setAuthOperationInProgress(true);
      try {
        const data = await getCurrentUser();
        
        if (data.user) {
          setUser(data.user);
          try {
            const apiKeyData = await getUserApiKeys();
            setApiKeys(apiKeyData.keys || apiKeyData);
          } catch (error) {
            console.error('Failed to fetch API keys during auth check:', error);
            setApiKeys([]);
          }
        } else {
          // Guest user - this is normal, not an error
          setUser(null);
          setApiKeys([]);
        }
      } catch (error) {
        // Only log unexpected errors
        console.error('Unexpected auth error:', error);
        setUser(null);
        setApiKeys([]);
      } finally {
        setLoading(false);
        setAuthOperationInProgress(false);
        authOperationRef.current = null;
      }
    };

    authOperationRef.current = authOperation();
    return authOperationRef.current;
  }, []);

  // Synchronized API key refresh with operation check
  const refreshApiKeys = useCallback(async () => {
    if (!user) {
      setApiKeys([]);
      return;
    }

    // Don't start new operations during auth operations
    if (authOperationInProgress) {
      return;
    }

    try {
      const data = await getUserApiKeys();
      setApiKeys(data.keys || data);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      setApiKeys([]);
    }
  }, [user, authOperationInProgress]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Synchronized login with proper state management
  const login = async (email: string, password: string): Promise<void> => {
    if (authOperationInProgress) {
      throw new Error('Authentication operation in progress');
    }

    setAuthOperationInProgress(true);
    try {
      const data = await apiLogin(email, password);
      setUser(data.user);
      
      // Wait for user state to be set before fetching API keys
      await new Promise(resolve => setTimeout(resolve, 0));
      
      try {
        const apiKeyData = await getUserApiKeys();
        setApiKeys(apiKeyData.keys || apiKeyData);
      } catch (error) {
        console.error('Failed to fetch API keys after login:', error);
        setApiKeys([]);
      }
    } finally {
      setAuthOperationInProgress(false);
    }
  };

  // Synchronized signup with proper state management
  const signup = async (username: string, email: string, password: string): Promise<void> => {
    if (authOperationInProgress) {
      throw new Error('Authentication operation in progress');
    }

    setAuthOperationInProgress(true);
    try {
      const data = await apiSignup(username, email, password);
      setUser(data.user);
      
      // New users won't have API keys yet, but initialize empty array
      setApiKeys([]);
    } finally {
      setAuthOperationInProgress(false);
    }
  };

  // Atomic logout with proper cleanup order
  const logout = async (): Promise<void> => {
    if (authOperationInProgress) {
      return;
    }

    setAuthOperationInProgress(true);
    try {
      // Clear local state first
      setUser(null);
      setApiKeys([]);
      
      // Then clear caches
      queryClient.clear();
      queryClient.removeQueries({ queryKey: ['/api/templates'] });
      queryClient.removeQueries({ queryKey: ['/api/prompts'] });
      
      // Finally make the logout API call
      try {
        await apiLogout();
      } catch (error) {
        console.error('Logout request failed, but local state cleared');
      }
      
      // Force refetch for demo mode
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
    } finally {
      setAuthOperationInProgress(false);
    }
  };

  // Change password method
  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiChangePassword(currentPassword, newPassword);
  };

  // Synchronized delete account with proper cleanup
  const deleteAccount = async (password: string): Promise<void> => {
    if (authOperationInProgress) {
      throw new Error('Authentication operation in progress');
    }

    setAuthOperationInProgress(true);
    try {
      await apiDeleteAccount(password);
      
      // After successful account deletion, clear local state as if logging out
      setUser(null);
      setApiKeys([]);
      
      // Clear all cached query data
      queryClient.clear();
      
      // Specifically remove template and prompt queries
      queryClient.removeQueries({ queryKey: ['/api/templates'] });
      queryClient.removeQueries({ queryKey: ['/api/prompts'] });
      
      // Force immediate refetch of templates for demo mode
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
    } finally {
      setAuthOperationInProgress(false);
    }
  };

  // Synchronized add API key method
  const addApiKey = async (service: string, apiKey: string, keyName?: string): Promise<void> => {
    if (authOperationInProgress) {
      throw new Error('Authentication operation in progress');
    }

    await addUserApiKey(
      service, 
      apiKey, 
      keyName || `${service.charAt(0).toUpperCase() + service.slice(1)} Key`
    );

    // Refresh the API keys list
    await refreshApiKeys();
  };

  // Synchronized remove API key method
  const removeApiKey = async (keyId: string): Promise<void> => {
    if (authOperationInProgress) {
      throw new Error('Authentication operation in progress');
    }

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
    changePassword,
    deleteAccount,
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