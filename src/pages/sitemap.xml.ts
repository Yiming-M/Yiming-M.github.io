/**
 * 站点地图 /sitemap.xml：列出所有应被搜索引擎收录的页面，以及每个页面的中英文互链。
 *
 * 目前包括：首页、四个栏目首页、论文详情页、文章页（不含草稿）和关系图页。
 * Phase 5 新增相册详情页时，在 GET 里的 `paths` 追加 /albums/<slug>/。
 * 不要列入 404、草稿等 noindex 页面。
 */
import type { APIRoute } from "astro";
import { getAllPosts } from "../lib/posts";
import { getPublications } from "../lib/publications";
import { sections } from "../lib/routes";
import { localePath } from "../lib/site";

export const GET: APIRoute = async ({ site }) => {
  /** 与语言无关的页面路径；每个路径会同时输出英文和中文两条记录。 */
  const paths = [
    "/",
    ...sections.map((section) => section.path),
    ...(await getPublications()).map((pub) => `/publications/${pub.id}/`),
    "/posts/graph/",
    // 文章：只列正式文章；中英文两种语言都有时才会生成页面，这里按中文原文去重
    ...(await getAllPosts()).filter((post) => !post.draft && post.locale === "zh").map((post) => `/posts/${post.slug}/`),
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
