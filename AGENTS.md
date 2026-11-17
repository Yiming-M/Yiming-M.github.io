# AGENTS.md

本文件写给在这个仓库里工作的 AI agent（Claude、Codex 等）。`CLAUDE.md` 通过 `@AGENTS.md` 引用本文件，两者始终是同一份内容。

## 项目

- 马一铭（Yiming Ma）的个人网站：Astro 静态站，由 GitHub Actions 部署到 GitHub Pages。**推送到 `main` 即上线。**
- 网站正在按 `docs/design/` 推倒重建。设计文档是实现的唯一依据：
  - [`docs/design/00-overall-design.md`](docs/design/00-overall-design.md)：总体设计
  - [`docs/design/01-implementation-plan.md`](docs/design/01-implementation-plan.md)：分阶段计划与验收标准
- 当前进度：**Phase 1（基础框架）已完成，待作者预览确认；下一步是 Phase 2（About Me 与 Publications）。** 每完成一个阶段，更新这一行。

## 规则

1. **不推送。** 任何分支都不执行 `git push`。只有作者明确说“提交”时，才执行 `git commit`。
2. **重建期间在 `site-v2` 分支上工作**，不在 `main` 上提交，以免未完成的新站上线。
3. **改动前先看 `git status`**，不覆盖作者或其他 agent 未提交的改动。
4. **交付前构建必须通过**：`npm run build`。然后用 `npm run preview`（或 `npm run dev`）在本地给作者检查。交付时说明验证了什么、没验证什么。
5. **事实必须有出处。** 论文的数字、结论、作者和 venue，以论文原文（arXiv 或正式出版版本）为准，并能指出来自哪一节或哪张表。找不到出处就不写，绝不编造。
6. **Obsidian 笔记库只读**，路径是 `/Users/yimingma/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/`。除非作者明确要求，不修改其中任何文件。
7. **以下操作先征得同意**：下载外部数据；删除未提交或未跟踪的文件；新增设计文档 §9 列表以外的依赖。
8. **需要偏离设计时，先改设计文档**，征得同意后再改代码。
9. **注释写足，用中文**（见设计文档 §9.1）。标识符用英文。
10. 与作者交流使用中文。

## 翻译规则（中文 → 英文）

- 中文是原文，英文是译文。英文版只存在于本仓库，Obsidian 笔记库保持纯中文。
- 忠实翻译，不增删内容，不加 AI 翻译声明。
- 使用英式拼写（behaviour、centre、modelling）。
- 以下内容保持原样，不翻译：公式、代码、链接地址、文件名、Admonition 类型名（如 `ad-def`）、论文英文标题、人名。
- Admonition 的标题按设计文档 §7.3 的对照表翻译。
- 双链 `[[目标|别名]]`：目标保持不变，因为它指向笔记文件名；别名如果是中文则翻译。

## 操作手册

各项手册在对应阶段补全。补全之前，不要自行发明流程，先问作者。

### 同步笔记

Phase 3 补全。

### 添加论文

Phase 3 补全（Phase 2 定下数据结构之后）。

### 添加相册

Phase 5 补全。

### 更换首页 3D 数据

Phase 4 补全。

### 重新生成网页字体

只有更换字体或升级字体版本时才需要。

1. 确认作者本机 `~/Library/Fonts` 里有 `LXGWBrightGB-Regular.ttf`、`-Medium.ttf`、`-Italic.ttf`。也可以从 LXGW Bright 的 GitHub 发布页下载，但下载前先征得作者同意。
2. 在仓库根目录运行 `node scripts/fonts/split-lxgw-bright.mjs`。字体在别的目录时，把目录作为参数传入。
3. 如果字体版本变了，按字体 name 表里的版权信息更新 `public/fonts/lxgw-bright-gb/OFL.txt` 开头几行。
4. `npm run build`，然后在本地预览里检查中英文页面的字体，并核对中文页的字体下载量。设计文档 §3.1 有预算和上次的实测数据。

## 目录速览

随阶段更新。

| 路径 | 内容 |
| --- | --- |
| `docs/design/` | 设计文档 |
| `src/pages/[...locale]/` | 所有双语页面。一个文件同时生成英文版（根路径）和中文版（`/zh` 前缀），见 `src/lib/routes.ts` 的 `localeStaticPaths` |
| `src/pages/404.astro`、`src/pages/sitemap.xml.ts` | 404 页（中英文合在一页）和站点地图（新增详情页时要在这里登记） |
| `src/layouts/BaseLayout.astro` | 页面骨架：head 元信息、字体、主题初始化、页头、页脚 |
| `src/components/` | 页头 `SiteHeader`、页脚 `SiteFooter`、主题与语言切换、搜索按钮（占位）、图标、栏目占位页 |
| `src/styles/tokens.css` | 颜色、字体、字号、间距等设计变量；深色主题的变量要写两处，见文件开头的说明 |
| `src/styles/base.css` | 全站基础样式、焦点、页面切换动画、减少动态效果 |
| `src/lib/routes.ts` | 四个栏目的名称和路径（导航和 sitemap 都读这里） |
| `src/lib/site.ts` | 站点信息与语言工具函数 |
| `src/content.config.ts` | 内容集合定义，目前只有论文，Phase 2 换成新结构 |
| `src/content/publications/` | 论文数据：旧 JSON 格式，作为 Phase 2 的测试数据 |
| `scripts/fonts/split-lxgw-bright.mjs` | 把霞鹜文楷 Bright GB 切分成网页字体，见上方“重新生成网页字体” |
| `public/fonts/lxgw-bright-gb/` | 切分后的网页字体、`fonts.css` 和许可证；由脚本生成，不要手改 |
| `public/cv/` | 作者提供的中英文 CV PDF；覆盖同名文件即可更新 |
| `public/images/profile.jpg` | 头像，目前是占位图 |
| `public/publications/` | 论文方法图，Phase 2 迁移到各论文的文件夹 |
