/**
 * 内容集合（content collections）定义。
 *
 * 过渡状态（Phase 0 之后）：
 * - 只保留 `publications`，沿用旧网站的 JSON 结构，用来在构建时校验
 *   `src/content/publications/*.json` 这 6 份测试数据。目前没有页面读取它。
 * - Phase 2 会把论文换成设计文档 §6 的 YAML 结构（每篇一个文件夹）。
 * - Phase 3 加入 `posts`（设计文档 §7），Phase 5 加入 `albums`（设计文档 §8）。
 */
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/** 中英双语文字，对应 src/lib/site.ts 里的 LocalizedText。 */
const localizedText = z.object({
  en: z.string(),
  zh: z.string(),
});

/** 旧网站的论文结构。字段含义见 main 分支上的旧版组件；Phase 2 整体替换。 */
const publications = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/publications" }),
  schema: z.object({
    title: z.string(),
    shortTitle: z.string(),
    date: z.coerce.date(),
    publishedOn: z.coerce.date(),
    venue: z.string(),
    authors: z.array(z.string()),
    tags: z.array(z.string()),
    selected: z.boolean().default(false),
    image: z.string().optional(),
    links: z.object({
      paper: z.string(),
      code: z.string().optional(),
      demo: z.string().optional(),
    }),
    question: localizedText,
    oneLine: localizedText,
    problem: localizedText,
    idea: localizedText,
    evidence: localizedText,
    caveat: localizedText,
  }),
});

export const collections = { publications };
