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
    renderFields({ allowSelfRegistration: true, defaultRole: "Respondent" });
    expect(screen.queryByText(/can sign in to Hub/i)).toBeNull();
  });

  it("warns when the default role can reach Hub", () => {
    renderFields({ allowSelfRegistration: true, defaultRole: "Admin" });
    expect(screen.getByText("Admin can sign in to Hub")).toBeTruthy();
  });

  it("stays quiet about Hub access while self-registration is off", () => {
    // Nobody can self-register, so no account can be granted the role — the
    // warning would be describing a risk that cannot occur.
    renderFields({ allowSelfRegistration: false, defaultRole: "Admin" });
    expect(screen.queryByText(/can sign in to Hub/i)).toBeNull();
  });

  it("disables the default role while self-registration is off", () => {
    renderFields({ allowSelfRegistration: false });
    const role = screen.getByRole("combobox", {
      name: /default registration role/i,
    });
    expect(role.hasAttribute("disabled")).toBe(true);
    expect(
      screen.getByText("Applies once self-registration is on."),
    ).toBeTruthy();
  });

  it("reports the current state as a status badge", () => {
    renderFields({ allowSelfRegistration: true });
    expect(screen.getByText("On")).toBeTruthy();
  });
});
