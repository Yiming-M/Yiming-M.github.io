---
title: "Rereading the Transformer Upgrade Path (1): Tracing Sinusoidal Position Encoding to Its Source"
description: "A derivation of how sinusoidal position encoding exposes relative offsets through rotations, with careful limits on frequency schedules, decay, Taylor expansions, and the bridge to RoPE."
route: "sinusoidal-position-encoding"
image: "/images/posts/sinusoidal-pe/source/2436030584.png"
imageAlt: "Two position vectors on a unit circle whose angle depends only on relative position"
locale: "en"
date: "2026-08-24"
readingTime: "20 min read"
tags:
  - "post:series:transformer-upgrade"
  - "post:topic:position-encoding"
  - "post:topic:transformer"
  - "post:lens:mathematical-derivation"
seriesKey: "transformer-upgrade"
seriesTitle: "Rereading the Transformer Upgrade Path"
seriesPart: 1
---

> **Source and scope.** This is a reading note, not a translation. It begins with Jianlin Su's post [“Tracing the Origins of Sinusoidal Position Encoding”](https://kexue.fm/archives/8231), then re-derives the argument alongside the original Transformer and RoPE papers. I will distinguish exact identities, useful sufficient conditions, and explanations that rely on approximations.

The Transformer's sinusoidal position encoding can look like an empirically chosen table of trigonometric values:

$$
\operatorname{PE}(m,2i)=\sin(m\theta_i),
\qquad
\operatorname{PE}(m,2i+1)=\cos(m\theta_i),
$$

with

$$
\theta_i=10000^{-2i/d},
\qquad i=0,1,\ldots,\frac d2-1.
$$

The usual explanation says that a Transformer has no order information, so different sine and cosine values are added to distinguish different positions. That is true, but it leaves the interesting question unanswered. If distinctness were the only goal, random vectors, one-hot codes, or a learned embedding table would all work. Why sinusoids?

The thread developed here is a stronger—yet still only **sufficient, not necessary**—requirement:

$$
\boxed{p_m^\top\,p_n=g(m-n)}.
$$

If the interaction between two absolute position vectors depends only on their displacement, the absolute coordinates expose a relative position signal. The point of sin/cos is not merely to manufacture different numbers. It maps translation along a sequence to rotation in a representation space.

## 1. What exactly is missing from self-attention?

Remove masks, position biases, and position encodings. For an input sequence

$$
X=[x_1,x_2,\ldots,x_n]^\top
$$

and any permutation matrix $P$, pure self-attention obeys

$$
\operatorname{Attn}(PX)=P\operatorname{Attn}(X).
$$

This is **permutation equivariance**: permuting the input tokens simply permutes the outputs in the same way. The layer can compare content, but it has no coordinates for “the third token” or “two steps to the left.” A decoder's causal mask already supplies a directional constraint; the statement above concerns self-attention with no position-dependent signal at all.

The original Transformer adds a position vector to the token at position $m$:

$$
\tilde{x}_m=x_m+p_m.
$$

Requiring only $p_m\neq p_n$ sets a low bar. A more useful question is whether the model can easily recognise that

$$
(10,12)\quad\text{and}\quad(100,102)
$$

have the same relative structure. Their absolute coordinates differ, but both offsets are $2$. We can express that goal through an interaction kernel:

$$
K(p_m,p_n)=g(m-n).
$$

This is not the sole definition of a good position encoding. It is a clear, tractable design target that fits the bilinear interactions used by attention.

## 2. Start with the simplest interaction: an inner product

At the centre of an attention score is a bilinear form,

$$
q_m^\top k_n.
$$

To isolate the positional structure, consider a simpler problem: can we choose $p_m$ such that

$$
\boxed{p_m^\top\,p_n=g(m-n)}?
$$

The condition immediately gives translation invariance. For any integer $c$,

$$
p_{m+c}^\top\,p_{n+c}=g((m+c)-(n+c))=g(m-n).
$$

Pairs separated by the same distance therefore have the same positional similarity. The goal is not to make their positions equal, but to make their **relationship** equal.

## 3. A two-dimensional solution: place positions on a unit circle

Consider

$$
p_m=
\begin{bmatrix}
\cos(m\theta)\\
\sin(m\theta)
\end{bmatrix},
$$

where $\theta$ is a fixed angular velocity. The inner product between two positions is

$$
\begin{aligned}
p_m^\top\,p_n
&=\cos(m\theta)\cos(n\theta)
  +\sin(m\theta)\sin(n\theta)\\
&=\cos((m-n)\theta).
\end{aligned}
$$

The second line is just the cosine subtraction identity. Thus

