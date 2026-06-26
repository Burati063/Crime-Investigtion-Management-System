from __future__ import annotations

from flask import Blueprint, request, jsonify, current_app
import random
from datetime import date
from flask_jwt_extended import get_jwt_identity

from ..middleware.auth_required import auth_required
from ..middleware.role_required import role_required
from ..services.case_service import CaseService
from ..models.case import CASE_STATUSES, Case
from ..models.department import Department
from ..models.user import User
from ..extensions import db

case_bp = Blueprint('cases', __name__)


# -------------------------- Validation Helpers --------------------------
def _validate_create_payload(data: dict) -> list[str]:
    errors: list[str] = []
    # Required
    for field in ['title', 'crime']:
        if not str(data.get(field, '')).strip():
            errors.append(f"{field} is required")
    # Length constraints (mirroring model column sizes)
    if 'title' in data and data.get('title') and len(str(data['title'])) > 255:
        errors.append('title exceeds 255 characters')
    if 'crime' in data and data.get('crime') and len(str(data['crime'])) > 500:
        errors.append('crime exceeds 500 characters')
    if 'location' in data and data.get('location') and len(str(data['location'])) > 255:
        errors.append('location exceeds 255 characters')
    # Foreign keys
    if data.get('department_id') or data.get('departmentId'):
        dep_id = data.get('department_id') or data.get('departmentId')
        try:
            dep_id_int = int(dep_id)
            if not Department.query.get(dep_id_int):
                errors.append('department_id not found')
        except Exception:
            errors.append('department_id must be an integer')
    fk_pairs = [
        (data.get('investigator_id') or data.get('investigatorId'), 'investigator_id'),
        (data.get('prosecutor_id') or data.get('prosecutorId'), 'prosecutor_id'),
        (data.get('pre_investigator_id') or data.get('preInvestigatorId'), 'pre_investigator_id'),
    ]
    for fk_field, label in fk_pairs:
        if not fk_field:
            continue
        try:
            uid = int(fk_field)
            if not User.query.get(uid):
                errors.append(f'{label} not found')
        except Exception:
            errors.append(f'{label} must be an integer')
    return errors


def _validate_update_payload(data: dict) -> list[str]:
    errors: list[str] = []
    # Only validate lengths & FKs if present
    if 'title' in data and data.get('title') and len(str(data['title'])) > 255:
        errors.append('title exceeds 255 characters')
    if 'crime' in data and data.get('crime') and len(str(data['crime'])) > 500:
        errors.append('crime exceeds 500 characters')
    if 'location' in data and data.get('location') and len(str(data['location'])) > 255:
        errors.append('location exceeds 255 characters')
    if 'department_id' in data and data.get('department_id') is not None:
        try:
            dep_id_int = int(data['department_id'])
            if not Department.query.get(dep_id_int):
                errors.append('department_id not found')
        except Exception:
            errors.append('department_id must be an integer')
    if 'investigator_id' in data:
        val = data.get('investigator_id')
        if val is not None:
            try:
                uid = int(val)
                if not User.query.get(uid):
                    errors.append('investigator_id not found')
            except Exception:
                errors.append('investigator_id must be an integer')
    if 'prosecutor_id' in data:
        val = data.get('prosecutor_id')
        if val is not None:
            try:
                uid = int(val)
                if not User.query.get(uid):
                    errors.append('prosecutor_id not found')
            except Exception:
                errors.append('prosecutor_id must be an integer')
    return errors


# ---- CRUD ----
@case_bp.post('/')
@auth_required
@role_required('pre_investigation')
def create_case():
    print('[STEP] create_case: request received')
    data = request.get_json() or {}
    print(f'[REQUEST] create_case: raw={data}')
    # Force pre_investigator_id to authenticated user (pre-investigation role)
    try:
        auth_user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        resp = {'message': 'invalid identity'}
        print(f'[RESPONSE] create_case: {resp}')
        return jsonify(resp), 401
    # Override any client-supplied value to prevent spoofing
    data['pre_investigator_id'] = auth_user_id
    current_app.logger.info('[cases] create: payload keys=%s', list(data.keys()))
    errors = _validate_create_payload(data)
    print(f'[STEP] create_case: validation errors={errors}')
    if errors:
        resp = {'message': 'validation failed', 'errors': errors}
        print(f'[RESPONSE] create_case: {resp}')
        return jsonify(resp), 400
    try:
        print('[STEP] create_case: calling CaseService.create')
        case = CaseService.create(data)
        resp = {'case': case.to_dict()}
        print(f'[RESPONSE] create_case: {resp}')
        return jsonify(resp), 201
    except ValueError as e:
        resp = {'message': str(e)}
        print(f'[RESPONSE] create_case error: {resp}')
        return jsonify(resp), 400


@case_bp.get('/')
@auth_required
def list_cases():
    print('[STEP] list_cases: request received')
    items = [c.to_dict() for c in CaseService.list_all()]
    resp = {'cases': items, 'count': len(items)}
    print(f'[RESPONSE] list_cases: count={len(items)}')
    return jsonify(resp)


@case_bp.get('/<int:case_id>')
@auth_required
def get_case(case_id: int):
    print(f'[STEP] get_case: request received case_id={case_id}')
    case = CaseService.get(case_id)
    if not case:
        resp = {'message': 'case not found'}
        print(f'[RESPONSE] get_case: {resp}')
        return jsonify(resp), 404
    resp = {'case': case.to_dict()}
    print(f'[RESPONSE] get_case: found id={case.id}')
    return jsonify(resp)


