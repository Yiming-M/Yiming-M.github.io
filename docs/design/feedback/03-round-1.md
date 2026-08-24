# Module 03 — Round 1 design feedback

## Verdict

**NEEDS REVISION**

Round 1 已经正确区分首页“精选路径”和 Publications “完整档案”，并完成分组 taxonomy、单标签筛选、URL 恢复、结果计数、中英标签前缀及三档响应式结构。Round 2 不需要重构研究展示；只需修复两个可达性缺口：共享 `TopicTags` 的链接型标签仍只有 32px 高，以及手机端主动隐藏原生 disclosure marker 后没有提供替代的展开/收起指示。

证据范围：本评审完整阅读总体方案、README、Module 03、`HomePage.astro`、`PublicationsPage.astro`、`PublicationCard.astro`、`TopicTags.astro`、`site.ts` taxonomy 和完整 `global.css`；重新执行构建并检查中英首页与 archive 静态产物。没有进行浏览器截图、真实点击、屏幕阅读器、320/768/1280 viewport、200% zoom 或设备测试。以下 desktop/tablet/mobile 结论来自 DOM、CSS grid、媒体查询和构建产物，不冒充视觉实测。

## What works

- 首页 Selected research 已移除筛选器，章节说明明确写出 **3 selected works / 3 篇精选工作** 与完整 archive 的 **6 publications / 6 篇论文**，并保留清楚的 “View all publications / 查看全部出版物” 入口。
- 首页输出一张 featured story 和两条 compact work。Featured 的 DOM 层级为图 → 日期/venue → 标题 → 研究问题 → 核心想法 → 标签 → 完整讲解与 Paper/Code/Demo；两条 compact work 保留日期/venue、标题、问题、标签和文字讲解入口。
- Featured 图不再有年份叠层；`.paper-visual img` 使用 `width: 100%`、`height: auto`、`object-fit: contain`，容器使用 `--surface-subtle`。alt 为 ZIP 方法概览，而不是机械复述标题。
- Archive 默认静态输出 6 个 `article.publication-row` 和常显的 “6 publications / 6 篇论文”。每行按元数据 → 标题/问题/一句话结论 → 标签/文字行动的 DOM 顺序组织；`oneLine` 直接来自内容数据，没有新造研究事实。
- Task / Method / Goal 来自同一份 `filterGroups` 数据。桌面/平板渲染三组可换行按钮，手机渲染三组原生 `details`；没有复制三套 taxonomy 数据源。
- 每个 filter button 都有 `aria-pressed` 和 `aria-controls="publication-list"`。选择任一 tag 时，脚本按 `data-filter` 同步桌面与手机的重复按钮；焦点没有被程序化移动。
- 结果数量节点同时使用 `aria-live="polite"` 与 `aria-atomic="true"`。筛选脚本按实际可见卡片更新数量，隐藏的是整张 `article`，因此 `hidden` 卡片内链接不会继续进入键盘顺序。
- `?tag=` 初始化只接受 `validTags`。有效 tag 恢复筛选；无效值归一为 All 并从 URL 移除。更新通过 `URL`、`URLSearchParams` 与 `history.replaceState` 完成，没有把 query 内容插入 HTML。
- 标签文案在 `site.ts` 中显式包含 `Task · / Method · / Goal ·` 和 `任务 · / 方法 · / 目标 ·`；`TopicTags.astro` 直接渲染这些文字，不用伪元素生成关键信息。三类标签同时使用填充/边线模式区分，类别不只依赖颜色。
- Archive 行只有标题与明确的 “Read the explanation / 阅读完整讲解” 可点击；整行 hover 只是 surface 反馈，没有制造巨大隐形链接。
- ≥1024px 使用 12 列 featured 5+7、compact/archive 2+7+3；768–1023px 使用 8 列 featured 4+4、row 2+6 且 aside 回到正文列；≤767px 按 DOM 折为单栏，filter chip 为 100% 宽且至少 44px 高。
- long title/tag 均允许换行；没有横向滚动 taxonomy 容器，也没有 CSS `order`。Light/dark、more-contrast 和 forced-colors 使用现有语义 token 与全局 focus outline。
- `npm run build` 重新执行成功，生成 **32 pages**。构建产物中英文首页各有 1 个 featured + 2 个 compact work；中英文 archive 各有 6 个 publication rows、3 个 mobile taxonomy details、1 个 polite live region 和 6 个明确文字详情入口。

