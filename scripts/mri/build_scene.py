"""
把一个 PI-CAI 病例处理成首页 3D 场景的数据（设计文档 §4，方案 C：解剖模型 + 切面）。

输入（由 fetch_picai_case.py 下载，放在仓库外）：
    <病例>_t2w.mha        T2 加权 MRI
    <病例>_zones.nii.gz   外周带 / 移行带分割（1 = 外周带 PZ，2 = 移行带 TZ；由质心前后位置确认）
    <病例>_lesion.nii.gz  专家勾画的病灶（数值是 ISUP 分级 2–5，0 为背景）

输出（写入 public/home/mri/，进仓库）：
    slices.bin.gz   原始层内分辨率（约 0.34 mm）的横断面切片，uint8，x 最快、z 最慢，gzip 压缩
    labels.bin.gz   与切片逐像素对应的标签，uint8：低 2 位是类别（0 背景、1 外周带、2 移行带、3 病灶），
                    4 = 外周带轮廓，8 = 移行带轮廓，16 = 病灶轮廓
    meshes.bin.gz   外周带、移行带、病灶的平滑三维曲面：顶点坐标 int16（单位 0.01 mm）+ 三角形索引 uint16
    meta.json       尺寸、坐标换算、曲面在 meshes.bin 里的位置、标注锚点、数据来源与许可
    static.png      静态图：病灶所在层面的横断面，叠加三个区域的彩色轮廓（手机、减少动态效果等情况使用）

坐标约定（三维场景里，单位 mm，原点在腺体中心）：
    X 向患者左侧，Y 向头侧（上），Z 向腹侧（前）。从正前方看，患者右侧在屏幕左侧，与放射科习惯一致。

用法：
    python3 -I scripts/mri/build_scene.py <原始数据目录> <病例号>
依赖：numpy、scipy（平滑和重采样）、nibabel（读取 .nii.gz）。
"""
import gzip
import json
import os
import struct
import sys
import zlib

import nibabel as nib
import numpy as np
from scipy import ndimage

OUT_DIR = os.path.join("public", "home", "mri")
MARGIN_MM = 30.0  # 切片上腺体四周保留的范围
MARGIN_SLICES = 1  # 腺体上下各多保留的层数
MESH_VOXEL_MM = 0.9  # 提取曲面时的各向同性体素大小：越小越细腻，文件也越大
SMOOTH_SIGMA = 1.2  # 提取曲面前的高斯平滑（以重采样后的体素为单位），消除 3 mm 层厚造成的台阶
TAUBIN_ITERATIONS = 12  # 曲面平滑次数

CLASS_PZ, CLASS_TZ, CLASS_LESION = 1, 2, 3
EDGE_PZ, EDGE_TZ, EDGE_LESION = 4, 8, 16
BACKGROUND = np.array([0x07, 0x0A, 0x12]) / 255  # 与 tokens.css 的 --showcase-bg 一致
COLORS = {  # 与 tokens.css 的 --mri-pz / --mri-tz / --mri-lesion 一致
    "pz": np.array([0x5C, 0xE6, 0xD2]) / 255,
    "tz": np.array([0xA5, 0xA8, 0xFF]) / 255,
    "lesion": np.array([0xFF, 0xA0, 0x4A]) / 255,
}

METAIMAGE_TYPES = {
    "MET_UCHAR": np.uint8,
    "MET_CHAR": np.int8,
    "MET_USHORT": np.uint16,
    "MET_SHORT": np.int16,
    "MET_UINT": np.uint32,
    "MET_INT": np.int32,
    "MET_FLOAT": np.float32,
    "MET_DOUBLE": np.float64,
}


# —— 读取 ——


def read_mha(path):
    """读取 MetaImage（.mha，数据内嵌）。返回 (数组[z, y, x], 体素间距[x, y, z])。"""
    with open(path, "rb") as file:
        raw = file.read()
    header, offset = {}, 0
    while True:
        end = raw.index(b"\n", offset)
        key, _, value = raw[offset:end].decode("latin-1").strip().partition("=")
        offset = end + 1
        header[key.strip()] = value.strip()
        if key.strip() == "ElementDataFile":
            break
    assert header["ElementDataFile"] == "LOCAL", "只支持数据内嵌的 .mha"
    dims = [int(v) for v in header["DimSize"].split()]
    spacing = [float(v) for v in header["ElementSpacing"].split()]
    dtype = np.dtype(METAIMAGE_TYPES[header["ElementType"]]).newbyteorder(
        ">" if header.get("BinaryDataByteOrderMSB", "False") == "True" else "<"
    )
    data = raw[offset:]
    if header.get("CompressedData", "False") == "True":
        data = zlib.decompress(data)
    return np.frombuffer(data, dtype=dtype).reshape(dims[::-1]).astype(np.float32), spacing


