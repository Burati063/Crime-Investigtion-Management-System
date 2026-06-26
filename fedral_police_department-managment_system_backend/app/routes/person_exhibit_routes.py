from __future__ import annotations

import os
import json
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import get_jwt_identity
from flask import send_file, abort

from ..extensions import db
from ..middleware.auth_required import auth_required
from ..middleware.role_required import role_required
from ..models.case import Case
from ..models.person import Person, store_person_file
from ..models.exhibit import Exhibit, store_exhibit_file

bp = Blueprint('case_entities', __name__)


def _log(route: str, step: str, **payload):
    """Lightweight structured console logger for debugging create routes.

    Avoids logging raw file objects; large / binary data are summarized.
    """
    safe_payload = {}
    for k, v in payload.items():
        try:
            if hasattr(v, 'read') and hasattr(v, 'filename'):
                safe_payload[k] = {
                    'filename': getattr(v, 'filename', None),
                    'content_type': getattr(v, 'content_type', None),
                    'length': getattr(v, 'content_length', None),
                }
            else:
                safe_payload[k] = v
        except Exception:
            safe_payload[k] = str(v)
    try:
        serialized = json.dumps(safe_payload, default=str)
    except Exception:
        serialized = str(safe_payload)
    print(f"[CREATE DEBUG] route={route} step={step} data={serialized}")


def _get_upload_base() -> str:
    base = current_app.config.get('UPLOAD_FOLDER') or os.path.join(current_app.instance_path, 'uploads')
    os.makedirs(base, exist_ok=True)
    return base


# ---------------- Person Endpoints ----------------
@bp.post('/persons')
@auth_required
def create_person():
    _log('create_person', 'request_received', content_type=request.content_type, args=dict(request.args), form_keys=list(request.form.keys()), files=list(request.files.keys()))
    # Accept multipart/form-data (with optional file) or JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = dict(request.form)
    else:
        data = request.get_json() or {}
    _log('create_person', 'parsed_input', data=data)
    required = ['case_der_number', 'type', 'full_name']
    missing = [r for r in required if not str(data.get(r) or '').strip()]
    if missing:
        resp = {'message': f"Missing required fields: {', '.join(missing)}"}
        _log('create_person', 'validation_failed', missing=missing, response=resp)
        return jsonify(resp), 400
    case_der = data['case_der_number']
    case = Case.query.filter_by(der_number=case_der).first()
    if not case:
        resp = {'message': 'Case (by der number) not found'}
        _log('create_person', 'case_not_found', case_der_number=case_der, response=resp)
        return jsonify(resp), 404
    # Map front-end field names to model attributes
    person = Person(
        case_der_number=case_der,
        type=data.get('type'),
        full_name=data.get('full_name'),
        date_of_birth=_parse_date(data.get('dateOfBirth')),
        age=_to_int(data.get('age')),
        gender=data.get('gender'),
        nationality=data.get('nationality'),
        house_number=data.get('houseNumber'),
        address=data.get('address'),
        region=data.get('region'),
        nation=data.get('nation'),
        woreda=data.get('woreda'),
        kebele=data.get('kebele'),
        resident_id=data.get('residentId'),
        marital_status=data.get('maritalStatus'),
        education_status=data.get('educationStatus'),
        work_status=data.get('workStatus'),
        phone_number=data.get('phoneNumber'),
        description=data.get('description'),
    )
    # File upload (single optional file with key 'file')
    upload = None
    if 'file' in request.files:
        upload = request.files['file']
    if upload and upload.filename:
        _log('create_person', 'storing_file_start', filename=upload.filename)
        person.file_url = store_person_file(_get_upload_base(), case_der, upload)
        _log('create_person', 'storing_file_done', file_url=person.file_url)
    else:
        _log('create_person', 'no_file_provided')
    db.session.add(person)
    _log('create_person', 'db_add', person=person.to_dict())
    db.session.commit()
    response_body = {'person': person.to_dict()}
    _log('create_person', 'success', response=response_body)
    return jsonify(response_body), 201


@bp.get('/persons/<string:case_der_number>')
@auth_required
def list_persons(case_der_number: str):
    persons = Person.query.filter_by(case_der_number=case_der_number).order_by(Person.created_at.desc()).all()
    return jsonify({'persons': [p.to_dict() for p in persons], 'count': len(persons)})


