# Module 06 — 全站响应式、可访问性与最终一致性

## 范围

在前五个模块完成后进行跨页面收口：响应式边界、触控与键盘、对比度、主题、文本缩放、空状态、动效、图像稳定性和视觉一致性。此模块允许修复跨模块问题，但不新增页面或功能。

## 当前风险基线

- 现有 CSS 使用 960px / 700px 两个 desktop-first 断点，与计划的 768 / 1024px 内容范围不一致；
- 一些字体和间距仍以固定值存在，长标题与双语文本在 200% 缩放时可能溢出；
- hover 位移广泛用于 card/list，触屏没有等价反馈；
- reduced-motion 只缩短 transition，但未检查所有 transform 是否需要完全取消；
- 主题 meta color 能切换，但页面组件可能仍有旧 token 或透明混色导致对比不足；
- 筛选、mobile menu、details、主题控件等增强脚本需要无 JS/键盘检查；
- 方法图和头像缺少统一的尺寸/加载策略；
- 目前没有专门的 `prefers-contrast` 与 forced-colors 收口验证。

## 目标

- 证明网站在桌面、平板、手机功能完整，而非仅视觉上不溢出；
- 对中英首页、archive、至少两篇代表详情、四类次级页完成一致性检查；
- 所有关键交互满足键盘、触控与 reduced-motion；
- 统一剩余旧 token、圆角、边线、字号和空白节奏；
- 构建与路由不因视觉修改回退。

## 响应式方案

### Narrow（320–767px）

- 所有主要页面单栏；仅允许标签、按钮、meta 等局部 flex 换行；
- 页面边距 16px，卡片内部 16–20px；章节垂直间距 64px；
- 最小验证宽度 320px；不能通过隐藏关键功能来通过；
- 无页面级横向滚动；方法图、长标题、作者、email、URL 必须换行；
- 所有交互 44×44px 或具有等效可点击区域；
- sticky header 展开后不得遮住当前焦点。

### Regular / tablet（768–1023px）

- 页面边距 24px，8 列；章节间距 80px；
- 同时验证 768×1024 竖屏与 1024×768 横屏；
- 双栏内容任一正文列不应小于约 42ch；否则改为单栏；
- 不能依赖 hover 发现链接；平板触控下所有行动常显；
- header 两行或 compact menu，不能简单隐藏 nav。

### Wide（≥1024px）

- 页面边距 32px，内容最大 1200px；章节间距 112px；
- 1280 和 1440px 下内容保持居中，不无限拉长；
- 正文最大 68ch；辅助 rail 不挤压正文；
- 大屏只增加留白与列宽，不增加无意义装饰。

## 可访问性方案

### 键盘与语义

- 每页 Tab 顺序：skip link → header → main content actions → footer；
- skip link 聚焦可见并将焦点移到 `#content`；
- 主导航当前页、语言、主题、筛选状态均有程序化状态；
- `details/summary` 使用原生语义；不把 `div` 伪装成按钮；
- 链接目的可从文本或上下文理解；孤立箭头必须有 accessible name；
- 每页一个 `h1`，后续标题不跳级。

### 视觉与文本

- 普通文字对比度 ≥4.5:1，大字 ≥3:1，UI 状态/边界 ≥3:1；
- 亮暗主题分别检查，不以 light 通过推断 dark 通过；
- 200% 文本缩放：无裁切、覆盖、功能损失；
- 文本间距覆盖测试：line-height 1.5、paragraph spacing 2em、letter spacing 0.12em、word spacing 0.16em 时内容仍可读；
- `prefers-contrast: more` 提高 subtle border 和 secondary text；
- forced-colors 下链接、按钮、focus、selected tag 仍可辨识。

### 动效

- 默认 transition 120–200ms；避免同时改变多个大面积属性；
- hover 只使用 1–2px 位移且不是必要反馈；列表可完全不用位移；
- `prefers-reduced-motion: reduce` 下取消 `transform`、smooth scroll 和非必要过渡；
- 不使用入场动画、滚动视差或自动播放。

## 图片与性能

- 首屏头像稳定占位，可 `loading="eager"` / `fetchpriority="high"`；
- 首屏以下论文图 `loading="lazy" decoding="async"`；
- 图像保留真实论文内容，不用 CSS `cover` 裁方法图；
- 不添加字体下载或 JS UI 框架；
- 客户端脚本保持小而独立：主题、筛选、mobile menu；无 JS 时主要内容、链接与语言路由仍可访问；
- 不为了 Lighthouse 分数隐藏内容或延迟核心文本。

