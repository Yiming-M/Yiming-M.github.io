/**
 * remark 插件：把 Obsidian 写法转换成网页（设计文档 §7.3）。
 *
 * 只处理文章（src/content/posts/ 和 posts-drafts/ 下的 zh.md、en.md），其他 Markdown 原样通过。
 * 笔记原文不需要做任何改写：同步时原样复制，转换全部在构建时完成。
 *
 * 支持的写法（按处理顺序）：
 * 1. Admonition 代码块 ```ad-<类型>（可带 title: / collapse: 行）和 Obsidian 原生 callout `> [!类型]`。
 *    类型的标题、图标、颜色来自 src/data/admonitions.json。
 * 2. 块 ID：段落末尾的 ` ^abc123`（或单独一行的 ^abc123，指向上一个块），变成元素 id="block-abc123"。
 * 3. Mermaid 代码块：输出 <pre class="mermaid">，由文章页的脚本在浏览器里按需渲染。
 * 4. 行内：双链 [[笔记]]、[[笔记|别名]]、[[笔记#标题]]、[[笔记#^块ID]]；
 *    嵌入 ![[图片.png|说明|宽度]]、![[视频.mp4]]、![[笔记]]；高亮 ==文字==。
 * 5. 标题锚点：给每个标题生成 id（规则见 slug.mjs），供目录和 [[笔记#标题]] 使用。
 *
 * 附件位置（同步手册里约定）：
 * - 图片放在文章文件夹里（与 zh.md 同级），由 Astro 在构建时压缩成合适的格式和尺寸；
 * - 视频等其他附件放在 public/media/posts/<slug>/（草稿放 public/drafts/<slug>/），原样提供下载。
 *
 * 不支持（同步时会在报告里列出）：Dataview 查询、Excalidraw 画板、整篇笔记嵌入（降级为链接）。
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { includeDrafts } from "../drafts.mjs";
import { loadNoteIndex, noteKey, parseWikilink } from "./notes.mjs";
import { createSlugger } from "./slug.mjs";

const require = createRequire(import.meta.url);

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "svg"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);

/** Admonition / callout 类型配置（标题、图标、颜色）。 */
const admonitions = JSON.parse(
  fs.readFileSync(new URL("../../data/admonitions.json", import.meta.url), "utf8"),
).types;

/** 读取 lucide 图标的 SVG，去掉许可证注释，加上 class 和尺寸。结果按图标名缓存。 */
const iconCache = new Map();
function iconSvg(name) {
  if (!iconCache.has(name)) {
    let svg = "";
    try {
      svg = fs
        .readFileSync(require.resolve(`lucide-static/icons/${name}.svg`), "utf8")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/\s+class="[^"]*"/, "")
        .replace(/\s+width="\d+"/, "")
        .replace(/\s+height="\d+"/, "")
        .replace("<svg", '<svg class="callout-icon" width="18" height="18" aria-hidden="true" focusable="false"')
        .trim();
    } catch {
      svg = "";
    }
    iconCache.set(name, svg);
  }
  return iconCache.get(name);
}

// —— 通用的小工具 ——

/** 深度优先遍历，回调拿到 (节点, 父节点)。 */
function walk(node, visitor, parent = null) {
  visitor(node, parent);
  if (Array.isArray(node.children)) {
    for (const child of [...node.children]) walk(child, visitor, node);
  }
}

/** 节点里所有文字拼起来（用于标题锚点等）。 */
function toText(node) {
  if (typeof node.value === "string") return node.value;
  return Array.isArray(node.children) ? node.children.map(toText).join("") : "";
}

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** 给节点追加 HTML 属性（mdast → hast 时生效）。 */
function setProps(node, props) {
  node.data ??= {};
  node.data.hProperties = { ...(node.data.hProperties ?? {}), ...props };
}

/** 生成一个会被渲染成指定 HTML 元素的自定义节点。 */
function element(tagName, props, children = []) {
  return { type: "obsidianElement", data: { hName: tagName, hProperties: props }, children };
}

/**
 * 从文件路径判断这是不是一篇文章，以及它的语言、slug、是否草稿。
 * 例：.../src/content/posts/dinov3-01/zh.md → { locale: "zh", slug: "dinov3-01", draft: false }
 */
function postContext(file) {
  const filePath = file?.path ?? file?.history?.[0];
  if (typeof filePath !== "string") return null;
  const match = filePath.replaceAll("\\", "/").match(/src\/content\/(posts|posts-drafts)\/([^/]+)\/(zh|en)\.md$/);
  if (!match) return null;
  return { draft: match[1] === "posts-drafts", slug: match[2], locale: match[3], dir: path.dirname(filePath) };
}

