import { useEffect, useRef } from "react";

interface UseDebouncedResizeOptions {
  delay?: number;
  onResize: () => void;
}

const DEFAULT_DELAY_IN_MS = 100;

/**
 * Custom hook for handling debounced window resize events
 * @param options - Configuration object with delay and onResize callback
 * @param options.delay - Debounce delay in milliseconds (default: 100)
 * @param options.onResize - Callback function to execute on resize
 */
export const useDebouncedResize = ({
  delay = DEFAULT_DELAY_IN_MS,
  onResize,
}: UseDebouncedResizeOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const handleResize = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        onResize();
      }, delay);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onResize, delay]);
};
