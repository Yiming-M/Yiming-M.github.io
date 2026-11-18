# AGENTS.md

本文件写给在这个仓库里工作的 AI agent（Claude、Codex 等）。`CLAUDE.md` 通过 `@AGENTS.md` 引用本文件，两者始终是同一份内容。

## 项目

- 马一铭（Yiming Ma）的个人网站：Astro 静态站，由 GitHub Actions 部署到 GitHub Pages。**推送到 `main` 即上线。**
- 网站正在按 `docs/design/` 推倒重建。设计文档是实现的唯一依据：
  - [`docs/design/00-overall-design.md`](docs/design/00-overall-design.md)：总体设计
  - [`docs/design/01-implementation-plan.md`](docs/design/01-implementation-plan.md)：分阶段计划与验收标准
- 当前进度：**Phase 4（首页 3D MRI）已完成，待作者预览确认；下一步是 Phase 5（Albums）。** 每完成一个阶段，更新这一行。

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

把 Obsidian 笔记发布成网站文章。单向同步：笔记库 → 仓库。数据格式见 `src/content.config.ts` 的 `posts` 注释，设计依据见设计文档 §7。

**发布范围**：只同步 frontmatter 里写了 `publish: true` 的笔记。作者说“把某篇作为草稿预览”时，按同样的步骤放进草稿目录，不要求 `publish: true`。

1. **只读打开笔记库**（路径见规则 6），找出要发布的笔记。记下它相对笔记库的路径，例如 `随笔/手撕 DINOv3/手撕 DINOv3 ：01 – 摘要与引言.md`。第一级文件夹必须是 `论文/`、`书籍/` 或 `随笔/`，它决定分类。
2. **确定 slug**：读笔记 frontmatter 里的 `slug`。没有时，提议一个（小写字母、数字、连字符，如 `dinov3-01`；不能叫 `graph`），**征得作者同意后**写进笔记库里那篇笔记的 frontmatter。这是唯一需要写笔记库的情况。
3. **复制原文**到 `src/content/posts/<slug>/zh.md`（草稿用 `src/content/posts-drafts/<slug>/zh.md`）：
   - 正文和 frontmatter 原样保留，不改写任何 Obsidian 语法；
   - 只在 frontmatter 末尾追加 `source: "<第 1 步记下的相对路径>"`；草稿目录里如果笔记没有 slug，也可以只在副本里补 `slug`；
   - 删除 `%%…%%` 形式的 Obsidian 注释（作者的私人批注，Obsidian 阅读模式下本来就不显示）。
4. **复制附件**：笔记里每个 `![[文件]]` 嵌入的文件，在笔记库的 `assets/<笔记名>/` 下找到（作者的附件插件按这个规则存放）：
   - 图片（png、jpg、jpeg、gif、webp、avif、svg）→ 和 `zh.md` 放在同一文件夹，文件名不变；
   - 视频等其他附件 → `public/media/posts/<slug>/`（草稿用 `public/drafts/<slug>/`），文件名不变。
5. **检查并报告**（只报告，不修改笔记库）：
   - 缺少 `title`、`description`、`date` 或 `slug`；`slug` 与已有文章重复；
   - 同一系列里 `series_order` 重复，或标题里的序号与 `series_order` 不一致；
   - 指向不存在的标题或块的链接（如 `[[笔记#^块ID]]` 但目标笔记里没有 `^块ID`）；附件找不到；
   - 用了网站不支持的写法：Dataview 查询、Excalidraw 画板、整篇嵌入 `![[笔记]]`（网站上会退化为链接）；
   - 双链写法可疑，例如目标名里混用了全角括号。
6. **Admonition 配置**：比较笔记库 `.obsidian/plugins/obsidian-admonition/data.json` 里的自定义类型和 `src/data/admonitions.json`。新增或改了类型（标题、图标、颜色）时同步过来，并补上英文标题；图标名去掉 `lucide-` 前缀，必须在 `node_modules/lucide-static/icons/` 里存在。
7. **翻译**：新增或改动的笔记，按上方“翻译规则”译成英文，存为同一文件夹下的 `en.md`。frontmatter 保持相同的字段和顺序：翻译 `title`、`description`、`series`，其余（`date`、`updated`、`series_order`、`tags`、`slug`、`publish`、`source`）照抄。同一系列的英文系列名要统一。
8. **验证**：
   - 正式文章：`npm run build`；草稿：`INCLUDE_DRAFTS=1 npm run build`（或直接 `npm run dev`，开发服务器始终显示草稿，但没有搜索）。构建会校验 frontmatter，并检查文件夹名与 slug 一致、正式文章写了 `publish: true`。
   - 在本地预览里检查中英文两个版本：Admonition、图片和图注、视频、公式、Mermaid、双链（未发布的笔记应显示为灰色文字）、目录和关系图。
   - 把第 5 步的报告和译文里拿不准的地方一起交给作者，等作者确认后再提交。

