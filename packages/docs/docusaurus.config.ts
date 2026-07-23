import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const configDirectory = dirname(fileURLToPath(import.meta.url));
const coreNodePackage = JSON.parse(
  readFileSync(resolve(configDirectory, "../core-node/package.json"), "utf8"),
) as { version: string };

const config: Config = {
  title: "PayAfrica",
  tagline: "Documentation du SDK de paiement mobile unifié",
  favicon: "img/favicon.svg",
  url: "https://gaye-lamine.github.io",
  baseUrl: "/payafrica/",
  organizationName: "gaye-lamine",
  projectName: "payafrica",
  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },
  i18n: {
    defaultLocale: "fr",
    locales: ["fr"],
  },
  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/gaye-lamine/payafrica/tree/main/packages/docs/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    navbar: {
      title: "PayAfrica",
      items: [
        { type: "docSidebar", sidebarId: "docs", position: "left", label: "Documentation" },
        { to: "/cli", label: "CLI", position: "left" },
        { to: "/", label: `SDK v${coreNodePackage.version}`, position: "right" },
        { href: "https://github.com/gaye-lamine/payafrica", label: "GitHub", position: "right" },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "SDK",
          items: [
            { label: "Node.js", href: "https://www.npmjs.com/package/@payafrica/core-node" },
            { label: "PHP", href: "https://packagist.org/packages/payafrica/core-php" },
            { label: "Python", href: "https://pypi.org/project/payafrica-sdk/" },
          ],
        },
        {
          title: "Projet",
          items: [
            { label: "GitHub", href: "https://github.com/gaye-lamine/payafrica" },
            { label: "Changelog", href: "https://github.com/gaye-lamine/payafrica/blob/main/CHANGELOG.md" },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} PayAfrica. MIT License.`,
    },
    prism: {
      additionalLanguages: ["php", "python"],
    },
    docs: {
      sidebar: {
        hideable: true,
      },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
