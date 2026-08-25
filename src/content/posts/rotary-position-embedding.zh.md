---
title: "重读 Transformer 升级之路（2）：RoPE 如何把位置差写进 Attention"
description: "从二维旋转的一条恒等式出发，解释 RoPE 如何把相对位置写进标准 Attention，以及它为什么能保留线性 Attention 的可分解计算。"
route: "rotary-position-embedding"
image: "/images/posts/rope/relative-rotation.svg"
imageAlt: "两组整体平移前后的 Query 与 Key 旋转示意图，相对位置相同时相对旋转保持不变"
locale: "zh"
date: "2026-08-25"
readingTime: "主线约 22 分钟"
tags:
  - "post:series:transformer-upgrade"
  - "post:topic:position-encoding"
  - "post:topic:transformer"
  - "post:lens:mathematical-derivation"
seriesKey: "transformer-upgrade"
seriesTitle: "重读 Transformer 升级之路"
seriesPart: 2
---

> **来源**　本文主要参考苏剑林的[《Transformer 升级之路：2、博采众长的旋转式位置编码》](https://kexue.fm/archives/8265)，以及 RoFormer、Linear Transformer 与 Performer 论文。

> **三十秒速览**　在[上一篇《重读 Transformer 升级之路（1）：Sinusoidal 位置编码追根溯源》](/zh/writing/2026-08-24/sinusoidal-position-encoding/)中，每对 sin/cos 像一只“位置钟”：它为位置生成一根指针。RoPE 更进一步，不再把位置向量加到 token 上，而是用位置对应的角度直接旋转内容产生的 Query 和 Key。位置 $m$ 旋转 $m\theta$，位置 $n$ 旋转 $n\theta$；两者做内积时，共同的绝对旋转会被抵消，只留下 $n-m$。在标准 Attention 中，这个相对旋转进入 softmax 之前的 score；在线性 Attention 中，只要旋转仍能分别作用于 Query 和 Key，先聚合 Key/Value 的计算顺序就可以保留。不过，“还能线性计算”不等于“权重仍然非负且和为 1”，这两个问题必须分开。

先约定本文会反复使用的符号：

| 符号 | 含义 |
| --- | --- |
| $m,n$ | Query 与 Key 所在的绝对位置 |
| $\Delta=m-n$ | Query 相对 Key 的位移 |
| $x_m$ | 位置 $m$ 的 token representation |
| $q_m,k_n,v_n$ | 尚未加入位置信息的 Query、Key、Value |
| $d_h$ | 单个 attention head 的 Query/Key 维度，本文假设为偶数 |
| $R(\alpha)$ | 在二维平面中逆时针旋转 $\alpha$ 的矩阵 |
| $R_m$ | 把一个完整 attention head 的每对维度分别旋转 $m\theta_i$ 的分块矩阵 |
| $\theta_i$ | 第 $i$ 对维度每前进一个 token 所旋转的弧度 |
| $\phi,\varphi$ | 线性 Attention 中作用于 Query、Key 的特征映射 |

## 1. RoPE 想补上 Sinusoidal PE 的哪块缺口？

先把位置编码放到一边。标准 self-attention 会从 token representation 产生三组向量：

$$
q_m=W_Qx_m,
\qquad
k_n=W_Kx_n,
\qquad
v_n=W_Vx_n.
$$

Query 可以理解为位置 $m$ 当前“想找什么”，Key 表示位置 $n$ “能用什么特征被找到”，Value 则是找到它之后真正取走的信息。Query 与 Key 的内积

$$
s_{m,n}=q_m^\top k_n
$$

决定两者有多匹配。

问题在于：如果 $q_m$ 和 $k_n$ 都没有携带位置，那么这个匹配只比较内容，不知道两者相距几步。

[上一篇文章](/zh/writing/2026-08-24/sinusoidal-position-encoding/)介绍的 Sinusoidal 位置编码，会先构造位置向量 $p_m$，再把它加到 token representation 上。为了和后面的 RoPE 使用同一种描述方式，先把“加上位置向量”写成一个位置变换：

$$
F_{\mathrm{add}}(x_m,m)=x_m+p_m.
$$

这里的第二个输入 $m$ 告诉函数应该取哪一个 $p_m$。将变换后的 token 投影成 Query 和 Key，可得

$$
\begin{aligned}
\hat q_m
&=W_QF_{\mathrm{add}}(x_m,m)
=q_m+W_Qp_m,\\
\hat k_n
&=W_KF_{\mathrm{add}}(x_n,n)
=k_n+W_Kp_n.
\end{aligned}
$$

现在再把它们的内积完整展开：

$$
\begin{aligned}
\hat q_m^\top\hat k_n
={}&q_m^\top k_n
+q_m^\top W_Kp_n\\
&+(W_Qp_m)^\top k_n
+(W_Qp_m)^\top(W_Kp_n).
\end{aligned}
$$

四项依次是内容--内容、内容--位置、位置--内容和位置--位置。上一篇证明的是 Sinusoidal 向量本身具有漂亮的相对相位结构，例如 $p_m^\top p_n$ 只依赖 $m-n$；但上面这个**完整 score** 还经过 $W_Q,W_K$，并混入另外三项，所以它并没有被强制写成“位置只通过 $m-n$ 出现”的形式。

这就自然引出下一步：既然位置最终是为了影响 Query--Key 的比较，能不能直接在 Query 和 Key 上规定更合适的位置变换？记这两个变换为

$$
q_m^{\mathrm{pos}}=F_Q(q_m,m),
\qquad
k_n^{\mathrm{pos}}=F_K(k_n,n).
$$

我们希望它们满足

$$
\boxed{
F_Q(q_m,m)^\top F_K(k_n,n)
=g(q_m,k_n,m-n)
}.
$$

右侧仍然依赖 Query 和 Key 的内容；受到限制的只有位置变量，它只能以 $m-n$ 的形式出现。RoPE 接下来给出的具体选择，就是让 $F_Q$ 和 $F_K$ 都使用由位置决定的旋转。

这个目标还有一个很直观的检验。如果把两个 token 同时向后平移 $c$ 个位置，那么它们的相对距离没有改变：

$$
(m+c)-(n+c)=m-n.
$$

因此，我们也希望平移前后的内容匹配保持相同。接下来只需要构造一种满足这个目标的简单变换。

## 2. 先把二维旋转拆开看懂

### 2.1 旋转矩阵到底做了什么？

在二维平面中，向量

$$
u=
\begin{bmatrix}
u_1\\
u_2
\end{bmatrix}
$$

逆时针旋转 $\alpha$ 后，会变成

$$
R(\alpha)u
=
\begin{bmatrix}
\cos\alpha&-\sin\alpha\\
\sin\alpha&\cos\alpha
\end{bmatrix}
\begin{bmatrix}
u_1\\
u_2
\end{bmatrix}
=
\begin{bmatrix}
u_1\cos\alpha-u_2\sin\alpha\\
u_1\sin\alpha+u_2\cos\alpha
\end{bmatrix}.
$$

例如，取 $u=[1,0]^\top$，它原本指向横轴正方向。旋转 $\pi/2$ 后：

$$
R(\pi/2)
\begin{bmatrix}
1\\0
\end{bmatrix}
=
\begin{bmatrix}
0&-1\\1&0
\end{bmatrix}
\begin{bmatrix}
1\\0
\end{bmatrix}
=
\begin{bmatrix}
0\\1
\end{bmatrix},
$$

正好变成指向纵轴正方向。旋转改变的是向量的方向，不改变它的长度。

### 2.2 为什么转置等于反向旋转？

把旋转矩阵转置，就是交换它的行与列：

$$
R(\alpha)^\top
=
\begin{bmatrix}
\cos\alpha&\sin\alpha\\
-\sin\alpha&\cos\alpha
\end{bmatrix}.
$$

另一方面，由

$$
\cos(-\alpha)=\cos\alpha,
\qquad
\sin(-\alpha)=-\sin\alpha,
$$

可得

$$
R(-\alpha)
=
\begin{bmatrix}
\cos\alpha&\sin\alpha\\
-\sin\alpha&\cos\alpha
\end{bmatrix}.
$$

两个矩阵逐项相同，因此

$$
\boxed{R(\alpha)^\top=R(-\alpha)}.
$$

几何上也很好理解：先把一根指针旋转 $\alpha$，再想把它恢复原状，就要反方向旋转 $-\alpha$。

### 2.3 为什么连续两次旋转可以把角度相加？

先旋转 $\beta$，再旋转 $\alpha$，对应的矩阵乘法是

$$
R(\alpha)R(\beta).
$$

为了看清每一项，暂时把 $\cos\alpha,\sin\alpha$ 简写成 $c_\alpha,s_\alpha$，把 $\cos\beta,\sin\beta$ 简写成 $c_\beta,s_\beta$：

$$
\begin{aligned}
R(\alpha)R(\beta)
&=
\begin{bmatrix}
c_\alpha&-s_\alpha\\
s_\alpha&c_\alpha
\end{bmatrix}
\begin{bmatrix}
c_\beta&-s_\beta\\
s_\beta&c_\beta
\end{bmatrix}\\
&=
\begin{bmatrix}
c_\alpha c_\beta-s_\alpha s_\beta
&-(c_\alpha s_\beta+s_\alpha c_\beta)\\
s_\alpha c_\beta+c_\alpha s_\beta
&c_\alpha c_\beta-s_\alpha s_\beta
\end{bmatrix}.
\end{aligned}
$$

再使用正弦、余弦的和角公式：

$$
\begin{aligned}
\cos(\alpha+\beta)
&=c_\alpha c_\beta-s_\alpha s_\beta,\\
\sin(\alpha+\beta)
&=s_\alpha c_\beta+c_\alpha s_\beta,
\end{aligned}
$$

上面的乘积就变成

$$
R(\alpha)R(\beta)
=
\begin{bmatrix}
\cos(\alpha+\beta)&-\sin(\alpha+\beta)\\
\sin(\alpha+\beta)&\cos(\alpha+\beta)
\end{bmatrix}
=R(\alpha+\beta).
$$

因此

$$
\boxed{R(\alpha)R(\beta)=R(\alpha+\beta)}.
$$

如果只记一句话，就是：**旋转做乘法，角度做加法。**

## 3. RoPE 的核心为什么只有一行？

现在取一对二维 Query 和 Key：

$$
q_m=
\begin{bmatrix}
q_1\\q_2
\end{bmatrix},
\qquad
k_n=
\begin{bmatrix}
k_1\\k_2
\end{bmatrix}.
$$

选择一个固定的每步转角 $\theta$。RoPE 在位置 $m$ 把 Query 旋转 $m\theta$，在位置 $n$ 把 Key 旋转 $n\theta$：

$$
\tilde q_m=R(m\theta)q_m,
\qquad
\tilde k_n=R(n\theta)k_n.
$$

对旋转后的向量做内积：

$$
\begin{aligned}
\tilde q_m^\top\tilde k_n
&=(R(m\theta)q_m)^\top(R(n\theta)k_n)\\
&=q_m^\top R(m\theta)^\top R(n\theta)k_n\\
&=q_m^\top R(-m\theta)R(n\theta)k_n\\
&=q_m^\top R((n-m)\theta)k_n.
\end{aligned}
$$

每一步分别用了：

1. $(AB)^\top=B^\top A^\top$；
2. $R(\alpha)^\top=R(-\alpha)$；
3. $R(\alpha)R(\beta)=R(\alpha+\beta)$。

最终式子中的位置只剩下 $n-m$：

$$
\boxed{
\tilde q_m^\top\tilde k_n
=q_m^\top R((n-m)\theta)k_n
}.
$$

虽然 Query 和 Key 各自按照绝对位置 $m,n$ 旋转，但它们相遇做内积时，看到的只是相对位置。

如果把两个位置同时平移 $c$，同样有

$$
\begin{aligned}
R((m+c)\theta)^\top R((n+c)\theta)
&=R(-(m+c)\theta)R((n+c)\theta)\\
&=R((n-m)\theta).
\end{aligned}
$$

公共的 $c$ 被消掉了。这正是“整体平移不改变相对关系”的矩阵版本。

<figure class="post-figure">
  <img src="/images/posts/rope/relative-rotation.svg" width="1200" height="620" loading="lazy" alt="同一坐标系内的两根 Query 与 Key 指针在整体平移前后一起转动，而二者相对夹角保持不变" />
  <figcaption><strong>图 1｜整体平移改变绝对角度，却不改变相对旋转。</strong> 为了只展示位置造成的旋转，图中让 Query 与 Key 从同一参考方向出发，并以 θ = 30° 示意。左右两组位置分别是 (1, 3) 与 (4, 6)；后一组都增加 3，但位置差始终为 2，因此相对夹角始终是 2θ。图为作者制作的机制示意图。</figcaption>
</figure>

## 4. “旋转内容”到底改变了什么？

上一节证明了位置只以 $m-n$ 出现，但这还没有回答一个更直观的问题：**同一对 Query 和 Key，为什么换一个相对位置，匹配分数就会改变？**

令

$$
\Delta=m-n.
$$

因为 $n-m=-\Delta$，二维 RoPE score 可以写成

$$
q_m^\top R(-\Delta\theta)k_n.
$$

为了不把任何一步藏起来，先把右侧的两个因子重新写出来：

$$
k_n=
\begin{bmatrix}
k_1\\k_2
\end{bmatrix},
$$

以及

$$
\begin{aligned}
R(-\Delta\theta)
&=
\begin{bmatrix}
\cos(-\Delta\theta)&-\sin(-\Delta\theta)\\
\sin(-\Delta\theta)&\cos(-\Delta\theta)
\end{bmatrix}\\
&=
\begin{bmatrix}
\cos(\Delta\theta)&\sin(\Delta\theta)\\
-\sin(\Delta\theta)&\cos(\Delta\theta)
\end{bmatrix}.
\end{aligned}
$$

第二个等号使用了“余弦是偶函数、正弦是奇函数”：$\cos(-x)=\cos x$，$\sin(-x)=-\sin x$。

现在先做矩阵与向量的乘法：

$$
\begin{aligned}
R(-\Delta\theta)k_n
&=
\begin{bmatrix}
\cos(\Delta\theta)&\sin(\Delta\theta)\\
-\sin(\Delta\theta)&\cos(\Delta\theta)
\end{bmatrix}
\begin{bmatrix}
k_1\\k_2
\end{bmatrix}\\
&=
\begin{bmatrix}
k_1\cos(\Delta\theta)+k_2\sin(\Delta\theta)\\
-k_1\sin(\Delta\theta)+k_2\cos(\Delta\theta)
\end{bmatrix}.
\end{aligned}
$$

再把 Query 的转置也明确写成一行向量：

$$
q_m^\top=
\begin{bmatrix}
q_1&q_2
\end{bmatrix}.
$$

于是，内积可以一行一行地算：

$$
\begin{aligned}
q_m^\top R(-\Delta\theta)k_n
&=
\begin{bmatrix}
q_1&q_2
\end{bmatrix}
\begin{bmatrix}
k_1\cos(\Delta\theta)+k_2\sin(\Delta\theta)\\
-k_1\sin(\Delta\theta)+k_2\cos(\Delta\theta)
\end{bmatrix}\\
&=q_1[k_1\cos(\Delta\theta)+k_2\sin(\Delta\theta)]\\
&\quad+q_2[-k_1\sin(\Delta\theta)+k_2\cos(\Delta\theta)]\\
&=q_1k_1\cos(\Delta\theta)
+q_1k_2\sin(\Delta\theta)\\
&\quad-q_2k_1\sin(\Delta\theta)
+q_2k_2\cos(\Delta\theta)\\
&=(q_1k_1+q_2k_2)\cos(\Delta\theta)\\
&\quad+(q_1k_2-q_2k_1)\sin(\Delta\theta).
\end{aligned}
$$

所以 RoPE score 包含两部分：

$$
\boxed{
\underbrace{(q_1k_1+q_2k_2)}_{\text{原始同方向匹配}}
\cos(\Delta\theta)
+
\underbrace{(q_1k_2-q_2k_1)}_{\text{两个坐标的交叉匹配}}
\sin(\Delta\theta)
}.
$$

这里最容易产生的误解，是把 RoPE 想成“给原始点积乘一个距离余弦”。只有第一项像这样；第二项还会交叉比较 Query 的第一维与 Key 的第二维，以及 Query 的第二维与 Key 的第一维。

这个式子究竟在说什么？我们用两个**对照实验**回答。为了让旋转结果能心算，暂时取 $\theta=\pi/2$，也就是相差一个位置便旋转 $90^\circ$。这只是放大机制的玩具例子，不是实际模型只使用的频率。

| 实验 | Query $q$ | 原始 Key $k$ | $\Delta$ | 旋转后的 Key $R(-\Delta\theta)k$ | RoPE score |
| --- | --- | --- | ---: | --- | ---: |
| A1 | $[1,0]$ | $[1,0]$ | $0$ | $[1,0]$ | $1$ |
| A2 | $[1,0]$ | $[1,0]$ | $1$ | $[0,-1]$ | $0$ |
| B1 | $[1,0]$ | $[0,1]$ | $0$ | $[0,1]$ | $0$ |
| B2 | $[1,0]$ | $[0,1]$ | $1$ | $[1,0]$ | $1$ |

先看实验 A。两行的内容向量完全相同，只改变相对位置：

$$
\begin{aligned}
\Delta=0:&\quad [1,0]\,[1,0]^\top=1,\\
\Delta=1:&\quad [1,0]\,[0,-1]^\top=0.
\end{aligned}
$$

这说明：即使内容不变，相对位置也会先转动 Key，再改变它与 Query 的匹配分数。

再看实验 B。Query 与 Key 原本正交，所以同位置时 score 为 $0$；当 $\Delta=1$ 时，$R(-\pi/2)$ 把 Key 从 $[0,1]$ 转成 $[1,0]$，正好与 Query 同向，于是 score 变成 $1$。

> **这组例子只想说明一件事：** RoPE 让“用什么坐标方向比较两段内容”取决于相对位置。它不是给距离加一个固定奖励或惩罚，也不保证越远 score 越小。

真实 attention head 会同时使用很多不同的 $\theta_i$，而且 $q,k$ 是模型学出来的内容向量。因此，位置差决定每一对坐标怎样转，内容决定转完以后是否匹配；所有维度的结果最后再相加。

## 5. 从一对维度扩展到完整 Attention Head

真实模型中，一个 attention head 通常有几十或上百个维度。RoPE 把这些维度两两配对：

$$
(q_0,q_1),
\ (q_2,q_3),
\ \ldots,
\ (q_{d_h-2},q_{d_h-1}).
$$

第 $i$ 对维度使用自己的每步转角 $\theta_i$。完整旋转可以写成一个分块对角矩阵：

$$
R_m
=
\operatorname{diag}
\left(
R(m\theta_0),
R(m\theta_1),
\ldots,
R(m\theta_{d_h/2-1})
\right).
$$

常见的频率调度沿用 Sinusoidal PE：

$$
\theta_i=b^{-2i/d_h},
$$

经典底数为 $b=10000$。较大的 $\theta_i$ 转得快，对局部位置差更敏感；较小的 $\theta_i$ 转得慢，在较长距离上变化更缓慢。

完整 score 就是所有二维块的 score 相加：

$$
\tilde q_m^\top\tilde k_n
=
\sum_{i=0}^{d_h/2-1}
\left[
A_i\cos(\Delta\theta_i)
+B_i\sin(\Delta\theta_i)
\right],
$$

其中 $A_i,B_i$ 由第 $i$ 对 Query/Key 内容决定。

旋转还保持向量长度。因为

$$
R_m^\top R_m=I,
$$

所以

$$
\lVert R_mq_m\rVert^2
=q_m^\top R_m^\top R_mq_m
=q_m^\top q_m
=\lVert q_m\rVert^2.
$$

位置改变的是方向，不是 Query 或 Key 的模长。

不过，多频率 score 仍然是内容相关的有限三角和。它可能随距离振荡，不保证严格单调变小，也不保证远处 token 一定获得更低的 Attention。更准确的说法是：几何频率提供了多尺度相位结构，并在许多频率混合时带来振荡式去相关的倾向；这不是一条硬编码的距离惩罚。

## 6. RoPE 在标准 Attention 中放在哪里？

对单个 attention head，计算顺序可以写成五步。

### 第一步：从输入产生 Q、K、V

$$
q_m=W_Qx_m,
\qquad
k_n=W_Kx_n,
\qquad
v_n=W_Vx_n.
$$

### 第二步：只旋转 Q 和 K

这里的 $R_m$ 不是一个没有定义的新矩阵。它就是上一节的完整 head 旋转；为免读者来回翻找，再写一次：

$$
\begin{aligned}
R_m
&=\operatorname{diag}\!\left(
R(m\theta_0),\ldots,R(m\theta_{d_h/2-1})
\right),\\
R_n
&=\operatorname{diag}\!\left(
R(n\theta_0),\ldots,R(n\theta_{d_h/2-1})
\right).
\end{aligned}
$$

$R_m$ 负责按位置 $m$ 旋转 Query 的每一对维度，$R_n$ 负责按位置 $n$ 旋转 Key 的每一对维度。因此

$$
q_m^{\mathrm{rope}}=R_mq_m,
\qquad
k_n^{\mathrm{rope}}=R_nk_n.
$$

### 第三步：计算所有 Query--Key score

$$
s_{m,n}
=\frac{(q_m^{\mathrm{rope}})^\top k_n^{\mathrm{rope}}}{\sqrt{d_h}}.
$$

### 第四步：加入 mask，再做 softmax

这里用的是**加法 mask**。我们把 $M_{m,n}$ 定义为

$$
M_{m,n}=
\begin{cases}
0, & \text{位置 }m\text{ 可以读取位置 }n,\\
-\infty, & \text{位置 }m\text{ 不可以读取位置 }n.
\end{cases}
$$

它和 score 相加以后再进入指数函数：

$$
a_{m,n}
=
\frac{\exp(s_{m,n}+M_{m,n})}
{\sum_j\exp(s_{m,j}+M_{m,j})}.
$$

所以这里确定是加号：允许读取时，$\exp(s_{m,n}+0)=\exp(s_{m,n})$；禁止读取时，$\exp(s_{m,n}-\infty)=0$。实际代码常用数据类型能够表示的极小负数代替 $-\infty$。

如果实现里出现的是 $0/1$ 布尔 mask，那是另一种表示法：它通常会先被转换成这里的 $0/-\infty$ 加法 mask，或者在指数结果上做等价的乘法。本文的 $M$ 从一开始就定义在 softmax 之前的 logit 空间里。

### 第五步：用权重聚合未旋转的 Value

$$
o_m=\sum_n a_{m,n}v_n.
$$

Value 通常不需要旋转。RoPE 的目标是让“位置 $m$ 应该从位置 $n$ 取多少信息”这个配对分数带有相对位置；一旦 $a_{m,n}$ 已经包含这种信息，它就可以直接选择和组合 Value。

用接近代码的写法表示，就是：

```python
q, k, v = project(x)
q_rope = q * cos(position) + rotate_half(q) * sin(position)
k_rope = k * cos(position) + rotate_half(k) * sin(position)

score   = q_rope @ k_rope.T / sqrt(head_dim)
weight  = softmax(score + mask)
output  = weight @ v
```

其中，对每个二维块 $[a,b]$，

$$
\operatorname{rotate\_half}([a,b])=[-b,a],
$$

正好对应旋转矩阵中与 $\sin$ 相乘的部分。

这里还要划清一个边界：标准 Attention 仍然需要计算所有 $m,n$ 组合，形成 $N\times N$ 的 score matrix。RoPE 增加的是位置结构，不会把 $O(N^2)$ 的标准 Attention 自动变成线性复杂度。

## 7. 线性 Attention 为什么叫“线性”？

这里的“线性”是指计算量随序列长度 $N$ 线性增长，不是说整个模块没有非线性函数。

为了直接看出它与标准 Attention 的差别，先暂时省略 RoPE 和 mask。标准 Attention 是

$$
o_m^{\mathrm{std}}
=
\frac{
\sum_{n=1}^N
\exp\!\left(q_m^\top k_n/\sqrt{d_h}\right)v_n
}{
\sum_{n=1}^N
\exp\!\left(q_m^\top k_n/\sqrt{d_h}\right)
}.
$$

其中每个系数 $\exp(q_m^\top k_n/\sqrt{d_h})$ 都由一对具体的 Query 和 Key 共同产生。长度为 $N$ 时，一共有 $N^2$ 对，因而不能先把所有 Key/Value 压成一个与 Query 无关的有限汇总量。

线性 Attention 改写了这个最关键的“成对系数”。它选择或近似一种可以拆成两侧特征的相似度：

$$
\operatorname{sim}(q_m,k_n)
=\phi(q_m)^\top\varphi(k_n).
$$

令

$$
u_m=\phi(q_m),
\qquad
z_n=\varphi(k_n),
$$

于是它的归一化输出是

$$
o_m^{\mathrm{lin}}
=
\frac{
\sum_{n=1}^N(u_m^\top z_n)v_n
}{
\sum_{n=1}^N u_m^\top z_n
}.
$$

把两种形式并排看，差别集中在中间那一列：

| | 标准 Attention | 线性 Attention |
| --- | --- | --- |
| Query--Key 系数 | $\exp(q_m^\top k_n/\sqrt{d_h})$ | $u_m^\top z_n$ |
| 是否先形成所有配对 | 是，共 $N^2$ 对 | 不必，可以先汇总 Key/Value |
| 归一化 | 对每个 Query 做 softmax | 除以 $\sum_nu_m^\top z_n$ |
| 关于序列长度的计算量 | $O(N^2)$ | 特征维度固定时为 $O(N)$ |

因此，线性 Attention 的关键不只是“公式里没写 softmax”，而是 $u_m$ 与 $z_n$ 可以分开计算，随后利用矩阵乘法的结合律改变求和顺序。

因为 $u_m$ 与求和编号 $n$ 无关，它可以被移到求和外面：

$$
\begin{aligned}
\sum_{n=1}^N(u_m^\top z_n)v_n
&=u_m^\top\left(\sum_{n=1}^Nz_nv_n^\top\right),\\
\sum_{n=1}^Nu_m^\top z_n
&=u_m^\top\left(\sum_{n=1}^Nz_n\right).
\end{aligned}
$$

于是可以先为整段序列计算两个汇总量：

$$
S_V=\sum_{n=1}^Nz_nv_n^\top,
\qquad
S_1=\sum_{n=1}^Nz_n,
$$

再让每个 Query 读取它们：

$$
\boxed{
o_m=\frac{u_m^\top S_V}{u_m^\top S_1}
}.
$$

这次没有显式构造 $N\times N$ 的 Attention matrix。当特征维度固定时，计算量关于序列长度 $N$ 是线性的。

在 causal 场景中，只需把整段求和换成前缀状态：

$$
S_{V,m}=S_{V,m-1}+z_mv_m^\top,
\qquad
S_{1,m}=S_{1,m-1}+z_m.
$$

位置 $m$ 只能读取截至当前位置累积的状态，因此不会看到未来 token。

## 8. RoPE 怎样进入线性 Attention？

### 8.1 为什么 RoPE 不会破坏乘法重排？

假设特征维度同样可以两两配对。对 Query/Key 特征分别旋转：

$$
u_m'=R_mu_m,
\qquad
z_n'=R_nz_n.
$$

它们的相似度仍然只依赖相对旋转：

$$
(u_m')^\top z_n'
=u_m^\top R_{n-m}z_n.
$$

同时，分子仍可重排为

$$
\sum_n[(u_m')^\top z_n']v_n
=(u_m')^\top\left(\sum_nz_n'v_n^\top\right).
$$

因此可以先聚合

$$
S_V'=\sum_nz_n'v_n^\top,
$$

再让旋转后的 Query 读取它。RoPE 的位置变换发生在每个 Query 和 Key 自己身上，不需要先知道某个完整的 $N\times N$ score matrix，所以线性 Attention 最重要的乘法重排仍然成立。

### 8.2 为什么分母会遇到麻烦？

很多线性 Attention 选择值域非负的 $\phi,\varphi$。这样

$$
u_m^\top z_n\geq 0,
$$

分母是非负相似度之和，输出可以理解为 Value 的加权平均。

旋转却不保持“每个坐标都非负”。例如

$$
R(\pi)
\begin{bmatrix}
1\\0
\end{bmatrix}
=
\begin{bmatrix}
-1\\0
\end{bmatrix}.
$$

因此，即使 $u_m,z_n$ 原本都只有非负坐标，旋转后的

$$
(u_m')^\top z_n'
$$

也可能为负。如果直接把它们加到分母中，正负项可能互相抵消，分母甚至可能接近 $0$。

### 8.3 RoFormer 论文采用了什么处理？

RoFormer 给出的线性 Attention 形式，是只在分子中使用旋转后的特征，分母仍使用原始非负特征：

$$
\boxed{
o_m
=
\frac{
(u_m')^\top\left(\sum_nz_n'v_n^\top\right)
}{
u_m^\top\left(\sum_nz_n\right)
}
}.
$$

这样做保留了两点：

1. 分子与分母都能通过预聚合按线性复杂度计算；
2. 分母沿用未旋转的非负特征，降低正负抵消导致除零的风险。

但代价也必须说清楚。Value $v_n$ 的实际系数是

$$
w_{m,n}
=
\frac{(u_m')^\top z_n'}{\sum_j u_m^\top z_j}.
$$

$w_{m,n}$ 可以为负，而且一般不满足

$$
\sum_nw_{m,n}=1.
$$

所以这时的输出仍是一个有归一化尺度的内容聚合，却不再是严格的概率加权平均。

### 8.4 先旋转还是先做特征映射？

阅读不同实现时，还会遇到两种看似相近、实际不同的顺序：

| 顺序 | 形式 | 主要性质 |
| --- | --- | --- |
| 先映射，再旋转 | $R_m\phi(q_m)$ | 相对旋转恒等式精确成立，但非负特征会被转成有正有负 |
| 先旋转，再映射 | $\phi(R_mq_m)$ | 若 $\phi$ 是正随机特征，可近似旋转后 softmax kernel，并保留非负性，但这是核近似而非上一行的精确等式 |

例如 Performer 的 FAVOR+ 使用正随机特征近似 softmax kernel。先对原始 Query/Key 使用 RoPE，再对旋转后的向量做这种特征映射，可以近似标准 RoPE Attention，同时继续利用线性计算。它与上一小节的 RoFormer 线性公式是两种不同的组合，不能只用一句“把 RoPE 加进去”混为一谈。

## 9. “适合线性 Attention”真正需要什么条件？

线性 Attention 真正需要的，不是某一种特定位置编码名称，而是带位置的相似度能够分解为

$$
\operatorname{sim}(q_m,k_n,m,n)
=a_m(q_m)^\top b_n(k_n).
$$

只要 Query 侧的 $a_m$ 与 Key 侧的 $b_n$ 可以分别计算，Key/Value 就仍有机会先聚合。

RoPE 很自然地满足这个条件：

$$
a_m(q_m)=R_m\phi(q_m),
\qquad
b_n(k_n)=R_n\varphi(k_n).
$$

许多直接加在完整 Attention matrix 上的相对位置 bias，则要等到每一对 $m,n$ 的 score 已经出现后才能使用，因而不能直接套用同一个重排。

但这不构成 RoPE 的唯一性定理。其他只要能够分解的位置函数也可以与线性 Attention 配合。例如 cosFormer 使用可分解的余弦位置重加权，在保持非负性的同时实现线性计算。因此，更准确的结论是：

> RoPE 的优势，是用分别作用于 Query 与 Key 的绝对位置旋转，构造出显式的相对位置交互；这种可分解结构天然适合线性 Attention，但它不是唯一可能的结构。

## 10. 这些推导证明了什么，又没有证明什么？

它严格给出或直接展示了：

1. 二维 RoPE 是保持模长的旋转；
2. $R_m^\top R_n=R_{n-m}$，所以 Query--Key score 中的位置只以相对位移出现；
3. 整体平移 Query 与 Key 不会改变它们的相对旋转；
4. RoPE score 不只是原始点积乘一个距离余弦，还包含内容坐标之间的交叉匹配；
5. RoPE 可以分别施加到 Query 与 Key，因此不会自动破坏线性 Attention 的乘法重排。

它没有证明：

1. RoPE 是满足相对位置目标的唯一解；
2. RoPE score 会随距离严格单调下降；
3. 使用 RoPE 后模型一定偏爱附近 token；
4. 能计算训练长度以外的旋转角，就代表模型一定能可靠完成长度外推；
5. 任意线性 Attention 加入 RoPE 后都仍有非负、和为 $1$ 的概率权重；
6. RoPE 会降低标准 Attention 的 $O(N^2)$ 复杂度。

## 11. 一页速查

| 问题 | 最短答案 |
| --- | --- |
| RoPE 旋转什么？ | 每个 attention head 中投影后的 Query 和 Key。 |
| 为什么每两个维度配成一对？ | 二维正好可以表示一个保持长度的平面旋转。 |
| 为什么得到相对位置？ | $R(m\theta)^\top R(n\theta)=R((n-m)\theta)$。 |
| RoPE 是把一个位置向量加到内容上吗？ | 不是，它直接旋转内容产生的 Q/K。 |
| RoPE 只是给点积乘一个余弦吗？ | 不是，还会产生由正弦控制的交叉坐标匹配。 |
| 为什么通常不旋转 Value？ | 相对位置已经进入选取 Value 的 Attention 权重，Value 本身可以直接被聚合。 |
| 标准 Attention 会因此变成线性复杂度吗？ | 不会，仍需计算 $N^2$ 个 Query--Key score。 |
| 为什么 RoPE 适合线性 Attention？ | 它能分别作用于 Query 与 Key，保留可分解计算。 |
| 线性 Attention 中权重仍是概率吗？ | 不一定。旋转特征可能产生负相似度，取决于特征映射和归一化方案。 |
| RoPE 是线性 Attention 唯一可用的相对位置方案吗？ | 不是。关键条件是位置相关相似度能否分解。 |

整篇文章最值得记住的一句话是：

> RoPE 不是给 token 贴上一个位置标签，而是让 Query 与 Key 在各自的位置坐标系里旋转；两者比较时，绝对坐标相消，只留下相对位移。

## 参考文献与图像来源

1. 苏剑林（2021）。[《Transformer 升级之路：2、博采众长的旋转式位置编码》](https://kexue.fm/archives/8265)。本文以该文提出的问题与 RoPE 构造为阅读起点，重新组织了二维旋转、标准 Attention 和线性 Attention 的教学顺序。
2. Su, J. et al. (2021). [*RoFormer: Enhanced Transformer with Rotary Position Embedding*](https://arxiv.org/abs/2104.09864)。RoPE 的标准形式、性质与线性 Attention 方案。
3. Katharopoulos, A. et al. (2020). [*Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention*](https://proceedings.mlr.press/v119/katharopoulos20a.html)。基于核特征与乘法结合律的线性 Attention。
4. Choromanski, K. et al. (2021). [*Rethinking Attention with Performers*](https://arxiv.org/abs/2009.14794)。使用正交正随机特征近似 softmax Attention。
5. Qin, Z. et al. (2022). [*cosFormer: Rethinking Softmax in Attention*](https://arxiv.org/abs/2202.08791)。可分解的余弦位置重加权说明 RoPE 并非线性 Attention 中位置结构的唯一选择。
6. 图 1 为作者制作的机制示意图。
