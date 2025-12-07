"""
Paper Parser for PDF and Text Files

Supports both English and Chinese PDFs with proper text extraction.
Uses PyMuPDF (fitz) for better Chinese character handling.
"""

import io
import re
from typing import Tuple, Dict, Any

# Try pymupdf first (better for Chinese), fallback to pypdf
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

from pypdf import PdfReader


def _is_chinese_text(text: str) -> bool:
    """Check if text contains significant Chinese characters."""
    if not text:
        return False
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text[:2000]))
    total_chars = len(re.findall(r'\S', text[:2000]))
    if total_chars == 0:
        return False
    return chinese_chars / total_chars > 0.1


def _extract_with_pymupdf(content: bytes) -> Tuple[str, Dict[str, Any]]:
    """
    Extract text from PDF using PyMuPDF (fitz).
    Better support for Chinese and complex fonts.
    """
    pdf_stream = io.BytesIO(content)
    doc = fitz.open(stream=pdf_stream, filetype="pdf")

    text_parts = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        # Use text extraction with better handling
        text = page.get_text("text", sort=True)
        if text:
            text_parts.append(text)

    full_text = "\n\n".join(text_parts)

    # Extract metadata
    metadata = {}
    doc_metadata = doc.metadata
    if doc_metadata:
        metadata = {
            "title": doc_metadata.get("title", ""),
            "author": doc_metadata.get("author", ""),
            "subject": doc_metadata.get("subject", ""),
            "creator": doc_metadata.get("creator", ""),
            "producer": doc_metadata.get("producer", ""),
            "creation_date": str(doc_metadata.get("creationDate", "")),
        }

    metadata["page_count"] = len(doc)
    metadata["character_count"] = len(full_text)

    doc.close()
    return full_text, metadata


def _extract_with_pypdf(content: bytes) -> Tuple[str, Dict[str, Any]]:
    """
    Extract text from PDF using pypdf.
    Fallback option, less reliable for Chinese.
    """
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

    metadata["page_count"] = len(reader.pages)
    metadata["character_count"] = len(full_text)

    return full_text, metadata


async def parse_pdf(content: bytes) -> Tuple[str, Dict[str, Any]]:
    """
    Parse a PDF file and extract text and metadata.

    Uses PyMuPDF (fitz) for better Chinese support when available,
    falls back to pypdf otherwise.

    Args:
        content: PDF file content as bytes

    Returns:
        Tuple of (extracted_text, metadata_dict)
    """
    full_text = ""
    metadata = {}

    # Try PyMuPDF first (better for Chinese)
    if HAS_PYMUPDF:
        try:
            full_text, metadata = _extract_with_pymupdf(content)
        except Exception as e:
            # Fallback to pypdf if pymupdf fails
            full_text, metadata = _extract_with_pypdf(content)
    else:
        full_text, metadata = _extract_with_pypdf(content)

    # Extract title if not in metadata
    if not metadata.get("title"):
        lines = full_text.strip().split('\n')
        for line in lines[:10]:
            line = line.strip()
            # Skip lines that look like page numbers or headers
            if len(line) > 5 and len(line) < 300:
                # Skip common header patterns
                if not re.match(r'^(第|Vol\.|No\.|ISSN|DOI|http)', line):
                    metadata["title"] = line
                    break

    return full_text, metadata


async def parse_pdf_chinese(content: bytes) -> Tuple[str, Dict[str, Any]]:
    """
    Parse a Chinese PDF file with optimized settings.

    Args:
        content: PDF file content as bytes

    Returns:
        Tuple of (extracted_text, metadata_dict)
    """
    if not HAS_PYMUPDF:
        return await parse_pdf(content)

    pdf_stream = io.BytesIO(content)
    doc = fitz.open(stream=pdf_stream, filetype="pdf")

    text_parts = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        # Extract with better text sorting for Chinese layout
        text = page.get_text("text", sort=True)
        if text:
            # Clean up common issues with Chinese PDFs
            text = _clean_chinese_text(text)
            text_parts.append(text)

    full_text = "\n\n".join(text_parts)

    # Extract metadata
    metadata = {}
    doc_metadata = doc.metadata
    if doc_metadata:
        metadata = {
            "title": doc_metadata.get("title", ""),
            "author": doc_metadata.get("author", ""),
            "subject": doc_metadata.get("subject", ""),
            "creator": doc_metadata.get("creator", ""),
            "producer": doc_metadata.get("producer", ""),
            "creation_date": str(doc_metadata.get("creationDate", "")),
        }

    metadata["page_count"] = len(doc)
    metadata["character_count"] = len(full_text)
    metadata["language"] = "zh"

    # Extract Chinese title from text if not in metadata
    if not metadata.get("title"):
        metadata["title"] = _extract_chinese_title(full_text)

    doc.close()
    return full_text, metadata


def _clean_chinese_text(text: str) -> str:
    """Clean up common issues in Chinese PDF text extraction."""
    # Remove excessive whitespace while preserving paragraph breaks
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Fix common encoding artifacts
    text = text.replace('\ufeff', '')  # BOM
    text = text.replace('\u00a0', ' ')  # Non-breaking space

    return text.strip()


