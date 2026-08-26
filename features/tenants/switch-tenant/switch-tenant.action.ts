"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { SystemRoles } from "@/features/auth/authorization/domain/system-roles";
import { assumeTenantAction } from "@/features/platform-admin/assume-tenant/assume-tenant.action";
import { readAssumeSession } from "@/features/platform-admin/assume-tenant/read-assume-session";
import { replaceSessionTokens } from "@/features/platform-admin/assume-tenant/replace-session-tokens";
import {
  EndatixApi,
  isNotFoundError,
  type MembershipTenant,
} from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { mapApiErrorToResult } from "@/lib/result/map-api-error-to-result";
import { redirect } from "next/navigation";
import type { SwitcherTenant } from "./types";

const DIRECTORY_PAGE_SIZE = 100;

export async function listMyTenantsAction(): Promise<Result<SwitcherTenant[]>> {
  const session = await auth();
  if (!session?.accessToken) {
    return Result.success([]);
  }

  const membershipsResult = await loadMemberships(session.accessToken);
  if (Result.isError(membershipsResult)) {
    return membershipsResult;
  }

  const { isPlatformAdmin, activeTenantId } = await readSwitcherContext(session);
  const memberships = toSwitcherTenants(
    membershipsResult.value,
    activeTenantId,
  );

  if (!isPlatformAdmin) {
    return Result.success(memberships);
  }

  const directoryResult = await loadDirectoryTenants(session.accessToken);
  if (Result.isError(directoryResult)) {
    return Result.success(memberships);
  }

  return Result.success(
    mergeSwitcherTenants(memberships, directoryResult.value, activeTenantId),
  );
}

export async function selectSwitcherTenantAction(tenantId: string) {
  const session = await auth();
  if (!session?.accessToken) {
    return Result.error("You must be signed in to switch tenants.");
  }

  const membershipsResult = await loadMemberships(session.accessToken);
  if (Result.isError(membershipsResult)) {
    return membershipsResult;
  }

  const isMember = membershipsResult.value.some(
    (tenant) => String(tenant.id) === tenantId,
  );
  const isAssuming = readAssumeSession(session.accessToken) !== null;

  if (isMember && !isAssuming) {
    return switchTenantAction(tenantId);
  }

  return assumeTenantAction(tenantId);
}

export async function switchTenantAction(tenantId: string) {
  const session = await auth();
  if (!session?.accessToken) {
    return Result.error("You must be signed in to switch tenants.");
  }

  const api = new EndatixApi(session.accessToken);
  const switched = await api.auth.switchTenant({ tenantId });
  if (!switched.success) {
    return mapApiErrorToResult(switched, {
      fallbackMessage: "Failed to switch tenant",
    });
  }

  const swapped = await replaceSessionTokens(
    switched.data.accessToken,
    switched.data.refreshToken,
  );
  if (Result.isError(swapped)) {
    return swapped;
  }

  redirect("/");
}

async function loadMemberships(accessToken: string) {
  const api = new EndatixApi(accessToken);
  const listed = await api.auth.listMyTenants();
  if (!listed.success) {
    if (isNotFoundError(listed)) {
      return Result.success([] as MembershipTenant[]);
    }

    return mapApiErrorToResult<MembershipTenant[]>(listed, {
      fallbackMessage: "Failed to load tenants",
    });
  }

  return Result.success(listed.data.items);
}

async function loadDirectoryTenants(accessToken: string) {
  const api = new EndatixApi(accessToken);
  const listed = await api.platformTenants.list({
    page: 1,
    pageSize: DIRECTORY_PAGE_SIZE,
    sortBy: "name",
    sortDir: "asc",
  });
  if (!listed.success) {
    return mapApiErrorToResult(listed, {
      fallbackMessage: "Failed to load tenants",
    });
  }

  return Result.success(listed.data.items);
}

async function readSwitcherContext(session: NonNullable<Awaited<ReturnType<typeof auth>>>) {
  const authz = await authorization(session);
  const authData = await authz.getAuthorizationData();
  if (!authData.success) {
    return { isPlatformAdmin: false, activeTenantId: null as string | null };
  }

  return {
    isPlatformAdmin: authData.data.roles.includes(SystemRoles.PlatformAdmin),
    activeTenantId: authData.data.tenantId
      ? String(authData.data.tenantId)
      : null,
  };
}

function toSwitcherTenants(
  memberships: MembershipTenant[],
  activeTenantId: string | null,
): SwitcherTenant[] {
  return memberships.map((tenant) => {
    const id = String(tenant.id);
    return {
      id,
      name: tenant.name,
      slug: tenant.slug,
      isActive: activeTenantId ? id === activeTenantId : tenant.isActive,
      isMembership: true,
    };
  });
}

function mergeSwitcherTenants(
  memberships: SwitcherTenant[],
  directory: Array<{ id: string; name: string; slug: string }>,
  activeTenantId: string | null,
): SwitcherTenant[] {
  const byId = new Map(memberships.map((tenant) => [tenant.id, tenant]));

  for (const tenant of directory) {
    const id = String(tenant.id);
    const existing = byId.get(id);
    if (existing) {
      byId.set(id, {
        ...existing,
        isActive: activeTenantId ? id === activeTenantId : existing.isActive,
      });
      continue;
    }

    byId.set(id, {
      id,
      name: tenant.name,
      slug: tenant.slug,
      isActive: activeTenantId === id,
      isMembership: false,
    });
  }

  return [...byId.values()];
}
