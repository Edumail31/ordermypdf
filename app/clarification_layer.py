"""
AI Clarification Layer - Handles ambiguous or incomplete user prompts by interacting with the user for clarification.
"""

from app.ai_parser import ai_parser
from app.models import ParsedIntent

class ClarificationResult:
    def __init__(self, intent: ParsedIntent = None, clarification: str = None):
        self.intent = intent
        self.clarification = clarification


import re
import os
from app.models import ParsedIntent, CompressToTargetIntent
from app.pdf_operations import get_upload_path

def clarify_intent(user_prompt: str, file_names: list[str]) -> ClarificationResult:
    """
    Try to parse the user's intent. If ambiguous, handle 'compress by X%' automatically.
    """
    try:
        intent = ai_parser.parse_intent(user_prompt, file_names)
        return ClarificationResult(intent=intent)
    except ValueError as e:
        # Try to detect 'compress by X%' pattern
        percent_match = re.search(r"compress( this)?( pdf)? by (\d{1,3})%", user_prompt, re.IGNORECASE)
        if percent_match and file_names:
            percent = int(percent_match.group(3))
            file_name = file_names[0]  # Only support single file for now
            file_path = get_upload_path(file_name)
            if os.path.exists(file_path):
                size_bytes = os.path.getsize(file_path)
                size_mb = size_bytes / (1024 * 1024)
                target_mb = max(1, int(size_mb * (percent / 100)))
                compress_intent = ParsedIntent(
                    operation_type="compress_to_target",
                    compress_to_target=CompressToTargetIntent(
                        operation="compress_to_target",
                        file=file_name,
                        target_mb=target_mb
                    )
                )
                return ClarificationResult(intent=compress_intent)
        # If not detected, ask for clarification
        clarification = (
            "Sorry, I couldn't understand your request. Could you please clarify what you want to do with your PDF(s)? "
            "For example: 'compress to 2MB', 'compress by 50%', 'merge these files', 'delete pages 2, 3', etc."
        )
        return ClarificationResult(clarification=clarification)
