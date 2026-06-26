# Flask Clean API Skeleton

A minimal, layered Flask API structure with separation of concerns (models, services, routes, middleware, utils) and JWT auth.

## Structure
```
flask_clean_api/
  app/
    models/
      user.py
      role.py
    services/
      auth_service.py
      user_service.py
    routes/
      auth_routes.py
      user_routes.py
    middleware/
      auth_required.py
      role_required.py
    utils/
      jwt_utils.py
      password_utils.py
    config.py
    extensions.py
    __init__.py
  run.py
  requirements.txt
  .env
  README.md
```

## Quick start
1. Create virtual environment
```
python -m venv .venv
.venv\Scripts\activate  # Windows
```
2. Install dependencies
```
pip install -r requirements.txt
```
3. Run app
```
python run.py
```
4. Test endpoints (examples):
```
POST /api/auth/register {"email": "a@example.com", "password": "pass"}
POST /api/auth/login {"email": "a@example.com", "password": "pass"}
GET  /api/users/ (with Bearer token)
```

## Migrations (optional)
```
flask db init
flask db migrate -m "init"
flask db upgrade
```
(You may need to set FLASK_APP=run.py)

## Notes
- Uses JWT access tokens only (no refresh for brevity).
- Role-based access via custom decorator.
- Adjust config in `.env`.

## Seeding Data
Seed scripts are provided in `app/seed/` with JSON files:
- `admin.json` for the primary admin account and its role
- `demo_users.json` for additional roles and demo users

Commands (ensure database and migrations applied first):
```
set FLASK_APP=run.py  # Windows PowerShell: $Env:FLASK_APP = "run.py"
flask seed roles      # seed only roles
flask seed admin      # seed only admin user
flask seed demo       # seed demo users
flask seed all        # seed everything
```
All commands are idempotent: running again won't duplicate entries.

## Docker (Production)
Build and run the production image (reads env from .env automatically):
```
docker build -t federal .
docker run --rm -p 8000:8000 federal
```

Environment variables you likely want to set:
- SECRET_KEY
- JWT_SECRET_KEY
- DATABASE_URL (e.g., postgresql+psycopg2://user:pass@host:5432/db)
- JWT_EXPIRES_MINUTES

The container runs with gunicorn on port 8000 and uses `wsgi:app`.

### Using a .env file
This project automatically loads variables from a `.env` file using `python-dotenv`.
By default, `.env` is copied into the Docker image (see Dockerfile), so `docker run` needs no extra `-e` flags. If you prefer not to include `.env` in images, remove that step in the Dockerfile and run with `--env-file .env` instead.
