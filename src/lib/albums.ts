/**
 * 相册数据（设计文档 §8）：读取 albums 集合（格式见 src/content.config.ts），补全每张照片的信息，
 * 供相册索引页、相册页和站点地图使用。
 *
 * 每张照片：
 * - 本地文件：拿到 Astro 的图片对象（ImageMetadata）。页面据此在构建时生成多尺寸的 AVIF/WebP；
 *   原图地址是构建产物里的原文件，不压缩、不限分辨率（灯箱里的“原图”）。
 * - 链接图片：原样引用，不做处理。尺寸用 YAML 里的 width / height，没写时在构建时联网探测；
 *   探测失败时报错，提示去 YAML 里手写。
 * - EXIF：本地照片自动读取（相机、镜头、焦距、光圈、快门、ISO、拍摄时间）；YAML 里的 exif 覆盖同名字段。
 *   GPS 不读取、不展示（原图文件里保留，设计文档 §8.1）。
 *
 * 数据有问题（照片文件不存在、封面不在 photos 里）时直接报错，让构建失败，而不是带着缺图上线。
 */
import type { ImageMetadata } from "astro";
import { inferRemoteSize } from "astro:assets";
import { getCollection, type CollectionEntry } from "astro:content";
import exifr from "exifr";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Locale, LocalizedText } from "./site";

/** 相册文件夹里所有图片的 Astro 图片对象，键是形如 /src/content/albums/<slug>/<文件名> 的路径。 */
const localImages = import.meta.glob<ImageMetadata>("/src/content/albums/*/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}", {
  eager: true,
  import: "default",
});

/** 显示用的 EXIF，各项都已格式化成文字（如 "f/2.8"、"1/250 s"）；没有的项不出现。 */
export type PhotoExif = {
  camera?: string;
  lens?: string;
  focal?: string;
  aperture?: string;
  shutter?: string;
  iso?: string;
  taken?: string;
};

export type AlbumPhoto = {
  /** 在 album.yaml 里写的 src（文件名或链接）。 */
  src: string;
  /** 本地照片的图片对象；链接图片没有。 */
  image?: ImageMetadata;
  width: number;
  height: number;
  caption?: LocalizedText;
  exif: PhotoExif;
  /** 原图地址：本地照片是构建产物里的原文件，链接图片就是链接本身。 */
  original: string;
};

export type Album = {
  /** 文件夹名，也是网址里的 slug。 */
  slug: string;
  title: LocalizedText;
  /** 年-月，如 "2025-08"。 */
  date: string;
  place: LocalizedText;
  intro?: LocalizedText;
  placeholder: boolean;
  photos: AlbumPhoto[];
  cover: AlbumPhoto;
};

/** exifr 读取的标签。DateTimeOriginal 保留原始字符串（不带时区），避免被构建机器的时区换算。 */
const EXIF_TAGS = ["Make", "Model", "LensModel", "FocalLength", "FNumber", "ExposureTime", "ISO", "DateTimeOriginal"];

type RawExif = {
  Make?: string;
  Model?: string;
  LensModel?: string;
  FocalLength?: number;
  FNumber?: number;
  ExposureTime?: number;
  ISO?: number;
  DateTimeOriginal?: string;
};

/**
 * 读取一张本地照片的 EXIF 并格式化。照片没有 EXIF 时返回空对象。
 * 先自己把文件读进内存再交给 exifr：exifr 7.1.3 按路径分块读文件时调用 FileHandle.stat 的方式与新版 Node 不兼容。
 */
async function readExif(file: string): Promise<PhotoExif> {
  const raw: RawExif | undefined = await exifr.parse(await readFile(file), { pick: EXIF_TAGS, reviveValues: false });
  if (!raw) return {};
  const exif: PhotoExif = {};
  if (raw.Model) {
    // 很多相机的型号里已经带了品牌（如 Make "Canon"、Model "Canon EOS R8"），避免写成 “Canon Canon EOS R8”
    const brand = raw.Make?.trim().split(/\s+/)[0] ?? "";
    exif.camera = raw.Model.toLowerCase().startsWith(brand.toLowerCase()) ? raw.Model.trim() : `${raw.Make!.trim()} ${raw.Model.trim()}`;
  }
  if (raw.LensModel) exif.lens = raw.LensModel.trim();
  // 保留一位小数：卡片机、手机的焦距常有小数（如 4.5mm），取整会失真
  if (raw.FocalLength) exif.focal = `${Number(raw.FocalLength.toFixed(1))}mm`;
  if (raw.FNumber) exif.aperture = `f/${Number(raw.FNumber.toFixed(1))}`;
  if (raw.ExposureTime) exif.shutter = raw.ExposureTime >= 1 ? `${raw.ExposureTime} s` : `1/${Math.round(1 / raw.ExposureTime)} s`;
  if (raw.ISO) exif.iso = String(raw.ISO);
  if (raw.DateTimeOriginal) {
    // EXIF 格式 "2025:08:10 08:15:00" → "2025-08-10 08:15"
    const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/.exec(raw.DateTimeOriginal);
    if (match) exif.taken = `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}`;
  }
  return exif;
}

