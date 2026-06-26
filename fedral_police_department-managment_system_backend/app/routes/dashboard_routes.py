from __future__ import annotations

from datetime import datetime, timedelta
from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import get_jwt_identity

from ..middleware.auth_required import auth_required
from ..middleware.role_required import role_required
from ..extensions import db

# Dashboard blueprint aggregates different information for a logged in user.
# Distinct from analytics which is broader / system level.

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.get('/admin')
@auth_required
@role_required('admin')
def admin_dashboard():
	"""Return lightweight admin dashboard aggregates.

	Response intentionally offers multiple access patterns so the
	frontend normalizer in the provided snippet can succeed regardless
	of which keys it inspects (stats / totals / recentActivities etc.).

	Shape (primary contract):
	{
	   "data": {
		  "stats": [ {"key":"totalUsers","title":"Total Users","value":10,"icon":"users"}, ...],
		  "recentActivities": [ {"id":1,"action":"Created case X","user":"Alice","time":"..."}, ...],
		  "meta": { ... optional }
	   },
	   // Convenience mirrors:
	   "dashboard": <same as data>,
	   "totals": { "totalUsers": 10, ... }
	}
	"""
	print('[STEP] admin_dashboard: request received')
	try:
		from ..models.user import User
		from ..models.case import Case
		from ..models.daily_activity import DailyActivity
	except Exception as e:  # pragma: no cover
		current_app.logger.error('[dashboard] import models failed: %s', str(e))
		return jsonify({'data': {}}), 500

	# Totals -----------------------------------------------------------------
	total_users = User.query.count()
	total_cases = Case.query.count()

	# Case status quick counts (resolved vs pending similar to analytics)
	resolved_statuses = {
		'closed',
		'accepted_by_prosecutor',
		'rejected',
		'rejected_by_prosecutor',
	}
	status_rows = (
		db.session.query(Case.status, db.func.count(Case.id))
		.group_by(Case.status)
		.all()
	)
	status_counts = {s: c for s, c in status_rows}
	resolved_cases = sum(cnt for st, cnt in status_counts.items() if st in resolved_statuses)
	pending_cases = max(total_cases - resolved_cases, 0)

	# Build stats array (explicit ordering helpful for UI)
	stats = [
		{ 'key': 'totalUsers', 'title': 'Total Users', 'value': int(total_users), 'icon': 'users' },
		{ 'key': 'totalCases', 'title': 'Total Cases', 'value': int(total_cases), 'icon': 'cases' },
		{ 'key': 'pendingCases', 'title': 'Pending Cases', 'value': int(pending_cases), 'icon': 'pending' },
		{ 'key': 'resolvedCases', 'title': 'Resolved Cases', 'value': int(resolved_cases), 'icon': 'completed' },
	]

	totals = {
		'totalUsers': int(total_users),
		'totalCases': int(total_cases),
		'pendingCases': int(pending_cases),
		'resolvedCases': int(resolved_cases),
	}

	# Recent Activities ------------------------------------------------------
	# Latest 10 daily activities (could be expanded / filtered by timeframe)
	recent_activity_rows = (
		DailyActivity.query.order_by(DailyActivity.created_at.desc()).limit(10).all()
	)
	# Preload users to avoid N+1 (simple id map)
	user_ids = {a.investigator_id for a in recent_activity_rows if a.investigator_id}
	users_map = {u.id: u for u in (User.query.filter(User.id.in_(user_ids)).all() if user_ids else [])}
	activities = []
	for a in recent_activity_rows:
		u = users_map.get(a.investigator_id)
		fullname = f"{u.first_name} {u.last_name}".strip() if u else 'System'
		activities.append({
			'id': a.id,
			'action': a.description[:140] if a.description else 'Activity',
			'user': fullname,
			'time': a.created_at.isoformat() if a.created_at else None,
		})

	payload = {
		'stats': stats,
		'recentActivities': activities,
		'totals': totals,  # included inside for convenience (frontend may ignore)
		'meta': {
			'generatedAt': datetime.utcnow().isoformat() + 'Z'
		}
	}

	# Provide flexible keys for client fallbacks
	resp = {
		'data': payload,
		'dashboard': payload,  # alias
		'totals': totals,
	}
	print(f"[RESPONSE] admin_dashboard: totals={totals}")
	return jsonify(resp), 200


