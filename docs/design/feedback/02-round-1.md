# Module 02 — Round 1 design feedback

## Verdict

**NEEDS REVISION**

Round 1 已完成最重要的内容层级重构：姓名是页面主语，研究主张先于名言，Publications 是唯一高权重入口，头像保持原色并去掉作品集式阴影。Round 2 不需要推翻方向，只需修复一个桌面/宽平板网格空档、一个不符合本模块动效约束的按钮位移，并把 hero 内两处小于 12px 的文字归入既定 token。

证据范围：本评审完整阅读总体方案、Module 02、`HomePage.astro` 和相关 `global.css`，重新构建并检查 `dist/index.html`、`dist/zh/index.html`。没有进行浏览器截图、像素测量、真实点击或设备测试；所有 desktop/tablet/mobile 判断均明确为 DOM、CSS grid 和静态盒模型证据，不冒充视觉实测。

## What works

- 英文与中文首页分别只输出一个 `h1`，内容为 `Yiming Ma` / `马一铭`；Wittgenstein 名言已移入独立 `blockquote.hero-quote`。
- eyebrow → name → research thesis → intro → actions 的 DOM 顺序清楚。即使不读名言，`Computer vision · Multimodal learning` 和“计数、融合与推理”的主张也能说明定位。
- Publications 是唯一实心主按钮；Writing 改为常显、带下划线的低权重文字链接，两个入口目的明确。
- hero 使用 12 列：copy 7 列、空 1 列、profile 4 列；profile 的顶部 margin 与 thesis 起始线在 1024/1280 静态计算中接近，符合关键线意图。
- 768–1023px 使用 8 列 5+3；768–839px 明确改为上下布局并限制 profile 最大 300px，避免正文列在窄平板继续受挤压。
- ≤767px 为单栏；DOM 自然得到 copy → profile → quote。主按钮 100% / 48px，Writing link 48px；≥480px profile 横向，<480px 图上文下；没有 `vh` 或强制 min-height。
- 头像仍是仓库原图：`HEAD:images/profile.jpg` 与 `public/images/profile.jpg` 的 Git blob 均为 `6cde3d51e2284cb966ec7f8a4631c9461c72b217`。CSS 无 `filter`、profile hover 或 profile shadow；原色资产没有被替换或去色，也没有装饰编号。
- 图片声明与真实源尺寸同为 400×400，并由 wrapper `aspect-ratio` 稳定布局；alt、eager、async decoding 和 high fetch priority 均存在。
- 个人卡底部只保留姓名、研究定位/所在地和 Scholar / GitHub，两个链接至少 44px 高。
- 引文来源有中英 accessible name，箭头链接至少 44×44px；所有 hero 行动常显，不依赖头像 hover。
- 中文姓名与 thesis 将负字距放松到 `-0.015em`，中文 thesis 行高 1.02/1.04，方向正确。
- 静态对比度计算：主按钮 light/dark **16.13:1 / 16.44:1**，secondary text **5.56:1 / 9.27:1**，accent link **5.71:1 / 8.12:1**。
- `npm run build` 重新执行成功，生成 32 pages；中英产物保留姓名 h1、两个入口、profile 和 pull quote。`git diff --check` 通过。

## Required changes for Round 2

1. **[High] 让宽屏 quote 紧跟左侧 actions，而不是被整张 profile 卡推到下一行。**
   - 位置：`src/styles/global.css` 的 `.hero-copy`、`.profile-card`、`.hero-quote` 及 768–839px reset。
   - 问题：在 ≥840px 的同一 grid 中，copy 和 profile 占隐式第一行，quote 是隐式第二行。第一行高度由带 4:5 图像和 body 的完整 profile card 决定；因此即使左侧 actions 已结束，quote 仍必须等到 profile 底部以后才开始，形成结构性的左侧空档，也违背“名言放在 intro/actions 下方”的模块方案。这个结论来自 CSS grid placement，不是截图观察。
   - 期望：在 ≥840px 明确建立两行：copy 位于 row 1，quote 位于 row 2，profile 从 row 1 跨至 row 2；例如使用 `.hero-copy { grid-row: 1; }`、`.hero-quote { grid-row: 2; align-self: start; }`、`.profile-card { grid-row: 1 / span 2; }`。也可采用等价结构，但 quote 的起点必须由左侧 copy/actions 决定，而不是由 profile 底部决定。
   - 响应式约束：在 768–839px 与 mobile 必须重置显式 row，使自然顺序仍为 copy → profile → quote；不能用 CSS `order` 改变键盘/阅读顺序。
   - 验收：源码可证明 ≥840px quote 在左列第二行且 profile 跨行；≤839px 三者按 DOM 顺序各占一行。

