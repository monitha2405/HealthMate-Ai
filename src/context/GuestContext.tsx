import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { UserProfile } from '../types';

export interface GuestUser {
  id: string;
  uid: string; // compatibility alias
  displayName: string;
  sessionId: string;
  isAnonymous: boolean;
}

interface GuestContextType {
  guest: GuestUser | null;
  user: GuestUser | null; // compatibility alias
  token: string | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  getIdToken: () => Promise<string | null>;
  resetGuestSession: () => Promise<{ success: boolean; message: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  retryAuth: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const GuestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [guest, setGuest] = useState<GuestUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const initSession = useCallback(async () => {
    setLoading(true);
    setAuthError(null);

    try {
      // 1. Establish or read HttpOnly cookie session
      const sessionData = await api.getCurrentSession();
      const guestObj: GuestUser = {
        id: sessionData.guest.id,
        uid: sessionData.guest.id,
        displayName: sessionData.guest.displayName || 'Guest User',
        sessionId: sessionData.guest.sessionId,
        isAnonymous: true
      };
      setGuest(guestObj);

      // 2. Fetch profile for this guest
      try {
        const profileData = await api.getProfile();
        if (profileData?.profile) {
          setProfile(profileData.profile);
        }
      } catch (profErr) {
        console.warn('Profile load note:', profErr);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Session initialization error:', err);
      setAuthError(err.message || 'Unable to establish secure anonymous session.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initSession();
  }, [initSession]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const res = await api.updateProfile(updates);
    if (res?.profile) {
      setProfile(res.profile);
      if (res.profile.displayName && guest) {
        setGuest({ ...guest, displayName: res.profile.displayName });
      }
    }
  };

  const resetGuestSession = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await api.resetData();
      if (res?.success) {
        if (res.newGuest) {
          setGuest({
            id: res.newGuest.id,
            uid: res.newGuest.id,
            displayName: res.newGuest.displayName || 'Guest User',
            sessionId: res.newGuest.sessionId,
            isAnonymous: true
          });
        }
        setProfile(null);
        return {
          success: true,
          message: 'All personal records have been permanently purged and session renewed.'
        };
      }
      return {
        success: false,
        message: res?.error || 'Failed to purge guest records.'
      };
    } catch (err: any) {
      console.error('Reset session failed:', err);
      return {
        success: false,
        message: err.message || 'Error occurred while resetting guest session.'
      };
    }
  };

  const getIdToken = async (): Promise<string | null> => null;

  return (
    <GuestContext.Provider
      value={{
        guest,
        user: guest,
        token: null,
        profile,
        loading,
        authError,
        getIdToken,
        resetGuestSession,
        updateProfile,
        retryAuth: initSession
      }}
    >
      {children}
    </GuestContext.Provider>
  );
};

export const useGuest = () => {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
};

// Aliases for seamless drop-in compatibility
export const AuthProvider = GuestProvider;
export const useAuth = useGuest;