$$
\boxed{p_m^\top\,p_n=\cos((m-n)\theta)},
$$

which no longer depends on $m$ and $n$ separately.

The same construction follows from the complex number $e^{\mathrm{i}m\theta}$. If $p_mp_n^*$ must depend only on $m-n$ and the magnitude of every $p_m$ is fixed, the phase grows linearly with $m$, producing uniform motion around the unit circle. This makes circular encoding a simple and natural family of solutions. It does not establish sin/cos as the unique possibility under every set of assumptions.

The canonical Transformer formula orders each pair as $[\sin,\cos]$, while the derivation above uses $[\cos,\sin]$. Swapping the two coordinates changes neither the inner product nor the rotation structure.

## 4. The intuition: every pair of dimensions is a clock

Think of $p_m$ as a clock hand. Advancing one token rotates the hand by $\theta$:

$$
p_m\longrightarrow p_{m+1}.
$$

If two tokens are $k$ positions apart, their phase difference is always $k\theta$. The pairs $(5,8)$ and $(100,103)$ have completely different absolute coordinates, but both pairs of hands are separated by $3\theta$.

The circle therefore creates the correspondence

$$
\boxed{\text{position difference}\ \longleftrightarrow\ \text{phase difference}}.
$$

Sin and cos are not decoration here. They are the coordinates of a two-dimensional rotation and the paired basis functions that make the subtraction identity work.

## 5. Why do we need many frequencies?

One clock is periodic. If $\theta=2\pi/10$, then

$$
p_{m+10}=p_m,
$$

so a single frequency cannot distinguish positions one full period apart. A $d$-dimensional encoding places $d/2$ clocks with different speeds side by side:

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

When one frequency returns to its initial phase, the others will usually not reset at the same position. Combining frequencies therefore reduces periodic aliasing and gives several resolutions of positional change. It is not an unconditional guarantee of no collisions at every length and under finite numerical precision.

The frequencies also span different scales:

- Larger $\theta_i$ values produce substantial phase changes between nearby positions, making them sensitive to local displacement.
- Smaller $\theta_i$ values evolve slowly and preserve low-frequency structure across a wider interval.

This resembles the multiscale logic of Fourier features, but no single dimension should be read as exclusively responsible for one fixed distance. The phase pattern is distributed across dimensions, and the trained model decides how to use it.

## 6. Why arrange the frequencies geometrically?

The original Transformer uses

$$
\theta_i=10000^{-2i/d}.
$$

Equivalently, the wavelength for each coordinate pair is

$$
\lambda_i=\frac{2\pi}{\theta_i}=2\pi\,10000^{2i/d}.
$$

The wavelengths therefore follow an approximate geometric progression from $2\pi$ to $2\pi\times10000$. Geometric spacing uses a finite number of dimensions to cover a wide range of **logarithmic scales**, instead of concentrating most coordinates in a narrow absolute interval.

Two questions should remain separate:

1. **Why sin/cos?** Rotations and the angle-subtraction identity make relative displacement appear naturally in interactions.
2. **Why the base 10000?** It is an engineering choice governing frequency range and resolution, not a constant uniquely forced by the identity above.

