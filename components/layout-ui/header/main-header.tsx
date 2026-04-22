import BreadcrumbNav from "@/components/layout-ui/navigation/breadcrumb-nav";
import { SitemapService } from "@/services/sitemap-service";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MainHeaderProps {
  showHeader?: boolean;
  /** Optional right-side actions (e.g. primary CTA). */
  actions?: ReactNode;
  /** Pin header under the viewport top while scrolling. */
  sticky?: boolean;
}

export default async function MainHeader({
  showHeader = true,
  actions,
  sticky = false,
}: MainHeaderProps) {
  const sitemap = SitemapService.getSitemap();

  if (!showHeader) return null;

  return (
    <header
      data-slot="main-header"
      className={cn(
        "flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/70 bg-background/90 shadow-[0_8px_30px_rgb(0,52,94,0.04)] backdrop-blur-xl transition-[width,height] ease-linear dark:shadow-none",
        sticky && "sticky top-0 z-40",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <BreadcrumbNav
            homeText="Home"
            sitemap={sitemap}
            listClasses="hidden md:block"
          />
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
