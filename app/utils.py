"""
Shared utility functions to reduce code duplication across modules.
"""

import re
from difflib import SequenceMatcher


RE_EXPLICIT_ORDER = re.compile(r"\b(and then|then|after that|afterwards|before that|before|first|second|finally)\b", re.IGNORECASE)
RE_AND_THEN = re.compile(r"\b(and then|then)\b", re.IGNORECASE)
RE_BEFORE = re.compile(r"\bbefore\b", re.IGNORECASE)
RE_AFTER = re.compile(r"\bafter\b", re.IGNORECASE)

RE_MERGE_OPS = re.compile(r"\bmerge|combine|join\b", re.IGNORECASE)
RE_SPLIT_OPS = re.compile(r"\bsplit|extract|keep\b", re.IGNORECASE)
RE_DELETE_OPS = re.compile(r"\bdelete|remove\b", re.IGNORECASE)
RE_COMPRESS_OPS = re.compile(r"\bcompress|shrink|smaller\b", re.IGNORECASE)
RE_CONVERT_OPS = re.compile(r"\bconvert\b|\bdocx\b|\bword\b", re.IGNORECASE)
RE_ROTATE_OPS = re.compile(r"\brotate|turn|straight|flip\b", re.IGNORECASE)
RE_REORDER_OPS = re.compile(r"\breorder\b|\bswap\b", re.IGNORECASE)
RE_WATERMARK_OPS = re.compile(r"\bwatermark\b", re.IGNORECASE)
RE_PAGE_NUMBERS_OPS = re.compile(r"\bpage\s*numbers?\b", re.IGNORECASE)
RE_OCR_OPS = re.compile(r"\bocr\b", re.IGNORECASE)
RE_IMAGES_OPS = re.compile(r"\bimages?\b|\bimg\b|\bpng\b|\bjpg\b|\bjpeg\b", re.IGNORECASE)

RE_PAGE_WITH_DIGIT = re.compile(r"\bpages?\b\s*\d", re.IGNORECASE)
RE_DIGIT_RANGE = re.compile(r"\b\d+\s*-\s*\d+\b")
RE_DIGIT_COMMA = re.compile(r"\b\d+\s*,\s*\d+\b")

RE_ROTATE_DEGREES = re.compile(r"(-?\d+)\s*(deg|degree|degrees)?", re.IGNORECASE)
RE_COMPRESS_SIZE = re.compile(r"(\d+)\s*(mb|kb)", re.IGNORECASE)
RE_PAGE_RANGES = re.compile(r"\d+(\s*-\s*\d+)?(\s*,\s*\d+(\s*-\s*\d+)?)*")


def normalize_whitespace(s: str) -> str:
    """Normalize whitespace: strip and collapse multiple spaces into one."""
    return " ".join((s or "").split()).strip()


def fuzzy_match_string(query: str, candidates: list[str], threshold: float = 0.84) -> str | None:
    """Find the best fuzzy match for query in candidates list.
    
    Args:
        query: String to match
        candidates: List of possible matches
        threshold: Minimum similarity score (0.0-1.0)
    
    Returns:
        Best matching candidate if above threshold, None otherwise
    """
    if not query or not candidates:
        return None
    
    query_lower = query.lower()
    
    for candidate in candidates:
        if candidate.lower() == query_lower:
            return candidate
    
    best = None
    best_score = 0.0
    for candidate in candidates:
        score = SequenceMatcher(None, query_lower, candidate.lower()).ratio()
        if score > best_score:
            best_score = score
            best = candidate
    
    return best if best and best_score >= threshold else None


def fuzzy_match_keyword(word: str, keywords: list[str], threshold: float = 0.86) -> str:
    """Match a word to a list of keywords with fuzzy matching.
    
    Returns the original word if no match above threshold or word is too short.
    """
    w = word.lower()
    if w in keywords or len(w) < 4:
        return w
    
    best = None
    best_score = 0.0
    for k in keywords:
        score = SequenceMatcher(None, w, k).ratio()
        if score > best_score:
            best_score = score
            best = k
    
    return best if best and best_score >= threshold else word



OPERATION_KEYWORDS = frozenset([
    "compress", "split", "extract", "keep", "merge", "combine", "join",
    "delete", "remove", "convert", "rotate", "reorder", "watermark",
    "page", "numbers", "images", "image", "img", "ocr"
])

CONNECTOR_KEYWORDS = frozenset([
    "then", "before", "after", "first", "second", "finally"
])

UNIT_KEYWORDS = frozenset([
    "mb", "pages", "page", "docx", "word"
])

ALL_NORMALIZE_KEYWORDS = list(OPERATION_KEYWORDS | CONNECTOR_KEYWORDS | UNIT_KEYWORDS)
