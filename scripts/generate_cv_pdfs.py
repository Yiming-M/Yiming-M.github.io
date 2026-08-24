#!/usr/bin/env python3
"""Generate the bilingual website CV PDFs from the site's structured content."""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
CV_DATA = json.loads((ROOT / "src/data/cv.json").read_text(encoding="utf-8"))
PUBLICATION_DIR = ROOT / "src/content/publications"
PUBLICATION_ORDER = ["zip", "clip-ebc", "interact-with-me", "dms2", "fusioncount", "dms1"]

OUTPUT_DIR = ROOT / "output/pdf"
PUBLISH_DIR = ROOT / "public/cv"

ACCENT = HexColor("#2455d6")
TEXT = HexColor("#17181c")
SECONDARY = HexColor("#5e626b")
BORDER = HexColor("#d8d4ca")
SOFT = HexColor("#f2f4fb")

CHINESE_FONT_PATH = Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf")
if not CHINESE_FONT_PATH.exists():
    raise FileNotFoundError(f"Required CJK font not found: {CHINESE_FONT_PATH}")

pdfmetrics.registerFont(TTFont("CVChinese", str(CHINESE_FONT_PATH)))
pdfmetrics.registerFont(TTFont("CVChineseBold", str(CHINESE_FONT_PATH)))
pdfmetrics.registerFontFamily(
    "CVChinese",
    normal="CVChinese",
    bold="CVChineseBold",
    italic="CVChinese",
    boldItalic="CVChineseBold",
)


def localized(value: dict[str, str], locale: str) -> str:
    return value[locale]


def normalize(text: str) -> str:
    return (
        str(text)
        .replace("–", "-")
        .replace("—", "-")
        .replace("‑", "-")
        .replace("−", "-")
    )


def safe(text: str) -> str:
    return escape(normalize(text))


def load_publications() -> list[dict]:
    entries = {}
    for path in PUBLICATION_DIR.glob("*.json"):
        entries[path.stem] = json.loads(path.read_text(encoding="utf-8"))
    return [entries[publication_id] for publication_id in PUBLICATION_ORDER]


def make_styles(locale: str) -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    is_zh = locale == "zh"
    body_font = "CVChinese" if is_zh else "Helvetica"
    bold_font = "CVChineseBold" if is_zh else "Helvetica-Bold"
    wrap = "CJK" if is_zh else None

    return {
        "name": ParagraphStyle(
            "CvName",
            parent=base["Normal"],
            fontName=bold_font,
            fontSize=24,
            leading=27,
            textColor=TEXT,
            wordWrap=wrap,
            spaceAfter=3,
        ),
        "headline": ParagraphStyle(
            "CvHeadline",
            parent=base["Normal"],
            fontName=body_font,
            fontSize=10.5,
            leading=14,
            textColor=ACCENT,
            wordWrap=wrap,
            spaceAfter=5,
        ),
        "contact": ParagraphStyle(
            "CvContact",
            parent=base["Normal"],
            fontName=body_font,
            fontSize=7.5,
            leading=10,
            textColor=SECONDARY,
            wordWrap=wrap,
            spaceAfter=0,
        ),
        "section": ParagraphStyle(
            "CvSection",
            parent=base["Normal"],
            fontName=bold_font,
            fontSize=9.5,
            leading=12,
            textColor=ACCENT,
            wordWrap=wrap,
            spaceBefore=8,
            spaceAfter=3,
        ),
        "body": ParagraphStyle(
            "CvBody",
            parent=base["Normal"],
            fontName=body_font,
            fontSize=8.4,
            leading=11.2,
            textColor=TEXT,
            wordWrap=wrap,
            spaceAfter=3,
        ),
        "body_secondary": ParagraphStyle(
            "CvBodySecondary",
            parent=base["Normal"],
            fontName=body_font,
            fontSize=8.1,
            leading=10.8,
            textColor=SECONDARY,
            wordWrap=wrap,
            spaceAfter=2,
        ),
        "entry_title": ParagraphStyle(
            "CvEntryTitle",
            parent=base["Normal"],
            fontName=bold_font,
            fontSize=9.1,
            leading=11.5,
            textColor=TEXT,
            wordWrap=wrap,
        ),
        "entry_meta": ParagraphStyle(
            "CvEntryMeta",
            parent=base["Normal"],
            fontName=body_font,
            fontSize=7.5,
            leading=9.5,
            textColor=SECONDARY,
            alignment=TA_RIGHT,
            wordWrap=wrap,
        ),
        "bullet": ParagraphStyle(
            "CvBullet",
            parent=base["Normal"],
            fontName=body_font,
            fontSize=8.1,
            leading=10.7,
            textColor=SECONDARY,
            wordWrap=wrap,
            leftIndent=0,
            spaceAfter=1.5,
        ),
        "pub_venue": ParagraphStyle(
            "CvPublicationVenue",
            parent=base["Normal"],
            fontName=bold_font,
            fontSize=7.3,
            leading=9,
            textColor=ACCENT,
            wordWrap=wrap,
            spaceAfter=1,
        ),
        "pub_title": ParagraphStyle(
            "CvPublicationTitle",
            parent=base["Normal"],
            fontName=bold_font,
            fontSize=8.7,
            leading=11,
            textColor=TEXT,
            wordWrap=wrap,
            spaceAfter=1,
        ),
        "small": ParagraphStyle(
            "CvSmall",
            parent=base["Normal"],
            fontName=body_font,
            fontSize=7.1,
            leading=9.2,
            textColor=SECONDARY,
            wordWrap=wrap,
        ),
    }


