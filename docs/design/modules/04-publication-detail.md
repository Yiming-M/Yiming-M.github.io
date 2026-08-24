# Module 04 — 出版物详情叙事

## 范围

优化 6 篇出版物中英文详情页的阅读顺序、元数据、论文资源、方法图和“问题—想法—证据—边界”解释模块。内容事实以 `src/content/publications/*.json` 为准，本模块不重新解释论文。

## 当前问题

- 详情 hero 标题最大可达 6.4rem，长论文标题会形成过多行并压低核心问题；
- 返回链接与正文之间固定 4rem，移动端形成无意义空白；
- 作者、venue、date、标签、资源链接散落在一个连续 hero 内，扫描成本高；
- 方法图在内容之后像独立卡片，图注与论文正文的关系不够强；
- 四个解释 section 使用 180px 标签列，窄平板容易产生很窄的正文列；
- Caveat 作为卡片与前三节视觉不同，容易被误读为警告或附注，而不是同等重要的研究边界；
- 长段证据只有正文，无突出关键实验结果的视觉锚点；当前数据不适合自动抽取数字，因此需要排版层级而非虚构摘要。

## 目标

- 让读者在页面顶部快速确认论文、作者、来源和研究问题；
- 把四段解释做成连贯、可引用、可连续阅读的论文解说；
- 让 Evidence 和 Limits 同等重要，不把 caveat 藏起来；
- 长标题、长作者列表和中英文都保持舒适阅读；
- Paper / Code / Demo 从顶部和阅读结束处都可达。

## 内容结构

建议 DOM 顺序：

1. 返回 Research archive；
2. date + venue；
3. `h1` 论文标题；
4. 研究问题（lead）；
5. 作者；
6. Task / Method / Goal；
7. Paper / Code / Demo；
8. 方法图及真实的上下文图注；
9. sticky/inline 章节导航（Problem / Idea / Evidence / Limits）；
10. 四个解释 section；
11. 末尾资源与返回 archive。

## 设计方案

### 桌面（≥1024px）

- 详情容器最大 1120px；hero 使用 12 列：左侧标题/问题 8 列，右侧 metadata/resource rail 3 列，间隔 1 列；
- 返回链接置于 hero 顶部，margin-bottom 32px；
- `h1` 最大 `clamp(2.8rem, 5vw, 5.4rem)`，英文最大约 18–22 个词/行，行高 0.98；中文负字距更克制；
- 研究问题使用 serif lead，最大 64ch；
- 右 rail 用 Definition List：Published / Venue / Authors（作者可跨整行）或分为 meta + authors；资源链接为 44px 高的文本按钮；
- 方法图不做重阴影卡片；以 1px 上下边界和 24px 内边距呈现，保持原始比例；
- 解释区采用 12 列：左 3 列为 sticky 章节导航，右 8 列为文章；每节有编号、短标题和正文，正文最大 68ch；
- Limits 使用同一结构，但用 `border-left: 3px solid var(--accent)` 和 `surface-subtle` 轻底区分，不使用危险/警告色；
- 页面末尾提供 `Paper / Code / Demo` 与 `Next: back to all publications`。

### 平板（768–1023px）

- hero 单栏标题 + 下方 2×2 metadata grid；作者占整行；
- 方法图全宽；
- 章节导航改为顶部横向 anchor 行，可换行，不 sticky 覆盖内容；
- 每节使用 2+6 列：编号/标签 2 列，标题/正文 6 列；当正文小于 48ch 时切成单栏。

### 手机（320–767px）

- hero 完全单栏；返回链接距 header 24px，标题字号最小不低于 2.25rem；
- date/venue 同一行可换行；作者列表不使用中点强制不换行；
- Paper / Code / Demo 为 2 列或单列 44px 文本按钮，不能缩成小字链接；
- 方法图可横向点按查看原图链接（同一图片资源），页面本身不横向滚动；
- 章节导航使用 2×2 anchor 网格或省略 sticky 行，但四节标题必须清晰；
- 每节顺序为 number/label → heading → paragraph，段间 16px，节间 56–64px；
- 末尾资源和返回入口完整保留。

## 交互与可访问性

- 四节使用稳定 `id`: `problem`, `idea`, `evidence`, `limits`；anchor 跳转考虑 sticky header 的 `scroll-margin-top`；
- 当前章节若未来做 scroll spy，必须是增强而非阅读前提；本轮不要求；
- Definition List 用真实 `dl/dt/dd` 语义；作者可用普通 paragraph，避免错误列表语义；
- 方法图可链接原图，但 alt 仍说明内容；figcaption 明确“来自论文，完整图注见原文”；
- 资源链接目的清楚，Code/Demo 不存在时不渲染空位；
- Evidence 与 Limits 的可见性不依赖颜色；section heading 和编号提供文字结构；
- 长词/URL 使用 `overflow-wrap: anywhere`，论文标题不使用 `word-break: break-all`。

## 精确实现指引

1. 重构 `PublicationDetail.astro` hero 为 `.publication-title-column` + `.publication-meta-rail`，使用现有 data；禁止发明 DOI、页码或状态。
2. 章节数据可以在组件 frontmatter 中创建静态数组（label/id/title/content），循环输出，减少重复 markup；Limits 通过 `kind` class 区分。
3. `TopicTags` 继续复用；linked 标签指向带 `?tag=` 的 archive。
4. 方法图 wrapper 改为 figure + 可选 anchor；不裁切，不设固定 max-height 导致超宽图过小，可用 `max-height` 但确保宽图仍清楚。
5. 加入 section anchor nav，链接文字为 Problem / Idea / Evidence / Limits 的双语版本。
6. 页面末尾加入 `.publication-end-actions`，复用相同 links 数据，不复制条件逻辑时可抽成局部函数/片段，但不要新增只用一次的复杂组件。
7. schema/JSON 不因视觉工作修改；若发现内容缺字段，报告给主流程，不在设计模块补造。

