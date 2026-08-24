# Design implementation workflow

本目录是本次网站视觉改进的唯一设计基准。总体方案在 [`00-overall-design.md`](./00-overall-design.md)，可执行模块在 [`modules/`](./modules/)。

## 角色边界

- **设计师 Agent**：维护总体方案与模块规格；每个模块 Round 1 后检查实际代码/页面并写具体反馈；不代替程序员直接修网页代码。
- **程序员 Agent**：严格按当前模块规格修改代码；Round 1 完成后停止并请求设计反馈；Round 2 只处理反馈和该模块验收，不提前做后续模块。
- 两个 Agent 共用当前 worktree。开始每轮前先看 `git diff`，不得覆盖对方刚写入的文档或代码。

## 嵌套循环协议

对下面每一个模块，依次执行：

1. 程序员阅读总体方案和当前模块文档；
2. 程序员完成 **Round 1** 实现与构建检查，在模块“执行记录”中填写 commit-less diff 摘要和验证结果；
3. 设计师阅读实际变更，并以 `docs/design/feedback/NN-round-1.md` 写反馈，必须包含：通过项、问题、精确修改要求、桌面/平板/手机证据、Round 2 验收点；
4. 程序员阅读反馈，完成 **Round 2** 修改与验证，在模块文档中更新记录；
5. 设计师复核本模块验收清单，将“模块验收”更新为 `PASS` 或列出仍未通过项；
6. 只有当前模块 `PASS` 后，才进入下一个模块。

这就是用户要求的嵌套循环：外层遍历 6 个模块，内层固定两轮程序员改动，中间由设计师反馈。

## 执行顺序

| 顺序 | 模块 | 依赖 | Round 1 | 反馈 | Round 2 | 验收 |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | [全局基础、导航与主题](./modules/01-foundation-header-theme.md) | 总体方案 | ☑ | ☑ | ☑ | ☑ |
| 02 | [首页首屏与个人卡片](./modules/02-home-hero-profile.md) | 01 | ☑ | ☑ | ☑ | ☑ |
| 03 | [研究展示、出版物索引与标签](./modules/03-research-index-taxonomy.md) | 01–02 | ☑ | ☑ | ☑ | ☑ |
| 04 | [出版物详情叙事](./modules/04-publication-detail.md) | 01、03 | ☑ | ☑ | ☑ | ☑ |
| 05 | [Writing / Topics / About / CV](./modules/05-secondary-pages.md) | 01–04 | ☑ | ☑ | ☑ | ☑ |
| 06 | [响应式、可访问性与最终一致性](./modules/06-responsive-accessibility-qa.md) | 01–05 | ☑ | ☑ | ☑ | ☑ Source |

## 每轮最低验证

程序员每轮至少执行：

- `npm run build`；
- `git diff --check`；
- 检查本模块指定的英文、中文代表页面；
- 检查 320px、768px、1280px 三个关键宽度；
- 检查 light 和 dark；
- 仅报告实际验证，不用“应该没问题”代替证据。

Module 06 执行总体方案中更完整的尺寸、路由、缩放与输入矩阵。

## 设计反馈格式

每份 `docs/design/feedback/NN-round-1.md` 使用以下结构：

```md
# Module NN — Round 1 design feedback

## Verdict
NEEDS REVISION | PASS WITH MINOR CHANGES

## What works
- ...

## Required changes for Round 2
1. [High] 问题、位置、期望行为、验收方法
2. [Medium] ...

## Responsive and accessibility notes
- Desktop: ...
- Tablet: ...
- Mobile: ...
- Keyboard/theme: ...

## Round 2 acceptance
- [ ] ...
```

反馈必须可执行，不能只写“更现代”“再精致一些”之类主观句子。

## 变更纪律

- 不修改论文事实、作者、实验数字或链接；视觉工作只改变结构与呈现。
- 不添加未经请求的依赖、CMS、搜索、评论、账号或动画框架。
- 不提前实施后续模块来“顺手优化”；跨模块必需变更记录在当前反馈中。
- 保留未提交的既有用户变更，不重置 worktree。
- 用户要求的是本地完成流程；未经额外授权不 push、不发布。

## 完成定义

### 源码级设计工作流（COMPLETE）

- [x] Step 1 总体方案存在并仍是实现基准；
- [x] Step 2 的 6 个模块方案完整；
- [x] 每个模块都有 Round 1 程序员实现；
- [x] 每个模块都有独立设计反馈文档；
- [x] 每个模块都有 Round 2 程序员修订；
- [x] Module 01–05 为源码级 PASS，Module 06 为 SOURCE-LEVEL PASS；
- [x] 生产构建成功，中英页面、6 篇详情、sitemap 和 legacy routes 无静态回退；
- [x] theme/filter 模拟脚本、路由/标题/图片静态矩阵和 `git diff --check` 通过。

### 真实前台完整验收（PENDING / NOT TESTED）

- [ ] 320–1440px 六档真实 viewport 视觉与横向滚动检查；
- [ ] 200% zoom、自定义文本间距、keyboard-only、屏幕阅读器与 touch 检查；
- [ ] Light / Dark / Auto、prefers-contrast 与 forced-colors 真实绘制检查；
- [ ] 远端 GitHub Pages 发布后的可达性、资源路径与运行时控制台检查。

`☑ Source` 只表示源码、构建 HTML、静态 CSS/DOM、颜色公式与 mock JavaScript 验收完成，不表示真实浏览器或辅助技术矩阵已经通过。

## 当前状态

- Step 1 — 总体设计：**DONE**
- Step 2 — 模块详细设计：**DONE**
- Step 3 — 逐模块两轮实施：**DONE — all 6 modules completed with source-level acceptance**
- Step 4 — 真实前台与辅助技术矩阵：**PENDING / NOT TESTED — requires an explicitly requested browser QA pass**