def section_heading(story: list, title: str, styles: dict[str, ParagraphStyle]) -> None:
    story.append(Paragraph(safe(title), styles["section"]))
    story.append(HRFlowable(width="100%", thickness=0.6, color=BORDER, spaceAfter=5))


def entry_block(entry: dict, locale: str, styles: dict[str, ParagraphStyle], width: float) -> KeepTogether:
    role = localized(entry["role"], locale)
    institution = localized(entry["institution"], locale)
    location = localized(entry["location"], locale)
    period = localized(entry["period"], locale)

    header = Table(
        [[Paragraph(safe(role), styles["entry_title"]), Paragraph(safe(period), styles["entry_meta"])]],
        colWidths=[width - 37 * mm, 37 * mm],
    )
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))

    institution_line = Paragraph(
        f"{safe(institution)} | {safe(location)}",
        styles["body_secondary"],
    )
    bullets = ListFlowable(
        [
            ListItem(Paragraph(safe(localized(bullet, locale)), styles["bullet"]), leftIndent=8)
            for bullet in entry["bullets"]
        ],
        bulletType="bullet",
        start="circle",
        leftIndent=10,
        bulletFontName=styles["body"].fontName,
        bulletFontSize=5,
        bulletColor=ACCENT,
        spaceBefore=1,
        spaceAfter=4,
    )
    return KeepTogether([header, institution_line, bullets, Spacer(1, 3)])


def education_block(entry: dict, locale: str, styles: dict[str, ParagraphStyle], width: float) -> KeepTogether:
    header = Table(
        [[
            Paragraph(safe(localized(entry["degree"], locale)), styles["entry_title"]),
            Paragraph(safe(localized(entry["period"], locale)), styles["entry_meta"]),
        ]],
        colWidths=[width - 37 * mm, 37 * mm],
    )
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    institution = localized(entry["institution"], locale)
    location = localized(entry["location"], locale)
    return KeepTogether([
        header,
        Paragraph(f"{safe(institution)} | {safe(location)}", styles["body_secondary"]),
        Paragraph(safe(localized(entry["detail"], locale)), styles["body"]),
        Spacer(1, 4),
    ])


def publication_block(publication: dict, locale: str, styles: dict[str, ParagraphStyle]) -> KeepTogether:
    title = safe(publication["title"])
    paper_url = safe(publication["links"]["paper"])
    authors = safe(", ".join(publication["authors"])).replace("Yiming Ma", "<b>Yiming Ma</b>")
    one_line = safe(localized(publication["oneLine"], locale))
    return KeepTogether([
        Paragraph(safe(publication["venue"]), styles["pub_venue"]),
        Paragraph(f'<link href="{paper_url}" color="#17181c">{title}</link>', styles["pub_title"]),
        Paragraph(authors, styles["small"]),
        Paragraph(one_line, styles["body_secondary"]),
        Spacer(1, 6),
    ])


