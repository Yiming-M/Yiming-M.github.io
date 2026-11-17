"""
从 PI-CAI 公开数据集下载一个病例，用作首页 3D MRI 的原始数据（设计文档 §4）。

为什么不直接下载整个压缩包：PI-CAI 的影像按 5 个分卷发布在 Zenodo，每个约 5 GB。
本脚本用 HTTP 的“按字节范围读取”（Range 请求，与断点续传同一机制），
只读取压缩包末尾的目录和所需病例的 T2W 序列，总共十几 MB。

下载内容（许可：CC BY-NC 4.0，网站上需署名，不能商用）：
- 影像：Zenodo 记录 6624726 的 picai_public_images_fold0.zip 里，一个病例的 T2 加权序列（.mha）
- 标注：GitHub DIAGNijmegen/picai_labels 里该病例的
    - 专家勾画的临床显著性前列腺癌病灶（csPCa_lesion_delineations/human_expert/resampled）
    - AI 分割的外周带 / 移行带（anatomical_delineations/zonal_pz_tz/AI/Yuan23）
    - AI 分割的整个腺体（anatomical_delineations/whole_gland/AI/Bosma22b）

用法（在仓库根目录；原始数据放在仓库外，不要提交）：
    python3 -I scripts/mri/fetch_picai_case.py <输出目录> [--case 病例号]
不指定病例时，自动在 fold0 里挑一个有专家病灶标注、且病灶不过大也不过小的病例。

只用 Python 标准库。下载外部数据前必须先征得作者同意（AGENTS.md 规则 7）。
"""
import argparse
import csv
import io
import json
import os
import sys
import urllib.request
import zipfile

ZIP_URL = "https://zenodo.org/records/6624726/files/picai_public_images_fold0.zip?download=1"
LABELS_TREE_URL = "https://api.github.com/repos/DIAGNijmegen/picai_labels/git/trees/main?recursive=1"
LABELS_RAW_URL = "https://raw.githubusercontent.com/DIAGNijmegen/picai_labels/main/"
MARKSHEET = "clinical_information/marksheet.csv"
LESION_DIR = "csPCa_lesion_delineations/human_expert/resampled/"
ZONES_DIR = "anatomical_delineations/zonal_pz_tz/AI/Yuan23/"
GLAND_DIR = "anatomical_delineations/whole_gland/AI/Bosma22b/"
USER_AGENT = "personal-website-build-script"


class HttpRangeFile(io.RawIOBase):
    """
    把远程文件包装成可 seek 的只读文件，每次 read 发一个 Range 请求。
    zipfile 只需要随机读取目录和单个成员，所以不会下载整个压缩包。
    """

    def __init__(self, url):
        self.url = url
        self.position = 0
        request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=60) as response:
            self.size = int(response.headers["Content-Length"])
        self.downloaded = 0

    def seekable(self):
        return True

    def readable(self):
        return True

    def tell(self):
        return self.position

    def seek(self, offset, whence=io.SEEK_SET):
        if whence == io.SEEK_SET:
            self.position = offset
        elif whence == io.SEEK_CUR:
            self.position += offset
        else:
            self.position = self.size + offset
        return self.position

    def read(self, size=-1):
        if size is None or size < 0:
            size = self.size - self.position
        if size == 0 or self.position >= self.size:
            return b""
        end = min(self.position + size, self.size) - 1
        request = urllib.request.Request(
            self.url, headers={"Range": f"bytes={self.position}-{end}", "User-Agent": USER_AGENT}
        )
        with urllib.request.urlopen(request, timeout=120) as response:
            if response.status != 206:
                raise RuntimeError("服务器不支持 Range 请求，停止下载以免拉取整个压缩包")
            data = response.read()
        self.position += len(data)
        self.downloaded += len(data)
        return data

    def readinto(self, buffer):
        data = self.read(len(buffer))
        buffer[: len(data)] = data
        return len(data)


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("out_dir")
    parser.add_argument("--case", help="病例号，如 10006_1000006")
    args = parser.parse_args()
    os.makedirs(args.out_dir, exist_ok=True)

    # 1. 读取压缩包目录（只下载文件末尾的目录部分）
    remote = HttpRangeFile(ZIP_URL)
    archive = zipfile.ZipFile(io.BufferedReader(remote, buffer_size=1 << 20))
    t2w = {
        os.path.basename(info.filename)[: -len("_t2w.mha")]: info
        for info in archive.infolist()
        if info.filename.endswith("_t2w.mha")
    }
    print(f"压缩包共 {remote.size / 1e9:.2f} GB，fold0 有 {len(t2w)} 个病例；读取目录下载了 {remote.downloaded / 1e6:.2f} MB")

    # 2. 在标注仓库里找同时有病灶、分区、腺体标注的病例
    tree = json.loads(fetch(LABELS_TREE_URL))["tree"]
    sizes = {item["path"]: item.get("size", 0) for item in tree if item["type"] == "blob"}

    def label_size(directory, case):
        return sizes.get(f"{directory}{case}.nii.gz")

    candidates = [
        case
        for case in t2w
        if label_size(LESION_DIR, case) and label_size(ZONES_DIR, case) and label_size(GLAND_DIR, case)
    ]
    if args.case:
        if args.case not in candidates:
            sys.exit(f"病例 {args.case} 不在 fold0，或缺少某项标注")
        case = args.case
    else:
        # 用官方病例表挑选：标注为临床显著性癌（case_csPCa = YES）、只有一个 ISUP 2 或 3 级病灶的病例，
        # 病灶清楚可见又不至于占满腺体。注意：不能用标注文件大小判断有没有病灶，
        # 空的病灶标注压缩后也有十几 KB（体积大、全是 0）。
        records = list(csv.DictReader(io.StringIO(fetch(LABELS_RAW_URL + MARKSHEET).decode("utf-8"))))
        positive = {
            f"{r['patient_id']}_{r['study_id']}"
            for r in records
            if r.get("case_csPCa") == "YES" and r.get("lesion_ISUP", "").strip() in ("2", "3")
        }
        with_lesion = sorted(c for c in candidates if c in positive)
        if not with_lesion:
            sys.exit("没有找到带病灶标注的病例")
        case = with_lesion[len(with_lesion) // 2]
    print(f"选中病例 {case}")

    # 3. 下载该病例的 T2W 序列（只读取这一个成员）
    info = t2w[case]
    before = remote.downloaded
    with archive.open(info) as source, open(os.path.join(args.out_dir, f"{case}_t2w.mha"), "wb") as target:
        target.write(source.read())
    print(f"T2W：{info.file_size / 1e6:.2f} MB（实际下载 {(remote.downloaded - before) / 1e6:.2f} MB）")

    # 4. 下载三个标注
    for name, directory in (("lesion", LESION_DIR), ("zones", ZONES_DIR), ("gland", GLAND_DIR)):
        data = fetch(LABELS_RAW_URL + directory + f"{case}.nii.gz")
        with open(os.path.join(args.out_dir, f"{case}_{name}.nii.gz"), "wb") as target:
            target.write(data)
        print(f"{name}：{len(data) / 1e3:.1f} KB")

    print(f"总下载量约 {(remote.downloaded) / 1e6:.2f} MB（不含标注）")


if __name__ == "__main__":
    main()
