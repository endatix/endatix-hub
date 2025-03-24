'use client';

import { useCallback, useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';
import type { SessionData } from '@/features/auth';

/**
 * Core PostHog identity management
 * Provides functions to handle user identification and manages anonymous IDs
 */
export const useIdentify = () => {
  const posthog = usePostHog();

  /**
   * Generate a new anonymous ID
   */
  const createAnonymousId = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    try {
      // Create a random ID using crypto API if available, fallback to Math.random
      const newId = `anon_${
        crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 15)
      }`;
      localStorage.setItem('anon_id', newId);
      return newId;
    } catch (error) {
      console.error('[PostHog] Failed to create anonymous ID:', error);
      return null;
    }
  }, []);

  /**
   * Get or create an anonymous ID
   */
  const getOrCreateAnonymousId = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    const storedId = localStorage.getItem('anon_id');
    if (storedId) {
      return storedId;
    }
    
    return createAnonymousId();
  }, [createAnonymousId]);

  /**
   * Identify a user with PostHog
   */
  const identify = useCallback(
    (distinctId: string, properties?: Record<string, string | number | boolean | null>) => {
      if (!posthog || typeof window === 'undefined') return;
      
      try {
        posthog.identify(distinctId, properties);
      } catch (error) {
        console.error(`[PostHog] Failed to identify user ${distinctId}:`, error);
      }
    },
    [posthog]
  );

  /**
   * Alias a user - associates an existing anonymous ID with a new ID (usually email)
   */
  const alias = useCallback(
    (newDistinctId: string, previousDistinctId: string) => {
      if (!posthog || typeof window === 'undefined') return;
      
      try {
        posthog.alias(newDistinctId, previousDistinctId);
      } catch (error) {
        console.error(`[PostHog] Failed to alias user ${previousDistinctId} to ${newDistinctId}:`, error);
      }
    },
    [posthog]
  );

  /**
   * Reset to a new anonymous ID
   */
  const resetAnonymousId = useCallback(() => {
    if (typeof window === 'undefined' || !posthog) return null;
    
    const newId = createAnonymousId();
    
    if (newId) {
      identify(newId, { isLoggedIn: false });
    }
    
    return newId;
  }, [createAnonymousId, identify, posthog]);

  /**
   * Identify a logged-in user by email
   */
  const identifyLoggedInUser = useCallback(
    (email: string, properties?: Record<string, string | number | boolean | null>) => {
      if (!posthog || typeof window === 'undefined' || !email) return;
      
      try {
        const anonymousId = localStorage.getItem('anon_id');
        
        identify(email, {
          isLoggedIn: true,
          email,
          ...properties
        });
        
        if (anonymousId && anonymousId !== email) {
          alias(email, anonymousId);
        }
      } catch (error) {
        console.error(`[PostHog] Failed to identify logged in user ${email}:`, error);
      }
    },
    [posthog, identify, alias]
  );

  /**
   * Handle session changes automatically
   * Returns a boolean indicating if PostHog is active
   */
  const handleSession = useCallback((session?: SessionData) => {
    if (!posthog || typeof window === 'undefined') return false;
    
    const isLoggedIn = session?.isLoggedIn === true;
    const email = session?.username;
    
    if (isLoggedIn && email) {
      identifyLoggedInUser(email);
      return true;
    } else {
      // Get or create anonymous ID for anonymous users
      const anonymousId = getOrCreateAnonymousId();
      if (anonymousId) {
        identify(anonymousId, { isLoggedIn: false });
      }
      return true;
    }
  }, [posthog, identifyLoggedInUser, getOrCreateAnonymousId, identify]);

  return {
    identify,
    alias,
    identifyLoggedInUser,
    resetAnonymousId,
    handleSession,
    getOrCreateAnonymousId
  };
};

/**
 * Hook to automatically handle user identification based on session
 * Simplified to focus on the happy path - identifying logged in users with their email
 * and anonymous users with a persistent anonymous ID
 */
export const useSessionIdentity = (session?: SessionData) => {
  const { handleSession } = useIdentify();
  const posthog = usePostHog();
  
  useEffect(() => {
    if (!posthog) return;
    
    // Simply handle the current session state
    handleSession(session);
  }, [session, posthog, handleSession]);
}; 