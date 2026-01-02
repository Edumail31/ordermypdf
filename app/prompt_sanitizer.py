"""
Cost-Safe LLM Prompt Sanitization Layer

This module implements a LOCAL heuristic filter that runs BEFORE calling LLM.
LLM is the LAST line of defense, not the first.

Purpose:
- 90%+ of user inputs NEVER hit LLM
- Typos handled locally
- Aliases handled locally  
- LLM used ONLY for extreme, unpredictable garbage

Position in Pipeline:
    User Input
        ↓
    Local Heuristic Filter (THIS MODULE - FAST, NO AI)
        ↓
    IF extreme garbage → LLM Sanitization
        ↓
    ELSE → Existing Ambiguity Logic (clarification_layer.py)
"""

import re
from typing import Tuple, Optional
from dataclasses import dataclass



KNOWN_ACTION_VERBS = {
    "merge", "combine", "join", "split", "extract", "keep", "delete", "remove",
    "compress", "reduce", "shrink", "small", "smaller", "tiny",
    "convert", "change", "transform", "export",
    "rotate", "turn", "flip",
    "reorder", "reverse", "swap", "rearrange",
    "watermark", "stamp",
    "ocr", "scan", "searchable", "readable",
    "enhance", "improve", "clarify", "sharpen", "fix",
    "flatten", "optimize", "sanitize",
    "clean", "blank", "duplicate",
    "number", "numbers", "page",
    "text",
    "merg", "mrge", "combin", "compres", "comprs", "comress",
    "splt", "spill", "spilt", "splitt",
    "delet", "remov", "rotat", "roate", "rotae",
    "convrt", "cnvrt", "extrat", "extrac",
    "enhace", "enhanc",
}

KNOWN_FILE_TYPES = {
    "pdf", "docx", "doc", "word",
    "png", "jpg", "jpeg", "image", "images", "img",
    "txt", "text",
    "zip",
    "pfd", "pff", "dox", "dog", "docs", "wrod", "wrord",
    "pngg", "jgp", "jepg", "jpge", "imag", "imge",
}

KNOWN_ALIASES = {
    "to docx", "to doc", "to word", "as docx", "as word",
    "to pdf", "as pdf",
    "to png", "to jpg", "to jpeg", "to img", "to image", "to images",
    "as png", "as jpg", "as jpeg", "as img",
    "to txt", "to text", "as txt",
    "ocr", "compress", "merge", "split", "rotate", "flatten",
    "enhance", "clean", "watermark",
    "too docx", "too doc", "too pdf", "too word",
    "too png", "too jpg", "too img",
    "tto docx", "tto pdf", "tto png",
    "2 docx", "2 pdf", "2 png", "2 word",
    "to dox", "to dcox", "to doxx", "to pfd",
    "compres", "comprs", "comress",
    "splt", "splitt",
    "merg", "mrge",
    "rotat", "roate",
    "cnvrt", "convrt",
}

PURPOSE_KEYWORDS = {
    "email", "whatsapp", "print", "web", "share", "upload", "send",
    "smaller", "reduce", "shrink",
}

FILLER_WORDS = {
    "please", "pls", "plz", "can", "you", "could", "would",
    "i", "want", "need", "like", "to", "the", "this", "that",
    "my", "a", "an", "it", "do", "make", "just", "help",
    "me", "file", "files", "document", "documents",
}



@dataclass
class GarbageAnalysis:
    """Result of garbage detection analysis"""
    is_garbage: bool
    reason: str
    char_repetition_ratio: float
    non_alnum_ratio: float
    dictionary_word_ratio: float
    has_known_tokens: bool


def _calculate_char_repetition_ratio(text: str) -> float:
    """
    Calculate ratio of repeated consecutive characters.
    e.g., "toooooo" has high repetition, "to docx" has low.
    """
    if len(text) < 3:
        return 0.0
    
    repeated_count = 0
    for i in range(1, len(text)):
        if text[i] == text[i-1]:
            repeated_count += 1
    
    return repeated_count / (len(text) - 1)


