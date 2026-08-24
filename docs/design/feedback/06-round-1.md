# Module 06 — Round 1 design feedback

## Verdict

**NEEDS REVISION**

Round 1 已完成大部分全站源码收口：语义 tokens、断点、圆角集合、标题结构、图像尺寸、reduced-motion、contrast/forced-colors 回退、中英路由和 legacy redirects 都有明确静态证据；生产构建、theme/filter 主路径和代表页面矩阵也未发现功能回退。不过，仍有五项可由源码直接修正的问题，不能只留给浏览器 QA：若干短操作没有 44×44px 的双向保证，可点击 Task/Goal 标签缺少静态可辨识边界，首页 section 间距未落实 64/80/112px 节奏，无效主题存储值未归一化，404 主按钮仍使用 pill 圆角。

证据范围：本评审完整阅读总体方案、README、Module 06、前五模块的最终验收记录、当前 layout/components/pages/content/CSS，并复核静态构建产物、路由/标题/图片矩阵、颜色公式与 mock DOM 中的 theme/filter 脚本。`npm run build` 重新成功生成 32 pages，`git diff --check` 通过。按照 Sites 委派评审边界，本轮**没有**打开真实浏览器，也没有截图、DOM click/resize、320–1440px 视觉检查、200% zoom/自定义文本间距、完整键盘 traversal、屏幕阅读器、touch、Light/Dark/Auto 或 forced-colors 视觉测试；以下响应式与可访问性结论只覆盖源码和构建证据，未测试项不会写成通过。

## What works

- 响应式边界已统一为 ≥1024px wide、768–1023px tablet、≤767px narrow，并保留 ≤479px 的更窄控制；容器公式静态得到 320→288、375→343、768→720、1024→960、1280/1440→1200px，没有 `overflow-x: hidden`、固定页面宽度或用隐藏关键功能规避溢出的规则。
- 全局旧角色 aliases 已删除，页面只使用 canvas/surface/text/border/accent/focus 等语义 tokens；literal radius 收口为 control 8px、surface 12px、pill 999px，普通卡没有大阴影。当前剩余问题是 404 对 token 的选择，而不是出现第四种圆角。
- 全局 `:focus-visible` 为 3px focus outline，skip link 指向可聚焦的 `main#content[tabindex="-1"]`；mobile menu 使用原生 `details/summary`，Escape 会关闭并把焦点还给 summary。构建后的 16 个中英矩阵页每页均有唯一 h1，后续标题无跳级，孤立装饰箭头不进入 accessible name。
- `prefers-reduced-motion` 关闭 smooth scroll、按钮/toast transform 并把非必要 transition 降为瞬时；`prefers-contrast: more` 强化 secondary text 与 subtle borders；forced-colors 为 links、focus、selected filters/tags 和主要边界恢复系统色。未发现入场动画、视差或自动播放。
- 主文字/次文字、accent、focus 和 control border 在 light/dark 下的静态对比计算达到设计目标：secondary/canvas 为 5.56:1 与 9.27:1，accent/canvas 为 5.71:1 与 8.12:1，focus/canvas 为 4.89:1 与 13.43:1，control border/surface 为 3.38:1 与 4.02:1。
- 所有构建图片都有非空 alt、真实 intrinsic width/height 和 async decoding；首屏肖像为 400×400 eager/high-priority 且无 filter/grayscale，论文图为 lazy/async 并使用 contain，不裁方法图。当前原色 `profile.jpg` 与 legacy 资产 hash 一致。
- theme 静态脚本在合法值下支持 Auto、显式 Light/Dark、持久化、重复控件同步、theme-color 更新和 Auto 下系统变化；filter 对有效 `goal:efficiency` 恢复 2 条结果，对无效 `?tag=` 归一为 All/6 条，并同步 URL、两组 pressed 状态、count、summary 和 `aria-live` 区域。
- 构建产物包含 24 个唯一 sitemap URL、完整中英 Home/Archive/6 Detail/Writing/Topics/About/CV 路由，以及 `/posts/` 和 6 个旧详情的正确 redirect。12 个详情仍各有 4 个 anchors/sections，Paper/Code/Demo 按内容条件输出；Writing/CV 的 Draft/Pending 状态继续诚实，没有假文章、假 PDF 或 download 链接。

## Required changes for Round 2

