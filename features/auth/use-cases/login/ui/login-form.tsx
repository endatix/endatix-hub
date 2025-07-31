"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { showComingSoonMessage } from "@/components/layout-ui/teasers/coming-soon-link";
import { Spinner } from "@/components/loaders/spinner";
import { ErrorMessage } from "@/components/forms/error-message";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { KeycloakSignInButton } from "./keycloak-signin-button";
import { getEnabledProviders } from "@/lib/auth/auth-config";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    // Basic validation
    const errors: { email?: string; password?: string } = {};
    if (!email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email";
    }
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters long";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      try {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl: "/forms",
        });

        if (result?.error) {
          setError(
            "Invalid credentials. Please check your email and password.",
          );
        } else if (result?.ok) {
          toast({
            title: "Success",
            description: "Successfully signed in!",
          });
          router.push("/forms");
          router.refresh();
        }
      } catch (error) {
        console.error("Login error:", error);
        setError("An unexpected error occurred. Please try again.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-2 text-center">
        <div className="flex justify-center mb-2">
          <Image
            src="/assets/icons/endatix.svg"
            alt="Endatix logo"
            width={180}
            height={60}
            priority
          />
        </div>
        <p className="mb-6 text-balance text-muted-foreground">
          Sign in to your account
        </p>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            required
            autoFocus
            tabIndex={1}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {fieldErrors.email && <ErrorMessage message={fieldErrors.email} />}
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            <Link
              href="#"
              onClick={() => showComingSoonMessage()}
              className="ml-auto inline-block text-sm underline"
              tabIndex={4}
            >
              Forgot your password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            name="password"
            required
            tabIndex={2}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {fieldErrors.password && (
            <ErrorMessage message={fieldErrors.password} />
          )}
        </div>
        {error && <ErrorMessage message={error} />}
        <Button
          type="submit"
          className="w-full"
          disabled={isPending}
          tabIndex={3}
        >
          {isPending && <Spinner className="mr-2 h-4 w-4" />}
          Sign in with email
        </Button>
        {getEnabledProviders().includes("keycloak") && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <KeycloakSignInButton />
          </>
        )}
      </div>
    </form>
  );
};

export default LoginForm;
