/**
 * 首页“人群计数”页的 3D 场景（设计文档 §4），对应作者的 CLIP-EBC / ZIP 论文。
 *
 * 由 HomeShowcase.astro 在第一次切到这一页时按需加载（手机、减少动态效果、不支持 WebGL2 时不会加载）。
 *
 * 画面是“密度地形”：
 * - 一张人群照片平放在下面；
 * - 由人头标注生成的人群密度图，从照片上升起成一片发光的地形：人越密越高，颜色从深蓝到青绿再到近白，
 *   表面画着等高线。人群计数模型输出的正是这样一张密度图，对它求和就得到人数。
 *
 * 交互：
 * - 打开这一页时：先正对照片（看起来就是一张普通照片），然后照片向后放倒，地形从照片上升起，
 *   左侧的人数同时从 0 数到总数。
 * - 鼠标上下移动：在页面最上方正对照片，看到原照片；往下移，照片逐渐放倒、地形升起；
 *   到最下方照片放得最平，看到一座座山峰。
 * - 鼠标左右移动：绕屏幕的竖直轴旋转。上下、左右互不影响：只上下移动时只改变放倒的角度，不会左右转。
 * - 鼠标离开页面：回到默认状态。
 * - 鼠标停在照片或地形上：鼠标旁边的标签（[data-density-tip]）显示该处的人群密度，
 *   即鼠标碰到的那一点周围 100×100 原照片像素里的人数。做法见 pickCell() 和 windowDensity()。
 * 只在画面需要变化时渲染。
 *
 * 数据（scripts/crowd/build_crowd.py 生成，放在 public/home/crowd/，格式见该脚本开头）：
 * density.png（地形的高度图）、photo.jpg（照片）、meta.json（其中 density.peakPer10k、cellSize 用来把高度换算回密度）。
 * 配色、等高线条数、照片调暗的亮度与 build_crowd.py 一致（静态图用同样的配色），改动时两边一起改。
 */
import { AdditiveBlending, Color, DoubleSide, GLSL3, Group, LinearFilter, Matrix4, Mesh, PerspectiveCamera, PlaneGeometry, Raycaster, Scene, ShaderMaterial, TextureLoader, Vector2, Vector3, WebGLRenderer } from "three";

// —— 可调参数 ——
/** 照片在场景里的宽度（场景单位）；高度按照片比例。 */
const PLANE_WIDTH = 100;
/** 地形最高处的高度（场景单位，照片宽 100）。 */
const TERRAIN_HEIGHT = 9;
// 画面由“进度” p 决定：p = 0 正对照片（原照片），p = 1 照片放得最平（山峰）。鼠标的上下位置对应 p。
/** p = 1 时照片向后放倒的角度（度）：0 = 正对屏幕，90 = 完全平躺、从侧面看。放得越平，越像一座座山峰。 */
const MAX_TILT_DEGREES = 68;
/** p = 1 时相机到照片中心的距离，相对于“正对照片、照片刚好占满画面”时的距离：放倒后照片显得矮，靠近一点。 */
const MAX_TILT_ZOOM = 0.92;
/** 地形在 p 达到这个值时完全升起，之后只继续放倒照片。 */
const RISE_END = 0.5;
/** 页面上下各留这么多（占页面高度的比例）作为饱和区：鼠标不必移到最边缘就能看到原照片或山峰。 */
const MOUSE_EDGE = 0.12;
/** 开场结束、鼠标离开页面时停留的进度。 */
const REST_PROGRESS = 0.8;
/** 开场结束、鼠标离开页面时的转角（度）：转开一点才看得出立体。 */
const REST_YAW_DEGREES = -14;
/** 鼠标在画面左右边缘时转多少度（绕屏幕的竖直轴）。鼠标在水平正中时不转，所以移到最上方正中看到的正是原照片。 */
const MOUSE_YAW_DEGREES = 25;
const FOV_DEGREES = 30;
const DAMPING = 0.06;
/** 等高线条数：与 build_crowd.py 的 CONTOURS 一致。 */
const CONTOURS = 8;
/** 地形升起后照片调暗到的亮度：与 build_crowd.py 的 PHOTO_DIM 一致。 */
const PHOTO_DIM = 0.45;
/** 宽屏时整体右移的比例，给左侧文字留位置。 */
const WIDE_SHIFT = 0.1;
const WIDE_ASPECT = 1.35;
const MAX_PIXEL_RATIO = 2;
/** 开场：先正对照片停留 INTRO_HOLD_MS 毫秒，再用 INTRO_MS 毫秒缓动（先慢、中间快、再慢）到默认状态。
 * 按时间而不是按帧缓动，屏幕刷新率不同时开场的长短也一样。 */
