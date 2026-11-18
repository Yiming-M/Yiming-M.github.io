/**
 * 首页“驾驶员监控”页的 3D 场景（设计文档 §4）。
 *
 * 由 HomeShowcase.astro 在第一次切到这一页时按需加载（手机、减少动态效果、不支持 WebGL2 时不会加载）。
 *
 * 画面是“夜间座舱”：
 * - 车内相机的深度图抬成点云，每个像素一个点（约 17 万个）。虚拟相机放在原相机的位置，
 *   所以正对时点云和原图完全重合；转动时看得出前后层次（方向盘、手、脸、头枕）。
 * - 点平时显示夜间彩色相机拍到的样子：很暗，几乎看不清。
 * - 鼠标处是一个圆形“镜头”：中心显示红外图（夜里也清楚），外圈按深度着色并画等深线。
 *   镜头的圆环是页面上的一个元素（[data-lens]），由这里每帧移动：点云里没有点的地方（远处背景）圆环也是完整的。
 * - 前方、侧方、上方三个机位。切换时，点从上到下依次散开、再聚成新机位的样子。
 *
 * 交互：
 * - 打开这一页时：点从四周飞来，聚成前方机位的样子，然后镜头在脸上打开。
 * - 鼠标移动：镜头跟着鼠标；点云同时小幅转动（左右、上下），看出立体。
 * - 鼠标离开页面：镜头回到脸上，点云回到默认角度。
 * - 左侧三个机位按钮（[data-view]）：切换机位。没点过按钮时，每隔 AUTO_VIEW_MS 自动换下一个机位。
 * 只在画面需要变化时渲染。
 *
 * 数据（scripts/dms/build_dms.py 生成，放在 public/home/dms/，格式见该脚本开头）：
 * 每个机位一张深度（12 位，打包在 PNG 的 R、G 里，B 是“画不画这个点”）、一张红外、一张夜间彩色，以及 meta.json。
 * 镜头的大小、分区、配色、等深线与 build_dms.py 的静态图一致，改动时两边一起改。
 *
 * 深度图是生成的相对深度（灰度越亮越近），不是真实距离：这里把灰度线性对应到 Z_NEAR–Z_FAR 的距离，
 * 并假设相机的水平视场角是 IMAGE_FOV_DEGREES。三个机位之间没有标定，每个机位单独成一片点云。
 */
import { BufferAttribute, BufferGeometry, Color, GLSL3, Group, NearestFilter, PerspectiveCamera, Points, Scene, ShaderMaterial, TextureLoader, Vector2, Vector3, WebGLRenderer } from "three";

// —— 可调参数 ——
/** 假设的相机水平视场角（度）：车内相机多是广角。只影响点云的立体感，不影响正对时的样子。 */
const IMAGE_FOV_DEGREES = 70;
/** 深度灰度 1（最近）和 0（最远）对应的距离（场景单位，大致是米）。 */
const Z_NEAR = 0.35;
const Z_FAR = 1.0;
/** 画面高度（或宽度，取较紧的一边）被图像占满的比例。转动时近处的方向盘会甩出去，所以留些余地。 */
const FILL = 0.74;
/** 点的直径相对于相邻点间距的倍数：大于 1 时点互相重叠，看起来是实心的；小于 1 有细缝，更像点云。 */
const POINT_COVER = 1.4;
/** 每个点在自己的格子里随机挪动的幅度（格子宽度的比例）：点排成规整的网格时会出现纱窗一样的纹路。 */
const JITTER = 0.5;
/** 鼠标在页面左右边缘时绕竖直轴转多少度、上下边缘时绕水平轴转多少度。转大了会露出被挡住的空洞。 */
const MOUSE_YAW_DEGREES = 16;
const MOUSE_PITCH_DEGREES = 9;
/** 开场结束、鼠标离开页面时的角度（度）：转开一点才看得出立体。 */
const REST_YAW_DEGREES = -12;
const REST_PITCH_DEGREES = 4;
/** 转动的阻尼（每帧向目标靠近的比例）和镜头跟随鼠标的阻尼。 */
const DAMPING = 0.07;
const LENS_DAMPING = 0.3;
// 镜头：与 build_dms.py 的 LENS_RADIUS、LENS_CORE、LENS_FEATHER、CONTOUR_LEVELS、DEPTH_BASE、LINE_GAIN 一致
const LENS_RADIUS = 0.27; // 占图像（点云正对时）高度的比例
const LENS_CORE = 0.62;
const LENS_FEATHER = 0.05;
const CONTOUR_LEVELS = 40;
const DEPTH_BASE = 0.45;
const LINE_GAIN = 0.8;
/** 切换机位用多久（毫秒）；点从上到下依次出发，SPREAD 是最早和最晚出发之间相差的比例。 */
const MORPH_MS = 2000;
const MORPH_SPREAD = 0.6;
/** 切换途中点散开的幅度（场景单位）。 */
const SWIRL = 0.16;
/** 没点过机位按钮时，每个机位停留多久后自动换下一个（毫秒）。 */
const AUTO_VIEW_MS = 7000;
/** 开场：等 INTRO_HOLD_MS 毫秒后，点用 INTRO_MS 毫秒从四周飞来。按时间而不是按帧，刷新率不同时长短一样。 */
const INTRO_HOLD_MS = 300;
const INTRO_MS = 2600;
/** 宽屏时整体右移的比例，给左侧文字留位置。 */
const WIDE_SHIFT = 0.1;
const WIDE_ASPECT = 1.35;
const MAX_PIXEL_RATIO = 2;
/** 机位的顺序：自动切换按这个顺序轮流。 */
const VIEW_ORDER = ["front", "side", "top"];

