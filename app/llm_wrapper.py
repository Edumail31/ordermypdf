"""
LLM Wrapper - Robust LLM call handling with fallbacks and error recovery.

This module ensures that LLM calls never crash the system:
1. Validates API key before making calls
2. Implements retry logic with exponential backoff
3. Falls back to secondary models on failure
4. Returns safe defaults when all else fails

USAGE:
    from app.llm_wrapper import safe_llm_call, LLMResponse
    
    response = safe_llm_call(
        messages=[{"role": "user", "content": "Hello"}],
        purpose="analysis"  # or "parsing", "clarification", etc.
    )
    
    if response.success:
        print(response.content)
    else:
        print(f"Failed: {response.error}")
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, List, Dict, Any
import time
import traceback

from app.config import settings


@dataclass
class LLMResponse:
    """Safe container for LLM responses"""
    success: bool
    content: str
    model_used: Optional[str] = None
    error: Optional[str] = None
    raw_response: Optional[Any] = None


def _is_api_key_valid() -> bool:
    """Check if Groq API key is configured and looks valid"""
    key = getattr(settings, 'groq_api_key', None)
    if not key:
        return False
    if key == "test-key-configure-in-env":
        return False
    if len(key) < 20:  # Groq keys are typically longer
        return False
    return True


def _get_groq_client():
    """Lazy import and create Groq client"""
    try:
        from groq import Groq
        return Groq(api_key=settings.groq_api_key)
    except ImportError:
        print("[LLM] ERROR: groq package not installed")
        return None
    except Exception as e:
        print(f"[LLM] ERROR creating Groq client: {e}")
        return None


def safe_llm_call(
    messages: List[Dict[str, str]],
    purpose: str = "general",
    temperature: float = 0.3,
    max_tokens: int = 1000,
    json_mode: bool = False,
    max_retries: int = 2,
    fallback_response: Optional[str] = None,
) -> LLMResponse:
    """
    Make a safe LLM call with proper error handling and fallbacks.
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        purpose: Description of what this call is for (for logging)
        temperature: Model temperature (0-1)
        max_tokens: Maximum tokens in response
        json_mode: Whether to request JSON output
        max_retries: Number of retry attempts per model
        fallback_response: Default response if all calls fail
    
    Returns:
        LLMResponse with success status and content or error
    """
    
    # Check API key first
    if not _is_api_key_valid():
        error_msg = "Groq API key not configured. Please set GROQ_API_KEY in .env file."
        print(f"[LLM:{purpose}] {error_msg}")
        return LLMResponse(
            success=False,
            content=fallback_response or f"LLM unavailable: {error_msg}",
            error=error_msg
        )
    
    # Get client
    client = _get_groq_client()
    if not client:
        return LLMResponse(
            success=False,
            content=fallback_response or "Could not initialize LLM client",
            error="Groq client initialization failed"
        )
    
    # Models to try in order
    models = [settings.llm_model]
    if hasattr(settings, 'llm_model_fallback') and settings.llm_model_fallback != settings.llm_model:
        models.append(settings.llm_model_fallback)
    
    last_error = None
    
    for model in models:
        for attempt in range(max_retries):
            try:
                print(f"[LLM:{purpose}] Calling {model} (attempt {attempt + 1}/{max_retries})")
                
                kwargs = {
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                }
                
                if json_mode:
                    kwargs["response_format"] = {"type": "json_object"}
                
                response = client.chat.completions.create(**kwargs)
                
                content = response.choices[0].message.content
                if content and content.strip():
                    print(f"[LLM:{purpose}] Success with {model}")
                    return LLMResponse(
                        success=True,
                        content=content.strip(),
                        model_used=model,
                        raw_response=response
                    )
                else:
                    last_error = "Empty response from LLM"
                    print(f"[LLM:{purpose}] Empty response from {model}")
                    
            except Exception as e:
                last_error = str(e)
                print(f"[LLM:{purpose}] Error with {model}: {e}")
                
                # Check for rate limiting
                if "rate" in str(e).lower() or "429" in str(e):
                    wait_time = (attempt + 1) * 2  # Exponential backoff
                    print(f"[LLM:{purpose}] Rate limited, waiting {wait_time}s...")
                    time.sleep(wait_time)
                elif "api_key" in str(e).lower() or "auth" in str(e).lower():
                    # Auth error - no point retrying with same key
                    break
    
    # All attempts failed
    error_msg = f"All LLM calls failed. Last error: {last_error}"
    print(f"[LLM:{purpose}] {error_msg}")
    
    return LLMResponse(
        success=False,
        content=fallback_response or "I couldn't process your request. Please try again.",
        error=error_msg
    )


def check_llm_availability() -> Dict[str, Any]:
    """
    Check if LLM is available and working.
    Returns status dict with details.
    """
    result = {
        "available": False,
        "api_key_configured": _is_api_key_valid(),
        "models": [],
        "error": None
    }
    
    if not result["api_key_configured"]:
        result["error"] = "API key not configured"
        return result
    
    # Try a simple call
    test_response = safe_llm_call(
        messages=[{"role": "user", "content": "Say 'OK' if you can read this."}],
        purpose="health_check",
        max_tokens=10,
        max_retries=1,
        fallback_response=None
    )
    
    if test_response.success:
        result["available"] = True
        result["models"].append(test_response.model_used)
    else:
        result["error"] = test_response.error
    
    return result