@case_bp.put('/<int:case_id>')
@auth_required
@role_required('investigator', 'admin')
def update_case(case_id: int):
    print(f'[STEP] update_case: request received case_id={case_id}')
    case = CaseService.get(case_id)
    if not case:
        resp = {'message': 'case not found'}
        print(f'[RESPONSE] update_case: {resp}')
        return jsonify(resp), 404
    data = request.get_json() or {}
    print(f'[REQUEST] update_case: payload={data}')
    errors = _validate_update_payload(data)
    print(f'[STEP] update_case: validation errors={errors}')
    if errors:
        resp = {'message': 'validation failed', 'errors': errors}
        print(f'[RESPONSE] update_case: {resp}')
        return jsonify(resp), 400
    try:
        print('[STEP] update_case: calling CaseService.update')
        case = CaseService.update(case, data)
        resp = {'case': case.to_dict()}
        print(f'[RESPONSE] update_case: {resp}')
        return jsonify(resp)
    except ValueError as e:
        resp = {'message': str(e)}
        print(f'[RESPONSE] update_case error: {resp}')
        return jsonify(resp), 400


@case_bp.delete('/<int:case_id>')
@auth_required
@role_required('admin')
def delete_case(case_id: int):
    print(f'[STEP] delete_case: request received case_id={case_id}')
    deleted = CaseService.delete(case_id)
    if not deleted:
        resp = {'message': 'case not found'}
        print(f'[RESPONSE] delete_case: {resp}')
        return jsonify(resp), 404
    resp = {'deleted': True, 'id': case_id}
    print(f'[RESPONSE] delete_case: {resp}')
    return jsonify(resp)


# ---- Actions ----
# (Deprecated) original submit case endpoint using path parameter. Retained for backward compatibility.
@case_bp.post('/<int:case_id>/submit_case')
@auth_required
@role_required('investigator', 'admin')
def submit_case(case_id: int):
    print(f'[STEP] submit_case(DEPRECATED PATH): request received case_id={case_id}')
    case = CaseService.get(case_id)
    if not case:
        resp = {'message': 'case not found'}
        print(f'[RESPONSE] submit_case(DEPRECATED PATH): {resp}')
        return jsonify(resp), 404
    try:
        print('[STEP] submit_case(DEPRECATED PATH): calling CaseService.submit_case')
        case = CaseService.submit_case(case)
        resp = {'case': case.to_dict(), 'deprecatedEndpoint': True}
        print(f'[RESPONSE] submit_case(DEPRECATED PATH): {resp}')
        return jsonify(resp)
    except ValueError as e:
        resp = {'message': str(e)}
        print(f'[RESPONSE] submit_case(DEPRECATED PATH) error: {resp}')
        return jsonify(resp), 400


# New investigator submit endpoint accepting case_id in JSON body
@case_bp.post('/investigator/submitcase')
@auth_required
@role_required('investigator', 'admin')
def submit_case_investigator():
    """Submit a case (investigator action) using JSON body instead of path param.

    Expected JSON:
        { "case_id": 123 } or { "caseId": 123 }
    """
    print('[STEP] submit_case_investigator: request received')
    payload = request.get_json() or {}
    print(f'[REQUEST] submit_case_investigator: payload={payload}')
    raw_id = payload.get('case_id') or payload.get('caseId')
    try:
        case_id = int(raw_id)
    except (TypeError, ValueError):
        resp = {'message': 'case_id is required and must be an integer'}
        print(f'[RESPONSE] submit_case_investigator: {resp}')
        return jsonify(resp), 400
    case = CaseService.get(case_id)
    if not case:
        resp = {'message': 'case not found'}
        print(f'[RESPONSE] submit_case_investigator: {resp}')
        return jsonify(resp), 404
    try:
        print('[STEP] submit_case_investigator: calling CaseService.submit_case')
        case = CaseService.submit_case(case)
        resp = {'case': case.to_dict()}
        print(f'[RESPONSE] submit_case_investigator: {resp}')
        return jsonify(resp), 200
    except ValueError as e:
        resp = {'message': str(e)}
        print(f'[RESPONSE] submit_case_investigator error: {resp}')
        return jsonify(resp), 400


@case_bp.post('/<int:case_id>/request_reinvestigation')
@auth_required
@role_required('prosecutor', 'admin')
def request_reinvestigation(case_id: int):
    print(f'[STEP] request_reinvestigation: request received case_id={case_id}')
    case = CaseService.get(case_id)
    if not case:
        resp = {'message': 'case not found'}
        print(f'[RESPONSE] request_reinvestigation: {resp}')
        return jsonify(resp), 404
    try:
        print('[STEP] request_reinvestigation: calling CaseService.request_reinvestigation')
        case = CaseService.request_reinvestigation(case)
        resp = {'case': case.to_dict()}
        print(f'[RESPONSE] request_reinvestigation: {resp}')
    except ValueError as e:
        resp = {'message': str(e)}
        print(f'[RESPONSE] request_reinvestigation error: {resp}')
        return jsonify(resp), 400


@case_bp.post('/<int:case_id>/reject_case')
@auth_required
@role_required('prosecutor', 'admin')
def reject_case(case_id: int):
    print(f'[STEP] reject_case: request received case_id={case_id}')
    case = CaseService.get(case_id)
    if not case:
        resp = {'message': 'case not found'}
        print(f'[RESPONSE] reject_case: {resp}')
        return jsonify(resp), 404
    try:
        print('[STEP] reject_case: calling CaseService.reject_case')
        case = CaseService.reject_case(case)
        resp = {'case': case.to_dict()}
        print(f'[RESPONSE] reject_case: {resp}')
        return jsonify(resp)
    except ValueError as e:
        resp = {'message': str(e)}
        print(f'[RESPONSE] reject_case error: {resp}')
        return jsonify(resp), 400


@case_bp.get('/statuses')
@auth_required
def list_statuses():
    print('[STEP] list_statuses: request received')
    resp = {'statuses': list(CASE_STATUSES)}
    print(f'[RESPONSE] list_statuses: {resp}')
    return jsonify(resp)


