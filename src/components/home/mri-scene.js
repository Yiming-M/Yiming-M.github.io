/**
 * 首页 3D 前列腺 MRI 场景（设计文档 §4，方案 C：解剖模型 + 切面）。
 *
 * 由 HomeShowcase.astro 在浏览器端按需动态加载：第一次切到这一页、且设备适合显示 3D 时才加载（手机、减少动态效果、不支持 WebGL2 时不会加载本文件）。
 *
 * 画面：
 * - 三个半透明的三维曲面：外周带（青绿）、移行带（淡紫）、病灶（橙）。“X 光玻璃”质感：
 *   正对视线的部分几乎透明，边缘发亮（菲涅尔效果），层层叠加，像全息投影。
 * - 一张原始分辨率的横断面 MRI 切片水平穿过腺体，切片上画出三个区域的彩色轮廓；四周渐隐融入背景。
 *   切片下方的曲面调暗，形成“被切片挡住”的前后关系。
 * - 宽屏上模型偏右，左侧是文字标注，用引线连到模型上对应的位置（引线每帧随模型更新）。
 *
 * 交互：
 * - 打开页面时：模型从侧转约 30° 的角度转正，切片从腺体顶部扫到病灶所在的层面。
 * - 鼠标左右移动：模型绕竖直轴旋转 ±35°。鼠标上下移动：切片在腺体里上下扫过（屏幕上方 = 头侧）。
 * - 鼠标离开页面：回到正面、切片回到病灶层面。
 * 只在画面需要变化时渲染，静止时不占用 GPU。
 *
 * 数据（scripts/mri/build_scene.py 生成，放在 public/home/mri/，格式见 meta.json 和那个脚本的说明）：
 * slices.bin.gz（切片）、labels.bin.gz（切片上的标签与轮廓）、meshes.bin.gz（曲面）、meta.json。
 *
 * 切片的着色规则与 build_scene.py 的 render_static() 一致（静态图就是同一张切片），改动时两边一起改。
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Data3DTexture,
  DoubleSide,
  GLSL3,
  Group,
  LinearFilter,
  Mesh,
  NearestFilter,
  PerspectiveCamera,
  PlaneGeometry,
  RedFormat,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector3,
  WebGLRenderer,
} from "three";

// —— 可调参数 ——
/** 鼠标在画面左右边缘时，模型绕竖直轴旋转的角度（度）。 */
const MAX_YAW_DEGREES = 35;
/** 相机的俯视角（度）：从斜上方看，才能同时看到水平的切片和立体的曲面。 */
const CAMERA_ELEVATION_DEGREES = 32;
/** 开场时模型的初始旋转角度（度）。 */
const INTRO_YAW_DEGREES = -30;
/** 每帧向目标靠近的比例（0–1），越小越“慢悠悠”。 */
const DAMPING = 0.07;
/** 模型（切片的可见圆盘 + 曲面）在画面高度里所占的比例。 */
const FILL_RATIO = 0.82;
/** 宽屏时把模型往右挪的比例（占画面宽度），给左侧的标注留位置。 */
const WIDE_SHIFT = 0.13;
/** 画面宽高比大于这个值时才算“宽屏”，启用右移和引线标注。 */
const WIDE_ASPECT = 1.35;
/** 渲染分辨率上限：高分屏下最多按 2 倍像素渲染。 */
const MAX_PIXEL_RATIO = 2;
/** 切片亮度（3D 里）：调暗一些，曲面叠加上去时不会发白。 */
const SLICE_BRIGHTNESS = 0.62;

