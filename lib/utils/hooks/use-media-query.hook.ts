"use client";

import { useEffect, useState } from "react";

/**
 * React hook to check if a media query matches.
 * @param query - The media query to check.
 * @returns True if the media query matches, false otherwise.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Initial check
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    // Add listener for changes
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);
  
  return matches;
} 