const INTRO_HOLD_MS = 1000;
const INTRO_MS = 3600;
/** 找鼠标碰到的地形时，从地形最高处到照片平面之间分成多少步：步数越多越准，256 步在网格上已不到一格。 */
const PICK_STEPS = 256;
/** 鼠标处的密度取周围多大一块（原照片像素，正方形边长）的平均，与标签上的单位一致。
 * 密度图是一个个人头的小峰叠成的，逐点读数会随鼠标挪动一两个像素大起大落，取一块的平均才平稳。 */
const DENSITY_WINDOW_PX = 100;
/** 密度标签相对鼠标的偏移（像素），免得挡住鼠标指着的地方。 */
const TIP_OFFSET = 16;

// 地形：顶点着色器按高度图把平面网格抬起来，并用相邻高度差算出法线
const terrainVertex = /* glsl */ `
  uniform sampler2D uHeightMap;
  uniform vec2 uTexel;       // 高度图一个像素的大小（纹理坐标）
  uniform vec2 uGridScale;   // 网格顶点 → 高度图像素中心的换算
  uniform vec2 uCellSize;    // 网格一格的大小（场景单位）
  uniform float uHeight;     // 当前地形最高处（场景单位）；开场时从 0 升起
  out float vHeight;
  out vec3 vNormal;
  out vec3 vViewDir;

  float heightAt(vec2 st) { return texture(uHeightMap, st).r; }

  void main() {
    vec2 st = uv * uGridScale + 0.5 * uTexel;
    float h = heightAt(st);
    float dx = heightAt(st + vec2(uTexel.x, 0.0)) - heightAt(st - vec2(uTexel.x, 0.0));
    float dy = heightAt(st + vec2(0.0, uTexel.y)) - heightAt(st - vec2(0.0, uTexel.y));
    vec3 normal = normalize(vec3(-dx * uHeight / (2.0 * uCellSize.x), -dy * uHeight / (2.0 * uCellSize.y), 1.0));
    vec4 view = modelViewMatrix * vec4(position + vec3(0.0, 0.0, h * uHeight), 1.0);
    gl_Position = projectionMatrix * view;
    vHeight = h;
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-view.xyz);
  }
`;

// 地形的颜色：加法混合的“发光玻璃”（与 MRI 页的曲面一致）——斜着看的地方更亮，加上等高线
const terrainFragment = /* glsl */ `
  precision highp float;
  uniform float uOpacity;
  in float vHeight;
  in vec3 vNormal;
  in vec3 vViewDir;
  out vec4 outColor;

  // 配色：与 build_crowd.py 的 HEAT_STOPS 一致（深蓝 → 青绿 → 近白）
  vec3 heat(float h) {
    vec3 c0 = vec3(0.227, 0.357, 0.851);  // #3a5bd9
    vec3 c1 = vec3(0.361, 0.902, 0.824);  // #5ce6d2（站点强调色）
    vec3 c2 = vec3(0.941, 1.0, 0.988);    // #f0fffc
    return h < 0.5 ? mix(c0, c1, h / 0.5) : mix(c1, c2, (h - 0.5) / 0.5);
  }

  void main() {
    float h = vHeight;
    if (h < 0.004) discard;  // 没有人的地方是平地，不画，露出照片
    float facing = abs(dot(normalize(vNormal), normalize(vViewDir)));
    float rim = pow(1.0 - facing, 2.0);
    // 等高线：高度每升高 1/${CONTOURS} 一条，线宽按屏幕像素算（fwidth），远近都一样细
    float level = h * ${CONTOURS}.0;
    float line = 1.0 - min(abs(fract(level - 0.5) - 0.5) / max(fwidth(level), 1e-4), 1.0);
    float glow = (0.08 + 0.3 * h + 0.45 * rim + 0.7 * line) * smoothstep(0.0, 0.08, h);
    outColor = vec4(heat(h) * glow * uOpacity, 1.0);
  }
`;