**更新已发布的文章**：作者只在 Obsidian 里修改。重新执行第 3、4、7、8 步覆盖仓库里的副本；英文版只重译改动的部分。

**撤下文章**：作者把 `publish` 改成 `false` 或删除该字段后，删除 `src/content/posts/<slug>/` 和 `public/media/posts/<slug>/`（这是删除已提交的文件，git 历史里仍可找回，但仍需先征得作者同意）。

### 添加论文

数据格式见 `src/content.config.ts` 的 `publications` 注释，设计依据见设计文档 §6。

1. **确定 slug**：用论文简称的小写加连字符，如 `clip-ebc`。它会出现在网址里，发布后不要再改。
2. **建文件夹** `src/content/publications/<slug>/`，在里面新建 `index.yaml`。可以复制一篇现有论文的 YAML 作模板。
3. **填写字段**，每一项都要以论文原文（arXiv 或正式出版版本）为准：
   - `title`、`authors`：按论文署名的顺序。共同一作加 `equal: true`，通讯作者加 `corresponding: true`。
   - `date`：论文首次公开的日期（通常是 arXiv 第一版）。
   - `type`、`venue.short`：例如 `conference` 和 `"ICME 2025"`。`venue.full` 只在能核对会议或期刊官方全称时才填。
   - `links`：`paper` 必填，`code`、`demo`、`project` 有就填。
   - `tldr`：一句话总结，中英文各一句，内容必须能在论文摘要或正文里找到依据。
   - `abstract`：英文从论文原文原样复制；中文按 AGENTS.md 的翻译规则翻译。
   - `bibtex`：优先粘贴官方 BibTeX（会议论文集、出版社页面或 Google Scholar 导出）。不填时，如果论文链接是 arXiv，网站会自动生成一条 arXiv 引用。
4. **方法图（可选）**：放进同一文件夹，命名为 `overview.png`，并在 YAML 里写 `image: ./overview.png`。只用论文里的原图，不自己画。
5. **验证**：`npm run build` 通过后，在本地预览里检查 `/publications/` 和 `/publications/<slug>/` 的中英文两个版本，然后交给作者确认。

### 添加相册

Phase 5 补全。

### 首页的项目页

首页是一组全屏的项目页，右侧小方块切换，也可以用滚轮、↑ ↓ 键或在手机上滑动切换（`src/components/home/HomeShowcase.astro`）。第一页始终是当前的研究方向。

- **现有各页**：
  - `MriSlide.astro` + `mri-scene.js`：前列腺癌主动监测，数据在 `public/home/mri/`，换数据见下一节；
  - `CrowdSlide.astro` + `crowd-scene.js`：人群计数，数据在 `public/home/crowd/`；
  - `DmsSlide.astro` + `dms-scene.js`：驾驶员监控，数据在 `public/home/dms/`。
- **人群计数页换图片**（画面是“密度地形”：由人头标注生成的密度图从平放的照片上升起，成为发光的地形）：
  1. 选图：演唱会、体育馆这类场景；人数适中（几百到一两千），透视明显，前排稀疏、后排密集，地形才有起伏。整片均匀密集的远景不合适：人太小，地形会变成一块平台。不要选军训、集会、宗教、政治类场景。
  2. 图片在作者服务器 `Server-5900X-Auto` 的 `~/Code/ZIP-dev/data/nwpu/val/images/`，标注在 `~/Code/ZIP/data/nwpu/val/labels/`（`.npy`，int16 的 (x, y) 像素坐标）。
  3. 把图片和标注拷到本机仓库外的目录，运行 `python3 -I scripts/crowd/build_crowd.py <标注.npy> <照片.jpg>`。
  4. 更新 `CrowdSlide.astro` 开头的说明和图片 alt；照片不是 3:2 时，改 `.still` 的宽度公式。
  5. 地形太尖或太平时，调 `build_crowd.py` 的 `SIGMA_MIN_PX`（越大越圆润）和 `crowd-scene.js` 的 `TERRAIN_HEIGHT`。
