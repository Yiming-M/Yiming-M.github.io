# Module 01 — Round 1 design feedback

## Verdict

**NEEDS REVISION**

Round 1 已经建立了正确的结构基础，尤其是全尺寸导航不再消失、三态主题在手机端完整、双语保持当前路径、页脚信息完整。不过，当前实现仍有三项直接违反 Module 01 验收值的可量化问题，并有三项会影响 200% 文本缩放和无 `backdrop-filter` 环境的稳健性。Round 2 应只修复以下事项，不提前调整首页或 publication 模块。

评审证据范围：完整阅读 `BaseLayout.astro`、`global.css`、总体/模块文档，并检查当前 `dist/` 中英文首页与 ZIP 详情产物。未运行浏览器视觉截图、DOM 点击或真实设备测试，因此下文不把源码推断描述为实际视觉结果。

## What works

- `BaseLayout.astro` 使用 `isCurrentNav()` 为主导航、移动导航和 footer 同步输出 `aria-current="page"`；详情路径 `/publications/zip/` 正确归入 Research。
- 英文/中文语言链接使用相同 `path` 生成；构建产物证明 `/publications/zip/` 与 `/zh/publications/zip/` 互相对应，没有跳回首页。
- 桌面保留完整主导航与语言/主题 controls；768–1023px 规则将 header 分为品牌/控件第一行和完整 nav 第二行；≤767px 使用原生 `details`，四个页面入口没有被隐藏。
- Auto / Light / Dark 具有可见双语文本和 `aria-pressed`；桌面/手机两组同值按钮由同一脚本同步，`site-theme` localStorage 与系统主题监听仍保留。
- 移动菜单当前页同时使用 `aria-current`、左边界、背景和 `Current / 当前` 文字，不只依赖颜色。
- 页面点阵背景已移除；header 从大胶囊改为 12px surface；品牌标记改为 40×40、10px 圆角，符合收敛方向。
- footer 已包含页面导航、Scholar / GitHub / LinkedIn / Email、copyright 和返回顶部，且小屏改为单栏/2×2 页面链接。
- 语义 token、32/24/16px 页面 gutter、reduced-motion、prefers-contrast 与 forced-colors 基础规则均已建立。
- 当前构建产物包含上述结构；程序员记录的 32 页构建与 legacy route 没有被本次静态检查推翻。

## Required changes for Round 2

1. **[High] 修复亮色主题焦点环对比度。**
   - 位置：`src/styles/global.css` 的 `:root --focus` 与 `:focus-visible`。
   - 问题：当前 `#F4C430` 对 `#F6F4EE` 的计算对比度仅 **1.49:1**，低于非文本焦点指示至少 3:1 的目标；dark focus 对 canvas 为 13.43:1，没有同样问题。
   - 期望：为亮色主题使用能与 canvas 和 surface 均达到 ≥3:1 的深金色，例如 `#8A6400`（对当前 canvas 约 4.89:1，对 surface 约 5.20:1），或实现经计算验证的双色 focus ring。保留 dark 的高对比黄色即可。
   - 验收：在反馈/模块记录中列出 light focus 对 `--canvas` 和 `--surface` 的计算比值；两者均 ≥3:1。forced-colors 的 CanvasText outline 继续保留。

2. **[High] 将手机语言链接提升到至少 44×44px。**
   - 位置：`@media (max-width: 767px)` 下 `.mobile-language-control a`。
   - 问题：当前明确写为 `min-width: 40px; min-height: 40px`，低于本模块 44px 触控目标。
   - 期望：两个语言链接都使用 `min-width/min-height: 44px`；不能通过缩小 Menu 或隐藏语言来腾空间。
   - 验收：源码值 ≥44px；按 320px viewport 的容器公式静态核算，品牌仍有可用宽度且 header 不需要横向滚动。

