// import NotificationsBell from "@/components/controls/notifications/notifications-bell";
import { auth } from "@/auth";
import BreadcrumbNav from "@/components/layout-ui/navigation/breadcrumb-nav";
// import MainSearchBar from "@/components/layout-ui/navigation/main-search-bar";
import MobileNav from "@/components/layout-ui/navigation/mobile-nav";
import MyAccountDropdown from "@/features/auth/use-cases/keycloak/ui/my-account-dropdown";
import { SitemapService } from "@/services/sitemap-service";

interface MainHeaderProps {
  showHeader?: boolean;
}

export default async function MainHeader({
  showHeader = true,
}: MainHeaderProps) {
  const sitemap = SitemapService.getSitemap();
  const session = await auth();

  if (!showHeader) return null;

  return (
    <header className="sticky top-0 z-30 flex h-24 items-center gap-4 border-b bg-gray-50 px-4 py-4 sm:h-auto sm:border-0 sm:px-6">
      <MobileNav />
      <BreadcrumbNav homeText="Home" sitemap={sitemap}></BreadcrumbNav>
      {/* <MainSearchBar /> */}
      {/* <NotificationsBell badgeStyle="badge" renderSampleData={false} /> */}
      <div className="ml-auto">
        <MyAccountDropdown session={session} />
      </div>
    </header>
  );
}
