from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../../.env"), extra="ignore")

    app_name: str = "Cold Room Temperature Monitoring"
    environment: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_secret_key: str = Field(min_length=24)
    api_allowed_origins: str = "http://localhost:5173"
    api_cookie_secure: bool = False
    api_trusted_proxy_enabled: bool = False
    api_trusted_proxy_cidrs: str = ""
    api_ip_allowlist: str = ""
    api_rate_limit_per_minute: int = 120
    api_login_rate_limit_per_minute: int = 10
    api_dev_fixture_enabled: bool = True
    api_data_provider: str = "excel_fixture"
    api_poll_interval_seconds: int = 60
    api_fixture_excel_path: str | None = None
    api_live_source_url: str | None = None
    api_live_source_token: str | None = None
    api_report_max_rows: int = 250_000
    api_openapi_enabled_in_production: bool = False
    api_bootstrap_admin_email: str | None = None
    api_bootstrap_admin_password: str | None = None
    database_url: str

    @field_validator("api_data_provider")
    @classmethod
    def validate_provider(cls, value: str) -> str:
        if value not in {"excel_fixture", "http_live_api"}:
            raise ValueError("API_DATA_PROVIDER must be excel_fixture or http_live_api")
        return value

    @field_validator("api_secret_key")
    @classmethod
    def reject_placeholder_secret(cls, value: str) -> str:
        if value == "replace-with-a-strong-random-secret":
            raise ValueError("API_SECRET_KEY must be replaced before running the API")
        return value

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.api_allowed_origins.split(",") if origin.strip()]

    @property
    def ip_allowlist(self) -> list[str]:
        return [cidr.strip() for cidr in self.api_ip_allowlist.split(",") if cidr.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