3. **[High] 提升交互控件边界与相邻 surface 的对比度。**
   - 位置：`.segmented`、`.mobile-menu summary`、`.mobile-theme-options button`；header/footer 的装饰分隔线不在此要求内。
   - 问题：这些控件使用 `--border-subtle`；当前 light `#D8D4CA` 对 surface 为 **1.43:1**，dark `#353A43` 对 surface 为 **1.49:1**，不能证明控件边界达到本模块 ≥3:1 目标。
   - 期望：交互控件改用 `--border-strong` 或新建语义 `--border-control`，当前 `--border-strong` 对 surface 的比值约为 light 3.38:1、dark 4.02:1。普通 section/header 装饰边线仍可使用 subtle，避免整体变重。
   - 验收：明确计算 light/dark 控件边界对 surface 均 ≥3:1；selected、hover、focus 状态仍有区别。

4. **[Medium] 让移动菜单高度对 200% 文本缩放与内容换行自动适应。**
   - 位置：`BaseLayout.astro` 的 `syncMobileMenuSpace()`；CSS 的 `.site-header`、`.mobile-menu-panel`。
   - 问题：菜单 panel 绝对定位，header padding 只在 toggle/viewport resize 时把一次性的 `scrollHeight` 写入 CSS 变量。若 text-only zoom、自定义文本间距、字体加载或内容换行改变 panel 高度而不触发 window resize，缓存高度可能过小，panel 会覆盖后续正文或越出 header。本轮没有浏览器 200% 测试，不能据当前实现勾选该验收项。
   - 期望：优先改为 CSS 正常文档流展开，不使用像素高度同步；若保持绝对 panel，则用能响应内容尺寸变化的窄实现（如 `ResizeObserver`）并在关闭时清理。无论方案为何，DOM/键盘顺序保持品牌 → menu/nav → language，Esc 返回 summary 焦点。
   - 验收：源码层面 panel 高度不再依赖仅在 toggle/resize 计算的一次性值；记录 200% 文本缩放仍需在 Module 06 做浏览器验证。

5. **[Medium] 提供真正的不透明 `backdrop-filter` 回退。**
   - 位置：`.site-header` 的连续两个 `background` 声明。
   - 问题：`background: var(--surface)` 立即被 `background: var(--header-surface)` 覆盖；不支持 `backdrop-filter` 的浏览器仍得到 94% 半透明背景，并非模块要求的不透明回退。
   - 期望：默认使用 `--surface`；仅在 `@supports (backdrop-filter: blur(...))` 或对应 WebKit 支持块内启用 `--header-surface` 和 blur。
   - 验收：无 filter 支持时从 CSS cascade 得到不透明 `--surface`，支持时才得到半透明 + blur。

6. **[Medium] 对齐已定义的最小排版基线。**
   - 位置：`body` 与 `.brand-copy small`。
   - 问题：总体方案的 body baseline 为 `1rem / 1.7`，当前仍为 `line-height: 1.6`；品牌副标题为 `0.66rem`（约 10.6px），低于方案规定的 12px 最小短标签字号。
   - 期望：body line-height 改为 1.7；品牌副标题使用 `var(--text-xs)`，可相应收紧 margin/letter spacing 以维持 header 高度，不降低字号。
   - 验收：源码中正文 line-height 1.7，品牌副标题 ≥0.75rem；tablet header 仍允许自然增高。

## Responsive and accessibility notes

- **Desktop**：源码证明 ≥1024px 为三列单行 header，主导航 current 状态有粗体 + 2px underline，页脚两层完整。尚未做浏览器截图，不能断言 1024px 临界点无视觉拥挤；Round 2 不需要为此提前重排，只需避免上述修复增加不可换行的最小宽度。
- **Tablet**：768–1023px 明确使用两行 grid，四个主入口仍显示；语言与三态主题文字完整。静态结构符合设计。未做 768px 真实渲染，header 在 200% text-only zoom 下是否换行仍未实证。
- **Mobile**：≤767px 的 `details` 导航和三态主题完整，当前页有文字状态；但语言链接只有 40×40，必须修复。菜单高度依赖一次性 JS 像素值，因此 200% 文本缩放验收目前不能通过。
- **Keyboard/theme**：原生 summary、链接和 button 具有合理 DOM 顺序，Escape 会关闭并把焦点还给 summary；主题状态使用 `aria-pressed` 且两组同步。亮色 focus token 的 1.49:1 是当前最重要的键盘可见性缺陷。强制色模式已有 CanvasText 回退，应保留。
- **Contrast calculations**：静态计算得到 primary/canvas 16.13:1 light、16.44:1 dark；secondary/canvas 5.56:1 light、9.27:1 dark；accent/canvas 5.71:1 light、8.12:1 dark，正文 token 基本成立。未做浏览器抗锯齿、透明叠加或截图取色验证。

