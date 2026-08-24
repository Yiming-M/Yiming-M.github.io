# Module 04 — Round 1 design feedback

## Verdict

**PASS WITH MINOR CHANGES**

Round 1 已完成详情页所需的结构性重构：hero 与 metadata rail、条件资源、真实 figure、四段稳定 anchor 叙事、同等级 Limits，以及页末资源和返回入口均已落地。12 个中英详情构建结果同构，长内容具备可靠的换行与无固定高度约束。Round 2 不需要调整 DOM 或内容，只需把详情页章节编号提升到既定 12px token，并放松中文解释标题与末尾标题的字距。

证据范围：本评审完整阅读总体方案、README、Module 04、`PublicationDetail.astro`、完整 `global.css` 与 6 份 publication JSON；重新构建并逐页检查 6 英文 + 6 中文详情产物，同时核对 4 份图片资产的存在与尺寸。没有进行浏览器截图、真实 320/768/1024 viewport、鼠标/触摸、屏幕阅读器、200% zoom 或主题视觉测试。以下 desktop/tablet/mobile 判断来自 DOM、CSS grid、媒体查询、静态资产与构建 HTML，不冒充视觉实测。

## What works

- 12 个详情页都由同一个 `PublicationDetail.astro` 输出。构建产物逐页均只有 1 个 `h1`、1 个真实 metadata `dl`、4 个章节 anchor、4 个对应 section、2 组条件资源 nav 和 1 个页末行动区。
- Hero DOM 顺序稳定为返回 archive → Published/Venue → title/question → authors → linked taxonomy → resources；桌面 CSS 将标题/问题放入 8 列，将 metadata/authors/tags/resources 放入右侧 3 列并保留 1 列间隔，没有使用 CSS `order`。
- 返回链接为 44px 高、底部间距 32px；hero 最大容器 1120px。标题使用 `clamp(2.8rem, 5vw, 5.4rem)`、`overflow-wrap: anywhere` 和不小于 `-0.045em` 的英文字距，中文 h1 已单独放松到 `-0.015em / 1.06`。
- Published 与 Venue 使用 `dl/dt/dd`；date 使用 `time[datetime]`。长 venue、作者与 h1 都允许换行，没有 `word-break: break-all`、固定内容高度或横向滚动容器。
- `resources` 只在 frontmatter 构造一次并在顶部/页末复用。构建结果与 JSON 条件一致：CLIP-EBC、ZIP 各为 `3+3` 个 Paper/Code/Demo；DMS2、FusionCount、Interact with me 各为 `2+2` 个 Paper/Code；Real-Time DMS 为 `1+1` 个 Paper，没有空 Code/Demo 占位。
- 每个资源链接至少 44px 高，具有明确 Paper/Code/Demo 文本、边界、hover 与全局 focus outline；顶部和页末 nav 使用不同 accessible label。外链保持当前窗口，符合总体约束。
- Linked Task / Method / Goal 复用 Module 03 的完整中英前缀和 44px taxonomy link，指向同语言 archive 的 `?tag=`，类别不只依赖颜色。
- 4 份有 `image` 数据的论文在中英页面输出 figure；DMS1 与 FusionCount 没有 image 数据，因此不生成伪图或空占位。图片文件均存在：CLIP-EBC 2826×1476、DMS2 1618×1630、Interact with me 2960×1116、ZIP 2800×1332。
- Figure 链接同源原图，accessible name 明确“查看原图”；图片使用 `width: 100%`、`height: auto`、`object-fit: contain`，没有 max-height 或 cover 裁切。figcaption 明确图像来自论文，并提示完整原始图注、符号和上下文以原文为准。
- `sections` 静态数组只映射现有 `problem / idea / evidence / caveat` 数据，不改写事实；Problem / Idea / Evidence / Limits 具有稳定 id、匹配的 nav href、同级 `section + h2` 和 `aria-labelledby`。
- Desktop reading layout 为左 3 列 sticky “On this page”、空 1 列、右 8 列文章；正文内部为编号 2 列 + 内容 6 列，段落最大 68ch，anchor 有 8rem scroll margin。
- Limits 与前三节保持同一 section/h2 语义，只增加 `surface-subtle`、3px accent 左边线和明确的 Limits / 边界与版本文字；没有危险色、警告图标或 aside 语义。在 forced colors 下边线回到 `CanvasText`。
- 页末 “Source material / 原始资源” 再次提供同一条件资源数组，并有 44px 的 “Next: back to all publications / 下一步：返回全部出版物”。
- 768–1023px 将 hero 和 reading layout 改为 8 列：metadata 两列、其余 hero 内容按 DOM 单栏，section nav 变为可换行横向 anchors，解释区保持 2+6；≤767px 为自然单栏、2×2 section anchors、资源 `auto-fit minmax(120px, 1fr)`、章节顺序 number/label → h2 → paragraph。
- `npm run build` 重新执行成功，生成 **32 pages**；`git diff --check` 通过。当前组件只读取 JSON 字段，没有在呈现层生成 DOI、页码、实验摘要或新数字。

