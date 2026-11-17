/**
 * 论文相关的工具函数：读取并排序、按年份分组、类型名称、链接列表、BibTeX、
 * 以及给搜索引擎和学术爬虫看的 citation meta 与 JSON-LD。
 * 数据格式见 src/content.config.ts 的 publications 集合。
 */
import { getCollection, type CollectionEntry } from "astro:content";
import { site, type Locale, type LocalizedText } from "./site";

export type Publication = CollectionEntry<"publications">;

/** 所有论文，按日期从新到旧排序。 */
export async function getPublications(): Promise<Publication[]> {
  const items = await getCollection("publications");
  return items.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** 按年份分组（年份从新到旧），用于列表页。 */
export function groupByYear(items: Publication[]): { year: number; items: Publication[] }[] {
  const groups = new Map<number, Publication[]>();
  for (const item of items) {
    const year = item.data.date.getUTCFullYear();
    groups.set(year, [...(groups.get(year) ?? []), item]);
  }
  return [...groups.entries()].sort(([a], [b]) => b - a).map(([year, items]) => ({ year, items }));
}

/** 论文类型的显示名称。 */
export const typeLabels: Record<Publication["data"]["type"], LocalizedText> = {
  conference: { en: "Conference", zh: "会议" },
  journal: { en: "Journal", zh: "期刊" },
  workshop: { en: "Workshop", zh: "研讨会" },
  preprint: { en: "Preprint", zh: "预印本" },
};

/**
 * 类型徽标旁边显示的 venue 文字。预印本的 venue 简称常常就是 "Preprint"，
 * 和类型徽标重复，这种情况返回 undefined，页面只显示徽标。
 */
export function venueText(pub: Publication, variant: "short" | "full" = "short"): string | undefined {
  const text = variant === "full" ? (pub.data.venue.full ?? pub.data.venue.short) : pub.data.venue.short;
  return text.trim().toLowerCase() === pub.data.type ? undefined : text;
}

/** 页面上显示的外部链接，按固定顺序；没有填的链接自动跳过。 */
export function publicationLinks(pub: Publication, locale: Locale) {
  const isZh = locale === "zh";
  const { paper, code, demo, project } = pub.data.links;
  return [
    { label: isZh ? "论文" : "Paper", href: paper },
    { label: isZh ? "代码" : "Code", href: code },
    { label: isZh ? "演示" : "Demo", href: demo },
    { label: isZh ? "项目主页" : "Project", href: project },
  ].filter((link): link is { label: string; href: string } => Boolean(link.href));
}

/** 判断作者是不是网站主人，用于在作者列表里加粗。 */
export function isSelf(name: string) {
  return name === site.name;
}

/** 从 arXiv 链接里取出编号，如 https://arxiv.org/abs/2506.19955 → 2506.19955。 */
export function arxivId(url: string): string | undefined {
  return url.match(/arxiv\.org\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5})/)?.[1];
}

/**
 * 详情页 Cite 块显示的 BibTeX。
 *
 * - YAML 里填了 bibtex（官方版本，优先）：原样使用。
 * - 没填但论文链接是 arXiv：用已有数据拼一条 arXiv 引用（@misc）。字段全部来自 YAML，
 *   不额外推测任何信息。
 * - 都没有：返回 undefined，详情页不显示 Cite 块。
 */
export function bibtexFor(pub: Publication): string | undefined {
  if (pub.data.bibtex) return pub.data.bibtex.trim();

  const eprint = arxivId(pub.data.links.paper);
  if (!eprint) return undefined;

  const year = pub.data.date.getUTCFullYear();
  const firstAuthorSurname = pub.data.authors[0].name.split(/\s+/).at(-1)!.toLowerCase();
  const key = `${firstAuthorSurname}${year}${pub.id.replace(/[^a-z0-9]/gi, "")}`;
  return [
    `@misc{${key},`,
    `  title         = {${pub.data.title}},`,
    `  author        = {${pub.data.authors.map((author) => author.name).join(" and ")}},`,
    `  year          = {${year}},`,
    `  eprint        = {${eprint}},`,
    `  archivePrefix = {arXiv},`,
    `  url           = {https://arxiv.org/abs/${eprint}},`,
    `}`,
  ].join("\n");
}

/**
 * Google Scholar 等学术爬虫识别论文用的 meta 标签（Highwire Press 格式）。
 * 只输出 YAML 里有的信息：没有 venue 全称时，不输出会议或期刊名。
 */
export function citationMeta(pub: Publication): { name: string; content: string }[] {
  const date = pub.data.date.toISOString().slice(0, 10).replaceAll("-", "/");
  const meta = [
    { name: "citation_title", content: pub.data.title },
    ...pub.data.authors.map((author) => ({ name: "citation_author", content: author.name })),
    { name: "citation_publication_date", content: date },
  ];
  const venue = pub.data.venue.full;
  if (venue && (pub.data.type === "conference" || pub.data.type === "workshop")) {
    meta.push({ name: "citation_conference_title", content: venue });
  }
  if (venue && pub.data.type === "journal") {
    meta.push({ name: "citation_journal_title", content: venue });
  }
  return meta;
}

/** 详情页的 JSON-LD（schema.org ScholarlyArticle），帮助搜索引擎理解这是一篇论文。 */
export function scholarlyArticleJsonLd(pub: Publication, pageUrl: URL, imageUrl?: URL) {
  return {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: pub.data.title,
    name: pub.data.title,
    author: pub.data.authors.map((author) => ({ "@type": "Person", name: author.name })),
    datePublished: pub.data.date.toISOString().slice(0, 10),
    description: pub.data.tldr.en,
    ...(pub.data.abstract ? { abstract: pub.data.abstract.en } : {}),
    url: pageUrl.href,
    sameAs: [pub.data.links.paper, pub.data.links.code].filter(Boolean),
    ...(imageUrl ? { image: imageUrl.href } : {}),
  };
}
