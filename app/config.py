"""
Configuration management using pydantic-settings.
Reads from .env file and environment variables.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration"""
    
    groq_api_key: str = "test-key-configure-in-env"
    llm_model: str = "llama-3.1-8b-instant"  # Primary: fast, high limits
    llm_model_fallback: str = "llama-3.3-70b-versatile"  # Fallback: more capable

    enable_llm_rephrase: bool = True

    baseten_api_key: str | None = None
    baseten_base_url: str = "https://inference.baseten.co/v1"
    baseten_model: str = "openai/gpt-oss-120b"
    baseten_timeout_seconds: float = 12.0

    llm_model_rephrase_third: str | None = None
    
    host: str = "0.0.0.0"
    port: int = 8000
    
    max_file_size_mb: int = 100
    max_files_per_request: int = 5
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )


settings = Settings()
