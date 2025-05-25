"use client"; // Mark this module as a Client Component module

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';

// This is a placeholder for the useAuth hook.
// In a real application, this would likely connect to a Context or a state management library (like Zustand, Redux).

// Define a basic user type, expand as needed
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  householdId?: string | null;
  // add other user properties like roles, permissions etc.
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (emailOrUsername: string, password?: string) => Promise<void>; // Example login function
  logout: () => Promise<void>;
  // Add signup, fetchUser, etc. as needed
}

// Create a context with a default undefined value to ensure it's used within a provider
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Placeholder AuthProvider - in a real app, this would handle actual auth logic
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Simulate initial loading

  useEffect(() => {
    // Simulate checking auth status on mount (e.g., from localStorage)
    const storedToken = localStorage.getItem('rentmate_token');
    const storedUser = localStorage.getItem('rentmate_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser) as AuthUser);
      } catch (e) {
        console.error("Failed to parse stored user:", e);
        localStorage.removeItem('rentmate_user'); // Clear corrupted data
        localStorage.removeItem('rentmate_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (emailOrUsername: string, password?: string) => {
    setIsLoading(true);
    console.log(`Attempting login for ${emailOrUsername} with password: ${password ? 'provided' : 'not provided'}`);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockUser: AuthUser = { id: 'user-123', email: emailOrUsername, name: 'Demo User', householdId: 'hh-abc' };
    const mockToken = 'mock-jwt-token';
    setUser(mockUser);
    setToken(mockToken);
    localStorage.setItem('rentmate_token', mockToken);
    localStorage.setItem('rentmate_user', JSON.stringify(mockUser));
    console.log("Login successful", mockUser);
    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(null);
    setToken(null);
    localStorage.removeItem('rentmate_token');
    localStorage.removeItem('rentmate_user');
    console.log("Logout successful");
    setIsLoading(false);
  };

  const value = { user, token, isLoading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// The custom hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 