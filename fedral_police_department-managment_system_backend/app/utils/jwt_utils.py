from flask_jwt_extended import create_access_token
from datetime import timedelta

def generate_access_token(identity: str, additional_claims: dict | None = None, minutes: int = 30):
    expires_delta = timedelta(minutes=minutes)
    return create_access_token(identity=identity, additional_claims=additional_claims or {}, expires_delta=expires_delta)
