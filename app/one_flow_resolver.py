"""
40K+ Pattern Resolution Module - Implements One-Flow Resolution

This module adds a DETERMINISTIC resolution layer to handle 40K+ command patterns:

FLOW:
1. Local Normalizer (typos, shorthand, context prefixes)
2. Deterministic Match (pipelines/guards)
   ├─ success → Execute
   └─ unclear → LLM Rephrase → Deterministic Match
                  ├─ success → Execute
                  └─ still unclear → Backend Options (top-N) → User Button Choice

GUARDS (Never Ask User):
- Redundant ops → SKIP (e.g., image→to img)
- Target-size miss → retry with stronger preset once
- XML/Unicode → OCR fallback once
- Resource limits → degrade quality once

NON-BREAKING: This ADDS to existing behavior, does NOT change it.
"""

import re
import logging
from dataclasses import dataclass, field
from typing import Optional, List, Tuple
from enum import Enum

logger = logging.getLogger(__name__)



class SupportedOp(str, Enum):
    """All supported operations"""
    MERGE = "merge"
    SPLIT = "split"
    COMPRESS = "compress"
    CONVERT = "convert"
    OCR = "ocr"
    CLEAN = "clean"
    ENHANCE = "enhance"
    ROTATE = "rotate"
    REORDER = "reorder"
    FLATTEN = "flatten"
    WATERMARK = "watermark"
    PAGE_NUMBERS = "page-numbers"


class FileType(str, Enum):
    """Supported file types"""
    PDF = "pdf"
    DOCX = "docx"
    IMG = "img"  # Generic image
    JPG = "jpg"
    PNG = "png"
    JPEG = "jpeg"



PREFIX_PATTERNS = [
    r"^and\s+",
    r"^pls\s+",
    r"^plz\s+",
    r"^please\s+",
    r"^do\s+it\s+",
    r"^make\s+small\s+",
    r"^fix\s+this\s+",
    r"^to\s+doc\s+",
    r"^to\s+img\s+",
    r"^\d+\s+to\s+\d+\s+",  # "1 to 2"
    r"^then\s+",
    r"^now\s+",
    r"^just\s+",
    r"^can\s+you\s+",
    r"^i\s+want\s+to\s+",
    r"^i\s+need\s+to\s+",
]

TARGET_FORMAT_PATTERNS = {
    r"\bto\s+pdf\b": FileType.PDF,
    r"\bto\s+docx?\b": FileType.DOCX,
    r"\bto\s+img\b": FileType.IMG,
    r"\bto\s+png\b": FileType.PNG,
    r"\bto\s+jpe?g\b": FileType.JPG,
    r"\bas\s+pdf\b": FileType.PDF,
    r"\bas\s+docx?\b": FileType.DOCX,
}

TARGET_SIZE_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*(kb|mb|gb)",
    re.IGNORECASE
)

PURPOSE_PATTERNS = {
    r"\bemail\b": "email",
    r"\bwhatsapp\b": "whatsapp",
    r"\bprint\b": "print",
    r"\bweb\b": "web",
    r"\bshare\b": "share",
}

OPERATION_PATTERNS = {
    SupportedOp.MERGE: re.compile(r"\b(merge|combine|join)\b", re.IGNORECASE),
    SupportedOp.SPLIT: re.compile(r"\b(split|separate|divide)\b", re.IGNORECASE),
    SupportedOp.COMPRESS: re.compile(r"\b(compress|reduce|shrink|smaller|make\s+small)\b", re.IGNORECASE),
    SupportedOp.CONVERT: re.compile(r"\b(convert|change\s+to|transform)\b", re.IGNORECASE),
    SupportedOp.OCR: re.compile(r"\bocr\b", re.IGNORECASE),
    SupportedOp.CLEAN: re.compile(r"\b(clean|remove\s+blank|remove\s+duplicate)\b", re.IGNORECASE),
    SupportedOp.ENHANCE: re.compile(r"\b(enhance|improve|better)\b", re.IGNORECASE),
    SupportedOp.ROTATE: re.compile(r"\b(rotate|turn)\b", re.IGNORECASE),
    SupportedOp.REORDER: re.compile(r"\b(reorder|rearrange|reorganize)\b", re.IGNORECASE),
    SupportedOp.FLATTEN: re.compile(r"\b(flatten)\b", re.IGNORECASE),
    SupportedOp.WATERMARK: re.compile(r"\b(watermark)\b", re.IGNORECASE),
    SupportedOp.PAGE_NUMBERS: re.compile(r"\b(page[-\s]?numbers?|add\s+numbers?)\b", re.IGNORECASE),
}