1. **[High] 为 header 与已知短独立操作补足 44×44px 的双向触控目标保证。**
   - 位置：`src/styles/global.css` 的 `.brand`、`.main-nav a`、`.filter-chip`、`.profile-card .profile-links a`、`.feature-paper .paper-links a`、`.footer-nav a`、`.footer-links a`、`.secondary-actions a`。
   - 问题：这些目标多数只有 `min-height: 44px`，没有 `min-width: 44px`；`.main-nav a` 两个方向都没有最小值。短文案如 `All`、`CV`、`Code`、`Email` 在触控环境下不能由源码保证 44×44px。品牌标记自身为 40×40px，窄屏隐藏标记后 brand anchor 也没有明确最小高度。tablet 仍常显主导航，因此不能把它视为纯桌面鼠标入口。
   - 期望：给 `.brand` 至少 `min-height: 44px`；将 `.main-nav a` 设为 inline-flex、居中并至少 44×44px；给上述 filter/profile/paper/footer/secondary action groups 的独立短链接或按钮增加 `min-width: 44px`。不要把该规则扩散到正文行内链接，也不要用 fixed width、overflow 隐藏或删除 tablet 导航来通过。
   - 验收：从源码可证明上述已知短目标的 border box 两个方向均 ≥44px；320px header grid、tablet 两行 header、filter wrap 与 footer wrap 规则仍成立。

2. **[High] 让可点击 Task/Goal taxonomy tags 在静态、非 hover 状态下同时具有链接 affordance 和 ≥3:1 可见边界。**
   - 位置：`src/styles/global.css` 的 `.tag-row a.taxonomy-tag` 与 `data-kind="task|goal"` 规则。
   - 问题：Task link 使用透明边线和 `--accent-soft` 背景，背景相对 canvas 仅约 1.09:1/1.43:1；Goal link 使用 `--border-subtle`，相对 canvas 仅约 1.35:1/1.63:1。它们与同样样式的非交互 span 只有 hover 时才通过下划线/边线区分，平板、触控和键盘浏览前无法静态识别为链接。Method 的 accent 边界已足够，不需降级。
   - 期望：给可点击 taxonomy anchor 提供常驻、非颜色独占的可辨识方式；优先为 Task/Goal anchor 使用 `--border-control`，其当前 light/dark 对 canvas 和 surface 均达到约 3.18–4.38:1，同时保留 `Task:/Goal:` 文本前缀、category 色义、44px 高度、hover/focus 与 forced-colors。也可使用同等明确的常驻下划线，但不得继续只靠 hover 或颜色，并须说明 UI 边界如何满足本模块标准。
   - 验收：linked `a.taxonomy-tag` 与同类非交互 `span` 在无 hover、light/dark 和触控语境下可由静态样式区分；Task/Goal 可点击边界达到 3:1，Method、selected/filter 和 forced-colors 状态不回退。

3. **[Medium] 将首页 `.section` 垂直节奏落实为 narrow 64px、tablet 80px、wide 112px。**
   - 位置：`src/styles/global.css` 当前 `.section { padding: clamp(6rem, 10vw, 10rem) 0; }` 及两组响应式媒体查询。
   - 问题：当前公式在 320/375px 为 96px、768px 为 96px、1024px 约 102px、1280px 为 128px、1440px 为 144px；既偏离总体/M06 的 64/80/112px tokens，也重新引入用户此前指出的过量顶部/章节空白。
   - 期望：以明确断点设置 `.section`：wide 112px、768–1023px 80px、≤767px 64px；可用现有 spacing token 或等值 rem。只调整首页通用 section，不把 publication detail 的阅读节奏或 page intro 一并压缩。
   - 验收：CSS 在三个范围分别只解析为 64/80/112px，不再随 viewport 无上限漂移；section heading/card 的既有 grid 与 border 不变。

4. **[Medium] 对 `localStorage.site-theme` 做 allowlist 归一化，并保持 head/body 两段脚本一致。**
   - 位置：`src/layouts/BaseLayout.astro` head 中的 early theme script 和 body 末尾 theme controller。
   - 问题：两段都直接信任 `localStorage.getItem("site-theme")`。若历史/手工值为 `sepia` 等未知字符串，head 会设置 `data-theme="sepia"`，body 的三个 controls 全为 `aria-pressed="false"`；页面虽然因 CSS fallback 近似 light，却不再表达 Auto 状态，也不跟随系统变化。
   - 期望：两段脚本共同只接受 `auto | light | dark`，其它值回退为 `auto`；可选择把存储修复为 `auto`，但首屏 resolved theme、theme-color、重复控件和系统变化必须一致。不要引入新的主题或依赖。
   - 验收：mock DOM 以 `site-theme="sepia"` 启动时，resolved theme 跟随系统偏好、两组 Auto controls 均 pressed、theme-color 正确且无异常；合法 Auto/Light/Dark、持久化和 Escape 行为继续通过。

