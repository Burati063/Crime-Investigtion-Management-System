from ..models.user import User, RANKS
from ..extensions import db
from ..utils.password_utils import verify_password, hash_password
from ..utils.jwt_utils import generate_access_token

class AuthService:
    @staticmethod
    def register(email: str, password: str, username: str, first_name: str, last_name: str, rank: str):
        if rank not in RANKS:
            raise ValueError('Invalid rank')
        if User.query.filter_by(email=email).first():
            raise ValueError('Email already registered')
        if User.query.filter_by(username=username).first():
            raise ValueError('Username already taken')
        user = User(
            email=email,
            username=username,
            first_name=first_name,
            last_name=last_name,
            rank=rank,
        )
        user.password_hash = hash_password(password)
        db.session.add(user)
        db.session.commit()
        return user

    @staticmethod
    def login(identifier: str, password: str):
        ident = (identifier or '').strip()
        if not ident:
            raise ValueError('Invalid credentials')
        user = None
        # Heuristic: if it looks like an email, try email first; otherwise try username first
        if '@' in ident:
            user = User.query.filter_by(email=ident).first()
            if not user:
                user = User.query.filter_by(username=ident).first()
        else:
            user = User.query.filter_by(username=ident).first()
            if not user:
                user = User.query.filter_by(email=ident).first()
        if not user or not verify_password(password, user.password_hash):
            raise ValueError('Invalid credentials')
        claims = {'role': user.role.name if user.role else 'user'}
        role = claims['role']
        token = generate_access_token(identity=str(user.id), additional_claims=claims)
        return token, user, role
