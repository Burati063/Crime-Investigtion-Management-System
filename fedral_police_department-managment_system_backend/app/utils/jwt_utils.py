from flask_jwt_extended import create_access_token
from datetime import timedelta


def generate_access_token(
    identity: str,
    additional_claims: dict | None = None,
    minutes: int | None = None,
) -> str:
    """Create a JWT access token.

    If *minutes* is provided the token expires after that many minutes.
    Otherwise the expiry is taken from the Flask config value
    JWT_ACCESS_TOKEN_EXPIRES (set via JWT_EXPIRES_MINUTES in config.py),
    which defaults to 7000 minutes (~4.8 days).
    """
    expires_delta = timedelta(minutes=minutes) if minutes is not None else None
    return create_access_token(
        identity=identity,
        additional_claims=additional_claims or {},
        expires_delta=expires_delta,  # None → use JWT_ACCESS_TOKEN_EXPIRES from config
    )