/** 文章页的网址（英文在根路径，中文加 /zh），与 src/lib/site.ts 的 localePath 一致。 */
function postHref(locale, slug) {
  return `${locale === "zh" ? "/zh" : ""}/posts/${slug}/`;
}

export default function remarkObsidian() {
  // `this` 是当前的 unified 处理器，用它解析 Admonition 里的 Markdown，
  // 这样内容里的列表、加粗、公式、表格等语法都和正文一样被识别。
  const processor = this;

  return function transformer(tree, file) {
    const ctx = postContext(file);
    if (!ctx) return;

    const notes = loadNoteIndex({ drafts: includeDrafts() });

    expandCallouts(tree, ctx, processor);
    assignBlockIds(tree);
    convertMermaid(tree);
    convertInline(tree, ctx, notes, file);
    promoteBlockEmbeds(tree);
    assignHeadingIds(tree);
  };
}

// —— 1. Admonition 与 callout ——

/** 把 Admonition 代码块和 callout 引用块换成统一的 callout 结构。会递归处理嵌套的 Admonition。 */
function expandCallouts(tree, ctx, processor) {
  walk(tree, (node, parent) => {
    if (!parent) return;
    const index = parent.children.indexOf(node);
    if (index < 0) return;

    // ```ad-类型
    const adMatch = node.type === "code" && typeof node.lang === "string" && node.lang.match(/^ad-([\w-]+)$/);
    if (adMatch) {
      const lines = node.value.split("\n");
      const options = {};
      let i = 0;
      while (i < lines.length) {
        const option = lines[i].match(/^(title|collapse|icon|color):\s?(.*)$/);
        if (!option) break;
        options[option[1]] = option[2].trim();
        i++;
      }
      const content = processor.parse(lines.slice(i).join("\n"));
      expandCallouts(content, ctx, processor);
      parent.children[index] = renderCallout({
        type: adMatch[1].toLowerCase(),
        title: options.title,
        collapse: options.collapse,
        children: content.children,
        ctx,
        processor,
      });
      return;
    }

    // > [!类型]+ 标题
    if (node.type === "blockquote") {
      const first = node.children[0];
      const firstText = first?.type === "paragraph" ? first.children[0] : undefined;
      const head = firstText?.type === "text" && firstText.value.match(/^\[!([\w-]+)\]([+-]?)[ \t]*([^\n]*)\n?/);
      if (!head) return;
      firstText.value = firstText.value.slice(head[0].length);
      if (firstText.value === "") first.children.shift();
      // [!type] 那一行剩下的内容是标题；如果同一段后面还有内容，保留为第一段正文
      const children = first.children.length === 0 ? node.children.slice(1) : node.children;
      const fold = head[2] === "+" ? "open" : head[2] === "-" ? "closed" : undefined;
      parent.children[index] = renderCallout({
        type: head[1].toLowerCase(),
        title: head[3].trim() || undefined,
        collapse: fold,
        children,
        ctx,
        processor,
      });
    }
  });
}

/**
 * 输出结构：
 *   可折叠：<details class="callout" data-callout="类型"><summary class="callout-title">图标 标题</summary><div class="callout-content">…</div></details>
 *   不可折叠：<aside class="callout" …><div class="callout-title">…</div><div class="callout-content">…</div></aside>
 * 颜色通过 CSS 变量 --callout-color 传给样式（src/styles/prose.css）。
 */
function renderCallout({ type, title, collapse, children, ctx, processor }) {
  const config = admonitions[type] ?? {
    // 未知类型：用 note 的样式，标题显示类型名
    ...admonitions.note,
    title: { zh: type, en: type.charAt(0).toUpperCase() + type.slice(1) },
  };
  const collapsible = collapse === "open" || collapse === "closed";
  // title 未写 → 用类型的默认标题；写了空的 title: → 不显示标题栏（可折叠时仍需标题，退回默认标题）
  const titleText = title === undefined || (title === "" && collapsible) ? config.title[ctx.locale] : title;

  const parts = [];
  if (titleText !== "") {
    const titleTree = processor.parse(titleText);
    const inline = titleTree.children[0]?.type === "paragraph" ? titleTree.children[0].children : [{ type: "text", value: titleText }];
    parts.push(
      element(collapsible ? "summary" : "div", { className: ["callout-title"] }, [
        { type: "html", value: iconSvg(config.icon) },
        element("span", {}, inline),
      ]),
    );
  }
  parts.push(element("div", { className: ["callout-content"] }, children));

  return element(
    collapsible ? "details" : "aside",
    {
      className: ["callout"],
      dataCallout: type,
      style: `--callout-color: ${config.color}`,
      ...(collapse === "open" ? { open: true } : {}),
    },
    parts,
  );
}

