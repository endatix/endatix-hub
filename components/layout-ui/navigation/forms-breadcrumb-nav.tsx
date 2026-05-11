"use client";

import Link from "next/link";
import {
  Breadcrumb,
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
import { ChevronDownIcon } from "lucide-react";

type FormsBreadcrumbNavProps = {
  items: FormsBreadcrumbItem[];
};

export default function FormsBreadcrumbNav({
  items,
}: Readonly<FormsBreadcrumbNavProps>) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((item, index) => (
          <BreadcrumbChunk key={`${item.type}-${index}`} item={item} />
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function BreadcrumbChunk({
  item,
}: Readonly<{
  item: FormsBreadcrumbItem;
}>) {
  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        {item.type === "page" ? (
          <BreadcrumbPage>{item.label}</BreadcrumbPage>
        ) : item.type === "link" ? (
          <BreadcrumbLink asChild>
            <Link href={item.href}>{item.label}</Link>
          </BreadcrumbLink>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm text-foreground"
                aria-label={`${item.label} navigation`}
              >
                {item.label}
                <ChevronDownIcon className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                {item.options.map((option) => (
                  <DropdownMenuItem key={option.href} asChild>
                    <Link
                      href={option.href}
                      className={option.isActive ? "font-medium" : ""}
                    >
                      {option.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </BreadcrumbItem>
    </>
  );
}
