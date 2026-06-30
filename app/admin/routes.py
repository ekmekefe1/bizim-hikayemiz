import os
import logging
from datetime import datetime
from pathlib import Path
from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models import (
    User, SiteContent, TimelineEvent, FutureMilestone,
    Photo, MusicTrack, Setting,
)
from app.admin.forms import (
    LoginForm, ChangePasswordForm, SiteContentForm,
    TimelineEventForm, MilestoneForm,
    ThemeSettingsForm, AnimationSettingsForm,
)

logger = logging.getLogger(__name__)
admin_bp = Blueprint('admin', __name__, template_folder='../templates/admin')

PHOTO_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'}
MUSIC_EXTENSIONS = {'mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'}

MAGIC_BYTES = {
    b'\xff\xd8\xff': 'image/jpeg',
    b'\x89PNG\r\n\x1a\n': 'image/png',
    b'GIF87a': 'image/gif',
    b'GIF89a': 'image/gif',
    b'RIFF': 'image/webp',
    b'\x00\x00\x00\x1cftyp': 'image/avif',
    b'\x00\x00\x00 ftyp': 'image/avif',
    b'ID3': 'audio/mpeg',
    b'\xff\xfb': 'audio/mpeg',
    b'\xff\xf3': 'audio/mpeg',
    b'\xff\xe3': 'audio/mpeg',
    b'OggS': 'audio/ogg',
    b'RIFF': 'audio/x-wav',
}

def allowed_file(filename, allowed_set):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_set

def validate_file_content(file_storage, allowed_extensions):
    if not file_storage or not file_storage.filename:
        return False
    if not allowed_file(file_storage.filename, allowed_extensions):
        return False
    header = file_storage.read(16)
    file_storage.seek(0)
    for magic, mime in MAGIC_BYTES.items():
        if header.startswith(magic):
            return True
    ext = file_storage.filename.rsplit('.', 1)[1].lower()
    if ext in {'jpg', 'jpeg', 'png', 'gif', 'mp3', 'wav', 'ogg'}:
        return True
    return False

def ensure_upload_dir(subdir):
    path = os.path.join(current_app.config['UPLOAD_FOLDER'], subdir)
    if not os.path.exists(path):
        os.makedirs(path)
    return path

def cloudinary_configured():
    return bool(current_app.config.get('CLOUDINARY_CLOUD_NAME'))

def _cloudinary_upload(file_path, folder, public_id_base, resource_type='image'):
    """Upload a local file to Cloudinary. Returns (secure_url, public_id) or (None, None) on failure."""
    if not cloudinary_configured():
        return None, None
    if not os.path.exists(file_path):
        return None, None
    try:
        import cloudinary.uploader
        result = cloudinary.uploader.upload(
            file_path,
            folder=folder,
            public_id=public_id_base,
            resource_type=resource_type
        )
        url = result['secure_url']
        # Enable automatic format selection and quality optimization
        url = url.replace('/upload/', '/upload/f_auto,q_auto/')
        return url, result['public_id']
    except Exception as e:
        logger.error(f'Cloudinary upload failed: {e}')
        flash(f'Cloudinary yükleme hatası: {e}', 'error')
        return None, None

def _cloudinary_destroy(public_id, resource_type='image'):
    """Delete a file from Cloudinary by public_id."""
    if not cloudinary_configured() or not public_id:
        return
    try:
        import cloudinary.uploader
        cloudinary.uploader.destroy(public_id, resource_type=resource_type)
    except Exception as e:
        logger.warning(f'Cloudinary delete failed for {public_id}: {e}')

def _public_id_from_url(url):
    """Extract Cloudinary public_id (with folder prefix) from a secure_url."""
    if not url or '/upload/' not in url:
        return None
    parts = url.split('/upload/', 1)[1]
    segments = parts.split('/')
    if segments and segments[0].startswith('v') and segments[0][1:].isdigit():
        segments = segments[1:]
    public_id = '/'.join(segments)
    if '.' in public_id:
        public_id = public_id.rsplit('.', 1)[0]
    return public_id

# ---- Auth ----

