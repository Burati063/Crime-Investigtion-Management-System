
from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import get_jwt_identity
from ..services.user_service import UserService
from ..middleware.auth_required import auth_required
from ..middleware.role_required import role_required

user_bp = Blueprint('users', __name__)



@user_bp.post('/')
@auth_required
@role_required('admin')
def create_user():
    from flask import request
    data = request.get_json() or {}
    print(f'[REQUEST] create_user: {data}')
    current_app.logger.info('[users] create_user: payload received (sanitized) email=%s role=%s rank=%s status=%s department=%s',
                            str(data.get('email')), str(data.get('role')), str(data.get('rank')), str(data.get('status')), str(data.get('department')))
    required_fields = ['email', 'username', 'first_name', 'last_name', 'rank', 'status', 'role', 'password', 'department']
    missing = [f for f in required_fields if f not in data]
    empty = [f for f in required_fields if not str(data.get(f, '')).strip()]
    if missing or empty:
        current_app.logger.warning('[users] create_user: validation failed missing=%s empty=%s', missing, empty)
        problems = []
        if missing:
            problems.append(f"missing: {', '.join(missing)}")
        if empty:
            problems.append(f"empty: {', '.join(sorted(set(empty)))}")
        return jsonify({'message': '; '.join(problems)}), 400
    # Lookup department by name
    from ..services.department_service import DepartmentService
    dept = DepartmentService.get_by_name(data['department'])
    if not dept:
        current_app.logger.warning('[users] create_user: department not found name=%s', str(data['department']))
        return jsonify({'message': 'Department not found'}), 404
    # Prepare user fields
    user_fields = {k: data[k] for k in ['email', 'username', 'first_name', 'last_name', 'rank', 'status', 'role', 'password']}
    user_fields['department_id'] = dept.id
    try:
        user = UserService.create_user(user_fields)
        current_app.logger.info('[users] create_user: user id=%d created successfully', user.id)
    except ValueError as e:
        current_app.logger.warning('[users] create_user: validation error: %s', str(e))
        return jsonify({'message': str(e)}), 400
    response = user.to_public_dict()
    print(f'[RESPONSE] create_user: {response}')
    return jsonify(response), 201

@user_bp.get('/')
@auth_required
def list_users():
    current_app.logger.info('[users] list_users: request received')
    users = UserService.list_users()
    current_app.logger.info('[users] list_users: returning %d users', len(users))
    response = [u.to_public_dict() for u in users]
    print(f'[RESPONSE] list_users: {response}')
    return jsonify(response)


@user_bp.get('/me')
@auth_required
def me():
    user_id = get_jwt_identity()
    print(f'[REQUEST] me: user_id={user_id}')
    current_app.logger.info('[users] me: identity=%s', str(user_id))
    user = UserService.get_user(int(user_id)) if user_id else None
    if not user:
        print(f'[RESPONSE] me: Not found for user_id={user_id}')
        current_app.logger.warning('[users] me: user not found for identity=%s', str(user_id))
        return jsonify({'message': 'Not found'}), 404
    current_app.logger.info('[users] me: returning user %s', user.email)
    response = user.to_public_dict()
    print(f'[RESPONSE] me: {response}')
    return jsonify(response)


@user_bp.delete('/<int:user_id>')
@auth_required
@role_required('admin')
def delete_user(user_id: int):
    print(f'[REQUEST] delete_user: user_id={user_id}')
    current_app.logger.info('[users] delete_user: request to delete user_id=%d', user_id)
    deleted = UserService.delete_user(user_id)
    if not deleted:
        print(f'[RESPONSE] delete_user: Not found for user_id={user_id}')
        current_app.logger.warning('[users] delete_user: user_id=%d not found', user_id)
        return jsonify({'message': 'Not found'}), 404
    current_app.logger.info('[users] delete_user: user_id=%d deleted', user_id)
    response = {'deleted': True}
    print(f'[RESPONSE] delete_user: {response}')
    return jsonify(response)


@user_bp.put('/')
@auth_required
@role_required('admin')
def update_user():
    from flask import request
    print('[STEP] update_user: request received')
    data = request.get_json() or {}
    print(f'[REQUEST] update_user: {data}')
    current_app.logger.info('[users] update_user: payload received (sanitized) email=%s role=%s rank=%s status=%s is_active=%s department=%s',
                            str(data.get('email')), str(data.get('role')), str(data.get('rank')), str(data.get('status')), str(data.get('is_active')), str(data.get('department')))
    # Prevent username updates explicitly, ignore if provided
    if 'username' in data:
        print('[STEP] update_user: username present in payload and will be ignored')
        current_app.logger.info('[users] update_user: username present in payload and will be ignored')
        del data['username']
    # Require all fields to be present in the request
    required_fields = ['email', 'first_name', 'last_name', 'rank', 'status', 'role', 'department']
    missing = [f for f in required_fields if f not in data]
    empty = [f for f in required_fields if not str(data.get(f, '')).strip()]
    if missing or empty:
        print(f'[STEP] update_user: validation failed missing={missing} empty={empty}')
        current_app.logger.warning('[users] update_user: validation failed missing=%s empty=%s', missing, empty)
        problems = []
        if missing:
            problems.append(f"missing: {', '.join(missing)}")
        if empty:
            problems.append(f"empty: {', '.join(sorted(set(empty)))}")
        return jsonify({'message': '; '.join(problems)}), 400
    # Identify user by email
    print('[STEP] update_user: searching user by email')
    user = UserService.get_user_by_email(data['email'])
    if not user:
        print(f'[STEP] update_user: user not found for email={data["email"]}')
        current_app.logger.warning('[users] update_user: user not found for email=%s', str(data['email']))
        return jsonify({'message': 'Not found'}), 404
    # Lookup department by name
    print('[STEP] update_user: searching department by name')
    from ..services.department_service import DepartmentService
    dept = DepartmentService.get_by_name(data['department']) if 'department' in data else None
    if dept is None:
        print(f'[STEP] update_user: department not found name={data.get("department")}')
        current_app.logger.warning('[users] update_user: department not found name=%s', str(data.get('department')))
        return jsonify({'message': 'Department not found'}), 404
    # Prepare update fields
    print('[STEP] update_user: preparing update fields')
    update_fields = {k: data[k] for k in ['email', 'first_name', 'last_name', 'rank', 'status', 'role'] if k in data}
    update_fields['department_id'] = dept.id
    if 'is_active' in data:
        is_active = data['is_active']
        if isinstance(is_active, str):
            is_active = is_active.lower() in ('1', 'true', 'yes', 'on')
        update_fields['is_active'] = bool(is_active)
    print(f'[STEP] update_user: update_fields={update_fields}')
    try:
        print('[STEP] update_user: calling UserService.update_user')
        user = UserService.update_user(user.id, update_fields)
        print(f'[STEP] update_user: user id={user.id} updated successfully')
        current_app.logger.info('[users] update_user: user id=%d updated successfully', user.id)
    except ValueError as e:
        print(f'[STEP] update_user: validation error: {str(e)}')
        current_app.logger.warning('[users] update_user: validation error: %s', str(e))
        return jsonify({'message': str(e)}), 400
    print('[STEP] update_user: returning updated user')
    response = user.to_public_dict()
    print(f'[RESPONSE] update_user: {response}')
    return jsonify(response), 200


