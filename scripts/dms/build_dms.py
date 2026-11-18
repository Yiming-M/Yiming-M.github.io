"""
把作者用 ChatGPT 生成的车内图像，处理成首页“驾驶员监控”页的数据（设计文档 §4）。

画面是“夜间座舱”：深度图抬成点云，平时显示夜间彩色相机看到的样子（很暗），
鼠标处的圆形“镜头”里显示红外图和按深度着色的点。有前方、侧方、上方三个机位。

输入（放仓库外的一个文件夹）：九张图，文件名是 <机位>_<模态>.<扩展名>
    机位：front（前方）、side（侧方）、top（上方）
    模态：rgb（彩色）、ir（红外）、depth（深度，灰度，越亮越近）
    例如 front_depth.webp、side_ir.png。同一机位的三张必须逐像素对齐（构图完全一样）。
    尺寸可以有一两个像素的出入，脚本会统一缩放到 GRID 大小。

输出（写入 public/home/dms/，进仓库）：
    <机位>-depth.png  深度，GRID 大小，RGB 三个通道：
                      R、G 合起来是 12 位深度：R 是高 8 位，G 的高 4 位是低 4 位（G 的低 4 位为 0）；
                      0–4095 对应灰度 0–1，越大越近。平滑之后深度有小数，只用 8 位会在点云上出现
                      一层层的台阶；12 位已经足够平滑，而且比 16 位的文件小三分之一。
                      B 是“有效”标记：255 = 画这个点，0 = 不画（远处的背景、深度突变处的飞点）。
    <机位>-ir.jpg     红外图，GRID 大小，灰度
    <机位>-rgb.jpg    夜间彩色图，GRID 大小：原图调暗，三个机位调到同样的平均亮度
                      （生成的彩色图偏亮，不像真实的夜间车内）
    static.jpg        静态图：前方机位的夜间彩色图，脸上叠加和 3D 一样的镜头
                      （手机、减少动态效果、不支持 WebGL2 时显示）
    meta.json         网格大小；各机位的文件，以及脸的位置 face = [x, y, 深度]
                      （x、y 占图宽、图高的比例；深度是该处的灰度 0–1）。3D 场景绕脸所在的深度旋转，
                      鼠标没进页面时镜头停在脸上

用法：
    python3 -I scripts/dms/build_dms.py <输入文件夹>
依赖：numpy、scipy（高斯平滑）、Pillow。
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

OUT_DIR = os.path.join("public", "home", "dms")
VIEWS = ("front", "side", "top")

# —— 点云网格 ——
GRID = (480, 360)  # 点云的列数和行数，每个点对应一个像素；约 17 万个点。原图是 4:3
DEPTH_BLUR_PX = 3.0  # 缩小前先在原图上做高斯平滑（像素），去掉 8 位深度的台阶和有损压缩留下的 8×8 方块
                     # （方块会让等深线弯弯曲曲）。太大会把人和座椅之间的边缘抹宽
BACKGROUND = 0.06  # 深度灰度低于它算远处背景（后排、车窗外），不画
EDGE_GRADIENT = 0.018  # 相邻点深度差（灰度）超过它算深度突变：人和座椅之间平滑出来的中间值，画出来是一串飞点
DEPTH_LEVELS = 4095  # 12 位深度的最大值；dms-scene.js 按同样的方式解码

# —— 脸的位置（占图宽、图高的比例），镜头默认停在这里；换图时要重新量 ——
FACE = {"front": (0.51, 0.31), "side": (0.33, 0.22), "top": (0.49, 0.25)}

# —— 夜间彩色 ——
NIGHT_GAMMA = 1.3  # 先压暗部，再整体调暗
NIGHT_MEAN = 0.06  # 调暗后的平均亮度（0–1）：几乎看不清，衬托镜头里的红外和深度

# —— 静态图（与 dms-scene.js 的着色器一致，改动时两边一起改）——
STATIC_WIDTH = 1200
LENS_RADIUS = 0.27  # 镜头半径，占图像高度的比例
LENS_CORE = 0.62  # 镜头中心红外区的半径，占镜头半径的比例
LENS_FEATHER = 0.05  # 各区之间过渡带的宽度，占镜头半径的比例
# 镜头外圈的深度着色：底色按深度着色并调暗，再画等深线（深度每变化 1/CONTOUR_LEVELS 一条）。
# 生成的深度图里五官的起伏很弱，按法线打光几乎看不出东西；等深线在脸上是一圈圈同心线，看得出是曲面
CONTOUR_LEVELS = 40
DEPTH_BASE = 0.45  # 底色的亮度
LINE_GAIN = 0.8  # 等深线的亮度
HEAT_STOPS = [  # 深度着色：深蓝 → 青绿（站点强调色）→ 近白，与人群页同一套
    (0.0, (0x3A, 0x5B, 0xD9)),
    (0.5, (0x5C, 0xE6, 0xD2)),
    (1.0, (0xF0, 0xFF, 0xFC)),
]
RING_COLOUR = (0x5C, 0xE6, 0xD2)


def find(folder, view, modality):
    matches = sorted(glob.glob(os.path.join(folder, f"{view}_{modality}.*")))
    if len(matches) != 1:
        sys.exit(f"{folder} 里应当正好有一个 {view}_{modality}.*，实际找到 {len(matches)} 个")
    return matches[0]


def heat_color(value):
    """深度（0–1，越大越近）→ 颜色（0–1 的 RGB），在 HEAT_STOPS 之间线性插值。"""
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


def load_depth(path, size):
    """深度图 → 平滑后缩小到 size 的浮点数组（0–1，越大越近）。"""
    depth = np.asarray(Image.open(path).convert("L")).astype(np.float32) / 255
    depth = ndimage.gaussian_filter(depth, DEPTH_BLUR_PX)
    return np.asarray(Image.fromarray(depth, mode="F").resize(size, Image.BOX))


def night(rgb):
    """彩色图（0–1）→ 夜间的样子：压暗部后整体调暗到 NIGHT_MEAN。"""
    dark = rgb**NIGHT_GAMMA
    return np.clip(dark * (NIGHT_MEAN / dark.mean()), 0, 1)


def build_view(folder, view):
    depth = load_depth(find(folder, view, "depth"), GRID)
    gy, gx = np.gradient(depth)
    valid = (depth >= BACKGROUND) & (np.hypot(gx, gy) <= EDGE_GRADIENT)
    code = np.round(np.clip(depth, 0, 1) * DEPTH_LEVELS).astype(np.uint32)
    packed = np.stack([code >> 4, (code & 15) << 4, valid * 255], axis=-1).astype(np.uint8)
    Image.fromarray(packed, mode="RGB").save(os.path.join(OUT_DIR, f"{view}-depth.png"), optimize=True)

    ir = Image.open(find(folder, view, "ir")).convert("L").resize(GRID, Image.LANCZOS)
    ir.save(os.path.join(OUT_DIR, f"{view}-ir.jpg"), quality=85, optimize=True)

    rgb = Image.open(find(folder, view, "rgb")).convert("RGB").resize(GRID, Image.LANCZOS)
    rgb = night(np.asarray(rgb).astype(np.float64) / 255)
    Image.fromarray(np.round(rgb * 255).astype(np.uint8)).save(os.path.join(OUT_DIR, f"{view}-rgb.jpg"), quality=88, optimize=True)
    fx, fy = FACE[view]
    face_depth = float(depth[int(fy * GRID[1]), int(fx * GRID[0])])
    return {"depth": f"{view}-depth.png", "ir": f"{view}-ir.jpg", "rgb": f"{view}-rgb.jpg", "face": [fx, fy, round(face_depth, 4)]}


def build_static(folder):
    """静态图：前方机位，夜间彩色图上叠加镜头（中心红外，外圈按深度着色，边缘一圈细光）。"""
    size = (STATIC_WIDTH, round(STATIC_WIDTH * GRID[1] / GRID[0]))
    width, height = size
    depth = load_depth(find(folder, "front", "depth"), size)
    ir = np.asarray(Image.open(find(folder, "front", "ir")).convert("L").resize(size, Image.LANCZOS)).astype(np.float64) / 255
    rgb = night(np.asarray(Image.open(find(folder, "front", "rgb")).convert("RGB").resize(size, Image.LANCZOS)).astype(np.float64) / 255)

    yy, xx = np.mgrid[0:height, 0:width]
    fx, fy = FACE["front"]
    r = np.hypot(xx + 0.5 - fx * width, yy + 0.5 - fy * height) / (LENS_RADIUS * height)
    in_lens = (1 - smoothstep(1 - LENS_FEATHER, 1, r))[..., None]
    in_core = (1 - smoothstep(LENS_CORE - LENS_FEATHER, LENS_CORE, r))[..., None]
    ir_colour = np.repeat(ir[..., None], 3, axis=2) * np.array([0.92, 1.0, 1.0]) * 1.1
    level = depth * CONTOUR_LEVELS
    gy, gx = np.gradient(level)
    line = 1 - np.minimum(np.abs(np.mod(level - 0.5, 1) - 0.5) / (1.5 * np.hypot(gx, gy) + 1e-4), 1)  # 线宽约 1.5 像素
    depth_colour = heat_color(depth) * DEPTH_BASE + heat_color(np.minimum(depth + 0.3, 1)) * line[..., None] * LINE_GAIN
    lens = depth_colour * (1 - in_core) + ir_colour * in_core
    image = rgb * (1 - in_lens) + lens * in_lens
    ring = np.exp(-(((r - 1) / 0.012) ** 2))[..., None]
    image = image + np.array(RING_COLOUR) / 255 * ring * 0.9
    Image.fromarray(np.round(np.clip(image, 0, 1) * 255).astype(np.uint8)).save(
        os.path.join(OUT_DIR, "static.jpg"), quality=82, optimize=True
    )
    return {"file": "static.jpg", "width": width, "height": height}


def main():
    folder = sys.argv[1]
    os.makedirs(OUT_DIR, exist_ok=True)
    meta = {
        "_comment": "由 scripts/dms/build_dms.py 生成，不要手改。格式见该脚本开头。",
        "grid": {"width": GRID[0], "height": GRID[1]},
        "views": {view: build_view(folder, view) for view in VIEWS},
        "static": build_static(folder),
        "source": "ChatGPT 生成的示意图像",
    }
    with open(os.path.join(OUT_DIR, "meta.json"), "w", encoding="utf-8") as file:
        json.dump(meta, file, ensure_ascii=False, indent=2)

    total = sum(os.path.getsize(os.path.join(OUT_DIR, name)) for name in os.listdir(OUT_DIR))
    sizes = {name: f"{os.path.getsize(os.path.join(OUT_DIR, name)) / 1024:.0f} KB" for name in sorted(os.listdir(OUT_DIR))}
    print("输出：", sizes)
    print(f"合计 {total / 1024:.0f} KB")


if __name__ == "__main__":
    main()
