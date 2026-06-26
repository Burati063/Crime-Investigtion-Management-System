from __future__ import annotations

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from datetime import date, datetime

from ..extensions import db
from ..middleware.auth_required import auth_required
from ..middleware.role_required import role_required
from ..models.daily_activity import DailyActivity
from ..models.case import Case
from ..services.daily_activity_service import DailyActivityService

activity_bp = Blueprint('daily_activity', __name__)


def _parse_date(val):
    if not val:
        return date.today()
    if isinstance(val, date):
        return val
    try:
        # Accept YYYY-MM-DD
        return datetime.strptime(str(val), '%Y-%m-%d').date()
    except ValueError:
        return date.today()


@activity_bp.post('/investigator/daily_activities')
@auth_required
@role_required('investigator', 'admin')
def create_daily_activity():
    """Create a daily activity log for the authenticated investigator.

    Expected JSON (front-end form example):
    {
      "date": "2025-10-05",   # optional; defaults to today
      "dern": "DER-2025-001",  # optional; validated if provided
      "activityDesc": "Interviewed witness ..."
    }
    The investigator is inferred from the JWT identity; any provided investigator field is ignored.
    """
    payload = request.get_json() or {}
    print(f'[STEP] create_daily_activity: payload={payload}')
    identity = get_jwt_identity()
    try:
        investigator_id = int(identity)
    except (TypeError, ValueError):
        return jsonify({'message': 'invalid identity'}), 401

    # Extract and normalize fields
    date_raw = payload.get('date')
    der_number = payload.get('dern') or payload.get('der') or payload.get('derNumber')
    description = (payload.get('activityDesc') or payload.get('description') or '').strip()

    errors = []
    if not description:
        errors.append('activityDesc is required')
    activity_date = _parse_date(date_raw)

    # If DER number provided, ensure case exists
    if der_number:
        case = Case.query.filter_by(der_number=der_number).first()
        if not case:
            errors.append('case derNumber not found')
    if errors:
        return jsonify({'message': 'validation failed', 'errors': errors}), 400

    record = DailyActivity(
        activity_date=activity_date,
        case_der_number=der_number,
        investigator_id=investigator_id,
        description=description,
    )
    db.session.add(record)
    db.session.commit()
    return jsonify({'dailyActivity': record.to_dict()}), 201


@activity_bp.get('/investigator/daily_activities')
@auth_required
@role_required('investigator', 'admin')
def list_my_daily_activities():
    identity = get_jwt_identity()
    try:
        investigator_id = int(identity)
    except (TypeError, ValueError):
        return jsonify({'message': 'invalid identity'}), 401
    # Optional filters: date, dern
    date_param = request.args.get('date')
    der_param = request.args.get('dern') or request.args.get('der') or request.args.get('derNumber')

    query = DailyActivity.query.filter_by(investigator_id=investigator_id)
    if date_param:
        try:
            dt = datetime.strptime(date_param, '%Y-%m-%d').date()
            query = query.filter(DailyActivity.activity_date == dt)
        except ValueError:
            pass
    if der_param:
        query = query.filter(DailyActivity.case_der_number == der_param)
    records = query.order_by(DailyActivity.activity_date.desc(), DailyActivity.created_at.desc()).all()
    return jsonify({'dailyActivities': [r.to_dict() for r in records], 'count': len(records)})


@activity_bp.get('/daily_activities')
@auth_required
@role_required('department_head','admin')
def list_all_daily_activities():
    """Return all daily activities with investigator names (admin only)."""
    items = DailyActivityService.list_all()
    return jsonify({'dailyActivities': items, 'count': len(items)})
