"""
Pydantic models for request/response validation and AI intent parsing.
"""

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


# ============================================
# API REQUEST / RESPONSE MODELS
# ============================================

class ProcessRequest(BaseModel):
    """User's request to process PDFs"""
    prompt: str = Field(..., description="Natural language instruction")
    file_names: List[str] = Field(..., description="List of uploaded PDF file names")


class ProcessResponse(BaseModel):
    """Response after processing PDFs or requesting clarification"""
    status: Literal["success", "error"]
    operation: Optional[str] = None
    output_file: Optional[str] = None
    message: str


# ============================================
# AI INTENT PARSING MODELS
# ============================================

class MergeIntent(BaseModel):
    """Intent to merge multiple PDFs"""
    operation: Literal["merge"] = "merge"
    files: List[str] = Field(..., description="Files to merge in order")


class SplitIntent(BaseModel):
    """Intent to split/extract pages from PDF"""
    operation: Literal["split"] = "split"
    file: str = Field(..., description="Source PDF file")
    pages: List[int] = Field(..., description="Page numbers to keep (1-indexed)")


class DeleteIntent(BaseModel):
    """Intent to delete specific pages from PDF"""
    operation: Literal["delete"] = "delete"
    file: str = Field(..., description="Source PDF file")
    pages_to_delete: List[int] = Field(..., description="Page numbers to delete (1-indexed)")



class CompressIntent(BaseModel):
    """Intent to compress PDF file size"""
    operation: Literal["compress"] = "compress"
    file: str = Field(..., description="PDF file to compress")

# === New: PDF to DOCX Conversion Intent ===
class DocxConvertIntent(BaseModel):
    """Intent to convert PDF to DOCX"""
    operation: Literal["pdf_to_docx"] = "pdf_to_docx"
    file: str = Field(..., description="PDF file to convert")

# === New: Compress to Target Size Intent ===
class CompressToTargetIntent(BaseModel):
    """Intent to compress PDF to a target size (MB)"""
    operation: Literal["compress_to_target"] = "compress_to_target"
    file: str = Field(..., description="PDF file to compress")
    target_mb: int = Field(..., description="Target size in MB")


class ParsedIntent(BaseModel):
    """
    Structured intent parsed by AI.
    Only one operation type will be populated.
    """
    operation_type: Literal["merge", "split", "delete", "compress", "pdf_to_docx", "compress_to_target"]
    merge: Optional[MergeIntent] = None
    split: Optional[SplitIntent] = None
    delete: Optional[DeleteIntent] = None
    compress: Optional[CompressIntent] = None
    pdf_to_docx: Optional[DocxConvertIntent] = None
    compress_to_target: Optional[CompressToTargetIntent] = None

    def get_operation(self):
        """Get the actual operation intent"""
        if self.operation_type == "merge":
            return self.merge
        elif self.operation_type == "split":
            return self.split
        elif self.operation_type == "delete":
            return self.delete
        elif self.operation_type == "compress":
            return self.compress
        elif self.operation_type == "pdf_to_docx":
            return self.pdf_to_docx
        elif self.operation_type == "compress_to_target":
            return self.compress_to_target
        return None