const sliceVertexShader = /* glsl */ `
  out vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// 切片：灰度 + 病灶淡橙色填充 + 三个区域的彩色轮廓 + 圆形渐隐。与 build_scene.py 的 render_static() 一致。
const sliceFragmentShader = /* glsl */ `
  precision highp float;
  precision highp sampler3D;
  uniform sampler3D uSlices;
  uniform sampler3D uLabels;
  uniform float uW;          // 当前层在纹理里的 z 坐标（取层中心，避免相邻两层混在一起）
  uniform vec3 uPz;
  uniform vec3 uTz;
  uniform vec3 uLesion;
  uniform float uBrightness; // 只在 3D 里把切片调暗一些，让叠在上面的曲面更突出（静态图不调暗）
  in vec2 vUv;
  out vec4 outColor;
  void main() {
    // uv 的 v 方向：0 在腹侧（前），对应数据的第一行，所以可以直接作为纹理坐标
    vec3 uvw = vec3(vUv, uW);
    float v = texture(uSlices, uvw).r;
    int label = int(texture(uLabels, uvw).r * 255.0 + 0.5);
    vec3 color = pow(v, 0.9) * vec3(0.82, 0.88, 0.96) * uBrightness;
    if ((label & 3) == 3) color = color * 0.65 + uLesion * 0.35;
    if ((label & 4) != 0) color = uPz;
    if ((label & 8) != 0) color = uTz;
    if ((label & 16) != 0) color = uLesion;
    float fade = 1.0 - smoothstep(0.30, 0.50, length(vUv - 0.5));
    outColor = vec4(color, fade);
  }
`;

const meshVertexShader = /* glsl */ `
  out vec3 vNormal;
  out vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

// 曲面：“X 光玻璃”。正对视线处几乎透明，边缘（视线掠过的地方）发亮；与背景相加混合，层层叠加。
const meshFragmentShader = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uBase;     // 正对视线时的亮度
  uniform float uRim;      // 边缘额外的亮度
  uniform float uPlaneY;   // 切片的高度：低于切片的部分调暗，看起来像被切片挡住
  in vec3 vNormal;
  in vec3 vWorld;
  out vec4 outColor;
  void main() {
    vec3 view = normalize(cameraPosition - vWorld);
    float facing = abs(dot(normalize(vNormal), view));
    float glow = uBase + uRim * pow(1.0 - facing, 2.2);
    if (vWorld.y < uPlaneY) glow *= 0.38;
    outColor = vec4(uColor, glow);
  }
