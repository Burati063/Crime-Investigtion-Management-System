from __future__ import annotations

import json
from typing import List

from ..extensions import db


class Department(db.Model):
    __tablename__ = 'departments'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    _crimes = db.Column('crimes', db.Text, nullable=True)  # JSON-encoded list
    is_active = db.Column(db.Boolean, nullable=False, default=True, server_default='1')

    # Property for crimes to expose as Python list while persisting as JSON text
    @property
    def crimes(self) -> List[str]:
        if not self._crimes:
            return []
        try:
            data = json.loads(self._crimes)
            # Ensure list of strings
            if isinstance(data, list):
                return [str(x) for x in data]
            return []
        except json.JSONDecodeError:
            return []

    @crimes.setter
    def crimes(self, value: List[str] | None) -> None:
        if not value:
            self._crimes = json.dumps([])
        elif isinstance(value, list):
            # Normalize trimming and non-empty strings
            cleaned = [str(x).strip() for x in value if str(x).strip()]
            self._crimes = json.dumps(cleaned, ensure_ascii=False)
        else:
            raise ValueError('crimes must be a list of strings')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'crimes': self.crimes,
            'isActive': bool(self.is_active),
        }

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<Department {self.name}>"