5. **[Low] 让 404 的基础主按钮使用 control 圆角而不是 pill。**
   - 位置：`src/styles/global.css` 的基础 `.button` 与 `src/pages/404.astro` 的 `Return home`；首页 hero 已有 `.hero .button` control override。
   - 问题：基础 `.button` 使用 `--radius-pill`，因此 hero 之外的 404 单一主行动仍为胶囊形。设计规范把 999px 保留给短 chip，把普通 control 定为 8px。
   - 期望：将基础 `.button` 改为 `--radius-control`，或为 404/compact page 提供等价的局部 control override；不要改变 filter/taxonomy/status chips 的 pill 语义。
   - 验收：404 Return home 构建后仍为有效链接、≥44px，计算圆角为 8px；全站仍只使用现有三种 radius tokens。

## Responsive and accessibility notes

- **Desktop（≥1024px）**：1200px 最大容器、12 列职责、68ch 正文限制和 detail rail/main 布局均有 CSS/DOM 证据；1280/1440 的容器数学成立。首页 section 当前会扩张到 128/144px，需按第 3 项固定为 112px。没有真实 1280×800 或 1440×900 截图，不能判断首屏折线、视觉重心或实际滚动长度。
- **Tablet（768–1023px）**：8 列、24px gutter、两行 header、可见 nav、archive/mobile filter 切换、detail 单栏化规则成立；没有发现把导航或资源隐藏以规避空间的问题。第 1 项必须覆盖 tablet 主导航，第 2 项必须在无 hover 触控语境常显，第 3 项应为 80px。未实测 768×1024 与 1024×768 的遮挡/横向滚动。
- **Mobile（320–767px）**：16px gutter、单栏、mobile menu、100% filter rows、长标题/作者/email 的换行规则存在；关键图片有 intrinsic 尺寸，资源/Topics/详情行动保持可见。第 1 项补全短目标，第 3 项把 section 从 96px 降至 64px。未在 320×568/375×812 真实 viewport 检查 menu 展开后的焦点遮挡、触摸误触或横向滚动。
- **Keyboard / screen reader**：原生链接、按钮、details、headings、`aria-current`、`aria-pressed`、filter `aria-live` 和全局 focus 样式的源码语义成立；Escape 恢复焦点的 mock 路径通过。未进行完整 Tab 顺序、焦点遮挡、VoiceOver/NVDA 或语音输出测试，不能据此宣布 AT 通过。
- **Theme / contrast / forced colors**：合法 theme 与 filter 状态机的静态执行通过，主文字、accent、focus、control border 的公式对比通过；第 2 项是当前已知的 Task/Goal 边界缺口，第 4 项是未知存储值缺口。未进行 Light/Dark/Auto 真实绘制、系统切换闪烁、`prefers-contrast` 或 forced-colors 视觉检查。
- **Zoom / text spacing / motion**：DOM/CSS 没有页面级固定内容高度、break-all 或横向隐藏，reduced-motion 规则覆盖现有 transform/smooth scroll；这些是积极的源码证据，不等于 200% zoom、自定义 text-spacing 或 reduced-motion 真实浏览器验证。本轮没有运行这些测试。
- **Routing / content boundary**：32-page build、24-URL sitemap、12 个中英详情和 7 个 legacy redirects 静态通过；Draft/Pending、条件资源、姓名与原色肖像未回退。没有发布、push 或远端 GitHub Pages 可达性测试。

## Round 2 acceptance

- [x] `.brand`、tablet/desktop `.main-nav a`、filters 及已知短 profile/paper/footer/secondary actions 从源码保证至少 44×44px，且 320px/header/footer/filter 布局未靠隐藏或 overflow 规避。
- [x] linked Task/Goal taxonomy tags 有常驻 link affordance 和 ≥3:1 边界；Method、selected、hover/focus、forced-colors 与类别文本不回退。
- [x] 首页 `.section` 在 ≤767px、768–1023px、≥1024px 分别使用 64/80/112px 垂直 padding，不再由 `clamp(6rem, 10vw, 10rem)` 漂移。
- [x] head/body theme 脚本共同 allowlist `auto|light|dark`；无效存储值回退 Auto，resolved theme、theme-color、两组 pressed 状态和系统变化同步。
- [x] 404 Return home 使用 8px control radius；pill 继续只用于 filter/taxonomy/status 等短 chip，全站没有新 radius literal。
- [x] 合法 theme Auto/Light/Dark、system change、persistence、mobile Escape 与 archive 有效/无效 `?tag=` mock 脚本继续通过。
- [x] 16 个中英矩阵页继续各有唯一 h1、无标题跳级、正确 lang/alternate；12 个详情资源/4 anchors、24-URL sitemap、7 个 legacy redirects 和图片 intrinsic size 不回退。
- [x] `npm run build` 成功生成 32 pages，`git diff --check` 通过；无新增依赖、假 PDF、假文章、target blank、旧 token/断点或 overflow 掩盖。
- [x] Round 2 明确区分源码验收与前台验证：在未进行用户明确要求的浏览器测试时，320–1440px 真实视觉/横向滚动、200% zoom/text spacing、完整 keyboard/AT、touch、Light/Dark/Auto/contrast/forced-colors 视觉矩阵继续标为 **NOT TESTED**，未勾为前台实测，也没有宣称全站前台 QA 已通过。