/** album.yaml 里 photos 的一项。 */
type AlbumPhotoInput = CollectionEntry<"albums">["data"]["photos"][number];

async function resolvePhoto(slug: string, folder: string, photo: AlbumPhotoInput): Promise<AlbumPhoto> {
  const base = { src: photo.src, caption: photo.caption };
  if (/^https?:\/\//.test(photo.src)) {
    let { width, height } = photo;
    if (!width || !height) {
      try {
        ({ width, height } = await inferRemoteSize(photo.src));
      } catch (error) {
        throw new Error(`相册 ${slug}：无法探测 ${photo.src} 的尺寸，请在 album.yaml 里给这张照片写上 width 和 height`, { cause: error });
      }
    }
    return { ...base, width, height, exif: { ...photo.exif }, original: photo.src };
  }

  const image = localImages[`/src/content/albums/${slug}/${photo.src}`];
  if (!image) throw new Error(`相册 ${slug}：找不到照片 ${photo.src}（应放在 src/content/albums/${slug}/ 里）`);
  const exif = { ...(await readExif(path.join(folder, photo.src))), ...photo.exif };
  return { ...base, image, width: image.width, height: image.height, exif, original: image.src };
}

async function loadAlbums(): Promise<Album[]> {
  const entries = await getCollection("albums");
  const albums = await Promise.all(
    entries.map(async (entry) => {
      const { data } = entry;
      const folder = path.dirname(path.resolve(entry.filePath!));
      const photos = await Promise.all(data.photos.map((photo) => resolvePhoto(entry.id, folder, photo)));
      const cover = data.cover ? photos.find((photo) => photo.src === data.cover) : photos[0];
      if (!cover) throw new Error(`相册 ${entry.id}：封面 ${data.cover} 不在 photos 里`);
      return {
        slug: entry.id,
        title: data.title,
        date: data.date,
        place: data.place,
        intro: data.intro,
        placeholder: data.placeholder,
        photos,
        cover,
      };
    }),
  );
  // 新的在前；同一个月的按标题排，保证每次构建顺序一致
  return albums.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

/** 正式构建时只读一次 EXIF、探测一次尺寸；开发时每次重新读取，改了照片或 YAML 立即生效。 */
let cached: Promise<Album[]> | undefined;
export function getAlbums(): Promise<Album[]> {
  if (!import.meta.env.PROD) return loadAlbums();
  cached ??= loadAlbums();
  return cached;
}

/** 相册日期 "2025-08" → “2025 年 8 月” / “August 2025”。 */
export function formatAlbumDate(locale: Locale, date: string) {
  const [year, month] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", { year: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

/** EXIF 按固定顺序排成一行文字的各项：相机 · 镜头 · 焦距 · 光圈 · 快门 · ISO · 拍摄时间。 */
export function exifItems(exif: PhotoExif): string[] {
  return [exif.camera, exif.lens, exif.focal, exif.aperture, exif.shutter, exif.iso && `ISO ${exif.iso}`, exif.taken].filter(
    (item): item is string => Boolean(item),
  );
}

/** 本地照片生成的宽度（像素）。2400 足够 1440px 宽的高分屏满幅显示。 */
const RESPONSIVE_WIDTHS = [640, 1024, 1600, 2400];

/** 一张宽 width 的照片要生成哪些宽度：不超过原图，并包含原图宽度（原图比 2400 小时）。 */
export function responsiveWidths(width: number): number[] {
  const largest = Math.min(width, RESPONSIVE_WIDTHS.at(-1)!);
  return [...new Set([...RESPONSIVE_WIDTHS.filter((w) => w < largest), largest])];
}

/** 照片的方向：横幅（宽高比 ≥ 1.2）、竖幅（≤ 0.9）、接近方形。版式按方向安排。 */
export function orientation(photo: AlbumPhoto): "landscape" | "portrait" | "square" {
  const ratio = photo.width / photo.height;
  return ratio >= 1.2 ? "landscape" : ratio <= 0.9 ? "portrait" : "square";
}
