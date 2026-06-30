import { describe, expect, it, vi } from "vitest";
import type { Question } from "survey-core";
import {
  clearChoicesLazyLoadCompletedHandlersForTests,
  clearChoicesLazyLoadGuardsForTests,
  notifyChoicesLazyLoadCompleted,
  registerChoicesLazyLoadCompletedHandler,
  registerChoicesLazyLoadGuard,
  shouldSuppressChoicesLazyLoad,
  unregisterChoicesLazyLoadCompletedHandler,
  unregisterChoicesLazyLoadGuard,
} from "../choices-lazy-load-guards";

describe("choices-lazy-load-guards", () => {
  it("returns false when no guards are registered", () => {
    // Arrange
    clearChoicesLazyLoadGuardsForTests();
    const question = { name: "q1" } as Question;

    // Act & Assert
    expect(shouldSuppressChoicesLazyLoad(question, "abc")).toBe(false);
  });

  it("returns true when any guard returns true", () => {
    // Arrange
    clearChoicesLazyLoadGuardsForTests();
    const question = { name: "q1" } as Question;
    const suppressGuard = () => true;
    const allowGuard = () => false;
    registerChoicesLazyLoadGuard("allow", allowGuard);
    registerChoicesLazyLoadGuard("suppress", suppressGuard);

    // Act & Assert
    expect(shouldSuppressChoicesLazyLoad(question, "abc")).toBe(true);
  });

  it("replaces a guard registered under the same id", () => {
    // Arrange
    clearChoicesLazyLoadGuardsForTests();
    const question = { name: "q1" } as Question;
    const firstGuard = vi.fn(() => true);
    const secondGuard = vi.fn(() => true);
    registerChoicesLazyLoadGuard("blind-search-tagbox", firstGuard);
    registerChoicesLazyLoadGuard("blind-search-tagbox", secondGuard);

    // Act
    shouldSuppressChoicesLazyLoad(question, "abc");

    // Assert
    expect(firstGuard).not.toHaveBeenCalled();
    expect(secondGuard).toHaveBeenCalledTimes(1);
  });

  it("stops suppressing after unregister", () => {
    // Arrange
    clearChoicesLazyLoadGuardsForTests();
    const question = { name: "q1" } as Question;
    const guard = () => true;
    registerChoicesLazyLoadGuard("blind-search-tagbox", guard);

    // Act
    unregisterChoicesLazyLoadGuard("blind-search-tagbox");

    // Assert
    expect(shouldSuppressChoicesLazyLoad(question, "abc")).toBe(false);
  });
});

describe("choices-lazy-load completed handlers", () => {
  it("notifies registered handlers after lazy load completes", () => {
    // Arrange
    clearChoicesLazyLoadCompletedHandlersForTests();
    const question = { name: "q1" } as Question;
    const handler = vi.fn();
    registerChoicesLazyLoadCompletedHandler("blind-search-tagbox", handler);

    // Act
    notifyChoicesLazyLoadCompleted(question, "abc", 2);

    // Assert
    expect(handler).toHaveBeenCalledWith(question, "abc", 2, true);
  });

  it("passes success=false when lazy load fails", () => {
    // Arrange
    clearChoicesLazyLoadCompletedHandlersForTests();
    const question = { name: "q1" } as Question;
    const handler = vi.fn();
    registerChoicesLazyLoadCompletedHandler("blind-search-tagbox", handler);

    // Act
    notifyChoicesLazyLoadCompleted(question, "abc", 0, false);

    // Assert
    expect(handler).toHaveBeenCalledWith(question, "abc", 0, false);
  });

  it("replaces a handler registered under the same id", () => {
    // Arrange
    clearChoicesLazyLoadCompletedHandlersForTests();
    const question = { name: "q1" } as Question;
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();
    registerChoicesLazyLoadCompletedHandler("blind-search-tagbox", firstHandler);
    registerChoicesLazyLoadCompletedHandler(
      "blind-search-tagbox",
      secondHandler,
    );

    // Act
    notifyChoicesLazyLoadCompleted(question, "abc", 2);

    // Assert
    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledWith(question, "abc", 2, true);
  });

  it("stops notifying after unregister", () => {
    // Arrange
    clearChoicesLazyLoadCompletedHandlersForTests();
    const question = { name: "q1" } as Question;
    const handler = vi.fn();
    registerChoicesLazyLoadCompletedHandler("blind-search-tagbox", handler);
    unregisterChoicesLazyLoadCompletedHandler("blind-search-tagbox");

    // Act
    notifyChoicesLazyLoadCompleted(question, "abc", 2);

    // Assert
    expect(handler).not.toHaveBeenCalled();
  });
});