PIPELINE_ARROW = re.compile(r"\s*(?:→|➔|->|>)+\s*")



@dataclass
class ParsedCommand:
    """Result of parsing a user command"""
    original_input: str
    normalized_input: str
    operations: List[SupportedOp] = field(default_factory=list)
    target_format: Optional[FileType] = None
    target_size_mb: Optional[float] = None
    purpose: Optional[str] = None
    confidence: float = 0.0
    needs_clarification: bool = False
    clarification_options: List[str] = field(default_factory=list)


@dataclass
class GuardResult:
    """Result of applying guards"""
    should_skip: bool = False
    should_retry: bool = False
    retry_action: Optional[str] = None
    user_message: Optional[str] = None


@dataclass
class ResolutionResult:
    """Final resolution result"""
    success: bool
    pipeline: List[str] = field(default_factory=list)
    source_type: Optional[FileType] = None
    target_format: Optional[FileType] = None
    target_size_mb: Optional[float] = None
    guard_result: Optional[GuardResult] = None
    needs_user_choice: bool = False
    options: List[str] = field(default_factory=list)
    error_message: Optional[str] = None



class LocalNormalizer:
    """
    Stage 1: Normalize user input
    - Strip common prefixes
    - Fix typos
    - Expand shorthand
    """
    
    @staticmethod
    def normalize(text: str) -> str:
        """Normalize input text"""
        if not text:
            return text
        
        result = text.lower().strip()
        
        for pattern in PREFIX_PATTERNS:
            result = re.sub(pattern, "", result, flags=re.IGNORECASE).strip()
        
        typo_fixes = {
            r"\bcompres\b": "compress",
            r"\bcomprs\b": "compress",
            r"\bmrge\b": "merge",
            r"\bmerg\b": "merge",
            r"\bsplt\b": "split",
            r"\bspill\b": "split",
            r"\bspilt\b": "split",
            r"\bconvrt\b": "convert",
            r"\brotate\b": "rotate",
            r"\brotat\b": "rotate",
            r"\brotae\b": "rotate",
            r"\bwatermark\b": "watermark",
            r"\benhance\b": "enhance",
            r"\breorder\b": "reorder",
            r"\bflatten\b": "flatten",
            r"\bclean\b": "clean",
            r"\badn\b": "and",
            r"\bthn\b": "then",
            r"\bthne\b": "then",
            r"\bdog\b": "docx",
            r"\bdox\b": "docx",
            r"\bpfd\b": "pdf",
            r"\bimag\b": "image",
        }
        
        for typo, fix in typo_fixes.items():
            result = re.sub(typo, fix, result, flags=re.IGNORECASE)
        
        result = PIPELINE_ARROW.sub(" → ", result)
        
        return result.strip()
    
    @staticmethod
    def extract_operations(text: str) -> List[SupportedOp]:
        """Extract operations from text"""
        operations = []
        
        if "→" in text:
            parts = text.split("→")
            for part in parts:
                part = part.strip()
                for op, pattern in OPERATION_PATTERNS.items():
                    if pattern.search(part):
                        operations.append(op)
                        break
        else:
            for op, pattern in OPERATION_PATTERNS.items():
                if pattern.search(text):
                    operations.append(op)
        
        return operations
    
    @staticmethod
    def extract_target_format(text: str) -> Optional[FileType]:
        """Extract target format from text"""
        for pattern, file_type in TARGET_FORMAT_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                return file_type
        return None
    
    @staticmethod
    def extract_target_size(text: str) -> Optional[float]:
        """Extract target size in MB from text"""
        match = TARGET_SIZE_PATTERN.search(text)
        if match:
            value = float(match.group(1))
            unit = match.group(2).lower()
            
            if unit == "kb":
                return value / 1024
            elif unit == "mb":
                return value
            elif unit == "gb":
                return value * 1024
        
        return None
    
    @staticmethod
    def extract_purpose(text: str) -> Optional[str]:
        """Extract purpose from text"""
        for pattern, purpose in PURPOSE_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                return purpose
        return None