def _extract_chinese_title(text: str) -> str:
    """Extract title from Chinese paper text."""
    lines = text.strip().split('\n')

    for line in lines[:15]:
        line = line.strip()
        # Skip empty lines and common header patterns
        if not line or len(line) < 5:
            continue
        # Skip volume/issue markers
        if re.match(r'^(第|Vol\.|No\.|ISSN|DOI|http|www\.|[0-9]+年|[0-9]+月)', line):
            continue
        # Skip English headers in bilingual papers
        if re.match(r'^[A-Z\s]+$', line):
            continue
        # Found likely title
        if len(line) > 5 and len(line) < 200:
            # Check if it has Chinese characters
            if re.search(r'[\u4e00-\u9fff]', line):
                return line

    return "未命名论文"  # "Untitled Paper" in Chinese


async def parse_text(content: str) -> Tuple[str, Dict[str, Any]]:
    """
    Parse plain text content.

    Args:
        content: Plain text content

    Returns:
        Tuple of (text, metadata_dict)
    """
    lines = content.strip().split('\n')

    title = ""
    for line in lines[:5]:
        line = line.strip()
        if len(line) > 10 and len(line) < 200:
            title = line
            break

    # Detect language
    is_chinese = _is_chinese_text(content)

    metadata = {
        "title": title,
        "character_count": len(content),
        "line_count": len(lines),
        "language": "zh" if is_chinese else "en",
    }

    return content, metadata


def extract_abstract(text: str) -> str:
    """
    Extract abstract section from paper text.
    Supports both English and Chinese papers.
    """
    text_lower = text.lower()
    is_chinese = _is_chinese_text(text)

    abstract_start = -1

    if is_chinese:
        # Chinese abstract markers
        for marker in ["摘要", "摘 要", "abstract"]:
            idx = text.lower().find(marker) if marker == "abstract" else text.find(marker)
            if idx != -1:
                abstract_start = idx
                break
    else:
        # English abstract markers
        for marker in ["abstract", "summary"]:
            idx = text_lower.find(marker)
            if idx != -1:
                abstract_start = idx
                break

    if abstract_start == -1:
        return ""

    abstract_text = text[abstract_start:]

    # End markers for abstract section
    if is_chinese:
        end_markers = ["关键词", "关键字", "引言", "1.", "1 ", "introduction", "keywords"]
    else:
        end_markers = ["introduction", "1.", "1 ", "background", "keywords"]

    abstract_end = len(abstract_text)
    for marker in end_markers:
        search_text = abstract_text if marker in ["关键词", "关键字", "引言"] else abstract_text.lower()
        idx = search_text.find(marker, 50)  # Start searching after the marker itself
        if idx != -1 and idx < abstract_end:
            abstract_end = idx

    return abstract_text[:abstract_end].strip()


def extract_abstract_chinese(text: str) -> str:
    """
    Extract abstract from Chinese paper.

    Args:
        text: Full paper text

    Returns:
        Abstract text in Chinese
    """
    # Chinese abstract markers
    markers = ["摘要", "摘 要", "内容提要"]

    abstract_start = -1
    for marker in markers:
        idx = text.find(marker)
        if idx != -1:
            abstract_start = idx + len(marker)
            break

    if abstract_start == -1:
        return ""

    abstract_text = text[abstract_start:]

    # Find end of abstract
    end_markers = ["关键词", "关键字", "引言", "1.", "1 ", "Abstract", "Key words"]
    abstract_end = min(2000, len(abstract_text))  # Max 2000 chars

    for marker in end_markers:
        idx = abstract_text.find(marker)
        if idx > 50 and idx < abstract_end:
            abstract_end = idx

    return abstract_text[:abstract_end].strip()


def extract_sections(text: str) -> Dict[str, str]:
    """
    Extract common sections from paper text.
    Supports both English and Chinese papers.
    """
    is_chinese = _is_chinese_text(text)

    if is_chinese:
        return extract_sections_chinese(text)
    else:
        return extract_sections_english(text)


def extract_sections_english(text: str) -> Dict[str, str]:
    """Extract sections from English paper."""
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


def extract_sections_chinese(text: str) -> Dict[str, str]:
    """
    Extract sections from Chinese paper.

    Args:
        text: Full paper text

    Returns:
        Dictionary of section_name -> section_content
    """
    sections = {}

    # Common Chinese section markers
    chinese_sections = [
        ("摘要", "abstract"),
        ("关键词", "keywords"),
        ("引言", "introduction"),
        ("背景", "background"),
        ("方法", "methods"),
        ("实验", "experiments"),
        ("结果", "results"),
        ("讨论", "discussion"),
        ("结论", "conclusion"),
        ("致谢", "acknowledgments"),
        ("参考文献", "references"),
    ]

    section_positions = []
    for cn_marker, en_name in chinese_sections:
        idx = text.find(cn_marker)
        if idx != -1:
            section_positions.append((idx, en_name, cn_marker))

    section_positions.sort(key=lambda x: x[0])

    for i, (pos, en_name, cn_marker) in enumerate(section_positions):
        start_pos = pos + len(cn_marker)
        if i < len(section_positions) - 1:
            end_pos = section_positions[i + 1][0]
        else:
            end_pos = len(text)
        sections[en_name] = text[start_pos:end_pos].strip()

    return sections
