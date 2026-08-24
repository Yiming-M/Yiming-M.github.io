# Module 03 — 研究展示、出版物索引与标签

## 范围

覆盖首页 Selected research、代表论文卡、Publication archive、论文行、筛选器和 Task / Method / Goal 标签。此模块不改论文事实文本，也不重做详情页正文。

## 当前问题

- 首页一篇超大 feature + 两张小卡的权重差异过强，其他三篇论文完全依赖 archive 才能发现；
- feature 图使用 `object-fit: cover`，方法图可能被裁切；年份大字叠在图上，像装饰海报而非研究资产；
- 多种圆角卡片、阴影、背景色和标签色同时出现，信息密度偏低；
- 首页标签筛选只作用于 3 篇 selected work，却看起来像全站筛选；
- archive 将所有标签放在一条无分组的按钮流里，Task / Method / Goal 的关系难扫描；
- 标签目前虽有文字前缀，但颜色/填充模式不够系统；
- publication row 的日期/venue 先于题目，研究问题与结论未形成稳定层级；
- 筛选结果数量不可见，屏幕阅读器不能获知结果变化。

## 目标

- 首页展示“精选路径”，archive 展示“完整研究档案”，职责清楚；
- 论文标题、研究问题和一句话结论比装饰性元数据更醒目；
- 标签真正解释任务、方法、目标，而不是关键词云；
- 筛选在桌面、平板、手机均可理解、可复现、可键盘操作；
- 论文方法图完整可读，不能为填满卡片而裁切。

## 设计方案

### 3.1 首页 Selected research

#### 桌面（≥1024px）

- 章节头使用 12 列：标题 7 列，简短说明 + “View all publications” 5 列；首页取消标签筛选，避免对精选子集制造完整档案的错觉；
- 内容采用一张 featured research story + 两行 compact work：
  - Featured：图 5 列、内容 7 列，图用 `contain` 置于 `--surface-subtle`；
  - Compact works：每项单行 12 列，年份/venue 2 列，题目/问题 7 列，标签/入口 3 列；
- featured 只保留一段问题、一句核心想法和“完整讲解”；Paper/Code/Demo 次级链接常显；
- 删除图上大年份；年份进入结构化元数据行；
- 卡片边界以水平分隔线为主，少用独立浮卡。

#### 平板（768–1023px）

- Featured 图和内容 4+4；若方法图比例过宽则图上、内容下；
- Compact works 采用 2+6 两区，标签移到题目下；
- 外链可换行但不折叠进 hover 菜单。

#### 手机（320–767px）

- Featured 为图 → venue/date → 题目 → 问题 → 标签 → 行动；
- Compact works 每项为单栏，元数据在顶部，箭头置于标题行末或底部；
- 首页不显示超过 4 个标签/论文；如数据更多，优先 Task、Method、Goal 各一个，其余通过详情查看；
- 方法图 `width: 100%; height: auto; object-fit: contain`。

### 3.2 Publications archive

#### 桌面（≥1024px）

- page hero 收紧，`h1` 后直接进入 taxonomy toolbar；
- 筛选按三组显示：Task / Method / Goal。每组有可见标题与对应 chip；“All”独立位于最前；
- publication row 12 列：年份/venue 2 列，标题/问题/一句话结论 7 列，标签/详情 3 列；
- 默认显示 6 篇并在 toolbar 显示 `6 publications` / `6 篇论文`；筛选后实时更新数量；
- 整行 hover 可有 subtle surface，但只有题目和明确详情链接可点击，避免巨大不可见点击区域。

#### 平板（768–1023px）

- toolbar 上下两层，筛选组使用可换行 flex；
- row 为 2+6 列；右侧标签进入正文列，详情箭头固定右上；
- 不出现横向滚动 chip 区，优先换行。

#### 手机（320–767px）

- taxonomy 使用三个原生 `<details>` 分组，All 和结果数量始终可见；
- 一次只允许一个 active filter（保持当前数据与脚本模型）；选择后分组 summary 显示当前标签；
- publication row 顺序：date/venue → title → question → one-line conclusion → tags → “Read explanation”；
- 用文字行动替代孤立 `↗`，确保目的明确。

