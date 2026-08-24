# Module 01 — 全局基础、导航与主题

## 范围

建立后续模块共用的 token、页面容器、排版基础、焦点规则、顶部导航、语言切换、三态主题和页脚。此模块不重排首页研究内容。

## 当前问题

- token 以具体观感命名（`paper`、`ink`、`signal`），颜色角色与组件用途耦合；
- 全页点阵背景增加视觉噪音，在论文图和长文页面尤其明显；
- header 以超大胶囊呈现，多个胶囊嵌套，视觉权重偏高；
- `max-width: 960px` 时直接隐藏 `.main-nav`，平板与手机失去主页面入口；
- 手机端隐藏 Auto 主题按钮，三态功能不完整；
- 主导航没有当前页面状态；主题按钮只用 `A/☀/☾`，理解成本较高；
- 页脚在小屏只剩零散文本，缺少主要导航与联系入口；
- 缺少 `prefers-contrast` / forced-colors 的基础处理。

## 目标

- 建立稳定、语义化、可复用的全站视觉基础；
- header 轻量、清楚、在所有宽度可完整导航；
- 主题和语言控件保持紧凑，但状态对键盘与屏幕阅读器明确；
- 页面从 320px 到宽屏均具有一致边距和关键对齐线。

## 设计方案

### 桌面（≥1024px）

- 页面容器最大 1200px，左右 32px；header 顶部 16px，固定高度约 64px；
- header 使用三列：品牌 4 列、主导航 4 列、控件 4 列；
- 外形为 12px 圆角矩形而非大胶囊，背景 `--surface` 约 94% 不透明，仅保留轻微 blur 和小阴影；
- 品牌显示 `YM` 方圆角标、`Yiming Ma` 与 `Research notebook`；标记从正圆改为 40×40、10px 圆角；
- 主导航当前项使用 2px 底线与 `aria-current="page"`；hover 不能是唯一状态；
- 语言控件保留 EN / 中文；主题控件显示 Auto / Light / Dark 的短文本，必要时桌面可配简单字符图标；
- 页脚两层：第一层品牌说明与页面导航，第二层 Scholar / GitHub / LinkedIn / Email 及 copyright；总高度由内容决定。

### 平板（768–1023px）

- header 两行：第一行品牌 + 语言/主题，第二行完整主导航；
- 主导航 4 项均可见、左对齐，第二行顶部用细线分隔；
- header 不强制固定高度，文字放大时可自然增高；
- 控件可使用 Auto / ☀ / ☾，但每项仍有完整 `aria-label` 和 title。

### 手机（320–767px）

- 第一行：品牌文字 `Yiming Ma`、Menu 按钮、语言入口；主题放入菜单；
- 使用原生 `<details class="mobile-menu">`，summary 触控目标至少 44×44px；展开层位于 header 下方，按 Research / Writing / Topics / About / Theme 顺序展示；
- 菜单项为整行 48px 高链接，当前页同时有文字“Current / 当前”和左侧 3px 蓝线；
- EN / 中文仍保持同路径切换；Auto / Light / Dark 三项全部保留；
- 展开菜单不覆盖页面主要内容，不依赖 hover，Esc 能由浏览器/后续轻脚本关闭；若纯 `details` 无法可靠处理 Esc，可添加极小脚本；
- 页脚单栏，页面链接 2×2 排列，社交链接换行。

## 交互与可访问性

- `BaseLayout` 根据当前 `path` 为对应主导航设置 `aria-current="page"`；
- 主题使用 radio-group 语义或一组 `aria-pressed` 按钮，不能混用；保留早期 head 脚本以避免主题闪烁；
- 每个控件可见焦点使用 3px `--focus`，forced-colors 下使用 `outline: 2px solid CanvasText`；
- sticky header 获得 `scroll-margin-top` 对应值，锚点跳转不被遮挡；
- 触控目标最小 44px；相邻目标至少 8px 间隔；
- 文本缩放 200% 时 header 允许换行或菜单化，不裁切；
- `backdrop-filter` 不可用时用不透明 surface 回退；
- 当前页、当前主题、当前语言均不能只靠颜色表达。

## 精确实现指引

1. 在 `:root` / dark theme 中按总体方案替换为语义色彩 token，同时建立字号、间距、圆角、容器 token；可暂时保留旧 token 作为本模块内的迁移桥，但完成模块前应将当前组件切到新 token。
2. `body` 改为纯 `--canvas`，删除点阵 radial-gradient；长页面可在单个章节使用 `--surface-subtle` 区分，不做全页纹理。
3. `.site-shell` 使用 `width: min(var(--container), calc(100% - 2 * var(--page-gutter)))`，三个断点更新 `--page-gutter`。
4. `BaseLayout.astro` 计算当前 nav，补 `aria-current`；增加 desktop/tablet nav 和 mobile `details` 的一致链接集合，避免复制文案数据。
5. 主题按钮的可见文本应清楚；如果手机菜单复用同一 `data-theme-choice`，现有脚本需同步更新所有同值按钮的 `aria-pressed`。
6. header 的 DOM 顺序保持品牌 → nav → 控件；移动布局不得用 CSS `order` 改变键盘顺序。
7. 页脚加入主导航和现有 `site` 社交链接；邮件用 `mailto:`。
8. 加入 `@media (prefers-contrast: more)` 和 `@media (forced-colors: active)` 的基础边界/焦点规则。

