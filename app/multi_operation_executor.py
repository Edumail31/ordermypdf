"""
Multi-Operation Executor - Handle sequential PDF operations.

Allows users to perform multiple operations in sequence:
- "split pages 1-5 then compress"
- "compress then split pages 1-3"
- "merge all and then compress to 2MB"
"""

from typing import List, Tuple
from app.models import ParsedIntent
from app.pdf_operations import (
    merge_pdfs,
    split_pdf,
    delete_pages,
    compress_pdf,
    pdf_to_docx,
    compress_pdf_to_target,
    get_output_path
)
import os


class OperationChain:
    """Execute a sequence of PDF operations, using output of one as input to next"""
    
    def __init__(self):
        self.current_file = None
        self.operations = []
        self.step_count = 0
    
    def add_operation(self, intent: ParsedIntent):
        """Add an operation to the chain"""
        self.operations.append(intent)
    
    def execute(self, initial_file: str) -> Tuple[str, str]:
        """
        Execute all operations in sequence.
        
        Args:
            initial_file: Starting PDF file name
        
        Returns:
            tuple: (final_output_file, summary_message)
        """
        self.current_file = initial_file
        messages = []
        
        for idx, intent in enumerate(self.operations, 1):
            print(f"\n[CHAIN] Operation {idx}/{len(self.operations)}: {intent.operation_type}")
            
            try:
                if intent.operation_type == "merge":
                    print("[WARN] Skipping merge in operation chain (already working with single file)")
                    continue
                
                elif intent.operation_type == "split":
                    output_name = f"step_{idx}_split.pdf"
                    self.current_file = split_pdf(
                        self.current_file,
                        intent.split.pages,
                        output_name
                    )
                    messages.append(f"✂️  Split to pages {intent.split.pages}")
                
                elif intent.operation_type == "delete":
                    output_name = f"step_{idx}_deleted.pdf"
                    self.current_file = delete_pages(
                        self.current_file,
                        intent.delete.pages_to_delete,
                        output_name
                    )
                    messages.append(f"Deleted pages {intent.delete.pages_to_delete}")
                
                elif intent.operation_type == "compress":
                    output_name = f"step_{idx}_compressed.pdf"
                    self.current_file = compress_pdf(self.current_file, output_name)
                    messages.append("Compressed")
                
                elif intent.operation_type == "compress_to_target":
                    output_name = f"step_{idx}_compressed_target.pdf"
                    self.current_file = compress_pdf_to_target(
                        self.current_file,
                        intent.compress_to_target.target_mb,
                        output_name
                    )
                    messages.append(f"🗜️  Compressed to {intent.compress_to_target.target_mb}MB")
                
                elif intent.operation_type == "pdf_to_docx":
                    output_name = f"step_{idx}_converted.docx"
                    self.current_file = pdf_to_docx(self.current_file, output_name)
                    messages.append("Converted to DOCX")
                
                print(f"[OK] Operation {idx} completed: {self.current_file}")
            
            except Exception as e:
                error_msg = f"[ERR] Operation {idx} ({intent.operation_type}) failed: {str(e)}"
                print(error_msg)
                messages.append(error_msg)
                raise ValueError(error_msg)
        
        summary = " → ".join(messages) if messages else "Processing completed"
        return self.current_file, summary


def execute_operation_chain(
    initial_file: str,
    intents: List[ParsedIntent]
) -> Tuple[str, str]:
    """
    Execute a chain of operations.
    
    Args:
        initial_file: Starting PDF file
        intents: List of ParsedIntent objects to execute in order
    
    Returns:
        tuple: (output_file_name, summary_message)
    """
    if not intents:
        raise ValueError("No operations to execute")
    
    if len(intents) == 1:
        print(f"[CHAIN] Single operation: {intents[0].operation_type}")
        return None, None
    
    print(f"\n[CHAIN] Executing chain of {len(intents)} operations...")
    chain = OperationChain()
    for intent in intents:
        chain.add_operation(intent)
    
    output_file, summary = chain.execute(initial_file)
    return output_file, summary