@admin_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('admin.dashboard'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and user.check_password(form.password.data):
            login_user(user, remember=True)
            flash('Hoş geldiniz!', 'success')
            return redirect(url_for('admin.dashboard'))
        flash('Kullanıcı adı veya şifre hatalı.', 'error')
        logger.warning(f'Failed login attempt for username: {form.username.data}')
    return render_template('admin/login.html', form=form)

@admin_bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Çıkış yapıldı.', 'info')
    return redirect(url_for('admin.login'))

# ---- Dashboard ----

@admin_bp.route('/')
@admin_bp.route('/dashboard')
@login_required
def dashboard():
    content = SiteContent.query.first()
    timeline_count = TimelineEvent.query.count()
    milestone_count = FutureMilestone.query.count()
    photo_count = Photo.query.count()
    music_count = MusicTrack.query.count()
    return render_template(
        'admin/dashboard.html',
        content=content,
        timeline_count=timeline_count,
        milestone_count=milestone_count,
        photo_count=photo_count,
        music_count=music_count,
    )

# ---- Content ----

@admin_bp.route('/content', methods=['GET', 'POST'])
@login_required
def content():
    sc = SiteContent.query.first()
    if not sc:
        sc = SiteContent()
        db.session.add(sc)
        db.session.commit()

    form = SiteContentForm(obj=sc)
    if form.validate_on_submit():
        form.populate_obj(sc)
        db.session.commit()
        flash('İçerik başarıyla güncellendi.', 'success')
        logger.info(f'Site content updated by {current_user.username}')
        return redirect(url_for('admin.content'))

    return render_template('admin/content.html', form=form, content=sc)

# ---- Timeline Events ----

@admin_bp.route('/timeline', methods=['GET', 'POST'])
@login_required
def timeline():
    form = TimelineEventForm()
    if form.validate_on_submit():
        event = TimelineEvent(
            date_label=form.date_label.data,
            title=form.title.data,
            description=form.description.data,
            order=form.order.data,
        )
        db.session.add(event)
        db.session.commit()
        flash('Etkinlik eklendi.', 'success')
        logger.info(f'Timeline event added by {current_user.username}: {event.title}')
        return redirect(url_for('admin.timeline'))

    events = TimelineEvent.query.order_by(TimelineEvent.order).all()
    return render_template('admin/timeline.html', form=form, events=events)

@admin_bp.route('/timeline/edit/<int:id>', methods=['GET', 'POST'])
@login_required
def timeline_edit(id):
    event = TimelineEvent.query.get_or_404(id)
    form = TimelineEventForm(obj=event)
    if form.validate_on_submit():
        form.populate_obj(event)
        db.session.commit()
        flash('Etkinlik güncellendi.', 'success')
        return redirect(url_for('admin.timeline'))
    return render_template('admin/timeline.html', form=form, events=TimelineEvent.query.order_by(TimelineEvent.order).all(), editing=event)

@admin_bp.route('/timeline/delete/<int:id>', methods=['POST'])
@login_required
def timeline_delete(id):
    event = TimelineEvent.query.get_or_404(id)
    db.session.delete(event)
    db.session.commit()
    flash('Etkinlik silindi.', 'info')
    logger.info(f'Timeline event deleted by {current_user.username}: {event.id}')
    return redirect(url_for('admin.timeline'))

# ---- Milestones ----

@admin_bp.route('/milestones', methods=['GET', 'POST'])
@login_required
def milestones():
    form = MilestoneForm()
    if form.validate_on_submit():
        m = FutureMilestone(
            icon=form.icon.data,
            title=form.title.data,
            status=form.status.data,
            order=form.order.data,
        )
        db.session.add(m)
        db.session.commit()
        flash('Hedef eklendi.', 'success')
        logger.info(f'Future milestone added by {current_user.username}: {m.title}')
        return redirect(url_for('admin.milestones'))

    milestones = FutureMilestone.query.order_by(FutureMilestone.order).all()
    return render_template('admin/milestones.html', form=form, milestones=milestones)

@admin_bp.route('/milestones/edit/<int:id>', methods=['GET', 'POST'])
@login_required
def milestone_edit(id):
    m = FutureMilestone.query.get_or_404(id)
    form = MilestoneForm(obj=m)
    if form.validate_on_submit():
        form.populate_obj(m)
        db.session.commit()
        flash('Hedef güncellendi.', 'success')
        return redirect(url_for('admin.milestones'))
    return render_template('admin/milestones.html', form=form, milestones=FutureMilestone.query.order_by(FutureMilestone.order).all(), editing=m)

@admin_bp.route('/milestones/delete/<int:id>', methods=['POST'])
@login_required
def milestone_delete(id):
    m = FutureMilestone.query.get_or_404(id)
    db.session.delete(m)
    db.session.commit()
    flash('Hedef silindi.', 'info')
    logger.info(f'Future milestone deleted by {current_user.username}: {m.id}')
    return redirect(url_for('admin.milestones'))

# ---- Photos ----

@admin_bp.route('/photos', methods=['GET', 'POST'])
@login_required
def photos():
    if request.method == 'POST' and 'photo' in request.files:
        file = request.files['photo']
        if file and file.filename:
            if validate_file_content(file, current_app.config.get('ALLOWED_PHOTO_EXTENSIONS', PHOTO_EXTENSIONS)):
                ts = datetime.utcnow().strftime('%Y%m%d%H%M%S')
                safe_name = secure_filename(file.filename)
                filename = secure_filename(f"{ts}_{safe_name}")
                upload_dir = ensure_upload_dir('photos')
                filepath = os.path.join(upload_dir, filename)
                file.save(filepath)

                caption = request.form.get('caption', '')
                c_url, c_pid = _cloudinary_upload(filepath, 'bizim-hikayemiz/photos', f'{ts}_{Path(safe_name).stem}')

                if c_url and c_pid:
                    photo = Photo(filename=c_pid, caption=caption, cloudinary_url=c_url, cloudinary_public_id=c_pid)
                    os.remove(filepath)
                    flash('Fotoğraf Cloudinary\'e yüklendi.', 'success')
                else:
                    photo = Photo(filename=filename, caption=caption)
                    flash('Fotoğraf yüklendi (yerel depolama).', 'success')

                db.session.add(photo)
                db.session.commit()
                logger.info(f'Photo uploaded by {current_user.username}: {filename}')
            else:
                flash('Geçersiz dosya türü.', 'error')
        else:
            flash('Dosya seçilmedi.', 'error')
        return redirect(url_for('admin.photos'))

    photos_list = Photo.query.order_by(Photo.order).all()
    return render_template('admin/photos.html', photos=photos_list)

@admin_bp.route('/photos/delete/<int:id>', methods=['POST'])
@login_required
def photo_delete(id):
    photo = Photo.query.get_or_404(id)
    # Delete from Cloudinary if it was uploaded there
    if photo.cloudinary_public_id:
        _cloudinary_destroy(photo.cloudinary_public_id)
    # Also remove from local disk if present
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], 'photos', photo.filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    db.session.delete(photo)
    db.session.commit()
    flash('Fotoğraf silindi.', 'info')
    logger.info(f'Photo deleted by {current_user.username}: {photo.filename}')
    return redirect(url_for('admin.photos'))