## 涉及文件

- `src/layouts/BaseLayout.astro`
- `src/styles/global.css`
- `src/lib/site.ts`（仅当需要共享导航/标签文案；不要改变站点内容事实）

## 验收清单

- [x] Desktop header 单行、tablet 两行、mobile 可展开，4 个主导航入口从不消失。
- [x] 当前页面具有可见状态和 `aria-current="page"`。
- [x] EN / 中文切换保持当前路径。
- [x] Auto / Light / Dark 在手机上均可操作，刷新后偏好保留。
- [x] 键盘可依次访问品牌、主导航、语言、主题和菜单；焦点清晰。
- [x] 320px 宽和 200% 文字缩放无截断或页面横向滚动。（源码结构与静态宽度通过；实际视觉缩放纳入 Module 06。）
- [x] header 无胶囊套胶囊的强烈视觉；普通页面背景无点阵噪音。
- [x] 亮暗主题正文、链接、控件边界满足 AA 对比目标。
- [x] 页脚在三种宽度下均有页面与联系入口。

## 两轮执行记录

- Round 1 程序员实现：`DONE — 2026-08-21`
  - 变更：在 `global.css` 建立 light/dark 语义色彩、排版、间距、圆角、容器与焦点 token；保留后续模块使用的旧 token 迁移别名；页面背景改为纯色。
  - 变更：`BaseLayout.astro` 增加基于当前路径的 `aria-current`，桌面单行 header、平板两行 header，以及保留四项导航和三态主题的手机原生 `details` 菜单；语言切换继续保持同一路径。
  - 变更：移动菜单按实际内容高度扩展 header，并支持 Escape 关闭；桌面和移动主题控件复用 `data-theme-choice`，继续使用既有预加载脚本与 `site-theme` localStorage，同值控件状态同步。
  - 变更：页脚改为页面导航、Scholar / GitHub / LinkedIn / Email、copyright 和返回顶部两层结构；加入 `prefers-contrast: more` 与 `forced-colors: active` 基础规则。
  - 响应式静态检查：CSS 分别在 ≥1024、768–1023、≤767 使用桌面单行、平板两行、手机菜单结构；页面 gutter 为 32 / 24 / 16px，对应 1280 / 768 / 320px 验收宽度。委派程序员线程未做浏览器截图或视觉判断，留给 Round 1 设计评审。
  - 构建证据：`npm run build` 通过，生成 32 个静态页面；英文/中文 publication 输出均包含同路径语言链接、当前页状态、移动菜单与两组三态主题控件；`/posts/zip/` legacy redirect 仍指向 `/publications/zip/`。
  - 质量证据：`git diff --check` 通过。
- 设计师反馈：`DONE — 2026-08-21 · NEEDS REVISION`（见 `docs/design/feedback/01-round-1.md`）
- Round 2 程序员修订：`DONE — 2026-08-21`
  - Focus：light `--focus` 调整为 `#8A6400`；按 WCAG 相对亮度公式计算，对 `--canvas #F6F4EE` 为 **4.89:1**，对 `--surface #FCFBF8` 为 **5.20:1**。dark `#FFD84D` 与 forced-colors `CanvasText` 规则保持不变。
  - 控件边界：新增 `--border-control`，light / dark 分别为 `#8B8982` / `#767B86`；对各自 surface 的计算比值为 **3.38:1** / **4.02:1**。segmented、Menu summary 与移动主题按钮均迁移到该 token，selected / hover / focus 状态保留区分。
  - Mobile：语言链接提升为 44×44px。320px 视口下 shell 为 288px、header 内容宽 264px；Menu 最小 56px、语言 segmented 约 96px、两处 gap 共 16px，为品牌保留约 96px，不需要横向滚动。
  - 菜单稳健性：移动端 `details` 使用 `display: contents`，summary 位于第一行、panel 作为跨三列的第二行进入正常 grid 文档流；删除一次性 `scrollHeight` / resize 高度同步，内容换行会自然撑开 header。Escape 关闭并返回 summary 焦点的脚本保留。
  - 回退与排版：header 默认不透明 `--surface`，只在 `@supports` 检测到标准或 WebKit `backdrop-filter` 时启用 94% surface 与 blur；body line-height 改为 1.7，brand subtitle 改为 `--text-xs`（0.75rem）。
  - 构建证据：`npm run build` 通过，仍生成 32 个静态页面；中英页面、6 篇详情与 legacy route 均生成。
  - 质量证据：`git diff --check` 通过；源码搜索确认已无 `scrollHeight`、`syncMobileMenuSpace`、菜单高度 CSS 变量或 ResizeObserver 依赖。
- 模块验收：`PASS — 2026-08-21`（源码级设计验收；最终浏览器矩阵见 Module 06）
