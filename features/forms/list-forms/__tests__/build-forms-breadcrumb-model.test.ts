import { describe, expect, it } from "vitest";
import { buildFormsBreadcrumbModel } from "@/features/folders/view-forms-header/build-forms-breadcrumb-model.server";

describe("buildFormsBreadcrumbModel", () => {
  const folders = [
    { name: "Active Folder", slug: "active-folder" },
    { name: "My Folder", slug: "my-folder" },
  ];

  it("includes unassigned and all forms options on root", () => {
    const items = buildFormsBreadcrumbModel({
      section: "forms",
      folders,
      browse: null,
    });

    const dropdown = items.find((item) => item.type === "dropdown");
    expect(dropdown?.type).toBe("dropdown");
    if (dropdown?.type !== "dropdown") {
      return;
    }

    expect(dropdown.label).toBe("Unassigned");
    expect(dropdown.options.map((option) => option.label)).toEqual([
      "Unassigned",
      "All forms",
      "Active Folder",
      "My Folder",
    ]);
    expect(dropdown.options[0]?.isActive).toBe(true);
    expect(dropdown.options[1]?.href).toBe("/forms?browse=all");
  });

  it("marks all forms active when browse=all", () => {
    const items = buildFormsBreadcrumbModel({
      section: "forms",
      folders,
      browse: "all",
    });

    const dropdown = items.find((item) => item.type === "dropdown");
    if (dropdown?.type !== "dropdown") {
      throw new Error("Expected dropdown breadcrumb item");
    }

    expect(dropdown.label).toBe("All forms");
    expect(dropdown.options[1]?.isActive).toBe(true);
  });

  it("marks folder active on folder routes", () => {
    const items = buildFormsBreadcrumbModel({
      section: "forms",
      folders,
      currentFolderSlug: "my-folder",
    });

    const dropdown = items.find((item) => item.type === "dropdown");
    if (dropdown?.type !== "dropdown") {
      throw new Error("Expected dropdown breadcrumb item");
    }

    expect(dropdown.label).toBe("My Folder");
    expect(dropdown.options[3]?.isActive).toBe(true);
  });

  it("uses currentFolderName when slug is not in the folders list", () => {
    const items = buildFormsBreadcrumbModel({
      section: "forms",
      folders,
      currentFolderSlug: "on-folder",
      currentFolderName: "Customer Surveys",
    });

    const dropdown = items.find((item) => item.type === "dropdown");
    if (dropdown?.type !== "dropdown") {
      throw new Error("Expected dropdown breadcrumb item");
    }

    expect(dropdown.label).toBe("Customer Surveys");
  });

  it("shows folder dropdown on folder routes when folders list is empty", () => {
    const items = buildFormsBreadcrumbModel({
      section: "forms",
      folders: [],
      currentFolderSlug: "on-folder",
      currentFolderName: "Customer Surveys",
    });

    const dropdown = items.find((item) => item.type === "dropdown");
    if (dropdown?.type !== "dropdown") {
      throw new Error("Expected dropdown breadcrumb item");
    }

    expect(dropdown.label).toBe("Customer Surveys");
  });

  it("matches folder slugs case-insensitively and with encoding", () => {
    const items = buildFormsBreadcrumbModel({
      section: "forms",
      folders: [
        { name: "My Folder", slug: "My-Folder" },
        { name: "Special Folder", slug: "special folder" },
      ],
      currentFolderSlug: "my-folder",
    });

    const dropdown = items.find((item) => item.type === "dropdown");
    if (dropdown?.type !== "dropdown") {
      throw new Error("Expected dropdown breadcrumb item");
    }

    expect(dropdown.label).toBe("My Folder");
    expect(dropdown.options[2]?.isActive).toBe(true);
    expect(dropdown.options[3]?.label).toBe("Special Folder");
    expect(dropdown.options[3]?.isActive).toBe(false);
  });

  it("matches encoded folder slugs by decoding them", () => {
    const items = buildFormsBreadcrumbModel({
      section: "forms",
      folders: [{ name: "Special Folder", slug: "special folder" }],
      currentFolderSlug: "special%20folder",
    });

    const dropdown = items.find((item) => item.type === "dropdown");
    if (dropdown?.type !== "dropdown") {
      throw new Error("Expected dropdown breadcrumb item");
    }

    expect(dropdown.label).toBe("Special Folder");
    expect(dropdown.options[2]?.isActive).toBe(true);
  });

  it("uses template-specific root browse labels", () => {
    const unassignedItems = buildFormsBreadcrumbModel({
      section: "templates",
      folders,
      browse: null,
    });
    const unassignedDropdown = unassignedItems.find(
      (item) => item.type === "dropdown",
    );
    if (unassignedDropdown?.type !== "dropdown") {
      throw new Error("Expected dropdown breadcrumb item");
    }

    expect(unassignedDropdown.label).toBe("Unassigned templates");
    expect(unassignedDropdown.options.map((option) => option.label)).toEqual([
      "Unassigned templates",
      "All form templates",
      "Active Folder",
      "My Folder",
    ]);
    expect(unassignedDropdown.options[0]?.href).toBe("/forms/templates");
    expect(unassignedDropdown.options[1]?.href).toBe(
      "/forms/templates?browse=all",
    );

    const allItems = buildFormsBreadcrumbModel({
      section: "templates",
      folders,
      browse: "all",
    });
    const allDropdown = allItems.find((item) => item.type === "dropdown");
    if (allDropdown?.type !== "dropdown") {
      throw new Error("Expected dropdown breadcrumb item");
    }

    expect(allDropdown.label).toBe("All form templates");
    expect(allDropdown.options[1]?.isActive).toBe(true);
  });
});
