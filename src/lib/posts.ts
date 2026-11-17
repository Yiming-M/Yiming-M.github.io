/**
 * 文章的数据层：读取、校验、排序、分类、系列、阅读时长、反向链接和关系图。
 * 页面（src/pages/[...locale]/posts/）只通过这里拿数据。
 * 数据格式见 src/content.config.ts 的 posts 集合；双链规则见 src/lib/obsidian/。
 */
import fs from "node:fs";
import { getCollection, type CollectionEntry } from "astro:content";
import { includeDrafts } from "./drafts.mjs";
import { extractLinkTargets, noteKey, noteNameFromPath } from "./obsidian/notes.mjs";
import { localePath, type Locale, type LocalizedText } from "./site";

export type PostEntry = CollectionEntry<"posts">;
export type Category = "papers" | "books" | "notes";

/** 三个分类，对应笔记库的三个顶层文件夹（设计文档 §7.2）。顺序即索引页上的顺序。 */
export const categories: { key: Category; folder: string; label: LocalizedText }[] = [
  { key: "papers", folder: "论文", label: { en: "Papers", zh: "论文笔记" } },
  { key: "books", folder: "书籍", label: { en: "Books", zh: "读书笔记" } },
  { key: "notes", folder: "随笔", label: { en: "Notes", zh: "随笔" } },
];

export type Post = {
  entry: PostEntry;
  locale: Locale;
  slug: string;
  draft: boolean;
  category: Category;
  /** Obsidian 里的笔记名（source 的文件名部分），双链和关系图用它识别笔记。 */
  noteName: string;
  readingMinutes: number;
  href: string;
};

/**
 * 估算阅读时长（分钟）：中文按每分钟 400 字、英文按每分钟 200 词，去掉代码块和链接地址后统计，至少 1 分钟。
 */
function readingMinutes(body: string) {
  const text = body
    .replace(/^(```+|~~~+)[^\n]*\n[\s\S]*?^\1\s*$/gm, (block) => (block.match(/^```+\s*ad-/) ? block : ""))
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/[#>*_`~=|[\]!-]/g, " ");
  const cjk = (text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) ?? []).length;
  const words = (text.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu, " ").match(/[A-Za-z0-9]+/g) ?? []).length;
  return Math.max(1, Math.round(cjk / 400 + words / 200));
}

/**
 * 读取全部文章（两种语言），并做构建期校验。任何一条不满足都会让构建失败，避免带错上线：
 * - 文件夹名必须等于 frontmatter 里的 slug；
 * - 正式文章（不在草稿目录）必须写 publish: true；
 * - 有英文版的文章必须有中文原文。
 *
 * 草稿只在 includeDrafts() 为真时保留（本地开发、INCLUDE_DRAFTS=1）。
 * 另外丢掉源文件已经不存在的条目：内容加载器的缓存可能残留上一次构建的文章。
 */
export async function getAllPosts(): Promise<Post[]> {
  const showDrafts = includeDrafts();
  const entries = (await getCollection("posts")).filter((entry) => {
    const draft = (entry.filePath ?? "").includes("posts-drafts");
    return (showDrafts || !draft) && entry.filePath !== undefined && fs.existsSync(entry.filePath);
  });
  const posts = entries.map((entry) => {
    const [folder, locale] = entry.id.split("/") as [string, Locale];
    const draft = (entry.filePath ?? "").includes("posts-drafts");
    if (folder !== entry.data.slug) {
      throw new Error(`文章文件夹名 "${folder}" 与 frontmatter 的 slug "${entry.data.slug}" 不一致（${entry.filePath}）`);
    }
    if (!draft && entry.data.publish !== true) {
      throw new Error(`正式文章必须写 publish: true（${entry.filePath}）`);
    }
    const folderName = entry.data.source.split("/")[0];
    const category = categories.find((item) => item.folder === folderName)!.key;
    return {
      entry,
      locale,
      slug: folder,
      draft,
      category,
      noteName: noteNameFromPath(entry.data.source),
      readingMinutes: readingMinutes(entry.body ?? ""),
      href: localePath(locale, `/posts/${folder}/`),
    } satisfies Post;
  });
  for (const post of posts) {
    if (post.locale === "en" && !posts.some((other) => other.slug === post.slug && other.locale === "zh")) {
      throw new Error(`英文文章 ${post.slug} 缺少中文原文 zh.md`);
    }
  }
  return posts;
}

