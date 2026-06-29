from flask import Flask
from flask_cors import CORS
from .config import Config
from .extensions import db, migrate, bcrypt, jwt


def create_app(config_class: type = Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)

    # Enable CORS — allow the frontend origin and any configured extra origins
    import os
    raw_origins = os.getenv("CORS_ORIGINS", "*")
    allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()] or ["*"]
    CORS(app, resources={r"/*": {"origins": allowed_origins}})

    # register blueprints (lazy import to avoid circulars)
    from .routes.auth_routes import auth_bp
    from .routes.user_routes import user_bp
    from .routes.department_routes import dept_bp
    from .routes.case_routes import case_bp
    from .routes.person_exhibit_routes import bp as case_entities_bp
    from .routes.daily_activity_routes import activity_bp
    from .routes.analytics_routes import analytics_bp
    from .routes.backup_routes import backup_bp
    from .routes.dashboard_routes import dashboard_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(dept_bp, url_prefix='/api/departments')
    app.register_blueprint(case_bp, url_prefix='/api/cases')
    app.register_blueprint(case_entities_bp, url_prefix='/api')
    app.register_blueprint(activity_bp, url_prefix='/api')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(backup_bp, url_prefix='/api/backup')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')

    # Ensure upload folder exists (idempotent)
    import os
    try:
        os.makedirs(app.config.get('UPLOAD_FOLDER'), exist_ok=True)
    except Exception as e:  # pragma: no cover
        app.logger.warning('Failed to create upload folder: %s', str(e))

    # register CLI seed commands
    try:
        from .seed.seed import register_seed_commands  # type: ignore
        register_seed_commands(app)
    except Exception as e:  # pragma: no cover
        # Avoid crashing app creation if optional seed module has an issue
        app.logger.warning(f"Seed command registration failed: {e}")

    # default root route
    @app.route('/', methods=['GET'])
    def root():  # pragma: no cover - trivial route
        return (
            "<!doctype html>\n"
            "<html lang=\"en\">\n"
            "<head>\n"
            "  <meta charset=\"utf-8\">\n"
            "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
            "  <title>federal api backend</title>\n"
            "  <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#0b1220;color:#e6e6e6} .card{padding:2rem 2.5rem;border-radius:12px;background:#111a2b;box-shadow:0 10px 30px rgba(0,0,0,.25)} h1{margin:0;font-size:1.5rem;letter-spacing:.3px}</style>\n"
            "</head>\n"
            "<body>\n"
            "  <div class=\"card\"><h1>federal api backend</h1></div>\n"
            "</body>\n"
            "</html>\n",
            200,
            {"Content-Type": "text/html; charset=utf-8"},
        )

    return app