@dashboard_bp.get('/pre-investigation')
@auth_required
@role_required('pre_investigation')
def pre_investigation_dashboard():
	"""Return dashboard data tailored for pre-investigation role.

	Stats semantics:
	  - casesRegisteredToday: number of cases created today (UTC) by any pre-investigation user OR with a pre_investigator_id set.
	  - totalCasesThisMonth: number of cases created in the current calendar month.
	  - pendingAssignment: cases still in an initial state considered waiting for investigator assignment (statuses: new, investigating? -> we'll treat only 'new').
	  - pendingCases: alias of pendingAssignment (client may look for either).

	Recent activities: last 10 DailyActivity rows (could be filtered to those whose related case has a pre_investigator, but we keep broad for context).
	"""
	print('[STEP] pre_investigation_dashboard: request received')
	try:
		from ..models.case import Case
		from ..models.daily_activity import DailyActivity
		from ..models.user import User
	except Exception as e:  # pragma: no cover
		current_app.logger.error('[dashboard] pre_investigation import error: %s', str(e))
		return jsonify({'data': {}}), 500

	now = datetime.utcnow()
	today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
	month_start = today_start.replace(day=1)

	# Query counts -----------------------------------------------------------
	cases_registered_today = Case.query.filter(Case.created_at >= today_start).count()
	total_cases_this_month = Case.query.filter(Case.created_at >= month_start).count()
	# Pending assignment = status == 'new'
	pending_assignment = Case.query.filter(Case.status == 'new').count()

	totals = {
		'casesRegisteredToday': int(cases_registered_today),
		'totalCasesThisMonth': int(total_cases_this_month),
		'pendingAssignment': int(pending_assignment),
		'pendingCases': int(pending_assignment),  # alias key
	}

	stats = [
		{ 'key': 'casesRegisteredToday', 'title': 'Cases Registered Today', 'value': totals['casesRegisteredToday'], 'icon': 'today' },
		{ 'key': 'totalCasesThisMonth', 'title': 'Total Cases This Month', 'value': totals['totalCasesThisMonth'], 'icon': 'month' },
		{ 'key': 'pendingAssignment', 'title': 'Pending Assignment', 'value': totals['pendingAssignment'], 'icon': 'assignment' },
		{ 'key': 'pendingCases', 'title': 'Pending Cases', 'value': totals['pendingCases'], 'icon': 'pending' },
	]

	# Activities -------------------------------------------------------------
	recent_activity_rows = (
		DailyActivity.query.order_by(DailyActivity.created_at.desc()).limit(10).all()
	)
	user_ids = {a.investigator_id for a in recent_activity_rows if a.investigator_id}
	users_map = {u.id: u for u in (User.query.filter(User.id.in_(user_ids)).all() if user_ids else [])}
	activities = []
	for a in recent_activity_rows:
		u = users_map.get(a.investigator_id)
		full = f"{u.first_name} {u.last_name}".strip() if u else 'System'
		activities.append({
			'id': a.id,
			'action': a.description[:140] if a.description else 'Activity',
			'department': (u.department.name if u and u.department else None),
			'time': a.created_at.isoformat() if a.created_at else None,
		})

	payload = {
		'stats': stats,
		'recentActivities': activities,
		'totals': totals,
		'meta': { 'generatedAt': now.isoformat() + 'Z' }
	}
	resp = {
		'data': payload,
		'dashboard': payload,
		'totals': totals,
	}
	print(f"[RESPONSE] pre_investigation_dashboard: totals={totals}")
	return jsonify(resp), 200


