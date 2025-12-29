"""
AI Intent Parser - Uses LLM to convert natural language to structured JSON.

KEY PRINCIPLE: The AI does NOT access files or execute code.
It ONLY parses user intent and outputs JSON instructions.
"""

import json
from groq import Groq
from app.config import settings
from app.models import ParsedIntent


# ============================================
# SYSTEM PROMPT FOR THE LLM
# ============================================

SYSTEM_PROMPT = """You are an intent parser for a PDF processing system. Your ONLY job is to analyze user instructions and output structured JSON.

SUPPORTED OPERATIONS:
1. MERGE: Combine multiple PDFs into one
2. SPLIT: Extract specific pages from a PDF
3. DELETE: Remove specific pages from a PDF
4. COMPRESS: Reduce PDF file size
5. PDF_TO_DOCX: Convert a PDF to DOCX format
6. COMPRESS_TO_TARGET: Compress PDF to a target size (in MB)

CRITICAL RULES:
- You do NOT access files
- You do NOT execute operations
- You ONLY output valid JSON matching the schema
- Page numbers are 1-indexed (first page = 1)
- If the request is ambiguous, make reasonable assumptions
- If the request is impossible, explain in a JSON error format

OUTPUT FORMAT (choose ONE operation type):

For MERGE:
{
  "operation_type": "merge",
  "merge": {
    "operation": "merge",
    "files": ["file1.pdf", "file2.pdf"]
  }
}

For SPLIT (keep specific pages):
{
  "operation_type": "split",
  "split": {
    "operation": "split",
    "file": "document.pdf",
    "pages": [1, 2, 3, 5]
  }
}

For DELETE (remove specific pages):
{
  "operation_type": "delete",
  "delete": {
    "operation": "delete",
    "file": "document.pdf",
    "pages_to_delete": [3, 7, 10]
  }
}

For COMPRESS:
{
  "operation_type": "compress",
  "compress": {
    "operation": "compress",
    "file": "large_file.pdf"
  }
}

For PDF_TO_DOCX:
{
  "operation_type": "pdf_to_docx",
  "pdf_to_docx": {
    "operation": "pdf_to_docx",
    "file": "document.pdf"
  }
}

For COMPRESS_TO_TARGET:
{
  "operation_type": "compress_to_target",
  "compress_to_target": {
    "operation": "compress_to_target",
    "file": "large_file.pdf",
    "target_mb": 14
  }
}

EXAMPLES:

Prompt: "merge all these files"
Files: ["report.pdf", "appendix.pdf"]
Output: {"operation_type": "merge", "merge": {"operation": "merge", "files": ["report.pdf", "appendix.pdf"]}}

Prompt: "keep only the first 5 pages"
Files: ["book.pdf"]
Output: {"operation_type": "split", "split": {"operation": "split", "file": "book.pdf", "pages": [1, 2, 3, 4, 5]}}

Prompt: "remove pages 2, 4, and 6"
Files: ["slides.pdf"]
Output: {"operation_type": "delete", "delete": {"operation": "delete", "file": "slides.pdf", "pages_to_delete": [2, 4, 6]}}

Prompt: "make this smaller"
Files: ["huge.pdf"]
Output: {"operation_type": "compress", "compress": {"operation": "compress", "file": "huge.pdf"}}

Prompt: "convert this to docx"
Files: ["sample.pdf"]
Output: {"operation_type": "pdf_to_docx", "pdf_to_docx": {"operation": "pdf_to_docx", "file": "sample.pdf"}}

Prompt: "compress this under 14MB"
Files: ["big.pdf"]
Output: {"operation_type": "compress_to_target", "compress_to_target": {"operation": "compress_to_target", "file": "big.pdf", "target_mb": 14}}

Now parse the following request and respond with ONLY valid JSON, no explanation:"""


# ============================================
# PARSER IMPLEMENTATION
# ============================================

class AIParser:
    """Parses user intent using Groq LLM"""
    
    def __init__(self):
        self.client = Groq(api_key=settings.groq_api_key)
        self.model = settings.llm_model
    
    def parse_intent(self, user_prompt: str, file_names: list[str]) -> ParsedIntent:
        """
        Convert natural language prompt + file list into structured intent.
        
        Args:
            user_prompt: User's natural language instruction
            file_names: List of uploaded PDF file names
        
        Returns:
            ParsedIntent: Structured operation intent
        
        Raises:
            ValueError: If intent cannot be parsed or is invalid
        """
        # Build the user message
        user_message = f"""
Prompt: "{user_prompt}"
Files: {json.dumps(file_names)}

Parse this into JSON:"""
        
        try:
            # Call Groq API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.1,  # Low temperature for consistent parsing
                max_tokens=500,
                response_format={"type": "json_object"}  # Force JSON output
            )
            
            # Extract JSON response
            raw_json = response.choices[0].message.content
            print(f"🤖 AI Response: {raw_json}")
            parsed_json = json.loads(raw_json)
            
            # Validate against Pydantic model
            intent = ParsedIntent(**parsed_json)
            
            return intent
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON decode error: {e}")
            raise ValueError(f"LLM returned invalid JSON: {e}")
        except Exception as e:
            print(f"❌ Parse error: {type(e).__name__}: {e}")
            raise ValueError(f"Failed to parse intent: {e}")


# Global parser instance
ai_parser = AIParser()