# ---------------- Exhibit Endpoints ----------------
@bp.post('/exhibits')
@auth_required
def create_exhibit():
    _log('create_exhibit', 'request_received', content_type=request.content_type, args=dict(request.args), form_keys=list(request.form.keys()), files=list(request.files.keys()))
    # Accept multipart/form-data (with optional file) or JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = dict(request.form)
    else:
        data = request.get_json() or {}
    _log('create_exhibit', 'parsed_input', data=data)
    required = ['case_der_number', 'name']
    missing = [r for r in required if not str(data.get(r) or '').strip()]
    if missing:
        resp = {'message': f"Missing required fields: {', '.join(missing)}"}
        _log('create_exhibit', 'validation_failed', missing=missing, response=resp)
        return jsonify(resp), 400
    case_der = data['case_der_number']
    case = Case.query.filter_by(der_number=case_der).first()
    if not case:
        resp = {'message': 'Case (by der number) not found'}
        _log('create_exhibit', 'case_not_found', case_der_number=case_der, response=resp)
        return jsonify(resp), 404
    exhibit = Exhibit(
        case_der_number=case_der,
        name=data.get('name'),
        description=data.get('description'),
        quantity=_to_int(data.get('quantity')),
        related_person_id=_to_int(data.get('relatedPersonId')),
        related_person_name=data.get('relatedPersonName'),
        registered_date=_parse_datetime(data.get('registeredDate')) or datetime.utcnow(),
    )
    upload = None
    if 'file' in request.files:
        upload = request.files['file']
    if upload and upload.filename:
        _log('create_exhibit', 'storing_file_start', filename=upload.filename)
        exhibit.file_url = store_exhibit_file(_get_upload_base(), case_der, upload)
        _log('create_exhibit', 'storing_file_done', file_url=exhibit.file_url)
    else:
        _log('create_exhibit', 'no_file_provided')
    db.session.add(exhibit)
    _log('create_exhibit', 'db_add', exhibit=exhibit.to_dict())
    db.session.commit()
    response_body = {'exhibit': exhibit.to_dict()}
    _log('create_exhibit', 'success', response=response_body)
    return jsonify(response_body), 201


@bp.get('/exhibits/<string:case_der_number>')
@auth_required
def list_exhibits(case_der_number: str):
    exhibits = Exhibit.query.filter_by(case_der_number=case_der_number).order_by(Exhibit.created_at.desc()).all()
    return jsonify({'exhibits': [e.to_dict() for e in exhibits], 'count': len(exhibits)})


# ---------------- File Download Endpoint ----------------
@bp.get('/files')
@auth_required
def download_uploaded_file():
    """Authenticated download of a previously uploaded person/exhibit file.

    Expects query parameter:
        url: the stored relative file_url value (as returned by create endpoints)

    Security considerations:
      - Only allows paths that reside inside the configured UPLOAD_FOLDER.
      - Rejects absolute paths and path traversal attempts containing '..'.
      - Ensures the target file actually exists.
    """
    file_url = request.args.get('url')
    _log('download_file', 'request_received', file_url=file_url)
    if not file_url:
        _log('download_file', 'missing_param')
        return jsonify({'message': 'Missing required query parameter: url'}), 400
    # Basic traversal / absolute path protection
    if file_url.startswith('/') or file_url.startswith('\\') or '..' in file_url.split('/'):
        _log('download_file', 'invalid_path_rejected', reason='path_traversal_or_absolute')
        return jsonify({'message': 'Invalid file path'}), 400
    base = _get_upload_base()
    abs_path = os.path.abspath(os.path.join(base, file_url))
    # Ensure resolved path is still within base
    if not abs_path.startswith(os.path.abspath(base) + os.sep):
        _log('download_file', 'invalid_path_rejected', reason='outside_base', abs_path=abs_path)
        return jsonify({'message': 'Invalid file path'}), 400
    if not os.path.exists(abs_path) or not os.path.isfile(abs_path):
        _log('download_file', 'not_found', abs_path=abs_path)
        return jsonify({'message': 'File not found'}), 404
    try:
        # Derive a nice download filename (strip UUID prefix if present)
        original_name = os.path.basename(abs_path)
        # Split on first underscore (UUID_) pattern of 32 hex chars
        parts = original_name.split('_', 1)
        if len(parts) == 2 and len(parts[0]) == 32:
            download_name = parts[1]
        else:
            download_name = original_name
        _log('download_file', 'serving', abs_path=abs_path, download_name=download_name)
        return send_file(abs_path, as_attachment=True, download_name=download_name)
    except Exception as e:
        _log('download_file', 'error', error=str(e))
        return jsonify({'message': 'Failed to download file'}), 500


# ---------------- Helpers ----------------
def _to_int(val):
    try:
        if val is None or val == "":
            return None
        return int(val)
    except Exception:
        return None


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).date()
    except Exception:
        # try just YYYY-MM-DD
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except Exception:
            return None


def _parse_datetime(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None