def _calculate_non_alnum_ratio(text: str) -> float:
    """Calculate ratio of non-alphanumeric characters (excluding spaces)."""
    if not text:
        return 0.0
    
    non_alnum = sum(1 for c in text if not c.isalnum() and c != ' ')
    total = len(text.replace(' ', ''))
    
    return non_alnum / total if total > 0 else 0.0


def _calculate_dictionary_word_ratio(text: str) -> float:
    """
    Calculate ratio of recognized words vs total words.
    Uses known tokens + common English words.
    """
    words = text.lower().split()
    if not words:
        return 0.0
    
    all_known = KNOWN_ACTION_VERBS | KNOWN_FILE_TYPES | FILLER_WORDS | PURPOSE_KEYWORDS
    
    common_words = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been",
        "have", "has", "had", "do", "does", "did", "will", "would",
        "could", "should", "may", "might", "must", "shall",
        "and", "or", "but", "if", "then", "else", "when", "where",
        "what", "which", "who", "how", "why", "all", "each", "every",
        "both", "few", "more", "most", "other", "some", "such", "no",
        "not", "only", "same", "than", "too", "very", "just", "also",
        "now", "here", "there", "out", "up", "down", "in", "on", "at",
        "by", "for", "from", "into", "of", "off", "over", "to", "with",
        "first", "second", "third", "last", "next", "new", "old",
        "one", "two", "three", "four", "five", "six", "seven", "eight",
        "page", "pages", "file", "files", "document", "size", "mb", "kb",
    }
    all_known = all_known | common_words
    
    recognized = sum(1 for w in words if w in all_known or w.isdigit())
    return recognized / len(words)


def _has_known_tokens(text: str) -> bool:
    """Check if text contains any known action verbs or file types."""
    text_lower = text.lower()
    
    for verb in KNOWN_ACTION_VERBS:
        if verb in text_lower:
            return True
    
    for ftype in KNOWN_FILE_TYPES:
        if ftype in text_lower:
            return True
    
    for alias in KNOWN_ALIASES:
        if alias in text_lower:
            return True
    
    for purpose in PURPOSE_KEYWORDS:
        if purpose in text_lower:
            return True
    
    return False


def _matches_known_alias(text: str) -> bool:
    """Check if text matches a known alias pattern."""
    text_lower = text.lower().strip()
    
    if text_lower in KNOWN_ALIASES:
        return True
    
    for alias in KNOWN_ALIASES:
        if len(text_lower) >= 3 and len(alias) >= 3:
            if text_lower.startswith(alias[:3]) or alias.startswith(text_lower[:3]):
                return True
    
    return False


def analyze_for_garbage(text: str) -> GarbageAnalysis:
    """
    Analyze text to determine if it's extreme garbage requiring LLM.
    
    Returns GarbageAnalysis with detailed breakdown.
    """
    if not text or not text.strip():
        return GarbageAnalysis(
            is_garbage=True,
            reason="Empty input",
            char_repetition_ratio=0.0,
            non_alnum_ratio=0.0,
            dictionary_word_ratio=0.0,
            has_known_tokens=False,
        )
    
    text = text.strip()
    
    char_rep_ratio = _calculate_char_repetition_ratio(text)
    non_alnum_ratio = _calculate_non_alnum_ratio(text)
    dict_word_ratio = _calculate_dictionary_word_ratio(text)
    has_tokens = _has_known_tokens(text)
    
    is_garbage = False
    reason = "Valid input"
    
    if has_tokens:
        is_garbage = False
        reason = "Contains known tokens"
    elif _matches_known_alias(text):
        is_garbage = False
        reason = "Matches known alias"
    else:
        garbage_signals = 0
        reasons = []
        
        if char_rep_ratio > 0.3:
            garbage_signals += 1
            reasons.append(f"High char repetition ({char_rep_ratio:.2f})")
        
        if dict_word_ratio < 0.2:
            garbage_signals += 1
            reasons.append(f"Low dictionary ratio ({dict_word_ratio:.2f})")
        
        if non_alnum_ratio > 0.5:
            garbage_signals += 1
            reasons.append(f"High non-alnum ratio ({non_alnum_ratio:.2f})")
        
        if len(text.split()) <= 2 and dict_word_ratio < 0.5:
            garbage_signals += 1
            reasons.append("Very short, unrecognized")
        
        if garbage_signals >= 2:
            is_garbage = True
            reason = "; ".join(reasons)
    
    return GarbageAnalysis(
        is_garbage=is_garbage,
        reason=reason,
        char_repetition_ratio=char_rep_ratio,
        non_alnum_ratio=non_alnum_ratio,
        dictionary_word_ratio=dict_word_ratio,
        has_known_tokens=has_tokens,
    )



