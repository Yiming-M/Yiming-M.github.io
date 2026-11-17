/**
 * 把霞鹜文楷 Bright GB（LXGW Bright GB）切分成网页字体。
 *
 * 为什么要切分：单个字重的 TTF 就有约 13MB，整包放进网站会让首次访问等很久。
 * cn-font-split 按字符把字体切成几十个带 `unicode-range` 的 woff2 小文件，
 * 浏览器只下载当前页面上实际出现的字所在的那几块（设计文档 §3.1）。
 *
 * 只有更换字体或字体版本时才需要重新运行；产物直接提交进仓库，构建时不再运行本脚本。
 *
 * 用法（在仓库根目录）：
 *   node scripts/fonts/split-lxgw-bright.mjs [字体所在目录]
 * 字体目录默认是 ~/Library/Fonts（作者本机已安装 LXGW Bright GB）。
 * 也可以从 https://github.com/lxgw/LxgwBright 下载 TTF 后指定其目录。
 *
 * 输入（三款）：
 *   LXGWBrightGB-Regular.ttf  → 正文，font-weight 400
 *   LXGWBrightGB-Medium.ttf   → 标题与加粗，font-weight 500–700（字体没有更粗的字重，
 *                               600/700 的请求也落到 Medium 上，避免浏览器伪造粗体）
 *   LXGWBrightGB-Italic.ttf   → 英文斜体。中文排版不用斜体，所以只保留拉丁字符
 *
 * 裁剪生僻字（见 keepFace）：
 *   字体收录了约 2.6 万个字符，全部保留时 @font-face 声明就有约 470KB（gzip 后约 160KB），
 *   每个页面都要先下载它。cn-font-split 按字频分块，生僻字集中在后面的块里。
 *   本脚本只保留“含有至少一个非汉字字符或 GB2312 字符”的块，约 1 万字，
 *   覆盖 GB2312 全部 6763 个汉字；CSS 降到约 1/3，仓库里的字体文件也少一半。
 *   不在保留范围内的生僻字会自动用系统字体显示，不会变成方块。
 *
 * 输出：
 *   public/fonts/lxgw-bright-gb/{regular,medium,italic}/*.woff2
 *   public/fonts/lxgw-bright-gb/fonts.css   ← 三款合并后的 @font-face，由 BaseLayout 引用
 *   public/fonts/lxgw-bright-gb/OFL.txt     ← 字体许可证（SIL Open Font License 1.1）。本脚本不生成也不删除它；
 *                                             更换字体版本时，按字体 name 表里的版权信息手动更新开头几行
 */
import { fontSplit } from "cn-font-split";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** 网页里使用的字体族名。故意和本机安装的 “LXGW Bright GB” 不同名，保证本地预览看到的就是网页字体。 */
const FAMILY = "LXGW Bright GB Web";

const sourceDir = process.argv[2] ?? path.join(os.homedir(), "Library/Fonts");
const outRoot = path.resolve("public/fonts/lxgw-bright-gb");

/**
 * 英文斜体只需要的拉丁字符范围：
 * 基本拉丁、拉丁补充、拉丁扩展 A、常用标点（引号、破折号、省略号等）。
 */
const latinCodePoints = [
  [0x0020, 0x007e],
  [0x00a0, 0x00ff],
  [0x0100, 0x017f],
  [0x2000, 0x206f],
].flatMap(([start, end]) => Array.from({ length: end - start + 1 }, (_, i) => start + i));

/**
 * GB2312 字符集（6763 个汉字 + 682 个符号）。
 * WHATWG 编码标准把 “gb2312” 映射到 GBK，二者在 GB2312 区段内的映射相同；
 * GBK 在这一区段里的用户自定义位置会解码到私用区（U+E000–U+F8FF），要排除。
 */
const gb2312 = new Set();
{
  const decoder = new TextDecoder("gbk", { fatal: true });
  for (let b1 = 0xa1; b1 <= 0xf7; b1++) {
    for (let b2 = 0xa1; b2 <= 0xfe; b2++) {
      try {
        const cp = decoder.decode(new Uint8Array([b1, b2])).codePointAt(0);
        if (cp < 0xe000 || cp > 0xf8ff) gb2312.add(cp);
      } catch {
        // 该位置在编码表里没有定义，跳过。
      }
    }
  }
}

/** 汉字及其他东亚文字从 U+2E80 开始；小于它的都是拉丁字母、标点、符号等。 */
const CJK_START = 0x2e80;

/** 把 CSS 的 unicode-range 值（如 "U+20-7E,U+4E00"）展开成码点数组。 */
function parseUnicodeRange(value) {
  return value.split(",").flatMap((part) => {
    const [start, end] = part.trim().replace(/^U\+/i, "").split("-").map((hex) => parseInt(hex, 16));
    if (Number.isNaN(start)) return [];
    return end === undefined ? [start] : Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });
}

