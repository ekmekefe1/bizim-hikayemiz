from datetime import datetime, date, timedelta
from flask import Blueprint, render_template, jsonify, request, current_app, send_from_directory
import os
import logging

from app.extensions import db
from app.models import (
    SiteContent, TimelineEvent, FutureMilestone,
    Photo, MusicTrack, Setting,
)

logger = logging.getLogger(__name__)
main_bp = Blueprint('main', __name__, template_folder='../templates/public')

@main_bp.route('/')
def index():
    content = SiteContent.query.first()
    timeline_events = TimelineEvent.query.order_by(TimelineEvent.order).all()
    milestones = FutureMilestone.query.order_by(FutureMilestone.order).all()
    theme_settings = Setting.get_all_by_category('theme')
    anim_settings = Setting.get_all_by_category('animation')

    now = datetime.utcnow()
    if content and content.relationship_date:
        rd = content.relationship_date
        years = now.year - rd.year
        months = now.month - rd.month
        days = now.day - rd.day
        if days < 0:
            months -= 1
            prev_month_end = date(now.year, now.month, 1) - timedelta(days=1)
            days = (now - date(now.year, now.month, 1)).days + (rd - date(rd.year, rd.month, 1)).days
        if months < 0:
            years -= 1
            months += 12
    else:
        years = months = days = 0

    night_sky_url = None
    if content and content.night_sky_image:
        night_sky_url = '/static/uploads/night_sky/' + content.night_sky_image

    hero_background_url = None
    if content and content.hero_background:
        hero_background_url = '/static/uploads/hero/' + content.hero_background

    love_letter_paragraphs = []
    if content and content.love_letter:
        love_letter_paragraphs = [p.strip() for p in content.love_letter.split('\n') if p.strip()]

    return render_template(
        'public/index.html',
        content=content,
        timeline_events=timeline_events,
        milestones=milestones,
        theme_settings=theme_settings,
        anim_settings=anim_settings,
        years=years,
        months=months,
        days=days,
        night_sky_url=night_sky_url,
        hero_background_url=hero_background_url,
        love_letter_paragraphs=love_letter_paragraphs,
    )

# ---- API Endpoints ----

@main_bp.route('/api/site-content')
def api_site_content():
    try:
        content = SiteContent.query.first()
        if not content:
            return jsonify({})
        data = {c.name: getattr(content, c.name) for c in content.__table__.columns}
        for k, v in data.items():
            if isinstance(v, (datetime, date)):
                data[k] = v.isoformat()
        return jsonify(data)
    except Exception as e:
        logger.error(f'Error in api_site_content: {e}')
        return jsonify({'error': 'Internal server error'}), 500

@main_bp.route('/api/timeline')
def api_timeline():
    try:
        events = TimelineEvent.query.order_by(TimelineEvent.order).all()
        return jsonify([e.to_dict() for e in events])
    except Exception as e:
        logger.error(f'Error in api_timeline: {e}')
        return jsonify({'error': 'Internal server error'}), 500

@main_bp.route('/api/milestones')
def api_milestones():
    try:
        milestones = FutureMilestone.query.order_by(FutureMilestone.order).all()
        return jsonify([m.to_dict() for m in milestones])
    except Exception as e:
        logger.error(f'Error in api_milestones: {e}')
        return jsonify({'error': 'Internal server error'}), 500

@main_bp.route('/api/photos')
def api_photos():
    try:
        photos = Photo.query.order_by(Photo.order).all()
        return jsonify([p.to_dict() for p in photos])
    except Exception as e:
        logger.error(f'Error in api_photos: {e}')
        return jsonify({'error': 'Internal server error'}), 500

@main_bp.route('/api/music')
def api_music():
    try:
        tracks = MusicTrack.query.filter_by(is_active=True).all()
        return jsonify([t.to_dict() for t in tracks])
    except Exception as e:
        logger.error(f'Error in api_music: {e}')
        return jsonify({'error': 'Internal server error'}), 500

@main_bp.route('/api/theme')
def api_theme():
    try:
        settings = Setting.get_all_by_category('theme')
        return jsonify(settings)
    except Exception as e:
        logger.error(f'Error in api_theme: {e}')
        return jsonify({'error': 'Internal server error'}), 500

@main_bp.route('/api/animations')
def api_animations():
    try:
        settings = Setting.get_all_by_category('animation')
        return jsonify(settings)
    except Exception as e:
        logger.error(f'Error in api_animations: {e}')
        return jsonify({'error': 'Internal server error'}), 500

@main_bp.route('/api/night-sky')
def api_night_sky():
    try:
        content = SiteContent.query.first()
        if content and content.night_sky_image:
            return jsonify({'url': '/static/uploads/night_sky/' + content.night_sky_image})
        return jsonify({'url': None})
    except Exception as e:
        logger.error(f'Error in api_night_sky: {e}')
        return jsonify({'error': 'Internal server error'}), 500

@main_bp.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(
        os.path.join(current_app.root_path, '..', 'static', 'uploads'),
        filename
    )
