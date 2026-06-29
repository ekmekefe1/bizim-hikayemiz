# Changelog

## v1.1.0 — Production Readiness & Bug Fixes

### Security
- **config.py**: Changed `SECRET_KEY` fallback from hardcoded string to `os.urandom(32)` + base64 encoding
- **config.py**: Removed hardcoded default credentials from config
- **run.py**: Changed `debug=True` to environment-controlled (`FLASK_DEBUG` env var)
- **login.html**: Removed hardcoded default credentials (`admin / admin123`) from login page
- **admin/routes.py**: Added `validate_file_content()` — validates uploaded files by magic bytes (header signature) in addition to extension check
- **admin/routes.py**: Added `ensure_upload_dir()` — creates upload subdirectories with `os.makedirs()` before saving files
- **app/\_\_init\_\_.py**: Added proper Cache-Control headers: static files cache 24h, dynamic pages no-cache
- **app/\_\_init\_\_.py**: Added CSRF protection to all forms (existing but now explicit)

### Bug Fixes
- **admin/routes.py**: Fixed `music_activate` — moved `MusicTrack.query.update()` to AFTER the `get_or_404()` call to prevent race condition on invalid IDs
- **app/main/routes.py**: Replaced `__import__('datetime').timedelta(days=1)` with proper `from datetime import timedelta` import at top of file
- **static/js/script.js**: Fixed `parseInt` falsy bug — replaced `parseInt(x) || default` with `safeInt()` helper that uses `Number.isFinite()` so setting values to `0` is accepted
- **static/js/script.js**: Replaced hardcoded `new Date(2023, 0, 23)` with `parseRelationshipDate()` that reads the relationship date from the DOM's `.hero-timer-date` element
- **static/js/script.js**: Added `TEXTAREA` and `SELECT` to heart-burst exclusion list

### Architecture & Code Quality
- **app/models.py**: Added `__repr__` methods to all models (User, SiteContent, TimelineEvent, FutureMilestone, Photo, MusicTrack, Setting)
- **app/models.py**: Added `__tablename__` to all models for explicit table naming
- **app/models.py**: Added `index=True` to lookup columns (`User.username`, `Setting.key`)
- **app/admin/forms.py**: Changed animation settings from `StringField` to `IntegerField` with `NumberRange` validators
- **app/admin/forms.py**: Added `animation_parallax` and `animation_scroll_reveal` as `SelectField` to AnimationSettingsForm
- **app/admin/routes.py**: Updated settings route to save/load `animation_parallax` and `animation_scroll_reveal`
- **app/admin/routes.py**: Added `timeline_edit` and `milestone_edit` routes for editing existing timeline events and milestones
- **app/\_\_init\_\_.py**: Added `RotatingFileHandler` logging (logs/bizim-hikayemiz.log, 10KB x 10 files)
- **app/\_\_init\_\_.py**: Added global 404, 500, and 413 error handlers with JSON responses for API paths
- **app/main/routes.py**: Wrapped all API endpoints in try/except with 500 error response
- **app/\_\_init\_\_.py**: Added `app.after_request` to set cache headers globally

### Validation & Error Handling
- **app/admin/forms.py**: Added `Optional()` validator to all `IntegerField` fields in AnimationSettingsForm
- **app/admin/forms.py**: Added length constraints to all string fields in forms
- **app/admin/routes.py**: Added existence checks before file operations (already had them, now consistent)
- **app/admin/routes.py**: Added `flash('Dosya seçilmedi.', 'error')` when no file is uploaded
- **app/admin/routes.py**: Added `logger.warning` for failed login attempts

### Accessibility
- **app/templates/public/index.html**: Added `role="dialog"`, `aria-modal`, `aria-label` to modals and lightbox
- **app/templates/public/index.html**: Added `aria-label` to all `<section>` elements
- **app/templates/public/index.html**: Added `aria-hidden="true"` to decorative elements (canvas, divider, stars, roses)
- **app/templates/public/index.html**: Added `role="button"`, `tabindex="0"` to envelope for keyboard accessibility
- **app/templates/public/index.html**: Added keyboard handler (Enter/Space) to envelope open
- **app/templates/admin/login.html**: Added `autocomplete` attributes to username/password fields
- **static/css/style.css**: Added `button:focus-visible` and `a:focus-visible` outlines
- **static/css/style.css**: Added `@media (prefers-reduced-motion: reduce)` — disables animations, forces reveal elements visible
- **static/css/admin.css**: Added `button:focus-visible`, `a:focus-visible`, `.btn:focus-visible`, `.nav-item:focus-visible` outlines

### SEO
- **app/templates/public/index.html**: Added `<meta name="description">` with subtitle content
- **app/templates/public/index.html**: Added Open Graph meta tags (`og:title`, `og:description`, `og:type`)
- **app/templates/public/index.html**: Added `<meta name="theme-color">` with primary color from settings

### Performance
- **static/js/script.js**: Added `loading="lazy"` to gallery images
- **app/\_\_init\_\_.py**: Static files served with `Cache-Control: public, max-age=86400`
- **app/templates/public/index.html**: Added `?v=1` cache busting to CSS and JS links

### CSS & Styling
- **static/css/style.css**: Added `@supports not (backdrop-filter: blur(1px))` fallback — replaces blurred backgrounds with solid dark backgrounds on non-supporting browsers
- **static/css/admin.css**: No functional changes, focus-visible accessibility improvement

### Templates
- **app/templates/admin/timeline.html**: Added edit button per row, conditional form action for editing
- **app/templates/admin/milestones.html**: Added edit button per row, conditional form action for editing
- **app/templates/admin/settings.html**: Added parallax and scroll_reveal select fields
- **app/templates/errors/404.html**: New — dedicated 404 error page
- **app/templates/errors/500.html**: New — dedicated 500 error page
- **app/templates/public/index.html**: Added `<noscript>` fallback styles — reveals all elements and hides music modal when JS is disabled

### Logging
- **app/\_\_init\_\_.py**: Application-level logging with RotatingFileHandler (10KB, 10 backups)
- **app/admin/routes.py**: Added logging for login attempts, content changes, uploads, deletions
- **app/main/routes.py**: Added logging for API errors with `logger.error`

### Infrastructure
- **config.py**: Added `ALLOWED_IMAGE_EXTENSIONS` config key (now all three extension sets are explicit)
- **app/admin/routes.py**: Added `PHOTO_EXTENSIONS` and `MUSIC_EXTENSIONS` fallback constants in addition to app config
- **run.py**: Added `FLASK_HOST` and `FLASK_PORT` environment variable support
