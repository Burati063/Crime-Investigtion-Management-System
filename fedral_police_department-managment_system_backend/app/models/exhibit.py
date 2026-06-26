from __future__ import annotations

import os
import uuid
from datetime import datetime

from ..extensions import db


class Exhibit(db.Model):
    __tablename__ = "exhibits"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    case_der_number = db.Column(
        db.String(10), db.ForeignKey("cases.der_number"), nullable=False, index=True
    )
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    quantity = db.Column(db.Integer, nullable=True)
    related_person_id = db.Column(db.Integer, db.ForeignKey("persons.id"), nullable=True)
    related_person_name = db.Column(db.String(255), nullable=True)
    file_url = db.Column(db.String(500), nullable=True)
    registered_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    case = db.relationship("Case", backref=db.backref("exhibits", lazy="dynamic"), lazy=True)
    related_person = db.relationship("Person", backref=db.backref("exhibits", lazy="dynamic"), lazy=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "caseDerNumber": self.case_der_number,
            "name": self.name,
            "description": self.description,
            "quantity": self.quantity,
            "relatedPersonId": self.related_person_id,
            "relatedPersonName": self.related_person_name,
            "registeredDate": self.registered_date.isoformat() if self.registered_date else None,
            "fileUrl": self.file_url,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


def build_exhibit_upload_path(base: str, case_der_number: str) -> str:
    # Structure: <base>/<case_der_number>/exhibits
    import os
    return os.path.join(base, case_der_number, "exhibits")


def store_exhibit_file(base: str, case_der_number: str, file_storage) -> str:
    directory = build_exhibit_upload_path(base, case_der_number)
    import os
    os.makedirs(directory, exist_ok=True)
    original_name = file_storage.filename or "upload.bin"
    safe_name = f"{uuid.uuid4().hex}_{original_name}".replace("..", "_")
    full_path = os.path.join(directory, safe_name)
    file_storage.save(full_path)
    rel_path = os.path.relpath(full_path, base)
    return rel_path.replace("\\", "/")