## Required changes for Round 2

1. **[High] 将链接型 taxonomy tag 的触控/键盘目标提升到至少 44px 高，同时保留非交互标签的紧凑密度。**
   - 位置：`src/styles/global.css` 的 `.tag-row span, .tag-row a` 共享规则；调用来源为 `TopicTags.astro` 的 `linked` 分支，当前由 `PublicationDetail.astro` 使用。
   - 问题：共享规则把 `<span>` 和 `<a>` 都设为 `min-height: 32px`。首页和 archive 中的非交互 `<span>` 可以保持 32px，但详情页的 `<a>` 是真实筛选入口；32px 低于总体方案规定的 44px 主要交互目标，在手机和 200% 文本缩放场景尤其容易误触。
   - 期望：保持 `.tag-row span` 的 32px 密度，单独覆盖 `.tag-row a.taxonomy-tag { min-height: 44px; }`，或使用等价的精确选择器。不要把所有非交互标签一并放大；链接 hover 下划线、focus outline、完整类别前缀与自然换行必须保留。
   - 验收：源码可证明 `TopicTags linked` 分支的每个 `<a>` 高度下限 ≥44px，非链接 `<span>` 仍可为 32px；320px 下长中英文标签不截断且不产生横向页面滚动。

2. **[Medium] 恢复手机 taxonomy `<details>` 的可见展开/收起 affordance。**
   - 位置：`PublicationsPage.astro` 的 `.taxonomy-mobile-group > summary` 与 `global.css` 约 2027–2052 行。
   - 问题：CSS 同时设置 `list-style: none` 并隐藏 `::-webkit-details-marker`，但 summary 只显示组名和当前筛选文本，没有替代 caret/加减号。因此 48px summary 虽保持原生键盘行为，视觉上却像两列静态文字；`[open]` 目前只改变文字颜色，也不能单独承担展开状态提示。
   - 期望：在 summary 中加入持久可见、`aria-hidden="true"` 的 disclosure icon，并让 closed/open 有方向或字形差异；建议使用真实 markup + `currentColor`，避免依赖品牌色。也可保留浏览器原生 marker，但必须在 Chromium/WebKit/Firefox 的 flex 布局下仍清楚可见。指示器不能挤掉当前标签，summary 高度继续 ≥48px，forced-colors 下仍可辨识，不添加非必要动效。
   - 验收：从源码可证明 closed/open 均有非颜色的可见状态指示；summary 继续使用原生 `<details>`、键盘 Enter/Space 行为和 48px 目标，当前筛选文本仍完整显示。

## Responsive and accessibility notes

- **Desktop**：12 列层级和 archive 2+7+3 结构与规格一致；filter groups 可换行，All 与数量独立在前。标题/问题/结论的权重可从字号、颜色和结构规则证明，但未做 1280px 浏览器截图或像素测量。
- **Tablet**：768–1023px 的 featured 4+4 与 archive row 2+6 明确存在；标签和详情移入正文列，toolbar 上下堆叠，不依赖 hover。是否在 768px、中文长 venue 下产生不理想孤行留待 Module 06 实测。
- **Mobile**：≤767px 按自然 DOM 单栏，元数据先于标题，结论和文字行动常显；filter chip 100% 宽、44px 高且 details summary 为 48px。没有横向 chip scroller。当前唯一源码级缺口是 summary marker 被移除后缺少替代提示。
- **Keyboard / screen reader**：filter buttons、标题链接、详情链接均为原生控件；`aria-pressed`、`aria-controls`、polite/atomic live region、整卡 hidden 和不移动焦点均正确。链接型 taxonomy tags 的 32px 高度是触控尺寸缺口，不是键盘可聚焦缺口；全局 `:focus-visible` 仍提供 3px outline。
- **Theme / contrast**：标签和筛选器只使用语义 token；类别前缀让 Task / Method / Goal 不只靠颜色。Active filter 在 forced-colors 下有显式 outline。未做真实 light/dark 截图或抗锯齿后的颜色感知测试。
- **URL / script safety**：有效 tag 来源于已渲染按钮集合；无效 query 不参与 selector 或 `innerHTML`，而是回到 All。源码级判断通过；未在真实浏览器中执行 history/back-forward 或复制分享流程。

## Round 2 acceptance