### 3.3 标签视觉语法

三类标签共享尺寸、字体和圆角，但用前缀与边界模式区分：

- Task：`Task · Crowd counting`，`accent-soft` 填充，无额外彩色圆点；
- Method：`Method · Probabilistic models`，透明底 + accent 边线；
- Goal：`Goal · Robustness`，`surface-subtle` 填充 + neutral 边线；
- 中文完整显示“任务 · / 方法 · / 目标 ·”；不得在手机为了省空间删除类别前缀；
- 每个标签是链接时 hover 添加下划线或边框变化；非链接 span 不呈现 pointer cursor；
- 标签单行长度过长时允许自然换行，不截断文本。

## 交互与可访问性

- 筛选按钮使用 `aria-pressed`，结果区域有 `aria-live="polite"` 的数量文本；
- URL `?tag=` 保留，刷新/分享后恢复状态；无效 tag 回到 All 并不抛错；
- 筛选后焦点不自动跳走；屏幕阅读器从 live region 获得结果数；
- `hidden` 元素不应残留可聚焦链接；原生 `hidden` 可满足；
- 标签含类别前缀，因此颜色只是辅助；
- 论文图片 alt 说明“方法概览”而不是复述论文标题；
- 所有 Paper/Code/Demo 链接均可从键盘到达且有明确文本。

## 精确实现指引

1. `HomePage.astro` 删除 Selected research 内 `.topic-filters`；增加 archive CTA；仍可用 `selected` 字段选 3 篇。
2. feature 图删除 `.paper-year` 叠层，CSS 从 `cover` 改为 `contain`；背景使用 `--surface-subtle`。
3. 首页 secondary card 改为共享的 compact row 结构；若复用 `PublicationCard` 会引入过多条件，则保持独立但共享 token 类。
4. `PublicationCard.astro` 增加 `data-title` 可选不需要；必须显示 `oneLine`，从而形成 question + conclusion 两层，不能新造内容。
5. `PublicationsPage.astro` 将 `usedTags` 按 group 分组渲染；加入结果计数和 `aria-live`。
6. 移动 taxonomy 的 `<details>` 与桌面组使用同一组按钮数据；不要复制 tag 列表。
7. 更新筛选脚本：同步 active button、URL 与数量；同一 tag 若桌面/移动渲染两份按钮，两份 `aria-pressed` 必须同步。
8. `TopicTags.astro` 给标签可见前缀保持当前数据标签，不以 CSS pseudo-element 生成关键信息。

## 涉及文件

- `src/components/HomePage.astro`
- `src/components/PublicationsPage.astro`
- `src/components/PublicationCard.astro`
- `src/components/TopicTags.astro`
- `src/styles/global.css`
- `src/lib/site.ts`（只在标签展示文案确需调整时）

## 验收清单

- [x] 首页明确为 3 篇精选研究，存在清楚的完整 archive 入口。
- [x] 首页不再对 3 篇 selected work 提供误导性的全站筛选。
- [x] 论文方法图不被 `cover` 裁切，年份不覆盖图片。
- [x] Archive 默认显示 6 篇并显示结果数量；筛选后数量正确。
- [x] 筛选按 Task / Method / Goal 可见分组。
- [x] 320px 下筛选可操作、无需横向滚动；详情行动有明确文字。（源码断点通过；真实 viewport 复核纳入 Module 06。）
- [x] URL tag 可恢复；无效 tag 安全回到 All。
- [x] 筛选结果变化通过 `aria-live` 可获知。
- [x] 标签类别不只依赖颜色，中英文均保留类别前缀。
- [x] 论文标题、问题、结论、元数据的层级在三种宽度稳定。（静态网格通过；视觉排版复核纳入 Module 06。）

## 两轮执行记录

