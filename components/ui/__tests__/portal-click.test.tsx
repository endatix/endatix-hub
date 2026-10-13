import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AlertDialog, AlertDialogContent } from "../alert-dialog";
import { Dialog, DialogContent } from "../dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "../dropdown-menu";

function card(child: ReactNode, onClick: () => void) {
  return render(<div onClick={onClick}>{child}</div>);
}

describe("portaled overlays", () => {
  it("keeps a dialog click off the parent", () => {
    const onCard = vi.fn();
    card(
      <Dialog open>
        <DialogContent>
          <input aria-label="Confirm name" />
        </DialogContent>
      </Dialog>,
      onCard,
    );

    fireEvent.click(screen.getByRole("textbox", { name: "Confirm name" }));

    expect(onCard).not.toHaveBeenCalled();
  });

  it("keeps an alert dialog click off the parent", () => {
    const onCard = vi.fn();
    card(
      <AlertDialog open>
        <AlertDialogContent>
          <input aria-label="Confirm name" />
        </AlertDialogContent>
      </AlertDialog>,
      onCard,
    );

    fireEvent.click(screen.getByRole("textbox", { name: "Confirm name" }));

    expect(onCard).not.toHaveBeenCalled();
  });

  it("keeps a menu click off the parent", () => {
    const onCard = vi.fn();
    card(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuItem>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
      onCard,
    );

    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(onCard).not.toHaveBeenCalled();
  });
});
