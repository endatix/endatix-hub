"use client";

import { MoreHorizontal } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MOBILE_BREAKPOINT_PX } from "@/lib/utils/hooks/use-media-query.hook";

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

const BELOW_TOOLBAR_BREAKPOINT = `(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`;

/** Read on the first render, so a phone's menu never opens without its collapsed items. */
function useBelowBreakpoint(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = globalThis.matchMedia?.(BELOW_TOOLBAR_BREAKPOINT);
      media?.addEventListener("change", onChange);
      return () => media?.removeEventListener("change", onChange);
    },
    () => globalThis.matchMedia?.(BELOW_TOOLBAR_BREAKPOINT).matches ?? false,
    () => false,
  );
}

/** Mounted only while the menu is open. */
function MoreActionsItems({
  collapsedItems,
  moreActions,
}: Readonly<MoreActionsMenuProps>) {
  const isMobile = useBelowBreakpoint();
  const showCollapsed = Boolean(collapsedItems) && isMobile;
  return (
    <>
      {showCollapsed ? collapsedItems : null}
      {showCollapsed && moreActions ? <DropdownMenuSeparator /> : null}
      {moreActions}
    </>
  );
}