@dashboard_bp.get('/investigator')
@auth_required
@role_required('investigator')
def investigator_dashboard():
	"""Return dashboard data for an investigator user.

	Stats provided (keys chosen to match frontend fallbacks):
	  - assignedCases: count of cases currently assigned to investigator.
	  - completedCases: subset of assigned cases in resolved statuses.
	  - pendingReports: assigned cases still in an active (non-resolved) investigative state.
	  - openCases: alias of pendingReports for compatibility.

	recentCases: last 10 assigned cases (by updated_at desc) with derived deadline
	  (reported_date + ~60 days). 'caseId' uses DER number for uniqueness & readability.
	"""
	print('[STEP] investigator_dashboard: request received')
	identity = get_jwt_identity()
	try:
		investigator_id = int(identity) if identity is not None else None
	except (TypeError, ValueError):
		return jsonify({'data': {}}), 401
	if investigator_id is None:
		return jsonify({'data': {}}), 401
	try:
		from ..models.case import Case
	except Exception as e:  # pragma: no cover
		current_app.logger.error('[dashboard] investigator import error: %s', str(e))
		return jsonify({'data': {}}), 500

	resolved_statuses = {
		'closed',
		'accepted_by_prosecutor',
		'rejected',
		'rejected_by_prosecutor',
	}

	# Base query of cases assigned to this investigator
	q = Case.query.filter(Case.current_assigned_investigator_id == investigator_id)
	assigned_count = q.count()
	# Completed subset
	completed_count = q.filter(Case.status.in_(list(resolved_statuses))).count()
	# Pending reports = assigned but not resolved
	pending_count = max(assigned_count - completed_count, 0)

	totals = {
		'assignedCases': int(assigned_count),
		'completedCases': int(completed_count),
		'pendingReports': int(pending_count),
		'openCases': int(pending_count),  # alias
	}

	stats = [
		{ 'key': 'assignedCases', 'title': 'Assigned Cases', 'value': totals['assignedCases'], 'icon': 'assigned' },
		{ 'key': 'completedCases', 'title': 'Completed Cases', 'value': totals['completedCases'], 'icon': 'completed' },
		{ 'key': 'pendingReports', 'title': 'Pending Reports', 'value': totals['pendingReports'], 'icon': 'pending' },
		{ 'key': 'openCases', 'title': 'Open Cases', 'value': totals['openCases'], 'icon': 'cases' },
	]

	# Recent assigned cases -------------------------------------------------
	# Order by most recently updated to surface active work
	recent_rows = (
		q.order_by(Case.updated_at.desc()).limit(10).all()
	)
	recent_cases = []
	for c in recent_rows:
		# Derive simple deadline ~60 days from reported_date
		deadline_iso = None
		try:
			if c.reported_date:
				deadline_iso = (c.reported_date + timedelta(days=60)).isoformat()
		except Exception:  # pragma: no cover - defensive
			deadline_iso = None
		recent_cases.append({
			'id': c.id,
			'caseId': c.der_number or c.cr_number or str(c.id),
			'title': c.title or 'Untitled Case',
			'status': c.status,
			'deadline': deadline_iso,
		})

	now = datetime.utcnow()
	payload = {
		'stats': stats,
		'recentCases': recent_cases,
		'totals': totals,
		'meta': { 'generatedAt': now.isoformat() + 'Z' }
	}
	resp = {
		'data': payload,
		'dashboard': payload,
		'totals': totals,
	}
	print(f"[RESPONSE] investigator_dashboard: totals={totals}")
	return jsonify(resp), 200


