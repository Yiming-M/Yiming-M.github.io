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
