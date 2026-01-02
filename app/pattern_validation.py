"""
40K Pattern Validation Module

Validates commands against the 40,050 CASE patterns from the unified spec.
Implements all GUARDS:
- Redundancy check (skip redundant ops)
- Compatibility check (op vs file type)
- Size-miss handling (retry stronger preset)
- XML/Unicode fallback (OCR retry)

STRICT NON-BREAKING: This module ADDS validation, does NOT change existing behavior.
"""

import re
import logging
from dataclasses import dataclass, field
from typing import Optional, List, Tuple, Dict, Set
from enum import Enum

logger = logging.getLogger(__name__)



class ValidationStatus(str, Enum):
    """Validation outcome status"""
    VALID = "valid"
    REDUNDANT = "redundant"  # Skip operation
    INCOMPATIBLE = "incompatible"  # Operation not supported for file type
    RETRY_NEEDED = "retry_needed"  # Should retry with different settings
    AMBIGUOUS = "ambiguous"  # Needs user clarification


@dataclass
class ValidationResult:
    """Result of validating a command"""
    status: ValidationStatus
    is_valid: bool
    original_pipeline: List[str] = field(default_factory=list)
    adjusted_pipeline: List[str] = field(default_factory=list)  # After removing redundant ops
    user_message: Optional[str] = None
    retry_action: Optional[str] = None
    skip_reason: Optional[str] = None



FILE_TYPES = {"pdf", "docx", "doc", "jpg", "jpeg", "png", "img"}

OPERATIONS = {
    "merge", "split", "compress", "convert", "ocr", "clean",
    "enhance", "rotate", "reorder", "flatten", "watermark", "page-numbers"
}

VALID_OPS_BY_TYPE: Dict[str, Set[str]] = {
    "pdf": {
        "merge", "split", "compress", "convert", "ocr", "clean",
        "enhance", "rotate", "reorder", "flatten", "watermark", "page-numbers"
    },
    "docx": {
        "convert", "compress", "watermark", "page-numbers"
    },
    "doc": {
        "convert", "compress", "watermark"
    },
    "jpg": {
        "merge", "compress", "convert", "enhance", "rotate"
    },
    "jpeg": {
        "merge", "compress", "convert", "enhance", "rotate"
    },
    "png": {
        "merge", "compress", "convert", "enhance", "rotate"
    },
    "img": {
        "merge", "compress", "convert", "enhance", "rotate"
    },
}

REDUNDANT_CONVERSIONS = {
    ("jpg", "jpg"), ("jpeg", "jpeg"), ("png", "png"),
    ("jpg", "jpeg"), ("jpeg", "jpg"),
    ("pdf", "pdf"),
    ("docx", "docx"), ("doc", "doc"),
    ("img", "img"),
}

CONFLICTING_OPS = [
    {"split", "merge"},  # Can't split and merge same file
]

OP_REQUIRES_TYPE: Dict[str, Set[str]] = {
    "ocr": {"pdf", "jpg", "jpeg", "png", "img"},  # Not docx
    "flatten": {"pdf"},  # PDF only
    "split": {"pdf"},  # PDF only (page-based)
    "reorder": {"pdf"},  # PDF only
    "page-numbers": {"pdf", "docx"},  # Document types
}



NOISE_PREFIXES = [
    r"^and\s+",
    r"^pls\s+",
    r"^plz\s+",
    r"^please\s+",
    r"^do\s+it\s+",
    r"^make\s+small\s+",
    r"^fix\s+this\s+",
    r"^to\s+doc\s+",
    r"^to\s+img\s+",
    r"^1\s+to\s+2\s+",  # Page range prefix
    r"^then\s+",
    r"^now\s+",
    r"^just\s+",
    r"^can\s+you\s+",
    r"^i\s+want\s+to\s+",
    r"^i\s+need\s+to\s+",
    r"^help\s+me\s+",
    r"^could\s+you\s+",
    r"^would\s+you\s+",
]

TARGET_FORMAT_PATTERNS = {
    r"\bto\s+pdf\b": "pdf",
    r"\bto\s+docx?\b": "docx",
    r"\bto\s+doc\b": "docx",
    r"\bto\s+img\b": "img",
    r"\bto\s+image\b": "img",
    r"\bto\s+png\b": "png",
    r"\bto\s+jpe?g\b": "jpg",
    r"\bas\s+pdf\b": "pdf",
    r"\bas\s+docx?\b": "docx",
    r"\bas\s+image\b": "img",
}

