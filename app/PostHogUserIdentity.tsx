'use client'

import { useEffect } from "react"
import { usePostHog } from 'posthog-js/react'
import { SessionData } from "@/features/auth/shared/auth.types"

interface PostHogUserIdentityProps {
  session: SessionData
}

export default function PostHogUserIdentity({ session }: PostHogUserIdentityProps): null {
  const posthog = usePostHog()

  useEffect(() => {
    if (!posthog) return;
    
    // Use anonymous ID logic
    const getOrCreateAnonymousId = () => {
      if (typeof window !== 'undefined') {
        const storedId = localStorage.getItem('anon_id');
        if (storedId) {
          return storedId;
        }
        
        const newId = `anon_${crypto.randomUUID()}`;
        localStorage.setItem('anon_id', newId);
        return newId;
      }
      
      return null;
    };

    const anonymousId = getOrCreateAnonymousId();
    
    if (anonymousId) {
      posthog.identify(anonymousId, {
        isLoggedIn: session.isLoggedIn,
      });
    }
  }, [posthog, session.isLoggedIn]);
  
  return null
}
