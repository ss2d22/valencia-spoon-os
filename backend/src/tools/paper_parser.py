import io
from typing import Tuple, Dict, Any

from pypdf import PdfReader


async def parse_pdf(content: bytes) -> Tuple[str, Dict[str, Any]]:
    pdf_file = io.BytesIO(content)
    reader = PdfReader(pdf_file)

    text_parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            text_parts.append(text)

    full_text = "\n\n".join(text_parts)

    metadata = {}
    if reader.metadata:
        metadata = {
            "title": reader.metadata.get("/Title", ""),
            "author": reader.metadata.get("/Author", ""),
            "subject": reader.metadata.get("/Subject", ""),
            "creator": reader.metadata.get("/Creator", ""),
            "producer": reader.metadata.get("/Producer", ""),
            "creation_date": str(reader.metadata.get("/CreationDate", "")),
        }

    if not metadata.get("title"):
        lines = full_text.strip().split('\n')
        for line in lines[:5]:
            line = line.strip()
            if len(line) > 10 and len(line) < 200:
                metadata["title"] = line
                break

    metadata["page_count"] = len(reader.pages)
    metadata["character_count"] = len(full_text)

    return full_text, metadata


async def parse_text(content: str) -> Tuple[str, Dict[str, Any]]:
    lines = content.strip().split('\n')

    title = ""
    for line in lines[:5]:
        line = line.strip()
        if len(line) > 10 and len(line) < 200:
            title = line
            break

    metadata = {
        "title": title,
        "character_count": len(content),
        "line_count": len(lines),
    }

    return content, metadata


def extract_abstract(text: str) -> str:
    text_lower = text.lower()

    abstract_start = -1
    for marker in ["abstract", "summary"]:
        idx = text_lower.find(marker)
        if idx != -1:
            abstract_start = idx
            break

    if abstract_start == -1:
        return ""

    abstract_text = text[abstract_start:]
    end_markers = ["introduction", "1.", "1 ", "background", "keywords"]

    abstract_end = len(abstract_text)
    for marker in end_markers:
        idx = abstract_text.lower().find(marker, 100)
        if idx != -1 and idx < abstract_end:
            abstract_end = idx

    return abstract_text[:abstract_end].strip()


def extract_sections(text: str) -> Dict[str, str]:
    sections = {}
    common_sections = [
        "abstract", "introduction", "background", "methods", "methodology",
        "results", "discussion", "conclusion", "conclusions", "references",
        "acknowledgments", "appendix"
    ]

    text_lower = text.lower()

    section_positions = []
    for section in common_sections:
        idx = text_lower.find(section)
        if idx != -1:
            section_positions.append((idx, section))

    section_positions.sort(key=lambda x: x[0])

    for i, (pos, name) in enumerate(section_positions):
        if i < len(section_positions) - 1:
            next_pos = section_positions[i + 1][0]
            sections[name] = text[pos:next_pos].strip()
        else:
            sections[name] = text[pos:].strip()

    return sections
