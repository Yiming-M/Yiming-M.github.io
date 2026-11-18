/**
 * 从封面图里提取相册的强调色（设计文档 §8.2）：相册索引页用它给序号、渐变等小地方着色。
 *
 * 在浏览器里做，而不是构建时：构建时读取像素需要额外的图片解码依赖。做法是把已经下载好的封面
 * 缩成 24×24，按“饱和度高、亮度适中”加权平均颜色，再把亮度和饱和度拉到在深色渐变上看得清的范围。
 */

const SAMPLE_SIZE = 24;

/** 返回 CSS 颜色（hsl）。图片来自不允许跨域读取像素的网站时（链接图片）返回 undefined，页面保留默认颜色。 */
export function accentFrom(img: HTMLImageElement): string | undefined {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SAMPLE_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  let pixels: Uint8ClampedArray;
  try {
    pixels = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  } catch {
    return undefined; // 跨域图片：浏览器禁止读取像素
  }
  let r = 0;
  let g = 0;
  let b = 0;
  let total = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const [, s, l] = toHsl(pixels[i], pixels[i + 1], pixels[i + 2]);
    const weight = s * s * (1 - Math.abs(l - 0.5) * 2) + 0.001; // 鲜艳、不太暗也不太亮的像素权重大
    r += pixels[i] * weight;
    g += pixels[i + 1] * weight;
    b += pixels[i + 2] * weight;
    total += weight;
  }
  const [hue, saturation] = toHsl(r / total, g / total, b / total);
  return `hsl(${Math.round(hue * 360)} ${Math.round(Math.max(saturation, 0.45) * 100)}% 68%)`;
}

/** RGB（0–255）→ HSL（各项 0–1）。 */
function toHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