## 视觉一致性收口

- 全站只能出现三种圆角：8px control、12px surface、999px short chip；头像图可遵循 surface；
- 普通卡无大阴影；只有 sticky header/浮层使用轻阴影；
- `accent` 只用于链接、当前状态、少量 eyebrow；不把整段正文染蓝；
- section 编号只用于真实结构，删除与信息无关的 `01/02` 装饰；
- 页面 hero、section heading、body、meta、tag 对应固定 type token；
- 中英文逐页比较，功能和内容层级相同，但换行允许自然不同。

## 精确验证矩阵

至少检查以下页面：

| 页面 | English | 中文 |
| --- | --- | --- |
| Home | `/` | `/zh/` |
| Archive | `/publications/` | `/zh/publications/` |
| Detail — 图文 | `/publications/2025-07-31/zip/` | `/zh/publications/2025-07-31/zip/` |
| Detail — 长标题/作者 | `/publications/2024-12-21/interact-with-me/` | `/zh/publications/2024-12-21/interact-with-me/` |
| Writing | `/writing/` | `/zh/writing/` |
| Post detail | `/writing/2026-08-24/sinusoidal-position-encoding/` | `/zh/writing/2026-08-24/sinusoidal-position-encoding/` |
| Topics | `/topics/` | `/zh/topics/` |
| About | `/about/` | `/zh/about/` |
| CV | `/cv/` | `/zh/cv/` |

尺寸：320×568、375×812、768×1024、1024×768、1280×800、1440×900。
主题：Light / Dark / Auto（系统各测试一次）。
输入：keyboard-only、touch-sized viewport。
缩放：100% / 200%。

## 精确实现指引

1. `global.css` 最终改为 mobile-first 的基础样式，再用 `@media (min-width: 768px)` 和 `@media (min-width: 1024px)` 扩展；若全面改写风险过高，可保留 max-width，但断点与规则必须无重叠冲突。
2. 用 `rg` 检查旧 token（`--paper`, `--ink`, `--signal` 等）和未规范圆角/阴影；迁移完成后不应由页面组件继续引用旧角色。
3. 检查所有 interactive selectors 的 `:hover` 是否有 `:focus-visible` 或静态可见状态；不要用全局 `a:hover` 引起正文跳动。
4. 检查所有 `img` 的 alt、尺寸、loading；装饰图才允许空 alt，当前主要图均非装饰。
5. 检查 theme 脚本、filter 脚本和 mobile menu 在 DOM 变化后的空值安全；不添加通用异常吞噬。
6. 构建后检查生成的 32 个左右路由（以实际构建为准），重点确认中英、6 篇详情和 legacy redirects。
7. 视觉 QA 应记录具体 viewport/page/theme 问题；只修复可复现问题，不做无边界“再润色”。

## 涉及文件

- `src/styles/global.css`
- `src/layouts/BaseLayout.astro`
- `src/components/*.astro`（仅跨模块修复）
- `src/pages/**/*.astro` / `src/pages/sitemap.xml.ts`（只验证路由，非必要不改）
- `public/images/**` / `public/publications/**`（只验证，不生成替代内容）

## 最终验收清单

### 源码、构建与模拟脚本（已验证）

