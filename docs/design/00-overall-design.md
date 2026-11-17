# Yiming Ma 个人网站：总体设计（v2）

> 状态：**第二稿**，已吸收 2026-11-17 的审阅意见
> 日期：2026-11-17
> 取代：2026-08 的 “Editorial Research Index” 方案（旧版见 git 历史）
> 来源：2026-11-16 至 11-17 的四轮问答，以及对现有仓库和 Obsidian 笔记库的扫描

## 1. 定位

个人学术主页 + 笔记 + 摄影。当前不找工作（最早 2028 年 1 月），首页的任务是让人记住你，而不是速览简历。

全站分两种节奏：

| 节奏 | 页面 | 原则 |
| --- | --- | --- |
| 展示 | 首页、Albums | 炫酷、沉浸式视觉：3D、全屏图像、滚动叙事 |
| 阅读 | About Me、Publications、Posts | 沉浸式阅读：安静、专注、少干扰 |

全站中英双语，两种语言的结构和功能完全一致。

## 2. 信息架构

**导航**：四个标签 **About Me · Publications · Posts · Albums**（中文页显示为 **关于我 · 论文 · 文章 · 相册**），另有搜索、语言切换和主题切换（Auto / Light / Dark）。

| 路径（英文；中文加 `/zh` 前缀） | 内容 |
| --- | --- |
| `/` | 首页：全屏 3D MRI + 四个标签 |
| `/about/` | About Me：头像、简介、联系方式、CV 下载 |
| `/publications/` | 论文列表，按年份分组 |
| `/publications/<slug>/` | 论文详情 |
| `/posts/` | 文章索引：分类 Papers（论文）/ Books（书籍）/ Notes（随笔），以及系列 |
| `/posts/<slug>/` | 文章 |
| `/posts/graph/` | 全站关系图 |
| `/albums/` | 相册索引 |
| `/albums/<slug>/` | 单个相册（主题展） |

**不兼容旧网站**：这是推倒重建。旧网站的路由（`/writing/`、`/topics/`、`/cv/`、`/publications/<date>/<slug>/` 以及现有的重定向页）全部删除，不做重定向。

## 3. 视觉语言

### 3.1 字体

- **全站**：LXGW Bright GB（霞鹜文楷 Bright 简体规范字形版），使用 Regular、Medium、Italic 三款。
- **加载方式**：自托管，不依赖第三方 CDN。用 `cn-font-split` 把字体按字符切成带 `unicode-range` 的 woff2 小文件，浏览器只下载页面上出现的字。切分结果提交进 `public/fonts/`，附 OFL 许可证。源 TTF 不进仓库。`font-display: swap`。
  - 不整包直接放的原因：单个字重的 TTF 就有 13.6MB，首次访问要等很久，文字还会在系统字体和文楷之间跳变。
  - **分块大小约 16KB**（工具默认 70KB）。文楷字形复杂，一页里的常用字会分散在很多块里，块越小，多下载的无关字越少。
  - **只保留常用字**：丢弃只含生僻字的块，保留约 1 万字，覆盖 GB2312 全部 6763 个汉字。字体声明 CSS 因此缩到约 1/3（gzip 后 48KB），仓库里的字体文件约 6.8MB。没有保留的生僻字自动用系统字体显示，不会显示成方块。
  - **实测（2026-11-17）**：短的中文页（如栏目页）首次访问的字体下载量约 386KB，包括 37 个请求和 CSS；满足 Phase 1 定的 500KB 预算。长文（约 800 个不同汉字）只算 Regular 一款就约 1MB。字体块各页共用，浏览器会缓存，所以只有第一次访问时成本较高。
- **代码**：系统等宽字体。
- **公式**：MathJax（构建时渲染为 SVG）。

### 3.2 颜色与主题

- 保留三种主题：Auto、Light、Dark。
- 首页 3D 区域不随主题变化。它的背景色和全站强调色，等 MRI 实际渲染出来后再定（Phase 4），定好之后回填到全站的颜色 token。
- 在那之前（Phase 1–3），沿用现有的语义化 token：亮色为暖纸色，暗色为深墨色，作为过渡。

### 3.3 动效

- **展示页面**：3D、滚动叙事、图像转场。
- **阅读页面**：只有不超过 200ms 的颜色和透明度过渡。
- **页面切换**：用 CSS 的跨文档 View Transitions（`@view-transition { navigation: auto; }`），不写 JS；不支持的浏览器照常跳转。
- **`prefers-reduced-motion: reduce`**：所有 3D 和滚动动画换成静态图和静态布局。

