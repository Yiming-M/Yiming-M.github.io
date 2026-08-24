# Yiming Ma Research Notebook — 总体设计方案

> 状态：Step 1 基准方案
> 适用范围：英文与中文全站
> 设计方向：Editorial Research Index（编辑型研究索引）

## 1. 定位与设计命题

这不是一张“论文清单”，而是一份可持续增长的研究手记。访问者应先快速判断马一铭研究什么、代表工作是什么，再按需进入论文的“问题—方法—证据—边界”解释。网站同时服务三类读者：

1. 同行研究者：快速确认研究方向、论文贡献与原始链接；
2. 学生或跨方向读者：通过白话解释建立问题与方法的联系；
3. 招聘、合作或评审者：快速了解个人背景、研究轨迹与联系方式。

总体视觉不模仿某个公司的品牌，而借鉴成熟设计系统中的可复用原则，形成克制、清晰、可信的学术风格。

## 2. 设计目标

### 2.1 核心目标

- **内容先于装饰**：首屏在 5 秒内回答“是谁、研究什么、从哪里开始看”。
- **解释先于罗列**：出版物的研究问题和一句话结论比年份、会议信息更醒目。
- **简约但不匿名**：保留暖纸色、蓝色强调和衬线标题，形成稳定的个人辨识度。
- **一致但不机械**：主页允许表达性排版，索引与详情页采用更高效的生产性排版。
- **双语同构**：中英文的层级、功能和完成度一致；允许句长导致自然换行，不要求逐行镜像。
- **全尺寸可用**：桌面、平板、手机均保留导航、筛选、主题、语言与论文链接等完整功能。

### 2.2 成功感受

页面应该给人“冷静、严谨、开放”的感觉，像一本排版良好的研究期刊，而不是营销落地页、仪表盘或作品集模板。

## 3. 参考设计系统与借鉴原则

