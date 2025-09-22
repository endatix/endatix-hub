import { JWT } from "next-auth/jwt";
import { Session, Account, User } from "next-auth";
import { Provider } from "next-auth/providers";
import React from "react";
import { ButtonProps } from "@/components/ui/button";
import { Result } from "@/lib/result";
import { NextResponse } from "next/server";

export interface JWTParams {
  token: JWT;
  user?: User;
  account?: Account;
  trigger?: "signIn" | "signUp" | "update";
}

export interface SessionParams {
  session: Session;
  token: JWT;
}

export type AuthProviderType = "credentials" | "oauth" | "oidc" | "email";

/**
 * Enhanced auth provider interface that supports any string ID for custom providers
 * and provides a clean separation between NextAuth config and callback handling.
 */
export interface IAuthProvider {
  /** Unique identifier for the provider (can be any string) */
  readonly id: string;

  /** Display name for the provider */
  readonly name: string;

  /** Provider type - matches NextAuth provider types */
  readonly type: AuthProviderType;

  /**
   * Returns the NextAuth provider configuration.
   * This replaces the static register() methods.
   */
  getProviderConfig(): Provider;

  /**
   * Returns the presentation options for the provider.
   */
  getPresentationOptions(): IAuthPresentation;

  /**
   * Handles JWT token processing during authentication callbacks.
   */
  handleJWT(params: JWTParams): Promise<JWT>;

  /**
   * Handles session data processing.
   */
  handleSession(params: SessionParams): Promise<Session>;

  /**
   * Validation to check if provider is properly configured.
   * Used to determine if provider should be enabled.
   */
  validateConfig(): boolean;
}

/**
 * Interface for session bridges that can be used to exchange tokens between providers.
 */
export interface ISessionBridge {
  /**
   * Exchanges a token for a new session.
   * @param token - The token to exchange.
   * @param config - The config for the session bridge.
   * @returns The NextResponse with the new session.
   */
  exchangeTokenForSession(
    token: string,
    config?: {
      protocol?: string; // http or https
    },
  ): Promise<Result<NextResponse>>;
}

export interface IAuthPresentation {
  /**
   * Display name for the provider. Used in the sign in button and other UI elements.
   */
  displayName?: string;

  /**
   * Label for the sign in button. Used in the sign in button and other UI elements.
   */
  signInLabel?: string;

  icon?: string | React.ComponentType<{ className?: string }>;

  /**
   * Optional props to override the default sign in button props.
   */
  signInButtonProps?: ButtonProps;

  /**
   * Optional component to override the default sign in component. Designed for credentials based providers.
   */
  signInComponent?: React.ComponentType<{
    onSubmit: (credentials: Record<string, string>) => Promise<void>;
    isPending: boolean;
    className?: string;
    error?: string;
  }>;
}

export type AuthPresentation = Pick<IAuthProvider, "id" | "name" | "type"> &
  IAuthPresentation;
