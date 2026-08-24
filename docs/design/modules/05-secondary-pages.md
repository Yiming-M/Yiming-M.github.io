# Module 05 — Writing、Topics、About、CV 次级页面

## 范围

统一四类次级页面的 page hero、空/待完成状态、列表与个人介绍布局，使它们不像独立模板拼接，同时忠实保留“随笔未发布、CV PDF 尚未提供”的事实。

## 当前问题

- 四个页面都使用很大的 hero 标题，但缺乏一致的宽度、行动和状态表达；
- Writing 的 planned essays 与首页 essay row 外观相近，可能仍被误认为可点击的已发布文章；
- Topics 页每组为 180px + 文字 + 链接三列，平板很快拥挤，且链接缺少对应论文数量；当前数据可以计算数量但尚未呈现；
- About 页使用 sticky 大肖像和超大标题，正文与引用在窄平板形成较长滚动断裂；
- CV 页面只有两格状态，页面底部空、缺少替代入口（About、Scholar、Email）；
- 次级页面没有共享的状态组件/视觉语法，维护时容易漂移。

## 目标

- 形成一致的“短 hero + 任务内容 + 下一步”页面骨架；
- 清楚区分已发布内容、拟写主题和待补文件；
- Topics 成为真正的研究导航，而不是标签展示墙；
- About 保持人物感但以研究观点和联系方式为主；
- CV 在文件缺失时仍然有用、诚实、完整。

## 共享 page hero

- 最大宽度 900px；桌面上下 72/64px，平板 64/48px，手机 48/40px；
- 顺序为 eyebrow → `h1` → lead → 可选 action/status；
- `h1` 使用 `--text-h2` 范围，只有首页使用 display 级字号；
- lead 最大 64ch；不使用独立装饰图或大阴影。

## 5.1 Writing

### 桌面

- hero 右侧可显示小型状态 label：`In preparation / 编辑中`，不是警告 banner；
- 计划列表每项采用 12 列：序号 1 列、领域 2 列、标题 + summary 7 列、状态 2 列；
- 每项不显示箭头、不出现 hover 位移，因为暂不可点击；
- 状态使用 `Draft topic / 拟写主题` 文本 + neutral outline；
- 页面末尾提供邮件入口：“Suggest a question / 推荐一个问题”（仅 mailto，不新增表单）。

### 平板

- 序号/领域 2 列，内容 6 列，状态并入 meta 行；
- summary 最大 60ch。

### 手机

- 单栏，以领域 + 状态作为顶部 meta，标题、summary 顺序排列；
- 删除纯装饰序号或缩为行内；无 hover 行为。

## 5.2 Topics

### 桌面

- 每组用 12 列：group heading 3 列、tag index 9 列；
- tag index 为两列 link list，每个链接显示 label、论文数量和箭头；数量通过 publications collection 计算；
- 三组仍为 Task / Method / Goal，组间用 1px 分隔，不做彩色大卡。

### 平板

- group heading 2 列，tag index 6 列；tag index 仍可 2 列，短标签优先。

### 手机

- 单栏；每组标题后为整行链接列表；每项至少 48px；
- 数量读作 `3 papers / 3 篇论文`，不能只有无语义数字 badge。

## 5.3 About

### 桌面

- 12 列：肖像 4 列、正文 7 列，间隔 1 列；肖像仅在内容未超过其高度时 sticky，否则正常流；
- `h1` 改为姓名或直接介绍性标题；现有“Research should leave more than a number.”作为 lead，而不是最大标题；
- Poincaré 引用置于正文中段的 pull quote，最大 52ch；
- 两段自述后增加三个清晰小节：Research interests、Working principles、Contact。只使用现有事实，不补造履历；
- actions 按 Research / CV / Email，social links 单独一行。

### 平板

- 肖像 3 列、正文 5 列；引用不使用大左缩进；
- 若文字缩放使正文过窄，切单栏。

### 手机

- 顺序：姓名/lead → 3:4 肖像 → 自述 → quote → interests/actions；
- 肖像最大宽度 320px，不强制撑满超宽手机；
- 所有链接常显。

## 5.4 CV

### 桌面

- hero 直接说明 `CV PDF coming soon`，下面状态区使用 8/4 两栏：左侧文件状态，右侧替代入口；
- 文件状态包含语言、格式、状态三个 `dt/dd`，不能渲染假下载按钮；
- 替代入口：Google Scholar、About、Email request；
- 末尾提示中英文 CV 将分别提供，不暗示有合并版本。

### 平板/手机

- 状态区单栏；替代入口成为 44px 高链接列表；
- 页面无需填满视口，但 footer 不应因内容过短贴在 hero 下方，可用 shell 的 flex min-height，而不是人为大 padding。

## 交互与可访问性

- Draft/Pending 元素不能有 pointer cursor、伪链接箭头或 hover 位移；
- 状态不只靠灰色表达，必须写 `Draft topic` / `Pending`；
- Topics 链接的论文数量包含可读单位；
- About 标题层级为 `h1` 后连续 `h2`；blockquote 使用 `blockquote/cite`；
- CV 状态使用 `dl`，无文件时不渲染 `download`；
- 所有 mailto 文案说明目的，不只显示裸邮箱；邮箱可作为次行补充。