2. **[High] 删除 hero 主按钮的悬停位移，并在 reduced-motion 下显式无 transform。**
   - 位置：全局 `.button:hover`、hero scoped override、`@media (prefers-reduced-motion: reduce)`。
   - 问题：`.button:hover { transform: translateY(-2px) }` 仍作用于首页主按钮；reduced-motion 只把 transition 压到 0.01ms，transform 本身仍会瞬间发生。本模块规定 hero 动效只允许头像 1–2% 或边框变化，而当前头像已无需动画，按钮位移没有必要。
   - 期望：以 hero-scoped 规则令 `.hero .button:hover { transform: none; }`，并把 `.hero .button` 的 transition 改为颜色/背景/边框而非 transform；reduced-motion 下对 `.hero .button` 显式 `transform: none !important`。保留清晰的 hover 色/边界反馈与 Module 01 focus ring。
   - 验收：hero button 的 default/hover/focus/reduced CSS 中均无有效位移；Writing link 仍有非位移 hover/focus 反馈。

3. **[Medium] 将 hero eyebrow 与 profile links 提升到既定 12px 最小 token。**
   - 位置：`.eyebrow`（仅需 hero scoped override，避免提前改其它模块）、`.profile-links a` / `.profile-card .profile-links a`。
   - 问题：hero eyebrow 为 `0.72rem`（约 11.52px），profile links 为 `0.74rem`（约 11.84px）；两者都低于总体方案对短 eyebrow/元数据的 12px 下限，也没有复用 `--text-xs`。
   - 期望：`.hero > ...` 对应 eyebrow 或 `.hero .eyebrow` 与 profile link 使用 `var(--text-xs)` = 0.75rem。不要靠增大 letter spacing 抵消字号；触控高度继续 ≥44px。
   - 验收：hero eyebrow、Scholar、GitHub 的 computed source token 均为 `--text-xs` 或 ≥0.75rem；不提前统一 Module 03/05 的其它元数据。

## Responsive and accessibility notes

- **Desktop**：12 列比例和 profile/thesis 顶部静态对齐成立；1280×800 的内容尺寸推算支持“研究定位、主行动和头像主体可见”，但没有真实 viewport 截图，不能声称像素级通过。当前 quote 的隐式第二行确实由 profile 高度控制，是 Round 2 的主要布局缺陷。
- **Tablet**：840–1023px 采用 5+3，正文估算仍有约 45ch 以上；768–839px 已切上下布局。Round 2 添加显式 grid rows 时必须在 ≤839px reset，否则 profile 跨行会破坏自然单列顺序。
- **Mobile**：单栏、48px 主按钮、无 vh、479px profile 断点均由源码证明。320px 无横向滚动是结构性推断，尚未做浏览器实测；长中文与 200% zoom 留 Module 06。
- **Accessibility**：唯一 h1、alt、blockquote/cite、44px links、焦点 token和 DOM 顺序正确。主按钮 hover 位移在 reduced-motion 中仍存在，需要修复。外链箭头为辅助字符，链接文字/accessible name 本身能说明目的。
- **Theme**：hero 只使用语义 token/迁移别名，light/dark 关键文字对比度静态通过。未截图验证透明、抗锯齿或色彩感知。

## Round 2 acceptance