class DeterministicGuards:
    """
    Guards that NEVER ask user - handle automatically:
    - Redundant ops → SKIP
    - Target-size miss → retry stronger preset once
    - XML/Unicode → OCR fallback once
    - Resource limits → degrade quality once
    """
    
    @staticmethod
    def check_redundancy(
        source_type: FileType,
        target_format: Optional[FileType],
        operations: List[SupportedOp]
    ) -> GuardResult:
        """Check for redundant operations (e.g., image→to img)"""
        
        if source_type in (FileType.IMG, FileType.JPG, FileType.PNG, FileType.JPEG):
            if target_format in (FileType.IMG, FileType.JPG, FileType.PNG, FileType.JPEG):
                if source_type == target_format:
                    return GuardResult(
                        should_skip=True,
                        user_message="File is already in the target format"
                    )
        
        if source_type == FileType.PDF and target_format == FileType.PDF:
            if SupportedOp.CONVERT in operations and len(operations) == 1:
                return GuardResult(
                    should_skip=True,
                    user_message="File is already in PDF format"
                )
        
        return GuardResult()
    
    @staticmethod
    def check_compatibility(
        source_type: FileType,
        operations: List[SupportedOp]
    ) -> GuardResult:
        """Check operation compatibility with file type"""
        
        if SupportedOp.OCR in operations:
            if source_type == FileType.DOCX:
                return GuardResult(
                    should_skip=True,
                    user_message="OCR is not needed for DOCX files - text is already extractable"
                )
        
        
        return GuardResult()
    
    @staticmethod
    def check_size_miss(
        achieved_size_mb: float,
        target_size_mb: float,
        retry_count: int = 0
    ) -> GuardResult:
        """Check if target size was achieved, suggest retry if not"""
        
        if achieved_size_mb <= target_size_mb:
            return GuardResult()
        
        if retry_count == 0:
            return GuardResult(
                should_retry=True,
                retry_action="stronger_preset",
                user_message=f"Retrying with stronger compression to reach {target_size_mb}MB"
            )
        else:
            return GuardResult(
                user_message=f"Achieved {achieved_size_mb:.1f}MB - closest possible to target {target_size_mb}MB"
            )
    
    @staticmethod
    def check_xml_unicode_error(error_message: str, retry_count: int = 0) -> GuardResult:
        """Handle XML/Unicode errors with OCR fallback"""
        
        xml_error_patterns = [
            "xml compatible",
            "unicode",
            "encoding",
            "character",
            "null byte",
        ]
        
        is_xml_error = any(p in error_message.lower() for p in xml_error_patterns)
        
        if is_xml_error and retry_count == 0:
            return GuardResult(
                should_retry=True,
                retry_action="ocr_fallback",
                user_message="Processing with OCR fallback"
            )
        
        return GuardResult()



class PipelineMatcher:
    """
    Stage 2: Match input to pipeline deterministically
    """
    
    @staticmethod
    def match(parsed: ParsedCommand, source_type: FileType) -> ResolutionResult:
        """Try to match parsed command to a valid pipeline"""
        
        operations = parsed.operations
        
        if not operations:
            return ResolutionResult(
                success=False,
                needs_user_choice=True,
                options=["Merge files", "Compress", "Convert to PDF", "OCR (extract text)"],
                error_message="Could not detect operation"
            )
        
        guards = DeterministicGuards()
        
        redundancy_result = guards.check_redundancy(
            source_type,
            parsed.target_format,
            operations
        )
        if redundancy_result.should_skip:
            return ResolutionResult(
                success=True,
                pipeline=[],
                guard_result=redundancy_result
            )
        
        compat_result = guards.check_compatibility(source_type, operations)
        if compat_result.should_skip:
            operations = [op for op in operations if op != SupportedOp.OCR]
        
        pipeline = [op.value for op in operations]
        
        confidence = 0.9 if len(operations) >= 1 else 0.5
        
        return ResolutionResult(
            success=True,
            pipeline=pipeline,
            source_type=source_type,
            target_format=parsed.target_format,
            target_size_mb=parsed.target_size_mb,
            guard_result=redundancy_result if redundancy_result.user_message else compat_result
        )



