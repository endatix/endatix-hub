"use client";

import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type MoreActionsMenuProps = {
  /** Items shown below 768 px only: the menu form of the row's collapsible actions. */
  collapsedItems?: ReactNode;
  /** Items shown at every width. */
  moreActions?: ReactNode;
};

/**
 * The toolbar's `⋯`. Non-modal, so an `AlertDialog` opened from an item (rendered beside the
 * toolbar, DESIGN.md §5 Overlays rule 10) gets the page's pointer events back.
 */
export function MoreActionsMenu({
  collapsedItems,
  moreActions,
}: Readonly<MoreActionsMenuProps>) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="More actions"
          className={cn(!moreActions && "md:hidden")}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <MoreActionsItems
          collapsedItems={collapsedItems}
          moreActions={moreActions}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The collapsed items are hidden from 768 px by the same `md` breakpoint that shows their row
 * form, so the row and the menu never disagree. Radix skips a hidden item when it moves focus.
 */
function MoreActionsItems({
  collapsedItems,
  moreActions,
}: Readonly<MoreActionsMenuProps>) {
  if (!collapsedItems) return moreActions;
  return (
    <>
      <div data-slot="more-actions-collapsed" className="md:hidden">
        {collapsedItems}
        {moreActions ? <DropdownMenuSeparator /> : null}
      </div>
      {moreActions}
    </>
  );
}