- [x] ≥840px quote 紧跟左侧 copy/actions 的 grid row，profile 跨两行；≤839px 保持 copy → profile → quote。
- [x] Hero 主按钮 hover 与 reduced-motion 均无 translate/scale，仍有清楚的非位移反馈和 focus ring。
- [x] Hero eyebrow、Scholar、GitHub 均使用 ≥0.75rem 的文字 token，链接触控高度仍 ≥44px。
- [x] 页面唯一 h1 仍为 Yiming Ma / 马一铭，research thesis 与 intro 文案事实未改变。
- [x] Publications 仍是唯一实心主操作；Writing 常显且为低权重文字链接。
- [x] 头像文件 blob 未变，CSS 无 filter、profile shadow、装饰编号或依赖 hover 的信息。
- [x] 768–839 与 <480 响应式 profile 规则无回退；无 vh / 强制首屏高度。
- [x] 中英文 source/build 结构同构，alt 和 quote source accessible name 保留。
- [x] `npm run build`、`git diff --check` 通过，首页之外没有 Module 03+ 的提前改动。

## Final verification — Round 2

**PASS — 2026-08-21**

逐项证据：

- 默认/≥840px 规则明确为 `.hero-copy { grid-row: 1 }`、`.hero-quote { grid-row: 2 }`、`.profile-card { grid-row: 1 / span 2 }`。quote 的 track 现在属于左列内容流，profile 跨两行，不再要求 quote 等待 profile 后另开隐式行。
- `@media (max-width: 839px)` 将 copy/profile/quote 的 `grid-row` 全部恢复为 `auto`。768–839px 中 copy 与 quote 跨 8 列、profile 占前 4 列；根据 DOM 与 grid auto-placement 顺序分别落在 row 1 / 2 / 3。≤767px 三者同为单列，继续保持 copy → profile → quote。
- `.hero .button` 的 transition 仅包含 background/border/color；`.hero .button:hover` 为 `transform: none`，以 accent 背景提供反馈。reduced-motion 中 default/hover 又以 `transform: none !important` 固化，无 translate/scale；Module 01 focus outline 未修改。
- `.hero .eyebrow` 和 `.profile-card .profile-links a` 均覆盖为 `var(--text-xs)` = 0.75rem；profile links 的 `min-height: 44px` 保留。
- `HomePage.astro` 仍只有一个 `<h1 class="hero-name">`；英文/中文 research thesis、intro、主次入口文本和 href 未改变。构建产物分别输出唯一的 `Yiming Ma` / `马一铭` h1，以及各一个 thesis、secondary link、profile 和 quote。
- Publications 仍是唯一 `.button-primary`；Writing 仍为 `.hero-secondary-link`。主按钮 hover 的 accent/text 静态对比仍使用已验证的语义组合，focus 由 Module 01 的高对比 token 提供。
- `public/images/profile.jpg` 与 `HEAD:images/profile.jpg` 的 blob 再次核对，均为 `6cde3d51e2284cb966ec7f8a4631c9461c72b217`。profile 对应 CSS 范围无 filter、shadow、hover 或装饰编号；原图保持 400×400 intrinsic declaration，alt 和优先加载属性保留。
- 768–839px 的 300px profile 限制、≤767px compact profile、<480px 图上文下仍存在。hero/source 中没有 `100vh` 或强制 viewport min-height。
- `npm run build` 于最终复核重新执行成功，生成 **32 pages**；`git diff --check` 通过。对 Round 1 捕获的基线核对，Round 2 只改 Module 02 指定 CSS，没有提前变更研究展示和 Module 03+ 结构。

证据边界：本次是源码、构建产物、静态 grid/盒模型与资产 hash 复核，没有浏览器截图、实际 1280×800 首屏测量、真实 320/768 viewport、200% zoom 或主题视觉测试。因此 PASS 表示 **Module 02 源码级设计验收通过**；这些真实渲染项目继续保留在 Module 06 的最终浏览器矩阵中。