def read_label(path):
    """读取 .nii.gz 标注，并转成与 .mha 相同的 [z, y, x] 轴顺序（两者体素索引一一对应）。"""
    return np.asarray(nib.load(path).dataobj).transpose(2, 1, 0)


# —— 切片与标签 ——


def boundary(mask):
    """逐层的边界：在掩码内、但四邻域里至少有一个不在掩码内的像素。"""
    padded = np.pad(mask, ((0, 0), (1, 1), (1, 1)), constant_values=False)
    interior = (
        padded[:, 1:-1, 1:-1] & padded[:, :-2, 1:-1] & padded[:, 2:, 1:-1] & padded[:, 1:-1, :-2] & padded[:, 1:-1, 2:]
    )
    return mask & ~interior


def thicken(mask):
    """把 1 像素宽的轮廓加粗到约 2 像素，原始分辨率下更容易看清。"""
    return mask | np.roll(mask, 1, axis=2) | np.roll(mask, 1, axis=1)


# —— 曲面提取（Surface Nets）——


def surface_nets(field, iso=0.5):
    """
    从标量场里提取等值面（Naive Surface Nets）：每个跨越等值面的体素格子放一个顶点
    （取格子各条边上插值交点的平均位置），每条跨越等值面的网格边连成一个四边形。
    比 Marching Cubes 简单，生成的网格均匀、适合再做平滑。
    field：[z, y, x] 的浮点数组。返回 (顶点[n, 3]，按 z, y, x 的格点坐标；三角形[m, 3])。
    """
    nz, ny, nx = field.shape
    corners = np.array([[dz, dy, dx] for dz in (0, 1) for dy in (0, 1) for dx in (0, 1)])
    values = np.stack([field[dz : nz - 1 + dz, dy : ny - 1 + dy, dx : nx - 1 + dx] for dz, dy, dx in corners], axis=-1)
    inside = values > iso
    active = inside.any(-1) & ~inside.all(-1)

    # 12 条棱：只连接相差一个坐标轴的两个角
    edges = [(a, b) for a in range(8) for b in range(a + 1, 8) if np.abs(corners[a] - corners[b]).sum() == 1]
    position_sum = np.zeros(active.shape + (3,), np.float32)
    count = np.zeros(active.shape, np.float32)
    for a, b in edges:
        va, vb = values[..., a], values[..., b]
        crossing = (va > iso) != (vb > iso)
        t = np.where(crossing, (iso - va) / np.where(va == vb, 1, vb - va), 0)
        point = corners[a][None, None, None, :] + t[..., None] * (corners[b] - corners[a])[None, None, None, :]
        position_sum += np.where(crossing[..., None], point, 0)
        count += crossing
    cell_index = -np.ones(active.shape, np.int64)
    active_cells = np.argwhere(active)
    cell_index[active] = np.arange(len(active_cells))
    vertices = active_cells + position_sum[active] / count[active][:, None]

    faces = []
    # 沿每个坐标轴的网格边：如果两端点分别在等值面两侧，用共享这条边的 4 个格子的顶点连成四边形
    for axis in range(3):
        a0 = field[: nz - (axis == 0), : ny - (axis == 1), : nx - (axis == 2)] > iso
        a1 = field[(axis == 0) :, (axis == 1) :, (axis == 2) :] > iso
        crossing = a0 != a1
        others = [d for d in range(3) if d != axis]
        idx = np.argwhere(crossing)
        # 共享这条边的 4 个格子：在另外两个轴上各取 -1 和 0
        keep = np.all(idx[:, others] > 0, axis=1) & (idx[:, others[0]] < active.shape[others[0]]) & (
            idx[:, others[1]] < active.shape[others[1]]
        )
        keep &= idx[:, axis] < active.shape[axis]
        idx = idx[keep]
        flip = a0[tuple(idx.T)]
        quad = []
        for d0, d1 in ((0, 0), (1, 0), (1, 1), (0, 1)):
            cell = idx.copy()
            cell[:, others[0]] -= 1 - d0
            cell[:, others[1]] -= 1 - d1
            quad.append(cell_index[tuple(cell.T)])
        quad = np.stack(quad, axis=1)
        valid = np.all(quad >= 0, axis=1)
        quad, flip = quad[valid], flip[valid]
        quad[flip] = quad[flip][:, ::-1]  # 统一朝向：法线指向外侧
        faces.append(np.concatenate([quad[:, [0, 1, 2]], quad[:, [0, 2, 3]]]))
    return vertices.astype(np.float32), np.concatenate(faces).astype(np.int64)