- **驾驶员监控页换图片**（画面是“夜间座舱”：深度图抬成点云，平时显示很暗的夜间彩色，鼠标处的镜头里显示红外和按深度着色的等深线）：
  1. 准备九张图：前方、侧方、上方三个机位，每个机位彩色、红外、深度各一张，命名为 `<机位>_<模态>.<扩展名>`（机位 `front` / `side` / `top`，模态 `rgb` / `ir` / `depth`），比例 4:3。深度图是灰度，越亮越近。
     - 同一机位的三张必须逐像素对齐（构图完全一样）。现在的图是作者用 ChatGPT 生成的：真实的 DAD 数据集许可禁止发布。生成新图时，以同一机位的红外图为参考图，要求人物、姿态、座椅、方向盘的位置和大小不变。
     - 生成后先检查对齐：把深度图和彩色图的边缘叠在红外图上，偏差应在几个像素以内。
  2. 把九张图放到仓库外的一个文件夹，运行 `python3 -I scripts/dms/build_dms.py <文件夹>`。
  3. 重新量每个机位脸的位置（占图宽、图高的比例），改 `build_dms.py` 的 `FACE` 后再运行一次。镜头默认停在脸上，点云也绕脸所在的深度转动。
  4. 调整时注意两处一起改：镜头的大小、分区、配色、等深线在 `build_dms.py`（静态图）和 `dms-scene.js`（3D）各有一份。彩色图统一调暗到 `NIGHT_MEAN`。
  5. 转动时轮廓上有拉丝一样的飞点：调小 `build_dms.py` 的 `EDGE_GRADIENT`；露出被遮挡的空洞：调小 `dms-scene.js` 的 `MOUSE_YAW_DEGREES`、`MOUSE_PITCH_DEGREES`。
  6. 更新 `DmsSlide.astro` 里静态图的 alt。
- **新增一页**：
  1. 写 `XxxSlide.astro`，根元素是 `<article class="slide" data-slide="xxx">`，包含 `.slide-title`、`.still`（静态图）、`canvas.scene`、`.credit`；
  2. 写 `xxx-scene.js`，导出 `startXxxScene(canvas, options)`，返回 `{ setActive, destroy }`，可以照着 `crowd-scene.js` 写；
  3. 在 `HomeShowcase.astro` 的 `slides` 列表和脚本里的 `loaders` 各加一项。

### 更换首页 3D 数据

首页展示的是一例前列腺 MRI 的三维解剖模型加切面：外周带、移行带、病灶三个平滑曲面，以及一张可以上下扫动的原始分辨率横断面（设计文档 §4）。研究方向变化、想换病例或换成别的影像时，按以下步骤操作。

**数据流程**：原始数据（放仓库外）→ `scripts/mri/build_scene.py` → `public/home/mri/`（进仓库）→ 浏览器端 `src/components/home/mri-scene.js` 渲染。

1. **先征得作者同意再下载数据**（规则 7），并说明来源、许可、文件和大小。公开展示必须用允许再分发和衍生展示的数据，并按许可要求署名。
2. **取得原始数据**，放在仓库外的新目录：
   - PI-CAI 换病例：`python3 -I scripts/mri/fetch_picai_case.py <目录> [--case 病例号]`。脚本只按字节范围读取约 20 MB，不下载 5 GB 的整包。
   - 其他数据集：需要一份 3D 影像，以及与它体素一一对应的分割标注。
3. **生成网页数据**：`python3 -I scripts/mri/build_scene.py <目录> <病例号>`，输出 `slices.bin.gz`（切片）、`labels.bin.gz`（切片上的标签和轮廓）、`meshes.bin.gz`（三个曲面）、`meta.json`、`static.png`（手机等情况下显示的静态横断面）。
   - 换数据集时，修改脚本里的读取函数和三个结构的掩码。输出格式保持不变，格式说明写在脚本开头和 `meta.json` 里。
   - 改颜色时，三处要一起改：`tokens.css` 的 `--mri-pz` / `--mri-tz` / `--mri-lesion`（3D 场景从这里读取）、`build_scene.py` 的 `COLORS`（静态图）、`--showcase-bg` 和脚本里的 `BACKGROUND`（背景）。改完要重新生成静态图。
   - 切片的着色规则在两处：`build_scene.py` 的 `render_static()` 和 `mri-scene.js` 的切片着色器，改动时两边一起改。
   - 曲面太粗糙或文件太大时，调 `MESH_VOXEL_MM`（越小越细）、`SMOOTH_SIGMA` 和 `TAUBIN_ITERATIONS`（越大越光滑）。
