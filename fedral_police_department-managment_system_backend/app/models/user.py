from datetime import datetime
from ..extensions import db, bcrypt

# Define allowed police ranks as a DB Enum for integrity
RANKS = (
    "Constable",
    "Assistant Sergeant",
    "Deputy Sergeant",
    "Sergeant",
    "Chief Sergeant",
    "Assistant Inspector",
    "Deputy Inspector",
    "Inspector",
    "Chief Inspector",
    "Deputy Commander",
    "Commander",
    "Assistant Commissioner",
    "Deputy Commissioner",
    "Commissioner",
    "Deputy Commissioner General",
    "Commissioner General",
)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    rank = db.Column(db.Enum(*RANKS, name='rank_enum'), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    status = db.Column(db.String(32), nullable=False, default='inactive', server_default='inactive')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True, default=None)
    department = db.relationship('Department', backref='users')
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'))
    role = db.relationship('Role', back_populates='users')

    def set_password(self, password: str):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password: str) -> bool:
        return bcrypt.check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.email}>"

    def to_public_dict(self) -> dict:
        """Return user data excluding id, password hash, and role_id; include role name and department name."""
        return {
            'id':self.id,
            'email': self.email,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'rank': self.rank,
            'status': self.status,
            'created_at': (self.created_at.isoformat() if self.created_at else None),
            'role': (self.role.name if getattr(self, 'role', None) else None),
            'department': (self.department.name if getattr(self, 'department', None) else None),
        }