def taubin_smooth(vertices, faces, iterations, lam=0.5, mu=-0.53):
    """Taubin 平滑：交替做一次收缩和一次反向扩张，让曲面变光滑但整体不缩小。"""
    edges = np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]])
    edges = np.concatenate([edges, edges[:, ::-1]])
    degree = np.bincount(edges[:, 0], minlength=len(vertices)).astype(np.float32)
    degree[degree == 0] = 1
    v = vertices.copy()
    for _ in range(iterations):
        for factor in (lam, mu):
            neighbour_sum = np.zeros_like(v)
            np.add.at(neighbour_sum, edges[:, 0], v[edges[:, 1]])
            v = v + factor * (neighbour_sum / degree[:, None] - v)
    return v


def structure_mesh(mask, spacing, origin_mm):
    """
    一个结构（如外周带）的掩码 → 平滑曲面，坐标换成场景坐标（mm，X 左、Y 上、Z 前）。
    先重采样成各向同性体素并高斯平滑，消除层厚带来的台阶，再提取等值面、做曲面平滑。
    """
    zoom = (spacing[2] / MESH_VOXEL_MM, spacing[1] / MESH_VOXEL_MM, spacing[0] / MESH_VOXEL_MM)
    padded = np.pad(mask.astype(np.float32), 2)  # 四周补零，保证曲面闭合
    field = ndimage.zoom(padded, zoom, order=1)
    field = ndimage.gaussian_filter(field, SMOOTH_SIGMA)
    vertices, faces = surface_nets(field)
    vertices = taubin_smooth(vertices, faces, TAUBIN_ITERATIONS)
    # 格点坐标 → 原始体素坐标（扣掉补的 2 层）→ mm
    z = vertices[:, 0] / zoom[0] - 2
    y = vertices[:, 1] / zoom[1] - 2
    x = vertices[:, 2] / zoom[2] - 2
    scene = np.stack(
        [
            x * spacing[0] - origin_mm[0],  # X：向患者左侧
            z * spacing[2] - origin_mm[2],  # Y：向头侧
            -(y * spacing[1] - origin_mm[1]),  # Z：向腹侧（y 索引向背侧增加，所以取反）
        ],
        axis=1,
    )
    return scene.astype(np.float32), faces


# —— 输出 ——


def upscale_bilinear(image, factor):
    """把 [h, w, 3] 的图像按整数倍做双线性放大。"""
    height, width, _ = image.shape

    def axis(n):
        coords = (np.arange(n * factor) + 0.5) / factor - 0.5
        low = np.clip(np.floor(coords).astype(int), 0, n - 1)
        return low, np.clip(low + 1, 0, n - 1), np.clip(coords - low, 0, 1)

    y0, y1, wy = axis(height)
    x0, x1, wx = axis(width)
    top = image[y0][:, x0] * (1 - wx)[None, :, None] + image[y0][:, x1] * wx[None, :, None]
    bottom = image[y1][:, x0] * (1 - wx)[None, :, None] + image[y1][:, x1] * wx[None, :, None]
    return top * (1 - wy)[:, None, None] + bottom * wy[:, None, None]


def write_png(path, rgb):
    """用标准库写一张 8 位 RGB PNG（避免引入图像库依赖）。"""
    height, width, _ = rgb.shape
    raw = b"".join(b"\x00" + rgb[row].tobytes() for row in range(height))

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    with open(path, "wb") as file:
        file.write(b"\x89PNG\r\n\x1a\n")
        file.write(chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)))
        file.write(chunk(b"IDAT", zlib.compress(raw, 9)))
        file.write(chunk(b"IEND", b""))


