/**
 * 内容集合（content collections）定义：每类内容的数据格式。构建时 Astro 会按这里的规则校验数据，
 * 字段缺失或类型不对会直接报错，避免带着错误数据上线。
 *
 * 当前集合：
 * - publications：论文（设计文档 §6）。
 * - posts：文章（设计文档 §7），来自 Obsidian 笔记库的同步副本。
 * Phase 5 加入 albums（设计文档 §8）。
 */
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/** 中英双语文字，对应 src/lib/site.ts 里的 LocalizedText。 */
const localizedText = z.object({
  en: z.string(),
  zh: z.string(),
});

/**
 * 论文。每篇一个文件夹，文件夹名就是网址里的 slug：
 *
 *   src/content/publications/zip/
 *     index.yaml      ← 数据
 *     overview.png    ← 方法图（可选）
 *
 * index.yaml 示例：
 *
 *   title: "ZIP: Scalable Crowd Counting via Zero-Inflated Poisson Modeling"
 *   date: 2025-07-31
 *   type: preprint                  # conference | journal | workshop | preprint
 *   venue:
 *     short: "Preprint"             # 列表里显示的简称，如 "ICME 2025"
 *     full: "…"                     # 可选：详情页和 citation meta 用的全称
 *   authors:
 *     - name: "Yiming Ma"
 *       equal: true                 # 可选：共同一作，显示 *
 *     - name: "Tanaya Guha"
 *       corresponding: true         # 可选：通讯作者，显示 †
 *   links:
 *     paper: "https://arxiv.org/abs/2506.19955"
 *     code: "…"                     # 可选
 *     demo: "…"                     # 可选
 *     project: "…"                  # 可选
 *   image: ./overview.png           # 可选：相对 index.yaml 的路径
 *   tldr: { en: "…", zh: "…" }      # 一句话总结
 *   abstract: { en: "…", zh: "…" }  # 可选：摘要
 *   bibtex: |                       # 可选：官方 BibTeX，原样粘贴
 *     @inproceedings{…}
 */
const publications = defineCollection({
  loader: glob({
    pattern: "*/index.yaml",
    base: "./src/content/publications",
    // 用文件夹名作为 id（也就是网址里的 slug），而不是 "zip/index"。
    generateId: ({ entry }) => entry.split("/")[0],
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** 论文首次公开的日期（通常是 arXiv 第一版），用于排序和按年份分组。 */
      date: z.coerce.date(),
      type: z.enum(["conference", "journal", "workshop", "preprint"]),
      venue: z.object({
        short: z.string(),
        full: z.string().optional(),
      }),
      authors: z
        .array(
          z.object({
            name: z.string(),
            equal: z.boolean().default(false),
            corresponding: z.boolean().default(false),
          }),
        )
        .min(1),
      links: z.object({
        paper: z.string().url(),
        code: z.string().url().optional(),
        demo: z.string().url().optional(),
        project: z.string().url().optional(),
      }),
      /** Astro 会在构建时把图片压缩、转换成合适的格式和尺寸。 */
      image: image().optional(),
      tldr: localizedText,
      abstract: localizedText.optional(),
      bibtex: z.string().optional(),
    }),
});

/**
 * 文章。每篇一个文件夹，文件夹名就是 slug（网址的一部分）：
 *
 *   src/content/posts/dinov3-01/
 *     zh.md                ← 中文原文：从 Obsidian 原样复制，只在 frontmatter 末尾加了 source（和缺失时的 slug）
 *     en.md                ← 英文译文
 *     Pasted image ….png   ← 笔记里嵌入的图片（视频等其他附件放 public/media/posts/<slug>/）
 *
 * 草稿放在 src/content/posts-drafts/，结构相同；只在本地开发或 INCLUDE_DRAFTS=1 时出现
 * （开关见 src/lib/drafts.mjs，过滤在 src/lib/posts.ts 的 getAllPosts）。
 *
 * frontmatter 示例（前 7 个字段沿用作者在 Obsidian 里的写法）：
 *
 *   title: "手撕 DINOv3（一）：研究背景与核心动机"
 *   description: "…"
 *   date: 2026-11-13
 *   updated: 2026-11-13          # 可选
 *   series: "手撕 DINOv3"         # 可选：系列名
 *   series_order: 1              # 可选：在系列中的序号
 *   tags: [ai/computer-vision]   # 可选：支持层级标签
 *   slug: dinov3-01              # 网址；只用小写字母、数字、连字符；不能叫 graph（被关系图页面占用）
 *   publish: true                # 正式文章必须为 true；草稿可省略
 *   source: "随笔/手撕 DINOv3/手撕 DINOv3 ：01 – 摘要与引言.md"
 *                                # 笔记在笔记库里的相对路径。文件名用于匹配双链，第一级文件夹决定分类：
 *                                # 论文/ → Papers，书籍/ → Books，随笔/ → Notes
 */
const posts = defineCollection({
  loader: glob({
    // 始终读取正式和草稿两个目录；是否把草稿放进本次构建，由 src/lib/posts.ts 按 includeDrafts() 过滤。
    // 不在这里按开关切换匹配规则，是因为匹配不到任何文件时，加载器会沿用上一次构建的缓存，
    // 导致本地的正式构建里混进草稿。
    pattern: ["posts/*/{zh,en}.md", "posts-drafts/*/{zh,en}.md"],
    base: "./src/content",
    // id 形如 "dinov3-01/zh"：文件夹名 + 语言。正式文章和草稿不能同名。
    generateId: ({ entry }) => entry.split("/").slice(1).join("/").replace(/\.md$/, ""),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    series: z.string().optional(),
    series_order: z.number().int().positive().optional(),
    tags: z.array(z.string()).default([]),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 只能用小写字母、数字和连字符")
      .refine((value) => value !== "graph", "slug 不能是 graph"),
    publish: z.boolean().optional(),
    source: z.string().regex(/^(论文|书籍|随笔)\//, "source 必须以 论文/、书籍/ 或 随笔/ 开头"),
  }),
});

export const collections = { publications, posts };