4. **更新文字**：`src/components/home/MriShowcase.astro` 里的标注文字（每个结构的名称和一句说明）、图片 alt 和署名；`meta.json` 由脚本生成，其中 `source` 字段要写对来源和许可（在 `build_scene.py` 里改）。
5. **验证**：`npm run build` 后在本地预览中检查：
   - 宽屏、有鼠标时显示 3D：开场时模型转正、切面扫到病灶层面；鼠标左右移动旋转 ±35°，上下移动扫过切面；左侧的引线连到模型上正确的位置；
   - 中等宽度（宽高比 ≤ 1.35）时没有引线，标注变成左下角的图例；
   - 窄屏（宽度 < 768px）时显示静态横断面；
   - `public/home/mri/` 的总大小不超过 3 MB（设计文档 §4 的预算）。

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
| `src/pages/[...locale]/about/` | About Me 页面。文案、头像路径和 CV 文件名都写在这个文件开头 |
| `src/pages/[...locale]/publications/` | 论文列表 `index.astro` 和详情页 `[slug].astro` |
| `src/components/` | 页头 `SiteHeader`、页脚 `SiteFooter`、主题与语言切换、搜索按钮和搜索对话框（Pagefind）、图标、栏目占位页；论文用的作者列表、链接和 Cite 块；关系图 `GraphView` |
| `src/lib/publications.ts` | 论文排序、分组、BibTeX 生成规则、citation meta 和 JSON-LD |
| `src/components/home/` | 首页展示区：`HomeShowcase.astro`（多页切换、共用版式）、各项目页 `MriSlide.astro` / `CrowdSlide.astro` / `DmsSlide.astro`，以及对应的 3D 场景 `mri-scene.js` / `crowd-scene.js` / `dms-scene.js` |
| `scripts/mri/` | 首页 MRI 数据：下载 PI-CAI 单个病例 `fetch_picai_case.py`、生成网页数据 `build_scene.py` |
| `public/home/mri/`、`public/home/crowd/`、`public/home/dms/` | 首页各项目页的数据；由 `scripts/mri/`、`scripts/crowd/`、`scripts/dms/` 里的脚本生成，不要手改 |
| `scripts/crowd/` | 首页人群计数页的数据：`build_crowd.py`（生成密度地形的高度图、照片贴图和静态图） |
| `scripts/dms/` | 首页驾驶员监控页的数据：`build_dms.py`（把九张车内图像处理成点云用的深度、红外、夜间彩色贴图和静态图） |
| `src/pages/[...locale]/posts/` | 文章索引 `index.astro`、文章页 `[slug].astro`、全站关系图 `graph.astro` |
| `src/lib/posts.ts` | 文章读取与校验、分类、系列、阅读时长、反向链接、关系图数据 |
| `src/lib/obsidian/` | Obsidian 写法的构建插件 `remark-obsidian.mjs`、笔记索引与双链解析 `notes.mjs`、标题锚点规则 `slug.mjs` |
| `src/lib/drafts.mjs` | 草稿开关：什么时候把草稿目录算进构建 |
| `src/data/admonitions.json` | Admonition / callout 类型的标题、图标、颜色（与作者的 Obsidian 配置同步） |
| `src/styles/prose.css` | 文章正文排版：代码、表格、图片、公式、Admonition、双链、Mermaid |
| `src/content/posts/<slug>/` | 正式文章：`zh.md`、`en.md` 和图片附件 |
| `src/content/posts-drafts/<slug>/`、`public/drafts/` | 草稿（gitignore，只在本机） |
| `public/media/posts/<slug>/` | 文章里嵌入的视频等非图片附件 |
| `src/styles/tokens.css` | 颜色、字体、字号、间距等设计变量；深色主题的变量要写两处，见文件开头的说明 |
| `src/styles/base.css` | 全站基础样式、焦点、页面切换动画、减少动态效果 |
| `src/lib/routes.ts` | 四个栏目的名称和路径（导航和 sitemap 都读这里） |
| `src/lib/site.ts` | 站点信息与语言工具函数 |
| `src/content.config.ts` | 内容集合定义（数据格式和字段说明） |
| `src/content/publications/<slug>/` | 每篇论文一个文件夹：`index.yaml` 和可选的 `overview.png`。目前的 6 篇是从旧网站转换的模板测试数据 |
| `scripts/fonts/split-lxgw-bright.mjs` | 把霞鹜文楷 Bright GB 切分成网页字体，见上方“重新生成网页字体” |
| `public/fonts/lxgw-bright-gb/` | 切分后的网页字体、`fonts.css` 和许可证；由脚本生成，不要手改 |
| `public/cv/` | 作者提供的中英文 CV PDF；覆盖同名文件即可更新 |
| `public/images/profile.jpg` | 头像，目前是占位图 |