### 3.4 可访问性底线

正文对比度达到 WCAG AA；所有交互键盘可达；焦点可见；每页设置正确的 `lang`；图片有 alt；灯箱支持键盘和屏幕阅读器。

## 4. 首页

**构成**：全屏 3D 前列腺 MRI，左上角站名（英文页 “Gradient of Thought”，中文页 “思索の勾配”），四个标签，语言和主题控件，角落一行数据来源署名。首页不放简介、CV、论文列表和搜索框，这些都在其他页面。

**3D 场景**：

- **数据**：PI-CAI 公开数据集中的一例，包括 T2W 序列、腺体分割，以及分区和病灶标注（如果数据里有）。许可预期为 CC BY-NC 4.0，具体条款和病例在 Phase 4 核对；下载前先征得你的同意。
- **呈现**：体渲染（在 3D 纹理上做光线步进）打底，腺体轮廓高亮，再标出一个病灶。
- **交互**：鼠标位置映射为旋转角度，水平和垂直各 ±20°，带阻尼缓动；鼠标移出画面后回到正中。
- **背景**：渲染出来后再定，不一定是纯黑。
- **降级**：手机（粗指针或窄屏）、开启了 `prefers-reduced-motion`、或浏览器不支持 WebGL2 时，显示同一场景离线渲染的静态图。
- **预算**：three.js 只在首页按需加载；体数据压缩后不超过 3MB；桌面宽带下 3 秒内可以交互。
- **预处理**：`scripts/mri/` 下的 Python 脚本（SimpleITK、numpy）把 `.mha` 重采样，裁剪到前列腺周围，归一化为 uint8，导出二进制体数据和元数据 JSON。离线产物进仓库，原始数据不进仓库。
- **研究方向变化时**：替换数据和着色参数即可。由你告诉我，再重新制作。

## 5. About Me

- **头像**：`public/images/profile.jpg`，先占位，之后由你替换。
- **内容**：姓名；职位和单位；研究简介（现在做前列腺癌主动监测，博士期间做人群计数和驾驶员监控）；外部链接（Email、Google Scholar、GitHub、LinkedIn）。
- **CV 下载**：按页面语言给出对应的 PDF。英文页链接 `/cv/Yiming-Ma-CV-en.pdf`，中文页链接 `/cv/Yiming-Ma-CV-zh.pdf`。PDF 由你提供，更新时直接覆盖同名文件。

## 6. Publications

**列表页**：按年份分组，没有筛选器，没有标签。等论文多了，再建立标签系统。每条包括：

- 标题；
- 作者（你的名字加粗，共同一作标 `*`，通讯作者标 `†`）；
- venue 简称和类型徽标（Conference / Journal / Workshop / Preprint）；
- 一句话总结；
- 链接（Paper / Code / Demo / Project）。

**详情页**：标题、作者、venue 全称、日期、方法图、一句话总结、摘要、链接，以及一个 Cite 块（BibTeX 纯文本，可一键复制）。

**机器可读**：每个详情页输出 `citation_*` meta 标签和 JSON-LD `ScholarlyArticle`。BibTeX 以纯文本形式直接写在 HTML 里，AI agent 和学术爬虫无需点击就能读到。

**可选字段的处理**：
- `venue.full` 没填时，页面显示简称，citation meta 里也不输出会议或期刊名，不推测全称。
- `abstract` 没填时，不显示摘要一节。
- `bibtex` 没填时：论文链接是 arXiv 的，用 YAML 里已有的信息自动生成一条 arXiv 引用（`@misc`）；不是 arXiv 的，不显示 Cite 块。

**数据格式**：每篇论文一个文件夹，方法图和 YAML 放在一起。

```text
src/content/publications/zip/
  index.yaml
  overview.png
```

```yaml
title: "ZIP: Scalable Crowd Counting via Zero-Inflated Poisson Modeling"
date: 2025-07-31
type: preprint            # conference | journal | workshop | preprint
venue: { short: arXiv, full: arXiv preprint }
authors:
  - { name: Yiming Ma }
  - { name: Victor Sanchez }
  - { name: Tanaya Guha }
  # 可选标记：equal: true（共同一作）、corresponding: true（通讯作者）
links: { paper: "https://arxiv.org/abs/2506.19955", code: "…", demo: "…" }
image: ./overview.png
tldr: { en: "…", zh: "…" }
abstract: { en: "…", zh: "…" }
bibtex: |
  @article{…}
```

**测试数据**：把现有 6 篇转成新格式，只转换格式，不改写内容。

## 7. Posts

