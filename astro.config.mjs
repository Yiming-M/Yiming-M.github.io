/**
 * Astro 配置。
 *
 * - 静态输出，由 GitHub Actions 部署到 GitHub Pages（.github/workflows/deploy.yml）。
 * - `trailingSlash: "always"`：所有页面路径以 `/` 结尾，src/lib/site.ts 的 localePath 依赖这一点。
 * - Markdown 公式目前仍用 KaTeX（旧网站遗留）。Phase 3 会换成构建时渲染的 MathJax，
 *   与 Obsidian 的显示保持一致（设计文档 §7.3、§9）。
 */
import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

export default defineConfig({
  site: "https://yiming-m.github.io",
  output: "static",
  trailingSlash: "always",
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "dracula",
      },
    },
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  },
});