/** 把数字写进着色器：GLSL 里 1 和 1.0 类型不同，统一写成带小数点的形式。 */
const glsl = (x) => x.toFixed(4);

const vertexShader = /* glsl */ `
  in vec2 aCell;     // 这个点对应的像素（列, 行），行从图片顶部数
  in vec3 aRandom;   // 每个点的随机数（0–1）：出发的先后、散开的方向、开场时从哪里飞来
  uniform sampler2D uDepthA;  // 切换前的机位（A）和切换后的机位（B）；不在切换中时两者相同
  uniform sampler2D uIrA;
  uniform sampler2D uRgbA;
  uniform sampler2D uDepthB;
  uniform sampler2D uIrB;
  uniform sampler2D uRgbB;
  uniform vec2 uGrid;         // 网格的列数、行数
  uniform float uFocal;       // 相机焦距（以网格像素计）
  uniform float uMorph;       // 0 = A，1 = B
  uniform float uScatter;     // 1 = A 不是机位，而是开场时散在四周的随机位置
  uniform vec2 uLensCenter;   // 镜头中心（画布的设备像素，原点在左下角）
  uniform float uLensRadius;  // 镜头半径（设备像素）
  uniform vec2 uViewport;     // 画布大小（设备像素）
  uniform float uPointScale;  // 点的大小换算：设备像素焦距 × POINT_COVER ÷ uFocal
  out vec3 vColor;

  const float CORE = ${glsl(LENS_CORE)};
  const float FEATHER = ${glsl(LENS_FEATHER)};
  const float LEVELS = ${glsl(CONTOUR_LEVELS)};
  const float SPREAD = ${glsl(MORPH_SPREAD)};

  // 深度着色：与 build_dms.py 的 HEAT_STOPS 一致（深蓝 → 青绿 → 近白）
  vec3 heat(float h) {
    vec3 c0 = vec3(0.227, 0.357, 0.851);  // #3a5bd9
    vec3 c1 = vec3(0.361, 0.902, 0.824);  // #5ce6d2（站点强调色）
    vec3 c2 = vec3(0.941, 1.0, 0.988);    // #f0fffc
    h = clamp(h, 0.0, 1.0);
    return h < 0.5 ? mix(c0, c1, h / 0.5) : mix(c1, c2, (h - 0.5) / 0.5);
  }

  // 解码 12 位深度：R 是高 8 位，G 的高 4 位是低 4 位（见 build_dms.py）
  float depthAt(sampler2D map, ivec2 cell) {
    vec2 rg = floor(texelFetch(map, cell, 0).rg * 255.0 + 0.5);
    return (rg.r * 16.0 + floor(rg.g / 16.0)) / 4095.0;
  }

  // 一个机位在这个点上的样子：x = 深度，y = 等深线的强度，z = 画不画（0 或 1）
  vec3 depthLook(sampler2D map, ivec2 cell) {
    float d = depthAt(map, cell);
    ivec2 last = ivec2(uGrid) - 1;
    float right = depthAt(map, min(cell + ivec2(1, 0), last));
    float down = depthAt(map, min(cell + ivec2(0, 1), last));
    // 等深线：深度每变化 1/LEVELS 一条，线宽按相邻点的深度差算，约一个点宽
    float level = d * LEVELS;
    float width = length(vec2(right - d, down - d)) * LEVELS + 1e-4;
    float line = 1.0 - min(abs(fract(level - 0.5) - 0.5) / width, 1.0);
    float valid = step(0.5, texelFetch(map, cell, 0).b);
    return vec3(d, line, valid);
  }

  // 深度 → 相机坐标系里的位置（相机在原点，看向 -z）
  vec3 unproject(float d) {
    float z = mix(${glsl(Z_FAR)}, ${glsl(Z_NEAR)}, d);
    vec2 xy = (aCell + 0.5 + (aRandom.yz - 0.5) * ${glsl(JITTER)} - 0.5 * uGrid) / uFocal * z;
    return vec3(xy.x, -xy.y, -z);
  }

  void main() {
    ivec2 cell = ivec2(aCell);
    vec3 a = depthLook(uDepthA, cell);
    vec3 b = depthLook(uDepthB, cell);

    // 每个点的切换进度：从上到下依次出发，夹一点随机，像一道扫描线扫过
    float start = SPREAD * (0.7 * aCell.y / uGrid.y + 0.3 * aRandom.x);
    float t = clamp(uMorph * (1.0 + SPREAD) - start, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);

    vec3 fromPosition = unproject(a.x);
    vec3 scattered = vec3((aRandom.xy * 2.0 - 1.0) * vec2(1.4, 1.0), -0.25 - 1.6 * aRandom.z);
    fromPosition = mix(fromPosition, scattered, uScatter);
    float fromValid = mix(a.z, b.z, uScatter);  // 开场时只画 B 里要画的点
    vec3 position = mix(fromPosition, unproject(b.x), t) + (aRandom - 0.5) * ${glsl(SWIRL)} * sin(3.14159265 * t);
    float valid = mix(fromValid, b.z, t);

    vec4 view = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * view;
    // 不画的点：大小为 0 的点在有些显卡上仍会画出一个像素，所以直接移到画面外
    if (valid < 0.5) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 1.0;
      vColor = vec3(0.0);
      return;
    }
    // 点的直径随远近变化：正对时刚好等于相邻点的间距 × POINT_COVER
    gl_PointSize = clamp(uPointScale * (-position.z) / (-view.z), 1.0, 12.0);

    // 颜色
    float d = mix(a.x, b.x, t);
    float line = mix(a.y, b.y, t);
    float ir = mix(texelFetch(uIrA, cell, 0).r, texelFetch(uIrB, cell, 0).r, t);
    vec3 night = mix(texelFetch(uRgbA, cell, 0).rgb, texelFetch(uRgbB, cell, 0).rgb, t);
    vec3 irColor = vec3(ir) * vec3(0.92, 1.0, 1.0) * 1.1;
    vec3 depthColor = heat(d) * ${glsl(DEPTH_BASE)} + heat(d + 0.3) * line * ${glsl(LINE_GAIN)};

    vec2 screen = (gl_Position.xy / gl_Position.w * 0.5 + 0.5) * uViewport;
    float r = distance(screen, uLensCenter) / max(uLensRadius, 1.0);
    float inLens = uLensRadius > 0.5 ? 1.0 - smoothstep(1.0 - FEATHER, 1.0, r) : 0.0;
    float inCore = 1.0 - smoothstep(CORE - FEATHER, CORE, r);
    vColor = mix(night, mix(depthColor, irColor, inCore), inLens);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  in vec3 vColor;
  out vec4 outColor;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    if (dot(p, p) > 0.25) discard;  // 圆点
    outColor = vec4(vColor, 1.0);
  }
`;

