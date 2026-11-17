/**
 * 站点地图 /sitemap.xml：列出所有应被搜索引擎收录的页面，以及每个页面的中英文互链。
 *
 * 目前包括：首页、四个栏目首页、论文详情页。后续阶段新增详情页时，在 GET 里的 `paths` 追加：
 * - Phase 3：/posts/<slug>/、/posts/graph/
 * - Phase 5：/albums/<slug>/
 * 不要列入 404 等 noindex 页面。
 */
import type { APIRoute } from "astro";
import { getPublications } from "../lib/publications";
import { sections } from "../lib/routes";
import { localePath } from "../lib/site";

export const GET: APIRoute = async ({ site }) => {
  /** 与语言无关的页面路径；每个路径会同时输出英文和中文两条记录。 */
  const paths = [
    "/",
    ...sections.map((section) => section.path),
    ...(await getPublications()).map((pub) => `/publications/${pub.id}/`),
  ];
  const url = (locale: "en" | "zh", path: string) => new URL(localePath(locale, path), site).href;

  const entries = paths.flatMap((path) =>
    (["en", "zh"] as const).map(
      (locale) => `  <url>
    <loc>${url(locale, path)}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${url("en", path)}"/>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${url("zh", path)}"/>
  </url>`,
    ),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;

  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
