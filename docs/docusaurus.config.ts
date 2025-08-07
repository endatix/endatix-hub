import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Endatix Hub Documentation",
  tagline: "Official documentation for Endatix Hub",
  favicon: "img/endatix.svg",

  // Set the production url of your site here
  url: "https://docs.hub.endatix.com",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "Endatix Ltd.", // Usually your GitHub org/user name.
  projectName: "Endatix Hub", // Usually your repo name.

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  future: {
    v4: true,
  },
  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/endatix/endatix-hub/tree/main/docs",
        },
        theme: {
          customCss: "./src/css/endatix-theme.css",
        },
        gtag: {
          trackingID: "G-EX59EFQH18",
          anonymizeIP: true,
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: "img/endatix-transparent.png",
    navbar: {
      logo: {
        alt: "Endatix Logo",
        src: "img/endatix.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "endUsers",
          position: "left",
          label: "End Users",
        },
        {
          type: "docSidebar",
          sidebarId: "developers",
          position: "left",
          label: "Developers",
        },
        {
          href: "https://app.endatix.com/",
          label: "Login",
          position: "right",
        },
      ],
    },
    footer: {
      style: "light",
      links: [
        {
          title: "Endatix.com",
          items: [
            {
              label: "Blog",
              href: "https://endatix.com/blog",
            },
            {
              label: "Product",
              href: "https://endatix.com/products",
            },
            {
              label: "Services",
              href: "https://endatix.com/services",
            },
            {
              label: "Contact us",
              href: "https://endatix.com/contact",
            },
          ],
        },
        {
          title: "Resources",
          items: [
            {
              label: "Support",
              href: "https://github.com/endatix/endatix/issues/new/choose",
            },
            {
              label: "Releases",
              href: "https://github.com/endatix/endatix/releases",
            },
            {
              label: "NuGet",
              href: "https://www.nuget.org/packages?q=endatix",
            },
            {
              label: "SurveyJS",
              href: "https://surveyjs.io",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/endatix",
            },
            {
              label: "Stack Overflow",
              href: "https://stackoverflow.com/questions/tagged/endatix",
            },
            {
              label: "Twitter",
              href: "https://x.com/endatix_",
            },
            {
              label: "Videos",
              href: "https://www.youtube.com/@endatix",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Endatix, Ltd. All rights reserved.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ["csharp", "json"],
    },
    colorMode: {
      defaultMode: "light",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
  } satisfies Preset.ThemeConfig,
  markdown: {
    mermaid: true,
  },
  themes: ["@docusaurus/theme-mermaid"],
};

export default config;