// —— 2. 块 ID ——

const BLOCK_ID_AT_END = /\s\^([A-Za-z0-9-]+)\s*$/;
const BLOCK_ID_ALONE = /^\^([A-Za-z0-9-]+)$/;

function assignBlockIds(tree) {
  walk(tree, (node, parent) => {
    // 段落末尾的 ^id：属于这个段落
    if (node.type === "paragraph") {
      const last = node.children.at(-1);
      if (last?.type === "text") {
        const match = last.value.match(BLOCK_ID_AT_END);
        if (match) {
          last.value = last.value.slice(0, match.index);
          setProps(node, { id: `block-${match[1]}` });
          return;
        }
      }
      // 单独一行的 ^id：属于上一个块（如表格、列表、引用）
      if (parent && node.children.length === 1 && node.children[0].type === "text") {
        const alone = node.children[0].value.trim().match(BLOCK_ID_ALONE);
        const index = parent.children.indexOf(node);
        if (alone && index > 0) {
          setProps(parent.children[index - 1], { id: `block-${alone[1]}` });
          parent.children.splice(index, 1);
        }
      }
    }
  });
}

// —— 3. Mermaid ——

function convertMermaid(tree) {
  walk(tree, (node, parent) => {
    if (node.type === "code" && node.lang === "mermaid" && parent) {
      parent.children[parent.children.indexOf(node)] = {
        type: "html",
        value: `<pre class="mermaid" data-mermaid>${escapeHtml(node.value)}</pre>`,
      };
    }
  });
}

// —— 4. 行内：双链、嵌入、高亮 ——

const INLINE_PATTERN = /(!?)\[\[([^\[\]]+?)\]\]|==([^=\n]+?)==/g;
/** 这些节点里面的文字不处理（代码、已有链接）。 */
const SKIP_PARENTS = new Set(["link", "linkReference", "inlineCode", "code"]);

function convertInline(tree, ctx, notes, file) {
  walk(tree, (node, parent) => {
    if (node.type !== "text" || !parent || SKIP_PARENTS.has(parent.type)) return;
    if (!node.value.includes("[[") && !node.value.includes("==")) return;

    const replacement = [];
    let cursor = 0;
    for (const match of node.value.matchAll(INLINE_PATTERN)) {
      if (match.index > cursor) replacement.push({ type: "text", value: node.value.slice(cursor, match.index) });
      if (match[3] !== undefined) {
        replacement.push(element("mark", {}, [{ type: "text", value: match[3] }]));
      } else if (match[1] === "!") {
        replacement.push(renderEmbed(match[2], ctx, notes, file));
      } else {
        replacement.push(renderWikilink(match[2], ctx, notes));
      }
      cursor = match.index + match[0].length;
    }
    if (cursor === 0) return;
    if (cursor < node.value.length) replacement.push({ type: "text", value: node.value.slice(cursor) });
    parent.children.splice(parent.children.indexOf(node), 1, ...replacement);
  });
}

/**
 * 双链 → 站内链接；目标笔记不存在或未发布时 → 灰色、不可点击的文字。
 * 链接显示的文字：有别名用别名；否则用目标文章的标题（指向标题时附加 › 标题）。
 */
function renderWikilink(inner, ctx, notes) {
  const { target, heading, block, alias } = parseWikilink(inner);
  const note = notes.get(noteKey(target));

  if (!note) {
    const label = alias ?? (heading ? `${target} › ${heading}` : target);
    return element(
      "span",
      {
        className: ["wikilink", "is-unresolved"],
        title: ctx.locale === "zh" ? "这篇笔记还没有发布" : "This note has not been published yet",
      },
      [{ type: "text", value: label }],
    );
  }

  const linkLocale = note.titles[ctx.locale] ? ctx.locale : "zh";
  const anchor = block ? `#block-${block}` : heading ? `#${createSlugger()(heading)}` : "";
  const sameNote = note.slug === ctx.slug;
  const title = note.titles[ctx.locale] ?? note.titles.zh ?? note.name;
  const label = alias ?? (heading ? `${title} › ${heading}` : title);

  return {
    type: "link",
    url: sameNote && anchor ? anchor : `${postHref(linkLocale, note.slug)}${anchor}`,
    data: { hProperties: { className: ["wikilink"], dataWikilink: "" } },
    children: [{ type: "text", value: label }],
  };
}