### 7.1 来源与同步流程

- **唯一来源**：Obsidian 笔记库，路径记录在 `AGENTS.md` 里。
- **发布范围**：只发布 frontmatter 里写了 `publish: true` 的笔记。
- **同步由 AI agent 按操作手册完成，不写同步脚本。** 手册写在 `AGENTS.md` 的“同步笔记”一节，Claude 和 Codex 用同一份。步骤：
  1. 只读访问笔记库，找出 `publish: true` 的笔记。
  2. 把笔记原文和它引用的附件复制到 `src/content/posts/<slug>/`：中文原文存为 `zh.md`，附件和它放在同一个文件夹。原文语法不改写，转换由构建时的插件完成。
  3. 按下面的检查项逐条检查，把问题列给你。不自动修改笔记库。
  4. 如果笔记库里 Admonition 插件的配置（自定义类型的颜色、图标、标题）有变化，同步更新 `src/data/admonitions.json`。
  5. 把新增或改动的笔记译成英文，存为同一文件夹下的 `en.md`。
  6. 构建通过后，在本地预览给你检查。
- **检查项**：
  - 缺少 `slug` 或 `description`；
  - `slug` 重复；
  - `series_order` 重复，或与标题里的编号不一致；
  - 引用了不存在的标题或块；
  - 附件缺失。

  构建本身也会兜底：frontmatter 不符合 schema 时构建失败；无法解析的块引用会输出警告。
- **对笔记库只读**，除非你明确要求修改。
- **翻译**：英文版只存在于仓库，笔记库保持纯中文。
- **发布**：由你检查，由你决定是否提交和推送。**agent 不推送。**
- **草稿预览**：模板阶段，或者你想先看看效果时，agent 把未标记发布的笔记复制到 `src/content/posts-drafts/`。这个目录被 gitignore，只在本地开发服务器里可见，不进生产构建。DINOv3 01、02 就走这个通道。

### 7.2 frontmatter

沿用你现在的字段，只新增两个：

```yaml
title: "手撕 DINOv3（一）：研究背景与核心动机"
description: "…"
date: 2026-11-13
updated: 2026-11-13
series: "手撕 DINOv3"
series_order: 1
tags: [ai/deep-learning, ai/computer-vision]
slug: dinov3-01     # 新增：网址，只用小写字母、数字和连字符
publish: true       # 新增：发布开关
```

- **slug** 由你写在笔记里。如果缺失，agent 会提议一个，征得你同意后才写入笔记库。
- **分类**由笔记所在的文件夹决定：`论文/` 对应 Papers（论文），`书籍/` 对应 Books（书籍），`随笔/` 对应 Notes（随笔）。
- **阅读时长**自动计算。
- **不需要封面图。**

### 7.3 Obsidian 语法支持

依据 2026-11-17 对笔记库的扫描：

| 语法 | 网站上的处理 |
| --- | --- |
| `[[笔记]]`、`[[笔记\|别名]]`、`[[笔记#标题]]` | 解析为站内链接。目标不存在或未发布时，显示为灰色、不可点击的文字 |
| `[[笔记#^块ID]]` 和行尾的 `^块ID` | 链接跳到对应块的锚点；块 ID 本身不显示 |
| `![[图.png]]`、`![[图.png\|说明]]`、`![[图.png\|说明\|320]]` | 图片加图注（遵循 image-captions 插件的语义），可指定宽度 |
| `![[视频.mp4]]` | `<video controls>` |
| ` ```ad-<type> ` 代码块，支持 `title:` 和 `collapse:` | 13 种自定义类型加插件内置类型；颜色和 lucide 图标与 Obsidian 一致；`collapse` 转成 `<details>` |
| 原生 callout `> [!note]` | 套用同一套样式（目前没用到，一并支持） |
| ` ```mermaid ` | 只在含图的页面按需加载 Mermaid，在浏览器端渲染 |
| `$…$`、`$$…$$` | MathJax，构建时渲染 |
| 层级标签 `ai/computer-vision` | 标签按层级聚合 |

**你的 13 种自定义 Admonition**（英文标题用于英文版）：

| 类型 | 中文 | 英文 |
| --- | --- | --- |
| abs | 摘要 | Abstract |
| def | 定义 | Definition |
| lem | 引理 | Lemma |
| the | 定理 | Theorem |
| cor | 推论 | Corollary |
| pro | 证明 | Proof |
| axi | 公理 | Axiom |
| exa | 例子 | Example |
| rem | 注记 | Remark |
| str | 优点 | Strengths |
| wea | 缺点 | Weaknesses |
| fut | 展望 | Outlook |
| que | 疑问 | Question |