function cssColor(element, name) {
  return new Color(getComputedStyle(element).getPropertyValue(name).trim());
}

/**
 * 启动场景。
 * @param {HTMLCanvasElement} canvas 绘制用的画布
 * @param {object} options
 * @param {string} options.base 数据目录，如 "/home/dms/"
 * @param {HTMLElement} options.root 这一页的元素：读取颜色变量，宽屏时加 data-wide；其中的 [data-view] 按钮切换机位，
 *   [data-lens] 是镜头的圆环
 * @param {() => void} [options.onReady] 第一帧画完后调用
 * @returns {Promise<{ setActive: (active: boolean) => void, destroy: () => void }>}
 */
export async function startDmsScene(canvas, { base, root, onReady }) {
  const meta = await (await fetch(`${base}meta.json`)).json();
  const loader = new TextureLoader();
  // 每个机位三张纹理。都用 texelFetch 按像素读取：不插值、不要 mipmap、不上下翻转（第 0 行是图片顶部）
  const textures = Object.fromEntries(
    await Promise.all(
      VIEW_ORDER.map(async (key) => {
        const files = meta.views[key];
        const [depth, ir, rgb] = await Promise.all([files.depth, files.ir, files.rgb].map((file) => loader.loadAsync(`${base}${file}`)));
        for (const texture of [depth, ir, rgb]) {
          texture.flipY = false;
          texture.generateMipmaps = false;
          texture.minFilter = NearestFilter;
          texture.magFilter = NearestFilter;
        }
        return [key, { depth, ir, rgb }];
      }),
    ),
  );

  const { width: gridWidth, height: gridHeight } = meta.grid;
  const focal = gridWidth / 2 / Math.tan((IMAGE_FOV_DEGREES * Math.PI) / 360);
  const background = cssColor(root, "--showcase-bg");

  // —— 点：每个像素一个，属性是像素位置和三个随机数 ——
  const count = gridWidth * gridHeight;
  const cells = new Float32Array(count * 2);
  const randoms = new Float32Array(count * 3);
  for (let row = 0, i = 0; row < gridHeight; row++) {
    for (let column = 0; column < gridWidth; column++, i++) {
      cells[2 * i] = column;
      cells[2 * i + 1] = row;
    }
  }
  for (let i = 0; i < randoms.length; i++) randoms[i] = Math.random();
  const geometry = new BufferGeometry();
  geometry.setAttribute("aCell", new BufferAttribute(cells, 2));
  geometry.setAttribute("aRandom", new BufferAttribute(randoms, 3));
  geometry.setDrawRange(0, count); // 没有 position 属性，要告诉 three.js 画多少个点

  const material = new ShaderMaterial({
    glslVersion: GLSL3,
    vertexShader,
    fragmentShader,
    uniforms: {
      uDepthA: { value: textures.front.depth },
      uIrA: { value: textures.front.ir },
      uRgbA: { value: textures.front.rgb },
      uDepthB: { value: textures.front.depth },
      uIrB: { value: textures.front.ir },
      uRgbB: { value: textures.front.rgb },
      uGrid: { value: new Vector2(gridWidth, gridHeight) },
      uFocal: { value: focal },
      uMorph: { value: 1 },
      uScatter: { value: 0 },
      uLensCenter: { value: new Vector2() },
      uLensRadius: { value: 0 },
      uViewport: { value: new Vector2(1, 1) },
      uPointScale: { value: 1 },
    },
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false; // 位置在着色器里算，three.js 不知道点在哪里

  // pivot 放在脸所在的深度，points 再移回来：转动时绕脸转，而不是绕相机转
  const pivot = new Group();
  pivot.rotation.order = "YXZ";
  pivot.add(points);
  const scene = new Scene();
  scene.add(pivot);

  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.setClearColor(background);

  // —— 相机：放在原点（原相机的位置）。视场角比原图大一些，让图像占画面的 FILL ——
  const camera = new PerspectiveCamera(50, 1, 0.02, 20);
  const imageHalfTanX = gridWidth / 2 / focal;
  const imageHalfTanY = gridHeight / 2 / focal;
  const viewport = new Vector2();
  let lensRadius = 1; // 镜头完全打开时的半径（设备像素）

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const halfTan = Math.max(imageHalfTanY, imageHalfTanX / camera.aspect) / FILL;
    camera.fov = (2 * Math.atan(halfTan) * 180) / Math.PI;
    const wide = camera.aspect > WIDE_ASPECT;
    root.toggleAttribute("data-wide", wide);
    if (wide) camera.setViewOffset(w, h, -w * WIDE_SHIFT, 0, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    renderer.getDrawingBufferSize(viewport);
    material.uniforms.uViewport.value.copy(viewport);
    // 设备像素焦距 = 画布高度 ÷ (2 × tan(半视场角))
    material.uniforms.uPointScale.value = ((viewport.y / (2 * halfTan)) * POINT_COVER) / focal;
    lensRadius = LENS_RADIUS * viewport.y * (imageHalfTanY / halfTan); // 图像在画面上的高度 × LENS_RADIUS
    requestRender();
  }

  // —— 机位按钮和镜头圆环 ——
  const buttons = [...root.querySelectorAll("[data-view]")];
  const ring = root.querySelector("[data-lens]");
  function markButtons(key) {
    for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.view === key));
  }

  /** 机位 key 的脸在相机坐标系里的位置。 */
  function facePosition(key) {
    const [fx, fy, d] = meta.views[key].face;
    const z = Z_FAR + (Z_NEAR - Z_FAR) * d;
    return new Vector3(((fx - 0.5) * gridWidth) / focal * z, (-(fy - 0.5) * gridHeight) / focal * z, -z);
  }

  // —— 状态 ——
  const deg = Math.PI / 180;
  const rest = { yaw: REST_YAW_DEGREES * deg, pitch: REST_PITCH_DEGREES * deg };
  const state = { yaw: 0, pitch: 0 };
  const target = { ...rest };
  let fromView = "front";
  let toView = "front";
  let morphStart = -1; // 切换开始的时间（performance.now()），-1 表示不在切换中
  let morphLength = MORPH_MS;
  let pendingView = null; // 切换途中点了别的机位：这次切换完成后再切
  let auto = true; // 没点过按钮时自动轮换机位
  let autoTimer = 0;
  let active = true;
  let mouse = null; // 鼠标在画布上的位置（设备像素，原点在左下角）；null = 鼠标不在页面里
  const lens = new Vector2(-1, -1); // 镜头当前的中心
  let lensOpen = 0; // 镜头打开的程度（0–1），开场结束时打开

  function morphProgress(now) {
    return morphStart < 0 ? 1 : Math.min(1, Math.max(0, (now - morphStart) / morphLength));
  }

  function setTextures(from, to) {
    const u = material.uniforms;
    u.uDepthA.value = textures[from].depth;
    u.uIrA.value = textures[from].ir;
    u.uRgbA.value = textures[from].rgb;
    u.uDepthB.value = textures[to].depth;
    u.uIrB.value = textures[to].ir;
    u.uRgbB.value = textures[to].rgb;
  }

  function scheduleAuto() {
    clearTimeout(autoTimer);
    if (auto && active) autoTimer = window.setTimeout(() => switchTo(VIEW_ORDER[(VIEW_ORDER.indexOf(toView) + 1) % VIEW_ORDER.length]), AUTO_VIEW_MS);
  }

  function switchTo(key) {
    if (morphStart >= 0) {
      pendingView = key;
      return;
    }
    if (key === toView) return;
    clearTimeout(autoTimer);
    fromView = toView;
    toView = key;
    setTextures(fromView, toView);
    material.uniforms.uScatter.value = 0;
    morphLength = MORPH_MS;
    morphStart = performance.now();
    markButtons(key);
    requestRender();
  }

  function playIntro() {
    clearTimeout(autoTimer);
    pendingView = null;
    fromView = toView = "front";
    setTextures("front", "front");
    markButtons("front");
    material.uniforms.uScatter.value = 1;
    morphLength = INTRO_MS;
    morphStart = performance.now() + INTRO_HOLD_MS;
    lensOpen = 0;
    state.yaw = REST_YAW_DEGREES * 2.5 * deg;
    state.pitch = REST_PITCH_DEGREES * deg;
    requestRender();
  }

  function onPointerMove(event) {
    if (!active || event.pointerType !== "mouse") return;
    const rect = canvas.getBoundingClientRect();
    const ratio = viewport.x / rect.width;
    mouse = new Vector2((event.clientX - rect.left) * ratio, (rect.bottom - event.clientY) * ratio);
    target.yaw = ((event.clientX / window.innerWidth) * 2 - 1) * MOUSE_YAW_DEGREES * deg;
    target.pitch = ((event.clientY / window.innerHeight) * 2 - 1) * MOUSE_PITCH_DEGREES * deg;
    requestRender();
  }
  function onPointerLeave() {
    mouse = null;
    Object.assign(target, rest);
    requestRender();
  }
  function onButtonClick(event) {
    auto = false; // 点过按钮后不再自动轮换
    clearTimeout(autoTimer);
    switchTo(event.currentTarget.dataset.view);
  }

  const faceWorld = new Vector3();
  let frame = 0;
  let first = true;
  function render(now) {
    frame = 0;
    // 切换（或开场）的进度。完成时收尾；如果途中点过别的机位，接着切过去（进度从 0 重新算）
    let progress = morphProgress(now);
    if (morphStart >= 0 && progress === 1) {
      morphStart = -1;
      fromView = toView;
      setTextures(toView, toView);
      material.uniforms.uScatter.value = 0;
      const next = pendingView;
      pendingView = null;
      if (next && next !== toView) switchTo(next);
      else scheduleAuto();
      progress = morphProgress(now);
    }
    const eased = progress * progress * (3 - 2 * progress);
    material.uniforms.uMorph.value = progress;
    const opening = material.uniforms.uScatter.value === 1; // 开场中（点还在飞来）

    // 转动：开场时从更大的角度转到默认角度；之后跟随鼠标
    for (const key of ["yaw", "pitch"]) state[key] += (target[key] - state[key]) * DAMPING;
    pivot.rotation.set(state.pitch, state.yaw, 0);
    // 旋转中心在两个机位的脸的深度之间过渡
    const pivotDepth = -(facePosition(fromView).z + (facePosition(toView).z - facePosition(fromView).z) * eased);
    pivot.position.set(0, 0, -pivotDepth);
    points.position.set(0, 0, pivotDepth);
    scene.updateMatrixWorld();

    // 镜头：鼠标在页面里时跟着鼠标，否则停在脸上；开场的点聚好之后才打开
    if (opening) lensOpen = 0;
    else lensOpen = Math.min(1, lensOpen + 0.04);
    faceWorld.copy(facePosition(fromView)).lerp(facePosition(toView), eased).applyMatrix4(points.matrixWorld).project(camera);
    const lensTarget = mouse ?? new Vector2((faceWorld.x * 0.5 + 0.5) * viewport.x, (faceWorld.y * 0.5 + 0.5) * viewport.y);
    if (lens.x < 0) lens.copy(lensTarget);
    else lens.lerp(lensTarget, LENS_DAMPING);
    material.uniforms.uLensCenter.value.copy(lens);
    const lensEase = lensOpen * lensOpen * (3 - 2 * lensOpen);
    const radius = lensRadius * lensEase;
    material.uniforms.uLensRadius.value = radius;
    if (ring) {
      // 设备像素 → 页面像素（原点在左上角）
      const ratio = renderer.getPixelRatio();
      const r = radius / ratio;
      ring.style.width = ring.style.height = `${2 * r}px`;
      ring.style.transform = `translate(${lens.x / ratio - r}px, ${(viewport.y - lens.y) / ratio - r}px)`;
      ring.style.opacity = String(lensEase);
    }

    renderer.render(scene, camera);
    if (first) {
      first = false;
      onReady?.();
    }
    const moving =
      morphStart >= 0 ||
      lensOpen < 1 ||
      Math.abs(target.yaw - state.yaw) > 0.0005 ||
      Math.abs(target.pitch - state.pitch) > 0.0005 ||
      lens.distanceTo(lensTarget) > 0.5;
    if (moving) requestRender();
  }
  function requestRender() {
    if (active && !frame) frame = requestAnimationFrame(render);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onPointerLeave);
  for (const button of buttons) button.addEventListener("click", onButtonClick);
  resize();
  playIntro();

  /** 切换页时由 HomeShowcase 调用。回到这一页时重新播放开场；离开时停止渲染和自动轮换。 */
  function setActive(value) {
    active = value;
    if (active) {
      playIntro();
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(autoTimer);
    }
  }

  function destroy() {
    cancelAnimationFrame(frame);
    clearTimeout(autoTimer);
    resizeObserver.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    for (const button of buttons) button.removeEventListener("click", onButtonClick);
    geometry.dispose();
    material.dispose();
    for (const set of Object.values(textures)) for (const texture of Object.values(set)) texture.dispose();
    renderer.dispose();
  }

  return { setActive, destroy };
}
