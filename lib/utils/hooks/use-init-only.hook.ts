import { RefObject, useEffect, useRef } from "react";

/**
 * Encapsulate "Volatile" Setup Data: Captures the value in a ref and keeps it updated on every render. 
 * This allows the value to be used in initialization effects without triggering re-renders or requiring it in the effect dependency array.
 *
 * Use this for "Initial State" props (like submission, initialData) that are needed for setup but should not cause re-initialization if they change.
 *
 * @param value The value to capture
 * @returns A ref object containing the latest value
 */
export function useInitOnly<T>(value: T): RefObject<T> {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}
