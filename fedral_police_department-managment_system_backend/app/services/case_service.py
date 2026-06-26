from __future__ import annotations

from typing import Optional, List, Tuple
from datetime import datetime

from ..extensions import db
from ..models.case import Case, CASE_STATUSES
from ..models.department import Department
from ..models.user import User


class CaseService:
    @staticmethod
    def create(data: dict) -> Case:
        """Create a case with ONLY the allowed fields:
        title, department (id), crime, description, location, reportedBy/reported_by,
        reportedDate, preinvestigation_id (alias pre_investigator_id) and force status="new".
        Any extra fields are ignored.
        """
        # Required minimal fields
        required = ['title', 'crime']
        missing = [f for f in required if not str(data.get(f, '')).strip()]
        if missing:
            raise ValueError(f"missing fields: {', '.join(missing)}")

        title = data['title'].strip()
        crime = data['crime'].strip()
        description = (data.get('description') or '').strip() or ''
        location = (data.get('location') or '').strip() or ''
        reported_by = (data.get('reported_by') or data.get('reportedBy') or '').strip() or ''

        # Department id can come as department_id / departmentId / department
        department_id = (
            data.get('department_id')
            or data.get('departmentId')
            or data.get('department')
        )
        dept = None
        if department_id is not None:
            try:
                dept = Department.query.get(int(department_id))
            except (TypeError, ValueError):  # not convertible to int
                dept = None
            if not dept:
                raise ValueError('invalid department_id')

        # Pre-investigator mapping (preinvestigation_id or pre_investigator_id or preInvestigatorId)
        pre_investigator_id_raw = (
            data.get('preinvestigation_id')
            or data.get('pre_investigator_id')
            or data.get('preInvestigatorId')
        )
        pre_investigator_id = None
        if pre_investigator_id_raw is not None:
            try:
                pre_investigator_id_int = int(pre_investigator_id_raw)
            except (TypeError, ValueError):
                raise ValueError('invalid preinvestigation_id')
            # Validate user existence
            if not User.query.get(pre_investigator_id_int):
                raise ValueError('invalid preinvestigation_id')
            pre_investigator_id = pre_investigator_id_int

        # reportedDate parsing (optional)
        reported_date_input = data.get('reportedDate') or data.get('reported_date')
        reported_date = None
        if reported_date_input:
            if isinstance(reported_date_input, datetime):
                reported_date = reported_date_input
            else:
                # Try ISO 8601
                try:
                    reported_date = datetime.fromisoformat(str(reported_date_input))
                except ValueError:
                    raise ValueError('invalid reportedDate (expect ISO 8601)')

        case = Case(
            title=title,
            crime=crime,
            description=description,
            location=location,
            reported_by=reported_by,
            reported_date=reported_date,  # if None SQLAlchemy default applies
            department=dept,
            pre_investigator_id=pre_investigator_id,
            status='new',  # Force initial status
        )
        db.session.add(case)
        db.session.commit()
        return case

    @staticmethod
    def list_all() -> list[Case]:
        return Case.query.order_by(Case.created_at.desc()).all()

    @staticmethod
    def get(case_id: int) -> Optional[Case]:
        return Case.query.get(case_id)

    @staticmethod
    def update(case: Case, data: dict) -> Case:
        allowed = {'title', 'crime', 'description', 'location', 'department_id', 'investigator_id', 'prosecutor_id'}
        for key, value in data.items():
            if key not in allowed:
                continue
            if key == 'department_id' and value is not None:
                dept = Department.query.get(int(value))
                if not dept:
                    raise ValueError('invalid department_id')
                case.department = dept
            elif key == 'investigator_id':
                if value and not User.query.get(int(value)):
                    raise ValueError('invalid investigator_id')
                case.current_assigned_investigator_id = int(value) if value else None
            elif key == 'prosecutor_id':
                if value and not User.query.get(int(value)):
                    raise ValueError('invalid prosecutor_id')
                case.current_assigned_prosecutor_id = int(value) if value else None
            else:
                setattr(case, key, value if value is not None else getattr(case, key))
        db.session.commit()
        return case

    @staticmethod
    def delete(case_id: int) -> bool:
        case = Case.query.get(case_id)
        if not case:
            return False
        db.session.delete(case)
        db.session.commit()
        return True

    # ---- Action helpers / status transitions ----
    @staticmethod
    def submit_case(case: Case) -> Case:
        # Only allow submit if not already submitted/rejected/closed
        if case.status not in ('new', 'investigating'):
            raise ValueError('case cannot be submitted in its current status')
        case.submitted_by_investigator = True
        case.status = 'submitted'
        db.session.commit()
        return case

    @staticmethod
    def request_reinvestigation(case: Case) -> Case:
        if case.status not in ('submitted', 'prosecuted', 'closed'):
            raise ValueError('reinvestigation can only be requested after submission/prosecuted/closed')
        case.status = 'request_reinvestigation'
        db.session.commit()
        return case

    @staticmethod
    def reject_case(case: Case) -> Case:
        if case.status in ('rejected', 'closed'):
            raise ValueError('case already rejected or closed')
        case.status = 'rejected'
        db.session.commit()
        return case
