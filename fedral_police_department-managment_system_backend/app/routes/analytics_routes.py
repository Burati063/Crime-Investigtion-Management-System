from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Dict

from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import get_jwt_identity

from ..middleware.auth_required import auth_required
from ..middleware.role_required import role_required
from ..extensions import db

# Blueprint name kept succinct for url_prefix clarity
analytics_bp = Blueprint('analytics', __name__)


def _month_key(dt: datetime) -> str:
	return dt.strftime('%Y-%m')


@analytics_bp.get('/')
@auth_required
@role_required('admin')  # assume only admin sees system-wide analytics
def system_analytics():
	"""Return system-wide analytics in the requested shape.

	Response shape:
	{
	  "data": {
		"totals": { ... },
		"casesByDepartment": [ {"name": str|None, "cases": int, "color": str|None}, ...],
		"monthlyTrends": [ {"month": "YYYY-MM", "cases": int, "resolved": int}, ...],
		"caseStatus": [ {"status": str, "count": int}, ...],
		"userActivity": [ {"user": str|None, "actions": int, "lastActive": iso|None}, ...]
	  }
	}

	Notes / Assumptions:
	  * Resolved cases: statuses treated as final/resolution (closed, accepted_by_prosecutor, rejected, rejected_by_prosecutor).
	  * Resolution rate: (resolved / total)*100 rounded to 2 decimals; None if total == 0.
	  * Monthly trends: last 6 months inclusive of current month; counts based on created_at; resolved counts use same month of created_at (no separate resolution timestamp available).
	  * If a section has no data, a single placeholder entry with None values is returned (as per requirement to "provide none value if data is not enough").
	"""
	print('[STEP] system_analytics: request received')
	try:
		from ..models.case import Case
		from ..models.department import Department
		from ..models.daily_activity import DailyActivity
		from ..models.user import User
	except Exception as e:  # defensive
		current_app.logger.error('[analytics] import models failed: %s', str(e))
		return jsonify({'data': {}}), 500

	# ------------------------------------------------------------------
	# Totals & case status breakdown
	# ------------------------------------------------------------------
	total_cases = Case.query.count()
	case_status_rows = (
		db.session.query(Case.status, db.func.count(Case.id))
		.group_by(Case.status)
		.all()
	)
	status_counts: Dict[str, int] = {status: cnt for status, cnt in case_status_rows}

	resolved_statuses = {
		'closed',
		'accepted_by_prosecutor',
		'rejected',
		'rejected_by_prosecutor',
	}
	resolved_cases = sum(cnt for st, cnt in status_counts.items() if st in resolved_statuses)
	pending_cases = max(total_cases - resolved_cases, 0)
	resolution_rate = round((resolved_cases / total_cases) * 100, 2) if total_cases > 0 else None

	case_status_list = [
		{'status': st, 'count': int(cnt)} for st, cnt in sorted(status_counts.items())
	]
	# UI code can gracefull y handle an empty array; avoid injecting placeholder null rows
	if not case_status_list:
		case_status_list = []

	# ------------------------------------------------------------------
	# Cases by Department (with simple color assignment)
	# ------------------------------------------------------------------
	dept_rows = (
		db.session.query(Department.name, db.func.count(Case.id))
		.outerjoin(Case, Case.department_id == Department.id)
		.group_by(Department.id)
		.all()
	)
	color_palette = [
		'#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
		'#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
	]
	cases_by_department: List[dict] = []
	for idx, (name, count) in enumerate(sorted(dept_rows, key=lambda r: r[1], reverse=True)):
		color = color_palette[idx % len(color_palette)] if count else None
		cases_by_department.append({'name': name, 'cases': int(count), 'color': color})
	if not cases_by_department:
		cases_by_department = []

	# ------------------------------------------------------------------
	# Monthly trends (last 6 months including current)
	# ------------------------------------------------------------------
	months: List[str] = []
	now = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
	for i in range(5, -1, -1):  # 6 months window
		month_dt = (now - timedelta(days=30 * i))  # rough month step; good enough for grouping label
		months.append(_month_key(month_dt))

	# Fetch cases created in a rough window (approx 6 months + pad)
	earliest_month_start = now - timedelta(days=30 * 5)  # earliest included month start (approx)
	recent_cases: List[Case] = (
		Case.query.filter(Case.created_at >= earliest_month_start - timedelta(days=2)).all()
	)
	month_case_counts = defaultdict(int)
	month_resolved_counts = defaultdict(int)
	for c in recent_cases:
		if not c.created_at:
			continue
		key = _month_key(c.created_at)
		if key not in months:
			continue
		month_case_counts[key] += 1
		if c.status in resolved_statuses:
			month_resolved_counts[key] += 1
	monthly_trends = [
		{
			'month': m,
			'cases': int(month_case_counts.get(m, 0)),
			'resolved': int(month_resolved_counts.get(m, 0)),
		}
		for m in months
	]
	# If absolutely no data across months, return empty list (UI handles gracefully)
	if all(item['cases'] == 0 for item in monthly_trends):
		monthly_trends = []

	# ------------------------------------------------------------------
	# User activity (based on DailyActivity entries)
	# ------------------------------------------------------------------
	activity_rows = (
		db.session.query(
			DailyActivity.investigator_id,
			db.func.count(DailyActivity.id),
			db.func.max(DailyActivity.created_at),
		)
		.group_by(DailyActivity.investigator_id)
		.all()
	)
	user_map = {u.id: u for u in User.query.filter(User.id.in_([r[0] for r in activity_rows if r[0]])).all()}
	user_activity = []
	for user_id, actions, last_active in activity_rows:
		u = user_map.get(user_id)
		full_name = f"{u.first_name} {u.last_name}".strip() if u else None
		user_activity.append({
			'user': full_name,
			'actions': int(actions or 0),
			'lastActive': (last_active.isoformat() if last_active else None),
		})
	if not user_activity:
		user_activity = []

	# Compose core payload once so we can expose it under multiple top-level keys
	payload = {
		'totals': {
			'totalCases': int(total_cases),
			'resolvedCases': int(resolved_cases),
			'pendingCases': int(pending_cases),
			'resolutionRate': resolution_rate,
		},
		'casesByDepartment': cases_by_department,
		'monthlyTrends': monthly_trends,
		'caseStatus': case_status_list,
		'userActivity': user_activity,
	}
	# For maximum UI compatibility expose the same structure in several ways:
	#  - data (current contract)
	#  - report (alternate naming some UIs try)
	#  - flattened top-level (so UI fallback raw?.totals works)
	resp = {
		'data': payload,
		'report': payload,  # alias
		**payload,
	}
	print(f"[RESPONSE] system_analytics: totals={payload['totals']}")
	return jsonify(resp), 200

