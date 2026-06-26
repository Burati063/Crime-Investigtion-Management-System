from __future__ import annotations

from typing import List, Optional

from ..extensions import db
from ..models.department import Department


class DepartmentService:
    @staticmethod
    def create(name: str, description: Optional[str], crimes: Optional[List[str]], is_active: Optional[bool] = True) -> Department:
        if not name or not name.strip():
            raise ValueError('name is required')
        if Department.query.filter_by(name=name.strip()).first():
            raise ValueError('department name already exists')
        dept = Department(name=name.strip(), description=(description or '').strip() or None)
        dept.crimes = crimes or []
        dept.is_active = bool(is_active) if is_active is not None else True
        db.session.add(dept)
        db.session.commit()
        return dept

    @staticmethod
    def list_all() -> list[Department]:
        return Department.query.order_by(Department.name.asc()).all()

    @staticmethod
    def get_by_id(dept_id: int) -> Optional[Department]:
        return Department.query.get(dept_id)

    @staticmethod
    def get_by_name(name: str) -> Optional[Department]:
        if not name:
            return None
        return Department.query.filter(Department.name.ilike(name.strip())).first()

    @staticmethod
    def update(dept: Department, *, name: Optional[str] = None, description: Optional[str] = None,
               crimes: Optional[list[str]] = None, is_active: Optional[bool] = None) -> Department:
        if name is not None:
            new_name = name.strip()
            if not new_name:
                raise ValueError('name cannot be empty')
            # Ensure uniqueness if changing name
            if new_name.lower() != dept.name.lower():
                exists = Department.query.filter(Department.name.ilike(new_name)).first()
                if exists:
                    raise ValueError('department name already exists')
            dept.name = new_name
        if description is not None:
            desc = description.strip()
            dept.description = desc or None
        if crimes is not None:
            if not isinstance(crimes, list):
                raise ValueError('crimes must be a list of strings')
            normalized = []
            for c in crimes:
                if not isinstance(c, str):
                    raise ValueError('crimes must be a list of strings')
                val = c.strip()
                if val:
                    normalized.append(val)
            dept.crimes = normalized
        if is_active is not None:
            dept.is_active = bool(is_active)
        db.session.commit()
        return dept

    @staticmethod
    def delete(dept_id: int) -> bool:
        dept = Department.query.get(dept_id)
        if not dept:
            return False
        db.session.delete(dept)
        db.session.commit()
        return True
