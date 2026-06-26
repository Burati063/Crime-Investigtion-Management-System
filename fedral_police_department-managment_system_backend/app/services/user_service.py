from ..models.user import User, RANKS
from ..models.role import Role
from ..extensions import db

class UserService:
    @staticmethod
    def create_user(fields: dict) -> User:
        from ..models.role import Role
        from ..models.department import Department
        required = ['email', 'username', 'first_name', 'last_name', 'rank', 'status', 'role', 'password', 'department_id']
        for k in required:
            if k not in fields or not str(fields[k]).strip():
                raise ValueError(f"Missing or empty field: {k}")
        if fields['rank'] not in RANKS:
            raise ValueError('Invalid rank')
        role = Role.query.filter_by(name=fields['role']).first()
        if not role:
            raise ValueError('Invalid role')
        dept = Department.query.get(fields['department_id'])
        if not dept:
            raise ValueError('Invalid department')
        if User.query.filter_by(email=fields['email']).first():
            raise ValueError('Email already exists')
        if User.query.filter_by(username=fields['username']).first():
            raise ValueError('Username already exists')
        user = User(
            email=fields['email'].strip().lower(),
            username=fields['username'].strip(),
            first_name=fields['first_name'].strip(),
            last_name=fields['last_name'].strip(),
            rank=fields['rank'],
            status=fields['status'],
            role=role,
            department=dept
        )
        user.set_password(fields['password'])
        db.session.add(user)
        db.session.commit()
        return user
    @staticmethod
    def get_user(user_id: int) -> User | None:
        return User.query.get(user_id)

    @staticmethod
    def list_users():
        return User.query.all()

    @staticmethod
    def delete_user(user_id: int) -> bool:
        user = User.query.get(user_id)
        if not user:
            return False
        db.session.delete(user)
        db.session.commit()
        return True
    
    # nethod that returns user role by user id
    @staticmethod
    def get_user_role(user_id: int) -> str | None:
        user = User.query.get(user_id)
        if not user or not user.role:
            return None
        return user.role.name

    @staticmethod
    def get_user_by_email(email: str) -> User | None:
        if not email:
            return None
        return User.query.filter_by(email=email.strip().lower()).first()

    @staticmethod
    def update_user(user_id: int, fields: dict) -> User | None:
        user = User.query.get(user_id)
        if not user:
            return None
        # Disallow username and email updates explicitly
        allowed_keys = {'first_name', 'last_name', 'rank', 'status', 'role', 'department_id', 'is_active'}
        fields = {k: v for k, v in (fields or {}).items() if k in allowed_keys}
        if 'department_id' in fields and fields['department_id'] is not None:
            from ..models.department import Department
            dept = Department.query.get(fields['department_id'])
            if not dept:
                raise ValueError('invalid department')
            user.department = dept
        if 'is_active' in fields and fields['is_active'] is not None:
            user.is_active = bool(fields['is_active'])
        if 'first_name' in fields and fields['first_name'] is not None:
            first = str(fields['first_name']).strip()
            if not first:
                raise ValueError('first_name cannot be empty')
            user.first_name = first
        if 'last_name' in fields and fields['last_name'] is not None:
            last = str(fields['last_name']).strip()
            if not last:
                raise ValueError('last_name cannot be empty')
            user.last_name = last
        if 'rank' in fields and fields['rank'] is not None:
            if fields['rank'] not in RANKS:
                raise ValueError('invalid rank')
            user.rank = fields['rank']
        if 'status' in fields and fields['status'] is not None:
            status = str(fields['status']).strip()
            if not status:
                raise ValueError('status cannot be empty')
            user.status = status
        if 'role' in fields and fields['role'] is not None:
            role_name = str(fields['role']).strip()
            if not role_name:
                raise ValueError('role cannot be empty')
            role = Role.query.filter_by(name=role_name).first()
            if not role:
                raise ValueError('invalid role')
            user.role = role
        db.session.commit()
        return user