def should_use_llm(user_prompt: str, file_names: list[str] = None) -> Tuple[bool, str]:
    """
    Determine if LLM should be called for this prompt.
    
    Returns:
        (should_call_llm: bool, reason: str)
    
    LLM is NOT called if ANY are true:
        - Contains at least 1 known action verb
        - Contains at least 1 known file-type token
        - Matches any known alias or typo mapping
        - Length < 3 words but includes known tokens
    
    LLM IS called ONLY if ALL are true:
        - No known verbs
        - No known file types
        - No known aliases
        - High entropy / repeated characters / noise
    """
    if not user_prompt:
        return False, "Empty prompt - handle locally"
    
    prompt = user_prompt.strip()
    
    words = prompt.split()
    if len(words) <= 3:
        if _has_known_tokens(prompt):
            return False, "Short prompt with known tokens - handle locally"
        if _matches_known_alias(prompt):
            return False, "Short prompt matches alias - handle locally"
    
    analysis = analyze_for_garbage(prompt)
    
    if analysis.has_known_tokens:
        return False, f"Contains known tokens - handle locally"
    
    if _matches_known_alias(prompt):
        return False, "Matches known alias - handle locally"
    
    if analysis.is_garbage:
        return True, f"Extreme garbage detected: {analysis.reason}"
    
    return False, "Appears parseable - try local first"


def sanitize_with_llm(user_prompt: str, file_type: str) -> Tuple[Optional[str], bool]:
    """
    Use LLM to sanitize extreme garbage input.
    
    Args:
        user_prompt: The garbage input
        file_type: PDF, DOCX, or IMAGE
    
    Returns:
        (sanitized_prompt: str or None, is_valid: bool)
        
    If LLM returns INVALID_PROMPT, returns (None, False)
    """
    
    
    return None, False


def get_file_type_from_names(file_names: list[str]) -> str:
    """Determine primary file type from uploaded files."""
    if not file_names:
        return "UNKNOWN"
    
    primary = file_names[0].lower()
    
    if primary.endswith('.pdf'):
        return "PDF"
    elif primary.endswith('.docx'):
        return "DOCX"
    elif primary.endswith(('.png', '.jpg', '.jpeg')):
        return "IMAGE"
    else:
        return "UNKNOWN"


def get_invalid_prompt_response(file_type: str) -> dict:
    """
    Generate user-friendly response for invalid/garbage prompts.
    
    Returns dict with message and file-type-safe button options.
    """
    base_message = "I couldn't understand that. What would you like to do with this"
    
    if file_type == "PDF":
        return {
            "message": f"{base_message} PDF?",
            "options": ["compress", "split first page", "convert to docx", "rotate 90 degrees", "merge files"]
        }
    elif file_type == "DOCX":
        return {
            "message": f"{base_message} document?",
            "options": ["convert to PDF", "convert to images"]
        }
    elif file_type == "IMAGE":
        return {
            "message": f"{base_message} image?",
            "options": ["convert to PDF", "convert to docx", "enhance", "OCR"]
        }
    else:
        return {
            "message": f"{base_message} file?",
            "options": ["compress", "convert", "merge"]
        }