`;

/** 下载并解压数据。GitHub Pages 把 .gz 当普通文件提供，这里自己解压；若服务器已自动解压则直接使用。 */
async function loadBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`无法加载 ${url}`);
  const buffer = new Uint8Array(await response.arrayBuffer());
  if (!(buffer[0] === 0x1f && buffer[1] === 0x8b)) return buffer;
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function volumeTexture(data, [width, height, depth], filter) {
  const texture = new Data3DTexture(data, width, height, depth);
  texture.format = RedFormat;
  texture.type = UnsignedByteType;
  texture.minFilter = filter;
  texture.magFilter = filter;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

/** 从 meshes.bin 里取出一个结构的曲面。坐标单位 mm（文件里是 0.01 mm 的整数）。 */
function meshGeometry(buffer, { offset, vertexCount, indexCount }) {
  const quantised = new Int16Array(buffer.buffer, buffer.byteOffset + offset, vertexCount * 3);
  const positions = Float32Array.from(quantised, (value) => value / 100);
  const indices = new Uint16Array(buffer.buffer, buffer.byteOffset + offset + vertexCount * 6, indexCount);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(Uint16Array.from(indices), 1));
  geometry.computeVertexNormals();
  return geometry;
}

function cssColor(element, name) {
  return new Color(getComputedStyle(element).getPropertyValue(name).trim());
}

/**
 * 启动场景。
 * @param {HTMLCanvasElement} canvas 绘制用的画布（铺满展示区）
 * @param {object} options
 * @param {string} options.base 数据目录，如 "/home/mri/"
 * @param {HTMLElement} options.root 展示区元素：从它读取颜色变量，并在宽屏时给它加 data-wide
 * @param {Record<string, HTMLElement>} options.callouts 标注文字元素，键为 pz / tz / lesion
 * @param {Record<string, SVGPathElement>} options.leaders 引线元素，键同上
 * @param {HTMLElement} [options.readout] 显示“当前第几层”的元素
 * @param {() => void} [options.onReady] 第一帧画完后调用
 * @returns {Promise<{ setActive: (active: boolean) => void, destroy: () => void }>}
 *          setActive：切到 / 离开这一页时调用；destroy：停止并释放资源
 */
export async function startMriScene(canvas, { base, root, callouts, leaders, readout, onReady }) {
  const meta = await (await fetch(`${base}meta.json`)).json();
  const [slices, labels, meshBuffer] = await Promise.all([
    loadBytes(`${base}slices.bin.gz`),
    loadBytes(`${base}labels.bin.gz`),
    loadBytes(`${base}meshes.bin.gz`),
  ]);

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.setClearColor(cssColor(root, "--showcase-bg"));

  // 颜色与 tokens.css 一致。着色器直接输出到屏幕，所以传 sRGB 值（即 CSS 里写的颜色）。
  const srgb = (color) => {
    const { r, g, b } = color.getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
    return new Vector3(r, g, b);
  };
  const colors = {
    pz: srgb(cssColor(root, "--mri-pz")),
    tz: srgb(cssColor(root, "--mri-tz")),
    lesion: srgb(cssColor(root, "--mri-lesion")),
  };

  const scene = new Scene();
  const model = new Group();
  scene.add(model);

  // —— 切片 ——
  const { plane, slices: sliceInfo } = meta;
  const depth = sliceInfo.dims[2];
  const sliceMaterial = new ShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: sliceVertexShader,
    fragmentShader: sliceFragmentShader,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uSlices: { value: volumeTexture(slices, sliceInfo.dims, LinearFilter) },
      uLabels: { value: volumeTexture(labels, sliceInfo.dims, NearestFilter) },
      uW: { value: 0.5 },
      uPz: { value: colors.pz },
      uTz: { value: colors.tz },
      uLesion: { value: colors.lesion },
      uBrightness: { value: SLICE_BRIGHTNESS },
    },
  });
  const sliceGeometry = new PlaneGeometry(plane.width, plane.height);
  sliceGeometry.rotateX(-Math.PI / 2); // 平放：平面的 v 方向从腹侧（前）指向背侧（后）
  const slice = new Mesh(sliceGeometry, sliceMaterial);
  slice.position.set(plane.centerX, 0, plane.centerZ);
  slice.renderOrder = 0;
  model.add(slice);

  // —— 曲面 ——
  // 相加混合：曲面的正反两面、几层曲面会叠加，亮度不能太高，否则发白、看不出颜色
  const meshStyle = {
    pz: { base: 0.03, rim: 0.42 },
    tz: { base: 0.03, rim: 0.42 },
    lesion: { base: 0.24, rim: 0.65 },
  };
  const meshMaterials = [];
  for (const key of ["tz", "pz", "lesion"]) {
    const material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: meshVertexShader,
      fragmentShader: meshFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      uniforms: {
        uColor: { value: colors[key] },
        uBase: { value: meshStyle[key].base },
        uRim: { value: meshStyle[key].rim },
        uPlaneY: { value: 0 },
      },
    });
    meshMaterials.push(material);
    const mesh = new Mesh(meshGeometry(meshBuffer, meta.meshes[key]), material);
    mesh.renderOrder = 1;
    model.add(mesh);
  }

  // —— 相机 ——
  const camera = new PerspectiveCamera(30, 1, 1, 2000);
  const elevation = (CAMERA_ELEVATION_DEGREES * Math.PI) / 180;
  /** 切片渐隐后可见部分的半径（mm）：渐隐从半径 0.30 开始、0.50 结束，取 0.42 作为“看得见”的边界。 */
  const visibleRadius = 0.42 * Math.max(plane.width, plane.height);
  /** 曲面在竖直方向上的半高（mm）。 */
  const meshHalfHeight = Math.max(
    ...model.children
      .filter((child) => child !== slice)
      .map((child) => {
        child.geometry.computeBoundingBox();
        const box = child.geometry.boundingBox;
        return Math.max(Math.abs(box.min.y), Math.abs(box.max.y));
      }),
  );
  /** 从斜上方看时，模型在画面上的半高（mm）：圆盘被压扁成椭圆，再加上曲面的高度。 */
  const halfExtentY = visibleRadius * Math.sin(elevation) + meshHalfHeight * Math.cos(elevation);
  let wide = false;

  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    wide = camera.aspect > WIDE_ASPECT;
    root.toggleAttribute("data-wide", wide);
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
    const fitHeight = halfExtentY / FILL_RATIO / tanHalf;
    const fitWidth = visibleRadius / FILL_RATIO / (tanHalf * camera.aspect * (wide ? 1 - 2 * WIDE_SHIFT : 1));
    const distance = Math.max(fitHeight, fitWidth);
    camera.position.set(0, Math.sin(elevation) * distance, Math.cos(elevation) * distance);
    camera.lookAt(0, 0, 0);
    // 宽屏：整个画面向右平移，模型偏右，左侧留给标注
    if (wide) camera.setViewOffset(width, height, -width * WIDE_SHIFT, 0, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    requestRender();
  }

  // —— 状态：旋转角度和切片位置（层序号，可以是小数），都朝目标缓动 ——
  const maxYaw = (MAX_YAW_DEGREES * Math.PI) / 180;
  const restSlice = sliceInfo.lesionSlice;
  const state = { yaw: (INTRO_YAW_DEGREES * Math.PI) / 180, slice: depth - 1 };
  const target = { yaw: 0, slice: restSlice };

  /** 这一页是否正在显示。首页有多个项目页，切到别的页时不响应鼠标、不渲染。 */
  let active = true;

  function onPointerMove(event) {
    if (!active || event.pointerType !== "mouse") return;
    target.yaw = ((event.clientX / window.innerWidth) * 2 - 1) * maxYaw;
    target.slice = (1 - event.clientY / window.innerHeight) * (depth - 1); // 屏幕上方 = 头侧
    requestRender();
  }
  function onPointerLeave() {
    target.yaw = 0;
    target.slice = restSlice;
    requestRender();
  }

  // —— 引线：从左侧的文字连到模型上的锚点 ——
  const anchors = Object.fromEntries(
    Object.entries(meta.meshes).map(([key, mesh]) => [key, new Vector3(...mesh.anchor)]),
  );
  const projected = new Vector3();
  function updateLeaders() {
    if (!wide) return;
    const canvasRect = canvas.getBoundingClientRect();
    for (const [key, path] of Object.entries(leaders)) {
      const label = callouts[key];
      if (!label || !anchors[key]) continue;
      projected.copy(anchors[key]).applyMatrix4(model.matrixWorld).project(camera);
      const ax = ((projected.x + 1) / 2) * canvasRect.width;
      const ay = ((1 - projected.y) / 2) * canvasRect.height;
      const box = label.getBoundingClientRect();
      const sx = box.right - canvasRect.left + 12;
      const sy = box.top + box.height / 2 - canvasRect.top;
      const elbow = sx + Math.max(24, (ax - sx) * 0.35);
      path.setAttribute("d", `M ${sx} ${sy} H ${elbow} L ${ax} ${ay}`);
    }
  }

  // —— 按需渲染 ——
  let frame = 0;
  let first = true;
  function render() {
    frame = 0;
    state.yaw += (target.yaw - state.yaw) * DAMPING;
    state.slice += (target.slice - state.slice) * DAMPING;
    model.rotation.y = state.yaw;
    model.updateMatrixWorld();

    // 切片位置连续移动；切片图像取最近的一层，避免两层混在一起出现重影
    const shown = Math.min(depth - 1, Math.max(0, Math.round(state.slice)));
    const y = plane.firstY + (state.slice + 0.5) * plane.sliceThickness;
    slice.position.y = y;
    sliceMaterial.uniforms.uW.value = (shown + 0.5) / depth;
    for (const material of meshMaterials) material.uniforms.uPlaneY.value = y;
    if (readout) readout.textContent = `${shown + 1} / ${depth}`;

    renderer.render(scene, camera);
    updateLeaders();
    if (first) {
      first = false;
      onReady?.();
    }
    const moving = Math.abs(target.yaw - state.yaw) > 0.0005 || Math.abs(target.slice - state.slice) > 0.01;
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

  /** 切换页时由 HomeShowcase 调用：离开时停止渲染；回来时从正面和病灶层面开始。 */
  function setActive(value) {
    active = value;
    if (active) {
      onPointerLeave();
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  function destroy() {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    scene.traverse((object) => {
      if (object.isMesh) {
        object.geometry.dispose();
        object.material.dispose();
      }
    });
    sliceMaterial.uniforms.uSlices.value.dispose();
    sliceMaterial.uniforms.uLabels.value.dispose();
    renderer.dispose();
  }

  return { setActive, destroy };
}
