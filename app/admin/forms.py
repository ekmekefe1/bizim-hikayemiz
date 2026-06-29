from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField, DateField, PasswordField, IntegerField, SelectField, BooleanField
from wtforms.validators import DataRequired, Length, Optional, NumberRange

class LoginForm(FlaskForm):
    username = StringField('Kullanıcı Adı', validators=[DataRequired()])
    password = PasswordField('Şifre', validators=[DataRequired()])

class ChangePasswordForm(FlaskForm):
    current_password = PasswordField('Mevcut Şifre', validators=[DataRequired()])
    new_password = PasswordField('Yeni Şifre', validators=[DataRequired(), Length(min=6)])

class SiteContentForm(FlaskForm):
    title = StringField('Site Başlığı', validators=[DataRequired(), Length(max=200)])
    subtitle = StringField('Alt Başlık', validators=[DataRequired(), Length(max=500)])
    relationship_date = DateField('İlişki Başlangıç Tarihi', validators=[DataRequired()], format='%Y-%m-%d')
    hero_badge = StringField('Hero Rozeti', validators=[DataRequired(), Length(max=20)])
    counter_title = StringField('Sayaç Başlığı', validators=[DataRequired(), Length(max=200)])
    counter_subtitle = StringField('Sayaç Alt Başlığı', validators=[Length(max=300)])
    night_sky_title = StringField('Gece Gökyüzü Başlığı', validators=[Length(max=200)])
    night_sky_subtitle = StringField('Gece Gökyüzü Alt Başlığı', validators=[Length(max=300)])
    night_sky_text = TextAreaField('Gece Gökyüzü Metni', validators=[Length(max=2000)])
    timeline_title = StringField('Zaman Tüneli Başlığı', validators=[Length(max=200)])
    timeline_subtitle = StringField('Zaman Tüneli Alt Başlığı', validators=[Length(max=300)])
    future_title = StringField('Gelecek Başlığı', validators=[Length(max=200)])
    future_subtitle = StringField('Gelecek Alt Başlığı', validators=[Length(max=300)])
    gallery_title = StringField('Galeri Başlığı', validators=[Length(max=200)])
    gallery_subtitle = StringField('Galeri Alt Başlığı', validators=[Length(max=300)])
    letter_title = StringField('Mektup Başlığı', validators=[Length(max=200)])
    letter_subtitle = StringField('Mektup Alt Başlığı', validators=[Length(max=300)])
    letter_greeting = StringField('Mektup Selamlama', validators=[Length(max=200)])
    letter_signature_name = StringField('Mektup İmza', validators=[Length(max=200)])
    footer_text = StringField('Footer Metni', validators=[Length(max=300)])
    love_letter = TextAreaField('Aşk Mektubu (her paragrafı yeni satırla ayırın)', validators=[Length(max=10000)])

class TimelineEventForm(FlaskForm):
    date_label = StringField('Tarih Etiketi', validators=[DataRequired(), Length(max=100)])
    title = StringField('Başlık', validators=[DataRequired(), Length(max=200)])
    description = TextAreaField('Açıklama', validators=[Optional(), Length(max=2000)])
    order = IntegerField('Sıra', default=0)

class MilestoneForm(FlaskForm):
    icon = StringField('İkon', validators=[DataRequired(), Length(max=20)])
    title = StringField('Başlık', validators=[DataRequired(), Length(max=200)])
    status = StringField('Durum', validators=[DataRequired(), Length(max=100)])
    order = IntegerField('Sıra', default=0)

class ThemeSettingsForm(FlaskForm):
    theme_primary_color = StringField('Birincil Renk', validators=[Length(max=20)])
    theme_secondary_color = StringField('İkincil Renk', validators=[Length(max=20)])
    theme_background_color = StringField('Arka Plan Rengi', validators=[Length(max=20)])
    theme_text_color = StringField('Metin Rengi', validators=[Length(max=20)])

class AnimationSettingsForm(FlaskForm):
    animation_star_count = IntegerField('Yıldız Sayısı', validators=[Optional(), NumberRange(min=0, max=10000)])
    animation_heart_count = IntegerField('Kalp Sayısı', validators=[Optional(), NumberRange(min=0, max=500)])
    animation_shooting_star_count = IntegerField('Kayan Yıldız Sayısı', validators=[Optional(), NumberRange(min=0, max=100)])
    animation_floating_hearts = IntegerField('Yüzen Kalp Sayısı', validators=[Optional(), NumberRange(min=0, max=200)])
    animation_floating_roses = IntegerField('Yüzen Gül Sayısı', validators=[Optional(), NumberRange(min=0, max=100)])
    animation_parallax = SelectField('Parallax Efekti', choices=[('true', 'Açık'), ('false', 'Kapalı')], default='true')
    animation_scroll_reveal = SelectField('Scroll Reveal', choices=[('true', 'Açık'), ('false', 'Kapalı')], default='true')