# ---- Music ----

@admin_bp.route('/music', methods=['GET', 'POST'])
@login_required
def music():
    if request.method == 'POST' and 'music_file' in request.files:
        file = request.files['music_file']
        if file and file.filename:
            if validate_file_content(file, current_app.config.get('ALLOWED_MUSIC_EXTENSIONS', MUSIC_EXTENSIONS)):
                ts = datetime.utcnow().strftime('%Y%m%d%H%M%S')
                safe_name = secure_filename(file.filename)
                filename = secure_filename(f"{ts}_{safe_name}")
                upload_dir = ensure_upload_dir('music')
                filepath = os.path.join(upload_dir, filename)
                file.save(filepath)

                title = request.form.get('title', safe_name)
                c_url, c_pid = _cloudinary_upload(filepath, 'bizim-hikayemiz/music', f'{ts}_{Path(safe_name).stem}', resource_type='video')

                if c_url and c_pid:
                    track = MusicTrack(filename=c_pid, title=title, cloudinary_url=c_url, cloudinary_public_id=c_pid)
                    os.remove(filepath)
                    flash('Müzik Cloudinary\'e yüklendi.', 'success')
                else:
                    track = MusicTrack(filename=filename, title=title)
                    flash('Müzik yüklendi (yerel depolama).', 'success')

                db.session.add(track)
                db.session.commit()
                logger.info(f'Music uploaded by {current_user.username}: {filename}')
            else:
                flash('Geçersiz dosya türü.', 'error')
        else:
            flash('Dosya seçilmedi.', 'error')
        return redirect(url_for('admin.music'))

    tracks = MusicTrack.query.order_by(MusicTrack.uploaded_at.desc()).all()
    return render_template('admin/music.html', tracks=tracks)

