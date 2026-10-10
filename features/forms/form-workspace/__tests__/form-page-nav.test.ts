import { describe, expect, it } from "vitest";
import { buildFormPageNav } from "../form-page-nav";

const flags = { analytics: false, audience: true };
const input = {
  formId: "f1",
  formName: "Muestra Co",
  folder: { name: "Flows", slug: "flows" },
  flags,
};

describe("buildFormPageNav", () => {
  it("ends the trail at the form, as the current crumb, on one of its pages", () => {
    // Act
    const { trail } = buildFormPageNav({ ...input, active: "audience" });

    // Assert
    expect(trail).toEqual([
      { type: "link", label: "Forms", href: "/forms" },
      { type: "link", label: "Flows", href: "/forms/folders/flows" },
      { type: "page", label: "Muestra Co" },
    ]);
  });

  it("switches between the form's pages, the current one marked with its icon", () => {
    // Act
    const { switcher } = buildFormPageNav({ ...input, active: "audience" });

    // Assert
    expect(switcher).toEqual({
      label: "Audience",
      icon: "users",
      options: [
        {
          label: "Overview",
          href: "/forms/f1",
          icon: "layout-dashboard",
          isActive: false,
        },
        {
          label: "Submissions",
          href: "/forms/f1/submissions",
          icon: "list",
          isActive: false,
        },
        {
          label: "Audience",
          href: "/forms/f1/audience",
          icon: "users",
          isActive: true,
        },
        {
          label: "Settings",
          href: "/forms/f1/settings",
          icon: "settings",
          isActive: false,
        },
      ],
    });
  });

  it("links the form and has no switcher when no page of it is active", () => {
    // Act
    const nav = buildFormPageNav(input);

    // Assert
    expect(nav.switcher).toBeUndefined();
    expect(nav.trail.at(-1)).toEqual({
      type: "link",
      label: "Muestra Co",
      href: "/forms/f1",
    });
  });
});
