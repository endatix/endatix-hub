// import NotificationsBell from "@/components/controls/notifications/notifications-bell";
import BreadcrumbNav from "@/components/layout-ui/navigation/breadcrumb-nav";
// import MainSearchBar from "@/components/layout-ui/navigation/main-search-bar";
import MobileNav from "@/components/layout-ui/navigation/mobile-nav";
import { SitemapService } from "@/services/sitemap-service";
import MyAccountDropdown from "../my-account/my-account-dropdown";

interface MainHeaderProps {
  showHeader?: boolean;
}

export default async function MainHeader({
  showHeader = true,
}: MainHeaderProps) {
  const sitemap = SitemapService.getSitemap();

  if (!showHeader) return null;

  return (
    <header className="sticky top-0 z-30 flex h-24 items-center gap-4 border-b bg-gray-50 px-4 py-4 sm:h-auto sm:border-0 sm:px-6">
      <MobileNav />
      <BreadcrumbNav homeText="Home" sitemap={sitemap}></BreadcrumbNav>
      {/* <MainSearchBar /> */}
      {/* <NotificationsBell badgeStyle="badge" renderSampleData={false} /> */}
      <div className="ml-auto">
        <MyAccountDropdown />
      </div>
    </header>
  );
}
