'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  userData: UserProfile | null;
  loading: boolean;
  logout: () => void;
  login: (user: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  logout: () => {},
  login: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUserData = localStorage.getItem('userData');
      if (storedUserData) {
        const parsedData = JSON.parse(storedUserData);
        // We need to convert timestamp strings back to Date objects, then to Timestamp objects
        const aT = new Date(parsedData.createdAt);
        const lA = new Date(parsedData.lastActive);
        parsedData.createdAt = Timestamp.fromDate(aT);
        parsedData.lastActive = Timestamp.fromDate(lA);
        setUserData(parsedData);
        setUser(parsedData as User);
      }
    } catch (error) {
      console.error("Failed to parse user data from localStorage", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (userProfile: UserProfile) => {
    const userForState = {
      ...userProfile,
      // Convert Date objects to Timestamps for consistency with Firestore types
      createdAt: Timestamp.fromDate(userProfile.createdAt as Date),
      lastActive: Timestamp.fromDate(userProfile.lastActive as Date),
    }

    setUserData(userForState);
    setUser(userProfile as any as User); // Mocking Firebase User object
    localStorage.setItem('userData', JSON.stringify(userProfile));
  };

  const logout = () => {
    setUser(null);
    setUserData(null);
    localStorage.removeItem('userData');
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout, login }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
