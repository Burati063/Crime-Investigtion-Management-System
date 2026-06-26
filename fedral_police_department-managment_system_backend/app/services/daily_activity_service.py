from __future__ import annotations

from typing import List, Dict
from sqlalchemy.orm import joinedload

from ..extensions import db
from ..models.daily_activity import DailyActivity


class DailyActivityService:
    @staticmethod
    def list_all() -> List[Dict]:
        """Return all daily activities including the investigator's full name.

        Output keys follow the API's camelCase style and mirror DailyActivity.to_dict(),
        with the addition of 'investigatorName'.
        """
        records = (
            DailyActivity.query.options(joinedload(DailyActivity.investigator))
            .order_by(DailyActivity.activity_date.desc(), DailyActivity.created_at.desc())
            .all()
        )
        result: List[Dict] = []
        for r in records:
            inv = r.investigator
            investigator_name = None
            if inv is not None:
                first = (inv.first_name or '').strip()
                last = (inv.last_name or '').strip()
                investigator_name = (f"{first} {last}").strip() or None
            result.append({
                'id': r.id,
                'date': r.activity_date.isoformat() if r.activity_date else None,
                'derNumber': r.case_der_number,
                'investigatorId': r.investigator_id,
                'investigatorName': investigator_name,
                'activityDesc': r.description,
                'createdAt': r.created_at.isoformat() if r.created_at else None,
                'updatedAt': r.updated_at.isoformat() if r.updated_at else None,
            })
        return result
