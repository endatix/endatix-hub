import { Result } from "@/lib/result";
import { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const DEFAULT_COOKIE_NAME = "FPSK";
const DEFAULT_COOKIE_DURATION = 7;

type FormToken = {
  formId: string;
  token: string;
};

type CookieConfig = {
  readonly name: string;
  readonly expirationInDays: number;
  readonly secure: boolean;
};

// Type for base cookie options without expiration/maxAge, name, or value
type BaseCookieOptions = Omit<
  Partial<ResponseCookie>,
  "expires" | "maxAge" | "name" | "value"
>;



class FormTokenCookieStore {
  private readonly COOKIE_CONFIG: CookieConfig;

  constructor(
    private readonly cookieStore: ReadonlyRequestCookies,
    config?: Partial<CookieConfig>,
  ) {
    const cookieName =
      process.env.NEXT_FORMS_COOKIE_NAME ?? DEFAULT_COOKIE_NAME;
    if (!cookieName) {
      throw new Error("Default cookie name is invalid");
    }

    const cookieDurationValue =
      process.env.NEXT_FORMS_COOKIE_DURATION_DAYS ?? DEFAULT_COOKIE_DURATION;
    const cookieDuration = Number(cookieDurationValue);

    if (isNaN(cookieDuration)) {
      throw new Error(
        `Cookie duration "${cookieDurationValue}" is not a valid number`,
      );
    }

    this.COOKIE_CONFIG = {
      name: config?.name ?? cookieName,
      expirationInDays: config?.expirationInDays ?? cookieDuration,
      secure: config?.secure ?? process.env.NODE_ENV === "production",
    };
  }

  public getCookieName(): string {
    return this.COOKIE_CONFIG.name;
  }

  public getCookieDuration(): number {
    return this.COOKIE_CONFIG.expirationInDays;
  }

  private getExpires(): Date {
    return new Date(
      Date.now() + this.COOKIE_CONFIG.expirationInDays * 24 * 60 * 60 * 1000,
    );
  }

  private getBaseCookieOptions(): BaseCookieOptions {
    return {
      httpOnly: true,
      secure: this.COOKIE_CONFIG.secure,
      sameSite: "strict",
      path: "/",
    };
  }

  public getToken(formId: string): Result<string> {
    if (!formId) {
      return Result.error("FormId is required");
    }

    const cookie = this.cookieStore.get(this.COOKIE_CONFIG.name);
    if (!cookie) {
      return Result.error("No cookie found");
    }

    try {
      const tokens = JSON.parse(cookie.value);
      const token = tokens[formId];
      return token
        ? Result.success(token)
        : Result.error("No token found for the current form");
    } catch (error) {
      return Result.error(
        `Error parsing cookie: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  public setToken({ formId, token }: FormToken): Result<void> {
    if (!formId || !token) {
      return Result.error("FormId and token are required");
    }

    try {
      const currentValue = this.cookieStore.get(this.COOKIE_CONFIG.name)?.value;
      const tokens = currentValue ? JSON.parse(currentValue) : {};
      const updatedValue = JSON.stringify({ ...tokens, [formId]: token });

      this.cookieStore.set(this.COOKIE_CONFIG.name, updatedValue, {
        ...this.getBaseCookieOptions(),
        expires: this.getExpires(),
      });

      return Result.success(void 0);
    } catch (error) {
      return Result.error(
        `Failed to set token: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  public deleteToken(formId: string): Result<void> {
    if (!formId) {
      return Result.error("FormId is required");
    }

    try {
      const cookie = this.cookieStore.get(this.COOKIE_CONFIG.name);
      if (!cookie?.value) {
        return Result.success(void 0);
      }

      const currentTokens = JSON.parse(cookie.value);
      if (!(formId in currentTokens)) {
        return Result.success(void 0);
      }

      delete currentTokens[formId];
      const isEmpty = Object.keys(currentTokens).length === 0;

      this.cookieStore.set(
        this.COOKIE_CONFIG.name,
        isEmpty ? "" : JSON.stringify(currentTokens),
        {
          ...this.getBaseCookieOptions(),
          ...(isEmpty ? { maxAge: 0 } : { expires: this.getExpires() }),
        },
      );

      return Result.success(void 0);
    } catch (error) {
      return Result.error(
        `Failed to delete token: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }
}

export { 
  DEFAULT_COOKIE_NAME,
  DEFAULT_COOKIE_DURATION,
  FormTokenCookieStore,
};
