/**
 * 内容集合（content collections）定义：每类内容的数据格式。构建时 Astro 会按这里的规则校验数据，
 * 字段缺失或类型不对会直接报错，避免带着错误数据上线。
 *
 * 当前集合：
 * - publications：论文（设计文档 §6）。
 * Phase 3 加入 posts（设计文档 §7），Phase 5 加入 albums（设计文档 §8）。
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

export const collections = { publications };