- [x] `TopicTags linked` 的 `<a>` 最小高度 ≥44px，非交互 `<span>` 保持紧凑，长标签可换行。
- [x] 手机 taxonomy summary 在 closed/open 状态都有非颜色的可见 disclosure 指示，原生 details 行为和 ≥48px 目标不回退。
- [x] 首页仍明确为 3 篇精选研究并保留 6 篇完整 archive 入口；首页不重新加入筛选器。
- [x] Featured 图继续使用 `contain` + auto height，无年份覆盖；图 alt 仍描述方法概览。
- [x] Archive 中英均默认输出 6 篇，标题 → 问题 → 一句话结论层级和明确文字行动不回退。
- [x] Task / Method / Goal 继续来自同一数据源并保留完整中英类别前缀；desktop/mobile 同 tag 的 `aria-pressed` 同步。
- [x] 结果计数继续使用 `aria-live="polite"` + `aria-atomic="true"`，筛选后按实际可见卡片更新且不移动焦点。
- [x] 有效 `?tag=` 可恢复；无效 tag 安全归一为 All；隐藏 article 内没有残留可聚焦链接。
- [x] 12/8/4 列布局、mobile 100% filter chips、无横向 taxonomy scroller 和 forced-colors/focus 规则不回退。
- [x] `npm run build` 与 `git diff --check` 通过，中英首页/archive 构建结构保持同构。

## Final verification — Round 2

**PASS — 2026-08-21**

逐项证据：

- 共享基础规则仍令 `.tag-row span, .tag-row a` 的默认 `min-height` 为 32px；新增的精确覆盖 `.tag-row a.taxonomy-tag { min-height: 44px; }` 只提升 `TopicTags linked` 分支。`white-space: normal`、8px row gap、hover 下划线和全局 `:focus-visible` 均保留，因此非交互标签密度和长标签换行没有回退。
- 每个 mobile taxonomy `<summary>` 现在包含真实 markup 的 `.taxonomy-disclosure[aria-hidden="true"]`，closed 显示 `+`、open 显示 `−`。CSS 使用三列 grid `auto minmax(0, 1fr) 24px`，为当前筛选文本保留弹性列；summary 仍为原生 details 控件并保持 48px 最小高度，没有新增动画。
- disclosure 以 `currentColor` 边线表达形状，在 `forced-colors: active` 中又与 taxonomy group 一并强制为 `CanvasText`；展开状态不再只依赖 accent 颜色。
- `HomePage.astro` 仍由 `selected` 输出 1 个 featured + 2 个 compact work，章节说明仍为 3 篇精选 / 6 篇完整档案并保留中英 archive CTA；源码中没有 Selected research filter。
- Featured 方法图继续使用 `width: 100%`、`height: auto`、`object-fit: contain`，没有年份覆盖节点；中英 alt 仍明确说明 ZIP 人群计数方法概览。
- Archive 继续输出日期/venue → 标题 → question → `oneLine` → tags → 明确文字详情入口。构建产物中英文各有 6 个 `.publication-row` 和 6 个 “Read the explanation / 阅读完整讲解”。
- Task / Method / Goal 仍由同一 `filterGroups` 数组分组；标签文案继续直接来自 taxonomy 的完整中英前缀。脚本仍按相同 `data-filter` 同步桌面/手机重复按钮的 `aria-pressed`。
- 结果节点继续同时拥有 `aria-live="polite"` 与 `aria-atomic="true"`；筛选只切换整张 article 的原生 `hidden`，按可见卡片更新数量，不移动焦点。
- `validTags` 白名单、无效 tag 回到 All、URLSearchParams/replaceState 更新逻辑未改变；query 内容不进入 selector 或 `innerHTML`。
- 12 列、8 列和 ≤767px 单列规则保留；手机 chip 仍为 100% 宽和 44px 最小高度，不存在横向 taxonomy scroller。构建 CSS 同时包含 44px linked tag 和三列 disclosure 规则。
- `npm run build` 于最终复核重新执行成功，生成 **32 pages**；中英文 archive 各输出 3 个原生 details 和 3 个 disclosure。英文 ZIP 详情输出 3 个链接型 taxonomy tag，archive 继续输出非链接 span。`git diff --check` 通过。

证据边界：本次为源码、构建产物和静态 DOM/CSS/脚本复核，没有浏览器截图、真实 320/768/1280 viewport、鼠标/触摸交互、屏幕阅读器、200% zoom 或主题视觉测试。因此 PASS 表示 **Module 03 源码级设计验收通过**；真实渲染和辅助技术矩阵继续保留在 Module 06。
