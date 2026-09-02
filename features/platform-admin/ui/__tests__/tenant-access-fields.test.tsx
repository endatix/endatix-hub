import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TenantAccessFields } from "../tenant-access-fields";

type Props = Parameters<typeof TenantAccessFields>[0];

function renderFields(overrides: Partial<Props> = {}) {
  render(
    <TenantAccessFields
      idPrefix="test"
      allowSelfRegistration={false}
      onAllowSelfRegistrationChange={vi.fn()}
      defaultRole="Respondent"
      onDefaultRoleChange={vi.fn()}
      {...overrides}
    />,
  );
}

describe("TenantAccessFields", () => {
  it("does not offer an auth-provider policy", () => {
    renderFields();
    expect(screen.queryByText("Allowed auth providers")).toBeNull();
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