## Final verification — Round 2

**SOURCE-LEVEL PASS — 2026-08-21**

逐项证据：

- `.brand` 与 `.main-nav a` 现在都同时具有 `min-width/min-height: 44px`；主导航 anchor 为 inline-flex。`.filter-chip`、linked taxonomy tags、首页 profile/feature-paper links、footer links/nav 和 `.secondary-actions a` 也均有双向 44px 源码保证。现有 flex/grid/wrap 规则保留，源码仍无 `overflow-x: hidden`。
- linked taxonomy anchor 常驻 underline；Task/Goal anchor 另用 `--border-control`，Method 保留 accent border，非链接 span 不被统一放大。重新计算 control border 对 light/dark canvas 为 3.18:1/4.38:1、对 surface 为 3.38:1/4.02:1；`prefers-contrast` 与 forced-colors 对 linked tags 的边界规则仍存在。
- 基础 `.section` 为 `7rem`，tablet override 为 `5rem`，narrow override 为 `--space-16`，对应 112/80/64px；旧的首页 section clamp 已不再控制该 selector。其它 page/detail 独立阅读间距没有被这项修订重写。
- head early script 与 body controller 均只接受 `auto|light|dark`，未知值写回 `auto`。对构建产物执行 mock DOM：`sepia` + system dark 得到 dark resolved theme、dark theme-color 和两组 Auto pressed；显式 Light 持久化、回到 Auto 后的 system change、Escape 关闭 mobile menu/恢复 summary focus 均通过。
- 基础 `.button` 使用 `--radius-control`，因此 404 Return home 为 8px control；全站 `border-radius` 仍只引用 8/12/999 三个既有 tokens。filter/taxonomy 等短 chips 继续使用 pill。
- archive 构建脚本 mock 中，`goal:efficiency` 显示 2 publications、两组对应按钮 pressed、Goal summary 与 URL 同步；无效 `bad:tag` 回到 All/6 publications、清除 query 并恢复三个默认 summary。
- `npm run build` 在最终复核重新成功，报告 **32 pages**；独立静态检查覆盖 32 个 HTML 产物、16 个中英代表页、12 个详情、24 个 sitemap URL、7 个 legacy redirects、全部构建图片和两段 theme 脚本，共 **258 项断言、0 失败**。代表页均为正确 lang、唯一 h1、连续标题、可聚焦 main、6 个重复 theme choices 且无 `target="_blank"`；12 个详情均保留 Problem/Idea/Evidence/Limits anchors 和按 JSON 条件输出的 Paper/Code/Demo。
- 构建图片继续具有非空 alt、intrinsic width/height 与 async decoding；源码无肖像 filter/grayscale，论文方法图仍使用 contain。旧角色 token 与 overflow 掩盖不存在；`git diff --check` 通过，当前 package 仍只有 Astro 运行依赖。
- Module 01–05 的 Round 1、独立反馈、Round 2 与源码级 PASS 记录均完整；本次没有改动网页源码，仅完成 Module 06 及工作流文档复核。

证据边界：这是 **源码、构建 HTML、静态 CSS/DOM、内容 JSON、颜色公式和 mock JavaScript** 层面的最终验收。依照 Sites 委派线程规则，本轮没有打开浏览器、截图、DOM click/resize，也没有进行真实 320×568 至 1440×900 viewport、横向滚动、200% zoom/自定义 text spacing、完整键盘 traversal、屏幕阅读器、touch、Light/Dark/Auto 绘制、系统主题闪烁、`prefers-contrast` 或 forced-colors 视觉测试。因此 SOURCE-LEVEL PASS 不等于 FULL VISUAL PASS；这些项目继续明确为 **NOT TESTED**。
