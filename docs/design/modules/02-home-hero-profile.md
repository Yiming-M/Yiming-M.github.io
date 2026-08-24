# Module 02 — 首页首屏与个人卡片

## 范围

重构首页从首屏到第一个研究章节之前的内容层级：研究者身份、研究主张、名言、主行动、肖像与外部联系。保持现有文案事实和原色头像。

## 当前问题

- 名言字号接近整屏海报，访客先看到哲学句子而不是研究者和研究方向；
- `h1` 实际是他人名言，页面主语不够明确，也不利于搜索和辅助技术理解；
- 首屏右侧 profile card 有较重阴影、较大圆角，偏作品集模板；
- 桌面首屏的左右比例和底部对齐使主文案很长、肖像很低，扫描顺序松散；
- 平板仍强制双栏，超长中英文标题可能挤压肖像；
- 手机上肖像卡采用窄图 + 长文两栏，320px 下空间紧张；
- 主按钮与次按钮视觉差距不足，两个入口同等抢注意力。

## 目标

- 首屏第一眼回答“Yiming Ma / 马一铭是谁、研究什么”；
- 把名言保留为个人语气，而不是替代网站主命题；
- 让主行动明确指向 Publications，Writing 为次级入口；
- 肖像自然、彩色、克制，不出现装饰编号或不必要滤镜；
- 1280×800 内看到完整核心信息与头像主体。

## 内容层级

建议 DOM 与视觉顺序：

1. eyebrow：`Computer vision · Multimodal learning`；
2. `h1`：`Yiming Ma` / `马一铭`；
3. 研究主张（衬线）：英文建议 `Making visual systems count, combine, and reason.`；中文建议 `让视觉系统能够计数、融合与推理。`；
4. 现有研究介绍正文（允许编辑排版，不在此模块改写事实）；
5. 主/次行动；
6. 名言作为短 pull quote 和来源；
7. 肖像、身份摘要、Scholar / GitHub。

`h1` 必须是姓名。研究主张是相邻 `p` 或 `h2`，不能出现第二个 `h1`。

## 设计方案

### 桌面（≥1024px）

- 首屏采用 12 列网格：左 7 列、右 4 列，间隔 1 列；顶部/底部各 64–80px；
- 姓名使用 sans 或轻字重 serif，约 `clamp(3rem, 5vw, 5.5rem)`；研究主张为视觉最大文字，使用 serif `clamp(3.4rem, 5.6vw, 6.3rem)`，最多三行；
- 文案列最大 720px，intro 最大 64ch；
- 主按钮矩形圆角 8px、实心 ink 或 accent；次操作为文字链接，不再使用第二个大胶囊；
- 名言放在 intro 下方或行动下方，用 1px 左线、`--text-sm`，最大 52ch；不使用蓝色大字；
- 肖像卡与左侧研究主张顶部关键线对齐；图像 4:5，卡片无大阴影；
- 个人卡底部只保留姓名/位置一句和两个主要学术链接；完整社交链接留在 About/footer。

### 平板（768–1023px）

- 8 列网格：文字 5 列、肖像 3 列；当有效宽度低于约 840px 时改为上下布局；
- 姓名与研究主张字号降低，主张最多四行；
- 肖像宽度 240–300px，可与 intro 下半部对齐，不压缩正文小于 45ch；
- 两个操作在一行，空间不足时自然换行。

### 手机（320–767px）

- 单栏顺序：eyebrow → 姓名 → 主张 → intro → actions → portrait summary → quote；
- 姓名 2.5–3.5rem，主张 `clamp(2.6rem, 13vw, 4.2rem)`、行高约 0.98；
- 主按钮宽度 100%、至少 48px；Writing 文字链接置于按钮下或右侧，不制造两个满宽按钮；
- profile 使用横向 compact media object 仅在 ≥480px；更窄时图像 4:3/4:5 上、文字下；
- 头像不得裁掉脸部，使用 `object-position` 校准；保持原色，不做黑白/低饱和处理；
- 首屏无需强制 `100vh`，避免移动浏览器地址栏导致空白。

## 交互与可访问性

- 肖像 alt 为“Portrait of Yiming Ma / 马一铭的肖像”，不描述画风；
- 主按钮文本保持“Explore my research / 浏览我的研究”；次入口保持“Read my posts / 阅读我的随笔”；
- 所有行动常显，不依赖 card hover；
- 图片指定 `width` / `height` 或 `aspect-ratio` 防止布局跳动；首屏图可 eager，其余图 lazy；
- 外链 Scholar / GitHub 的 `↗` 只是视觉补充，链接文字本身已说明目的；
- 名言来源链接有可理解的 accessible name；
- 动效只允许头像 1–2% 缩放或边框变化；`prefers-reduced-motion` 下禁用。

## 精确实现指引