# ---- Investigator view: cases where prosecutor id == authenticated user id ----
@case_bp.get('/pre_investigation-cases')
@auth_required
@role_required('pre_investigation')
def list_cases_where_user_is_prosecutor():
    print('[STEP] list_cases_where_user_is_pre_investigation: request received')
    user_id = get_jwt_identity()
    try:
        uid = int(user_id)
    except (TypeError, ValueError):
        resp = {'message': 'invalid identity'}
        print(f'[RESPONSE] list_cases_where_user_is_prosecutor: {resp}')
        return jsonify(resp), 401
    from ..models.case import Case  # local import to avoid circulars if any
    cases = Case.query.filter(Case.pre_investigator_id == uid).order_by(Case.created_at.desc()).all()
    result = []
    for c in cases:
        item = {
            'crNumber': c.cr_number,
            'derNumber': c.der_number,
            'title': c.title,
            'department': (c.department.name if c.department else None),
            'crime': c.crime,
            'status': c.status,
            'reportedDate': (c.reported_date.isoformat() if c.reported_date else None),
            'reportedBy': c.reported_by,
        }
        result.append(item)
    resp = {'cases': result, 'count': len(result)}
    print(f'[RESPONSE] list_cases_where_user_is_pre_investigation: count={len(result)}')
    return jsonify(resp), 200


