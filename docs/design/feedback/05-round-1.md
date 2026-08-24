# Module 05 — Round 1 design feedback

## Verdict

**PASS WITH MINOR CHANGES**

Round 1 已把 Writing、Topics、About、CV 收束成一致的次级页面系统。四页使用同一短 hero 节奏；Writing 如实呈现 3 个不可点击的拟写主题；Topics 从当前 6 篇内容动态计算 12 个标签数量；About 以正确姓名与研究定位先行并保留原色肖像；CV 在 PDF 缺失时只呈现状态与替代入口。Round 2 无需调整布局或内容架构，只需补回 About 引文的现有来源入口，并统一 Writing/About 装饰箭头的辅助技术语义。

证据范围：本评审完整阅读总体方案、README、Module 05、`WritingPage.astro`、`TopicsPage.astro`、`AboutPage.astro`、`CvPage.astro`、相关 `site.ts` 数据与完整 `global.css`；重新构建并检查 8 个中英静态页面、标签计数/链接、标题序列、Writing 条目、About 肖像资产和 CV 标签属性。没有进行浏览器截图、真实 320/768/1280 viewport、鼠标/触摸、键盘完整 traversal、屏幕阅读器、200% zoom 或 light/dark 视觉测试。以下 desktop/tablet/mobile 判断来自 DOM、CSS grid、媒体查询和构建 HTML，不冒充视觉实测。

## What works

- 四页 hero 均使用 `.page-intro`：最大宽度 900px，桌面为 72/64px、768–1023px 为 64/48px、≤767px 为 48/40px 上下节奏；h1 使用 `--text-h2` 而不是首页 display token，lead 限制为 64ch。Writing/CV 的状态位通过 flex-wrap 与正文解耦。
- Writing 构建结果中英各有 3 个 `.writing-plan-item`，均为原生 `article` 且内部没有 `<a>`；没有 pointer cursor、hover 位移或伪链接规则。每项常显 `Draft topic / 拟写主题`，区块说明也明确“不是已发表文章、暂不可点击”。
- Writing 桌面为 1+2+7+2 的 12 列职责，平板改为序号/领域 2 列与内容 6 列，状态并入 meta 区；手机隐藏纯装饰编号，以领域 + 状态 → h3 → summary 单栏展示。末尾仅有用途明确的 mailto 推荐入口，没有新增表单。
- Topics 直接读取 `getCollection("publications")` 并按 publication tags reduce 计数；当前 hero 明示 6 publications / 6 篇论文。构建结果中英各有 12 个同语言 `?tag=` 链接，数量完全一致：Task 为 3/3，Method 为 1/1/2/1/1，Goal 为 1/1/1/2/1。
- Topics 数量包含正确单位与英文单复数：`1 paper`、`2/3 papers`、`N 篇论文`；箭头已 `aria-hidden`，链接的可访问名称仍包含类别化标签与数量。查询值由 `encodeURIComponent` 输出，中英文分别指向 `/publications/` 与 `/zh/publications/`。
- Topics 桌面为 group heading 3 列 + index 9 列，index 内两列；平板为 2+6 且仍两列；≤767px 为 heading 后单列链接。链接始终至少 48px，label 使用 `min-width: 0`/`overflow-wrap: anywhere`，手机数量允许换行，没有固定宽度或横向滚动容器。
- About 唯一 h1 为 `Yiming Ma / 马一铭`，姓名和研究定位在 DOM 中先于肖像、自述与名言；构建标题序列为 h1 后连续 3 个 h2：Research interests、Working principles、Contact 及其中文对应。
- About 两段自述和 interests/principles 只重组首页、当前 6 篇研究与既有研究定位中的事实，没有新增学校、学位、机构、职级、时间线或未证实成果。Poincaré 内容使用 `blockquote` + `cite`，最大 52ch；联系方式和 Research/CV/Email actions 与 social links 分层。
- About 图片引用 `/images/profile.jpg`，没有 `filter` 或 `grayscale`；当前 `public` 资产与 `HEAD:images/profile.jpg` 的 SHA-1 均为 `f933e6d4152184430a3dddbe9bebf155dbdce1b3`，说明保留的是原色源肖像。桌面为 4+1+7，平板为 3+5，手机单栏且肖像最大 320px。
- CV hero、h2、`dl` 和 note 多次明示 Pending / 待添加。中英构建页各有 1 个 `dl`、3 个 `dt`，Language/Format/Status 与中文字段对等；仓库 `public/` 没有 PDF，构建产物也没有 `.pdf` href 或 `download` attribute，因此没有假下载或失效按钮。
- CV 替代入口中英均为 Scholar、同语言 About 与用途明确的 Email request；三者是原生链接、至少 44px，并用 `aria-hidden` 箭头。桌面为 8/4 两栏，768–1023px 和手机均变为单栏，短页由 `.site-shell` 的 flex/min-height 承托 footer。
- 全部 8 页构建产物各有唯一 h1，标题层级无跳级；全局 `:focus-visible` 为 3px outline，链接目标满足 44/48px 规则，状态由明确文字而非颜色独立表达。`prefers-contrast: more` 加强 status/action 边线，`forced-colors` 为 status、link list、Topics、CV 与 quote 恢复 `CanvasText` 边界。
- `npm run build` 重新执行成功，生成 **32 pages**；`git diff --check` 通过。