The stated motivation in [the original Transformer paper](https://arxiv.org/abs/1706.03762) is that, for any fixed offset $k$, $\operatorname{PE}_{m+k}$ is a linear function of $\operatorname{PE}_m$. The authors also hoped that a fixed function would extrapolate to lengths not seen during training. Their translation experiment found learned absolute embeddings and fixed sinusoidal encodings performed similarly. Being able to evaluate an encoding at a longer index does not, by itself, guarantee reliable length extrapolation by the full model.

## 7. Does the inner product decay with distance?

The inner product of the full encodings is

$$
p_m^\top\,p_n
=\sum_{i=0}^{d/2-1}\cos((m-n)\theta_i).
$$

Let $\Delta=m-n$ and normalise by the number of frequency pairs:

$$
\kappa_d(\Delta)
=\frac{2}{d}\sum_{i=0}^{d/2-1}\cos(\Delta\theta_i).
$$

For small $|\Delta|$, the phases remain relatively aligned and many cosine terms reinforce one another. As distance grows, the phases spread out and positive and negative terms cancel. Over practical ranges this often creates **oscillatory decorrelation**.

The qualification matters:

> With finitely many frequencies, $\kappa_d(\Delta)$ is a finite cosine sum. It is not guaranteed to decrease monotonically, and in general it should not be claimed to converge strictly to zero as $|\Delta|\to\infty$.

The “long-range decay” discussed in Su's post comes from a continuous, large-dimensional approximation. With $b=10000$,

$$
\kappa_d(\Delta)
\approx\int_0^1\cos(\Delta b^{-t})\,\mathrm{d}t
=\frac{\operatorname{Ci}(\Delta)-\operatorname{Ci}(\Delta/b)}{\ln b},
$$

where $\operatorname{Ci}$ is the cosine integral. The envelope of this oscillatory integral tends to zero. But that describes the trend of a continuous limit, not the exact behaviour of a finite sum. A defensible conclusion is that the geometric frequencies provide useful local similarity and an oscillatory decorrelation prior over practical distance ranges.

The three figures below are taken directly from Jianlin Su's original post. The first shows the continuous integral approximation for $\theta(t)=10000^{-t}$ as relative distance changes; the next two compare several choices of $\theta(t)$ over short- and long-distance ranges. They illustrate that the shape and rate of decay depend on the frequency schedule; they are not a proof that a finite-dimensional position kernel decreases strictly monotonically.

<figure class="post-figure">
  <a href="https://www.kexue.fm/usr/uploads/2021/03/2436030584.png" target="_blank" rel="noopener noreferrer"><img src="/images/posts/sinusoidal-pe/source/2436030584.png" width="1500" height="896" loading="lazy" alt="Direct-integration estimate of the inner-product decay trend for sinusoidal positional encoding" /></a>
  <figcaption><strong>Figure 1 | Estimating the inner-product decay trend by direct integration.</strong> Original image and caption from Jianlin Su, “<a href="https://www.kexue.fm/archives/8231">Transformer升级之路：1、Sinusoidal位置编码追根溯源</a>,” Scientific Spaces, 2021; reproduced unaltered under <a href="https://creativecommons.org/licenses/by-nc-nd/2.5/cn/">CC BY-NC-ND 2.5 CN</a>. The original axis labels read “integration result” and “relative distance.” Open the image for the original file.</figcaption>
</figure>

<figure class="post-figure">
  <a href="https://www.kexue.fm/usr/uploads/2021/03/4279248294.png" target="_blank" rel="noopener noreferrer"><img src="/images/posts/sinusoidal-pe/source/4279248294.png" width="1992" height="854" loading="lazy" alt="Integral results for several choices of theta of t over a short-distance range" /></a>
  <figcaption><strong>Figure 2 | Integral results for several choices of θ(t), short-distance view.</strong> Original image and caption from Jianlin Su, “<a href="https://www.kexue.fm/archives/8231">Transformer升级之路：1、Sinusoidal位置编码追根溯源</a>,” Scientific Spaces, 2021; reproduced unaltered under <a href="https://creativecommons.org/licenses/by-nc-nd/2.5/cn/">CC BY-NC-ND 2.5 CN</a>. Open the image for the original file.</figcaption>
</figure>

<figure class="post-figure">
  <a href="https://www.kexue.fm/usr/uploads/2021/03/300971803.png" target="_blank" rel="noopener noreferrer"><img src="/images/posts/sinusoidal-pe/source/300971803.png" width="1992" height="854" loading="lazy" alt="Integral results for several choices of theta of t over a long-distance range" /></a>
  <figcaption><strong>Figure 3 | Integral results for several choices of θ(t), long-distance view.</strong> Original image and caption from Jianlin Su, “<a href="https://www.kexue.fm/archives/8231">Transformer升级之路：1、Sinusoidal位置编码追根溯源</a>,” Scientific Spaces, 2021; reproduced unaltered under <a href="https://creativecommons.org/licenses/by-nc-nd/2.5/cn/">CC BY-NC-ND 2.5 CN</a>. Open the image for the original file.</figcaption>
</figure>

## 8. What role does the Taylor expansion play?

The geometric motivation for sinusoidal PE is already complete. A Taylor expansion addresses a different question: why focus on a bilinear interaction between two position vectors in the first place?

Suppose the network computes

$$
f(x_1+p_1,\ldots,x_n+p_n).
$$

In a local approximation that treats $p$ as a small perturbation, a first-order term involves only one position, for example

$$
p_m^\top\frac{\partial f}{\partial x_m}.
$$

The first cross term containing both $p_m$ and $p_n$ appears at second order:

$$
p_m^\top H_{mn}p_n,
\qquad
H_{mn}=\frac{\partial^2 f}{\partial x_m\partial x_n}.
$$

If, purely to obtain a tractable starting point, we further approximate $H_{mn}\approx I$, the problem reduces to

$$
p_m^\top\,p_n=g(m-n).
$$

This route supplies motivation, not an assumption-free proof. It relies on at least three choices: treating position vectors as sufficiently small perturbations; expecting a local second-order expansion to capture the relevant interaction; and approximating $H_{mn}$ by the identity or a diagonal-dominant structure. For a general $H_{mn}$, dependence on $m-n$ alone need not survive. Stating these assumptions is more accurate than presenting the Taylor expansion as the inevitable origin of sin/cos.

## 9. A deeper view: translation as a group representation

Define the two-dimensional rotation matrix

$$
R(k\theta)=
\begin{bmatrix}
\cos(k\theta)&-\sin(k\theta)\\
\sin(k\theta)&\cos(k\theta)
\end{bmatrix}.
$$

The circular encoding satisfies

$$
p_{m+k}=R(k\theta)p_m,
$$

and

$$
R(a\theta)R(b\theta)=R((a+b)\theta).
$$

The map $k\mapsto R(k\theta)$ therefore represents translation in the additive group $\mathbb{Z}$ as a two-dimensional rotation. Relative position appears through

$$
R(m\theta)^\top R(n\theta)=R((n-m)\theta).
$$

The group-theoretic vocabulary is optional. The intuitive statement is simple: whether the current position is 5 or 100, “move three tokens forward” applies the same rotation operator. The absolute coordinate changes; the relative transformation does not.

## 10. From here to RoPE: one conceptual step, a different mechanism

Traditional sinusoidal PE adds a position vector to a token representation:

$$
x_m\longmapsto x_m+p_m.
$$

RoPE instead applies position-dependent rotations directly to content-derived Queries and Keys. Let $q_m$ and $k_n$ denote the unrotated vectors:

$$
\tilde q_m=R_mq_m,
\qquad
\tilde k_n=R_nk_n.
$$

Their attention score is

$$
\begin{aligned}
\tilde q_m^\top\tilde k_n
&=q_m^\top R_m^\top R_nk_n\\
&=q_m^\top R_{n-m}k_n.
\end{aligned}
$$

Position enters the score explicitly through the relative offset $n-m$, while the full score still depends on token content through $q_m$ and $k_n$. [The RoFormer paper](https://arxiv.org/abs/2104.09864) implements this structure with blockwise two-dimensional rotations inside attention.

“Only one step from sinusoidal PE to RoPE” is therefore a useful conceptual bridge, not a claim that the mechanisms are equivalent. The former is additive absolute encoding at the input; the latter is multiplicative rotation in Q/K space. Their shared mathematical core is phase difference under composition of rotations.

## 11. What does this derivation establish—and what does it not?

It establishes directly that:

1. Paired sin/cos coordinates describe a two-dimensional rotation.
2. The inner product of a matched frequency pair is exactly $\cos((m-n)\theta)$.
3. A fixed positional offset is a linear rotation independent of the absolute position.
4. Multiple frequencies extend this structure across several scales.
5. RoPE makes relative displacement appear through $R_m^\top R_n$ in the Q/K inner product.

It does **not** establish that:

1. Sinusoidal PE is the unique or optimal position encoding.
2. The base 10000 is theoretically mandatory.
3. A finite-dimensional inner product is strictly monotonic in distance or must converge to zero.
4. Evaluating the formula beyond the training length guarantees extrapolation.
5. The actual attention score of additive sinusoidal PE depends only on relative position.

That final limitation is important. The kernel $p_m^\top\,p_n$ shows a structure supplied by the encoding and a possibility the model can exploit; it is not a complete description of a trained network's behaviour.

## 12. The argument on one page

The entire chain can be compressed to

$$
\text{position-free self-attention is permutation equivariant}
$$

$$
\Downarrow
$$

$$
\text{seek an absolute code that exposes relative displacement}
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
\text{use geometrically spaced frequencies to cover multiple scales}
$$

$$
\Downarrow
$$

$$
\boxed{\text{sequence translation}\ \longleftrightarrow\ \text{rotation in representation space}}
$$

This goes one level deeper than “use sine and cosine to assign different numbers to positions.” Sinusoidal encoding turns relative displacement into a phase difference; RoPE then places that rotation structure directly inside the attention score.

## References and figure provenance

1. Vaswani, A. et al. (2017). [*Attention Is All You Need*](https://arxiv.org/abs/1706.03762), §3.5.
2. Su, J. (2021). [*Tracing the Origins of Sinusoidal Position Encoding*](https://kexue.fm/archives/8231). This post supplies the reading starting point and the Taylor/continuous-integral perspective; the derivation and finite-dimensional qualifications here are independently reorganised.
3. Su, J. et al. (2021). [*RoFormer: Enhanced Transformer with Rotary Position Embedding*](https://arxiv.org/abs/2104.09864).
4. Figures 1–3 are original figures by the author, generated from the equations in this article and released under CC BY 4.0. No third-party image is reproduced. The numerical curve uses the exact finite sum with $d=128,b=10000$.