**首版不支持**（同步时在报告里列出）：Dataview 查询、Excalidraw 画板。整篇笔记嵌入 `![[笔记]]` 降级为链接卡片。

### 7.4 阅读页（沉浸式阅读）

- **布局**：
  - ≥1200px：左栏是大纲（固定在视口内），中间是正文（中文约每行 40 字，英文约每行 70 字符），右栏是局部关系图和反向链接。
  - 1024–1199px：右栏内容移到正文末尾。
  - <1024px：大纲收进顶部的抽屉，关系图和反向链接放在文末。
- **页头**：向下滚动时自动隐藏，向上滚动时出现。页顶有一条细的阅读进度条。
- **系列**：文首显示“系列 · 第 n 篇 / 共 m 篇”，文末有上一篇和下一篇。
- **悬停预览**：桌面端鼠标在站内链接上停留 300ms，弹出目标笔记的标题和开头段落（同源抓取目标页面并缓存）。触屏设备不启用。
- **元信息**：发布日期；更新日期（与发布日期不同时才显示）；阅读时长；标签。英文页不加 AI 翻译声明。

### 7.5 关系图

- **节点**：已发布的笔记为实心节点。被链接但尚未创建或未发布的笔记为灰色空心节点，这与 Obsidian 中未创建笔记的显示方式一致；灰色节点不可点击，悬停时显示名称。
- **边**：笔记之间的双链。
- **局部图**：当前笔记加上它的一跳邻居，包括灰色节点。
- **全站图**：`/posts/graph/`，2D，与 Obsidian 一致。可拖拽、缩放，点击节点跳转，按分类着色。
- **实现**：构建时生成 `graph.json`；前端用 d3-force 计算布局、Canvas 绘制，只在需要的页面加载。中英文各一张图。

### 7.6 索引页 `/posts/`

分类切换 All / Papers / Books / Notes；系列聚合显示，每个系列下列出篇目；按日期倒序。

### 7.7 搜索

- 用 Pagefind，在构建后对 `dist/` 建索引。中英文按 `lang` 分别建索引。
- 搜索范围覆盖 Posts、Publications、Albums 和 About。
- 导航栏里一个搜索按钮，打开搜索面板，快捷键 ⌘K / Ctrl+K。
- 中文分词效果在 Phase 3 实测。

## 8. Albums

### 8.1 数据结构

每个相册一个文件夹，里面是照片和一个 `album.yaml`：

```text
src/content/albums/2025-scotland/
  album.yaml
  IMG_0001.jpg
  IMG_0002.jpg
```

```yaml
title: { zh: 苏格兰高地, en: Scottish Highlands }
date: 2025-08                  # 用于排序
place: { zh: 苏格兰, en: Scotland }
cover: IMG_0001.jpg
intro: { zh: "…", en: "…" }    # 可选
photos:
  - src: IMG_0001.jpg                    # 同目录下的文件名
    caption: { zh: "…", en: "…" }
  - src: https://example.com/photo.jpg   # 或完整链接
    caption: { zh: "…", en: "…" }
    exif: { camera: Canon EOS R8, lens: "…", focal: 35mm, aperture: f/8, shutter: 1/250, iso: 100 }
    # exif 可选：链接图片读不到 EXIF 时手写；写了就覆盖自动读取的值
```

- **本地文件**：
  - 构建时读取 EXIF 并显示：相机、镜头、焦距、光圈、快门、ISO、拍摄时间。
  - 构建时生成多尺寸的 AVIF/WebP，用于网格和正文展示。
  - 灯箱里的“查看原图”提供原文件。**不限制原图分辨率。**
- **链接图片**：直接引用，不做处理。尺寸在构建时探测；探测失败时，需要在 YAML 里写明 `width` 和 `height`。
- **GPS**：不剥离，也不在页面上展示。
- **体积提醒**：构建结束时打印 `dist/` 的总大小。GitHub Pages 站点上限为 1GB，超过 800MB 时给出警告。
- **文字**：中文由你写，哪怕只写地名；英文由 AI 翻译。AI 不编造经历。

### 8.2 视觉

具体效果在 Phase 5 先出两版样稿，由你选。方向如下：

