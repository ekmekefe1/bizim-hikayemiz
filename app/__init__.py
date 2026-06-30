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

    # Configure Cloudinary
    _configure_cloudinary(app)

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
        _migrate_local_to_cloudinary(app)
        _create_default_admin()
        _create_default_content()
        _create_default_settings()

    return app

def _configure_cloudinary(app):
    cloud_name = app.config.get('CLOUDINARY_CLOUD_NAME', '')
    api_key = app.config.get('CLOUDINARY_API_KEY', '')
    api_secret = app.config.get('CLOUDINARY_API_SECRET', '')
    if cloud_name and api_key and api_secret:
        import cloudinary
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )
        app.logger.info('Cloudinary configured successfully')
    else:
        app.logger.warning('Cloudinary not configured — missing credentials')

def _migrate_schema():
    from app.models import Photo, MusicTrack
    import sqlalchemy as sa
    try:
        with db.engine.connect() as conn:
            conn.execute(sa.text('ALTER TABLE photo ADD COLUMN cloudinary_url VARCHAR(500)'))
            conn.commit()
    except Exception:
        pass
    try:
        with db.engine.connect() as conn:
            conn.execute(sa.text('ALTER TABLE photo ADD COLUMN cloudinary_public_id VARCHAR(200)'))
            conn.commit()
    except Exception:
        pass
    try:
        with db.engine.connect() as conn:
            conn.execute(sa.text('ALTER TABLE music_track ADD COLUMN cloudinary_url VARCHAR(500)'))
            conn.commit()
    except Exception:
        pass
    try:
        with db.engine.connect() as conn:
            conn.execute(sa.text('ALTER TABLE music_track ADD COLUMN cloudinary_public_id VARCHAR(200)'))
            conn.commit()
    except Exception:
        pass
    try:
        with db.engine.connect() as conn:
            conn.execute(sa.text('ALTER TABLE site_content ADD COLUMN hero_background VARCHAR(500)'))
            conn.commit()
    except Exception:
        pass
    try:
        with db.engine.connect() as conn:
            conn.execute(sa.text('ALTER TABLE site_content ADD COLUMN night_sky_image VARCHAR(500)'))
            conn.commit()
    except Exception:
        pass
    try:
        with db.engine.connect() as conn:
            conn.execute(sa.text('ALTER TABLE site_content ADD COLUMN music_file VARCHAR(500)'))
            conn.commit()
    except Exception:
        pass

def _migrate_local_to_cloudinary(app):
    import cloudinary
    import cloudinary.uploader
    cname = app.config.get('CLOUDINARY_CLOUD_NAME', '')
    if not cname:
        return

    from app.models import Photo, MusicTrack, SiteContent
    upload_base = Path(app.config['UPLOAD_FOLDER'])

    # Migrate Photo
    for photo in Photo.query.filter(Photo.cloudinary_url.is_(None)).all():
        local_path = upload_base / 'photos' / photo.filename
        if local_path.exists():
            try:
                result = cloudinary.uploader.upload(
                    str(local_path),
                    folder='bizim-hikayemiz/photos',
                    public_id=Path(photo.filename).stem
                )
                url = result['secure_url'].replace('/upload/', '/upload/f_auto,q_auto/')
                photo.cloudinary_url = url
                photo.cloudinary_public_id = result['public_id']
                db.session.commit()
                app.logger.info(f'Migrated photo {photo.filename} to Cloudinary')
            except Exception as e:
                app.logger.warning(f'Failed to migrate photo {photo.filename}: {e}')

    # Migrate MusicTrack
    for track in MusicTrack.query.filter(MusicTrack.cloudinary_url.is_(None)).all():
        local_path = upload_base / 'music' / track.filename
        if local_path.exists():
            try:
                result = cloudinary.uploader.upload(
                    str(local_path),
                    folder='bizim-hikayemiz/music',
                    public_id=Path(track.filename).stem,
                    resource_type='video'  # audio uses video resource type
                )
                url = result['secure_url'].replace('/upload/', '/upload/f_auto,q_auto/')
                track.cloudinary_url = url
                track.cloudinary_public_id = result['public_id']
                db.session.commit()
                app.logger.info(f'Migrated music {track.filename} to Cloudinary')
            except Exception as e:
                app.logger.warning(f'Failed to migrate music {track.filename}: {e}')

    # Migrate SiteContent hero_background
    sc = SiteContent.query.first()
    if sc:
        if sc.hero_background and not sc.hero_background.startswith('http'):
            local_path = upload_base / 'hero' / sc.hero_background
            if local_path.exists():
                try:
                    result = cloudinary.uploader.upload(
                        str(local_path),
                        folder='bizim-hikayemiz/hero',
                        public_id=Path(sc.hero_background).stem
                    )
                    sc.hero_background = result['secure_url'].replace('/upload/', '/upload/f_auto,q_auto/')
                    db.session.commit()
                    app.logger.info(f'Migrated hero background to Cloudinary')
                except Exception as e:
                    app.logger.warning(f'Failed to migrate hero background: {e}')

        if sc.night_sky_image and not sc.night_sky_image.startswith('http'):
            local_path = upload_base / 'night_sky' / sc.night_sky_image
            if local_path.exists():
                try:
                    result = cloudinary.uploader.upload(
                        str(local_path),
                        folder='bizim-hikayemiz/night_sky',
                        public_id=Path(sc.night_sky_image).stem
                    )
                    sc.night_sky_image = result['secure_url'].replace('/upload/', '/upload/f_auto,q_auto/')
                    db.session.commit()
                    app.logger.info(f'Migrated night sky image to Cloudinary')
                except Exception as e:
                    app.logger.warning(f'Failed to migrate night sky image: {e}')

        if sc.music_file and not sc.music_file.startswith('http'):
            local_path = upload_base / 'music' / sc.music_file
            if local_path.exists():
                try:
                    result = cloudinary.uploader.upload(
                        str(local_path),
                        folder='bizim-hikayemiz/music',
                        public_id=Path(sc.music_file).stem,
                        resource_type='video'
                    )
                    sc.music_file = result['secure_url'].replace('/upload/', '/upload/f_auto,q_auto/')
                    db.session.commit()
                    app.logger.info(f'Migrated site music file to Cloudinary')
                except Exception as e:
                    app.logger.warning(f'Failed to migrate site music file: {e}')


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