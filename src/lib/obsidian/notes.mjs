/**
 * 笔记索引：把 Obsidian 的“笔记名”对应到网站上的文章。
 *
 * Obsidian 的双链写的是笔记的文件名（如 [[手撕 DINOv3 ：01 – 摘要与引言]]），
 * 而网站上的文章存在 src/content/posts/<slug>/zh.md、en.md。两者靠 frontmatter 里的 `source` 字段关联：
 * 同步时 agent 会写入笔记在笔记库中的相对路径，文件名部分就是笔记名。
 *
 * 本文件同时被两处使用：
 * - remark 插件（remark-obsidian.mjs）：渲染时把双链解析成链接；
 * - src/lib/posts.ts：构建关系图和反向链接。
 * 所以这里只用 Node 内置模块，不依赖 Astro 的内容集合 API。
 */
import fs from "node:fs";
import path from "node:path";

export const POSTS_DIR = "src/content/posts";
export const DRAFTS_DIR = "src/content/posts-drafts";

/** 双链里匹配笔记名时的规范化：统一 Unicode 形式、弯引号、连续空白，并忽略大小写（与 Obsidian 一致）。 */
export function noteKey(name) {
  return name
    .normalize("NFC")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** 从路径或双链目标里取出笔记名：去掉文件夹和 .md 后缀。 */
export function noteNameFromPath(value) {
  return path.basename(value.trim()).replace(/\.md$/i, "");
}

/**
 * 读取 frontmatter 里的简单标量字段（title、slug、source 等）。
 * 只处理 `key: value` 或 `key: "value"` 形式的单行字段，列表字段（如 tags）会被忽略。
 * 完整的 frontmatter 校验由 content.config.ts 负责。
 */
export function readFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  const fields = {};
  if (!match) return fields;
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!field || field[2] === "") continue;
    let value = field[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).replace(/\\"/g, '"');
    }
    fields[field[1]] = value;
  }
  return fields;
}

/**
 * 扫描文章目录，建立 笔记名 → 文章信息 的索引。
 *
 * @param {{ drafts: boolean, root?: string }} options drafts 为 true 时把草稿目录也算进去
 * @returns {Map<string, { name: string, slug: string, draft: boolean, titles: { zh?: string, en?: string } }>}
 *          键是 noteKey(笔记名)
 */
export function loadNoteIndex({ drafts, root = process.cwd() }) {
  const index = new Map();
  const dirs = [{ dir: POSTS_DIR, draft: false }, ...(drafts ? [{ dir: DRAFTS_DIR, draft: true }] : [])];
  for (const { dir, draft } of dirs) {
    const base = path.join(root, dir);
    if (!fs.existsSync(base)) continue;
    for (const slug of fs.readdirSync(base)) {
      const zhPath = path.join(base, slug, "zh.md");
      if (!fs.existsSync(zhPath)) continue;
      const zh = readFrontmatter(fs.readFileSync(zhPath, "utf8"));
      if (!zh.source) continue;
      const enPath = path.join(base, slug, "en.md");
      const en = fs.existsSync(enPath) ? readFrontmatter(fs.readFileSync(enPath, "utf8")) : undefined;
      const name = noteNameFromPath(zh.source);
      index.set(noteKey(name), { name, slug, draft, titles: { zh: zh.title, en: en?.title } });
    }
  }
  return index;
}

/**
 * 解析一个双链的内部文字（[[ 与 ]] 之间的部分）。
 * 支持：笔记名、笔记名#标题、笔记名#^块ID、以及 |别名。表格里转义的 \| 也能识别。
 *
 * @returns {{ target: string, heading?: string, block?: string, alias?: string }}
 */
export function parseWikilink(inner) {
  const [targetPart, ...aliasParts] = inner.replace(/\\\|/g, "|").split("|");
  const alias = aliasParts.length > 0 ? aliasParts.join("|").trim() : undefined;
  const hashIndex = targetPart.indexOf("#");
  const target = noteNameFromPath(hashIndex >= 0 ? targetPart.slice(0, hashIndex) : targetPart);
  const fragment = hashIndex >= 0 ? targetPart.slice(hashIndex + 1).trim() : "";
  if (fragment.startsWith("^")) return { target, block: fragment.slice(1), alias };
  return { target, heading: fragment || undefined, alias };
}

/**
 * 从一篇笔记的 Markdown 原文里找出所有指向其他笔记的双链（用于关系图和反向链接）。
 * 会跳过普通代码块和行内代码；Admonition 代码块（```ad-xxx）里的内容照常统计，因为它会被渲染成正文。
 * 嵌入笔记（![[笔记]]）算作链接，嵌入图片、视频等附件不算。
 *
 * @returns {string[]} 目标笔记名（未规范化，已去重）
 */
export function extractLinkTargets(markdown) {
  const withoutCode = markdown
    .replace(/^(```+|~~~+)(?!\s*ad-)[^\n]*\n[\s\S]*?^\1\s*$/gm, "")
    .replace(/`[^`\n]*`/g, "");
  const targets = new Set();
  for (const match of withoutCode.matchAll(/(!?)\[\[([^\[\]]+?)\]\]/g)) {
    const { target } = parseWikilink(match[2]);
    if (!target) continue;
    const isEmbed = match[1] === "!";
    if (isEmbed && /\.[a-z0-9]{2,5}$/i.test(target)) continue;
    targets.add(target);
  }
  return [...targets];
}