## 涉及文件

- `src/components/PublicationDetail.astro`
- `src/components/TopicTags.astro`（仅共享样式/链接一致性）
- `src/styles/global.css`
- `src/content/publications/*.json`（只读事实来源）

## 验收清单

- [x] 6 篇英文 + 6 篇中文详情页使用同一稳定结构。
- [x] 长标题在 320、768、1024px 无溢出、无过度孤行。（安全换行与静态网格通过；实际行分布纳入 Module 06。）
- [x] 页面顶部可快速找到 date、venue、authors、tags、Paper/Code/Demo。
- [x] 方法图完整显示且有正确 alt / figcaption；不被裁切。
- [x] Problem / Idea / Evidence / Limits 有稳定 anchor 和连续标题层级。
- [x] Limits 视觉上重要但不被错误编码成“错误/危险”。
- [x] 正文列约 68ch，200% 文本缩放不被固定高度裁切。（源码无固定高度；实际 zoom 复核纳入 Module 06。）
- [x] 移动端资源链接至少 44px，可键盘/触控访问。（源码 target 与 focus 通过；真实触控纳入 Module 06。）
- [x] 页面底部可返回 archive，并再次访问原始资源。
- [x] 视觉改动没有修改或虚构论文事实。

## 两轮执行记录

- Round 1 程序员实现：`DONE — 2026-08-21`
  - Hero：`PublicationDetail.astro` 按返回 archive → Published/Venue `dl` → title/question → authors → linked taxonomy → 条件资源的 DOM 顺序重构；桌面为标题/问题 8 列、空 1 列、3 列 metadata/resource rail，最大容器 1120px。标题使用 `clamp(2.8rem, 5vw, 5.4rem)`、克制中文负字距和 `overflow-wrap: anywhere`。
  - 响应式：768–1023px hero 按 DOM 顺序回到单栏，Published/Venue 使用两列 metadata grid，章节导航改为可换行顶部 anchors；≤767px 完全单栏，标题下限 2.25rem，资源按可用宽度在两列/单列间自适应。未使用 CSS `order`、固定内容高度或横向滚动容器。
  - 方法图：现有 image 条目使用可点击同源原图的 figure，图片保持 `width: 100%`、`height: auto`、`object-fit: contain`，无 max-height 裁缩；figcaption 明确该图来自论文、完整原始图注/符号/语境需查原文。无 image 的两篇按数据不生成伪图或占位。
  - 阅读叙事：以静态 `sections` 数组统一输出 Problem / Idea / Evidence / Limits；每节是同级 `section` + `h2`，具有稳定 `problem`、`idea`、`evidence`、`limits` id、匹配的 `aria-labelledby` 与章节 anchor nav。正文最大 68ch，desktop 使用 3 列 sticky nav + 8 列文章，tablet 内部为 2+6，mobile 为 number/label → heading → paragraph 单栏。
  - Limits：不再使用 caveat `aside`/警告卡，而与前三节使用相同语义和标题层级；仅以 `surface-subtle`、3px accent 左线和明确的“Limits / 边界与版本”文本区分，未使用危险色。
  - 资源与收束：从同一条件 `resources` 数组在 hero 与页末各渲染 Paper，以及存在时的 Code/Demo；所有资源、章节导航、返回链接和页末 archive 入口至少 44px 高，未渲染空资源位。页末新增 Source material 与 Next: back to all publications。
  - 构建证据：`npm run build` 通过，生成 32 个静态页面；6 篇英文 + 6 篇中文详情各有 1 个 h1、1 个真实 metadata `dl`、4 个稳定 section/anchor、2 组条件资源与 1 个页末返回区。四篇有数据图的中英页面输出可链接 figure；两篇无图数据不输出 figure。
  - 质量证据：`git diff --check` 通过；本模块两个未跟踪源文件另以 `git diff --no-index --check /dev/null <file>` 检查，均 whitespace-clean。`TopicTags.astro` 与 `src/content/publications/*.json` 未修改。委派程序员线程未做浏览器截图、真实缩放或视觉主题判断，留给 Round 1 设计评审。
- 设计师反馈：`DONE — 2026-08-21 · PASS WITH MINOR CHANGES`（见 `docs/design/feedback/04-round-1.md`）
- Round 2 程序员修订：`DONE — 2026-08-21`
  - Detail labels：新增严格 scoped 的 `.publication-detail .section-number { font-size: var(--text-xs); }`，四个解释章节与页末 05 标签现在使用 0.75rem；未改变其它页面的 eyebrow/section-number、颜色、字重、字距或 DOM。
  - 中文标题：新增 `html[lang^="zh"]` override，将 explanation h2 与页末 h2 的字距放松为 `-0.015em`；英文继续使用 `-0.035em`，既有中文 h1 override、字号、行高和安全换行均不变。
  - 构建证据：`npm run build` 通过，仍生成 32 个静态页面；12 个中英详情继续各有 1 个 h1、4 个稳定 section、4 个匹配 anchor 和 2 组条件资源 nav。
  - 质量证据：`git diff --check` 通过；Round 2 唯一源文件另以 `git diff --no-index --check /dev/null src/styles/global.css` 检查为 whitespace-clean。未修改组件 DOM、内容 JSON、资源 URL 或图片资产。
- 模块验收：`PASS — 2026-08-21`（源码级设计验收；最终浏览器与辅助技术矩阵见 Module 06）