@admin_bp.route('/music/delete/<int:id>', methods=['POST'])
@login_required
def music_delete(id):
    track = MusicTrack.query.get_or_404(id)
    if track.cloudinary_public_id:
        _cloudinary_destroy(track.cloudinary_public_id, resource_type='video')
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], 'music', track.filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    db.session.delete(track)
    db.session.commit()
    flash('Müzik silindi.', 'info')
    logger.info(f'Music deleted by {current_user.username}: {track.filename}')
    return redirect(url_for('admin.music'))

@admin_bp.route('/music/activate/<int:id>', methods=['POST'])
@login_required
def music_activate(id):
    track = MusicTrack.query.get_or_404(id)
    MusicTrack.query.update({MusicTrack.is_active: False})
    track.is_active = True
    db.session.commit()
    flash(f'"{track.title}" aktif edildi.', 'success')
    logger.info(f'Music activated by {current_user.username}: {track.title}')
    return redirect(url_for('admin.music'))

# ---- Night Sky Image ----

@admin_bp.route('/night-sky', methods=['GET', 'POST'])
@login_required
def night_sky():
    sc = SiteContent.query.first()
    if not sc:
        sc = SiteContent()
        db.session.add(sc)
        db.session.commit()

    if request.method == 'POST' and 'night_sky_image' in request.files:
        file = request.files['night_sky_image']
        if file and file.filename:
            if validate_file_content(file, current_app.config.get('ALLOWED_IMAGE_EXTENSIONS', PHOTO_EXTENSIONS)):
                ts = datetime.utcnow().strftime('%Y%m%d%H%M%S')
                ext = file.filename.rsplit('.', 1)[1].lower()
                filename = secure_filename(f"night_sky_{ts}.{ext}")
                upload_dir = ensure_upload_dir('night_sky')
                filepath = os.path.join(upload_dir, filename)
                file.save(filepath)

                c_url, _ = _cloudinary_upload(filepath, 'bizim-hikayemiz/night_sky', f'night_sky_{ts}')

                if c_url:
                    if sc.night_sky_image and sc.night_sky_image.startswith('http'):
                        old_pid = _public_id_from_url(sc.night_sky_image)
                        if old_pid:
                            _cloudinary_destroy(old_pid)
                    sc.night_sky_image = c_url
                    os.remove(filepath)
                    flash('Gece gökyüzü görseli Cloudinary\'e yüklendi.', 'success')
                else:
                    sc.night_sky_image = filename
                    flash('Gece gökyüzü görseli yüklendi (yerel depolama).', 'success')

                db.session.commit()
                logger.info(f'Night sky image uploaded by {current_user.username}')
            else:
                flash('Geçersiz dosya türü.', 'error')
        else:
            flash('Dosya seçilmedi.', 'error')
        return redirect(url_for('admin.night_sky'))

    return render_template('admin/night_sky.html', content=sc)

@admin_bp.route('/night-sky/delete', methods=['POST'])
@login_required
def night_sky_delete():
    sc = SiteContent.query.first()
    if sc and sc.night_sky_image:
        if sc.night_sky_image.startswith('http'):
            old_pid = _public_id_from_url(sc.night_sky_image)
            if old_pid:
                _cloudinary_destroy(old_pid)
        else:
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], 'night_sky', sc.night_sky_image)
            if os.path.exists(filepath):
                os.remove(filepath)
        sc.night_sky_image = None
        db.session.commit()
        flash('Gece gökyüzü görseli kaldırıldı.', 'info')
        logger.info(f'Night sky image deleted by {current_user.username}')
    return redirect(url_for('admin.night_sky'))

# ---- Hero Background ----

@admin_bp.route('/hero-background', methods=['GET', 'POST'])
@login_required
def hero_background():
    sc = SiteContent.query.first()
    if not sc:
        sc = SiteContent()
        db.session.add(sc)
        db.session.commit()

    if request.method == 'POST' and 'hero_background' in request.files:
        file = request.files['hero_background']
        if file and file.filename:
            if validate_file_content(file, current_app.config.get('ALLOWED_IMAGE_EXTENSIONS', PHOTO_EXTENSIONS)):
                ts = datetime.utcnow().strftime('%Y%m%d%H%M%S')
                ext = file.filename.rsplit('.', 1)[1].lower()
                filename = secure_filename(f"hero_{ts}.{ext}")
                upload_dir = ensure_upload_dir('hero')
                filepath = os.path.join(upload_dir, filename)
                file.save(filepath)

                c_url, _ = _cloudinary_upload(filepath, 'bizim-hikayemiz/hero', f'hero_{ts}')

                if c_url:
                    if sc.hero_background and sc.hero_background.startswith('http'):
                        old_pid = _public_id_from_url(sc.hero_background)
                        if old_pid:
                            _cloudinary_destroy(old_pid)
                    sc.hero_background = c_url
                    os.remove(filepath)
                    flash('Hero görseli Cloudinary\'e yüklendi.', 'success')
                else:
                    sc.hero_background = filename
                    flash('Hero görseli yüklendi (yerel depolama).', 'success')

                db.session.commit()
                logger.info(f'Hero background uploaded by {current_user.username}')
            else:
                flash('Geçersiz dosya türü.', 'error')
        else:
            flash('Dosya seçilmedi.', 'error')
        return redirect(url_for('admin.hero_background'))

    return render_template('admin/hero_background.html', content=sc)

@admin_bp.route('/hero-background/delete', methods=['POST'])
@login_required
def hero_background_delete():
    sc = SiteContent.query.first()
    if sc and sc.hero_background:
        if sc.hero_background.startswith('http'):
            old_pid = _public_id_from_url(sc.hero_background)
            if old_pid:
                _cloudinary_destroy(old_pid)
        else:
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], 'hero', sc.hero_background)
            if os.path.exists(filepath):
                os.remove(filepath)
        sc.hero_background = None
        db.session.commit()
        flash('Hero görseli kaldırıldı.', 'info')
        logger.info(f'Hero background deleted by {current_user.username}')
    return redirect(url_for('admin.hero_background'))

# ---- Settings ----

@admin_bp.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    theme_form = ThemeSettingsForm()
    anim_form = AnimationSettingsForm()

    if request.method == 'POST':
        if 'theme' in request.form:
            if theme_form.validate_on_submit():
                for field in ['theme_primary_color', 'theme_secondary_color', 'theme_background_color', 'theme_text_color']:
                    val = getattr(theme_form, field).data
                    if val:
                        Setting.set(field, val, 'theme')
                flash('Tema ayarları kaydedildi.', 'success')
                logger.info(f'Theme settings updated by {current_user.username}')
                return redirect(url_for('admin.settings'))

        elif 'animation' in request.form:
            if anim_form.validate_on_submit():
                for field in ['animation_star_count', 'animation_heart_count', 'animation_shooting_star_count',
                              'animation_floating_hearts', 'animation_floating_roses',
                              'animation_parallax', 'animation_scroll_reveal']:
                    val = getattr(anim_form, field).data
                    if val is not None:
                        Setting.set(field, str(val), 'animation')
                flash('Animasyon ayarları kaydedildi.', 'success')
                logger.info(f'Animation settings updated by {current_user.username}')
                return redirect(url_for('admin.settings'))

    theme_settings = Setting.get_all_by_category('theme')
    anim_settings = Setting.get_all_by_category('animation')

    for key, value in theme_settings.items():
        if hasattr(theme_form, key):
            getattr(theme_form, key).data = value

    for key, value in anim_settings.items():
        if hasattr(anim_form, key):
            try:
                if key in ['animation_parallax', 'animation_scroll_reveal']:
                    getattr(anim_form, key).data = value
                else:
                    getattr(anim_form, key).data = int(value) if value else 0
            except (ValueError, TypeError):
                getattr(anim_form, key).data = 0

    return render_template('admin/settings.html', theme_form=theme_form, anim_form=anim_form)