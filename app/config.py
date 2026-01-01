"""
Configuration management using pydantic-settings.
Reads from .env file and environment variables.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration"""
    
    # AI / LLM Configuration
    groq_api_key: str = "test-key-configure-in-env"
    # Free Groq models (all free, different rate limits):
    # - llama-3.1-8b-instant: HIGHEST free limits, very fast
    # - gemma2-9b-it: Good balance
    # - mixtral-8x7b-32768: 32K context
    # - llama-3.3-70b-versatile: Best quality, lower limits
    llm_model: str = "llama-3.1-8b-instant"
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    
    # File Upload Limits
    max_file_size_mb: int = 100
    max_files_per_request: int = 5
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )


# Global settings instance
settings = Settings()
