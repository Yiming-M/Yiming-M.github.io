"""
把一张人群照片和它的人头点标注，处理成首页“人群计数”页的数据（设计文档 §4）。

画面是“密度地形”：照片平放在下面，由人头标注生成的人群密度图从照片上升起，成为一片发光的地形，
人越密，地形越高。人群计数模型输出的正是这样一张密度图，对它求和就得到人数。

输入（放仓库外）：
    <标注>.npy   人头点标注，[N, 2] 的 (x, y)，原图像素坐标（作者 ZIP 仓库里 NWPU-Crowd 的格式）
    <照片>.jpg   原图

输出（写入 public/home/crowd/，进仓库）：
    density.png  地形的高度图：灰度 8 位，GRID_WIDTH 宽，与照片同比例；0–255 对应高度 0–1
    photo.jpg    地形下面的照片（3D 场景的贴图）
    static.jpg   静态图：照片叠加平面的热力图和等高线（手机、减少动态效果、不支持 WebGL2 时显示）
    meta.json    人数、各文件的尺寸、数据来源。density.peakPer10k 是高度 1 对应的密度（原照片每 100×100
                 像素的人数），某格的密度 = 高度² × peakPer10k；density.cellSize 是一个网格像素对应原照片
                 多少像素。网页上鼠标处的密度取周围 100×100 原照片像素的平均

密度图的做法（与人群计数论文里生成训练标签的常用做法一致）：
    每个人头放一个面积为 1 的高斯核，核的大小随透视变化：sigma = BETA × 到最近 K 个人头的平均距离
    （MCNN 论文的“几何自适应核”）。前排的人离得远、核大，后排挤在一起、核小。所有核相加就是密度图，总和等于人数。
地形高度 = (密度 / 高分位数) ^ HEIGHT_GAMMA。取平方根是为了让前排稀疏处的小山包也看得见；
这只影响画面，不影响人数。

用法：
    python3 -I scripts/crowd/build_crowd.py <标注.npy> <照片.jpg>
依赖：numpy、scipy（最近邻）、Pillow（缩放照片、合成静态图）。
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy.spatial import cKDTree

OUT_DIR = os.path.join("public", "home", "crowd")

# —— 密度图 ——
GRID_WIDTH = 576  # 高度图的宽度（像素），3D 地形的网格与它一一对应；高度按照片比例
BETA = 0.3  # 几何自适应核：sigma = BETA × 到最近 K 个人头的平均距离（MCNN 的取值）
K_NEIGHBOURS = 3
SIGMA_MIN_PX = 12.0  # 核大小的上下限，单位是原照片的像素：太小地形上是一根根细针，太大会糊成一片
SIGMA_MAX_PX = 90.0
HEIGHT_PERCENTILE = 99.9  # 用这个分位数作为高度 1，个别特别尖的峰被截平
HEIGHT_GAMMA = 0.5

# —— 照片和静态图 ——
PHOTO_WIDTH = 1600  # 3D 场景里照片贴图的宽度
STATIC_WIDTH = 1400
# 以下配色和参数与 crowd-scene.js 的着色器一致：深蓝 → 青绿（站点强调色）→ 近白
HEAT_STOPS = [
    (0.0, (0x3A, 0x5B, 0xD9)),
    (0.5, (0x5C, 0xE6, 0xD2)),
    (1.0, (0xF0, 0xFF, 0xFC)),
]
CONTOURS = 8  # 等高线条数（高度 0–1 之间等分）
PHOTO_DIM = 0.45  # 照片调暗到的亮度
STATIC_HEAT_OPACITY = 0.8


def heat_color(value):
    """高度（0–1）→ 颜色（0–1 的 RGB），在 HEAT_STOPS 之间线性插值。"""
    value = np.clip(value, 0, 1)[..., None]
    result = np.zeros(value.shape[:-1] + (3,))
    for (p0, c0), (p1, c1) in zip(HEAT_STOPS, HEAT_STOPS[1:]):
        t = np.clip((value - p0) / (p1 - p0), 0, 1)
        segment = (np.array(c0) + (np.array(c1) - np.array(c0)) * t) / 255
        result = np.where((value >= p0) & (value <= p1), segment, result)
    return result


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def density_map(heads, original_size, grid_size):
    """人头点 → 几何自适应核的密度图（grid_size = (宽, 高)），总和约等于人数（边缘外的部分丢掉）。"""
    (width0, _), (width, height) = original_size, grid_size
    scale = width / width0
    points = heads * scale
    distances, _ = cKDTree(points).query(points, k=K_NEIGHBOURS + 1)
    sigmas = np.clip(BETA * distances[:, 1:].mean(axis=1), SIGMA_MIN_PX * scale, SIGMA_MAX_PX * scale)
    density = np.zeros((height, width))
    for (x, y), sigma in zip(points, sigmas):
        r = int(np.ceil(4 * sigma))
        x0, x1 = max(0, int(x) - r), min(width, int(x) + r + 1)
        y0, y1 = max(0, int(y) - r), min(height, int(y) + r + 1)
        yy, xx = np.mgrid[y0:y1, x0:x1]
        density[y0:y1, x0:x1] += np.exp(-((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2) / (2 * sigma**2)) / (2 * np.pi * sigma**2)
    return density


def density_peak(density):
    """高度 1 对应的密度（每个网格像素的人数）：HEIGHT_PERCENTILE 分位数。"""
    return np.percentile(density[density > 0], HEIGHT_PERCENTILE)


def terrain_height(density):
    """密度 → 地形高度（0–1）。"""
    return np.clip(density / density_peak(density), 0, 1) ** HEIGHT_GAMMA


def main():
    label_path, photo_path = sys.argv[1], sys.argv[2]
    heads = np.load(label_path).astype(np.float64)  # 标注是 int16，先转浮点，免得后面的乘法溢出
    photo = Image.open(photo_path).convert("RGB")
    original_size = photo.size

    os.makedirs(OUT_DIR, exist_ok=True)
    grid = (GRID_WIDTH, round(GRID_WIDTH * photo.height / photo.width))
    density = density_map(heads, original_size, grid)
    height = terrain_height(density)
    # 高度 h 处的密度 = h² × peak（每个网格像素的人数，HEIGHT_GAMMA = 0.5）。一个网格像素是原照片的
    # (原宽 / 网格宽)² 个像素，换算成原照片每 100×100 像素的人数，网页上显示用
    assert HEIGHT_GAMMA == 0.5, "网页按 高度² 还原密度，改了 HEIGHT_GAMMA 要同步改 crowd-scene.js"
    peak_per_10k = density_peak(density) * (grid[0] / original_size[0]) ** 2 * 100 * 100
    Image.fromarray(np.round(height * 255).astype(np.uint8), mode="L").save(os.path.join(OUT_DIR, "density.png"), optimize=True)

    texture = photo.resize((PHOTO_WIDTH, round(PHOTO_WIDTH * photo.height / photo.width)), Image.LANCZOS)
    texture.save(os.path.join(OUT_DIR, "photo.jpg"), quality=82, optimize=True)

    # 旧版（VGGT 点云、分块柱子）的文件，已不再使用
    for stale in ("cloud.bin.gz", "colour.jpg", "points.bin.gz"):
        path = os.path.join(OUT_DIR, stale)
        if os.path.exists(path):
            os.remove(path)

    # —— 静态图：照片调暗，叠加平面的热力图和等高线（3D 地形从正上方看的样子）——
    still = photo.resize((STATIC_WIDTH, round(STATIC_WIDTH * photo.height / photo.width)), Image.LANCZOS)
    h = terrain_height(density_map(heads, original_size, still.size))
    level = np.floor(h * CONTOURS)
    edge = np.zeros_like(h, dtype=bool)  # 相邻像素跨过一条等高线的地方画线
    edge[:, 1:] |= level[:, 1:] != level[:, :-1]
    edge[1:, :] |= level[1:, :] != level[:-1, :]
    alpha = (smoothstep(0.02, 0.5, h) * STATIC_HEAT_OPACITY)[..., None]
    base = np.asarray(still).astype(np.float64) / 255 * PHOTO_DIM
    blended = base * (1 - alpha) + heat_color(h) * alpha
    blended[edge] = blended[edge] * 0.3 + heat_color(np.minimum(h[edge] + 0.3, 1)) * 0.7
    Image.fromarray(np.round(np.clip(blended, 0, 1) * 255).astype(np.uint8)).save(
        os.path.join(OUT_DIR, "static.jpg"), quality=80, optimize=True
    )

    meta = {
        "_comment": "由 scripts/crowd/build_crowd.py 生成，不要手改。格式见该脚本开头。",
        "count": int(len(heads)),
        "density": {
            "file": "density.png",
            "width": grid[0],
            "height": grid[1],
            "peakPer10k": round(float(peak_per_10k), 4),
            "cellSize": round(original_size[0] / grid[0], 4),
        },
        "photo": {"file": "photo.jpg", "width": texture.width, "height": texture.height},
        "static": {"file": "static.jpg", "width": still.width, "height": still.height},
        "source": {
            "dataset": "NWPU-Crowd（验证集）",
            "image": os.path.basename(photo_path),
            "datasetUrl": "https://gjy3035.github.io/NWPU-Crowd-Sample-Code/",
        },
    }
    with open(os.path.join(OUT_DIR, "meta.json"), "w", encoding="utf-8") as file:
        json.dump(meta, file, ensure_ascii=False, indent=2)

    sizes = {name: f"{os.path.getsize(os.path.join(OUT_DIR, name)) / 1024:.0f} KB" for name in sorted(os.listdir(OUT_DIR))}
    print(f"{len(heads)} 个人头；高度图 {grid[0]}×{grid[1]}")
    print("输出：", sizes)


if __name__ == "__main__":
    main()
