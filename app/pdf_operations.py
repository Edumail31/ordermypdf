"""
PDF Operations - Core file processing functions.

These functions execute the operations parsed by the AI.
They handle actual file manipulation safely.
"""

import os
from pathlib import Path
from typing import List

from pypdf import PdfReader, PdfWriter
from pdf2docx import Converter
import subprocess
import math


# ============================================
# HELPER FUNCTIONS
# ============================================

def ensure_temp_dirs():
    """Create temporary directories if they don't exist"""
    Path("uploads").mkdir(exist_ok=True)
    Path("outputs").mkdir(exist_ok=True)


def get_upload_path(filename: str) -> str:
    """Get full path for uploaded file"""
    return os.path.join("uploads", filename)


def get_output_path(filename: str) -> str:
    """Get full path for output file"""
    return os.path.join("outputs", filename)


# ============================================
# PDF OPERATIONS
# ============================================

def merge_pdfs(file_names: List[str], output_name: str = "merged_output.pdf") -> str:
    """
    Merge multiple PDFs into a single file.
    
    Args:
        file_names: List of PDF file names to merge (in order)
        output_name: Name for the output file
    
    Returns:
        str: Output file name
    
    Raises:
        FileNotFoundError: If any input file doesn't exist
        Exception: If merge fails
    """
    ensure_temp_dirs()
    
    pdf_writer = PdfWriter()
    
    # Add all pages from all PDFs
    for file_name in file_names:
        input_path = get_upload_path(file_name)
        
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"File not found: {file_name}")
        
        pdf_reader = PdfReader(input_path)
        for page in pdf_reader.pages:
            pdf_writer.add_page(page)
    
    # Write merged PDF
    output_path = get_output_path(output_name)
    with open(output_path, "wb") as output_file:
        pdf_writer.write(output_file)
    
    return output_name


def split_pdf(file_name: str, pages_to_keep: List[int], output_name: str = "split_output.pdf") -> str:
    """
    Extract specific pages from a PDF.
    
    Args:
        file_name: Source PDF file name
        pages_to_keep: List of page numbers to keep (1-indexed)
        output_name: Name for the output file
    
    Returns:
        str: Output file name
    
    Raises:
        FileNotFoundError: If input file doesn't exist
        ValueError: If page numbers are invalid
        Exception: If split fails
    """
    ensure_temp_dirs()
    
    input_path = get_upload_path(file_name)
    
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"File not found: {file_name}")
    
    pdf_reader = PdfReader(input_path)
    total_pages = len(pdf_reader.pages)
    
    # Validate page numbers
    for page_num in pages_to_keep:
        if page_num < 1 or page_num > total_pages:
            raise ValueError(f"Invalid page number: {page_num}. PDF has {total_pages} pages.")
    
    pdf_writer = PdfWriter()
    
    # Add requested pages (convert 1-indexed to 0-indexed)
    for page_num in pages_to_keep:
        pdf_writer.add_page(pdf_reader.pages[page_num - 1])
    
    # Write output PDF
    output_path = get_output_path(output_name)
    with open(output_path, "wb") as output_file:
        pdf_writer.write(output_file)
    
    return output_name


def delete_pages(file_name: str, pages_to_delete: List[int], output_name: str = "deleted_output.pdf") -> str:
    """
    Remove specific pages from a PDF.
    
    Args:
        file_name: Source PDF file name
        pages_to_delete: List of page numbers to delete (1-indexed)
        output_name: Name for the output file
    
    Returns:
        str: Output file name
    
    Raises:
        FileNotFoundError: If input file doesn't exist
        ValueError: If page numbers are invalid
        Exception: If deletion fails
    """
    ensure_temp_dirs()
    
    input_path = get_upload_path(file_name)
    
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"File not found: {file_name}")
    
    pdf_reader = PdfReader(input_path)
    total_pages = len(pdf_reader.pages)
    
    # Validate page numbers
    for page_num in pages_to_delete:
        if page_num < 1 or page_num > total_pages:
            raise ValueError(f"Invalid page number: {page_num}. PDF has {total_pages} pages.")
    
    pdf_writer = PdfWriter()
    
    # Add all pages EXCEPT the ones to delete
    pages_to_delete_set = set(pages_to_delete)
    for page_num in range(1, total_pages + 1):
        if page_num not in pages_to_delete_set:
            pdf_writer.add_page(pdf_reader.pages[page_num - 1])
    
    # Write output PDF
    output_path = get_output_path(output_name)
    with open(output_path, "wb") as output_file:
        pdf_writer.write(output_file)
    
    return output_name


