"""Database seeding utilities.

Usage (after setting FLASK_APP=run.py):
  flask seed all        # seeds roles, admin, and demo users
  flask seed roles      # only roles
  flask seed admin      # only admin user
  flask seed demo       # demo users

Idempotent: running multiple times will not duplicate roles/users.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.extensions import db, bcrypt
from sqlalchemy import text
from sqlalchemy.engine.url import make_url
from sqlalchemy.exc import SQLAlchemyError
from app.models.role import Role
from app.models.user import User, RANKS
from app.models.department import Department
from app.models.case import Case
from app.models.person import Person
from app.models.exhibit import Exhibit

BASE_DIR = Path(__file__).resolve().parent


def load_json(name: str) -> dict[str, Any]:
	path = BASE_DIR / name
	with path.open('r', encoding='utf-8') as f:
		return json.load(f)


def _create_database_if_missing() -> None:
	"""If using PostgreSQL and the target database is missing, attempt to create it.

	Works when the user has permission to create databases. For other engines,
	this is a no-op. Any errors are propagated for clarity.
	"""
	try:
		url = make_url(db.engine.url)
	except Exception:
		return
	if url.get_backend_name().startswith("postgresql") and url.database:
		dbname = url.database
		admin_url = url.set(database="postgres")
		from sqlalchemy import create_engine
		engine = create_engine(admin_url)
		with engine.connect() as conn:
			exists = conn.execute(text("SELECT 1 FROM pg_database WHERE datname=:n"), {"n": dbname}).scalar() is not None
			if not exists:
				conn.execution_options(isolation_level="AUTOCOMMIT").execute(text(f"CREATE DATABASE \"{dbname}\""))


def _ensure_tables() -> None:
	"""Create tables if they do not yet exist (safe/idempotent)."""
	try:
		db.create_all()
	except SQLAlchemyError as e:  # pragma: no cover
		# Attempt to create database if missing (Postgres), then retry once
		try:
			_create_database_if_missing()
			db.create_all()
			return
		except Exception:
			pass
		# Surface a clearer message while not masking original exception class
		raise RuntimeError(f"Failed ensuring database tables: {e}") from e


def seed_roles() -> list[Role]:
	_ensure_tables()
	roles: list[Role] = []
	# roles from demo_users.json
	demo = load_json('demo_users.json')
	for role_data in demo.get('roles', []):
		role = Role.query.filter_by(name=role_data['name']).first()
		if not role:
			role = Role(name=role_data['name'], description=role_data.get('description'))
			db.session.add(role)
		roles.append(role)

	# admin role from admin.json
	admin_data = load_json('admin.json')
	admin_role_info = admin_data['admin']['role']
	admin_role = Role.query.filter_by(name=admin_role_info['name']).first()
	if not admin_role:
		admin_role = Role(name=admin_role_info['name'], description=admin_role_info.get('description'))
		db.session.add(admin_role)
	roles.append(admin_role)

	db.session.commit()
	return roles


def _ensure_password_hash(password: str) -> str:
	return bcrypt.generate_password_hash(password).decode('utf-8')


def _gen_username(email: str) -> str:
	base = email.split('@')[0]
	candidate = base
	i = 1
	while User.query.filter_by(username=candidate).first():
		i += 1
		candidate = f"{base}{i}"
	return candidate


def _unique_username(preferred: str) -> str:
	"""Ensure a username is unique; if taken, append an incrementing number.

	Examples:
	  preferred -> preferred2 (if preferred exists), then preferred3, ...
	"""
	candidate = preferred.strip()
	if not candidate:
		candidate = "user"
	i = 1
	while User.query.filter_by(username=candidate).first():
		i += 1
		candidate = f"{preferred}{i}"
	return candidate


def seed_admin() -> User:
	_ensure_tables()
	data = load_json('admin.json')
	admin_info = data['admin']
	email = admin_info['email']
	user = User.query.filter_by(email=email).first()
	role = Role.query.filter_by(name=admin_info['role']['name']).first()
	if not role:
		role = Role(name=admin_info['role']['name'], description=admin_info['role'].get('description'))
		db.session.add(role)
		db.session.commit()
	if not user:
		# Default profile fields for admin; override if present in json
		preferred_username = admin_info.get('username')
		username = _unique_username(preferred_username) if preferred_username else _gen_username(email)
		first_name = admin_info.get('first_name') or 'Admin'
		last_name = admin_info.get('last_name') or 'User'
		rank = admin_info.get('rank') or RANKS[-1]  # Commissioner General as default highest
		user = User(
			email=email,
			username=username,
			first_name=first_name,
			last_name=last_name,
			rank=rank,
		)
		user.password_hash = _ensure_password_hash(admin_info['password'])
		user.role = role
		db.session.add(user)
		db.session.commit()
	return user


def seed_demo_users() -> list[User]:
	"""Seed demo users with department assignments.

	Expects each user object in demo_users.json to optionally contain:
	  - department: department name to assign (must exist or will be created minimal)
	Additionally ensures each existing department has at least one department_head user.
	"""
	_ensure_tables()
	data = load_json('demo_users.json')
	created: list[User] = []

	# Preload departments by name (case-insensitive map)
	existing_departments = {d.name.lower(): d for d in Department.query.all()}

	for user_data in data.get('users', []):
		email = user_data['email']
		user = User.query.filter_by(email=email).first()
		if user:
			continue
		role = Role.query.filter_by(name=user_data['role']).first()
		if not role:
			role = Role(name=user_data['role'])
			db.session.add(role)
			db.session.flush()
		preferred_username = user_data.get('username')
		username = _unique_username(preferred_username) if preferred_username else _gen_username(email)
		first_name = user_data.get('firstname') or user_data.get('first_name') or email.split('@')[0].title()
		last_name = user_data.get('lastname') or user_data.get('last_name') or 'User'
		rank = user_data.get('rank') or RANKS[0]

		dept_obj = None
		dept_name = user_data.get('department')
		if dept_name:
			dept_key = dept_name.strip().lower()
			dept_obj = existing_departments.get(dept_key)
			if not dept_obj:
				# Create department shell if not existing (minimal info)
				dept_obj = Department(name=dept_name.strip(), description='')
				db.session.add(dept_obj)
				db.session.flush()
				existing_departments[dept_key] = dept_obj

		user = User(
			email=email,
			username=username,
			first_name=first_name,
			last_name=last_name,
			rank=rank,
			department=dept_obj,
		)
		user.password_hash = _ensure_password_hash(user_data['password'])
		user.role = role
		db.session.add(user)
		created.append(user)

	db.session.commit() if created else None

	# Ensure each department has a department_head
	dept_head_role = Role.query.filter_by(name='department_head').first()
	if not dept_head_role:
		dept_head_role = Role(name='department_head', description='head of department')
		db.session.add(dept_head_role)
		db.session.commit()

	departments = Department.query.all()
	ensured_heads = 0
	for dept in departments:
		has_head = User.query.filter_by(department_id=dept.id).join(Role).filter(Role.name == 'department_head').first()
		if not has_head:
			# create a head user
			base_email = dept.name.lower().replace(' ', '_') + '_head@example.com'
			if User.query.filter_by(email=base_email).first():
				# adjust if collision
				i = 1
				candidate = base_email
				while User.query.filter_by(email=candidate).first():
					i += 1
					candidate = base_email.replace('@', f'{i}@')
				base_email = candidate
			head_user = User(
				email=base_email,
				username=_gen_username(base_email),
				first_name=dept.name.split()[0],
				last_name='Head',
				rank=RANKS[1],
				department=dept,
			)
			head_user.password_hash = _ensure_password_hash('AdminPass123!')
			head_user.role = dept_head_role
			db.session.add(head_user)
			ensured_heads += 1
	if ensured_heads:
		db.session.commit()
	return created


def seed_all() -> None:
	_ensure_tables()
	seed_roles()
	seed_admin()
	seed_demo_users()
	seed_departments()
	seed_cases()
	seed_persons()
	seed_exhibits()


def seed_departments() -> list[Department]:
	_ensure_tables()
	data = load_json('demo_departments.json')
	payload = data.get('departments', [])
	created: list[Department] = []
	for item in payload:
		name = item.get('name')
		if not name:
			continue
		dept = Department.query.filter(Department.name.ilike(name)).first()
		if dept:
			# update existing
			dept.description = item.get('description')
			dept.crimes = item.get('crimes') or []
			dept.is_active = bool(item.get('isActive', True))
		else:
			dept = Department(
				name=name.strip(),
				description=item.get('description'),
			)
			dept.crimes = item.get('crimes') or []
			dept.is_active = bool(item.get('isActive', True))
			db.session.add(dept)
		created.append(dept)
	if created:
		db.session.commit()
	return created


def seed_cases() -> list[Case]:
	"""Seed demo cases from demo_cases.json.

	Simplified JSON structure (remove any legacy assign_* fields – they will be ignored):
	{
	  "cases": [
	    { "title": "...", "crime": "...", "description": "...", "location": "...",
	      "reported_by": "...", "department": "Department Name" }
	  ]
	}

	Dynamic investigator assignment:
	  - Collect all users with the 'investigator' role.
	  - Prefer assigning an investigator from the same department (round‑robin per department).
	  - Fallback to a global round‑robin list if a department has no investigators.
	Idempotent by title: existing titles are skipped.
	"""
	_ensure_tables()
	created: list[Case] = []
	try:
		data = load_json('demo_cases.json')
	except FileNotFoundError:
		return []  # silently ignore if file absent

	existing_titles = {c[0] for c in db.session.query(Case.title).all()}
	items = data.get('cases', [])
	if not isinstance(items, list):
		return []

	# Preload investigators grouped by department for round-robin assignment
	inv_role_obj = Role.query.filter_by(name='investigator').first()
	dept_investigators: dict[int, list[int]] = {}
	global_investigators: list[int] = []
	if inv_role_obj:
		for u in User.query.filter_by(role=inv_role_obj).all():
			if u.department_id:
				dept_investigators.setdefault(u.department_id, []).append(u.id)
			global_investigators.append(u.id)

	# Round-robin indices
	dept_rr_index: dict[int, int] = {k: 0 for k in dept_investigators.keys()}
	global_rr_index = 0

	for item in items:
		if not isinstance(item, dict):
			continue
		title = str(item.get('title', '')).strip()
		crime = str(item.get('crime', '')).strip()
		if not title or not crime:
			continue
		if title in existing_titles:
			continue
		# Resolve department by name (optional)
		dept_name = item.get('department')
		dept = None
		if dept_name:
			dept = Department.query.filter(Department.name.ilike(str(dept_name).strip())).first()

		# Choose investigator (department-specific first, else global)
		chosen_investigator_id = None
		if dept and dept.id in dept_investigators and dept_investigators[dept.id]:
			lst = dept_investigators[dept.id]
			idx = dept_rr_index[dept.id] % len(lst)
			chosen_investigator_id = lst[idx]
			dept_rr_index[dept.id] += 1
		elif global_investigators:
			idx = global_rr_index % len(global_investigators)
			chosen_investigator_id = global_investigators[idx]
			global_rr_index += 1

		case = Case(
			title=title,
			crime=crime,
			description=str(item.get('description', '')).strip(),
			location=str(item.get('location', '')).strip() or None,
			reported_by=str(item.get('reported_by', '')).strip() or None,
			department_id=(dept.id if dept else None),
			current_assigned_investigator_id=chosen_investigator_id,
		)
		db.session.add(case)
		created.append(case)

	if created:
		try:
			db.session.commit()
		except Exception:
			db.session.rollback()
			raise
	return created


def register_seed_commands(app):  # called from application factory
	import click

	@app.cli.group()
	def seed():  # type: ignore
		"""Seeding commands"""
		pass

	@seed.command('roles')
	def seed_roles_cmd():  # type: ignore
		click.echo('Seeding roles...')
		seed_roles()
		click.echo('Roles done.')

	@seed.command('admin')
	def seed_admin_cmd():  # type: ignore
		click.echo('Seeding admin user...')
		seed_admin()
		click.echo('Admin done.')

	@seed.command('demo')
	def seed_demo_cmd():  # type: ignore
		click.echo('Seeding demo users...')
		count = len(seed_demo_users())
		click.echo(f'Demo users added: {count}')

	@seed.command('all')
	def seed_all_cmd():  # type: ignore
		click.echo('Seeding all data...')
		seed_all()
		click.echo('All data seeded.')

	@seed.command('departments')
	def seed_departments_cmd():  # type: ignore
		click.echo('Seeding departments...')
		count = len(seed_departments())
		click.echo(f'Departments processed: {count}')

	@seed.command('cases')
	def seed_cases_cmd():  # type: ignore
		click.echo('Seeding demo cases...')
		count = len(seed_cases())
		click.echo(f'Cases added: {count}')

	@seed.command('persons')
	def seed_persons_cmd():  # type: ignore
		click.echo('Seeding demo persons...')
		count = seed_persons()
		click.echo(f'Persons created: {count}')

	@seed.command('exhibits')
	def seed_exhibits_cmd():  # type: ignore
		click.echo('Seeding demo exhibits...')
		count = seed_exhibits()
		click.echo(f'Exhibits created: {count}')

	return app


# ---------------------------------------------------------------------------
# Additional demo seeders for Persons and Exhibits
# ---------------------------------------------------------------------------

def _load_optional_json(name: str) -> dict[str, Any] | None:
	try:
		return load_json(name)  # type: ignore
	except FileNotFoundError:
		return None


def seed_persons() -> int:
	"""Seed two demo persons per case if none exist.

	Supports optional demo_persons.json with structure:
	{
	  "persons": [
	    {
	      "case_title": "Robbery Network Crackdown",
	      "entries": [
	        {"type": "witness", "full_name": "Witness Name", "gender": "Male", "age": 30, "file_url": "demo/persons/{{DER}}/witness1.txt"},
	        {"type": "accused", "full_name": "Suspect Name", "gender": "Female", "age": 28, "file_url": "demo/persons/{{DER}}/suspect1.txt"}
	      ]
	    }
	  ]
	}

	If file not present, generic entries are generated inline.
	Idempotent: will not add persons to a case that already has any persons.
	Returns number of Person records created.
	"""
	_ensure_tables()
	data = _load_optional_json('demo_persons.json') or {}
	items = { (item.get('case_title') or '').strip(): item.get('entries', []) for item in data.get('persons', []) } if data else {}
	created = 0
	from datetime import date
	for case in Case.query.all():
		if case.persons.count() > 0:  # skip if already has persons
			continue
		entries = items.get(case.title)
		if not entries:
			# fallback generic two entries (no file_url; we purposely skip file population per requirement)
			entries = [
				{"type": "witness", "full_name": f"Primary Witness for {case.title}", "gender": "Unknown", "age": 40},
				{"type": "accused", "full_name": f"Primary Suspect for {case.title}", "gender": "Unknown", "age": 35},
			]
		for entry in entries:
			etype = (entry.get('type') or 'witness').strip()[:20]
			full_name = (entry.get('full_name') or 'Unknown Person').strip()[:255]
			age_val = entry.get('age')
			# derive a simple DOB if age provided (approximate: July 1 of (current_year - age))
			if isinstance(age_val, int) and age_val > 0:
				approx_year = date.today().year - age_val
				date_of_birth = date(approx_year, 7, 1)
			else:
				date_of_birth = None
			person = Person(
				case_der_number=case.der_number,
				type=etype,
				full_name=full_name,
				gender=entry.get('gender') or 'Unknown',
				age=age_val if isinstance(age_val, int) else None,
				date_of_birth=date_of_birth,
				nationality=entry.get('nationality') or 'Unknown',
				house_number=entry.get('house_number') or 'N/A',
				address=entry.get('address') or (case.location or 'Unknown Address'),
				region=entry.get('region') or 'Unknown Region',
				nation=entry.get('nation') or 'Unknown Nation',
				woreda=entry.get('woreda') or 'Unknown Woreda',
				kebele=entry.get('kebele') or 'Unknown Kebele',
				resident_id=entry.get('resident_id') or None,
				marital_status=entry.get('marital_status') or 'Unknown',
				education_status=entry.get('education_status') or 'Unknown',
				work_status=entry.get('work_status') or 'Unknown',
				phone_number=entry.get('phone_number') or None,
				description=entry.get('description') or f"Auto seeded person for case {case.title}",
				file_url=None,  # explicit per requirement: do not populate file URL
			)
			db.session.add(person)
			created += 1
	if created:
		try:
			db.session.commit()
		except Exception:
			db.session.rollback()
			raise
	return created


def seed_exhibits() -> int:
	"""Seed two demo exhibits per case if none exist.

	Optional demo_exhibits.json structure:
	{
	  "exhibits": [
	    {
	      "case_title": "Robbery Network Crackdown",
	      "entries": [
	        {"name": "Document Evidence", "description": "...", "quantity": 1, "file_url": "demo/exhibits/{{DER}}/doc1.pdf"},
	        {"name": "Digital Media", "description": "...", "quantity": 1, "file_url": "demo/exhibits/{{DER}}/media1.bin"}
	      ]
	    }
	  ]
	}

	If file missing, generic entries generated. Idempotent per case.
	Returns number created.
	"""
	_ensure_tables()
	data = _load_optional_json('demo_exhibits.json') or {}
	items = { (item.get('case_title') or '').strip(): item.get('entries', []) for item in data.get('exhibits', []) } if data else {}
	created = 0
	for case in Case.query.all():
		if case.exhibits.count() > 0:
			continue
		entries = items.get(case.title)
		if not entries:
			entries = [
				{"name": "Document Evidence", "description": f"Primary document related to {case.title}", "quantity": 1, "file_url": "demo/exhibits/{{DER}}/doc1.pdf"},
				{"name": "Digital Evidence", "description": f"Digital artifact seized for {case.title}", "quantity": 1, "file_url": "demo/exhibits/{{DER}}/digital1.bin"},
			]
		for entry in entries:
			name = (entry.get('name') or 'Exhibit').strip()[:255]
			quantity = entry.get('quantity')
			if isinstance(quantity, str):
				try:
					quantity = int(quantity)
				except ValueError:
					quantity = None
			exh = Exhibit(
				case_der_number=case.der_number,
				name=name,
				description=entry.get('description') or f"Auto seeded exhibit for case {case.title}",
				quantity=quantity,
				# Explicitly omit file_url and related person linkage per requirement
				file_url=None,
			)
			db.session.add(exh)
			created += 1
	if created:
		try:
			db.session.commit()
		except Exception:
			db.session.rollback()
			raise
	return created

