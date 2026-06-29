import os
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime, date
from pathlib import Path
from flask import Flask, jsonify, request, render_template
from config import Config
from app.extensions import db, login_manager, bcrypt, csrf

def create_app(config_class=Config):
    root_dir = Path(__file__).resolve().parent.parent
    app = Flask(
        __name__,
        template_folder='templates',
        static_folder=str(root_dir / 'static'),
        static_url_path='/static'
    )
    app.config.from_object(config_class)

    _ensure_directories(root_dir, app.config['UPLOAD_FOLDER'])

    if not app.debug and not app.testing:
        logs_dir = root_dir / 'logs'
        logs_dir.mkdir(exist_ok=True)
        file_handler = RotatingFileHandler(str(logs_dir / 'bizim-hikayemiz.log'), maxBytes=10240, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s [%(name)s] %(message)s'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('Bizim Hikayemiz starting up')

    db.init_app(app)
    login_manager.init_app(app)
    bcrypt.init_app(app)
    csrf.init_app(app)

    login_manager.login_view = 'admin.login'
    login_manager.login_message_category = 'info'

    @app.after_request
    def add_cache_headers(response):
        if request.path.startswith('/static/'):
            response.cache_control.public = True
            response.cache_control.max_age = 86400
        else:
            response.cache_control.no_cache = True
            response.cache_control.no_store = True
            response.cache_control.must_revalidate = True
        return response

    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Not found'}), 404
        return render_template('errors/404.html'), 404

    @app.errorhandler(500)
    def server_error(e):
        app.logger.error(f'Server error: {e}')
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Internal server error'}), 500
        return render_template('errors/500.html'), 500

    @app.errorhandler(413)
    def too_large(e):
        return jsonify({'error': 'Dosya boyutu çok büyük. Maksimum 50 MB.'}), 413

    from app.main.routes import main_bp
    app.register_blueprint(main_bp)

    from app.admin.routes import admin_bp
    app.register_blueprint(admin_bp, url_prefix='/admin')

    with app.app_context():
        db.create_all()
        _migrate_schema()
        _create_default_admin()
        _create_default_content()
        _create_default_settings()

    return app

def _migrate_schema():
    from app.models import SiteContent
    import sqlalchemy as sa
    try:
        with db.engine.connect() as conn:
            conn.execute(sa.text('ALTER TABLE site_content ADD COLUMN hero_background VARCHAR(200)'))
            conn.commit()
            app.logger.info('Added hero_background column to site_content')
    except Exception:
        pass

def _ensure_directories(root_dir, upload_folder):
    dirs = [
        root_dir / 'instance',
    ]
    for sub in ['', 'photos', 'music', 'night_sky', 'hero']:
        dirs.append(Path(upload_folder) / sub)
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)

def _create_default_admin():
    from app.models import User
    if not User.query.first():
        admin = User(username='admin')
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()

def _create_default_content():
    from app.models import SiteContent
    if not SiteContent.query.first():
        sc = SiteContent(
            title='Cerenim ❤️',
            subtitle='İyi ki hayatıma girdin.',
            relationship_date=date(2023, 1, 23),
            love_letter='Seni tanıdığım günden beri dünyam çok daha güzel bir yer oldu.\n\nGözlerindeki ışıltı her karanlık gecenin sabahı oldu. Gülüşün, en içten melodim.\n\nHer geçen gün sana olan sevgim biraz daha büyüyor. Hayatımın her anını seninle paylaşmak, her yıldızın altında elini tutmak istiyorum.\n\nSonsuza dek seninle olmak dileğiyle...',
        )
        db.session.add(sc)
        db.session.commit()

def _create_default_settings():
    from app.models import Setting
    defaults = {
        'theme_primary_color': '#e94560',
        'theme_secondary_color': '#ff6b6b',
        'theme_background_color': '#060612',
        'theme_text_color': '#f0f0f0',
        'animation_star_count': '1200',
        'animation_heart_count': '3',
        'animation_shooting_star_count': '2',
        'animation_floating_hearts': '3',
        'animation_floating_roses': '1',
        'animation_parallax': 'true',
        'animation_scroll_reveal': 'true',
    }
    for key, value in defaults.items():
        if not Setting.query.filter_by(key=key).first():
            category = 'theme' if key.startswith('theme') else 'animation'
            db.session.add(Setting(key=key, value=value, category=category))
    db.session.commit()