## 精确实现指引

1. 为共享 page hero 建立稳定 class，不必抽 Astro 组件，除非至少三个页面 markup 完全一致；优先小改现有组件。
2. `WritingPage.astro` 移除 `status-banner` 的警告外观，改为 inline status；计划条目不使用 `.essay-card:hover`。
3. `TopicsPage.astro` 引入 `getCollection("publications")`，按 tag 计算数量；只计算现有 6 篇，显示动态单位。
4. `AboutPage.astro` 只能重新组织现有事实和链接；如果新增小节缺少真实内容，使用现有两段拆分，不推断教育/职位。
5. `CvPage.astro` 用现有 `site.scholar`、About route 和 email 提供替代路径；不创建空 PDF。
6. 将 shared styles 命名为 `.page-intro`、`.status-label`、`.link-list` 等语义类，避免每页复制一套尺寸。

## 涉及文件

- `src/components/WritingPage.astro`
- `src/components/TopicsPage.astro`
- `src/components/AboutPage.astro`
- `src/components/CvPage.astro`
- `src/styles/global.css`
- `src/lib/site.ts`（仅复用现有链接/文案）

## 验收清单

- [x] 四个页面共享一致的短 hero 节奏，标题不与首页 display 抢权重。
- [x] Writing 的 3 个拟写主题明显不可点击，并有文字状态。
- [x] Topics 每个标签显示正确的现有论文数量，并链接到对应筛选。
- [x] Topics 在 320px 下为单栏 48px 链接，不横向滚动。（单栏、target 与安全换行通过源码验收；真实 viewport 纳入 Module 06。）
- [x] About 肖像保持原色；姓名/研究定位先于名言。
- [x] About 未新增未经证实的职位、教育或研究事实。
- [x] CV 不出现假下载，替代入口 Scholar / About / Email 均可用。
- [x] 中英文状态和链接功能对等。
- [x] 200% 文本缩放时状态、列表与引用不截断。（源码无固定内容高度并有窄屏单栏；真实 zoom 纳入 Module 06。）
- [x] 所有页面标题层级连续，键盘焦点清楚。（静态标题与 focus 样式通过；真实 traversal 纳入 Module 06。）

## 两轮执行记录

- Round 1 程序员实现：`DONE`
  - 四页统一为 `.page-intro` 短 hero，并以 `--text-h2`、900px 最大宽度及桌面/平板/手机 72/64、64/48、48/40px 的纵向节奏控制层级；短 CV 页面由 `.site-shell` 的 flex/min-height 承托 footer。
  - Writing 将 3 个计划主题改为无链接的语义 `article` 列表，常显 `Draft topic / 拟写主题`，保留领域、标题、summary，并增加用途明确的 mailto 入口。
  - Topics 从现有 publications collection 动态统计 Task / Method / Goal 标签数量；12 个标签链接均显示可读单位并指向对应语言的 `?tag=` 筛选。
  - About 将姓名和研究定位置于引用之前，保留原色肖像与原有两段事实，重组为 Research interests、Working principles、Contact，并分离 Research / CV / Email actions 与 social links。
  - CV 使用 `dl` 明示 Language / Format / Status，文件缺失时不渲染 PDF 或 download action；替代入口为 Scholar、About、目的明确的 Email request，中英文分别表述未来文件。
  - 响应式规则覆盖 12 列桌面、8 列平板与 320px 单列；Topics 链接至少 48px，其他交互入口至少 44px，长文本允许换行，并补充 prefers-contrast / forced-colors 边界。
  - 验证：`npm run build` 成功生成 32 个页面；中英文 Writing / Topics / About / CV 均为 1 个 `h1`，Writing 每种语言 3 个不可点击条目，Topics 每种语言 12 个带单位链接，About 每种语言 3 个连续 `h2`，CV 每种语言 1 个 `dl`/3 个 `dt` 且无 PDF href/download attribute；`git diff --check` 通过。
- 设计师反馈：`DONE — 2026-08-21 · PASS WITH MINOR CHANGES`（见 `docs/design/feedback/05-round-1.md`）
- Round 2 程序员修订：`DONE — 2026-08-21`
  - About 的 Poincaré pull quote 复用首页已有 Project Gutenberg URL；英文出处完整显示作者、书名与 `Source for the Poincaré quotation`，中文显示 `亨利·庞加莱，《科学与假设》` 与 `庞加莱引文出处`，来源箭头仅作装饰。
  - Writing mailto、About Research / CV / Email actions、Scholar / GitHub / LinkedIn links 均将可见 label 与箭头拆分，箭头统一置于 `span[aria-hidden="true"]`，href 与原文案不变。
  - 验证：`npm run build` 成功生成 32 个页面；中英文 About blockquote 均包含同一 Gutenberg URL 与本地化来源名称；Writing/About 上述 7 个链接在每种语言下均保留原 href，且 accessible name 不包含装饰箭头；`git diff --check` 通过。
- 模块验收：`PASS — 2026-08-21`（源码级设计验收；最终浏览器与辅助技术矩阵见 Module 06）
