"use client";

import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FormsBreadcrumbItem } from "@/features/folders/types";
import { NavSwitcher } from "./nav-switcher";

type FormsBreadcrumbNavProps = {
  items: FormsBreadcrumbItem[];
};

type LinkItem = Extract<FormsBreadcrumbItem, { type: "link" }>;

/** Longer trails keep their first crumb and last two; the middle folds into "…". */
const MAX_VISIBLE = 3;

/** A crumb is a span, so the width cap applies only once it is a block. */
const crumbLabel = "block min-w-0 max-w-40 truncate md:max-w-64";

/** Content width. Growing here pushes a sibling page switcher to the far edge. */
const trailClassName = "min-w-0 overflow-hidden";

function splitTrail(items: FormsBreadcrumbItem[]) {
  if (items.length <= MAX_VISIBLE) {
    return { head: items, hidden: [] as LinkItem[], tail: [] };
  }
  const middle = items.slice(1, -2);
  const foldable = middle.every((item) => item.type === "link");
  if (!foldable) return { head: items, hidden: [] as LinkItem[], tail: [] };
  return {
    head: items.slice(0, 1),
    hidden: middle as LinkItem[],
    tail: items.slice(-2),
  };
}

function chunks(list: FormsBreadcrumbItem[], at: string, first = false) {
  return list.map((item, index) => (
    <BreadcrumbChunk
      key={`${at}-${index}`}
      item={item}
      isFirst={first && index === 0}
    />
  ));
}

/**
 * The forms area trail. It starts at Forms (the sidebar already leads home), folds the middle
 * of a long trail into a menu, and a `dropdown` crumb switches between siblings (folders, or a
 * form's pages with their icons).
 */
function linkItems(items: FormsBreadcrumbItem[]): LinkItem[] {
  return items.filter((item): item is LinkItem => item.type === "link");
}

/** Below `md`, only the current crumb stays out; the rest sit in the ellipsis. */
function CompactTrail({ items }: Readonly<{ items: FormsBreadcrumbItem[] }>) {
  const earlier = linkItems(items.slice(0, -1));
  const last = items.at(-1);
  return (
    <>
      {earlier.length > 0 ? <CollapsedChunk items={earlier} first /> : null}
      {last ? (
        <BreadcrumbChunk item={last} isFirst={earlier.length === 0} />
      ) : null}
    </>
  );
}

export default function FormsBreadcrumbNav({
  items,
}: Readonly<FormsBreadcrumbNavProps>) {
  const { head, hidden, tail } = splitTrail(items);
  if (items.length <= 1) {
    return (
      <Breadcrumb className={trailClassName}>
        <BreadcrumbList className="min-w-0 flex-nowrap">
          {chunks(items, "only", true)}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }
  return (
    <Breadcrumb className={trailClassName}>
      <BreadcrumbList className="min-w-0 flex-nowrap md:hidden">
        <CompactTrail items={items} />
      </BreadcrumbList>
      <BreadcrumbList className="hidden min-w-0 flex-nowrap md:flex">
        {chunks(head, "head", true)}
        {hidden.length > 0 ? <CollapsedChunk items={hidden} /> : null}
        {chunks(tail, "tail")}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function CollapsedMenu({ items }: Readonly<{ items: LinkItem[] }>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center rounded-md hover:text-foreground"
        aria-label="Show the rest of the trail"
      >
        <BreadcrumbEllipsis className="size-6" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          {items.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href}>{item.label}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CollapsedChunk({
  items,
  first = false,
}: Readonly<{ items: LinkItem[]; first?: boolean }>) {
  return (
    <>
      {first ? null : <BreadcrumbSeparator className="shrink-0" />}
      <BreadcrumbItem className="shrink-0">
        <CollapsedMenu items={items} />
      </BreadcrumbItem>
    </>
  );
}

function BreadcrumbChunk({
  item,
  isFirst = false,
}: Readonly<{ item: FormsBreadcrumbItem; isFirst?: boolean }>) {
  return (
    <>
      {isFirst ? null : <BreadcrumbSeparator className="shrink-0" />}
      <BreadcrumbItem className="min-w-0">
        {item.type === "page" ? (
          <BreadcrumbPage className={crumbLabel} title={item.label}>
            {item.label}
          </BreadcrumbPage>
        ) : item.type === "link" ? (
          <BreadcrumbLink asChild>
            <Link href={item.href} className={crumbLabel} title={item.label}>
              {item.label}
            </Link>
          </BreadcrumbLink>
        ) : (
          <NavSwitcher {...item} />
        )}
      </BreadcrumbItem>
    </>
  );
}
