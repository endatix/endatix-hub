import BreadcrumbNav from "@/components/layout-ui/navigation/breadcrumb-nav";
import { SitemapService } from "@/services/sitemap-service";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface MainHeaderProps {
  showHeader?: boolean;
}

export default async function MainHeader({
  showHeader = true,
}: MainHeaderProps) {
  const sitemap = SitemapService.getSitemap();

  if (!showHeader) return null;

  return (
    <header
      data-slot="main-header"
      className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-sidebar-border bg-background"
    >
      <div className="flex items-center gap-2 px-4">
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
    </header>
  );
}
