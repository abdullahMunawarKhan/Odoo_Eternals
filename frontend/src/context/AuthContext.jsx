import React, { useEffect, useState, useCallback } from 'react';
import { authService } from '../services/authService';
import { AuthContext } from './authContextDef';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to fetch profile for user
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    try {
      let prof = await authService.getUserProfile(userId);

      // In case trigger is slightly delayed on brand-new signup, retry once after 500ms
      if (!prof) {
        await new Promise((res) => setTimeout(res, 600));
        prof = await authService.getUserProfile(userId);
      }

      setProfile(prof);
      return prof;
    } catch (err) {
      console.error('Failed to load user profile:', err);
      return null;
    }
  }, []);

  // Initialize session and listen to changes
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const initialSession = await authService.getSession();
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user || null);
          if (initialSession?.user) {
            await fetchProfile(initialSession.user.id);
          }
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    // Subscribe to auth state updates
    const { data: authListener } = authService.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      setSession(currentSession);
      const currentUser = currentSession?.user || null;
      setUser(currentUser);

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false);
      } else if (currentUser) {
        await fetchProfile(currentUser.id);
        setLoading(false);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, [fetchProfile]);

  const login = async ({ email, password }) => {
    const data = await authService.login({ email, password });
    if (data?.user) {
      setUser(data.user);
      setSession(data.session);
      const prof = await fetchProfile(data.user.id);
      return { user: data.user, profile: prof };
    }
    return data;
  };

  const register = async (details) => {
    const data = await authService.registerCustomer(details);
    if (data?.user) {
      setUser(data.user);
      setSession(data.session);
      await fetchProfile(data.user.id);
    }
    return data;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      return await fetchProfile(user.id);
    }
    return null;
  };

  const role = profile?.role || null;

  const value = {
    session,
    user,
    profile,
    role,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