TARGET_SIZE_PATTERNS = {
    r"\b500\s*kb\b": 0.5,  # MB
    r"\b1\s*mb\b": 1.0,
    r"\b2\s*mb\b": 2.0,
    r"\b5\s*mb\b": 5.0,
    r"\b10\s*mb\b": 10.0,
}

PURPOSE_PRESETS = {
    "email": {"max_size_mb": 10.0, "quality": "medium"},
    "whatsapp": {"max_size_mb": 16.0, "quality": "medium"},
    "print": {"max_size_mb": 50.0, "quality": "high"},
    "web": {"max_size_mb": 5.0, "quality": "low"},
    "share": {"max_size_mb": 25.0, "quality": "medium"},
}



class PatternValidator:
    """
    Validates commands against 40K pattern rules.
    Applies all guards deterministically (never asks user).
    """
    
    def __init__(self):
        self.noise_patterns = [re.compile(p, re.IGNORECASE) for p in NOISE_PREFIXES]
    
    def validate(
        self,
        operations: List[str],
        source_type: str,
        target_type: Optional[str] = None,
        target_size_mb: Optional[float] = None
    ) -> ValidationResult:
        """
        Validate a pipeline of operations.
        
        Args:
            operations: List of operations (e.g., ["compress", "convert"])
            source_type: Input file type (pdf, docx, jpg, etc.)
            target_type: Target output type (optional)
            target_size_mb: Target file size in MB (optional)
        
        Returns:
            ValidationResult with status and adjusted pipeline
        """
        
        source_type = source_type.lower()
        
        if not operations:
            return ValidationResult(
                status=ValidationStatus.AMBIGUOUS,
                is_valid=False,
                original_pipeline=operations,
                adjusted_pipeline=[],
                user_message="No operations detected"
            )
        
        redundancy_result = self._check_redundancy(operations, source_type, target_type)
        if redundancy_result:
            return redundancy_result
        
        compat_result = self._check_compatibility(operations, source_type)
        if compat_result:
            return compat_result
        
        conflict_result = self._check_conflicts(operations)
        if conflict_result:
            return conflict_result
        
        return ValidationResult(
            status=ValidationStatus.VALID,
            is_valid=True,
            original_pipeline=operations,
            adjusted_pipeline=operations
        )
    
    def _check_redundancy(
        self,
        operations: List[str],
        source_type: str,
        target_type: Optional[str]
    ) -> Optional[ValidationResult]:
        """Check for redundant operations"""
        
        if "convert" in operations and target_type:
            if (source_type, target_type) in REDUNDANT_CONVERSIONS:
                adjusted = [op for op in operations if op != "convert"]
                
                if not adjusted:
                    return ValidationResult(
                        status=ValidationStatus.REDUNDANT,
                        is_valid=True,  # Valid but skipped
                        original_pipeline=operations,
                        adjusted_pipeline=[],
                        skip_reason=f"File is already in {target_type.upper()} format"
                    )
                else:
                    return ValidationResult(
                        status=ValidationStatus.VALID,
                        is_valid=True,
                        original_pipeline=operations,
                        adjusted_pipeline=adjusted,
                        user_message=f"Skipping conversion (already {target_type.upper()})"
                    )
        
        seen = set()
        adjusted = []
        for op in operations:
            if op not in seen:
                seen.add(op)
                adjusted.append(op)
        
        if len(adjusted) < len(operations):
            return ValidationResult(
                status=ValidationStatus.VALID,
                is_valid=True,
                original_pipeline=operations,
                adjusted_pipeline=adjusted,
                user_message="Removed duplicate operations"
            )
        
        return None
    
    def _check_compatibility(
        self,
        operations: List[str],
        source_type: str
    ) -> Optional[ValidationResult]:
        """Check if operations are compatible with file type"""
        
        valid_ops = VALID_OPS_BY_TYPE.get(source_type, set())
        
        incompatible = []
        compatible = []
        
        for op in operations:
            if op in valid_ops:
                compatible.append(op)
            else:
                incompatible.append(op)
        
        if incompatible:
            if not compatible:
                return ValidationResult(
                    status=ValidationStatus.INCOMPATIBLE,
                    is_valid=False,
                    original_pipeline=operations,
                    adjusted_pipeline=[],
                    user_message=f"Operations not supported for {source_type.upper()}: {', '.join(incompatible)}"
                )
            else:
                return ValidationResult(
                    status=ValidationStatus.VALID,
                    is_valid=True,
                    original_pipeline=operations,
                    adjusted_pipeline=compatible,
                    user_message=f"Skipping unsupported operations: {', '.join(incompatible)}"
                )
        
        return None
    
    def _check_conflicts(self, operations: List[str]) -> Optional[ValidationResult]:
        """Check for conflicting operations"""
        
        op_set = set(operations)
        
        for conflict_set in CONFLICTING_OPS:
            if conflict_set.issubset(op_set):
                return ValidationResult(
                    status=ValidationStatus.INCOMPATIBLE,
                    is_valid=False,
                    original_pipeline=operations,
                    adjusted_pipeline=[],
                    user_message=f"Cannot perform {' and '.join(conflict_set)} on the same file"
                )
        
        return None
    
    def validate_size_target(
        self,
        achieved_size_mb: float,
        target_size_mb: float,
        retry_count: int = 0
    ) -> ValidationResult:
        """
        Validate if size target was achieved.
        
        GUARD: If miss, retry with stronger preset once.
        """
        
        if achieved_size_mb <= target_size_mb:
            return ValidationResult(
                status=ValidationStatus.VALID,
                is_valid=True,
                user_message=f"Target size achieved: {achieved_size_mb:.1f}MB"
            )
        
        if retry_count == 0:
            return ValidationResult(
                status=ValidationStatus.RETRY_NEEDED,
                is_valid=True,  # Can retry
                retry_action="stronger_preset",
                user_message=f"Retrying with stronger compression (current: {achieved_size_mb:.1f}MB, target: {target_size_mb:.1f}MB)"
            )
        
        return ValidationResult(
            status=ValidationStatus.VALID,
            is_valid=True,
            user_message=f"Best compression achieved: {achieved_size_mb:.1f}MB (target was {target_size_mb:.1f}MB)"
        )
    
    def validate_error_for_retry(
        self,
        error_message: str,
        retry_count: int = 0
    ) -> ValidationResult:
        """
        Check if error should trigger OCR fallback retry.
        
        GUARD: XML/Unicode errors → OCR fallback once.
        """
        
        xml_error_patterns = [
            "xml compatible",
            "unicode",
            "encoding error",
            "character map",
            "null byte",
            "invalid character",
            "codec can't decode",
            "unencodable character",
        ]
        
        error_lower = error_message.lower()
        is_text_error = any(p in error_lower for p in xml_error_patterns)
        
        if is_text_error and retry_count == 0:
            return ValidationResult(
                status=ValidationStatus.RETRY_NEEDED,
                is_valid=True,
                retry_action="ocr_fallback",
                user_message="Retrying with OCR processing"
            )
        
        return ValidationResult(
            status=ValidationStatus.VALID,
            is_valid=False,
            user_message="Processing failed - please try a different approach"
        )