def build_pdf(locale: str, output_path: Path) -> None:
    is_zh = locale == "zh"
    styles = make_styles(locale)
    left_margin = right_margin = 16 * mm
    top_margin = 15 * mm
    bottom_margin = 14 * mm
    width = A4[0] - left_margin - right_margin
    updated = localized(CV_DATA["updated"], locale)
    footer_left = f"马一铭 · 学术简历 · 更新于 {updated}" if is_zh else f"Yiming Ma · Academic CV · Updated {updated}"

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=left_margin,
        rightMargin=right_margin,
        topMargin=top_margin,
        bottomMargin=bottom_margin,
        title="马一铭 - 中文学术简历" if is_zh else "Yiming Ma - Academic CV",
        author="Yiming Ma",
        subject="Academic curriculum vitae",
    )

    def draw_page(canvas, document) -> None:
        canvas.saveState()
        canvas.setStrokeColor(BORDER)
        canvas.setLineWidth(0.5)
        canvas.line(left_margin, 10 * mm, A4[0] - right_margin, 10 * mm)
        footer_font = "CVChinese" if is_zh else "Helvetica"
        canvas.setFont(footer_font, 7)
        canvas.setFillColor(SECONDARY)
        canvas.drawString(left_margin, 6.5 * mm, footer_left)
        page_label = f"第 {document.page} 页" if is_zh else f"Page {document.page}"
        canvas.drawRightString(A4[0] - right_margin, 6.5 * mm, page_label)
        canvas.restoreState()

    contact = CV_DATA["contact"]
    contact_line = (
        f'<link href="mailto:{safe(contact["email"])}" color="#5e626b">{safe(contact["email"])}</link>'
        f' | <link href="{safe(contact["github"])}" color="#5e626b">GitHub</link>'
        f' | <link href="{safe(contact["scholar"])}" color="#5e626b">Google Scholar</link>'
        f' | <link href="{safe(contact["linkedin"])}" color="#5e626b">LinkedIn</link>'
    )

    story = [
        Paragraph("马一铭" if is_zh else "Yiming Ma", styles["name"]),
        Paragraph(safe(localized(CV_DATA["headline"], locale)), styles["headline"]),
        Paragraph(contact_line, styles["contact"]),
        Spacer(1, 5),
        HRFlowable(width="100%", thickness=1.2, color=TEXT, spaceAfter=5),
    ]

    section_heading(story, "研究简介" if is_zh else "PROFILE", styles)
    story.append(Paragraph(safe(localized(CV_DATA["summary"], locale)), styles["body"]))

    section_heading(story, "工作经历" if is_zh else "EXPERIENCE", styles)
    for entry in CV_DATA["experience"]:
        story.append(entry_block(entry, locale, styles, width))

    section_heading(story, "教育背景" if is_zh else "EDUCATION", styles)
    for entry in CV_DATA["education"]:
        story.append(education_block(entry, locale, styles, width))

    story.append(PageBreak())
    section_heading(story, "论文与预印本" if is_zh else "PUBLICATIONS AND PREPRINTS", styles)
    for publication in load_publications():
        story.append(publication_block(publication, locale, styles))

    section_heading(story, "学术服务" if is_zh else "SERVICE", styles)
    story.append(Paragraph(safe(localized(CV_DATA["service"], locale)), styles["body"]))

    section_heading(story, "技能" if is_zh else "SKILLS", styles)
    skill_rows = []
    for skill in CV_DATA["skills"]:
        skill_rows.append([
            Paragraph(f'<b>{safe(localized(skill["label"], locale))}</b>', styles["body"]),
            Paragraph(safe(localized(skill["value"], locale)), styles["body_secondary"]),
        ])
    skills_table = Table(skill_rows, colWidths=[38 * mm, width - 38 * mm], repeatRows=0)
    table_commands = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, BORDER),
    ]
    for row_index in range(len(skill_rows)):
        if row_index % 2 == 0:
            table_commands.append(("BACKGROUND", (0, row_index), (-1, row_index), SOFT))
    skills_table.setStyle(TableStyle(table_commands))
    story.append(skills_table)

    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PUBLISH_DIR.mkdir(parents=True, exist_ok=True)

    outputs = {
        "en": OUTPUT_DIR / "Yiming-Ma-CV-en.pdf",
        "zh": OUTPUT_DIR / "Yiming-Ma-CV-zh.pdf",
    }
    for locale, output_path in outputs.items():
        build_pdf(locale, output_path)
        shutil.copy2(output_path, PUBLISH_DIR / output_path.name)
        print(PUBLISH_DIR / output_path.name)


if __name__ == "__main__":
    main()
