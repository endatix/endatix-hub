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
export default function FormsBreadcrumbNav({
  items,
}: Readonly<FormsBreadcrumbNavProps>) {
  const { head, hidden, tail } = splitTrail(items);
  return (
    <Breadcrumb>
      <BreadcrumbList>
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
        {items.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CollapsedChunk({ items }: Readonly<{ items: LinkItem[] }>) {
  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
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
      {isFirst ? null : <BreadcrumbSeparator />}
      <BreadcrumbItem>
        {item.type === "page" ? (
          <BreadcrumbPage>{item.label}</BreadcrumbPage>
        ) : item.type === "link" ? (
          <BreadcrumbLink asChild>
            <Link href={item.href}>{item.label}</Link>
          </BreadcrumbLink>
        ) : (
          <NavSwitcher {...item} />
        )}
      </BreadcrumbItem>
    </>
  );
}