## Required changes for Round 2

1. **[Medium] 将 Publication Detail 内的章节编号/标签提升到既定 12px token。**
   - 位置：`src/styles/global.css` 的全局 `.eyebrow, .section-number`（当前 `0.72rem`）及 Module 04 scoped 样式；影响四个 `.publication-explanation > .section-number` 和页末 `05 / Source material`。
   - 问题：`0.72rem` 约为 11.52px，低于总体排版方案规定的 `--text-xs: 0.75rem`，同时该文字还使用 uppercase/0.15em 字距。详情页的 01–05 是持续导航层级，不应继续低于 12px。
   - 期望：增加 scoped 规则，例如 `.publication-detail .section-number { font-size: var(--text-xs); }`。不要在本模块全局改写其它页面的 eyebrow；颜色、编号文本、字重和 DOM 不变。
   - 验收：四个 section label 与页末 Source material 均从源码继承 `--text-xs` 或 ≥0.75rem；不影响 publication nav、metadata、figcaption 和其它模块字号。

2. **[Medium] 为中文解释 h2 与页末 h2 使用中文标题字距。**
   - 位置：`.explanation-copy h2` 与 `.publication-end-actions h2`，当前两者都固定为 `letter-spacing: -0.035em`；h1 已有正确的中文 override。
   - 问题：总体方案要求中文标题恢复到 `-0.015em` 或 normal。当前中文 “这项工作的边界在哪里？”、“继续阅读原始材料。” 等 h2 比 h1 更紧，汉字和标点容易产生粘连；这是确定的 CSS token 偏差，不是截图判断。
   - 期望：增加 `html[lang^="zh"]` scoped override，将这两类 h2 设为 `letter-spacing: -0.015em` 或 `normal`；保留英文 `-0.035em`、当前字号、层级和 `overflow-wrap`。
   - 验收：中文四个解释标题与页末标题不再使用 `-0.035em`；英文标题排版和 h1 中文 override 不回退。

## Responsive and accessibility notes

- **Desktop**：12 列 hero、右侧 rail 与 3+1+8 reading layout 均由 CSS 明确证明；sticky nav 的 `top: 8rem` 与 section `scroll-margin-top: 8rem` 对齐。右 rail 中长作者和三个标签会自然增高，不存在定高裁切。未做 1024/1280 浏览器截图，不能声称真实行数或首屏像素级通过。
- **Tablet**：768–1023px 的 metadata 两列、hero 单栏、非 sticky anchor 行与 2+6 section 成立；资源和 nav 都允许换行且不依赖 hover。长标题在 768px 的实际孤行与阅读节奏留 Module 06 视觉复核。
- **Mobile**：≤767px 标题下限 2.25rem、metadata 两列、资源可两列/单列、section nav 2×2、正文单栏和 64px 节间距均由源码证明。320px 与 200% zoom 没有固定高度或不可换行文本，但真实横向滚动/重叠仍需 Module 06 浏览器测试。
- **Keyboard / screen reader**：返回、资源、tag、figure 和 anchor links 都是原生链接并有全局 focus；资源与 tag ≥44px。Section nav 使用有序列表和 accessible label，section 由 h2 标记并以 `aria-labelledby` 关联。未运行实际屏幕阅读器或键盘 traversal。
- **Theme / contrast**：详情页只使用语义 token；Limits 还有文字标题与左边线，不只靠背景色。forced-colors 为资源按钮和 Limits 提供 `CanvasText` 边界。未截图检查 light/dark 的真实视觉权重。
- **Content boundary**：本轮逐份只读核对 JSON 与构建输出；能够确认组件按现有字段条件呈现，不能从当前未提交基线证明 JSON 的历史 diff。设计反馈未改任何论文事实或源文件。

