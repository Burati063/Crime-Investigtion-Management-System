import os
from datetime import timedelta
from dotenv import load_dotenv

# Load variables from a .env file if present (does not override existing env)
load_dotenv()

def _normalize_db_url(url: str) -> str:
    """Convert legacy 'postgres://' URLs (e.g., from Heroku) to a valid SQLAlchemy URL.
    Defaults to using the psycopg2 driver when normalizing.
    """
    if not url:
        return url
    if url.startswith('postgres://'):
        # Prefer psycopg2 for broad compatibility; requires psycopg2-binary installed
        return url.replace('postgres://', 'postgresql+psycopg2://', 1)
    return url

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    SQLALCHEMY_DATABASE_URI = _normalize_db_url(os.getenv('DATABASE_URL'))
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.getenv('JWT_EXPIRES_MINUTES', '7000')))
    DEBUG = False
    # Where uploaded entity files are stored
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', os.path.join(os.getcwd(), 'uploads'))


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False
    # Common production toggles can go here
    # e.g., SEND_FILE_MAX_AGE_DEFAULT, SESSION_COOKIE_SECURE, etc.


def get_config_class() -> type:
    env = (os.getenv('APP_ENV') or os.getenv('FLASK_ENV') or 'development').lower()
    if env in ('prod', 'production'):
        return ProductionConfig
    return DevelopmentConfig