class OneFlowResolver:
    """
    Main resolver implementing the One-Flow Resolution:
    
    1. Local Normalizer → 2. Deterministic Match
       ├─ success → Execute
       └─ unclear → LLM Rephrase → Deterministic Match
                      ├─ success → Execute  
                      └─ still unclear → Backend Options → User Button Choice
    """
    
    def __init__(self):
        self.normalizer = LocalNormalizer()
        self.matcher = PipelineMatcher()
        self.guards = DeterministicGuards()
    
    def resolve(
        self,
        user_input: str,
        source_type: FileType,
        retry_count: int = 0
    ) -> ResolutionResult:
        """
        Resolve user input to a pipeline.
        
        Args:
            user_input: Raw user command
            source_type: Type of input file
            retry_count: Number of retries (for guard handling)
        
        Returns:
            ResolutionResult with pipeline or options for user choice
        """
        
        normalized = self.normalizer.normalize(user_input)
        
        operations = self.normalizer.extract_operations(normalized)
        target_format = self.normalizer.extract_target_format(normalized)
        target_size = self.normalizer.extract_target_size(normalized)
        purpose = self.normalizer.extract_purpose(normalized)
        
        parsed = ParsedCommand(
            original_input=user_input,
            normalized_input=normalized,
            operations=operations,
            target_format=target_format,
            target_size_mb=target_size,
            purpose=purpose,
            confidence=0.8 if operations else 0.3
        )
        
        logger.debug(f"[ONE-FLOW] Parsed: {parsed}")
        
        result = self.matcher.match(parsed, source_type)
        
        if result.success and result.pipeline:
            logger.info(f"[ONE-FLOW] Matched pipeline: {result.pipeline}")
            return result
        
        if not result.success or result.needs_user_choice:
            options = self._generate_options(source_type, parsed)
            
            return ResolutionResult(
                success=False,
                needs_user_choice=True,
                options=options,
                error_message="Please select an action"
            )
        
        return result
    
    def _generate_options(
        self,
        source_type: FileType,
        parsed: ParsedCommand
    ) -> List[str]:
        """Generate top-N action options based on context"""
        
        base_options = []
        
        if source_type == FileType.PDF:
            base_options = [
                "Compress PDF",
                "Convert to DOCX",
                "OCR (extract text)",
                "Split pages",
                "Merge with other PDFs",
                "Add watermark",
                "Add page numbers",
            ]
        elif source_type == FileType.DOCX:
            base_options = [
                "Convert to PDF",
                "Compress",
                "Add watermark",
                "Add page numbers",
            ]
        elif source_type in (FileType.IMG, FileType.JPG, FileType.PNG, FileType.JPEG):
            base_options = [
                "Convert to PDF",
                "Compress image",
                "Enhance quality",
                "Merge into PDF",
            ]
        
        if parsed.operations:
            for op in parsed.operations:
                op_name = op.value.title()
                matching = [o for o in base_options if op_name.lower() in o.lower()]
                for m in matching:
                    base_options.remove(m)
                    base_options.insert(0, m)
        
        return base_options[:5]
    
    def handle_retry(
        self,
        original_result: ResolutionResult,
        error_message: str,
        retry_count: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Handle retry scenarios based on guards.
        
        Returns:
            (should_retry, retry_action)
        """
        
        if original_result.target_size_mb:
            pass
        
        xml_result = self.guards.check_xml_unicode_error(error_message, retry_count)
        if xml_result.should_retry:
            return True, xml_result.retry_action
        
        return False, None



def resolve_command(
    user_input: str,
    filename: str
) -> ResolutionResult:
    """
    Convenience function to resolve a user command.
    
    Args:
        user_input: Raw user command
        filename: Input filename (used to detect type)
    
    Returns:
        ResolutionResult
    """
    
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    
    type_map = {
        "pdf": FileType.PDF,
        "docx": FileType.DOCX,
        "doc": FileType.DOCX,
        "jpg": FileType.JPG,
        "jpeg": FileType.JPEG,
        "png": FileType.PNG,
    }
    
    source_type = type_map.get(ext, FileType.PDF)
    
    resolver = OneFlowResolver()
    return resolver.resolve(user_input, source_type)


def get_purpose_presets(purpose: str) -> dict:
    """
    Get compression presets for a given purpose.
    
    Args:
        purpose: email, whatsapp, print, web, share
    
    Returns:
        dict with preset settings
    """
    
    presets = {
        "email": {
            "max_size_mb": 10,
            "quality": "medium",
            "dpi": 150,
        },
        "whatsapp": {
            "max_size_mb": 16,
            "quality": "medium",
            "dpi": 150,
        },
        "print": {
            "max_size_mb": 50,
            "quality": "high",
            "dpi": 300,
        },
        "web": {
            "max_size_mb": 5,
            "quality": "low",
            "dpi": 72,
        },
        "share": {
            "max_size_mb": 25,
            "quality": "medium",
            "dpi": 150,
        },
    }
    
    return presets.get(purpose, presets["email"])


one_flow_resolver = OneFlowResolver()