// 照片：开场时原样显示，地形升起后调暗；四边淡入背景色，免得照片的边缘太生硬
const photoVertex = /* glsl */ `
  out vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const photoFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uPhoto;
  uniform float uDim;
  uniform float uEdge;       // 四边淡出的宽度（纹理坐标）；正对照片时为 0
  uniform vec3 uBackground;
  in vec2 vUv;
  out vec4 outColor;
  void main() {
    vec2 d = min(vUv, 1.0 - vUv);
    float fade = uEdge > 0.0 ? smoothstep(0.0, uEdge, min(d.x, d.y)) : 1.0;
    outColor = vec4(mix(uBackground, texture(uPhoto, vUv).rgb * uDim, fade), 1.0);
  }
`;

/** 读出高度图每个像素的灰度（0–255），第 0 行是图片顶部。 */
function readHeights(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const rgba = context.getImageData(0, 0, image.width, image.height).data;
  const values = new Uint8Array(image.width * image.height);
  for (let i = 0; i < values.length; i++) values[i] = rgba[4 * i];
  return values;
}

/** 高度² 的累加表：第 (r, c) 项是第 0..r-1 行、0..c-1 列所有格的高度² 之和，任意方块的和只需四次加减。 */
function summedSquares(heights, width, height) {
  const stride = width + 1;
  const sums = new Float64Array(stride * (height + 1));
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const h = heights[row * width + column] / 255;
      sums[(row + 1) * stride + column + 1] = h * h + sums[row * stride + column + 1] + sums[(row + 1) * stride + column] - sums[row * stride + column];
    }
  }
  return sums;
}

function cssColor(element, name) {
  return new Color(getComputedStyle(element).getPropertyValue(name).trim());
}

/**
 * 启动场景。
 * @param {HTMLCanvasElement} canvas 绘制用的画布
 * @param {object} options
 * @param {string} options.base 数据目录，如 "/home/crowd/"
 * @param {HTMLElement} options.root 这一页的元素：读取颜色变量，宽屏时加 data-wide，开场时更新其中 .count 的人数，
 *   鼠标处的密度写进其中的 [data-density-tip]
 * @param {() => void} [options.onReady] 第一帧画完后调用
 * @returns {Promise<{ setActive: (active: boolean) => void, destroy: () => void }>}
 */
