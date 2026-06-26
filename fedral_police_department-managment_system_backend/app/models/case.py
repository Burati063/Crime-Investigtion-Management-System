from __future__ import annotations

import secrets
import string
from datetime import datetime
from typing import Optional

from sqlalchemy import event, select

from ..extensions import db

# Optional: centralize allowed statuses if you plan to validate transitions elsewhere
CASE_STATUSES = (
    "new",
    "investigating",
    "submitted",
    "under_prosecutor_review",
    "closed",
    "rejected_by_prosecutor",
    "rejected",
    "accepted_by_prosecutor",
    
    "request_reinvestigation",  
    "reopened",
)


class Case(db.Model):
    __tablename__ = "cases"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # Unique random 10-digit identifiers
    cr_number = db.Column(db.String(10), nullable=False, unique=True, index=True)   # CR number
    der_number = db.Column(db.String(10), nullable=False, unique=True, index=True)  # DER number

    # Basic fields
    title = db.Column(db.String(255), default="", nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)
    crime = db.Column(db.String(500), default="", nullable=False)
    description = db.Column(db.Text, default="", nullable=True)
    location = db.Column(db.String(255), default="", nullable=True)
    # Additional free-form note field (nullable)
    note = db.Column(db.Text, nullable=True)
    # Prosecutor specific note (nullable)
    prosecutor_note = db.Column(db.Text, nullable=True)

    reported_by = db.Column(db.String(255), default="", nullable=True)  # plain name or external reference
    reported_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Current assignment
    current_assigned_investigator_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    current_assigned_prosecutor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    pre_investigator_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)  # user who performed pre-investigation / initial intake

    # Flags and status
    submitted_by_investigator = db.Column(db.Boolean, default=False, nullable=False)
    status = db.Column(db.String(50), default="new", nullable=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    department = db.relationship(
        "Department",
        backref=db.backref("cases", lazy="dynamic"),
        lazy=True,
    )
    current_assigned_investigator = db.relationship(
        "User",
        foreign_keys=[current_assigned_investigator_id],
        backref=db.backref("investigator_cases", lazy="dynamic"),
        lazy=True,
    )
    current_assigned_prosecutor = db.relationship(
        "User",
        foreign_keys=[current_assigned_prosecutor_id],
        backref=db.backref("prosecutor_cases", lazy="dynamic"),
        lazy=True,
    )
    pre_investigator = db.relationship(
        "User",
        foreign_keys=[pre_investigator_id],
        backref=db.backref("pre_investigated_cases", lazy="dynamic"),
        lazy=True,
    )

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<Case CR={self.cr_number} status={self.status}>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "crNumber": self.cr_number,
            "derNumber": self.der_number,
            "title": self.title,
            "crime": self.crime,
            "description": self.description,
            "location": self.location,
            "reportedBy": self.reported_by,
            "reportedDate": self.reported_date.isoformat() if self.reported_date else None,
            "department": (self.department.name if self.department else None),
            "departmentId": self.department_id,
            "investigatorId": self.current_assigned_investigator_id,
            "prosecutorId": self.current_assigned_prosecutor_id,
            "preInvestigatorId": self.pre_investigator_id,
            "submittedByInvestigator": bool(self.submitted_by_investigator),
            "status": self.status,
            "note": self.note,
            "prosecutorNote": self.prosecutor_note,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            
        }

    # Convenience helpers -------------------------------------------------
    def assign_investigator(self, user_id: int):
        self.current_assigned_investigator_id = user_id

    def assign_prosecutor(self, user_id: int):
        self.current_assigned_prosecutor_id = user_id

    def submit(self):
        self.submitted_by_investigator = True
        if self.status == "investigating":
            self.status = "submitted"

    def set_status(self, new_status: str):
        if new_status not in CASE_STATUSES:
            raise ValueError(f"Unsupported status '{new_status}'. Allowed: {CASE_STATUSES}")
        self.status = new_status


# ---------------------------------------------------------------------------
# Helpers for unique 10-digit code generation
# ---------------------------------------------------------------------------
_digits = string.digits


def _generate_unique_number(connection, column) -> str:
    """Generate a unique 10-digit numeric string for the given column."""
    while True:  # loop until uniqueness is achieved (extremely low collision chance)
        candidate = "".join(secrets.choice(_digits) for _ in range(10))
        exists = connection.execute(select(column).where(column == candidate)).first()
        if not exists:
            return candidate


@event.listens_for(Case, "before_insert")
def set_case_identifiers(mapper, connection, target: Case):  # pragma: no cover - side effect
    if not target.cr_number:
        target.cr_number = _generate_unique_number(connection, Case.__table__.c.cr_number)
    if not target.der_number:
        target.der_number = _generate_unique_number(connection, Case.__table__.c.der_number)
    # Normalize status
    if target.status not in CASE_STATUSES:
        target.status = "new"