/** 某种语言的全部文章，按发布日期从新到旧。 */
export async function getPosts(locale: Locale): Promise<Post[]> {
  return (await getAllPosts())
    .filter((post) => post.locale === locale)
    .sort((a, b) => b.entry.data.date.getTime() - a.entry.data.date.getTime());
}

/** 同一系列的文章（同一语言），按 series_order 排序。不属于系列时返回空数组。 */
export function seriesOf(post: Post, posts: Post[]): Post[] {
  const series = post.entry.data.series;
  if (!series) return [];
  return posts
    .filter((other) => other.entry.data.series === series)
    .sort((a, b) => (a.entry.data.series_order ?? 0) - (b.entry.data.series_order ?? 0));
}

/** 系列在索引页上的锚点 id，用于“系列 · 第 n 篇”跳回索引页对应位置。 */
export function seriesAnchor(series: string) {
  return `series-${series.normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase()}`;
}

/** 链接到本文的其他文章（同一语言）。 */
export function backlinksOf(post: Post, posts: Post[]): Post[] {
  const key = noteKey(post.noteName);
  return posts.filter(
    (other) => other.slug !== post.slug && extractLinkTargets(other.entry.body ?? "").some((target: string) => noteKey(target) === key),
  );
}

// —— 关系图 ——

export type GraphNode = {
  id: string;
  label: string;
  /** 已发布的文章有链接；尚未创建或未发布的笔记（灰色节点）没有。 */
  href?: string;
  category?: Category;
  ghost: boolean;
};

export type GraphLink = { source: string; target: string };
export type GraphData = { nodes: GraphNode[]; links: GraphLink[] };

/**
 * 全站关系图（某种语言）：
 * - 每篇文章一个实心节点；
 * - 被双链指向、但还没有对应文章的笔记，是灰色空心节点（与 Obsidian 里未创建的笔记一致，设计文档 §7.5）；
 * - 每条双链一条边（同一对节点只算一条，忽略指向自己的链接）。
 */
export function buildGraph(posts: Post[]): GraphData {
  const nodes = new Map<string, GraphNode>();
  for (const post of posts) {
    nodes.set(noteKey(post.noteName), {
      id: noteKey(post.noteName),
      label: post.entry.data.title,
      href: post.href,
      category: post.category,
      ghost: false,
    });
  }
  const links = new Map<string, GraphLink>();
  for (const post of posts) {
    const source = noteKey(post.noteName);
    for (const target of extractLinkTargets(post.entry.body ?? "")) {
      const id = noteKey(target);
      if (id === source) continue;
      if (!nodes.has(id)) nodes.set(id, { id, label: target, ghost: true });
      const key = [source, id].sort().join("\u0000");
      links.set(key, { source, target: id });
    }
  }
  return { nodes: [...nodes.values()], links: [...links.values()] };
}

/** 局部关系图：当前文章和与它直接相连的笔记（一跳），以及这些节点之间的边。 */
export function localGraph(graph: GraphData, post: Post): GraphData {
  const center = noteKey(post.noteName);
  const keep = new Set([center]);
  for (const link of graph.links) {
    if (link.source === center) keep.add(link.target);
    if (link.target === center) keep.add(link.source);
  }
  return {
    nodes: graph.nodes.filter((node) => keep.has(node.id)),
    links: graph.links.filter((link) => keep.has(link.source) && keep.has(link.target)),
  };
}