## Round 2 acceptance

- [x] Light focus indicator 对 canvas 和 surface 均 ≥3:1；dark/forced-colors 无回退。
- [x] 手机 EN 与中文链接均至少 44×44px，320px header 静态宽度仍成立。
- [x] Segmented、mobile Menu、mobile theme button 的边界在 light/dark 对 surface 均 ≥3:1。
- [x] 移动菜单展开高度不再依赖 toggle/resize 时的一次性 `scrollHeight`，内容增高不会覆盖正文。
- [x] 不支持 `backdrop-filter` 时 header 使用不透明 surface。
- [x] body line-height 为 1.7，brand subtitle ≥0.75rem。
- [x] `aria-current`、同路径语言、Auto/Light/Dark 同步、Escape 焦点返回和 footer 内容保持不变。
- [x] `npm run build` 与 `git diff --check` 通过；中英首页与一篇 publication 构建产物仍含正确 header/footer 状态。
- [x] 不包含 Module 02 及后续模块的提前视觉改动。

## Final verification — Round 2

**PASS — 2026-08-21**

逐项证据：

- `--focus` 已改为 light `#8A6400` / dark `#FFD84D`。按 WCAG 相对亮度公式重新计算：light focus 对 canvas **4.89:1**、对 surface **5.20:1**；dark focus 对 canvas **13.43:1**。forced-colors 的 `CanvasText` outline 保留。
- 新增 `--border-control`，light / dark 对各自 surface 分别为 **3.38:1** / **4.02:1**；`.segmented`、mobile summary、mobile theme buttons 均使用该 token，装饰边界仍可保持 subtle。
- `.mobile-language-control a` 的最小宽高均为 44px。320px 视口按 CSS 盒模型静态核算：shell 288px、header 内部约 262px，Menu 56px + language segmented 约 96px + 两个 8px gap 后仍为品牌保留约 94px；品牌可截断保护仍存在。
- 移动 `details` 通过 `display: contents` 将 summary 放在 grid 第一行、panel 跨三列进入第二行正常文档流；源码和构建产物均无 `scrollHeight`、`syncMobileMenuSpace` 或菜单高度 CSS 变量。内容换行会自然增高，不再依赖 toggle/resize 的高度快照。
- `.site-header` 默认 `background: var(--surface)`；只有 `@supports` 命中标准或 WebKit backdrop filter 时才切到半透明 `--header-surface` 并 blur，不透明回退成立。
- `body` 为 `line-height: 1.7`；品牌副标题为 `var(--text-xs)` = 0.75rem。tablet header 没有固定高度。
- `aria-current`、同路径语言链接、两组三态主题同步、Escape 关闭并返回 summary 焦点、两层 footer 均保留。重新生成的英文/中文首页与 ZIP 详情均包含 mobile menu、两组三态主题和 footer；详情页 Research current 状态正确。
- `npm run build` 于最终复核重新执行并成功，生成 **32 pages**；英文与中文各 6 篇详情，`/posts/zip/` 仍 refresh/canonical 到 `/publications/zip/`。`git diff --check` 通过。
- 与 Round 1 捕获的源码基线比较，Round 2 变更限定在本反馈要求的 foundation/header/theme 修复，没有提前重排 Module 02 的首页内容结构。

证据边界：本次按任务要求仅做源码、构建产物、静态盒模型和对比度复核；没有浏览器截图、真实点击、真实设备或 200% 视觉缩放测试。因此 PASS 表示 **Module 01 源码级设计验收通过**；320/375/768/1024/1280/1440 的实际渲染、200% text zoom、forced-colors 与主题视觉回归仍须在 Module 06 的最终浏览器 QA 中验证，不能从本次 PASS 外推为已完成该最终矩阵。