/**
 * 嵌入：
 * - 图片 → 带图注的 figure（图注和宽度沿用 image-captions 插件的写法：![[图|说明|320]]）；
 * - 视频 → <video controls>；
 * - 其他附件 → 下载链接；
 * - 笔记 → 链接（整篇嵌入暂不支持）。
 * 返回的节点会在 promoteBlockEmbeds 中，若独占一段，则提升为块级元素。
 */
function renderEmbed(inner, ctx, notes, file) {
  const [rawTarget, ...rest] = inner.replace(/\\\|/g, "|").split("|").map((part) => part.trim());
  const fileName = path.basename(rawTarget);
  const extension = fileName.includes(".") ? fileName.split(".").pop().toLowerCase() : "";

  // 选项：最后一段如果是数字（或 数字x数字）就是宽度，其余部分是图注
  let width;
  if (rest.length > 0 && /^\d+(x\d+)?$/.test(rest.at(-1))) width = rest.pop().split("x")[0];
  const caption = rest.join("|");

  if (IMAGE_EXTENSIONS.has(extension)) {
    if (!fs.existsSync(path.join(ctx.dir, fileName))) {
      file.message(`找不到嵌入的图片：${fileName}（应放在文章文件夹里）`);
      return missingAttachment(fileName, ctx);
    }
    const children = [{ type: "image", url: `./${encodeURI(fileName)}`, alt: caption || "" }];
    if (caption) children.push(element("figcaption", {}, [{ type: "text", value: caption }]));
    return element("figure", { className: ["embed"], ...(width ? { style: `--embed-width: ${width}px` } : {}) }, children);
  }

  const mediaBase = ctx.draft ? `/drafts/${ctx.slug}/` : `/media/posts/${ctx.slug}/`;
  const mediaDir = path.join(process.cwd(), "public", mediaBase);

  if (VIDEO_EXTENSIONS.has(extension)) {
    if (!fs.existsSync(path.join(mediaDir, fileName))) {
      file.message(`找不到嵌入的视频：${fileName}（应放在 public${mediaBase}）`);
      return missingAttachment(fileName, ctx);
    }
    return element("figure", { className: ["embed", "embed-video"] }, [
      {
        type: "html",
        value: `<video controls preload="metadata" playsinline src="${escapeHtml(mediaBase + encodeURIComponent(fileName))}"></video>`,
      },
      ...(caption ? [element("figcaption", {}, [{ type: "text", value: caption }])] : []),
    ]);
  }

  if (extension && extension !== "md") {
    return {
      type: "link",
      url: mediaBase + encodeURIComponent(fileName),
      children: [{ type: "text", value: caption || fileName }],
    };
  }

  // 嵌入笔记：降级为普通双链
  return renderWikilink(inner, ctx, notes);
}

function missingAttachment(fileName, ctx) {
  return element("span", { className: ["wikilink", "is-unresolved"] }, [
    { type: "text", value: ctx.locale === "zh" ? `［缺少附件：${fileName}］` : `[Missing attachment: ${fileName}]` },
  ]);
}

/**
 * 一个段落里只有嵌入的图片或视频（以及空白）时，把段落替换成这些 figure，
 * 避免生成 <p><figure>…</figure></p> 这种不合法的嵌套。段落上的块 ID 转给第一个 figure。
 */
function promoteBlockEmbeds(tree) {
  walk(tree, (node, parent) => {
    if (node.type !== "paragraph" || !parent) return;
    const meaningful = node.children.filter((child) => !(child.type === "text" && child.value.trim() === ""));
    const allFigures =
      meaningful.length > 0 && meaningful.every((child) => child.type === "obsidianElement" && child.data?.hName === "figure");
    if (!allFigures) return;
    const id = node.data?.hProperties?.id;
    if (id) setProps(meaningful[0], { id });
    parent.children.splice(parent.children.indexOf(node), 1, ...meaningful);
  });
}

// —— 5. 标题锚点 ——

function assignHeadingIds(tree) {
  const slug = createSlugger();
  walk(tree, (node) => {
    if (node.type === "heading") setProps(node, { id: slug(toText(node)) });
  });
}