## Required changes for Round 2

1. **[Medium] 在 About pull quote 中补回已有的庞加莱引文来源入口，并让中英文出处对等。**
   - 位置：`src/components/AboutPage.astro` 的 `.about-pull-quote cite`。当前 About 仅显示作者与书名；首页同一引文已经保留 Project Gutenberg 来源 `https://www.gutenberg.org/files/39713/39713-h/39713-h.htm`。
   - 问题：详情式 About 页面反而丢失现有出处，削弱学术网站的可追溯性；中文 quote 下的 cite 也完全是英文，未达到本模块的中英呈现对等。
   - 期望：复用首页现有来源 URL，在 cite 内加入来源链接；链接必须具有中英文可理解的 accessible name。中文 cite 可显示 `亨利·庞加莱，《科学与假设》`，或在保留英文专名时用正确 `lang="en"` 标注；不要新增或改写引文内容，不改变 pull quote 布局。
   - 验收：中英文 About 构建页的 blockquote 均含同一真实来源链接；链接 accessible name 分别说明“庞加莱引文出处”/“Source for the Poincaré quotation”；可见出处在两种语言下语义完整。

2. **[Low] 将 Module 05 中 Writing/About 的装饰箭头从链接可访问名称中分离。**
   - 位置：`WritingPage.astro` 的 `Suggest a question / 推荐一个问题` mailto；`AboutPage.astro` 的 Research/CV/Email actions 与 Scholar/GitHub/LinkedIn links。Topics 与 CV 已使用单独的 `span[aria-hidden="true"]`，但上述链接仍把 `→/↗` 直接写进文本节点。
   - 问题：同一模块的可访问名称规则不一致，辅助技术可能把纯装饰箭头读成链接文字；About social links 也无法复用 `.link-list` 已有的 label/icon 两端布局。
   - 期望：将可读 label 和箭头拆为两个 span，并给箭头 `aria-hidden="true"`；保留所有 href、可见箭头、文案、目标窗口与 44px target，不新增 `aria-label` 覆盖原生可见文案。
   - 验收：Writing 与 About 构建 HTML 中这些箭头均位于 `aria-hidden="true"` 元素；链接的可见文字、href 和现有布局不回退，Topics/CV 无需改动。

## Responsive and accessibility notes

- **Desktop**：共享 900px intro、Writing 12 列、Topics 3+9、About 4+1+7 与 CV 8/4 都有明确 CSS 证据；模块内容无固定高度。未做 1280px 浏览器截图，不能声称真实首屏行数或引用/肖像的像素级平衡已经视觉通过。
- **Tablet**：768–1023px 使用 8 列；Writing 状态移入 2 列 meta，Topics 为 2+6，About 为 3+5，CV 变单栏。所有文本区均有 `minmax(0, 1fr)`、可换行或 `min-width: 0`；768px 真实文字缩放后的行分布仍留 Module 06 视觉复核。
- **Mobile**：≤767px 四页进入自然单栏，page intro 为 48/40px，Writing 编号隐藏、Topics 链接 48px 且单列、About 肖像最大 320px、CV `dl` 单列。源码没有页面级 fixed width、nowrap 状态或内容定高；320px 的实际横向滚动与触控表现仍需真实 viewport 验证。
- **Keyboard / screen reader**：原生 headings、article、blockquote/cite、dl 与 links 结构成立，交互有全局 focus。两个 Required changes 用于补足来源可达性和清理装饰字符的 accessible name；未运行真实键盘 traversal、屏幕阅读器或语音输出。
- **Theme / contrast**：组件只使用语义 token，status 有文字和边线，quote 有内容/边线，Topics 有类别/数量文本；高对比与 forced-colors 有 scoped 边界。未截图检查 light/dark 下肖像周边、次级文字与 accent 的真实视觉权重。
- **200% text / content boundary**：DOM/CSS 无固定内容高度，mobile 断点为长文本提供单栏与换行，因此不存在源码可见的裁切机制；但本轮没有真实 200% zoom。About 事实仅能与当前首页、site 数据、publication 内容和 legacy 资产对照，不代表外部履历事实核验。

