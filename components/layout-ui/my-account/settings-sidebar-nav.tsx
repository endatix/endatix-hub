"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SettingsSidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: { href: string; title: string }[];
}

export function SettingsSidebarNav({
  className,
  items,
  ...props
}: SettingsSidebarNavProps) {
  const pathname = usePathname();
  const activeItem = items.find((item) => pathname === item.href);
  const triggerLabel = activeItem?.title ?? "Settings";

  const linkList = (
    <div className="flex w-full flex-col gap-1 lg:space-y-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={{ pathname: item.href }}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            pathname === item.href
              ? "bg-muted hover:bg-muted"
              : "hover:bg-transparent hover:underline",
            "w-full justify-start",
          )}
        >
          {item.title}
        </Link>
      ))}
    </div>
  );

  return (
    <nav
      className={cn("flex w-full flex-col lg:w-52", className)}
      aria-label="Settings navigation"
      {...props}
    >
      {/* Mobile: accordion with current section as trigger */}
      <div className="lg:hidden">
        <Accordion type="single" collapsible defaultValue="">
          <AccordionItem
            value="settings-nav"
            className="border rounded-lg px-3 bg-muted/50"
          >
            <AccordionTrigger className="py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
              <span className="font-medium">{triggerLabel}</span>
            </AccordionTrigger>
            <AccordionContent className="pb-3 pt-0">
              {linkList}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      
      {/* Desktop: vertical list (no accordion), wider sidebar, full-width links */}
      <aside className="hidden lg:block -mx-4 lg:w-52">{linkList}</aside>
    </nav>
  );
}