- [x] 验证矩阵中的 16 个中英代表页面均生成静态 HTML；lang、alternate、唯一 h1、标题连续、main focus target 与内部路由可由构建产物验证。
- [x] Narrow / tablet / Wide 的断点、16/24/32px gutter、64/80/112px section 节奏和 1200px 最大容器均已落实；源码没有隐藏关键功能或 `overflow-x: hidden` 掩盖。
- [x] 导航、语言、主题、筛选与 Paper/Code/Demo 在中英 DOM 中同构；已知短交互目标具备 44×44px 源码保证。
- [x] theme mock 覆盖 Auto / Light / Dark、无效 storage 归一、持久化、theme-color、重复控件、Auto system change 与 mobile Escape；filter mock 覆盖有效/无效 `?tag=`、count、summary、URL、pressed 与结果同步。
- [x] 全局 focus、skip target、aria-current/pressed/live、原生 details/summary 和标题语义存在；代表构建页没有无名称孤立箭头或 `target="_blank"`。
- [x] 主文字、secondary、accent、focus 与 control border 的 light/dark token 组合通过公式对比；linked Task/Goal tags 使用常驻 underline 与 ≥3:1 control border。
- [x] reduced-motion、prefers-contrast 与 forced-colors 有明确 scoped CSS 回退；不存在入场动画、视差或自动播放。
- [x] 方法图使用 contain、头像无 filter/grayscale；构建图片具有非空 alt、真实 width/height 和 async decoding，首屏头像使用 eager/high priority。
- [x] 中英文同构，无某一语言独有的失效入口；12 个详情各有 4 sections/anchors 与按 JSON 条件输出的资源。
- [x] Draft/Pending 状态诚实，无假文章、假 PDF、download 属性或伪链接。
- [x] `/posts/` 与 6 个旧论文链接静态重定向到正确 archive/detail；sitemap 有 24 个唯一中英 URL。
- [x] `npm run build` 成功报告 32 pages；258 项独立静态断言为 0 失败，`git diff --check` 通过，当前 package 无新增 UI/字体依赖。
- [x] 所有前五模块的 Round 1、设计反馈、Round 2 和源码级验收记录已填写。

### 真实前台与辅助技术矩阵（NOT TESTED）

- [ ] 320×568、375×812、768×1024、1024×768、1280×800、1440×900 下无横向滚动、遮挡、断裂或不合理视觉空白。
- [ ] 手机/平板真实 touch 下可完成导航、语言、主题、筛选和 Paper/Code/Demo，点击区域没有误触或遮挡。
- [ ] 200% browser zoom 与自定义 line/paragraph/letter/word spacing 下无裁切、覆盖或功能损失。
- [ ] keyboard-only 完整 traversal 的顺序合理，sticky header/menu 不遮挡焦点，所有关键任务可完成。
- [ ] VoiceOver/NVDA 等辅助技术能正确读出导航、筛选状态、结果更新、引用、图片与详情结构。
- [ ] Light / Dark / Auto 在真实绘制、刷新和系统切换中无错误主题或明显闪烁，肖像与论文图视觉权重合适。
- [ ] prefers-contrast 与 forced-colors 在真实系统模式中保持 focus、link、selected filter/tag 和 UI 边界可辨识。
- [ ] 真实页面中方法图无裁切、头像不去色，图片加载没有明显布局跳动。

## 两轮执行记录

- Round 1 程序员实现：`DONE — 2026-08-21`
  - 响应式收口：将首页残留的 700px 窄屏规则并入 767px 边界，使 Narrow 范围内 section heading、planned writing 与 About 摘要统一单栏；移动品牌移除 ellipsis/nowrap，允许文本与自定义字距自然换行。静态容器核算为 320→288、375→343、768→720、1024→960、1280/1440→1200px，gutter 分别为 16/24/32px；未用 `overflow-x: hidden` 掩盖问题。
  - 视觉一致性：完成临时 `--paper / --ink / --muted / --line / --serif` 等旧角色到语义 token 的迁移并删除 aliases；literal radius 全部收口到 8/12/999px tokens，普通内容不再用大面积 shadow；archive/page/section/card/meta 字号复用既有 type tokens，中文剩余标题字距放松为 `-0.015em`。
  - 触控与焦点：skip target 的 `main#content` 增加 `tabindex="-1"`；首页 `.text-button` 与两处引用来源链接至少 44px；publication row 增加 `:focus-within` 等价背景。移动 header、筛选、详情资源、Topics 与次级页面既有 44/48px 规则保持。
  - 链接语义：BaseLayout footer、首页 research/resources/actions、archive rows 与详情返回链接的装饰箭头均拆入 `aria-hidden="true"`；中英文首页 Poincaré 出处同步本地化且复用现有 Gutenberg URL。构建 HTML 扫描验证矩阵页面没有暴露的无名称孤立箭头。
  - 动效与高对比：删除不可点击 Draft essay 的 hover padding 位移；导航当前线改为 opacity 而非 scale transform；`prefers-reduced-motion` 明确取消 button/toast transform，保留 instant state；forced-colors 为链接使用 `LinkText` 并延续 selected/focus outlines。按 WCAG 相对亮度公式计算，light/dark secondary text 对 canvas 为 5.56:1/9.27:1、control border 对 surface 为 3.38:1/4.02:1、accent 对 canvas 为 5.71:1/8.12:1、focus 对 canvas 为 4.89:1/13.43:1。
  - 图片稳定性：首页 ZIP 方法图与四个有图详情补入与真实资产一致的 intrinsic width/height；论文图继续 lazy/async/contain，首页与 About 肖像为 400×400 eager/async/high priority、无 filter。`profile.jpg` hash 保持 `6cde3d51e2284cb966ec7f8a4631c9461c72b217`。
  - 脚本静态执行：在 mock DOM 中执行构建脚本，验证 Auto 初始态、显式 Dark、恢复 Auto 后的系统 dark change、theme-color/localStorage/重复控件同步，以及 Escape 关闭 mobile details 并将焦点返回 summary；筛选脚本验证 `goal:efficiency` 恢复为 2 results、无效 tag 归一为 All/6 results，并同步 URL、pressed、count 与 summary。
  - 构建/路由：`npm run build` 成功生成 32 pages；24 个中英内容页均为单一 `h1` 且标题无跳级，12 个详情均保留 4 个 anchors/sections 与两组条件资源；archive 中英各 6 cards、25 个同步 filter buttons、3 个 mobile details，Topics 各 12 个带单位链接，Writing/CV 诚实状态不回退；sitemap 24 个 URL 唯一，`/posts/` 与 6 个旧详情均指向正确新路径。`git diff --check` 通过。
  - 证据边界：按 Sites 委派线程规则未打开浏览器、截图或执行 DOM 点击/resize；因此不把 320–1440px 真实横向滚动、200% zoom/自定义文本间距、keyboard traversal、屏幕阅读器、touch 或 Light/Dark/Auto 视觉结果写成实测通过，留给设计师 Round 1 反馈与最终前台复核。