def render_static(intensity, labels):
    """
    静态图：一张横断面切片 + 三个区域的彩色轮廓，四周渐隐到背景色。
    着色规则与 mri-scene.js 里切面的着色器一致（灰度、渐隐、轮廓颜色、病灶淡橙色填充）。
    """
    height, width = intensity.shape
    yy, xx = np.meshgrid((np.arange(height) + 0.5) / height - 0.5, (np.arange(width) + 0.5) / width - 0.5, indexing="ij")
    radius = np.sqrt(xx**2 + yy**2)
    t = np.clip((radius - 0.30) / (0.50 - 0.30), 0, 1)
    fade = 1 - t * t * (3 - 2 * t)
    gray = intensity**0.9
    color = gray[..., None] * np.array([0.82, 0.88, 0.96])
    classes = labels & 3
    lesion = classes == CLASS_LESION
    color = np.where(lesion[..., None], color * 0.65 + COLORS["lesion"] * 0.35, color)
    for bit, key in ((EDGE_PZ, "pz"), (EDGE_TZ, "tz"), (EDGE_LESION, "lesion")):
        edge = (labels & bit) > 0
        color = np.where(edge[..., None], COLORS[key], color)
    rgb = color * fade[..., None] + BACKGROUND * (1 - fade[..., None])
    return np.clip(rgb, 0, 1)


