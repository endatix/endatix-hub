"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";

interface TestResult {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  error?: string;
  details?: string;
}

export default function MobileJwtTestForm() {
  const [mobileJwt, setMobileJwt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mobileJwt.trim()) {
      setResult({
        success: false,
        error: "Please enter a mobile JWT token",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/auth/session-bridge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: mobileJwt.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          user: data.user,
        });
        toast.success({
          title: "Session created successfully",
          description: "Redirecting to home...",
        });
        setTimeout(() => {
          router.push("/");
        }, 500);
      } else {
        setResult({
          success: false,
          error: data.error || "Unknown error occurred",
          details: data.details,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: "Network error",
        details: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Session Bridge Test</CardTitle>
        <CardDescription>
          Test the session bridge by providing valid Keycloak JWT token. This will
          exchange it for Keycloak tokens and create a session.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="mobileJwt" className="text-sm font-medium">
              JWT Token
            </label>
            <Textarea
              id="mobileJwt"
              placeholder="Enter your mobile JWT token here..."
              value={mobileJwt}
              onChange={(e) => setMobileJwt(e.target.value)}
              rows={16}
              className="font-mono text-xs"
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Testing..." : "Test Token Exchange"}
          </Button>
        </form>

        {result && (
          <div className="mt-6">
            {result.success ? (
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold text-green-700">
                      ✅ Session created successfully!
                    </p>
                    {result.user && (
                      <div className="text-sm">
                        <p>
                          <strong>User ID:</strong> {result.user.id}
                        </p>
                        <p>
                          <strong>Name:</strong> {result.user.name}
                        </p>
                        <p>
                          <strong>Email:</strong> {result.user.email}
                        </p>
                        {result.user.image && (
                          <p>
                            <strong>Image:</strong> {result.user.image}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">❌ Error: {result.error}</p>
                    {result.details && (
                      <p className="text-sm opacity-90">{result.details}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