## Round 2 acceptance

- [x] Detail 内 01–05 `.section-number` 使用 `--text-xs` 或 ≥0.75rem，且改动严格 scoped。
- [x] 中文 explanation/end h2 使用 `-0.015em` 或 normal；英文 h2 与中英 h1 字距不回退。
- [x] 12 个详情页仍各有唯一 h1、真实 metadata dl、4 个稳定 anchor/section、两组条件资源和页末返回入口。
- [x] 顶部 hero 仍为 8+1+3 desktop rail；768–1023 单栏 + 两列 metadata；≤767 自然单栏且不使用 CSS order。
- [x] 长 title/authors/venue 继续使用安全换行，无 `break-all`、固定高度或横向页面滚动规则。
- [x] 资源继续按 JSON 条件渲染：3/2/1 种资源的页面不产生空位，所有资源链接 ≥44px。
- [x] 4 份有图数据继续输出 linked figure、context figcaption、auto height + contain；2 份无图数据不输出占位。
- [x] Problem / Idea / Evidence / Limits 的 id、href、h2、aria-labelledby、68ch 正文与 scroll margin 不回退。
- [x] Limits 继续使用同级 section 语义、文字标题、neutral surface + accent/forced-color 边线，不变成 warning/aside。
- [x] `npm run build` 与 `git diff --check` 通过；JSON、论文事实、资源 URL 和图片资产不被 Round 2 修改。

## Final verification — Round 2

**PASS — 2026-08-21**

逐项证据：

- 新增规则为 `.publication-detail .section-number { font-size: var(--text-xs); }`。选择器严格限定详情 article，覆盖四个解释标签和页末 05 标签；全局 `.eyebrow, .section-number` 及其它页面未改。`--text-xs` 仍为 0.75rem。
- `.explanation-copy h2` 与 `.publication-end-actions h2` 的英文基础值继续为 `-0.035em`；其后新增 `html[lang^="zh"]` override，将两者设为 `-0.015em`。中英 h1 的 `-0.045em / -0.015em` 规则、字号和安全换行保持不变。
- 重新逐页检查 6 英文 + 6 中文构建产物：每页仍为唯一 h1、一个 metadata dl、4 个 nav anchors、4 个匹配 section、两组 resource nav 和一个 end-actions 区。
- 资源条件与 JSON 继续一致：CLIP-EBC、ZIP 为 `3+3`；DMS2、FusionCount、Interact with me 为 `2+2`；Real-Time DMS 为 `1+1`。没有空 Code/Demo，资源链接仍至少 44px。
- Hero 的 12 列 8+1+3 rail、768–1023px 全宽 hero + 两列 metadata、≤767px 单栏顺序均保留；源码仍无 CSS `order`、固定内容高度、`break-all` 或横向滚动容器。
- 四个有图条目在中英页面继续输出 linked figure；DMS1 和 FusionCount 继续不输出 figure。图片保持 auto height + contain，原图 accessible name 与 context figcaption 未改变。
- Problem / Idea / Evidence / Limits 仍由同一静态 sections 数组生成，id/href/aria-labelledby 一一匹配。正文保持 68ch，section 保持 8rem scroll margin；桌面 sticky nav、平板 2+6 与手机单栏规则未改变。
- Limits 仍是与前三节同级的 `section + h2`，以文字、neutral surface、accent 左边线表达；forced-colors 继续把边界设为 `CanvasText`，没有 warning/aside 回退。
- 与 Round 1 捕获的组件/内容核对，本轮仅增加两个 scoped CSS 排版规则；组件 DOM、6 份 JSON、资源 URL 和图片引用未变。
- `npm run build` 于最终复核重新执行成功，生成 **32 pages**；构建 CSS 包含 0.75rem detail label 与中文 `-0.015em` h2 override。`git diff --check` 通过。

证据边界：本次为源码、构建产物、静态 DOM/CSS 和当前内容数据复核，没有浏览器截图、真实 320/768/1024 viewport、鼠标/触摸、键盘完整 traversal、屏幕阅读器、200% zoom 或主题视觉测试。因此 PASS 表示 **Module 04 源码级设计验收通过**；真实渲染与辅助技术矩阵继续保留在 Module 06。
