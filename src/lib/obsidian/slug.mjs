/**
 * 标题锚点（heading id）的生成规则。
 *
 * 文章里每个标题都会得到一个 id，例如 “## 写在前面” → id="写在前面"，“### Gram anchoring 带来的高质量特征图”
 * → id="gram-anchoring-带来的高质量特征图"。双链 [[笔记#标题]] 跳转时用同一个函数算出锚点，
 * 所以两边永远一致。（Astro 默认也会生成标题 id，但它看到标题已有 id 就不会覆盖。）
 *
 * 规则：转小写；保留各种文字的字母、数字、组合符号、空白、下划线和连字符，其余标点删除；空白换成连字符。
 * 中文字符会原样保留。
 */
export function slugify(text) {
  return text
    .normalize("NFC")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, "-");
}

/** 同一页面里出现重复标题时，第二个起依次加 -1、-2 后缀，保证 id 唯一。 */
export function createSlugger() {
  const seen = new Map();
  return (text) => {
    const base = slugify(text) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}