- Round 1 程序员实现：`DONE — 2026-08-21`
  - 首页职责：`HomePage.astro` 删除精选研究内的筛选器和客户端筛选脚本，明确显示 3 篇 selected work 与 6 篇完整档案，并保留中英 archive 入口。
  - 首页层级：ZIP 作为 featured story，结构为方法概览图、日期/venue、标题、研究问题、核心想法、完整讲解与 Paper/Code/Demo；图上年份已删除，方法图使用 `object-fit: contain`。其余两篇改为 2/7/3 的 compact rows，每项保留问题、最多四个标签和文字详情入口。
  - Archive：taxonomy 由同一 `filterGroups` 数据按 Task / Method / Goal 分组；All 与 `aria-live="polite"` 结果数量常显，默认输出 6 篇。桌面/平板使用可换行分组，手机使用三组原生 `details`，不存在横向 chip 滚动区。
  - 筛选行为：桌面和手机的重复按钮按相同 tag 同步 `aria-pressed`；`?tag=` 首次加载恢复有效标签，无效标签安全归一为 All；筛选同步 URL、结果数量、空状态和手机 summary，选择后焦点不被脚本移动。
  - Archive rows：每项显示日期/venue、标题、研究问题、`oneLine` 一句话结论、完整类别前缀标签与明确的 Read explanation / 阅读完整讲解；筛选只隐藏整项 article，隐藏内容不会保留可聚焦链接。
  - 标签语法：`TopicTags.astro` 继续直接使用 `site.ts` 的完整中英标签文案，Task / Method / Goal 分别使用 accent-soft 填充、accent 边线和 neutral surface/边线；未修改 taxonomy key、论文内容 JSON 或事实。
  - 响应式静态检查：CSS 在 ≥1024px 使用 12 列、768–1023px 使用 8 列 4+4 featured 和 2+6 rows、≤767px 使用单列与原生 details；320px 的 filter buttons 为 100% 宽且至少 44px 高。委派程序员线程未做浏览器截图或视觉判断，留给 Round 1 设计评审。
  - 构建证据：`npm run build` 通过，生成 32 个静态页面；英文/中文 archive 各输出 6 个 publication article、3 个移动 taxonomy details、完整标签前缀、问题与一句话结论；首页各输出 1 个 featured + 2 个 compact work，并保留 Paper/Code/Demo。
  - 质量证据：`git diff --check` 通过；本模块五个未跟踪源文件另以 `git diff --no-index --check /dev/null <file>` 检查，均 whitespace-clean。`src/lib/site.ts` 和 content JSON 未修改。
- 设计师反馈：`DONE — 2026-08-21 · NEEDS REVISION`（见 `docs/design/feedback/03-round-1.md`）
- Round 2 程序员修订：`DONE — 2026-08-21`
  - 链接标签：新增精确规则 `.tag-row a.taxonomy-tag { min-height: 44px; }`，`TopicTags linked` 分支的筛选入口达到 44px；共享 span/a 规则仍为 32px，因此首页和 archive 的非交互 span 保持紧凑。既有自然换行、hover 下划线与全局 focus outline 不变。
  - Mobile disclosure：每个 taxonomy `summary` 增加 `aria-hidden="true"` 的真实 `+ / −` 标记；closed 显示 `+`、open 显示 `−`，不只靠颜色表达状态。Summary 改为三列 grid，为当前筛选文本保留弹性列，原生 `details`、48px 最小高度和 Enter/Space 行为不变。
  - Forced colors：disclosure 使用 `currentColor` 边线，并加入现有 forced-colors `CanvasText` 边线组；没有加入动画或新的脚本。
  - 构建证据：`npm run build` 通过，仍生成 32 个静态页面；中英 archive 各输出 3 个原生 details 与 3 个 disclosure icon，英文 ZIP 详情仍输出 3 个链接型 taxonomy tag，archive 非链接标签保持 span。
  - 质量证据：`git diff --check` 通过；两个 Round 2 未跟踪源文件另以 `git diff --no-index --check /dev/null <file>` 检查，均 whitespace-clean。首页结构、筛选脚本、详情页与内容数据均未修改。
- 模块验收：`PASS — 2026-08-21`（源码级设计验收；最终浏览器与辅助技术矩阵见 Module 06）
