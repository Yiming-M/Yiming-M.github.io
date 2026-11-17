/**
 * 站点的栏目与路由表。
 *
 * - `sections`：导航里的四个标签（设计文档 §2），顺序就是导航上的顺序。
 *   页头（SiteHeader）、站点地图（sitemap.xml.ts）都从这里读取，增删栏目只改这一处。
 * - `localeStaticPaths`：配合 `src/pages/[...locale]/` 下的页面使用，
 *   让同一个页面文件同时生成英文版（根路径）和中文版（/zh 前缀）。
 */
import type { Locale, LocalizedText } from "./site";

export type SectionKey = "about" | "publications" | "posts" | "albums";

export type Section = {
  key: SectionKey;
  /** 与语言无关的路径；中文版由 localePath() 自动加上 /zh 前缀。 */
  path: string;
  label: LocalizedText;
};

export const sections: Section[] = [
  { key: "about", path: "/about/", label: { en: "About Me", zh: "关于我" } },
  { key: "publications", path: "/publications/", label: { en: "Publications", zh: "论文" } },
  { key: "posts", path: "/posts/", label: { en: "Posts", zh: "文章" } },
  { key: "albums", path: "/albums/", label: { en: "Albums", zh: "相册" } },
];

/**
 * 为 `src/pages/[...locale]/**` 下的页面生成两种语言的静态路径。
 *
 * `[...locale]` 是 Astro 的“剩余参数”路由：
 * - locale 为 undefined 时匹配空路径 → 生成英文页面，如 `/about/`；
 * - locale 为 "zh" 时 → 生成中文页面，如 `/zh/about/`。
 * 页面通过 `Astro.props.locale` 拿到当前语言。
 *
 * 用法（页面文件里）：
 *   export const getStaticPaths = localeStaticPaths;
 */
export function localeStaticPaths() {
  return [
    { params: { locale: undefined }, props: { locale: "en" as Locale } },
    { params: { locale: "zh" }, props: { locale: "zh" as Locale } },
  ];
}
