from __future__ import annotations

from flask import Blueprint, jsonify, request, current_app

from ..services.department_service import DepartmentService


dept_bp = Blueprint('departments', __name__)


@dept_bp.post('/')
def create_department():
    current_app.logger.info('[departments] create: request received')
    data = request.get_json() or {}
    print(f'[REQUEST] create_department: {data}')
    name = data.get('name')
    description = data.get('description')
    crimes = data.get('crimes')
    is_active = data.get('isActive', True)
    current_app.logger.info('[departments] create: payload name=%s isActive=%s crimes_count=%s', str(name), str(is_active), (len(crimes) if isinstance(crimes, list) else 'n/a'))
    # Validate crimes list shape & contents
    if crimes is not None:
        if not isinstance(crimes, list):
            return jsonify({'message': 'crimes must be a list of strings'}), 400
        normalized = []
        for c in crimes:
            if not isinstance(c, (str, int, float)):
                return jsonify({'message': 'crimes must be a list of strings'}), 400
            s = str(c).strip()
            if s:
                normalized.append(s)
        crimes = normalized
    try:
        if isinstance(is_active, str):
            is_active = is_active.lower() in ('1', 'true', 'yes', 'on')
        dept = DepartmentService.create(name, description, crimes, is_active)
        current_app.logger.info('[departments] create: created id=%d name=%s', dept.id, dept.name)
        response = {'department': dept.to_dict()}
        print(f'[RESPONSE] create_department: {response}')
        return jsonify(response), 201
    except ValueError as e:
        current_app.logger.warning('[departments] create: validation error: %s', str(e))
        return jsonify({'message': str(e)}), 400


@dept_bp.get('/')
def list_departments():
    current_app.logger.info('[departments] list: request received')
    items = [d.to_dict() for d in DepartmentService.list_all()]
    current_app.logger.info('[departments] list: returning %d departments', len(items))
    response = {'departments': items}
    print(f'[RESPONSE] list_departments: count={len(items)}')
    return jsonify(response), 200


@dept_bp.get('/<string:name>')
def get_department(name: str):
    current_app.logger.info('[departments] get: lookup name=%s', name)
    dept = DepartmentService.get_by_name(name)
    if not dept:
        current_app.logger.warning('[departments] get: not found name=%s', name)
        return jsonify({'message': 'department not found'}), 404
    current_app.logger.info('[departments] get: found id=%d name=%s', dept.id, dept.name)
    response = {'department': dept.to_dict()}
    print(f'[RESPONSE] get_department: {response}')
    return jsonify(response), 200


@dept_bp.put('/<int:dept_id>')
def update_department(dept_id: int):
    current_app.logger.info('[departments] update: request received id=%d', dept_id)
    data = request.get_json() or {}
    print(f'[REQUEST] update_department: id={dept_id} payload={data}')
    dept = DepartmentService.get_by_id(dept_id)
    if not dept:
        current_app.logger.warning('[departments] update: not found id=%d', dept_id)
        return jsonify({'message': 'department not found'}), 404
    # Extract potential fields
    name = data.get('name')
    description = data.get('description')
    crimes = data.get('crimes') if 'crimes' in data else None
    is_active = data.get('isActive') if 'isActive' in data else None
    # Validate crimes if provided
    if crimes is not None:
        if not isinstance(crimes, list):
            return jsonify({'message': 'crimes must be a list of strings'}), 400
        # Ensure each is a string (after conversion) and non-empty when stripped
        normalized = []
        for c in crimes:
            if not isinstance(c, (str, int, float)):
                return jsonify({'message': 'crimes must be a list of strings'}), 400
            s = str(c).strip()
            if s:
                normalized.append(s)
        crimes = normalized
    if is_active is not None and isinstance(is_active, str):
        is_active = is_active.lower() in ('1','true','yes','on')
    try:
        dept = DepartmentService.update(
            dept,
            name=name,
            description=description,
            crimes=crimes,
            is_active=is_active
        )
        current_app.logger.info('[departments] update: success id=%d', dept.id)
        response = {'department': dept.to_dict()}
        print(f'[RESPONSE] update_department: {response}')
        return jsonify(response), 200
    except ValueError as e:
        current_app.logger.warning('[departments] update: validation error: %s', str(e))
        return jsonify({'message': str(e)}), 400


@dept_bp.delete('/<int:dept_id>')
def delete_department(dept_id: int):
    current_app.logger.info('[departments] delete: request received id=%d', dept_id)
    print(f'[REQUEST] delete_department: id={dept_id}')
    deleted = DepartmentService.delete(dept_id)
    if not deleted:
        current_app.logger.warning('[departments] delete: not found id=%d', dept_id)
        return jsonify({'message': 'department not found'}), 404
    response = {'deleted': True, 'id': dept_id}
    print(f'[RESPONSE] delete_department: {response}')
    return jsonify(response), 200