@dashboard_bp.get('/department-head')
@auth_required
@role_required('department_head')
def department_head_dashboard():
	"""Return dashboard data for a department head.

	Conforms to the DepartmentHeadDashboardData shape expected by the frontend snippet:
	{
	  "data": {
	     "stats": [ {key,title,value,icon?}, ... ],
	     "pendingCases": [ {id,caseId,title,priority?,received}, ... ],
	     "meta": { generatedAt }
	  },
	  // Aliases for flexible client normalizers
	  "dashboard": <same>,
	  "totals": { <flattened counts> }
	}

	Definitions (department scoped):
	- pendingCases: cases with (status in ['new','investigating','submitted']) AND no investigator assigned.
	- assignedCases: cases where current_assigned_investigator_id is not null.
	- assignedToday: subset of assignedCases whose updated_at is today (UTC start).
	- availableInvestigators: active users in department with role 'investigator'.
	"""
	print('[STEP] department_head_dashboard: request received')
	identity = get_jwt_identity()
	try:
		user_id = int(identity) if identity is not None else None
	except (TypeError, ValueError):
		return jsonify({'data': {}}), 401
	if user_id is None:
		return jsonify({'data': {}}), 401

	try:
		from ..models.user import User
		from ..models.role import Role
		from ..models.case import Case
	except Exception as e:  # pragma: no cover
		current_app.logger.error('[dashboard] department_head import error: %s', str(e))
		return jsonify({'data': {}}), 500

	user = User.query.get(user_id)
	if not user or not user.department_id:
		return jsonify({'message': 'department context missing'}), 404
	dept_id = user.department_id

	now = datetime.utcnow()
	today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

	# Identify investigator role once (if absent treat as zero available investigators)
	investigator_role = Role.query.filter_by(name='investigator').first()

	# Base scoped query
	dept_cases_q = Case.query.filter(Case.department_id == dept_id)

	# Pending cases: in early statuses & not assigned
	pending_statuses = {'new', 'investigating', 'submitted'}
	pending_cases_q = dept_cases_q.filter(
		Case.status.in_(list(pending_statuses)),
		Case.current_assigned_investigator_id.is_(None)
	)
	pending_cases_count = pending_cases_q.count()

	# Assigned cases
	assigned_cases_q = dept_cases_q.filter(Case.current_assigned_investigator_id.isnot(None))
	assigned_cases_count = assigned_cases_q.count()

	# Assigned today (updated today & has investigator)
	assigned_today_count = assigned_cases_q.filter(Case.updated_at >= today_start).count()

	# Available investigators (active investigators in dept)
	if investigator_role:
		available_investigators_count = User.query.filter(
			User.department_id == dept_id,
			User.role_id == investigator_role.id,
			User.status == 'active'
		).count()
	else:
		available_investigators_count = 0

	# Prepare pending cases list (limit 10)
	pending_case_rows = pending_cases_q.order_by(Case.created_at.desc()).limit(10).all()
	pending_cases_list = []
	for c in pending_case_rows:
		pending_cases_list.append({
			'id': c.id,
			'caseId': c.der_number or c.cr_number or str(c.id),
			'title': c.title or 'Untitled Case',
			'priority': None,  # placeholder (no explicit priority field on model)
			'received': (c.created_at.isoformat() if c.created_at else None),
		})

	# Totals flatten for consumer fallback
	totals = {
		'pendingCases': int(pending_cases_count),
		'availableInvestigators': int(available_investigators_count),
		'assignedCases': int(assigned_cases_count),
		'assignedToday': int(assigned_today_count),
	}

	# Stats array with icon keys that match provided frontend iconMap
	stats = [
		{ 'key': 'pendingCases', 'title': 'Pending Cases', 'value': totals['pendingCases'], 'icon': 'pending' },
		{ 'key': 'availableInvestigators', 'title': 'Available Investigators', 'value': totals['availableInvestigators'], 'icon': 'investigators' },
		{ 'key': 'assignedCases', 'title': 'Assigned Cases', 'value': totals['assignedCases'], 'icon': 'assigned' },
		{ 'key': 'assignedToday', 'title': 'Assigned Today', 'value': totals['assignedToday'], 'icon': 'assignedtoday' },
	]

	payload = {
		'stats': stats,
		'pendingCases': pending_cases_list,
		'totals': totals,
		'meta': { 'generatedAt': now.isoformat() + 'Z', 'departmentId': dept_id }
	}
	resp = {
		'data': payload,
		'dashboard': payload,
		'totals': totals,
	}
	print(f"[RESPONSE] department_head_dashboard: totals={totals}")
	return jsonify(resp), 200


