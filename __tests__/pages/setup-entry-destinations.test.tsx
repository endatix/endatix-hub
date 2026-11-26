// @vitest-environment node
import type { ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { canResumeWorkspaceSetup } from "@/features/onboarding/start-workspace/workspace-api.server";
import Settings from "@/app/(main)/settings/page";
import Security from "@/app/(main)/settings/security/page";
import Folders from "@/app/(main)/folders/page";
import Folder from "@/app/(main)/folders/[folderId]/page";
import FormFolders from "@/app/(main)/forms/folders/page";
import TemplateFolders from "@/app/(main)/forms/templates/folders/page";
import Templates from "@/app/(main)/forms/templates/page";
import CreateTemplate from "@/app/(main)/forms/templates/create/page";
import FormOverview from "@/app/(main)/forms/[formId]/page";
import FormSettings from "@/app/(main)/forms/[formId]/settings/page";
import DataLists from "@/app/(main)/data-lists/page";
import Forms from "@/app/(main)/forms/page";

vi.mock("@/auth", () => ({ auth: async () => ({ accessToken: "owner" }) }));
vi.mock("@/features/auth/authorization", async original => ({
  ...(await original<object>()),
  authorization: async () => ({
    requireHubAccess: vi.fn(), requirePermission: vi.fn(), checkPermission: async () => ({ success: true }),
  }),
}));
vi.mock("@/features/auth/required-actions/workspace-redirect.server", () => ({
  resolveWorkspaceAction: vi.fn(), admitWorkspacePage: (guard: Promise<unknown>) => guard,
}));
vi.mock("@/features/onboarding/start-workspace/workspace-api.server", () => ({
  canResumeWorkspaceSetup: vi.fn(async () => true),
}));
vi.mock("@/lib/feature-flags/flags", async original => ({
  ...(await original<object>()), reportingExportFlag: async () => false,
}));
vi.mock("@/features/my-account/ui/change-password/change-password", () => ({
  ChangePassword: () => <h1>Change password</h1>,
}));
vi.mock("@/lib/endatix-api", async original => ({
  ...(await original<object>()),
  EndatixApi: class {
    folders = { list: async () => ({ success: true, data: [] }) };
    formTemplates = { list: async () => ({ success: true, data: [] }) };
    tenant = { getSettings: async () => ({ success: true, data: {} }) };
  },
}));
vi.mock("@/features/folders/create-folder", () => ({ CreateFolderDialog: () => null }));
vi.mock("@/features/folders/list-folders", () => ({ FolderNavigationCards: () => null }));
vi.mock("@/features/folders/view-forms-header", () => ({ getFormsHeaderDataCached: async () => ({}) }));
vi.mock("@/features/folders/view-folder-management", () => ({
  getFolderManagementPageDataCached: async () => ({ ok: true, data: { folder: { name: "Team folder" } } }),
  FolderDetailsView: ({ folder }: { folder: { name: string } }) => <h1>{folder.name}</h1>,
}));
vi.mock("@/features/asset-storage/server", () => ({
  AssetStorageProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/features/form-templates/ui/form-templates-list", () => ({ default: () => null }));
vi.mock("@/app/(main)/forms/templates/create/create-template-form", () => ({
  default: () => <h1>Create template</h1>,
}));
const loadForm = vi.hoisted(() => vi.fn());
vi.mock("@/features/forms/form-workspace/load-workspace-form.server", () => ({ loadWorkspaceForm: loadForm }));
vi.mock("@/features/forms/form-workspace/ui/form-load-error", () => ({ FormLoadError: () => <p>Form unavailable</p> }));
vi.mock("@/features/forms/form-workspace", () => ({
  FormWorkspaceHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/features/forms/form-workspace/ui/form-summary-cards", () => ({ FormSummaryCards: () => null }));
vi.mock("@/features/forms/ui/form-details", () => ({ default: () => null }));
vi.mock("@/features/forms/set-pdf-theme/pdf-settings-section", () => ({ PdfSettingsSection: () => null }));
vi.mock("@/features/submissions/choose-filterable-questions", () => ({ FilterableQuestionsSection: () => null }));
const loadLists = vi.hoisted(() => vi.fn());
vi.mock("@/features/data-lists/view-lists/get-data-lists.server", () => ({ getDataListsPage: loadLists }));
vi.mock("@/features/data-lists/view-lists/ui/data-lists-browser", () => ({ DataListsBrowser: () => null }));
vi.mock("@/features/data-lists/view-lists/ui/data-lists-page", () => ({ DataListsPageHeader: () => <h1>Data lists</h1> }));
const loadForms = vi.hoisted(() => vi.fn());
vi.mock("@/features/forms/list-forms/list-forms.server", () => ({ getFormsListPromise: loadForms }));
vi.mock("@/features/forms/list-forms/ui/forms-list-toolbar", () => ({ FormsListToolbar: () => null }));
vi.mock("@/components/table", async original => ({
  ...(await original<object>()),
  PagedListUrlProvider: ({ children }: { children: ReactNode }) => children,
  PagedListFrame: () => <p>Forms list</p>,
}));

async function documentFor(page: Promise<ReactNode>) {
  const stream = await renderToReadableStream(await page);
  await stream.allReady;
  return new Response(stream).text();
}

const params = Promise.resolve({ formId: "42", folderId: "45" });

it.each([
  ["Settings", Settings], ["Change password", Security],
  ["Folders", () => Folders({ searchParams: Promise.resolve({ action: undefined }) })],
  ["Team folder", () => Folder({ params })], ["Form folders", FormFolders],
  ["Template folders", TemplateFolders], ["Form Templates", Templates], ["Create template", CreateTemplate],
] as const)("retains the product view and the optional setup entry on admitted %s", async (heading, page) => {
  const document = await documentFor(page());
  expect(document).toContain(heading);
  expect(document).toContain('href="/workspace/setup"');
  expect(canResumeWorkspaceSetup).toHaveBeenCalledOnce();
});

it.each([FormOverview, FormSettings])("waits for ordinary form access before showing setup", async (page) => {
  loadForm.mockResolvedValueOnce(Result.error("Form unavailable"));
  const denial = await documentFor(page({ params }));
  expect(denial).toContain("Form unavailable");
  expect(canResumeWorkspaceSetup).not.toHaveBeenCalled();

  loadForm.mockResolvedValueOnce(Result.success({ id: "42", name: "Survey" }));
  const admitted = await documentFor(page({ params }));
  expect(admitted).toContain('href="/workspace/setup"');
  expect(canResumeWorkspaceSetup).toHaveBeenCalledOnce();
});

it("waits for the streamed data-list load before checking the owner's setup", async () => {
  const searchParams = Promise.resolve({
    action: undefined, page: undefined, pageSize: undefined, search: undefined, hasLocale: undefined,
    sortBy: undefined, sortDir: undefined, createdFrom: undefined, createdTo: undefined,
    modifiedFrom: undefined, modifiedTo: undefined,
  });
  loadLists.mockRejectedValueOnce(new Error("Access denied"));
  const denied = await documentFor(DataLists({ searchParams }));
  expect(denied).not.toContain("/workspace/setup");
  expect(canResumeWorkspaceSetup).not.toHaveBeenCalled();

  loadLists.mockResolvedValueOnce({ items: [] });
  const admitted = await documentFor(DataLists({ searchParams }));
  expect(admitted).toContain('href="/workspace/setup"');
  expect(canResumeWorkspaceSetup).toHaveBeenCalledOnce();
});

it("offers a compact return to setup only after Forms admits the list", async () => {
  loadForms.mockResolvedValueOnce(Result.error("Forms denied"));
  const denied = await documentFor(Forms({}));
  expect(denied).not.toContain('href="/workspace/setup"');
  expect(canResumeWorkspaceSetup).not.toHaveBeenCalled();

  loadForms.mockResolvedValueOnce(Result.success({ items: [] }));
  expect(await documentFor(Forms({}))).toContain('href="/workspace/setup"');
  expect(canResumeWorkspaceSetup).toHaveBeenCalledOnce();
});