export async function startCrowdScene(canvas, { base, root, onReady }) {
  const meta = await (await fetch(`${base}meta.json`)).json();
  const loader = new TextureLoader();
  const [heightMap, photo] = await Promise.all([loader.loadAsync(`${base}${meta.density.file}`), loader.loadAsync(`${base}${meta.photo.file}`)]);
  // 高度图在顶点着色器里读取，不需要 mipmap；照片按原样的 sRGB 数值使用（着色器直接输出 sRGB，与 MRI 场景一致）
  heightMap.generateMipmaps = false;
  heightMap.minFilter = LinearFilter;
  photo.anisotropy = 4;

  const { width: gridWidth, height: gridHeight } = meta.density;
  const planeHeight = (PLANE_WIDTH * gridHeight) / gridWidth;
  const heights = readHeights(heightMap.image); // 同一张高度图在 CPU 上的副本，用来找鼠标碰到的地形和读密度
  const squareSums = summedSquares(heights, gridWidth, gridHeight);
  const windowCells = Math.max(1, Math.round(DENSITY_WINDOW_PX / meta.density.cellSize));
  const background = cssColor(root, "--showcase-bg");

  const photoMaterial = new ShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: photoVertex,
    fragmentShader: photoFragment,
    uniforms: { uPhoto: { value: photo }, uDim: { value: 1 }, uEdge: { value: 0 }, uBackground: { value: background } },
  });
  const terrainMaterial = new ShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: terrainVertex,
    fragmentShader: terrainFragment,
    uniforms: {
      uHeightMap: { value: heightMap },
      uTexel: { value: new Vector2(1 / gridWidth, 1 / gridHeight) },
      uGridScale: { value: new Vector2((gridWidth - 1) / gridWidth, (gridHeight - 1) / gridHeight) },
      uCellSize: { value: new Vector2(PLANE_WIDTH / (gridWidth - 1), planeHeight / (gridHeight - 1)) },
      uHeight: { value: 0 },
      uOpacity: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide, // 峰的背面也画
  });

  // 地形网格的每个顶点对应高度图的一个像素
  const photoGeometry = new PlaneGeometry(PLANE_WIDTH, planeHeight);
  const terrainGeometry = new PlaneGeometry(PLANE_WIDTH, planeHeight, gridWidth - 1, gridHeight - 1);
  const photoMesh = new Mesh(photoGeometry, photoMaterial);
  const terrainMesh = new Mesh(terrainGeometry, terrainMaterial);
  photoMesh.position.z = -0.05; // 略低于地形的底，避免两者重叠闪烁

  // tilt 绕 X 轴把照片向后放倒；turn 再把放倒后的照片绕屏幕的竖直轴（Y 轴）转动，像转盘一样
  const tilt = new Group();
  const turn = new Group();
  tilt.add(photoMesh, terrainMesh);
  turn.add(tilt);
  const scene = new Scene();
  scene.add(turn);

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.setClearColor(background);

  // —— 相机：正对照片中心。fitDistance 是“正对照片时照片刚好放进画面”的距离（宽、高都放得下）——
  const camera = new PerspectiveCamera(FOV_DEGREES, 1, 1, 2000);
  let fitDistance = 1;

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = camera.aspect > WIDE_ASPECT;
    root.toggleAttribute("data-wide", wide);
    if (wide) camera.setViewOffset(w, h, -w * WIDE_SHIFT, 0, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    const halfTan = Math.tan((FOV_DEGREES * Math.PI) / 360);
    fitDistance = 1.04 * Math.max(planeHeight / 2 / halfTan, PLANE_WIDTH / 2 / (halfTan * camera.aspect));
    requestRender();
  }

  // —— 人数：只在开场时随地形升起从 0 数到总数，之后一直显示总数 ——
  const countElement = root.querySelector(".count");
  const locale = document.documentElement.lang.startsWith("zh") ? "zh-CN" : "en-GB";
  let shownCount = -1;
  function showCount(fraction) {
    const value = Math.round(meta.count * fraction);
    if (!countElement || value === shownCount) return;
    shownCount = value;
    countElement.textContent = value.toLocaleString(locale);
  }

  // —— 状态：tilt 放倒角度、yaw 转角、zoom 相机距离、rise 地形升起的程度（0–1，同时控制照片调暗和边缘淡出）——
  const deg = Math.PI / 180;
  const KEYS = ["tilt", "yaw", "zoom", "rise"];
  /** 进度 p（0–1）和转角（度）→ 状态。 */
  function viewAt(p, yawDegrees) {
    return {
      tilt: p * MAX_TILT_DEGREES * deg,
      yaw: yawDegrees * deg,
      zoom: 1 + (MAX_TILT_ZOOM - 1) * p,
      rise: Math.min(1, p / RISE_END),
    };
  }
  const photoView = viewAt(0, 0); // 正对照片，看起来就是一张普通照片
  const rest = viewAt(REST_PROGRESS, REST_YAW_DEGREES);
  const state = { ...photoView };
  const target = { ...photoView };
  let active = true;
  let introStart = -1; // 开场缓动的开始时间（performance.now() 的时间），-1 表示不在开场中

  function playIntro() {
    Object.assign(state, photoView);
    Object.assign(target, photoView);
    introStart = performance.now() + INTRO_HOLD_MS;
    requestRender();
  }

  // —— 鼠标处的密度 ——
  const tip = root.querySelector("[data-density-tip]");
  const tipValue = tip?.querySelector("[data-value]");
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const toLocal = new Matrix4();
  const origin = new Vector3();
  const direction = new Vector3();
  let pointer = null; // 鼠标的页面坐标；null = 不显示密度（鼠标不在画面上，或停在链接、按钮上）

  /** 地形网格上 (x, y)（场景单位，原点在照片中心）落在高度图的哪一格：[列, 行]，第 0 行是照片顶部。 */
  function cellOf(x, y) {
    return [Math.round((x / PLANE_WIDTH + 0.5) * (gridWidth - 1)), Math.round((0.5 - y / planeHeight) * (gridHeight - 1))];
  }

  /**
   * 以 (column, row) 为中心、边长 windowCells 格（即 DENSITY_WINDOW_PX 原照片像素）的方块里的平均密度，
   * 单位是原照片每 100×100 像素的人数。高度 = (密度 / 上限)^0.5（build_crowd.py 的 HEIGHT_GAMMA），
   * 所以每格的密度 = 高度² × peakPer10k；方块超出照片的部分不算。
   */
  function windowDensity(column, row) {
    const half = Math.floor(windowCells / 2);
    const c0 = Math.max(0, column - half);
    const c1 = Math.min(gridWidth, column - half + windowCells);
    const r0 = Math.max(0, row - half);
    const r1 = Math.min(gridHeight, row - half + windowCells);
    const stride = gridWidth + 1;
    const sum = squareSums[r1 * stride + c1] - squareSums[r0 * stride + c1] - squareSums[r1 * stride + c0] + squareSums[r0 * stride + c0];
    return (sum / ((c1 - c0) * (r1 - r0))) * meta.density.peakPer10k;
  }

  /**
   * 鼠标碰到的地形表面那一点在高度图的哪一格（[列, 行]）；没碰到照片时返回 null。
   * 把鼠标的视线换到地形的局部坐标里（照片在 z = 0 平面，地形向 +z 升起），从地形最高处的高度
   * 一步步往下走，第一次低于地形表面的地方就是碰到的点：地形升起时会先碰到前面的山峰，而不是后面的平地。
   */
  function pickCell() {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((pointer.x - rect.left) / rect.width) * 2 - 1, -((pointer.y - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    toLocal.copy(terrainMesh.matrixWorld).invert();
    origin.copy(raycaster.ray.origin).applyMatrix4(toLocal);
    direction.copy(raycaster.ray.direction).transformDirection(toLocal);
    if (direction.z >= 0) return null; // 视线没有朝向照片
    const top = terrainMaterial.uniforms.uHeight.value;
    const enter = (top - origin.z) / direction.z;
    const exit = -origin.z / direction.z;
    const steps = top > 0 ? PICK_STEPS : 1;
    for (let i = 1; i <= steps; i++) {
      const t = enter + ((exit - enter) * i) / steps;
      const x = origin.x + direction.x * t;
      const y = origin.y + direction.y * t;
      if (Math.abs(x) > PLANE_WIDTH / 2 || Math.abs(y) > planeHeight / 2) continue;
      const cell = cellOf(x, y);
      if (origin.z + direction.z * t <= (heights[cell[1] * gridWidth + cell[0]] / 255) * top || i === steps) return cell;
    }
    return null;
  }

  /** 按当前的视角重新找鼠标处的密度，更新标签的文字和位置。 */
  function updateTip() {
    if (!tip) return;
    const cell = pointer && active && introStart < 0 ? pickCell() : null;
    tip.hidden = cell === null;
    canvas.style.cursor = cell === null ? "" : "crosshair";
    if (cell === null) return;
    const density = windowDensity(cell[0], cell[1]);
    tipValue.textContent = density.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const box = root.getBoundingClientRect();
    tip.style.transform = `translate(${pointer.x - box.left + TIP_OFFSET}px, ${pointer.y - box.top + TIP_OFFSET}px)`;
  }

  function onPointerMove(event) {
    if (!active || event.pointerType !== "mouse") return;
    // 停在页头、小方块等链接和按钮上时不显示密度
    pointer = event.target instanceof Element && event.target.closest("a, button, header, nav") ? null : { x: event.clientX, y: event.clientY };
    updateTip();
    introStart = -1; // 鼠标一动就结束开场，从当前状态平滑地跟随鼠标
    const p = Math.min(1, Math.max(0, (event.clientY / window.innerHeight - MOUSE_EDGE) / (1 - 2 * MOUSE_EDGE))); // 页面上方 = 原照片
    const yaw = ((event.clientX / window.innerWidth) * 2 - 1) * MOUSE_YAW_DEGREES; // 只由水平位置决定
    Object.assign(target, viewAt(p, yaw));
    requestRender();
  }
  function onPointerLeave() {
    pointer = null;
    updateTip();
    Object.assign(target, rest);
    requestRender();
  }

  let frame = 0;
  let first = true;
  function render(now) {
    frame = 0;
    if (introStart >= 0) {
      const t = Math.min(1, Math.max(0, (now - introStart) / INTRO_MS));
      const eased = t * t * (3 - 2 * t);
      for (const key of KEYS) state[key] = target[key] = photoView[key] + (rest[key] - photoView[key]) * eased;
      if (t === 1) introStart = -1;
    } else {
      for (const key of KEYS) state[key] += (target[key] - state[key]) * DAMPING;
    }

    tilt.rotation.x = -state.tilt;
    turn.rotation.y = state.yaw;
    camera.position.set(0, 0, fitDistance * state.zoom);
    camera.lookAt(0, 0, 0);
    terrainMaterial.uniforms.uHeight.value = TERRAIN_HEIGHT * state.rise;
    terrainMaterial.uniforms.uOpacity.value = Math.min(1, state.rise * 1.5);
    photoMaterial.uniforms.uDim.value = 1 + (PHOTO_DIM - 1) * state.rise;
    photoMaterial.uniforms.uEdge.value = 0.08 * state.rise;
    showCount(introStart >= 0 ? state.rise : 1);
    renderer.render(scene, camera);
    if (pointer) updateTip(); // 视角在变，鼠标下的那一点也在变
    if (first) {
      first = false;
      onReady?.();
    }
    const moving = introStart >= 0 || KEYS.some((key) => Math.abs(target[key] - state[key]) > 0.0005);
    if (moving) requestRender();
  }
  function requestRender() {
    if (active && !frame) frame = requestAnimationFrame(render);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onPointerLeave);
  resize();
  playIntro();

  /** 切换页时由 HomeShowcase 调用。回到这一页时重新播放开场；离开时人数恢复为总数。 */
  function setActive(value) {
    active = value;
    if (active) {
      playIntro();
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      showCount(1);
      pointer = null;
      updateTip();
    }
  }

  function destroy() {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    showCount(1);
    photoGeometry.dispose();
    terrainGeometry.dispose();
    photoMaterial.dispose();
    terrainMaterial.dispose();
    heightMap.dispose();
    photo.dispose();
    renderer.dispose();
  }

  return { setActive, destroy };
}