1. 在 `HomePage.astro` 将现有 quote 从 `h1` 移出，并将姓名设为唯一 `h1`。
2. 新增明确类名：`.hero-name`、`.hero-thesis`、`.hero-quote`，避免用元素选择器绑定视觉。
3. `.hero` 改为 top-aligned 12-column grid；删除 `align-items: end` 和过大的 8vw gap。
4. `.hero-actions` 中保留一个 `.button-primary`；Writing 使用 `.text-link` 或 `.button-secondary` 的低权重样式。
5. `.profile-card` 采用 12px 圆角、1px 边线、无默认大阴影；hover 不改变头像饱和度。
6. 使用 `srcset` 仅在已有不同尺寸资产时实现；不要为此生成假图。当前只需设置 `loading`、`decoding` 和稳定比例。
7. 中文用 `[lang^="zh"]` 或局部类放松负字距，检查标点换行。

## 涉及文件

- `src/components/HomePage.astro`
- `src/styles/global.css`
- `public/images/profile.jpg`（只读使用，不替换、不去色）

## 验收清单

- [x] 页面唯一 `h1` 是 Yiming Ma / 马一铭，不是名言。
- [x] 1280×800 首屏可见研究定位、主行动和肖像主要部分。（静态布局通过；实际 viewport 复核纳入 Module 06。）
- [x] 访问者无需读名言即可判断研究方向。
- [x] 原色头像无黑白、低饱和或装饰编号。
- [x] Publications 是唯一高权重主操作，Writing 仍清楚可达。
- [x] 768px 不出现被挤成窄列的 intro；320px 不出现横向滚动。（源码断点通过；实际 viewport 复核纳入 Module 06。）
- [x] 手机端无强制满屏空白，按钮与链接触控目标足够大。
- [x] 中英文长短差异不会破坏网格或造成孤行。（结构/换行约束通过；视觉排版纳入 Module 06。）
- [x] 键盘焦点和 reduced-motion 行为正确。

## 两轮执行记录

- Round 1 程序员实现：`DONE — 2026-08-21`
  - 结构：`HomePage.astro` 的唯一 `h1` 改为英文 `Yiming Ma` / 中文 `马一铭`；新增 `.hero-thesis` 承载“计数、融合与推理”的研究主张，原有研究介绍事实保持不变。
  - 层级：Publications 保留为唯一实心主按钮；Writing 改为常显的低权重文字链接。Wittgenstein 名言移出主标题，成为头像之后的 `.hero-quote`，来源链接保留中英 accessible name。
  - 肖像：继续只读使用原始 `public/images/profile.jpg`，显式设置 400×400 intrinsic size、eager / async / high-priority 加载；4:5 框内保持原色、无 filter、无装饰编号、无卡片大阴影。
  - Desktop：hero 使用 12 列网格，文案占 7 列、空 1 列、profile 占 4 列；上下 64px，头像以克制边线/surface 呈现。按 1280px / 1200px 内容宽静态核算，文案约 690px、头像约 384px，主行动在 800px 高度内，头像主体可见。
  - Tablet：768–1023px 使用 8 列 5+3；768–839px 改上下布局并把肖像限制为 300px，避免 intro 被压到小于约 45ch。
  - Mobile：≤767px 按 DOM 顺序单栏展示文案 → profile → quote，主按钮 100% 且 48px 高；≥480px profile 为 compact media object，<480px 改为图上文下。Hero 未使用 `vh` 或强制最小高度。
  - 可访问性：头像 alt 保持“Portrait of Yiming Ma / 马一铭的肖像”；主、次入口与引文来源触控目标均至少 44px；中文姓名/主张使用更松的字距和行高。
  - 构建证据：`npm run build` 通过，生成 32 个静态页面；`dist/index.html` 与 `dist/zh/index.html` 分别只输出姓名 `h1`，并保留两个入口、原头像与 pull quote。
  - 质量证据：`git diff --check` 通过；源码检查未发现 profile filter 或 box-shadow。委派程序员线程未做浏览器截图/视觉判断，留给 Round 1 设计评审。
- 设计师反馈：`DONE — 2026-08-21 · NEEDS REVISION`（见 `docs/design/feedback/02-round-1.md`）
- Round 2 程序员修订：`DONE — 2026-08-21`
  - Grid：≥840px 明确设置 copy 为 row 1、quote 为左列 row 2、profile 从 row 1 跨两行；quote 起点现在由左侧 copy/actions 决定。`@media (max-width: 839px)` 将三者的 row 重置为 auto，保留 DOM 的 copy → profile → quote 顺序。
  - Motion：hero 主按钮的 transition 只保留 background / border / color；hover 用 accent 颜色反馈并显式 `transform: none`。`prefers-reduced-motion` 下 default/hover 均强制无 transform，Module 01 focus ring 不变。
  - Type：hero eyebrow 与 profile 内 Scholar / GitHub 均使用 `var(--text-xs)`（0.75rem）；profile links 的 44px 触控高度不变。
  - 资产证据：`git hash-object public/images/profile.jpg` 与 `git rev-parse HEAD:images/profile.jpg` 均为 `6cde3d51e2284cb966ec7f8a4631c9461c72b217`。
  - 构建证据：`npm run build` 通过，仍生成 32 个静态页面；英文/中文首页仍只输出姓名 `h1`，内容与链接未改。
  - 质量证据：`git diff --check` 通过；未修改 HomePage 内容结构、研究展示或 Module 03+ 样式。
- 模块验收：`PASS — 2026-08-21`（源码级设计验收；最终浏览器矩阵见 Module 06）
