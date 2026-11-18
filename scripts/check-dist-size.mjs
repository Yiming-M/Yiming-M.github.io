/**
 * 构建结束后打印 dist/ 的总大小（设计文档 §8.1“体积提醒”）。由 package.json 的 build 脚本在 pagefind 之后调用。
 *
 * GitHub Pages 的站点上限是 1 GB。相册照片多了以后会逼近这个上限，所以超过 WARN_MB 时打印醒目的警告
 * （不让构建失败：超限前还有余地，由作者决定删减照片或改用链接图片）。
 */
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const DIST = "dist";
const WARN_MB = 800;
const LIMIT_MB = 1024;

async function sizeOf(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    total += entry.isDirectory() ? await sizeOf(full) : (await stat(full)).size;
  }
  return total;
}

const megabytes = (await sizeOf(DIST)) / 1024 / 1024;
console.log(`dist/ 总大小：${megabytes.toFixed(1)} MB（GitHub Pages 上限 ${LIMIT_MB} MB）`);
if (megabytes > WARN_MB) {
  console.warn(`\n⚠️  dist/ 已超过 ${WARN_MB} MB，接近 GitHub Pages 的 ${LIMIT_MB} MB 上限。考虑删减相册照片，或把部分照片改成链接图片。\n`);
}
