"""
Language Detection for Paper Content

Detects if paper text is in English, Chinese, or another language.
Only English and Chinese papers are supported for the tribunal.
"""

import re
from typing import Literal


SupportedLanguage = Literal["en", "zh"]
DetectedLanguage = Literal["en", "zh", "unsupported"]


def detect_language(text: str) -> tuple[DetectedLanguage, str]:
    """
    Detect the language of the input text.

    Returns:
        tuple: (language_code, language_name)
        - ("en", "English") for English text
        - ("zh", "Chinese") for Chinese text
        - ("unsupported", detected_language_name) for other languages
    """
    if not text or len(text.strip()) < 10:
        return ("en", "English")  # Default to English for very short text

    sample = text[:2000]

    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', sample))

    total_chars = len(re.findall(r'\S', sample))

    if total_chars == 0:
        return ("en", "English")

    chinese_ratio = chinese_chars / total_chars

    if chinese_ratio > 0.1:
        return ("zh", "Chinese")

    latin_chars = len(re.findall(r'[a-zA-Z]', sample))
    latin_ratio = latin_chars / total_chars if total_chars > 0 else 0

    if latin_ratio > 0.5:
        cyrillic = len(re.findall(r'[\u0400-\u04FF]', sample))
        if cyrillic / total_chars > 0.1:
            return ("unsupported", "Russian")

        arabic = len(re.findall(r'[\u0600-\u06FF]', sample))
        if arabic / total_chars > 0.1:
            return ("unsupported", "Arabic")

        return ("en", "English")

    japanese_hiragana = len(re.findall(r'[\u3040-\u309F]', sample))
    japanese_katakana = len(re.findall(r'[\u30A0-\u30FF]', sample))
    if (japanese_hiragana + japanese_katakana) / total_chars > 0.05:
        return ("unsupported", "Japanese")

    korean = len(re.findall(r'[\uAC00-\uD7AF]', sample))
    if korean / total_chars > 0.1:
        return ("unsupported", "Korean")

    thai = len(re.findall(r'[\u0E00-\u0E7F]', sample))
    if thai / total_chars > 0.1:
        return ("unsupported", "Thai")

    hebrew = len(re.findall(r'[\u0590-\u05FF]', sample))
    if hebrew / total_chars > 0.1:
        return ("unsupported", "Hebrew")

    greek = len(re.findall(r'[\u0370-\u03FF]', sample))
    if greek / total_chars > 0.1:
        return ("unsupported", "Greek")

    devanagari = len(re.findall(r'[\u0900-\u097F]', sample))
    if devanagari / total_chars > 0.1:
        return ("unsupported", "Hindi")

    if latin_ratio > 0.3:
        return ("en", "English")

    return ("unsupported", "Unknown")


def is_supported_language(text: str) -> tuple[bool, DetectedLanguage, str]:
    """
    Check if the text is in a supported language (English or Chinese).

    Returns:
        tuple: (is_supported, language_code, language_name)
    """
    lang_code, lang_name = detect_language(text)
    is_supported = lang_code in ("en", "zh")
    return (is_supported, lang_code, lang_name)
