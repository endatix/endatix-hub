"use client";

import type { ReactNode } from "react";
import { redirect, usePathname } from "next/navigation";
import type { RequiredAction } from "@/lib/endatix-api/auth/required-action";
import { resolveTarget } from "@/lib/routes/resolve-target";

interface Props {
  actions: RequiredAction[];
  children: ReactNode;
}

export function WorkspaceGate({ actions, children }: Readonly<Props>) {
  const target = resolveTarget(actions, usePathname());
  if (target) redirect(target);
  return children;
}