## Round 2 acceptance

- [x] About 中英文 blockquote 均保留现有 Project Gutenberg 来源 URL，并提供本地化、可理解的 accessible name。
- [x] About cite 的中英文可见出处语义对等；引文正文与事实不被 Round 2 改写。
- [x] Writing mailto、About actions 与 About social links 的装饰箭头均为独立 `aria-hidden="true"` span；可见 label 与 href 不变。
- [x] 四页继续共享短 hero；desktop/tablet/mobile 栅格、Writing 非链接状态、Topics 48px 单列和 About 320px 肖像不回退。
- [x] Topics 继续从 6 篇 publication 动态输出 12 个同语言 `?tag=` 链接，计数/单位保持 3/3、1/1/2/1/1、1/1/1/2/1。
- [x] About 继续以 `Yiming Ma / 马一铭` 为唯一 h1，原色 `profile.jpg`、三段 h2 层级和事实边界不回退。
- [x] CV 中英页继续各有 1 个 `dl`/3 个 `dt`，无 `.pdf` href/download attribute，Scholar/About/Email 三个替代入口可用。
- [x] `npm run build` 与 `git diff --check` 通过；Round 2 不修改 publication JSON、taxonomy、CV 文件状态或其它模块布局。

## Final verification — Round 2

**PASS — 2026-08-21**

逐项证据：

- `AboutPage.astro` 的中英文 pull quote 现在都包含同一 `https://www.gutenberg.org/files/39713/39713-h/39713-h.htm` 来源。英文链接可访问名称为 `Source for the Poincaré quotation`，中文为 `庞加莱引文出处`；可见 cite 分别为 Henri Poincaré / *Science and Hypothesis* 与亨利·庞加莱 / 《科学与假设》。引文正文、两段自述、interests/principles 和其它事实没有被 Round 2 扩写。
- `WritingPage.astro` 的推荐问题 mailto、`AboutPage.astro` 的 Research/CV/Email 三个 actions 与 Scholar/GitHub/LinkedIn 三个 social links，均把可见 label 与箭头拆开；7 个链接的箭头全部在 `span[aria-hidden="true"]` 中。构建 HTML 去除 hidden span 后的 accessible names 分别保留 Suggest a question / 推荐一个问题及对应 About 文案，href 未改变。
- 四页仍使用 `.page-intro`、`--text-h2` 与 900px/64ch 限制；CSS 继续保留桌面 12 列、768–1023px 8 列和 ≤767px 单列规则。Writing 中英构建页仍各有 3 个 `article`、条目内部 0 个链接；状态文本、无 hover 位移和无 pointer cursor 结构未回退。
- Topics 中英构建页仍各有 12 个同语言 `?tag=` 链接，计数保持 Task 3/3、Method 1/1/2/1/1、Goal 1/1/1/2/1；英文单复数和中文 `篇论文` 单位正确。CSS 仍在手机把 index 改为单列，并为链接保持 48px 最小高度。
- About 中英构建页继续各有唯一姓名 h1、3 个连续 h2、1 个 blockquote 与同一 `/images/profile.jpg`。当前 public 肖像和 legacy `HEAD:images/profile.jpg` 的 SHA-1 仍同为 `f933e6d4152184430a3dddbe9bebf155dbdce1b3`；样式没有 filter/grayscale，手机最大宽度仍为 320px。
- CV 中英构建页继续各有 1 个 `dl`、3 个 `dt` 和 Scholar/About/Email 三个替代入口。`public/` 仍无 PDF，产物没有 `.pdf` href 或 `download` attribute；Pending / 待添加、中英分别提供 PDF 的说明和 8/4 → 单栏布局未变。
- 8 个代表页面继续各有唯一 h1，Writing/About/Topics/CV 标题序列无跳级；全局 focus outline、44/48px 交互目标、对比模式和 forced-colors 规则仍存在。
- `npm run build` 于最终复核重新执行成功，生成 **32 pages**；`git diff --check` 通过。

证据边界：本次为源码、构建 HTML、静态 DOM/CSS、当前 content 数据和资产哈希复核，没有浏览器截图、真实 320/768/1280 viewport、鼠标/触摸、键盘完整 traversal、屏幕阅读器、200% zoom 或 light/dark 视觉测试。因此 PASS 表示 **Module 05 源码级设计验收通过**；真实渲染、输入方式、缩放与主题矩阵继续保留在 Module 06。