# ---- List investigators ----
@user_bp.get('/all_investigators')
@auth_required
@role_required("department_head")
def list_investigators():
    print('[STEP] list_investigators: request received')
    from ..models.user import User  # local import to avoid circulars
    from ..models.role import Role
    # Identify the authenticated department head user
    auth_user_id = get_jwt_identity()
    current_user = None
    if auth_user_id:
        try:
            current_user = User.query.get(int(auth_user_id))
        except Exception as e:  # defensive, should not generally occur
            current_app.logger.warning('[users] list_investigators: failed to load auth user id=%s error=%s', str(auth_user_id), str(e))
    if not current_user:
        print('[STEP] list_investigators: authenticated user not found')
        current_app.logger.warning('[users] list_investigators: authenticated user not found id=%s', str(auth_user_id))
        return jsonify({'investigators': [], 'count': 0}), 200
    dept_id = current_user.department_id
    print(f'[STEP] list_investigators: filtering by department_id={dept_id}')
    role = Role.query.filter_by(name='investigator').first()
    if not role:
        resp = {'investigators': [], 'count': 0}
        print('[RESPONSE] list_investigators: role investigator not found (empty)')
        return jsonify(resp), 200
    users = User.query.filter(User.role_id == role.id, User.department_id == dept_id).all()
    items = [u.to_public_dict() for u in users]
    resp = {'investigators': items, 'count': len(items)}
    print(f'[RESPONSE] list_investigators: count={len(items)}')
    return jsonify(resp), 200


# ---- List prosecutors in the same department (department_head only) ----
@user_bp.get('/all_prosecutors')
@auth_required
@role_required('department_head')
def list_prosecutors():
    """Return prosecutors in the authenticated department head's department.

    Response format:
    {
      "prosecutors": [
         {"id": "", "name": "", "badge": "", "department": "", "specialization": "", "currentCases": 0, "maxCases": 0, "status": ""}, ...
      ],
      "count": n
    }
    Notes:
      - specialization: placeholder (not modeled yet) -> "General"
      - currentCases: count of cases where user is current_assigned_prosecutor
      - maxCases: static placeholder 25 (adjust if business rule emerges)
      - badge: formatted PROS-<user_id>
    """
    print('[STEP] list_prosecutors: request received')
    from ..models.user import User
    from ..models.role import Role
    from ..models.case import Case
    auth_user_id = get_jwt_identity()
    dept_head = None
    if auth_user_id:
        try:
            dept_head = User.query.get(int(auth_user_id))
        except Exception as e:
            current_app.logger.warning('[users] list_prosecutors: failed loading auth user id=%s err=%s', str(auth_user_id), str(e))
    if not dept_head:
        print('[STEP] list_prosecutors: department head user not found')
        return jsonify({'prosecutors': [], 'count': 0}), 200
    dept_id = dept_head.department_id
    if not dept_id:
        print('[STEP] list_prosecutors: department head has no department')
        return jsonify({'prosecutors': [], 'count': 0}), 200
    role = Role.query.filter_by(name='prosecutor').first()
    if not role:
        print('[STEP] list_prosecutors: prosecutor role not found')
        return jsonify({'prosecutors': [], 'count': 0}), 200
    users = User.query.filter(User.role_id == role.id, User.department_id == dept_id).all()
    # Preload counts for efficiency (loop; acceptable for small dataset; optimize if large)
    items = []
    for u in users:
        current_case_count = Case.query.filter(Case.current_assigned_prosecutor_id == u.id).count()
        items.append({
            'id': str(u.id),
            'name': f"{u.first_name} {u.last_name}".strip(),
            'badge': f"PROS-{u.id}",
            'department': (u.department.name if u.department else None),
            'specialization': 'General',
            'currentCases': current_case_count,
            'maxCases': 25,
            'status': u.status,
        })
    resp = {'prosecutors': items, 'count': len(items)}
    print(f'[RESPONSE] list_prosecutors: count={len(items)}')
    return jsonify(resp), 200
