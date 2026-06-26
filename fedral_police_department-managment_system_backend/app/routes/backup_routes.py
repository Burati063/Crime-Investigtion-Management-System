from __future__ import annotations

import json
import datetime as dt
from typing import List, Tuple, Any, Callable
from flask import Blueprint, jsonify, request, make_response

from ..middleware.auth_required import auth_required
from ..middleware.role_required import role_required

backup_bp = Blueprint('backup', __name__)


# ---------------------------------------------------------------------------
# Helper functions mirroring the provided Next.js example implementation
# ---------------------------------------------------------------------------
def _generate_table_data(table_id: str, count: int = 3) -> list[dict]:
	"""Legacy mock helper (retained for optional mock exports)."""
	rows: list[dict] = []
	for i in range(count):
		rows.append({
			'id': f"{table_id}-{i + 1}",
			'sample': f"Row {i + 1} of {table_id}",
		})
	return rows


def _escape_xml(val: str) -> str:
	return (
		str(val)
		.replace('&', '&amp;')
		.replace('<', '&lt;')
		.replace('>', '&gt;')
		.replace('"', '&quot;')
		.replace("'", '&apos;')
	)


def _build_content(tables: List[str], fmt: str) -> Tuple[str, str]:
	"""Return (mime, body) for requested format using real DB data.

	If a table id is unknown, it's skipped. Empty result sets are allowed.
	The structure mirrors the previous mock implementation but now reflects
	actual persisted records. For very large datasets this loads everything
	into memory; pagination/streaming can be added later if necessary.
	"""
	# Local imports (avoid circular issues during app initialization)
	try:  # pragma: no cover - runtime dependency
		from ..extensions import db
		from ..models.user import User
		from ..models.case import Case
		from ..models.department import Department
		from ..models.daily_activity import DailyActivity
		from ..models.person import Person
		from ..models.exhibit import Exhibit
		from ..models.role import Role
	except Exception as e:  # If models cannot be imported, fail early
		return 'application/json', json.dumps({'error': 'model import failure', 'detail': str(e)})

	# Type alias for serializer callables returning dictionaries
	SerializerType = Callable[[Any], dict]
	# mapping: table_id -> (ModelClass, serializer_fn, real_table_name)
	mapping = {
		'users': (User, lambda o: o.to_public_dict(), User.__tablename__),
		'cases': (Case, lambda o: o.to_dict(), Case.__tablename__),
		'departments': (Department, lambda o: o.to_dict(), Department.__tablename__),
		'daily_activity': (DailyActivity, lambda o: o.to_dict(), DailyActivity.__tablename__),
		'persons': (Person, lambda o: o.to_dict(), Person.__tablename__),
		'exhibits': (Exhibit, lambda o: o.to_dict(), Exhibit.__tablename__),
		'roles': (Role, lambda o: {'id': o.id, 'name': o.name, 'description': o.description}, Role.__tablename__),
	}

	# Collect serialized data per requested table id
	data: dict[str, list[dict]] = {}
	for tid in tables:
		entry = mapping.get(tid)
		if not entry:
			continue
		Model, serializer, _real_table = entry
		try:
			rows = Model.query.all()
			data[tid] = [serializer(r) for r in rows]
		except Exception as e:  # pragma: no cover
			data[tid] = [{'error': f'query failed: {e}'}]

	fmt = (fmt or 'json').lower().strip()
	if fmt == 'json':
		body_obj = {
			'exportedAt': dt.datetime.utcnow().isoformat() + 'Z',
			'tables': data,
		}
		return 'application/json', json.dumps(body_obj, ensure_ascii=False, indent=2)

	if fmt == 'csv':
		parts: list[str] = []
		for table, rows in data.items():
			# Union of keys across rows for stable header (sorted for determinism)
			all_keys: set[str] = set()
			for r in rows:
				all_keys.update(r.keys())
			headers = sorted(all_keys)
			parts.append(f"# Table: {table}")
			parts.append(','.join(headers))
			for r in rows:
				parts.append(','.join(json.dumps(r.get(h, '')) for h in headers))
			parts.append('')  # blank line
		return 'text/csv', '\n'.join(parts)

	if fmt == 'xml':
		xml = ["<?xml version=\"1.0\" encoding=\"UTF-8\"?>", f"<backup exportedAt=\"{dt.datetime.utcnow().isoformat()}Z\">"]
		for table, rows in data.items():
			xml.append(f"  <table name=\"{_escape_xml(table)}\">")
			for row in rows:
				xml.append("    <row>")
				for k, v in row.items():
					val = '' if v is None else v
					xml.append(f"      <{_escape_xml(k)}>{_escape_xml(val)}</{_escape_xml(k)}>")
				xml.append("    </row>")
			xml.append("  </table>")
		xml.append("</backup>")
		return 'application/xml', '\n'.join(xml) + '\n'

	if fmt == 'sql':
		statements: list[str] = [f"-- Backup export {dt.datetime.utcnow().isoformat()}Z"]
		# For SQL we iterate rows again, fetching actual column values from the model instances
		for table_id, (Model, _serializer, real_name) in mapping.items():
			if table_id not in tables:
				continue
			rows = Model.query.all()
			cols = [c.name for c in Model.__table__.columns]
			statements.append(f"-- Table: {real_name} (requested id: {table_id})")
			for obj in rows:
				vals_fragments: list[str] = []
				for c in cols:
					val = getattr(obj, c)
					if val is None:
						vals_fragments.append('NULL')
					elif isinstance(val, (dt.datetime, dt.date)):
						vals_fragments.append("'" + val.isoformat().replace("'", "''") + "'")
					else:
						vals_fragments.append("'" + str(val).replace("'", "''") + "'")
				cols_sql = ', '.join(f"`{c}`" for c in cols)
				vals_sql = ', '.join(vals_fragments)
				statements.append(f"INSERT INTO `{real_name}` ({cols_sql}) VALUES ({vals_sql});")
			statements.append('')
		return 'application/sql', '\n'.join(statements)

	# Fallback JSON (unexpected format)
	return 'application/json', json.dumps({'exportedAt': dt.datetime.utcnow().isoformat() + 'Z', 'tables': data}, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Dynamic export endpoint (POST) to mirror provided Next.js API behavior
# ---------------------------------------------------------------------------
@backup_bp.post('/dynamic_export')
@auth_required
@role_required('admin')
def dynamic_export():
	"""Export REAL database data in the requested format.

	Request JSON:
	  {
	    "tables": ["cases", "users"],
	    "format": "csv"   # one of json|csv|xml|sql (default json)
	  }

	Security considerations:
	- Exports are restricted to authenticated admin via decorators.
	- All rows are loaded into memory; for very large datasets consider
	  streaming, pagination, or background job with pre-signed download.
	"""
	print('[STEP] dynamic_export: request received')
	try:
		payload = request.get_json(force=True)
	except Exception:
		return jsonify({'error': 'Invalid JSON'}), 400

	tables = payload.get('tables')
	fmt = (payload.get('format') or 'json').lower()
	if not isinstance(tables, list) or not tables:
		return jsonify({'error': 'No tables selected'}), 400

	# Sanitize table identifiers (basic)
	clean_tables: list[str] = []
	for t in tables:
		if isinstance(t, str):
			val = t.strip()
			if val:
				clean_tables.append(val.replace(' ', '_')[:64])
	if not clean_tables:
		return jsonify({'error': 'No valid tables provided'}), 400

	allowed = {'json', 'csv', 'xml', 'sql'}
	if fmt not in allowed:
		fmt = 'json'

	mime, body = _build_content(clean_tables, fmt)

	# Create filename backup-YYYY-MM-DD-HH-MM-SS.<ext>
	ts = dt.datetime.utcnow().isoformat()
	safe_ts = ts.replace('T', '-').replace(':', '-').split('.')[0]
	filename = f"backup-{safe_ts}.{fmt}"

	resp = make_response(body, 200)
	resp.headers['Content-Type'] = mime
	resp.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
	resp.headers['X-Backup-Filename'] = filename
	resp.headers['X-Backup-Mode'] = 'real'
	resp.headers['Cache-Control'] = 'no-store'
	print(f'[RESPONSE] dynamic_export: format={fmt} tables={clean_tables} filename={filename} size={len(body)}')
	return resp


# ---------------------------------------------------------------------------
# Tables metadata endpoint for frontend table picker
# ---------------------------------------------------------------------------
@backup_bp.get('/tables')
@auth_required
@role_required('admin')
def list_tables():
	"""Return available logical tables and record counts.

	Response shape:
	{
	  "tables": [ {"id": "users", "name": "Users", "records": 42 }, ... ],
	  "count": 6
	}

	Table IDs align with the frontend mapping (iconMap) provided by user.
	"""
	print('[STEP] list_tables: request received')
	# Local imports to avoid circular dependencies
	try:
		from ..models.user import User
		from ..models.case import Case
		from ..models.department import Department
		from ..models.daily_activity import DailyActivity
		from ..models.person import Person
		from ..models.exhibit import Exhibit
	except Exception as e:  # pragma: no cover
		return jsonify({'message': 'model import failure', 'detail': str(e)}), 500

	def _safe_count(fn):
		try:
			return int(fn())
		except Exception:
			return 0

	tables = [
		{'id': 'users', 'name': 'Users', 'records': _safe_count(lambda: User.query.count())},
		{'id': 'cases', 'name': 'Cases', 'records': _safe_count(lambda: Case.query.count())},
		{'id': 'departments', 'name': 'Departments', 'records': _safe_count(lambda: Department.query.count())},
		{'id': 'daily_activity', 'name': 'Daily Activity', 'records': _safe_count(lambda: DailyActivity.query.count())},
		{'id': 'persons', 'name': 'Persons', 'records': _safe_count(lambda: Person.query.count())},
		{'id': 'exhibits', 'name': 'Exhibits', 'records': _safe_count(lambda: Exhibit.query.count())},
	]

	resp = {'tables': tables, 'count': len(tables)}
	print(f"[RESPONSE] list_tables: count={len(tables)}")
	return jsonify(resp), 200