@dashboard_bp.get('/prosecutor')
@auth_required
@role_required('prosecutor')
def prosecutor_dashboard():
	"""Return dashboard data for a prosecutor user.

	Provides shape expected by ProsecutorDashboardData frontend contract:
	{
	  data: { stats: [...], recentCases: [...], meta },
	  dashboard: <alias>,
	  totals: { ... flat counts }
	}

	Stats semantics (all scoped to current prosecutor id):
	- activeCases: cases assigned to prosecutor in statuses awaiting decision or follow-up
	               (submitted, under_prosecutor_review, request_reinvestigation, reopened).
	- acceptedCases: cases with status 'accepted_by_prosecutor'.
	- rejectedCases: cases with status in {'rejected_by_prosecutor','rejected'}.
	- modificationRequests: cases with status 'request_reinvestigation' (alias category).
	- pendingReview: cases in submitted or under_prosecutor_review (subset of active).

	recentCases: latest 10 assigned cases (by updated_at desc) with received timestamp (created_at).
	"""
	print('[STEP] prosecutor_dashboard: request received')
	identity = get_jwt_identity()
	try:
		prosecutor_id = int(identity) if identity is not None else None
	except (TypeError, ValueError):
		return jsonify({'data': {}}), 401
	if prosecutor_id is None:
		return jsonify({'data': {}}), 401

	try:
		from ..models.case import Case
	except Exception as e:  # pragma: no cover
		current_app.logger.error('[dashboard] prosecutor import error: %s', str(e))
		return jsonify({'data': {}}), 500

	# Define categorization sets
	accepted_statuses = {'accepted_by_prosecutor'}
	rejected_statuses = {'rejected_by_prosecutor', 'rejected'}
	mod_request_statuses = {'request_reinvestigation'}
	pending_review_statuses = {'submitted', 'under_prosecutor_review'}
	# active = pending review + modification + reopened
	active_inclusive_statuses = pending_review_statuses | mod_request_statuses | {'reopened'}

	# Base query: cases assigned to current prosecutor
	assigned_q = Case.query.filter(Case.current_assigned_prosecutor_id == prosecutor_id)

	# Counts (issue separate lightweight queries for clarity; could be optimized with CASE expressions)
	accepted_cases = assigned_q.filter(Case.status.in_(list(accepted_statuses))).count()
	rejected_cases = assigned_q.filter(Case.status.in_(list(rejected_statuses))).count()
	modification_requests = assigned_q.filter(Case.status.in_(list(mod_request_statuses))).count()
	pending_review = assigned_q.filter(Case.status.in_(list(pending_review_statuses))).count()
	active_cases = assigned_q.filter(Case.status.in_(list(active_inclusive_statuses))).count()

	totals = {
		'activeCases': int(active_cases),
		'acceptedCases': int(accepted_cases),
		'rejectedCases': int(rejected_cases),
		'modificationRequests': int(modification_requests),
		'pendingReview': int(pending_review),
	}

	stats = [
		{ 'key': 'activeCases', 'title': 'Active Cases', 'value': totals['activeCases'], 'icon': 'active' },
		{ 'key': 'acceptedCases', 'title': 'Accepted Cases', 'value': totals['acceptedCases'], 'icon': 'accepted' },
		{ 'key': 'rejectedCases', 'title': 'Rejected Cases', 'value': totals['rejectedCases'], 'icon': 'rejected' },
		{ 'key': 'modificationRequests', 'title': 'Modification Requests', 'value': totals['modificationRequests'], 'icon': 'modification' },
		{ 'key': 'pendingReview', 'title': 'Pending Review', 'value': totals['pendingReview'], 'icon': 'pending' },
	]

	# Recent cases (limit 10)
	recent_rows = assigned_q.order_by(Case.updated_at.desc()).limit(10).all()
	recent_cases = []
	for c in recent_rows:
		recent_cases.append({
			'id': c.id,
			'caseId': c.der_number or c.cr_number or str(c.id),
			'title': c.title or 'Untitled Case',
			'status': c.status,
			'received': (c.created_at.isoformat() if c.created_at else None),
		})

	now = datetime.utcnow()
	payload = {
		'stats': stats,
		'recentCases': recent_cases,
		'totals': totals,
		'meta': { 'generatedAt': now.isoformat() + 'Z' }
	}
	resp = {
		'data': payload,
		'dashboard': payload,
		'totals': totals,
	}
	print(f"[RESPONSE] prosecutor_dashboard: totals={totals}")
	return jsonify(resp), 200

