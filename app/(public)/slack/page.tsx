"use client";

import { useBrand } from "@/lib/branding/client";
import { useSearchParams } from "next/navigation";
import {
  getSlackBearerToken,
  sendSlackBearerToken,
} from "@/services/integrations";
import { Suspense, useEffect, useState } from "react";

function SlackTokenTransfer() {
  const searchParams = useSearchParams();
  const brand = useBrand();
  const code = searchParams.get("code");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!code) {
          setMessage("No code provided");
          return;
        }
        const responseJson = await getSlackBearerToken(code);
        if (responseJson.ok) {
          const result = await sendSlackBearerToken(responseJson.access_token);
          setMessage(
            result ? "Successfully received token" : "Failed to receive token",
          );
        } else {
          setMessage(responseJson.error);
        }
      } catch {
        setMessage("An unexpected error occurred");
      }
    };

    void fetchData();
  }, [code]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted">
      <h3>Slack authorization for {brand.personas.bot}</h3>
      {message}
      <br />
    </div>
  );
}

export default function Slack() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SlackTokenTransfer />
    </Suspense>
  );
}
