"use client";

import { Session } from "next-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Copy } from "lucide-react";
import { toast } from "@/components/ui/toast";
import KeycloakSignOutButton from "./keycloak-sign-out-button";
import Link from "next/link";
import { SIGNOUT_PATH } from "@/features/auth/infrastructure/auth-constants";

interface SessionCardProps {
  session: Session;
}

export default function SessionCard({ session }: SessionCardProps) {
  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success({
      title: "JWT copied to clipboard",
      description: value.substring(0, 84) + "...",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{session?.user?.name}</CardTitle>
        <CardDescription>{session?.user?.email}</CardDescription>
      </CardHeader>
      <CardContent>
        {session?.accessToken && (
          <p className="flex items-center gap-2">
            <span title="Copy JWT to clipboard">
              JWT: {session?.accessToken?.substring(0, 84)}...
            </span>
            <Copy
              aria-label="Copy JWT"
              onClick={() => copyToClipboard(session?.accessToken ?? "")}
              className="w-4 h-4 cursor-pointer"
            />
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Link href={SIGNOUT_PATH}>Sign out</Link>
      </CardFooter>
    </Card>
  );
}
