from __future__ import annotations

import os
import uuid
from datetime import datetime, date
from typing import Optional

from ..extensions import db


class Person(db.Model):
    __tablename__ = "persons"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    # Reference to Case via its unique DER number (string FK)
    case_der_number = db.Column(
        db.String(10), db.ForeignKey("cases.der_number"), nullable=False, index=True
    )

    type = db.Column(db.String(20), nullable=False)  # witness | accuser | accused
    full_name = db.Column(db.String(255), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=True)
    age = db.Column(db.Integer, nullable=True)
    gender = db.Column(db.String(50), nullable=True)
    nationality = db.Column(db.String(100), nullable=True)
    house_number = db.Column(db.String(50), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    region = db.Column(db.String(100), nullable=True)
    nation = db.Column(db.String(100), nullable=True)
    woreda = db.Column(db.String(100), nullable=True)
    kebele = db.Column(db.String(100), nullable=True)
    resident_id = db.Column(db.String(100), nullable=True)
    marital_status = db.Column(db.String(100), nullable=True)
    education_status = db.Column(db.String(100), nullable=True)
    work_status = db.Column(db.String(100), nullable=True)
    phone_number = db.Column(db.String(50), nullable=True)
    description = db.Column(db.Text, nullable=True)
    file_url = db.Column(db.String(500), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    case = db.relationship("Case", backref=db.backref("persons", lazy="dynamic"), lazy=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "caseDerNumber": self.case_der_number,
            "type": self.type,
            "fullName": self.full_name,
            "dateOfBirth": (self.date_of_birth.isoformat() if self.date_of_birth else None),
            "age": self.age,
            "gender": self.gender,
            "nationality": self.nationality,
            "houseNumber": self.house_number,
            "address": self.address,
            "region": self.region,
            "nation": self.nation,
            "woreda": self.woreda,
            "kebele": self.kebele,
            "residentId": self.resident_id,
            "maritalStatus": self.marital_status,
            "educationStatus": self.education_status,
            "workStatus": self.work_status,
            "phoneNumber": self.phone_number,
            "description": self.description,
            "fileUrl": self.file_url,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


def build_person_upload_path(base: str, case_der_number: str) -> str:
    # Structure: <base>/<case_der_number>/persons
    return os.path.join(base, case_der_number, "persons")


def store_person_file(base: str, case_der_number: str, file_storage) -> str:
    directory = build_person_upload_path(base, case_der_number)
    os.makedirs(directory, exist_ok=True)
    original_name = file_storage.filename or "upload.bin"
    safe_name = f"{uuid.uuid4().hex}_{original_name}".replace("..", "_")
    full_path = os.path.join(directory, safe_name)
    file_storage.save(full_path)
    # Return path relative to base for portability
    rel_path = os.path.relpath(full_path, base)
    return rel_path.replace("\\", "/")