def compress_pdf(file_name: str, output_name: str = "compressed_output.pdf") -> str:
    """
    Compress a PDF by removing redundancies and compressing content streams.
    
    Note: PyPDF provides basic compression. For advanced compression,
    Ghostscript integration would be needed (not implemented in this MVP).
    
    Args:
        file_name: Source PDF file name
        output_name: Name for the output file
    
    Returns:
        str: Output file name
    
    Raises:
        FileNotFoundError: If input file doesn't exist
        Exception: If compression fails
    """
    ensure_temp_dirs()
    
    input_path = get_upload_path(file_name)
    
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"File not found: {file_name}")
    
    pdf_reader = PdfReader(input_path)
    pdf_writer = PdfWriter()
    
    # Add all pages
    for page in pdf_reader.pages:
        pdf_writer.add_page(page)
    
    # Apply compression
    for page in pdf_writer.pages:
        page.compress_content_streams()  # Basic compression
    
    # Write compressed PDF
    output_path = get_output_path(output_name)
    with open(output_path, "wb") as output_file:
        pdf_writer.write(output_file)
    

    return output_name


# ============================================
# PDF TO DOCX CONVERSION (EXPERIMENTAL)
# ============================================
def pdf_to_docx(file_name: str, output_name: str = "converted_output.docx") -> str:
    """
    Convert a PDF file to DOCX format using pdf2docx.
    Args:
        file_name: Source PDF file name
        output_name: Name for the output DOCX file
    Returns:
        str: Output DOCX file name
    Raises:
        FileNotFoundError: If input file doesn't exist
        Exception: If conversion fails
    """
    ensure_temp_dirs()
    input_path = get_upload_path(file_name)
    output_path = get_output_path(output_name)
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"File not found: {file_name}")
    try:
        cv = Converter(input_path)
        cv.convert(output_path, start=0, end=None)
        cv.close()
    except Exception as e:
        raise Exception(f"PDF to DOCX conversion failed: {e}")
    return output_name


# ============================================
# COMPRESS TO TARGET SIZE (EXPERIMENTAL)
# ============================================
def compress_pdf_to_target(file_name: str, target_mb: int, output_name: str = "compressed_target_output.pdf") -> str:
    """
    Compress a PDF to a target size (in MB) using Ghostscript.
    Args:
        file_name: Source PDF file name
        target_mb: Target size in MB
        output_name: Name for the output file
    Returns:
        str: Output file name
    Raises:
        FileNotFoundError: If input file doesn't exist
        Exception: If compression fails or target not reached
    """
    ensure_temp_dirs()
    input_path = get_upload_path(file_name)
    output_path = get_output_path(output_name)
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"File not found: {file_name}")
    
    # Find Ghostscript executable
    gs_executable = None
    if os.name == "nt":  # Windows
        possible_paths = [
            "gswin64c.exe",
            r"C:\Program Files\gs\gs10.06.0\bin\gswin64c.exe",
            r"C:\Program Files (x86)\gs\gs10.06.0\bin\gswin64c.exe",
            r"C:\Program Files\gs\gs10.05.0\bin\gswin64c.exe",
            r"C:\Program Files\gs\gs9.56.1\bin\gswin64c.exe",
        ]
        for path in possible_paths:
            if os.path.exists(path):
                gs_executable = path
                break
        if not gs_executable:
            raise Exception("Ghostscript not found. Please install Ghostscript from https://ghostscript.com/download/gsdnld.html")
    else:  # Linux/Mac
        gs_executable = "gs"
    
    # Try different quality settings until under target
    qualities = ["screen", "ebook", "printer", "prepress"]
    for quality in qualities:
        try:
            subprocess.run([
                gs_executable,
                "-sDEVICE=pdfwrite",
                f"-dPDFSETTINGS=/{quality}",
                "-dNOPAUSE",
                "-dBATCH",
                "-dQUIET",
                f"-sOutputFile={output_path}",
                input_path
            ], check=True)
            size_mb = os.path.getsize(output_path) / (1024 * 1024)
            if size_mb <= target_mb:
                return output_name
        except Exception as e:
            continue
    # If not under target, try to compress further by downsampling
    # (Not implemented: advanced iterative compression)
    raise Exception(f"Could not compress {file_name} under {target_mb} MB with available settings.")
