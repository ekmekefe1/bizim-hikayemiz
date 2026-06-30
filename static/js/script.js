document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const qs = (sel, ctx) => (ctx || document).querySelector(sel);
    const qsa = (sel, ctx) => (ctx || document).querySelectorAll(sel);

    const cfg = window.__ANIM_CONFIG__ || {};

    function safeInt(val, def) {
        const n = parseInt(val, 10);
        return Number.isFinite(n) ? n : def;
    }

    // =============================================
    // 0. PREVENT SCROLL & WHEEL
    // =============================================
    document.addEventListener('wheel', e => e.preventDefault(), { passive: false });
    document.addEventListener('touchmove', e => {
        if (!e.target.closest('.view.active') && !e.target.closest('.letter-paper') &&
            !e.target.closest('.gallery-grid') && !e.target.closest('.drawer') &&
            !e.target.closest('.lightbox-overlay.active')) {
            e.preventDefault();
        }
    }, { passive: false });
    document.addEventListener('keydown', e => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'PageUp' || e.key === 'PageDown' || e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
        }
    });

    // =============================================
    // 1. VIEW NAVIGATION
    // =============================================
    const views = qsa('.view');
    const drawerLinks = qsa('.drawer-link');
    const drawer = $('drawer');
    const drawerBackdrop = $('drawerBackdrop');
    const menuToggle = $('menuToggle');
    const drawerClose = $('drawerClose');
    let currentView = 'counter';

    function switchView(viewId) {
        if (viewId === currentView) return;
        views.forEach(v => v.classList.remove('active'));
        const target = $('view-' + viewId);
        if (target) {
            target.classList.add('active');
            currentView = viewId;
        }
        drawerLinks.forEach(l => {
            l.classList.toggle('active', l.dataset.view === viewId);
        });
        closeDrawer();
    }

    drawerLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const view = link.dataset.view;
            switchView(view);
            history.replaceState(null, '', '#' + view);
        });
    });

    // Handle hash on load
    const hash = window.location.hash.replace('#', '');
    if (hash && $('view-' + hash)) {
        switchView(hash);
    }

    // =============================================
    // 2. DRAWER
    // =============================================
    function openDrawer() {
        drawer.classList.add('active');
        drawerBackdrop.classList.add('active');
    }

    function closeDrawer() {
        drawer.classList.remove('active');
        drawerBackdrop.classList.remove('active');
    }

    menuToggle.addEventListener('click', openDrawer);
    drawerClose.addEventListener('click', closeDrawer);
    drawerBackdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && drawer.classList.contains('active')) {
            closeDrawer();
        }
    });

    // =============================================
    // 3. SUBTLE STARS CANVAS
    // =============================================
    const canvas = $('stars-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let w, h;

        function resize() {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        const count = Math.min(safeInt(cfg.starCount, 150), 300);
        const stars = Array.from({ length: count }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            size: 0.3 + Math.random() * 0.5,
            bright: 0.1 + Math.random() * 0.2,
            speed: 0.005 + Math.random() * 0.015,
            phase: Math.random() * Math.PI * 2
        }));

        class ShootingStar {
            constructor() {
                this.reset();
            }
            reset() {
                this.active = false;
                this.x = 0; this.y = 0;
                this.speed = 6 + Math.random() * 8;
                this.angle = Math.PI / 4 + (Math.random() - 0.3) * Math.PI / 4;
                this.opacity = 1;
                this.timer = 0;
                this.delay = 8000 + Math.random() * 20000;
            }
            update(dt) {
                if (!this.active) {
                    this.timer += dt;
                    if (this.timer >= this.delay) {
                        this.active = true;
                        this.timer = 0;
                        this.x = 50 + Math.random() * (w * 0.5);
                        this.y = Math.random() * h * 0.2;
                        this.opacity = 1;
                    }
                    return;
                }
                const dx = Math.cos(this.angle) * this.speed;
                const dy = Math.sin(this.angle) * this.speed;
                this.x += dx; this.y += dy;
                this.opacity -= 0.02;
                if (this.opacity <= 0 || this.x > w + 100 || this.y > h + 100) {
                    this.active = false;
                    this.delay = 10000 + Math.random() * 30000;
                    this.timer = 0;
                }
            }
            draw() {
                if (!this.active) return;
                const len = 40 + Math.random() * 60;
                const gx = this.x - Math.cos(this.angle) * len;
                const gy = this.y - Math.sin(this.angle) * len;
                const grad = ctx.createLinearGradient(this.x, this.y, gx, gy);
                grad.addColorStop(0, `rgba(247,232,228,${this.opacity})`);
                grad.addColorStop(1, 'rgba(247,232,228,0)');
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(gx, gy);
                ctx.strokeStyle = grad;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }

        const shootingStars = Array.from({ length: safeInt(cfg.shootingStarCount, 1) }, () => new ShootingStar());

        let lastT = 0;
        function animate(time) {
            const dt = lastT ? Math.min(time - lastT, 50) : 16;
            lastT = time;
            ctx.clearRect(0, 0, w, h);
            stars.forEach(s => {
                const t = time * s.speed + s.phase;
                const a = s.bright * (0.5 + 0.5 * Math.sin(t));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(247,232,228,${Math.max(0.02, a)})`;
                ctx.fill();
            });
            shootingStars.forEach(ss => { ss.update(dt); ss.draw(); });
            requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);

        // =============================================
        // 4. EASTER EGG (moon click)
        // =============================================
        let moonClickCount = 0;
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            const moonX = w * 0.8, moonY = h * 0.1, moonR = Math.min(w, h) * 0.05;
            const dx = cx - moonX, dy = cy - moonY;
            if (Math.sqrt(dx * dx + dy * dy) < moonR * 2) {
                moonClickCount++;
                if (moonClickCount >= 5) {
                    moonClickCount = 0;
                    const em = $('easter-modal');
                    if (em) em.classList.add('active');
                }
            }
        });
    }

    // =============================================
    // 5. RELATIONSHIP TIMER
    // =============================================
    function parseRelationshipDate() {
        return new Date(2023, 0, 23);
    }

    const relationshipStart = parseRelationshipDate();

    function updateTimers() {
        const now = new Date();
        let years = now.getFullYear() - relationshipStart.getFullYear();
        let months = now.getMonth() - relationshipStart.getMonth();
        let days = now.getDate() - relationshipStart.getDate();
        if (days < 0) { months--; const prev = new Date(now.getFullYear(), now.getMonth(), 0); days += prev.getDate(); }
        if (months < 0) { years--; months += 12; }
        const pad = n => n.toString().padStart(2, '0');
        const hh = pad(now.getHours()), mm = pad(now.getMinutes()), ss = pad(now.getSeconds());
        const ey = $('years'); if (ey) ey.textContent = years;
        const em = $('months'); if (em) em.textContent = months;
        const ed = $('days'); if (ed) ed.textContent = days;
        const eh = $('hours'); if (eh) eh.textContent = hh;
        const emm = $('minutes'); if (emm) emm.textContent = mm;
        const es = $('seconds'); if (es) es.textContent = ss;
    }
    updateTimers();
    setInterval(updateTimers, 1000);

    // =============================================
    // 6. MUSIC MODAL
    // =============================================
    const musicModal = $('music-modal');
    const musicYes = $('music-yes');
    const musicNo = $('music-no');
    let audio = null;

    function showMusicModal() { musicModal.classList.add('active'); }
    function hideMusicModal() { musicModal.classList.remove('active'); }

    musicYes.addEventListener('click', async () => {
        hideMusicModal();
        try {
            const res = await fetch('/api/music');
            const tracks = await res.json();
            if (tracks.length > 0) {
                audio = new Audio(tracks[0].url);
                audio.loop = true;
                audio.volume = 0.3;
                audio.play().catch(() => {});
                createMusicIndicator();
            }
        } catch (e) {}
    });

    musicNo.addEventListener('click', hideMusicModal);

    function createMusicIndicator() {
        const div = document.createElement('div');
        div.className = 'music-indicator';
        div.id = 'musicIndicator';
        div.innerHTML = '<span class="note-icon">♪</span> Müzik açık';
        document.body.appendChild(div);
        requestAnimationFrame(() => div.classList.add('visible'));
    }

    setTimeout(showMusicModal, 1200);

    // =============================================
    // 7. ENVELOPE LOVE LETTER
    // =============================================
    const envelope = $('envelope');
    const letterBody = $('letterBody');
    let envelopeOpen = false;
    let typewriterRunning = false;

    let letterParagraphs = [];
    try {
        const raw = (letterBody && letterBody.dataset.paragraphs) || '[]';
        letterParagraphs = JSON.parse(raw);
        if (!Array.isArray(letterParagraphs) || letterParagraphs.length === 0) throw 'empty';
    } catch (e) {
        letterParagraphs = [
            'Seni tanıdığım günden beri dünyam çok daha güzel bir yer oldu. Gözlerindeki ışıltı her karanlık gecenin sabahı oldu. Gülüşün, en içten melodim.',
            'Her geçen gün sana olan sevgim biraz daha büyüyor. Hayatımın her anını seninle paylaşmak, her yıldızın altında elini tutmak istiyorum.',
            'Sonsuza dek seninle olmak dileğiyle...'
        ];
    }

    function openEnvelope() {
        if (envelopeOpen || typewriterRunning) return;
        envelope.classList.add('open');
        envelopeOpen = true;
        startTypewriter(letterParagraphs, letterBody, 45);
    }

    if (envelope) {
        envelope.addEventListener('click', openEnvelope);
        envelope.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEnvelope();
            }
        });
    }

    function startTypewriter(paragraphs, container, speed) {
        if (!container) return;
        typewriterRunning = true;
        container.innerHTML = '';
        let paraIdx = 0, charIdx = 0;
        let currentP = document.createElement('p');
        container.appendChild(currentP);
        const cursor = document.createElement('span');
        cursor.className = 'typewriter-cursor';
        container.appendChild(cursor);

        function tick() {
            if (paraIdx >= paragraphs.length) { cursor.remove(); typewriterRunning = false; return; }
            const text = paragraphs[paraIdx];
            if (charIdx < text.length) {
                currentP.textContent += text[charIdx];
                charIdx++;
                setTimeout(tick, speed + (Math.random() - 0.5) * 15);
            } else {
                paraIdx++; charIdx = 0;
                if (paraIdx < paragraphs.length) { currentP = document.createElement('p'); container.insertBefore(currentP, cursor); }
                setTimeout(tick, 400);
            }
        }
        setTimeout(tick, 500);
    }

    // =============================================
    // 8. EASTER EGG MODAL
    // =============================================
    const easterClose = $('easter-close');
    const easterModal = $('easter-modal');
    if (easterClose) easterClose.addEventListener('click', () => easterModal.classList.remove('active'));
    if (easterModal) easterModal.addEventListener('click', (e) => { if (e.target === easterModal) easterModal.classList.remove('active'); });

    // =============================================
    // 9. GALLERY + LIGHTBOX
    // =============================================
    const galleryGrid = $('galleryGrid');
    const lightbox = $('lightbox');
    const lightboxImg = $('lightboxImg');
    const lightboxClose = $('lightboxClose');
    const lightboxPrev = $('lightboxPrev');
    const lightboxNext = $('lightboxNext');
    let galleryImages = [];
    let currentImageIndex = 0;

    function isCloudinaryUrl(url) {
        return url && url.indexOf('cloudinary') !== -1;
    }

    function cloudinarySrc(url, width) {
        if (!isCloudinaryUrl(url)) return url;
        if (!width) return url;
        return url.replace('/upload/', `/upload/w_${width},f_auto,q_auto/`);
    }

    function cloudinarySrcset(url) {
        if (!isCloudinaryUrl(url)) return '';
        const widths = [400, 800, 1200];
        return widths.map(w => {
            const src = url.replace('/upload/', `/upload/w_${w/2},f_auto,q_auto/`);
            return `${src} ${w}w`;
        }).join(', ');
    }

    async function loadGallery() {
        try {
            const res = await fetch('/api/photos');
            const photos = await res.json();
            renderGallery(photos);
        } catch (e) {
            renderGallery([]);
        }
    }

    function renderGallery(photos) {
        if (!galleryGrid) return;
        galleryGrid.innerHTML = '';
        galleryImages = photos;
        if (photos.length === 0) {
            const frame = document.createElement('div');
            frame.className = 'gallery-frame';
            frame.innerHTML = '<div class="gallery-placeholder"><span>Fotoğraflarını Bekliyor</span></div>';
            galleryGrid.appendChild(frame);
            return;
        }
        photos.forEach((photo, idx) => {
            const frame = document.createElement('div');
            frame.className = 'gallery-frame';
            const src = photo.cloudinary_url || photo.url;
            const srcset = cloudinarySrcset(src);
            const img = document.createElement('img');
            img.src = cloudinarySrc(src, 500);
            img.alt = photo.caption || 'Fotoğraf ' + (idx + 1);
            img.loading = 'lazy';
            if (srcset) img.srcset = srcset;
            img.sizes = '(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw';
            frame.appendChild(img);
            frame.addEventListener('click', () => openLightbox(idx));
            galleryGrid.appendChild(frame);
        });
    }

    function openLightbox(idx) {
        if (!lightbox || !lightboxImg) return;
        currentImageIndex = idx;
        const photo = galleryImages[idx];
        const src = photo.cloudinary_url || photo.url;
        lightboxImg.src = cloudinarySrc(src, 1000);
        lightboxImg.srcset = cloudinarySrcset(src);
        lightboxImg.sizes = '85vw';
        lightbox.classList.add('active');
        updateLightboxNav();
    }

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.remove('active');
    }

    function prevImage() {
        if (galleryImages.length <= 1) return;
        currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
        const photo = galleryImages[currentImageIndex];
        const src = photo.cloudinary_url || photo.url;
        lightboxImg.src = cloudinarySrc(src, 1000);
        lightboxImg.srcset = cloudinarySrcset(src);
    }

    function nextImage() {
        if (galleryImages.length <= 1) return;
        currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
        const photo = galleryImages[currentImageIndex];
        const src = photo.cloudinary_url || photo.url;
        lightboxImg.src = cloudinarySrc(src, 1000);
        lightboxImg.srcset = cloudinarySrcset(src);
    }

    function updateLightboxNav() {
        const single = galleryImages.length <= 1;
        if (lightboxPrev) lightboxPrev.style.display = single ? 'none' : 'flex';
        if (lightboxNext) lightboxNext.style.display = single ? 'none' : 'flex';
    }

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', prevImage);
    if (lightboxNext) lightboxNext.addEventListener('click', nextImage);
    if (lightbox) lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

    document.addEventListener('keydown', (e) => {
        if (!lightbox || !lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') prevImage();
        if (e.key === 'ArrowRight') nextImage();
    });

    // Touch swipe for lightbox
    let touchStartX = 0;
    if (lightbox) {
        lightbox.addEventListener('touchstart', e => {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });
        lightbox.addEventListener('touchend', e => {
            if (!lightbox.classList.contains('active')) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(dx) > 50) {
                if (dx > 0) prevImage();
                else nextImage();
            }
        }, { passive: true });
    }

    loadGallery();

    // =============================================
    // 10. SWIPE TO CLOSE DRAWER
    // =============================================
    let drawerTouchX = 0;
    drawer.addEventListener('touchstart', e => {
        drawerTouchX = e.touches[0].clientX;
    }, { passive: true });
    drawer.addEventListener('touchmove', e => {
        const dx = e.touches[0].clientX - drawerTouchX;
        if (dx > 0) {
            drawer.style.transform = `translateX(${dx}px)`;
        }
    }, { passive: true });
    drawer.addEventListener('touchend', e => {
        drawer.style.transform = '';
        const dx = e.changedTouches[0].clientX - drawerTouchX;
        if (dx > 60) closeDrawer();
    }, { passive: true });
});
