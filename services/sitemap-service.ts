import { sitemap } from "@/lib/constants";
import { INavItem, ISitemapItem } from "@/types/navigation-models";

export class SitemapService {
  public static getSitemap(): ISitemapItem[] {
    const sitemapArray: ISitemapItem[] = Object.entries(sitemap).map(
      ([, value]) => {
        const sitemapItem: ISitemapItem = {
          key: value?.key,
          title: value?.title,
          url: value?.url,
        };
        return sitemapItem;
      },
    );
    return sitemapArray;
  }

  public static getTopLevelSitemap(): INavItem[] {
    const sitemapList: INavItem[] = [
      sitemap.forms,
      sitemap.formTemplates,
      sitemap.folders,
      sitemap.dataLists,
      sitemap.documentation,
      sitemap.settings,
      sitemap.platformAdmin,
    ];

    return sitemapList;
  }

  public static getSecondarySitemap(): INavItem[] {
    const sitemapList: INavItem[] = [
      sitemap.support,
    ];

    return sitemapList;
  }
}