def main():
    raw_dir, case = sys.argv[1], sys.argv[2]
    image, spacing = read_mha(os.path.join(raw_dir, f"{case}_t2w.mha"))
    zones = read_label(os.path.join(raw_dir, f"{case}_zones.nii.gz"))
    lesion = read_label(os.path.join(raw_dir, f"{case}_lesion.nii.gz")) > 0
    assert image.shape == zones.shape == lesion.shape, "影像和标注的网格不一致"
    pz, tz = zones == 1, zones == 2

    # —— 裁剪：层内以腺体为中心取正方形，上下取腺体所在的层再各加一层 ——
    gland = np.argwhere(pz | tz)
    (z0, y0, x0), (z1, y1, x1) = gland.min(0), gland.max(0)
    cz, cy, cx = (z0 + z1) / 2, (y0 + y1) / 2, (x0 + x1) / 2
    half = int(max(y1 - y0, x1 - x0) / 2 + MARGIN_MM / spacing[0])
    zs = slice(max(0, z0 - MARGIN_SLICES), min(image.shape[0], z1 + MARGIN_SLICES + 1))
    ys = slice(max(0, int(cy) - half), int(cy) + half)
    xs = slice(max(0, int(cx) - half), int(cx) + half)
    crop = image[zs, ys, xs]

    # —— 切片：亮度按裁剪区 1%–99.5% 分位数拉伸到 0–255 ——
    low, high = np.percentile(crop, [1, 99.5])
    intensity = np.clip((crop - low) / (high - low), 0, 1)
    slices_u8 = np.round(intensity * 255).astype(np.uint8)

    # —— 标签：类别 + 三个区域各自的轮廓（加粗到约 2 像素）——
    pz_c, tz_c, lesion_c = pz[zs, ys, xs], tz[zs, ys, xs], lesion[zs, ys, xs]
    labels = np.zeros(crop.shape, np.uint8)
    labels[pz_c] = CLASS_PZ
    labels[tz_c] = CLASS_TZ
    labels[lesion_c] = CLASS_LESION
    labels[thicken(boundary(pz_c))] |= EDGE_PZ
    labels[thicken(boundary(tz_c))] |= EDGE_TZ
    labels[thicken(boundary(lesion_c))] |= EDGE_LESION

    # —— 曲面：场景原点放在腺体中心 ——
    origin_mm = np.array([cx * spacing[0], cy * spacing[1], cz * spacing[2]])
    meshes, blob = {}, b""
    for name, mask in (("pz", pz), ("tz", tz), ("lesion", lesion)):
        vertices, faces = structure_mesh(mask, spacing, origin_mm)
        quantised = np.round(vertices * 100).astype(np.int16)  # 0.01 mm 精度
        assert len(vertices) < 65536, "顶点数超过 uint16 索引的上限，请调大 MESH_VOXEL_MM"
        meshes[name] = {
            "offset": len(blob),
            "vertexCount": int(len(vertices)),
            "indexCount": int(faces.size),
        }
        blob += quantised.tobytes() + faces.astype(np.uint16).tobytes()
        blob += b"\0" * (len(blob) % 4)  # 下一段从 4 字节对齐的位置开始，方便浏览器端直接建 TypedArray
        # 标注锚点：结构在患者右侧（屏幕左侧）、中间高度附近最靠外的点，引线从左侧的文字连到这里
        mid = np.abs(vertices[:, 1] - np.median(vertices[:, 1])) < 4
        candidates = vertices[mid] if mid.any() else vertices
        meshes[name]["anchor"] = [round(float(v), 2) for v in candidates[np.argmin(candidates[:, 0])]]

    # —— 切片在场景里的位置（mm）——
    depth, height, width = slices_u8.shape
    plane = {
        "width": round(width * spacing[0], 3),  # X 方向
        "height": round(height * spacing[1], 3),  # Z 方向
        "centerX": round((xs.start + width / 2) * spacing[0] - origin_mm[0], 3),
        "centerZ": round(-((ys.start + height / 2) * spacing[1] - origin_mm[1]), 3),
        # 每一层中心所在的 Y（头侧为正）：第 0 层最靠足侧
        "firstY": round((zs.start + 0.5) * spacing[2] - origin_mm[2] - 0.5 * spacing[2], 3),
        "sliceThickness": round(spacing[2], 3),
    }
    lesion_slices = np.argwhere(lesion_c.any(axis=(1, 2)))[:, 0]
    lesion_slice = int(round(lesion_slices.mean())) if len(lesion_slices) else depth // 2

    os.makedirs(OUT_DIR, exist_ok=True)
    for stale in ("intensity.bin.gz",):  # 旧版体渲染的数据，已不再使用
        path = os.path.join(OUT_DIR, stale)
        if os.path.exists(path):
            os.remove(path)
    with gzip.open(os.path.join(OUT_DIR, "slices.bin.gz"), "wb", compresslevel=9) as file:
        file.write(np.ascontiguousarray(slices_u8).tobytes())
    with gzip.open(os.path.join(OUT_DIR, "labels.bin.gz"), "wb", compresslevel=9) as file:
        file.write(np.ascontiguousarray(labels).tobytes())
    with gzip.open(os.path.join(OUT_DIR, "meshes.bin.gz"), "wb", compresslevel=9) as file:
        file.write(blob)

    meta = {
        "_comment": "由 scripts/mri/build_scene.py 生成，不要手改。",
        "case": case,
        "slices": {
            "dims": [width, height, depth],
            "spacing_mm": [round(spacing[0], 4), round(spacing[1], 4), round(spacing[2], 4)],
            "layout": "uint8，x 变化最快（向患者左侧），其次 y（前→后），最后 z（足→头）",
            "lesionSlice": lesion_slice,
        },
        "labels": {"class_bits": "低 2 位：0 背景，1 外周带，2 移行带，3 病灶", "edge_pz": EDGE_PZ, "edge_tz": EDGE_TZ, "edge_lesion": EDGE_LESION},
        "plane": plane,
        "meshes": meshes,
        "meshFormat": "每个结构：int16 顶点坐标 xyz（0.01 mm）×vertexCount，接着 uint16 三角形索引 ×indexCount；offset 为字节偏移（4 字节对齐）",
        "coordinates": "场景坐标 mm，原点在腺体中心；X 向患者左侧，Y 向头侧，Z 向腹侧",
        "source": {
            "name": "PI-CAI Public Training and Development Dataset",
            "images": "https://zenodo.org/records/6624726",
            "labels": "https://github.com/DIAGNijmegen/picai_labels（human_expert 病灶；Yuan23 分区）",
            "license": "CC BY-NC 4.0",
            "citation": "Saha A, et al. Artificial intelligence and radiologists in prostate cancer detection on MRI (PI-CAI): an international, paired, non-inferiority, confirmatory study. Lancet Oncology, 2024.",
        },
    }
    with open(os.path.join(OUT_DIR, "meta.json"), "w", encoding="utf-8") as file:
        json.dump(meta, file, ensure_ascii=False, indent=2)

    static = render_static(intensity[lesion_slice], labels[lesion_slice])
    write_png(os.path.join(OUT_DIR, "static.png"), np.round(upscale_bilinear(static, 2) * 255).astype(np.uint8))

    sizes = {name: f"{os.path.getsize(os.path.join(OUT_DIR, name)) / 1024:.0f} KB" for name in sorted(os.listdir(OUT_DIR))}
    print(f"切片 {width}×{height}×{depth}（{spacing[0]:.2f} mm），病灶层 {lesion_slice}")
    print("曲面：", {k: (v["vertexCount"], v["indexCount"] // 3) for k, v in meshes.items()})
    print("输出：", sizes)


if __name__ == "__main__":
    main()
