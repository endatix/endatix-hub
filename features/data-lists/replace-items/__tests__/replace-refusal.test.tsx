import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { toast } from "@/components/ui/toast";
import { ReplaceItemsDialog } from "../ui/replace-items-dialog";

vi.mock("@/auth", () => ({ auth: async () => ({ accessToken: "session" }) }));
vi.mock("@/features/auth/authorization", () => ({
  authorization: async () => ({ requireHubAccess: vi.fn() }),
}));
vi.mock("@/components/ui/toast", () => ({
  toast: { warning: vi.fn(), error: vi.fn() },
}));

function refusedImport(path: string) {
  const action = {
    key: "profile.review",
    scope: "user",
    severity: "blocking",
    canResolve: true,
    resolvePath: path,
    resolverRoles: [],
    blockNonResolvers: false,
  };
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ id: "42", availableLocales: [] }))
    .mockResolvedValueOnce(
      Response.json(
        {
          status: 403,
          errorCode: "required_action",
          requiredActions: [action],
        },
        { status: 403 },
      ),
    );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

async function reviewItems() {
  const content = '[{"value":"a","labels":{"default":"Alpha"}}]';
  const file = Object.assign(
    new File([content], "items.json", { type: "application/json" }),
    { text: async () => content },
  );
  fireEvent.change(document.getElementById("replace-data-list-file-upload")!, {
    target: {
      files: Object.assign([file], {
        item: (i: number) => (i === 0 ? file : null),
      }),
    },
  });
  fireEvent.click(
    await screen.findByRole("button", { name: "Review locales" }),
  );
}

it("offers recovery when the confirmed replacement is refused after its preparatory read", async () => {
  // Arrange
  const path = "/data-lists/42";
  history.replaceState(null, "", path);
  vi.stubEnv("ENDATIX_BASE_URL", "https://api.example");
  const fetch = refusedImport(path);
  const onReplaced = vi.fn();
  render(
    <ReplaceItemsDialog
      open
      onOpenChange={vi.fn()}
      title="Countries"
      dataListId="42"
      onReplaced={onReplaced}
    />,
  );
  await reviewItems();

  // Act
  fireEvent.click(
    await screen.findByRole("button", { name: "Confirm import" }),
  );

  // Assert
  await waitFor(() => expect(toast.warning).toHaveBeenCalled());
  expect(fetch.mock.calls).toHaveLength(2);
  expect(onReplaced).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog", { name: "Replace Items" })).toBeTruthy();
});
