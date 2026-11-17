/**
 * Astro 配置。
 *
 * - 静态输出，由 GitHub Actions 部署到 GitHub Pages（.github/workflows/deploy.yml）。
 * - `trailingSlash: "always"`：所有页面路径以 `/` 结尾，src/lib/site.ts 的 localePath 依赖这一点。
 * - Markdown 处理（文章来自 Obsidian，设计文档 §7.3）：
 *   - remark-math：识别 $…$ 和 $$…$$ 公式；
 *   - remark-obsidian：双链、嵌入、Admonition、callout、块 ID、Mermaid、高亮（src/lib/obsidian/）；
 *   - rehype-mathjax：构建时用 MathJax 把公式渲染成 SVG，与 Obsidian 的显示一致，浏览器不需要再加载公式脚本。
 *   - 代码高亮用 Shiki 的双主题，深浅色切换见 src/styles/prose.css。
 */
import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import rehypeMathjax from "rehype-mathjax";
import remarkMath from "remark-math";
import remarkObsidian from "./src/lib/obsidian/remark-obsidian.mjs";

export default defineConfig({
  site: "https://yiming-m.github.io",
  output: "static",
  trailingSlash: "always",
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    },
    processor: unified({
      remarkPlugins: [remarkMath, remarkObsidian],
      rehypePlugins: [rehypeMathjax],
    }),
  },
});
