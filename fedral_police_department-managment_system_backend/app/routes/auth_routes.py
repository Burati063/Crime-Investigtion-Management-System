from flask import Blueprint, request, jsonify, current_app
from ..services.auth_service import AuthService
from ..models.user import RANKS
from ..utils.jwt_utils import generate_access_token

from ..middleware.auth_required import auth_required
from ..middleware.role_required import role_required


auth_bp = Blueprint('auth', __name__)

@auth_bp.post('/register')
@auth_required
@role_required('admin')
def register():
    """Register a new user and immediately issue an access token."""
    current_app.logger.info('[auth] register: request received')
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    username = data.get('username')
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    rank = data.get('rank')
    current_app.logger.info('[auth] register: validating email=%s username=%s rank=%s', str(email), str(username), str(rank))
    missing = [k for k,v in {
        'email': email,
        'password': password,
        'username': username,
        'first_name': first_name,
        'last_name': last_name,
        'rank': rank,
    }.items() if not v]
    if missing:
        return jsonify({'message': f"missing fields: {', '.join(missing)}"}), 400
    if rank not in RANKS:
        return jsonify({'message': 'invalid rank'}), 400
    try:
        user = AuthService.register(email, password, username, first_name, last_name, rank)
        claims = {'role': user.role.name if user.role else 'user'}
        token = generate_access_token(identity=str(user.id), additional_claims=claims)
        current_app.logger.info('[auth] register: user created id=%d email=%s', user.id, user.email)
        return jsonify({'access_token': token, 'user': {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'rank': user.rank,
        }}), 201

        
    except ValueError as e:
        return jsonify({'message': str(e)}), 400

@auth_bp.post('/login')
def login():
    print('[STEP] login: request received')
    current_app.logger.info('[auth] login: request received')
    print('[STEP] login: parsing request data')
    data = request.get_json() or {}
    identifier = data.get('identifier') or data.get('email') or data.get('username')
    password = data.get('password')
    print(f'[STEP] login: identifier={identifier}, password received={bool(password)}')
    current_app.logger.info('[auth] login: attempting identifier=%s', str(identifier))
    if not identifier or not password:
        print('[STEP] login: missing identifier or password')
        return jsonify({'message': 'identifier (email or username) and password required'}), 400
    try:
        print('[STEP] login: calling AuthService.login')
        token, user, role = AuthService.login(identifier, password)
        print(f'[STEP] login: AuthService.login success user_id={user.id} email={user.email} role={role}')
        current_app.logger.info('[auth] login: success user_id=%d email=%s role=%s', user.id, user.email, role)
        print('[STEP] login: preparing response')
        return jsonify({
            'access_token': token,
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'rank': user.rank,
                'role': role,
                'status': getattr(user, 'status', None),
                'token': token
            }
        }), 200
    except ValueError as e:
        print(f'[STEP] login: AuthService.login failed: {str(e)}')
        current_app.logger.warning('[auth] login: auth error: %s', str(e))
        return jsonify({'message': str(e)}), 401
