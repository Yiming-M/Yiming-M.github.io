/**
 * 站点级常量与语言工具函数。
 *
 * - `site`：作者的姓名和外部链接。页面、meta 标签和 JSON-LD 都从这里读取，
 *   改这里一处即可全站生效。
 * - `localize` / `localePath` / `formatDate`：中英双语的辅助函数。
 *   英文页面在根路径（`/about/`），中文页面加 `/zh` 前缀（`/zh/about/`），
 *   见设计文档 §2。
 */

/** 网站支持的两种语言。英文是默认语言（根路径），中文在 `/zh` 下。 */
export type Locale = "en" | "zh";

/** 同一段文字的中英两个版本。内容数据（论文、相册等）里的双语字段都用这个形状。 */
export type LocalizedText = {
  en: string;
  zh: string;
};

/** 作者信息与外部链接。 */
export const site = {
  name: "Yiming Ma",
  nameZh: "马一铭",
  email: "yiming.m@proton.me",
  scholar: "https://scholar.google.com/citations?user=gC0aZsAAAAAJ&hl=en",
  github: "https://github.com/Yiming-M",
  linkedin: "https://www.linkedin.com/in/yiming-ma-5b401a201/",
};

/** 从双语字段中取出当前语言的文字。 */
export function localize(locale: Locale, value: LocalizedText) {
  return value[locale];
}

/**
 * 把站内路径转换为指定语言下的路径，并统一加上结尾斜杠
 * （astro.config.mjs 设置了 `trailingSlash: "always"`）。
 *
 * 例：localePath("en", "about") → "/about/"；localePath("zh", "/about/") → "/zh/about/"。
 */
export function localePath(locale: Locale, path = "/") {
  const cleanPath = path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}/`;
  return locale === "zh" ? `/zh${cleanPath}` : cleanPath;
}

/**
 * 按语言格式化日期，例如 "31 Jul 2025" 或 "2025年7月31日"。
 * 固定使用 UTC，避免构建机器的时区让日期差一天。
 */
export function formatDate(locale: Locale, date: Date) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