# ---- Investigator view: cases where current_assigned_investigator_id == auth user id ----
@case_bp.get('/investigator/assigned_cases')
@auth_required
@role_required('investigator')
def list_cases_assigned_to_investigator():
    """Return all cases assigned to the authenticated investigator including
    attached persons & exhibits (looked up via case DER number).

    Response shape:
        {
          "cases": [
             {
               "id": "2",
               "crNumber": "CR-2024-005",
               "derNumber": "DER-2024-005",
               "title": "...",
               "status": "...",
               "assignedDate": "YYYY-MM-DD",
               "deadline": "YYYY-MM-DD",    # reportedDate + 2 calendar months (clamped)
               "department": "Department Name",
               "priority": "Medium|High|Urgent",
               "description": "...",
               "assignedBy": "Department Head - <Department>",
               "progress": 40,               # naive derived metric (persons+exhibits)
               "persons": [ Person.to_dict(), ... ],
               "exhibits": [ Exhibit.to_dict(), ... ]
             }, ...
          ],
          "count": n
        }
    """
    print('[STEP] list_cases_assigned_to_investigator: request received')
    identity = get_jwt_identity()
    try:
        uid = int(identity)
    except (TypeError, ValueError):
        resp = {'message': 'invalid identity'}
        print(f'[RESPONSE] list_cases_assigned_to_investigator: {resp}')
        return jsonify(resp), 401

    from ..models.case import Case  # local import (already in file but keeps pattern)
    from ..models.person import Person
    from ..models.exhibit import Exhibit

    # Helper: add 2 calendar months to date (similar logic to department-head endpoints)
    def _add_two_months(d):
        if not d:
            return None
        year = d.year
        month = d.month + 2
        day = d.day
        while month > 12:
            month -= 12
            year += 1
        month_lengths = [31, 29 if (year % 400 == 0 or (year % 4 == 0 and year % 100 != 0)) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        if day > month_lengths[month - 1]:
            day = month_lengths[month - 1]
        from datetime import date as _date
        try:
            return _date(year, month, day)
        except ValueError:
            return _date(year, month, 1)

    # Only include cases actively under investigation or recently reopened per requirement
    priority_choices = ['Medium', 'Urgent']
    cases = (Case.query
             .filter(
                 Case.current_assigned_investigator_id == uid,
                 Case.status.in_(['investigating', 'reopened'])
             )
             .order_by(Case.created_at.desc())
             .all())
    items = []
    for c in cases:
        # Fetch related persons & exhibits by der number (avoids dynamic relationship queries per item if needed)
        persons = Person.query.filter_by(case_der_number=c.der_number).order_by(Person.created_at.asc()).all()
        exhibits = Exhibit.query.filter_by(case_der_number=c.der_number).order_by(Exhibit.created_at.asc()).all()
        reported_dt = c.reported_date.date() if c.reported_date else None
        deadline_dt = _add_two_months(reported_dt)
        # Simple progress heuristic: persons (10 each) + exhibits (15 each) capped at 100
        progress_val = min(len(persons) * 10 + len(exhibits) * 15, 100)
        department_name = c.department.name if c.department else None
        item = {
            'id': str(c.id) if c.id is not None else None,
            'crNumber': c.cr_number,
            'derNumber': c.der_number,
            'title': c.title,
            'status': c.status,
            'assignedDate': reported_dt.isoformat() if reported_dt else None,
            'deadline': deadline_dt.isoformat() if deadline_dt else None,
            'department': department_name,
            'priority': random.choice(priority_choices),
            'description': c.description or '',
            'assignedBy': f"Department Head - {department_name}" if department_name else None,
            'progress': progress_val,
            'persons': [p.to_dict() for p in persons],
            'exhibits': [e.to_dict() for e in exhibits],
        }
        items.append(item)
    resp = {'cases': items, 'count': len(items)}
    print(f'[RESPONSE] list_cases_assigned_to_investigator: count={len(items)}')
    return jsonify(resp), 200


# ---- Department Head view: cases in their department with status new or rejected ----
@case_bp.get('/department-head/new-or-rejected-cases')
@auth_required
@role_required('department_head')
def list_new_or_rejected_cases_for_department_head():
    """Return cases where status is 'new' or 'rejected' and department matches the authenticated department head's department."""
    print('[STEP] list_new_or_rejected_cases_for_department_head: request received')
    identity = get_jwt_identity()
    try:
        uid = int(identity)
    except (TypeError, ValueError):
        resp = {'message': 'invalid identity'}
        print(f'[RESPONSE] list_new_or_rejected_cases_for_department_head: {resp}')
        return jsonify(resp), 401
    user = User.query.get(uid)
    if not user:
        resp = {'message': 'user not found'}
        print(f'[RESPONSE] list_new_or_rejected_cases_for_department_head: {resp}')
        return jsonify(resp), 404
    if not user.department_id:
        resp = {'message': 'user has no department'}
        print(f'[RESPONSE] list_new_or_rejected_cases_for_department_head: {resp}')
        return jsonify(resp), 400
    # Helper to add two calendar months safely
    def _add_two_months(d):
        if not d:
            return None
        year = d.year
        month = d.month + 2
        day = d.day
        # roll year
        while month > 12:
            month -= 12
            year += 1
        # determine last day of target month
        # simple table of month lengths; handle leap year for Feb
        month_lengths = [31, 29 if (year % 400 == 0 or (year % 4 == 0 and year % 100 != 0)) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        last_day = month_lengths[month - 1]
        if day > last_day:
            day = last_day
        try:
            return date(year, month, day)
        except ValueError:
            # Fallback: clamp to first day if something unexpected
            return date(year, month, 1)

    priority_choices = ['high', 'urgent']
    cases = (Case.query
             .filter(Case.department_id == user.department_id, Case.status.in_(['new', 'rejected', 'reopened', "request_reinvestigation"]))
             .order_by(Case.created_at.desc())
             .all())
    items = []
    for c in cases:
        investigator_user = c.current_assigned_investigator  # relationship may be None
        investigator_name = None
        if investigator_user:
            # Combine first and last name
            investigator_name = f"{investigator_user.first_name} {investigator_user.last_name}".strip()
        investigator_id = c.current_assigned_investigator_id
        badge = f"INV-{investigator_id}" if investigator_id else None
        assigned_dt = c.reported_date.date() if c.reported_date else None
        due_dt = _add_two_months(c.reported_date.date() if c.reported_date else None)
        item = {
            'id': str(c.id) if c.id is not None else None,
            'crNumber': c.cr_number,
            'derNumber': c.der_number,
            'title': c.title,
            'department': (c.department.name if c.department else None),
            'crime': c.crime,
            'investigator': investigator_name,
            'investigatorBadge': badge,
            'assignedDate': assigned_dt.isoformat() if assigned_dt else None,
            'status': c.status,
            'priority': random.choice(priority_choices),
            'dueDate': due_dt.isoformat() if due_dt else None,
        }
        items.append(item)
    resp = {'cases': items, 'count': len(items)}
    print(f'[RESPONSE] list_new_or_rejected_cases_for_department_head: count={len(items)}')
    return jsonify(resp), 200


# ---- Department Head view: ALL cases in their department (no status filter) ----
@case_bp.get('/department-head/department-cases')
@auth_required
@role_required('department_head')
def list_all_department_cases_for_department_head():
    """Return all cases for the authenticated department head's department (no status filtering)."""
    print('[STEP] list_all_department_cases_for_department_head: request received')
    identity = get_jwt_identity()
    try:
        uid = int(identity)
    except (TypeError, ValueError):
        resp = {'message': 'invalid identity'}
        print(f'[RESPONSE] list_all_department_cases_for_department_head: {resp}')
        return jsonify(resp), 401
    user = User.query.get(uid)
    if not user:
        resp = {'message': 'user not found'}
        print(f'[RESPONSE] list_all_department_cases_for_department_head: {resp}')
        return jsonify(resp), 404
    if not user.department_id:
        resp = {'message': 'user has no department'}
        print(f'[RESPONSE] list_all_department_cases_for_department_head: {resp}')
        return jsonify(resp), 400

    # Helper to add two calendar months safely (duplicate kept local for clarity)
    def _add_two_months(d):
        if not d:
            return None
        year = d.year
        month = d.month + 2
        day = d.day
        while month > 12:
            month -= 12
            year += 1
        month_lengths = [31, 29 if (year % 400 == 0 or (year % 4 == 0 and year % 100 != 0)) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        last_day = month_lengths[month - 1]
        if day > last_day:
            day = last_day
        from datetime import date as _date
        try:
            return _date(year, month, day)
        except ValueError:
            return _date(year, month, 1)

    priority_choices = ['high', 'medium', 'urgent']
    cases = (Case.query
             .filter(Case.department_id == user.department_id)
             .order_by(Case.created_at.desc())
             .all())
    items = []
    for c in cases:
        investigator_user = c.current_assigned_investigator
        investigator_name = None
        if investigator_user:
            investigator_name = f"{investigator_user.first_name} {investigator_user.last_name}".strip()
        investigator_id = c.current_assigned_investigator_id
        badge = f"INV-{investigator_id}" if investigator_id else None
        assigned_dt = c.reported_date.date() if c.reported_date else None
        due_dt = _add_two_months(c.reported_date.date() if c.reported_date else None)
        items.append({
            'id': str(c.id) if c.id is not None else None,
            'crNumber': c.cr_number,
            'derNumber': c.der_number,
            'title': c.title,
            'department': (c.department.name if c.department else None),
            'crime': c.crime,
            'investigator': investigator_name,
            'investigatorBadge': badge,
            'assignedDate': assigned_dt.isoformat() if assigned_dt else None,
            'status': c.status,
            'priority': random.choice(priority_choices),
            'dueDate': due_dt.isoformat() if due_dt else None,
        })
    resp = {'cases': items, 'count': len(items)}
    print(f'[RESPONSE] list_all_department_cases_for_department_head: count={len(items)}')
    return jsonify(resp), 200


# ---- Department Head view: submitted cases (status = submitted) ----
@case_bp.get('/department-head/submitted-cases')
@auth_required
@role_required('department_head')
def list_submitted_cases_for_department_head():
    """Return all cases with status 'submitted' for the authenticated department head's department.

    Response shape:
        { "cases": [CaseRecord, ...], "count": n }
    Where CaseRecord matches:
        {
          id, crNumber, derNumber, title, department, crime, status,
          registeredDate, priority, dueDate?, prosecutor?, prosecutorBadge?
        }
    """
    print('[STEP] list_submitted_cases_for_department_head: request received')
    identity = get_jwt_identity()
    try:
        uid = int(identity)
    except (TypeError, ValueError):
        resp = {'message': 'invalid identity'}
        print(f'[RESPONSE] list_submitted_cases_for_department_head: {resp}')
        return jsonify(resp), 401
    user = User.query.get(uid)
    if not user:
        resp = {'message': 'user not found'}
        print(f'[RESPONSE] list_submitted_cases_for_department_head: {resp}')
        return jsonify(resp), 404
    if not user.department_id:
        resp = {'message': 'user has no department'}
        print(f'[RESPONSE] list_submitted_cases_for_department_head: {resp}')
        return jsonify(resp), 400

    # Helper for two month deadline
    def _add_two_months(d):
        if not d:
            return None
        year = d.year
        month = d.month + 2
        day = d.day
        while month > 12:
            month -= 12
            year += 1
        month_lengths = [31, 29 if (year % 400 == 0 or (year % 4 == 0 and year % 100 != 0)) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        if day > month_lengths[month - 1]:
            day = month_lengths[month - 1]
        from datetime import date as _date
        try:
            return _date(year, month, day)
        except ValueError:
            return _date(year, month, 1)

    priority_choices = ['high', 'medium', 'urgent']
    cases = (Case.query
             .filter(Case.department_id == user.department_id, Case.status == 'submitted')
             .order_by(Case.created_at.desc())
             .all())
    items = []
    for c in cases:
        prosecutor_user = c.current_assigned_prosecutor
        prosecutor_name = None
        if prosecutor_user:
            prosecutor_name = f"{prosecutor_user.first_name} {prosecutor_user.last_name}".strip()
        prosecutor_id = c.current_assigned_prosecutor_id
        prosecutor_badge = f"PROS-{prosecutor_id}" if prosecutor_id else None
        registered_dt = c.reported_date.date() if c.reported_date else None
        due_dt = _add_two_months(registered_dt)
        items.append({
            'id': str(c.id) if c.id is not None else None,
            'crNumber': c.cr_number,
            'derNumber': c.der_number,
            'title': c.title,
            'department': (c.department.name if c.department else None),
            'crime': c.crime,
            'status': c.status,
            'registeredDate': registered_dt.isoformat() if registered_dt else None,
            'priority': random.choice(priority_choices),
            'dueDate': due_dt.isoformat() if due_dt else None,
            'prosecutor': prosecutor_name,
            'prosecutorBadge': prosecutor_badge,
        })
    resp = {'cases': items, 'count': len(items)}
    print(f'[RESPONSE] list_submitted_cases_for_department_head: count={len(items)}')
    return jsonify(resp), 200






# ---- Department Head action: assign investigator to case (with note) ----
@case_bp.post('/department_head/assign_investigator')
@auth_required
@role_required('department_head')
def assign_investigator_department_head():
    """Assign an investigator to a case within the department head's own department.

    Expected JSON body:
        {
            "case_id": 123,           # required
            "investigator_id": 45,    # required
            "message": "optional note / instructions"  # optional
        }
    Constraints:
      - Auth user must be department_head
      - Case must exist
      - Investigator user must exist and (optionally) have role 'investigator'
      - Auth user's department must match the case's department
    """
    print('[STEP] assign_investigator_department_head: request received')
    identity = get_jwt_identity()
    try:
        auth_uid = int(identity)
    except (TypeError, ValueError):
        resp = {'message': 'invalid identity'}
        print(f'[RESPONSE] assign_investigator_department_head: {resp}')
        return jsonify(resp), 401
    auth_user = User.query.get(auth_uid)
    if not auth_user:
        resp = {'message': 'user not found'}
        print(f'[RESPONSE] assign_investigator_department_head: {resp}')
        return jsonify(resp), 404
    if not auth_user.department_id:
        resp = {'message': 'user has no department'}
        print(f'[RESPONSE] assign_investigator_department_head: {resp}')
        return jsonify(resp), 400
    payload = request.get_json() or {}
    print(f'[REQUEST] assign_investigator_department_head: payload={payload}')
    # Extract & validate fields
    errors = []
    case_id = payload.get('case_id') or payload.get('caseId')
    investigator_id = payload.get('investigator_id') or payload.get('investigatorId')
    message = payload.get('message') or payload.get('note') or payload.get('additionalMessage')
    try:
        case_id_int = int(case_id)
    except (TypeError, ValueError):
        errors.append('case_id must be an integer')
        case_id_int = None
    try:
        investigator_id_int = int(investigator_id)
    except (TypeError, ValueError):
        errors.append('investigator_id must be an integer')
        investigator_id_int = None
    if not case_id_int:
        errors.append('case_id is required')
    if not investigator_id_int:
        errors.append('investigator_id is required')
    if errors:
        resp = {'message': 'validation failed', 'errors': errors}
        print(f'[RESPONSE] assign_investigator_department_head: {resp}')
        return jsonify(resp), 400
    # Fetch case
    case = CaseService.get(case_id_int)
    if not case:
        resp = {'message': 'case not found'}
        print(f'[RESPONSE] assign_investigator_department_head: {resp}')
        return jsonify(resp), 404
    # Department ownership check
    if case.department_id != auth_user.department_id:
        resp = {'message': 'forbidden: case belongs to another department'}
        print(f'[RESPONSE] assign_investigator_department_head: {resp}')
        return jsonify(resp), 403
    # Investigator user
    investigator_user = User.query.get(investigator_id_int)
    if not investigator_user:
        resp = {'message': 'investigator not found'}
        print(f'[RESPONSE] assign_investigator_department_head: {resp}')
        return jsonify(resp), 404
    # Optional: ensure same department for investigator
    if investigator_user.department_id and investigator_user.department_id != auth_user.department_id:
        resp = {'message': 'investigator not in this department'}
        print(f'[RESPONSE] assign_investigator_department_head: {resp}')
        return jsonify(resp), 400
    # Persist changes
    case.current_assigned_investigator_id = investigator_id_int
    # If the case is newly assigned (or coming from a re-open/request state) move it into investigating status.
    try:
        if case.status in ('new', 'reopened', 'request_reinvestigation', 'rejected'):
            # Only update if not already investigating
            if case.status != 'investigating':
                case.status = 'investigating'
                print(f"[STEP] assign_investigator_department_head: status set to 'investigating' for case_id={case.id}")
    except Exception as _e:  # Defensive: avoid breaking assignment if unexpected
        print(f"[WARN] assign_investigator_department_head: could not adjust status -> {_e}")
    # Only set note if provided
    if message is not None:
        try:
            case.note = str(message).strip() or None
        except Exception:
            case.note = None
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        resp = {'message': f'database error: {e}'}
        print(f'[RESPONSE] assign_investigator_department_head error: {resp}')
        return jsonify(resp), 500
    resp = {'case': case.to_dict(), 'assigned': True}
    print(f'[RESPONSE] assign_investigator_department_head: assigned investigator_id={investigator_id_int} to case_id={case.id}')
    return jsonify(resp), 200


# ---- Department Head action: assign prosecutor to case (with prosecutor note) ----
@case_bp.post('/department_head/assign_prosecutor')
@auth_required
@role_required('department_head')
def assign_prosecutor_department_head():
    """Assign a prosecutor to a case in the department head's department.

    Expected JSON body:
        {
          "case_id": 123,            # required
          "prosecutor_id": 88,       # required
          "prosecutor_note": "..."  # optional (can be empty string -> stored as None)
        }

    Steps / validations:
      - Auth user must be department_head.
      - case must exist and belong to auth user's department.
      - prosecutor must exist and belong to same department.
      - On success: set current_assigned_prosecutor_id, set prosecutor_note, set status='under_prosecutor_review'.
    """
    print('[STEP] assign_prosecutor_department_head: request received')
    identity = get_jwt_identity()
    try:
        auth_uid = int(identity)
    except (TypeError, ValueError):
        resp = {'message': 'invalid identity'}
        print(f'[RESPONSE] assign_prosecutor_department_head: {resp}')
        return jsonify(resp), 401
    auth_user = User.query.get(auth_uid)
    if not auth_user:
        resp = {'message': 'user not found'}
        print(f'[RESPONSE] assign_prosecutor_department_head: {resp}')
        return jsonify(resp), 404
    if not auth_user.department_id:
        resp = {'message': 'user has no department'}
        print(f'[RESPONSE] assign_prosecutor_department_head: {resp}')
        return jsonify(resp), 400
    from flask import request
    payload = request.get_json() or {}
    print(f'[REQUEST] assign_prosecutor_department_head: payload={payload}')
    case_id_raw = payload.get('case_id') or payload.get('caseId')
    prosecutor_id_raw = payload.get('prosecutor_id') or payload.get('prosecutorId')
    prosecutor_note_raw = payload.get('prosecutor_note') or payload.get('prosecutorNote')
    errors = []
    try:
        case_id_int = int(case_id_raw)
    except (TypeError, ValueError):
        errors.append('case_id must be an integer')
        case_id_int = None
    try:
        prosecutor_id_int = int(prosecutor_id_raw)
    except (TypeError, ValueError):
        errors.append('prosecutor_id must be an integer')
        prosecutor_id_int = None
    if case_id_int is None:
        errors.append('case_id is required')
    if prosecutor_id_int is None:
        errors.append('prosecutor_id is required')
    if errors:
        resp = {'message': 'validation failed', 'errors': errors}
        print(f'[RESPONSE] assign_prosecutor_department_head: {resp}')
        return jsonify(resp), 400
    # Fetch case
    case = CaseService.get(case_id_int)
    if not case:
        resp = {'message': 'case not found'}
        print(f'[RESPONSE] assign_prosecutor_department_head: {resp}')
        return jsonify(resp), 404
    # Check department alignment
    if case.department_id != auth_user.department_id:
        resp = {'message': 'forbidden: case belongs to another department'}
        print(f'[RESPONSE] assign_prosecutor_department_head: {resp}')
        return jsonify(resp), 403
    # Fetch prosecutor
    prosecutor_user = User.query.get(prosecutor_id_int)
    if not prosecutor_user:
        resp = {'message': 'prosecutor not found'}
        print(f'[RESPONSE] assign_prosecutor_department_head: {resp}')
        return jsonify(resp), 404
    if prosecutor_user.department_id != auth_user.department_id:
        resp = {'message': 'prosecutor not in this department'}
        print(f'[RESPONSE] assign_prosecutor_department_head: {resp}')
        return jsonify(resp), 400
    # Assign and update status/note
    case.current_assigned_prosecutor_id = prosecutor_id_int
    case.status = 'under_prosecutor_review'
    try:
        case.prosecutor_note = (str(prosecutor_note_raw).strip() or None) if prosecutor_note_raw is not None else case.prosecutor_note
    except Exception:
        case.prosecutor_note = None
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        resp = {'message': f'database error: {e}'}
        print(f'[RESPONSE] assign_prosecutor_department_head error: {resp}')
        return jsonify(resp), 500
    resp = {'case': case.to_dict(), 'assigned': True}
    print(f'[RESPONSE] assign_prosecutor_department_head: assigned prosecutor_id={prosecutor_id_int} to case_id={case.id}')
    return jsonify(resp), 200


# ---- Debug Route: list ALL cases (raw) ----
@case_bp.get('/debug/all')
def debug_list_all_cases():
    """Debug endpoint returning every case with full to_dict output.

    NOTE: Keep protected by auth; consider restricting further in production.
    """
    print('[STEP] debug_list_all_cases: request received')
    cases = Case.query.order_by(Case.created_at.desc()).all()
    payload = [c.to_dict() for c in cases]
    resp = {'message': 'debug all cases', 'count': len(payload), 'cases': payload}
    print(f"[RESPONSE] debug_list_all_cases: count={len(payload)}")
    return jsonify(resp), 200


# ---- Investigator simple DER list endpoint ----
@case_bp.get('/investigator/dern')
@auth_required
@role_required('investigator')
def list_investigator_assigned_der_numbers():
    """Return only DER numbers of cases assigned to the authenticated investigator
    where status is 'investigating' or 'reopened'.

    Response example:
        { "dern": ["DER-2025-001", "DER-2025-007"], "count": 2 }
    """
    identity = get_jwt_identity()
    try:
        uid = int(identity)
    except (TypeError, ValueError):
        resp = {'message': 'invalid identity'}
        print(f'[RESPONSE] list_investigator_assigned_der_numbers: {resp}')
        return jsonify(resp), 401
    from ..models.case import Case
    rows = (Case.query
            .filter(
                Case.current_assigned_investigator_id == uid,
                Case.status.in_(['investigating', 'reopened'])
            )
            .order_by(Case.created_at.desc())
            .all())
    der_list = [c.der_number for c in rows if c.der_number]
    resp = {'dern': der_list, 'count': len(der_list)}
    print(f'[RESPONSE] list_investigator_assigned_der_numbers: count={len(der_list)}')
    return jsonify(resp), 200


# ---- Prosecutor view: cases under prosecutor review assigned to auth prosecutor ----
@case_bp.get('/prosecutor/review-cases')
@auth_required
@role_required('prosecutor')
def list_cases_under_prosecutor_review():
    """Return all cases where current_assigned_prosecutor_id == auth user id and
    status == 'under_prosecutor_review'. Attach persons & exhibits by DER number.

    Response shape:
        {
          "cases": [
             {
               "id": "2",
               "crNumber": "...",
               "derNumber": "...",
               "title": "...",
               "status": "under_prosecutor_review",
               "assignedDate": "YYYY-MM-DD",     # date prosecutor assignment happened (uses updated_at fallback reported_date)
               "deadline": "YYYY-MM-DD",          # assignedDate + 2 calendar months
               "department": "Department Name",
               "priority": "High|Medium|Low|Critical",
               "description": "...",
               "assignedBy": "Department Head - <Department>",
               "progress": 40,
               "persons": [ PersonRecord, ... ],
               "exhibits": [ ExhibitRecord, ... ]
             }, ...
          ],
          "count": n
        }
    """
    print('[STEP] list_cases_under_prosecutor_review: request received')
    identity = get_jwt_identity()
    try:
        uid = int(identity)
    except (TypeError, ValueError):
        resp = {'message': 'invalid identity'}
        print(f'[RESPONSE] list_cases_under_prosecutor_review: {resp}')
        return jsonify(resp), 401

    from ..models.case import Case  # local import keeps pattern
    from ..models.person import Person
    from ..models.exhibit import Exhibit

    # Helper: add 2 calendar months safely
    def _add_two_months(d):
        if not d:
            return None
        year = d.year
        month = d.month + 2
        day = d.day
        while month > 12:
            month -= 12
            year += 1
        month_lengths = [31, 29 if (year % 400 == 0 or (year % 4 == 0 and year % 100 != 0)) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        if day > month_lengths[month - 1]:
            day = month_lengths[month - 1]
        from datetime import date as _date
        try:
            return _date(year, month, day)
        except ValueError:
            return _date(year, month, 1)

    priority_choices = ['High', 'Medium', 'Low', 'Critical']
    # Query cases where prosecutor is assigned and status matches
    cases = (Case.query
             .filter(
                 Case.current_assigned_prosecutor_id == uid,
                 Case.status == 'under_prosecutor_review'
             )
             .order_by(Case.updated_at.desc())
             .all())
    items = []
    for c in cases:
        persons = Person.query.filter_by(case_der_number=c.der_number).order_by(Person.created_at.asc()).all()
        exhibits = Exhibit.query.filter_by(case_der_number=c.der_number).order_by(Exhibit.created_at.asc()).all()
        # Assigned date: we rely on updated_at (when prosecutor assignment & status set) fallback reported_date
        assigned_dt = (c.updated_at.date() if c.updated_at else (c.reported_date.date() if c.reported_date else None))
        deadline_dt = _add_two_months(assigned_dt)
        progress_val = min(len(persons) * 10 + len(exhibits) * 15, 100)
        department_name = c.department.name if c.department else None
        item = {
            'id': str(c.id) if c.id is not None else None,
            'crNumber': c.cr_number,
            'derNumber': c.der_number,
            'title': c.title,
            'status': c.status,
            'assignedDate': assigned_dt.isoformat() if assigned_dt else None,
            'deadline': deadline_dt.isoformat() if deadline_dt else None,
            'department': department_name,
            'priority': random.choice(priority_choices),
            'description': c.description or '',
            'assignedBy': f"Department Head - {department_name}" if department_name else None,
            'progress': progress_val,
            'persons': [p.to_dict() for p in persons],
            'exhibits': [e.to_dict() for e in exhibits],
        }
        items.append(item)
    resp = {'cases': items, 'count': len(items)}
    print(f'[RESPONSE] list_cases_under_prosecutor_review: count={len(items)}')
    return jsonify(resp), 200



# ---- Prosecutor view: list all cases (decisions history) assigned to prosecutor where a decision status is set ----
@case_bp.get('/prosecutor/decisions')
@auth_required
@role_required('prosecutor')
def list_prosecutor_decisions():
    """Return all cases assigned to the authenticated prosecutor that are in a
    prosecutor decision state.

    Decision states considered (mapped from requirements/interface):
        - accepted_by_prosecutor
        - rejected_by_prosecutor
        - request_reinvestigation

    Response shape:
        {
          "cases": [ CaseDecision, ... ],
          "count": n
        }

    CaseDecision interface (as requested):
        {
          id: string,
          crNumber: string,
          derNumber: string,
          title: string,
          decision: "accepted_by_prosecutor" | "rejected_by_prosecutor" | "request_reinvestigation",
          decisionDate: string (ISO date),
          reviewedBy: string (investigator's full name),
          investigator: string (duplicate of reviewedBy for clarity),
          department: string,
          priority: "High" | "Medium" | "Low",
          reviewNote: string (prosecutor_note),
          summary: string (concatenation of title + description + location + crime + prosecutor_note)
        }
    """
    print('[STEP] list_prosecutor_decisions: request received')
    identity = get_jwt_identity()
    try:
        uid = int(identity)
    except (TypeError, ValueError):
        resp = {'message': 'invalid identity'}
        print(f'[RESPONSE] list_prosecutor_decisions: {resp}')
        return jsonify(resp), 401

    from ..models.case import Case  # local import pattern
    from ..models.user import User as _User

    decision_statuses = ['accepted_by_prosecutor', 'rejected_by_prosecutor', 'request_reinvestigation','under_prosecutor_review']

    cases = (Case.query
             .filter(
                 Case.current_assigned_prosecutor_id == uid,
                 Case.status.in_(decision_statuses)
             )
             .order_by(Case.updated_at.desc())
             .all())

    priority_choices = ['High', 'Medium', 'Low']
    items = []
    for c in cases:
        investigator_user = c.current_assigned_investigator  # may be None
        investigator_name = None
        if investigator_user:
            investigator_name = f"{investigator_user.first_name} {investigator_user.last_name}".strip()
        # Decision date -> use updated_at (when status last changed) fallback reported_date
        decision_dt = (c.updated_at.date() if c.updated_at else (c.reported_date.date() if c.reported_date else None))
        # Build summary components (skip empties)
        summary_parts = [
            c.title or '',
            c.description or '',
            c.location or '',
            c.crime or '',
            c.prosecutor_note or '',
        ]
        summary = " | ".join([s.strip() for s in summary_parts if s and s.strip()]) or ''
        items.append({
            'id': str(c.id) if c.id is not None else None,
            'crNumber': c.cr_number,
            'derNumber': c.der_number,
            'title': c.title,
            'decision': c.status,
            'decisionDate': decision_dt.isoformat() if decision_dt else None,
            'reviewedBy': investigator_name,
            'investigator': investigator_name,
            'department': (c.department.name if c.department else None),
            'priority': random.choice(priority_choices),
            'reviewNote': c.prosecutor_note,
            'summary': summary,
        })
    resp = {'cases': items, 'count': len(items)}
    print(f'[RESPONSE] list_prosecutor_decisions: count={len(items)}')
    return jsonify(resp), 200




_ALLOWED_DECISIONS = {
    'accept': 'accepted_by_prosecutor',
    'reject': 'rejected_by_prosecutor',
    'request_modification': 'request_reinvestigation',
}


@case_bp.post('/prosecutor/make-decision')
@auth_required
@role_required('prosecutor')
def prosecutor_make_decision():
    """Allow an assigned prosecutor to decide on a case currently under review.

    Expected JSON body:
        {
          "case_id": 123,                # required (int)   
          "decision": "accept|reject|request_modification",  # required
          "note": "optional note"       # optional
        }

    Rules:
      - Authenticated user's id must match case.current_assigned_prosecutor_id
      - Case.status must be 'under_prosecutor_review'
      - Decision maps:
            accept -> accepted_by_prosecutor
            reject -> rejected_by_prosecutor
            request_modification -> request_reinvestigation
      - Writes note to case.prosecutor_note (empty string -> None)
    """
    print('[STEP] prosecutor_make_decision: request received')
    payload = request.get_json() or {}
    print(f'[REQUEST] prosecutor_make_decision: payload={payload}')

    raw_case_id = payload.get('case_id') or payload.get('caseId')
    decision_raw = (payload.get('decision') or '').strip().lower()
    note_raw = payload.get('note')

    errors = []
    try:
        case_id = int(raw_case_id)
    except (TypeError, ValueError):
        errors.append('case_id must be an integer')
        case_id = None

    if not decision_raw:
        errors.append('decision is required')
    elif decision_raw not in _ALLOWED_DECISIONS:
        errors.append(f"decision must be one of {list(_ALLOWED_DECISIONS.keys())}")

    if errors:
        resp = {'message': 'validation failed', 'errors': errors}
        print(f'[RESPONSE] prosecutor_make_decision: {resp}')
        return jsonify(resp), 400

    case = CaseService.get(case_id)
    if not case:
        resp = {'message': 'case not found'}
        print(f'[RESPONSE] prosecutor_make_decision: {resp}')
        return jsonify(resp), 404

    # Auth identity
    identity = get_jwt_identity()
    try:
        auth_uid = int(identity)
    except (TypeError, ValueError):
        resp = {'message': 'invalid identity'}
        print(f'[RESPONSE] prosecutor_make_decision: {resp}')
        return jsonify(resp), 401

    # Ownership / assignment check
    if case.current_assigned_prosecutor_id != auth_uid:
        resp = {'message': 'forbidden: case not assigned to this prosecutor'}
        print(f'[RESPONSE] prosecutor_make_decision: {resp}')
        return jsonify(resp), 403

    # Status prerequisite
    if case.status != 'under_prosecutor_review':
        resp = {'message': f'case not in under_prosecutor_review status (current={case.status})'}
        print(f'[RESPONSE] prosecutor_make_decision: {resp}')
        return jsonify(resp), 400

    # Transition
    new_status = _ALLOWED_DECISIONS[decision_raw]
    if new_status not in CASE_STATUSES:
        # Defensive: should never happen
        resp = {'message': f'internal mapping error: status {new_status} not allowed'}
        print(f'[RESPONSE] prosecutor_make_decision: {resp}')
        return jsonify(resp), 500

    case.status = new_status
    try:
        case.prosecutor_note = (str(note_raw).strip() or None) if note_raw is not None else case.prosecutor_note
    except Exception:
        case.prosecutor_note = None

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        resp = {'message': f'database error: {e}'}
        print(f'[RESPONSE] prosecutor_make_decision error: {resp}')
        return jsonify(resp), 500

    resp = {'case': case.to_dict(), 'updated': True}
    print(f"[RESPONSE] prosecutor_make_decision: updated case_id={case.id} status={case.status}")
    return jsonify(resp), 200