/**
 * 决定一个字体块是否保留。
 * - 斜体：只保留纯拉丁块（不含任何东亚文字）。
 * - 正文和粗体：只要块里有一个非汉字字符或 GB2312 字符就保留；纯生僻字块丢弃。
 */
function keepFace(codePoints, style) {
  if (style === "italic") return codePoints.every((cp) => cp < CJK_START);
  return codePoints.some((cp) => cp < CJK_START || gb2312.has(cp));
}

const faces = [
  { dir: "regular", file: "LXGWBrightGB-Regular.ttf", weight: "400", style: "normal" },
  { dir: "medium", file: "LXGWBrightGB-Medium.ttf", weight: "500 700", style: "normal" },
  { dir: "italic", file: "LXGWBrightGB-Italic.ttf", weight: "400", style: "italic", subsets: [latinCodePoints] },
];

fs.rmSync(path.join(outRoot, "regular"), { recursive: true, force: true });
fs.rmSync(path.join(outRoot, "medium"), { recursive: true, force: true });
fs.rmSync(path.join(outRoot, "italic"), { recursive: true, force: true });

const cssParts = [];

for (const face of faces) {
  const input = path.join(sourceDir, face.file);
  if (!fs.existsSync(input)) {
    throw new Error(`找不到字体文件：${input}`);
  }
  const outDir = path.join(outRoot, face.dir);

  await fontSplit({
    input: new Uint8Array(fs.readFileSync(input)),
    outDir,
    css: {
      fontFamily: FAMILY,
      fontWeight: face.weight,
      fontStyle: face.style,
      fontDisplay: "swap",
      // 不用 local()：即使访客本机装了同名字体，也统一使用网页字体，保证各处显示一致。
      localFamily: [],
      compress: true,
    },
    // 每块约 16KB（默认 70KB）。文楷字形复杂，一页里的常用字会分散在很多块中；
    // 块越小，按需下载时多拉的无关字越少。2026-11-17 实测（只算 Regular）：
    //   短的中文页（72 个不同字符）：70KB 块需 451KB，16KB 块需 232KB；
    //   长文（838 个不同字符）：70KB 块需 1380KB，16KB 块需 1060KB。
    // 代价是请求数变多（长文约 90 个），HTTP/2 下影响不大；字体块跨页面共用，浏览器会缓存。
    chunkSize: 16 * 1024,
    ...(face.subsets ? { subsets: face.subsets, autoSubset: false } : {}),
    testHtml: false,
    reporter: false,
    renameOutputFont: "[hash:6].[ext]",
    silent: true,
  });

  // cn-font-split 在每个输出目录里生成 result.css：开头是一段字体信息注释，后面每个块一条 @font-face。
  // 逐条检查，丢弃不需要的块（连同它的 woff2 文件），保留的块把 url() 改成相对上一级目录的路径，
  // 因为最后要合并成一个 fonts.css 放在上一级目录。
  const css = fs.readFileSync(path.join(outDir, "result.css"), "utf8");
  const keptFiles = new Set();
  let kept = 0;
  let dropped = 0;
  for (const block of css.match(/@font-face\s*\{[^}]*\}/g) ?? []) {
    const file = block.match(/url\(["']?\.?\/?([^"')]+)["']?\)/)?.[1];
    const range = block.match(/unicode-range\s*:\s*([^;}]+)/)?.[1];
    if (!file || !range) throw new Error(`无法解析的 @font-face：${block.slice(0, 120)}`);
    if (keepFace(parseUnicodeRange(range), face.style)) {
      keptFiles.add(file);
      cssParts.push(block.replace(/url\(["']?\.?\/?([^"')]+)["']?\)/, `url("./${face.dir}/$1")`));
      kept++;
    } else {
      dropped++;
    }
  }
  fs.rmSync(path.join(outDir, "result.css"));

  // 只留下被保留的 woff2；丢弃的块和其他辅助产物（预览图、报告等）都删除。
  for (const name of fs.readdirSync(outDir)) {
    if (!keptFiles.has(name)) fs.rmSync(path.join(outDir, name), { recursive: true, force: true });
  }
  console.log(`${face.dir}: 保留 ${kept} 块，丢弃 ${dropped} 块`);
}

fs.writeFileSync(
  path.join(outRoot, "fonts.css"),
  `/* 由 scripts/fonts/split-lxgw-bright.mjs 生成，不要手改。字体：LXGW Bright GB（SIL OFL 1.1，见同目录 OFL.txt）。 */\n${cssParts.join("\n")}\n`,
);

console.log(`完成：${outRoot}`);
// cn-font-split 的原生模块会留下后台线程，进程不会自己退出，这里显式结束。
process.exit(0);
