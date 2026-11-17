/**
 * 草稿开关：决定 src/content/posts-drafts/ 里的笔记是否进入本次构建（设计文档 §7.1）。
 *
 * 草稿目录被 gitignore，只存在于作者本机：
 * - `npm run dev`（本地开发服务器）：始终包含草稿，方便预览。
 * - `INCLUDE_DRAFTS=1 npm run build`：构建一个带草稿的版本，用于本地完整预览（含搜索）。
 * - 普通的 `npm run build` 和 GitHub Actions 部署：不包含草稿。即使本机有草稿目录也不会被发布。
 *
 * content.config.ts（决定读哪些文件）和 Obsidian 插件（决定双链能否指向草稿）都调用这里，保证两边一致。
 */
export function includeDrafts() {
  return (
    process.env.INCLUDE_DRAFTS === "1" ||
    process.env.npm_lifecycle_event === "dev" ||
    process.argv.slice(2).includes("dev")
  );
}
