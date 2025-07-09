import { sitemap } from "@/lib/constants";
import { INavItem, ISitemapItem } from "@/types/navigation-models";
import { BrainCircuit } from "lucide-react";

export class SitemapService {
  public static getSitemap(): ISitemapItem[] {
    const sitemapArray: ISitemapItem[] = Object.entries(sitemap).map(
      ([, value]) => {
        const sitemapItem: ISitemapItem = {
          key: value?.key,
          text: value?.text,
          path: value?.path,
        };
        return sitemapItem;
      },
    );
    return sitemapArray;
  }

  public static getTopLevelSitemap(
    excludeSettings: boolean = false,
  ): INavItem[] {
    const sitemapList: INavItem[] = [
      sitemap.forms,
      sitemap.formTemplates,
      sitemap.analytics,
      sitemap.workflows,
      sitemap.integrations,
    ];

    if (!excludeSettings) {
      sitemapList.push(sitemap.settings);
    }

    return sitemapList;
  }

  public static getLogo(): INavItem {
    const logoNavItem: INavItem = {
      key: "logo",
      path: "https://endatix.com",
      text: "Endatix",
      IconType: BrainCircuit,
    };

    return logoNavItem;
  }
}
