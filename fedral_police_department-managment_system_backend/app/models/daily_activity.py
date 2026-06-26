from __future__ import annotations

from datetime import datetime, date
from typing import Optional
from ..extensions import db


class DailyActivity(db.Model):
    __tablename__ = 'daily_activities'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    # Activity date (default to today if not provided)
    activity_date = db.Column(db.Date, nullable=False, index=True, default=date.today)

    # Optional link to a case via DER number (string) OR standard integer case id - here we store only der for quick lookups
    case_der_number = db.Column(db.String(10), nullable=True, index=True)

    # Investigator user id (FK) for the authenticated user who creates the record
    investigator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    investigator = db.relationship('User', backref=db.backref('daily_activities', lazy='dynamic'))

    # Free text description of activity
    description = db.Column(db.Text, nullable=False)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'date': self.activity_date.isoformat() if self.activity_date else None,
            'derNumber': self.case_der_number,
            'investigatorId': self.investigator_id,
            'activityDesc': self.description,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }
