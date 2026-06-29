from datetime import datetime, date
from app.extensions import db, login_manager, bcrypt
from flask_login import UserMixin

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class User(UserMixin, db.Model):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'

class SiteContent(db.Model):
    __tablename__ = 'site_content'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), default='Cerenim ❤️')
    subtitle = db.Column(db.String(500), default='İyi ki hayatıma girdin.')
    relationship_date = db.Column(db.Date, nullable=False, default=date(2023, 1, 23))
    love_letter = db.Column(db.Text, default='')
    hero_badge = db.Column(db.String(20), default='❤️')
    counter_title = db.Column(db.String(200), default='Her Saniye Değerli')
    counter_subtitle = db.Column(db.String(300), default='23 Ocak 2023')
    night_sky_title = db.Column(db.String(200), default='23 Ocak 2023')
    night_sky_subtitle = db.Column(db.String(300), default='O gece gökyüzü bize gülümsüyordu...')
    night_sky_text = db.Column(db.Text, default='Yıldızların en parlak olduğu gecede...')
    night_sky_image = db.Column(db.String(200), nullable=True)
    music_file = db.Column(db.String(200), nullable=True)
    timeline_title = db.Column(db.String(200), default='Zaman Tüneli')
    timeline_subtitle = db.Column(db.String(300), default='Her anı bir ömür')
    future_title = db.Column(db.String(200), default='Gelecek')
    future_subtitle = db.Column(db.String(300), default='Hayallerimiz gerçek olacak')
    gallery_title = db.Column(db.String(200), default='Fotoğraf Galerisi')
    gallery_subtitle = db.Column(db.String(300), default='Anılarımız burada birikecek')
    letter_title = db.Column(db.String(200), default='Bir Mektup')
    letter_subtitle = db.Column(db.String(300), default='Sana yazdığım satırlar')
    letter_greeting = db.Column(db.String(200), default='Sevgili Ceren\'im,')
    letter_signature_name = db.Column(db.String(200), default='Sevgilin')
    footer_text = db.Column(db.String(300), default='Sonsuza dek birlikte...')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<SiteContent {self.title}>'

class TimelineEvent(db.Model):
    __tablename__ = 'timeline_event'

    id = db.Column(db.Integer, primary_key=True)
    date_label = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'date_label': self.date_label,
            'title': self.title,
            'description': self.description,
            'order': self.order,
        }

    def __repr__(self):
        return f'<TimelineEvent {self.title}>'

class FutureMilestone(db.Model):
    __tablename__ = 'future_milestone'

    id = db.Column(db.Integer, primary_key=True)
    icon = db.Column(db.String(20), default='💍')
    title = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(100), default='Yakında...')
    order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'icon': self.icon,
            'title': self.title,
            'status': self.status,
            'order': self.order,
        }

    def __repr__(self):
        return f'<FutureMilestone {self.title}>'

class Photo(db.Model):
    __tablename__ = 'photo'

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(200), nullable=False)
    caption = db.Column(db.String(300), nullable=True)
    order = db.Column(db.Integer, default=0)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'caption': self.caption,
            'order': self.order,
            'url': '/static/uploads/photos/' + self.filename,
        }

    def __repr__(self):
        return f'<Photo {self.filename}>'

class MusicTrack(db.Model):
    __tablename__ = 'music_track'

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(200), nullable=False)
    title = db.Column(db.String(200), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'title': self.title or self.filename,
            'url': '/static/uploads/music/' + self.filename,
        }

    def __repr__(self):
        return f'<MusicTrack {self.title or self.filename}>'

class Setting(db.Model):
    __tablename__ = 'setting'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    value = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), default='theme')

    @classmethod
    def get(cls, key, default=None):
        s = cls.query.filter_by(key=key).first()
        return s.value if s else default

    @classmethod
    def set(cls, key, value, category='theme'):
        s = cls.query.filter_by(key=key).first()
        if s:
            s.value = value
        else:
            s = cls(key=key, value=value, category=category)
            db.session.add(s)
        db.session.commit()

    @classmethod
    def get_all_by_category(cls, category):
        settings = cls.query.filter_by(category=category).all()
        return {s.key: s.value for s in settings}

    def __repr__(self):
        return f'<Setting {self.key}={self.value}>'
