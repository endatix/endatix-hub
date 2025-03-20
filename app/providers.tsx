'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import PostHogPageView from "./PostHogPageView"
import PostHogUserIdentity from "./PostHogUserIdentity"
import { SessionData } from "@/features/auth/shared/auth.types"

interface PostHogProviderProps {
  children: React.ReactNode
  session: SessionData
}

export function PostHogProvider({ children, session }: PostHogProviderProps) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: false // Disable automatic pageview capture, as we capture manually
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      <PostHogUserIdentity session={session} />
      {children}
    </PHProvider>
  )
}
