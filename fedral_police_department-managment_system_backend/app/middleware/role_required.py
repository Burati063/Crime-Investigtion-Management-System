from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from ..services.user_service import UserService

def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            identity = get_jwt_identity()
            try:
                user_id = int(identity) if identity is not None else None
            except (TypeError, ValueError):
                user_id = None
            if not user_id:
                return jsonify({'message': 'unauthorized: invalid identity'}), 401
            user_role = UserService.get_user_role(user_id)
            if not user_role or user_role not in roles:
                return jsonify({'message': 'access denied: insufficient role'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