用户指定的 [awesome-design-systems](https://github.com/alexpate/awesome-design-systems) 将设计系统定义为原则、最佳实践、组件和语言规范的集合。本方案从其中选择四个与学术内容站最相关的系统，只借鉴原则，不复制品牌资产、字体、组件代码或商标。

### 3.1 IBM Carbon

参考：

- [2x Grid](https://v10.carbondesignsystem.com/guidelines/2x-grid/overview/)
- [Typography strategy](https://carbondesignsystem.com/elements/typography/style-strategies/)
- [Color tokens](https://v10.carbondesignsystem.com/guidelines/color/overview/)

借鉴：

- 使用 8px 基础单元建立间距、网格、图像与组件节奏；
- 用可见的纵横关键线让标题、元数据、正文和操作对齐；
- 区分“表达性排版”和“生产性排版”：首页标题可表达，论文索引与正文优先效率；
- 色彩按角色命名，主题切换只替换值，不改变颜色角色。

### 3.2 GitHub Primer

参考：

- [Layout](https://primer.style/product/getting-started/foundations/layout/)
- [Responsive](https://primer.style/product/getting-started/foundations/responsive)
- [Accessibility fundamentals](https://primer.style/accessibility/foundations/accessibility-fundamentals/)
- [Text resizing and spacing](https://www.primer.style/accessibility/design-guidance/text-resize-and-spacing/)

借鉴：

- 页面保持聚焦、平静、少干扰，沿自然阅读顺序组织内容；
- 响应式意味着功能不丢失，而不只是“排得下”；
- 最小支持 320px 宽视口，并在 200% 文本缩放下不截断内容；
- 使用熟悉、可辨识的链接和控件模式，避免只在悬停时出现关键操作。

### 3.3 Adobe Spectrum

参考：

- [Color system](https://spectrum.adobe.com/page/color-system/)
- [Using color](https://spectrum.adobe.com/page/using-color/)

借鉴：

- 中性色承担结构，品牌蓝只用于链接、选中状态和少量强调；
- 亮暗主题使用语义 token，而不是在组件内写死颜色；
- 颜色不单独表达 Task / Method / Goal，标签必须同时显示文字类别；
- 交互状态必须在亮暗主题下都有清晰的明度变化和焦点标识。

### 3.4 GOV.UK Design System

参考：

- [Layout](https://design-system.service.gov.uk/styles/layout/)
- [Type scale](https://design-system.service.gov.uk/styles/type-scale/)
- [Spacing](https://design-system.service.gov.uk/styles/spacing/)

借鉴：

- 从单栏小屏开始设计，再扩展到多栏；
- 长正文控制在约 65–75 个拉丁字符宽，中文正文控制在舒适的阅读宽度；
- 字号和间距随屏幕响应，而不是等比例压缩桌面版；
- 使用有限、重复的字号与间距点，保持稳定垂直节奏。

## 4. 视觉语言

### 4.1 核心概念

**Warm paper + editorial blue + research grid**：温暖但不复古，理性但不冷漠。背景是轻微暖灰纸色；正文以接近黑色的中性墨色承载；蓝色标记链接、当前状态和研究路径；细线构成页面结构。

### 4.2 保留与收敛

保留：

- 暖纸色背景与亮暗主题；
- 衬线大标题和无衬线正文的组合；
- 蓝色强调；
- 肖像原色展示；
- 论文“问题—想法—证据—边界”的内容结构。

收敛：

- 移除全页点阵背景，避免与正文和论文图争夺注意力；
- 将大面积阴影改为边线、层级色和轻微 elevation；
- 降低圆角泛滥：内容块 12px，功能控件 6–8px，真正的胶囊只用于短标签；
- 首屏名言由主标题降为导语性质的 pull quote，不再占据大部分首屏；
- 不用孤立的装饰编号；编号只表达阅读顺序或栏目结构。

## 5. Design tokens

所有值在 `src/styles/global.css` 的 `:root` 和 `[data-theme="dark"]` 集中定义。组件只能使用语义 token。

### 5.1 色彩

| 角色 | Light | Dark | 用途 |
| --- | --- | --- | --- |
| `--canvas` | `#F6F4EE` | `#111318` | 页面底色 |
| `--surface` | `#FCFBF8` | `#191C22` | 卡片、浮层、导航 |
| `--surface-subtle` | `#EFEEE8` | `#20242B` | 次级区域、悬停 |
| `--text-primary` | `#17181C` | `#F3F1EA` | 标题、正文重点 |
| `--text-secondary` | `#5E626B` | `#B4B7C0` | 正文说明、元数据 |
| `--border-subtle` | `#D8D4CA` | `#353A43` | 分隔线、装饰边界 |
| `--border-strong` | `#8B8982` | `#767B86` | 重要区域边界 |
| `--accent` | `#2455D6` | `#8DA8FF` | 链接、选中、关键强调 |
| `--accent-hover` | `#173DA8` | `#B0C1FF` | 悬停/激活 |
| `--accent-soft` | `#E4EAFC` | `#26304E` | 选中背景、图像占位 |
| `--focus` | `#F4C430` | `#FFD84D` | 键盘焦点；不得作普通装饰 |

约束：

- 正文与背景达到 WCAG 2.2 AA 4.5:1；大字至少 3:1；控件边界/状态至少 3:1。
- Task / Method / Goal 的视觉差异采用“前缀文本 + 边框/填充模式”，不能只靠颜色。
- 不新增第三个品牌色；警告或错误只在未来存在相应语义时添加。

### 5.2 排版

字体栈不引入新的远程依赖：

- `--font-sans`: `Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`
- `--font-serif`: `Iowan Old Style, Baskerville, "Times New Roman", "Songti SC", STSong, serif`

字号使用 `rem` 与 `clamp()`：

| Token | 建议值 | 用途 |
| --- | --- | --- |
| `--text-xs` | `0.75rem / 1.4` | 元数据、标签 |
| `--text-sm` | `0.875rem / 1.55` | 辅助说明 |
| `--text-body` | `1rem / 1.7` | 正文 |
| `--text-lead` | `clamp(1.1rem, 1.2vw, 1.3rem) / 1.6` | 导语 |
| `--text-h3` | `clamp(1.5rem, 2.2vw, 2.25rem) / 1.12` | 卡片标题 |
| `--text-h2` | `clamp(2.25rem, 4vw, 4.5rem) / 1.02` | 章节标题 |
| `--text-display` | `clamp(3.4rem, 7vw, 7.25rem) / 0.94` | 仅首页主命题 |

规则：

- 页面永远只有一个语义 `h1`；视觉字号不改变语义层级。
- 正文最大宽度 `68ch`，中文在视觉上约 34–42 个汉字一行。
- 正文不使用全大写；仅 12px 以上的短 eyebrow/元数据允许大写和字距。
- 英文标题 `letter-spacing` 不小于 `-0.045em`；中文标题恢复到 `-0.015em` 或 `normal`，避免汉字粘连。

### 5.3 间距、圆角与阴影

8px 主节奏，允许 4px 半步：

`4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`

- 页面外边距：手机 16px，平板 24px，桌面 32px；
- 内容区最大宽度：1200px；长文列最大宽度：760px；
- 章节垂直间距：手机 64px，平板 80px，桌面 112px；
- `--radius-control: 8px`；`--radius-surface: 12px`；`--radius-pill: 999px`；
- 阴影仅用于 sticky header/浮层：`0 8px 24px rgb(17 19 24 / 8%)`；普通内容卡不使用大阴影。

## 6. 网格与断点

采用 mobile-first：

| 范围 | 宽度 | 网格 | 页面边距 | 核心行为 |
| --- | --- | --- | --- | --- |
| Narrow | `320–767px` | 4 列 | 16px | 单栏；导航折叠；触控优先 |
| Regular / tablet | `768–1023px` | 8 列 | 24px | 允许 5+3、4+4 双栏；导航分两行 |
| Wide | `≥1024px` | 12 列 | 32px | 允许 7+5、8+4 组合；内容最大 1200px |

额外验证宽度：320、375、768、1024、1280、1440px。布局断点由内容是否拥挤决定，不按具体设备型号命名。

## 7. 内容层级与页面骨架

### 7.1 全局顺序

1. Skip link；
2. 品牌、主导航、语言、主题；
3. 页面 `h1` 与一句定位；
4. 页面主任务（查看研究、阅读解释、浏览主题等）；
5. 补充内容与外链；
6. 简洁页脚。

### 7.2 首页信息层级

1. 姓名与研究定位（主）；
2. 一句话研究主张（主）；
3. 研究入口（主操作）；
4. 肖像与外部联系（次）；
5. 代表研究及解释（主内容）；
6. 写作、About 摘要（次内容）；
7. 名人名言作为语气标识，不作为核心信息。

### 7.3 出版物层级

索引：题目/研究问题 → 一句话结论 → 年份/venue → 标签 → 详情入口。
详情：研究问题 → 核心想法 → 证据 → 边界 → Paper/Code/Demo 原始资源。

## 8. 组件与交互原则

- **链接就是链接**：正文链接有下划线或明确箭头；不能只靠颜色区分。
- **按钮有动作等级**：每个视区至多一个实心主按钮，其余使用描边或文字链接。
- **筛选可恢复**：当前筛选有 `aria-pressed`、URL 参数和可见结果状态；没有结果时显示解释。
- **详情展开可预测**：`details/summary` 保留原生键盘行为，图标旋转只是辅助反馈。
- **主题三态明确**：Auto / Light / Dark 都可见；手机端不能隐藏 Auto；当前状态有文本或可访问名称。
- **语言保持上下文**：切换语言后进入对应的同一路径，不跳回首页。
- **触控目标**：所有主要交互最小 44×44px，标签链接间距避免误触。
- **动效克制**：只使用 120–200ms 的颜色、边框、位移过渡；无滚动驱动动画。

## 9. 可访问性

目标为 WCAG 2.2 AA：

- 语义 landmarks 完整：`header/nav/main/footer`；
- 标题层级连续，无视觉标签冒充标题；
- 键盘顺序与视觉顺序一致；所有焦点清晰；
- 320px 宽、200% 文本缩放无横向页面滚动（必要的局部代码/表格除外）；
- 主题、标签、状态不只依赖颜色或图形；
- `prefers-reduced-motion` 禁用非必要移动；
- `prefers-contrast: more` 和 `forced-colors: active` 至少保证边界、焦点和链接可辨；
- 图片具有与上下文匹配的 alt；论文方法图的图注不假装替代论文原始图注；
- 外链在当前窗口打开，避免无提示的新窗口；
- 中英文分别设置正确 `lang`。

## 10. 响应式内容策略

- 小屏不是删减版：主导航、Auto 主题、所有论文链接和筛选均保留；
- 多栏按阅读顺序折为单栏，不能用 CSS `order` 造成视觉与 DOM 顺序冲突；
- 表达性标题在小屏下缩小，同时放松行高与字距；
- 论文图使用固定宽度、自动高度和 `object-fit: contain`，避免裁掉方法内容；
- 长作者列表、论文标题、URL 与标签必须换行；
- 平板横竖屏均不依赖 hover；卡片操作常显。

## 11. 语气与微文案

- 准确、直接、可证实，不使用“革命性”“领先”等宣传语；
- 研究介绍明确区分结果、解释和局限；
- 暂无内容时说明真实状态和下一步，不制造假文章或失效下载；
- 英文避免 Title Case 泛滥；中文使用自然标点和全角引号；
- 行动文字描述目的，例如“阅读完整讲解”，不使用“Click here”。

## 12. 非目标

- 不改写论文事实或扩大研究结论；
- 不添加博客 CMS、搜索后端、账号或评论系统；
- 不引入大型 UI 框架或整套第三方设计系统；
- 不复制 Carbon、Primer、Spectrum、GOV.UK 的品牌视觉；
- 不生成装饰性 AI 插图；论文图仍使用真实论文资产；
- 不以动画、3D、玻璃拟态或过度圆角制造“现代感”；
- 不在没有 PDF/正文时伪造 CV 或随笔内容。

## 13. 实现边界

设计主要通过现有 Astro 组件和 `global.css` 落地，不新增依赖。优先使用语义 HTML、CSS Grid、`clamp()`、原生 `details` 与少量现有客户端脚本。每个模块只修改文档中列出的文件；跨模块 token 变更集中在第一个模块完成，后续复用。

## 14. 全站验收标准

- [ ] 首页首屏在 1280×800 内可同时看到姓名/研究定位、主行动和肖像的主要部分。
- [ ] 320、375、768、1024、1280、1440px 无非预期横向滚动。
- [ ] 手机端仍能访问 Research、Writing、Topics、About、语言和三态主题。
- [ ] 中英同一路径可互换，页面层级和功能一致。
- [ ] 6 篇出版物在索引和详情页均可访问，Paper/Code/Demo 不被隐藏。
- [ ] Task / Method / Goal 不只靠颜色区分。
- [ ] 所有正文列控制在约 68ch；论文解释可连续阅读。
- [ ] 键盘可以完成导航、主题切换、语言切换、筛选和详情展开。
- [ ] 焦点、正文、交互控件达到 WCAG 2.2 AA 对比度目标。
- [ ] 200% 文本缩放无裁切、重叠或功能损失。
- [ ] `prefers-reduced-motion` 下无非必要位移动画。
- [ ] 亮暗主题均无写死的不可读颜色。
- [ ] `npm run build` 成功，所有中英路由和旧论文重定向仍然生成。

## 15. 模块实施顺序

总体方案落地拆为 6 个外层模块，每个模块执行两轮：程序员按方案初改 → 设计师评审 → 程序员按反馈改第二轮。

1. 全局基础、导航与主题；
2. 首页首屏与个人卡片；
3. 研究展示、出版物索引与标签；
4. 出版物详情叙事；
5. Writing / Topics / About / CV 次级页面；
6. 全站响应式、可访问性与最终一致性。

具体规格与验收见 `docs/design/modules/`。
