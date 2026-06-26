from functools import wraps
from flask_jwt_extended import verify_jwt_in_request
from flask import jsonify

def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
        except Exception as e:
            return jsonify({'message': 'Authentication required', 'error': str(e)}), 401
        return fn(*args, **kwargs)
    return wrapper
