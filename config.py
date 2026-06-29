import os
import base64
from datetime import timedelta
from pathlib import Path

_basedir = Path(__file__).resolve().parent

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or base64.b64encode(os.urandom(32)).decode('utf-8')
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 'sqlite:///' + str(_basedir / 'instance' / 'site.db')
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    WTF_CSRF_ENABLED = True
    REMEMBER_COOKIE_DURATION = timedelta(days=7)

    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or str(_basedir / 'static' / 'uploads')
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024
    ALLOWED_PHOTO_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'}
    ALLOWED_MUSIC_EXTENSIONS = {'mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'}
    ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'}
