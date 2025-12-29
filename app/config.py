"""
Configuration management using pydantic-settings.
Reads from .env file and environment variables.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration"""
    
    # AI / LLM Configuration
    groq_api_key: str
    llm_model: str = "llama-3.1-70b-versatile"
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    
    # File Upload Limits
    max_file_size_mb: int = 10
    max_files_per_request: int = 5
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )


# Global settings instance
settings = Settings()