- 设计师反馈：`DONE — 2026-08-21 · NEEDS REVISION`（见 `docs/design/feedback/06-round-1.md`）
- Round 2 程序员修订：`DONE — 2026-08-21`
  - 触控目标：为 brand、主导航、archive filter，以及首页 profile / feature-paper、footer、secondary-actions 的短链接补齐源码可证的双向 `44px` 最小触控尺寸；现有语言、主题、资源按钮和移动菜单规则不变。
  - 标签可发现性：链接型 taxonomy tag 常驻 underline；Task / Goal 链接边框使用 `--border-control`，Method 仍保留 accent、非链接 span 仍紧凑，并在 `prefers-contrast: more` / forced-colors 下保持可辨识边界。按既有主题 token 计算，control border 对 light/dark surface 为 3.38:1 / 4.02:1。
  - 节奏与圆角：首页及全站 `.section` 在 Narrow / tablet / Wide 分别为 64 / 80 / 112px；404 的 `Return home` 继续复用 `.button`，其基础圆角从 chip 收口为 8px `--radius-control`。
  - 主题恢复：head 预加载脚本与 body controller 均只接受 `auto | light | dark`；无效 storage 会归一为 `auto` 并写回，mock 验证 `sepia` 在系统 dark 下呈现 dark、两处 Auto 均为 pressed，显式 Dark 持久化及 Auto 系统变化仍正常。
  - 静态门禁：源码断言确认指定短 targets 均同时具备 `min-width` / `min-height`，linked Task / Goal 标签存在常驻链接 affordance 与高对比回退，section 三档间距与 control radius 生效；mock filter 验证有效 `goal:efficiency` 为 2 results、无效 tag 回到 All / 6 results；24 个中英内容页标题层级、12 个详情结构、24 个 sitemap URL、7 个 legacy 路由与 12 个图片页面检查均无失败。
  - 构建/边界：`npm run build` 成功生成 32 pages，`git diff --check` 通过且无新增依赖。遵循 Sites 委派线程限制，仍未把真实 viewport、200% zoom/文本间距、完整 keyboard/AT/touch 与主题视觉检查写成已通过；这些留给设计师最终验收。
- 最终全站验收：`SOURCE-LEVEL PASS — 2026-08-21`（见 `docs/design/feedback/06-round-1.md` 的 Final verification；真实 viewport、zoom、keyboard/AT、touch 与主题/forced-colors 视觉矩阵仍为 `NOT TESTED`，不等于 FULL VISUAL PASS）
