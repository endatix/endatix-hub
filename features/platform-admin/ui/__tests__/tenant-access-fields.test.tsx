import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TenantAccessFields } from "../tenant-access-fields";

type Props = Parameters<typeof TenantAccessFields>[0];

function renderFields(overrides: Partial<Props> = {}) {
  const onAllowedProvidersChange = vi.fn();
  render(
    <TenantAccessFields
      idPrefix="test"
      allowSelfRegistration={false}
      onAllowSelfRegistrationChange={vi.fn()}
      authProviders={[{ id: "google", name: "Google" }]}
      allowedProviders={[]}
      onAllowedProvidersChange={onAllowedProvidersChange}
      defaultRole="Respondent"
      onDefaultRoleChange={vi.fn()}
      {...overrides}
    />,
  );
  return { onAllowedProvidersChange };
}

describe("TenantAccessFields", () => {
  it("toggles a provider by clicking its label", () => {
    const { onAllowedProvidersChange } = renderFields();

    fireEvent.click(screen.getByLabelText("Google"));

    expect(onAllowedProvidersChange).toHaveBeenCalledWith(["google"]);
  });

  it("stays quiet for a role without Hub access", () => {
    renderFields({ defaultRole: "Respondent" });

    expect(screen.queryByText("Hub access")).toBeNull();
  });

  it("warns when the default role can reach Hub", () => {
    renderFields({ defaultRole: "Admin" });

    expect(screen.getByText("Hub access")).toBeTruthy();
  });
});
