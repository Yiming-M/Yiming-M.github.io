/**
 * 相册索引页的“液态扭曲”（设计文档 §8.2）：鼠标悬停在封面上时，封面像液面一样缓缓流动，
 * 鼠标周围泛起一圈圈涟漪；移开后慢慢平复。
 *
 * 做法：全页只有一块 WebGL 画布。悬停到某个封面时，把画布移进那个封面（叠在 <img> 上面），
 * 用封面图片（浏览器已经下载好的那张）作纹理重新画一遍，再在着色器里按噪声和涟漪偏移采样位置。
 * 扭曲强度为 0 时画面与 <img> 完全一样，所以画布出现和消失时看不出切换。
 *
 * 只在桌面端启用：有鼠标、宽度 ≥ 768px、支持 WebGL2、没有开启“减少动态效果”。不满足时什么都不做。
 * 不依赖 three.js，免得索引页为一个效果多下载几百 KB。
 */

/** 扭曲强度每帧向目标靠近的比例：越小，起伏出现和平复得越慢。 */
const EASE = 0.06;
/** 流动的幅度和涟漪的幅度（占画面的比例）。 */
const FLOW_AMOUNT = 0.02;
const RIPPLE_AMOUNT = 0.012;
/** 画布的最大像素比：扭曲后的画面本来就有些模糊，不必用满高分屏的分辨率。 */
const MAX_PIXEL_RATIO = 1.5;

const vertexSource = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const fragmentSource = `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform vec2 uCoverScale;  // 模拟 object-fit: cover：图片在画布上只显示中间这一部分
uniform vec2 uMouse;       // 鼠标位置（0–1，原点在左下角）
uniform float uAspect;     // 画布宽高比：让涟漪是圆的
uniform float uTime;
uniform float uStrength;   // 扭曲强度（0–1）
in vec2 vUv;
out vec4 outColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  vec2 toMouse = vUv - uMouse;
  toMouse.x *= uAspect;
  float dist = length(toMouse);
  // 慢慢流动的噪声 + 从鼠标处向外扩散、越远越弱的涟漪
  vec2 flow = vec2(noise(vUv * 3.0 + uTime * 0.12), noise(vUv * 3.0 + 17.3 - uTime * 0.12)) - 0.5;
  float ripple = sin(dist * 30.0 - uTime * 3.0) * exp(-dist * 5.0);
  vec2 offset = (flow * ${FLOW_AMOUNT.toFixed(4)} + normalize(toMouse + 1e-5) * ripple * ${RIPPLE_AMOUNT.toFixed(4)}) * uStrength;
  vec2 st = (vUv + offset - 0.5) * uCoverScale + 0.5;
  outColor = texture(uImage, st);
}`;

/** 给 root 下的每个 [data-liquid] 元素（里面要有一张 <img>）加上悬停扭曲。 */
export function setupLiquid(root: ParentNode) {
  const enabled =
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    window.innerWidth >= 768;
  if (!enabled) return;

  const canvas = document.createElement("canvas");
  canvas.className = "liquid-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: false });
  if (!gl) return;

  const program = createProgram(gl);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  for (const [key, value] of [
    [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
    [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
    [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
    [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
  ])
    gl.texParameteri(gl.TEXTURE_2D, key, value);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    coverScale: uniform("uCoverScale"),
    mouse: uniform("uMouse"),
    aspect: uniform("uAspect"),
    time: uniform("uTime"),
    strength: uniform("uStrength"),
  };

  let host: HTMLElement | null = null; // 当前悬停的封面
  let target = 0; // 目标强度：悬停时 1，移开后 0
  let strength = 0;
  const mouse = [0.5, 0.5];
  let frame = 0;
  const start = performance.now();

  function attach(element: HTMLElement) {
    const img = element.querySelector("img");
    if (!img || !img.complete || img.naturalWidth === 0) return; // 图片还没下载完：这次不扭曲
    host = element;
    element.append(canvas);
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    canvas.width = Math.round(element.clientWidth * ratio);
    canvas.height = Math.round(element.clientHeight * ratio);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, img);
    // object-fit: cover：图片比画布宽时只显示中间的一段宽度，反之只显示中间的一段高度
    const canvasAspect = canvas.width / canvas.height;
    const imageAspect = img.naturalWidth / img.naturalHeight;
    gl!.uniform2f(u.coverScale, Math.min(1, canvasAspect / imageAspect), Math.min(1, imageAspect / canvasAspect));
    gl!.uniform1f(u.aspect, canvasAspect);
  }

  function render(now: number) {
    frame = 0;
    strength += (target - strength) * EASE;
    if (target === 0 && strength < 0.002) {
      strength = 0;
      canvas.remove();
      host = null;
      return;
    }
    gl!.uniform2f(u.mouse, mouse[0], mouse[1]);
    gl!.uniform1f(u.time, (now - start) / 1000);
    gl!.uniform1f(u.strength, strength);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    frame = requestAnimationFrame(render);
  }

  function track(event: PointerEvent, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    mouse[0] = (event.clientX - rect.left) / rect.width;
    mouse[1] = 1 - (event.clientY - rect.top) / rect.height;
  }

  /** 鼠标在封面上：开始（或继续）扭曲。也响应 pointermove：页面加载时鼠标已经停在封面上，不会触发 pointerenter。 */
  function hover(event: PointerEvent, element: HTMLElement) {
    if (event.pointerType !== "mouse") return;
    if (host !== element) {
      strength = 0;
      attach(element);
      if (host !== element) return; // 图片还没下载完
    }
    track(event, element);
    target = 1;
    if (!frame) frame = requestAnimationFrame(render);
  }

  for (const element of root.querySelectorAll<HTMLElement>("[data-liquid]")) {
    element.addEventListener("pointerenter", (event) => hover(event, element));
    element.addEventListener("pointermove", (event) => hover(event, element));
    element.addEventListener("pointerleave", () => {
      if (host === element) target = 0;
    });
  }
  // 窗口大小变了：按新尺寸重新设置画布
  window.addEventListener("resize", () => {
    if (host) attach(host);
  });
}

function createProgram(gl: WebGL2RenderingContext) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "着色器编译失败");
    return shader;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "着色器链接失败");
  gl.useProgram(program);
  return program;
}
