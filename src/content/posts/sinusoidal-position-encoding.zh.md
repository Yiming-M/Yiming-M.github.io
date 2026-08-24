---
title: "重读 Transformer 升级之路（1）：Sinusoidal 位置编码追根溯源"
description: "从平移不变的内积出发，推导正弦位置编码为何能暴露相对位置信息，并澄清频率、远程衰减、Taylor 展开与 RoPE 之间真正成立的关系。"
route: "sinusoidal-position-encoding"
image: "/images/posts/sinusoidal-pe/source/2436030584.png"
imageAlt: "单位圆上的两个位置向量，夹角只由相对位置决定"
locale: "zh"
date: "2026-08-24"
readingTime: "约 18 分钟"
tags:
  - "post:series:transformer-upgrade"
  - "post:topic:position-encoding"
  - "post:topic:transformer"
  - "post:lens:mathematical-derivation"
seriesKey: "transformer-upgrade"
seriesTitle: "重读 Transformer 升级之路"
seriesPart: 1
---

> **来源与范围**　这是一篇阅读笔记，而不是原文翻译。文章以苏剑林的[《Transformer 升级之路：1、Sinusoidal 位置编码追根溯源》](https://kexue.fm/archives/8231)为出发点，并结合 Transformer 与 RoPE 原论文重新推导。文中的判断会区分“严格恒等式”“便于理解的充分条件”和“带假设的解释”。

Transformer 的正弦位置编码看起来像一张凭经验写下的三角函数表：

$$
\operatorname{PE}(m,2i)=\sin(m\theta_i),
\qquad
\operatorname{PE}(m,2i+1)=\cos(m\theta_i),
$$

其中

$$
\theta_i=10000^{-2i/d},
\qquad i=0,1,\ldots,\frac d2-1.
$$

常见解释是：Transformer 没有顺序信息，所以需要用不同的正弦和余弦数值区分位置。这个说法没有错，却没有回答最有意思的问题：如果目的只是让位置彼此不同，随机向量、one-hot 编码或一张可学习的 embedding 表都能做到，为什么还要选 sin/cos？

本文的主线是一个更强、但仍只是**充分而非必要**的要求：

$$
\boxed{p_m^\top\,p_n=g(m-n)}.
$$

如果两个绝对位置向量的交互只依赖于位置差，那么绝对坐标就能为模型暴露相对位置。sin/cos 的价值，不只是“制造不同数字”，而是把序列上的平移变成表示空间里的旋转。

## 1. Self-attention 到底缺少什么？

先把 mask、位置 bias 和位置编码都拿掉。对输入序列

$$
X=[x_1,x_2,\ldots,x_n]^\top
$$

施加任意排列矩阵 $P$，纯 self-attention 满足

$$
\operatorname{Attn}(PX)=P\operatorname{Attn}(X).
$$

这叫**排列等变性**：输入 token 换一个顺序，输出只会跟着换同一个顺序。模型能比较内容，却没有“第几个”“向左两步”之类的坐标系。需要注意，decoder 的 causal mask 本身已经提供了方向约束；这里讨论的是不含任何位置相关信号的 self-attention。

经典 Transformer 在第 $m$ 个 token 上加入位置向量：

$$
\tilde{x}_m=x_m+p_m.
$$

让 $p_m\neq p_n$ 只是最低要求。更有用的问题是：模型能否方便地识别

$$
(10,12)\quad\text{与}\quad(100,102)
$$

拥有相同的相对关系？两组绝对坐标不同，但位置差都是 $2$。因此我们希望某种交互核满足

$$
K(p_m,p_n)=g(m-n).
$$

这不是位置编码必须遵守的唯一定义，而是一个清晰、可推导、与 attention 的双线性交互相容的设计目标。

## 2. 从最简单的交互开始：内积

Attention score 的核心是双线性形式

$$
q_m^\top k_n.
$$

为了隔离位置结构，先研究最简单的情形：是否存在 $p_m$，使

$$
\boxed{p_m^\top\,p_n=g(m-n)}?
$$

这个条件立即带来平移不变性。对任意整数 $c$，

$$
p_{m+c}^\top\,p_{n+c}=g((m+c)-(n+c))=g(m-n).
$$

于是，相同距离的两对位置具有相同的位置相似度。这里的关键是“相同的关系”，不是“相同的位置”。

## 3. 二维解：把位置放到单位圆上

考虑二维向量

$$
p_m=
\begin{bmatrix}
\cos(m\theta)\\
\sin(m\theta)
\end{bmatrix},
$$

其中 $\theta$ 是固定的角速度。两个位置的内积为

$$
\begin{aligned}
p_m^\top\,p_n
&=\cos(m\theta)\cos(n\theta)
  +\sin(m\theta)\sin(n\theta)\\
&=\cos((m-n)\theta).
\end{aligned}
$$

第二步只用了余弦差角公式。因此

$$
\boxed{p_m^\top\,p_n=\cos((m-n)\theta)},
$$

右侧不再分别依赖 $m$ 和 $n$，只依赖相对位移 $m-n$。

这个构造也可以从复数 $e^{\mathrm{i}m\theta}$ 推导出来。若要求复数乘积 $p_mp_n^*$ 只依赖于 $m-n$，并把向量范数固定为常数，那么相位必须随 $m$ 线性增长，得到的正是单位圆上的匀速旋转。不过，这只能说明圆周编码是一族自然且简单的解；在不同约束下，并不存在“sin/cos 是唯一可能方案”的结论。

经典公式把每对维度写成 $[\sin,\cos]$，上面的推导写成 $[\cos,\sin]$。两者只是交换同一对维度，内积与旋转结构不变。

## 4. 直觉：每两个维度是一只钟

把 $p_m$ 想成一根钟表指针。序列每前进一步，指针旋转 $\theta$：

$$
p_m\longrightarrow p_{m+1}.
$$

若两个 token 相距 $k$，两根指针的相位差始终是 $k\theta$。例如 $(5,8)$ 与 $(100,103)$ 的绝对位置完全不同，但两对指针都相差 $3\theta$。

于是，圆周编码建立了对应关系

$$
\boxed{\text{位置差}\ \longleftrightarrow\ \text{相位差}}.
$$

sin/cos 在这里不是装饰。它们是二维旋转的坐标，也是让差角公式成立的一对基函数。

## 5. 为什么需要很多种频率？

一只钟有周期。若 $\theta=2\pi/10$，那么

$$
p_{m+10}=p_m,
$$

单个频率无法区分相隔一个完整周期的位置。高维编码把 $d/2$ 只不同转速的钟并排放置：

$$
p_m=
\begin{bmatrix}
\sin(m\theta_0)\\
\cos(m\theta_0)\\
\sin(m\theta_1)\\
\cos(m\theta_1)\\
\vdots\\
\sin(m\theta_{d/2-1})\\
\cos(m\theta_{d/2-1})
\end{bmatrix}.
$$

一个频率回到原相位时，其他频率通常还没有同时复位。多频率因此减少了周期混叠，并为位置变化提供多种分辨率；它不是对任意长度和有限精度下“绝不碰撞”的无条件保证。

不同频率也对应不同尺度：

- 较大的 $\theta_i$ 让相邻位置产生明显相位变化，对局部位移敏感；
- 较小的 $\theta_i$ 变化缓慢，在更长区间内保留低频结构。

这与 Fourier features 的多尺度思想相通，但不能简单理解为“某一维只负责某个固定距离”。距离信息由多维相位共同表达，最终如何使用仍由模型学习。

## 6. 为什么频率按几何级数排列？

原始 Transformer 取

$$
\theta_i=10000^{-2i/d}.
$$

等价地，每一对维度的波长为

$$
\lambda_i=\frac{2\pi}{\theta_i}=2\pi\,10000^{2i/d}.
$$

因此，波长近似按几何级数覆盖从 $2\pi$ 到 $2\pi\times10000$ 的宽广尺度。几何间隔的好处是：用有限维度较均匀地覆盖**对数尺度**，而不是把大量维度集中在某个狭窄的绝对范围。

这里要分开两个问题：

1. **为什么是 sin/cos？** 因为旋转与差角恒等式让相对位移自然出现在交互中。
2. **为什么底数是 10000？** 这是频率范围与分辨率的工程选择，不是由前述恒等式唯一推出的常数。

[Transformer 原论文](https://arxiv.org/abs/1706.03762)给出的直接理由是：对任意固定偏移 $k$，$\operatorname{PE}_{m+k}$ 都能写成 $\operatorname{PE}_m$ 的线性函数；作者还希望固定函数有机会外推到训练时未见的长度。论文同时报告，固定正弦编码与可学习绝对位置 embedding 在其翻译实验上结果相近。能计算更长位置的编码，并不自动等于模型会可靠地完成长度外推。

## 7. 内积会随距离变远而衰减吗？

完整编码的内积是

$$
p_m^\top\,p_n
=\sum_{i=0}^{d/2-1}\cos((m-n)\theta_i).
$$

令 $\Delta=m-n$，并除以维度对数 $d/2$，得到归一化核

$$
\kappa_d(\Delta)
=\frac{2}{d}\sum_{i=0}^{d/2-1}\cos(\Delta\theta_i).
$$

当 $|\Delta|$ 较小时，各频率相位较同步，余弦项倾向于相互增强。距离增大后，相位逐渐散开，正负项会抵消，于是在常用范围中通常出现**振荡式去相关**。

这里必须说得精确：

> 对有限个频率，$\kappa_d(\Delta)$ 是有限余弦和。它不保证单调下降，也不能一般性地宣称在 $|\Delta|\to\infty$ 时严格收敛到零。

苏剑林原文讨论的“远程衰减”来自大维度下的连续近似。令 $b=10000$，则

$$
\kappa_d(\Delta)
\approx\int_0^1\cos(\Delta b^{-t})\,\mathrm{d}t
=\frac{\operatorname{Ci}(\Delta)-\operatorname{Ci}(\Delta/b)}{\ln b},
$$

其中 $\operatorname{Ci}$ 是余弦积分。这个振荡积分的包络会趋于零；但它描述的是连续极限的总体趋势，不应替代有限维精确和。最稳妥的表述是：几何频率在实际距离区间内提供了有用的局部相似性与振荡去相关先验。

下面三张图均直接取自苏剑林原文。第一张展示 $\theta(t)=10000^{-t}$ 时连续积分近似随相对距离变化的结果；后两张比较多种 $\theta(t)$ 在短距离与长距离区间的积分曲线。它们说明衰减的形状与速度依赖频率调度，但不是有限维位置核严格单调衰减的证明。

<figure class="post-figure">
  <a href="https://www.kexue.fm/usr/uploads/2021/03/2436030584.png" target="_blank" rel="noopener noreferrer"><img src="/images/posts/sinusoidal-pe/source/2436030584.png" width="1500" height="896" loading="lazy" alt="通过直接积分估计 Sinusoidal 位置编码的内积衰减趋势" /></a>
  <figcaption><strong>图 1｜通过直接积分估计 Sinusoidal 位置编码的内积衰减趋势。</strong> 原图及原图注来自苏剑林《<a href="https://www.kexue.fm/archives/8231">Transformer升级之路：1、Sinusoidal位置编码追根溯源</a>》，科学空间，2021；原样转载，许可为 <a href="https://creativecommons.org/licenses/by-nc-nd/2.5/cn/">CC BY-NC-ND 2.5 CN</a>。点击图片查看原图。</figcaption>
</figure>

<figure class="post-figure">
  <a href="https://www.kexue.fm/usr/uploads/2021/03/4279248294.png" target="_blank" rel="noopener noreferrer"><img src="/images/posts/sinusoidal-pe/source/4279248294.png" width="1992" height="854" loading="lazy" alt="几个不同的 θ(t) 的积分结果：短距离趋势" /></a>
  <figcaption><strong>图 2｜几个不同的 θ(t) 的积分结果（短距离趋势）。</strong> 原图及原图注来自苏剑林《<a href="https://www.kexue.fm/archives/8231">Transformer升级之路：1、Sinusoidal位置编码追根溯源</a>》，科学空间，2021；原样转载，许可为 <a href="https://creativecommons.org/licenses/by-nc-nd/2.5/cn/">CC BY-NC-ND 2.5 CN</a>。点击图片查看原图。</figcaption>
</figure>

<figure class="post-figure">
  <a href="https://www.kexue.fm/usr/uploads/2021/03/300971803.png" target="_blank" rel="noopener noreferrer"><img src="/images/posts/sinusoidal-pe/source/300971803.png" width="1992" height="854" loading="lazy" alt="几个不同的 θ(t) 的积分结果：长距离趋势" /></a>
  <figcaption><strong>图 3｜几个不同的 θ(t) 的积分结果（长距离趋势）。</strong> 原图及原图注来自苏剑林《<a href="https://www.kexue.fm/archives/8231">Transformer升级之路：1、Sinusoidal位置编码追根溯源</a>》，科学空间，2021；原样转载，许可为 <a href="https://creativecommons.org/licenses/by-nc-nd/2.5/cn/">CC BY-NC-ND 2.5 CN</a>。点击图片查看原图。</figcaption>
</figure>

## 8. Taylor 展开在推导中扮演什么角色？

到这里，sinusoidal PE 的几何动机已经完整。Taylor 展开回答的是另一个问题：为什么要特别研究两个位置向量的双线性交互？

设网络输出为

$$
f(x_1+p_1,\ldots,x_n+p_n).
$$

在把 $p$ 视作小扰动的局部近似中，一阶项只涉及单个位置，例如

$$
p_m^\top\frac{\partial f}{\partial x_m}.
$$

第一个同时含 $p_m$ 与 $p_n$ 的交叉项出现在二阶：

$$
p_m^\top H_{mn}p_n,
\qquad
H_{mn}=\frac{\partial^2 f}{\partial x_m\partial x_n}.
$$

若为了得到可解的起点，进一步近似 $H_{mn}\approx I$，就回到

$$
p_m^\top\,p_n=g(m-n).
$$

这条路线提供了直觉，不是无条件证明。它依赖至少三个假设：位置向量足够像“小扰动”；局部二阶展开能抓住相关交互；$H_{mn}$ 可被单位阵或以对角项为主的结构近似。若 $H_{mn}$ 为一般矩阵，纯粹依赖 $m-n$ 的性质未必保留。把这些假设写出来，比把 Taylor 展开当作“sin/cos 的必然来源”更准确。

## 9. 更深一层：平移是旋转的群表示

定义二维旋转矩阵

$$
R(k\theta)=
\begin{bmatrix}
\cos(k\theta)&-\sin(k\theta)\\
\sin(k\theta)&\cos(k\theta)
\end{bmatrix}.
$$

单位圆编码满足

$$
p_{m+k}=R(k\theta)p_m.
$$

而且

$$
R(a\theta)R(b\theta)=R((a+b)\theta).
$$

因此映射 $k\mapsto R(k\theta)$ 把整数加法群 $\mathbb{Z}$ 的平移表示成二维旋转。相对位置来自

$$
R(m\theta)^\top R(n\theta)=R((n-m)\theta).
$$

不需要群论术语也可以抓住核心：无论当前位置是 5 还是 100，“向后移动 3 个 token”都对应同一旋转算子。绝对坐标改变了，相对变换没有改变。

## 10. 到 RoPE：概念上的一步，机制上的变化

传统 sinusoidal PE 把位置向量加到 token representation：

$$
x_m\longmapsto x_m+p_m.
$$

RoPE 则把位置相关旋转直接作用到由内容产生的 Query 与 Key。记未旋转的向量为 $q_m,k_n$：

$$
\tilde q_m=R_mq_m,
\qquad
\tilde k_n=R_nk_n.
$$

它们的 attention score 为

$$
\begin{aligned}
\tilde q_m^\top\tilde k_n
&=q_m^\top R_m^\top R_nk_n\\
&=q_m^\top R_{n-m}k_n.
\end{aligned}
$$

位置进入 score 的方式显式依赖相对位移 $n-m$；完整分数当然仍依赖 token 内容 $q_m$ 与 $k_n$。[RoFormer 原论文](https://arxiv.org/abs/2104.09864)正是用分块二维旋转在 attention 内部实现这一结构。

所以，“从 sinusoidal PE 到 RoPE 只差一步”适合作为概念桥梁，却不应被理解为两者机制等价：前者是输入端的加法式绝对编码，后者是 Q/K 空间中的乘法式旋转。共同的数学核心是相位差与旋转复合。

## 11. 这套推导证明了什么，又没有证明什么？

它证明或直接给出了：

1. 成对的 sin/cos 是二维旋转坐标；
2. 同频成对维度的内积严格等于 $\cos((m-n)\theta)$；
3. 固定位置偏移可表示为与绝对位置无关的线性旋转；
4. 多频率把这种结构扩展到多个尺度；
5. RoPE 的 Q/K 内积通过 $R_m^\top R_n$ 显式出现相对位移。

它没有证明：

1. sinusoidal PE 是唯一或最优的位置编码；
2. 底数 10000 是理论必然；
3. 有限维内积对距离严格单调或必然收敛到零；
4. 能计算训练长度之外的编码就能可靠外推；
5. 加法式 sinusoidal PE 的实际 attention score 只依赖相对位置。

最后一点尤其重要。$p_m^\top\,p_n$ 展示的是编码本身提供的结构与模型**可以利用的可能性**，不是对训练后网络行为的完整描述。

## 12. 一页总结

整条逻辑可以压缩为：

$$
\text{无位置 self-attention 具有排列等变性}
$$

$$
\Downarrow
$$

$$
\text{寻找能方便暴露相对位移的绝对编码}
$$

$$
\Downarrow
$$

$$
p_m^\top\,p_n=g(m-n)
$$

$$
\Downarrow
$$

$$
p_m=
\begin{bmatrix}
\cos(m\theta)\\
\sin(m\theta)
\end{bmatrix}
\quad\Rightarrow\quad
p_m^\top\,p_n=\cos((m-n)\theta)
$$

$$
\Downarrow
$$

$$
\text{用几何分布的多频率覆盖多种尺度}
$$

$$
\Downarrow
$$

$$
\boxed{\text{序列平移}\ \longleftrightarrow\ \text{表示空间中的旋转}}
$$

这比“用 sin 和 cos 给位置分配不同数字”多解释了一层：正弦位置编码把相对位移编码成相位差，而 RoPE 进一步把这套旋转结构直接放进 attention score。

## 参考文献与图像来源

1. Vaswani, A. et al. (2017). [*Attention Is All You Need*](https://arxiv.org/abs/1706.03762)，§3.5。
2. 苏剑林（2021）。[《Transformer 升级之路：1、Sinusoidal 位置编码追根溯源》](https://kexue.fm/archives/8231)。本文的阅读起点与 Taylor 展开、连续积分视角来自该文；本文重新组织推导并补充了有限维结论的边界。
3. Su, J. et al. (2021). [*RoFormer: Enhanced Transformer with Rotary Position Embedding*](https://arxiv.org/abs/2104.09864)。
4. 图 1–3 均为作者原创图像，依据文中公式生成，采用 CC BY 4.0；未转载第三方图片。数值曲线使用 $d=128,b=10000$ 的精确有限和。