- **索引页**：全屏展示，相册封面大图随滚动逐个切换（scroll-snap），封面缓慢推近；桌面端悬停时有 WebGL 液态扭曲过渡；每个相册的强调色从封面图中提取。
- **相册页**：全屏封面开场，之后照片按节奏排版（满幅、并排、留白交替），滚动时渐显；照片下方用小字显示 EXIF；点击进入灯箱（PhotoSwipe：缩放、手势、键盘操作）。
- **主题**：页面框架（导航、文字）跟随主题；照片本身不加任何滤镜。
- **降级**：开启 `prefers-reduced-motion` 时去掉推近、扭曲和渐显；手机上不做 WebGL 扭曲。
- **测试数据**：模板阶段使用生成的占位图，并明确标注为占位。你提供照片后替换。

## 9. 技术栈

- **保留**：Astro 7（静态输出）、GitHub Actions 部署到 Pages。
- **新增依赖**：

| 依赖 | 用途 |
| --- | --- |
| three | 首页 3D |
| photoswipe | 灯箱 |
| d3-force | 关系图布局 |
| mermaid | 流程图，按需加载 |
| rehype-mathjax | 公式，替换 rehype-katex / katex |
| pagefind | 构建后建立搜索索引 |
| exifr | 读取 EXIF |
| cn-font-split | 开发依赖，用于切分字体 |

- **Obsidian 语法插件**：自己写，放在 `src/lib/obsidian/`。
- **本地离线 Python**：MRI 预处理。
- **移除**：katex、rehype-katex，以及基于 reportlab 的 CV 生成脚本。
- **不用 Quartz 的原因**：Quartz 自带 Obsidian Publish 式的双链、关系图和悬停预览，但它是另一套框架。用它的话，Posts 会变成一个独立的站点，外观和中英双语都很难与主站统一。自己写插件更可控。

### 9.1 可维护性

日常维护（同步笔记、添加论文和相册）都由 AI agent 完成，所以代码要让下一个 agent 能读懂、能放心改。

- **注释写足，用中文**：
  - 每个组件、插件和脚本开头，说明它负责什么、输入输出是什么、和哪些文件相关。
  - 非显而易见的逻辑，写明原因而不只是做法。
  - 每个可调参数（比如 3D 的旋转角度、断点、预算）都写清楚含义和取值依据。
- **内容 schema**（`src/content.config.ts`）逐字段注释，并附上 YAML 或 frontmatter 示例。
- **`AGENTS.md`** 包含规则和操作手册：
  - 规则：不推送；事实必须有出处；对笔记库只读，除非你明确要求；翻译规则；提交前构建必须通过。
  - 操作手册：同步笔记、添加论文、添加相册、更换首页 3D 数据。
- **`CLAUDE.md`** 只写一行 `@AGENTS.md`，引用同一份内容，避免两份文件不同步。

## 10. 删除清单（执行时）

- **页面和路由**：旧网站的全部页面，包括 Topics、HTML 版 CV、Writing 和现有的重定向页。不做重定向。
- **数据和脚本**：`src/data/cv.json`、`scripts/generate_cv_pdfs.py`、`src/lib/post-taxonomy.ts`，以及 `src/lib/site.ts` 里论文的 Task/Method/Goal 分类。
- **内容**：
  - 正弦位置编码和 RoPE 两篇（中英文），以及 `public/images/posts/sinusoidal-pe/`、`public/images/posts/rope/`。
  - DINOv1 系列 6 篇及 `public/images/posts/dino/`，连同工作区里配套的未提交改动。**这些从未提交，删除后无法恢复，执行前再确认一次。**

## 11. 决策记录（2026-11-17 审阅）

| 决策 | 结论 |
| --- | --- |
| 首页左上角小字号显示姓名 | 采纳，后改为显示站名 |
| 站名 | 英文 “Gradient of Thought”，中文 “思索の勾配”；浏览器标题里保留作者真名 |
| 英文文章页注明 AI 辅助翻译 | **不采纳** |
| Publications 取消 Task/Method/Goal 标签 | 采纳；论文多了以后再建标签系统 |
| 论文和相册数据统一用 YAML | 采纳 |
| 全站关系图做 2D | 采纳 |
| 新增 `AGENTS.md` / `CLAUDE.md` | 采纳（见 §9.1） |
| About Me 不放精选论文 | 采纳 |
| 保留旧路由并做重定向 | **不采纳**：推倒重建，不兼容旧网站 |
| 用 npm 脚本同步笔记 | **不采纳**：由 agent 按操作手册同步（见 §7.1） |

## 12. 首版不做

- 3D 地球和地图
- RSS、评论、访问统计、News
- 整篇笔记嵌入、Dataview、Excalidraw
- 色彩管理
- 自定义域名
- 旧网站路由的兼容和重定向
- 英文页的 AI 翻译声明
- 笔记同步脚本