def validate_pipeline(
    operations: List[str],
    source_file: str,
    target_format: Optional[str] = None,
    target_size_mb: Optional[float] = None
) -> ValidationResult:
    """
    Convenience function to validate a pipeline.
    
    Args:
        operations: List of operations
        source_file: Source filename (for type detection)
        target_format: Target output format
        target_size_mb: Target size in MB
    
    Returns:
        ValidationResult
    """
    
    ext = source_file.rsplit(".", 1)[-1].lower() if "." in source_file else "pdf"
    
    validator = PatternValidator()
    return validator.validate(operations, ext, target_format, target_size_mb)


def should_retry_on_error(error_message: str, retry_count: int = 0) -> Tuple[bool, Optional[str]]:
    """
    Check if we should retry based on error.
    
    Returns:
        (should_retry, retry_action)
    """
    
    validator = PatternValidator()
    result = validator.validate_error_for_retry(error_message, retry_count)
    
    if result.status == ValidationStatus.RETRY_NEEDED:
        return True, result.retry_action
    
    return False, None


def should_retry_on_size_miss(
    achieved_mb: float,
    target_mb: float,
    retry_count: int = 0
) -> Tuple[bool, Optional[str]]:
    """
    Check if we should retry with stronger compression.
    
    Returns:
        (should_retry, retry_action)
    """
    
    validator = PatternValidator()
    result = validator.validate_size_target(achieved_mb, target_mb, retry_count)
    
    if result.status == ValidationStatus.RETRY_NEEDED:
        return True, result.retry_action
    
    return False, None


pattern_validator = PatternValidator()
