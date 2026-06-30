document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const qs = (sel, ctx) => (ctx || document).querySelector(sel);
    const qsa = (sel, ctx) => (ctx || document).querySelectorAll(sel);

    const cfg = window.__ANIM_CONFIG__ || {};

    function safeInt(val, def) {
        const n = parseInt(val, 10);
        return Number.isFinite(n) ? n : def;
    }

    $('year').textContent = new Date().getFullYear();

    // =============================================
    // 0. NAVBAR
    // =============================================
    const navbar = $('navbar');
    const navbarToggle = $('navbarToggle');
    const navbarLinks = $('navbarLinks');

    navbarToggle.addEventListener('click', () => {
        navbarToggle.classList.toggle('active');
        navbarLinks.classList.toggle('open');
        navbarToggle.setAttribute('aria-expanded', navbarLinks.classList.contains('open'));
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navbarLinks.classList.remove('open');
            navbarToggle.classList.remove('active');
            navbarToggle.setAttribute('aria-expanded', 'false');
        });
    });

    let ticking2 = false;
    window.addEventListener('scroll', () => {
        if (!ticking2) {
            requestAnimationFrame(() => {
                if (window.pageYOffset > 80) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
                ticking2 = false;
            });
            ticking2 = true;
        }
    });

    // =============================================
    // 1. MUSIC MODAL + API
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
        div.innerHTML = '<span class="note-icon">♪</span>';
        document.body.appendChild(div);
        requestAnimationFrame(() => div.classList.add('visible'));
    }

    setTimeout(showMusicModal, 1500);

    // =============================================
    // 2. CANVAS STARFIELD
    // =============================================
    const canvas = $('starfield');
    const ctx = canvas.getContext('2d');
    let w, h;

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Star {
        constructor() {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            const r = Math.random();
            if (r < 0.6) {
                this.size = 0.3 + Math.random() * 0.6;
                this.baseBright = 0.2 + Math.random() * 0.5;
                this.glow = false;
                this.twinkleSpeed = 0.008 + Math.random() * 0.025;
            } else if (r < 0.85) {
                this.size = 0.6 + Math.random() * 0.8;
                this.baseBright = 0.3 + Math.random() * 0.4;
                this.glow = false;
                this.twinkleSpeed = 0.006 + Math.random() * 0.02;
            } else {
                this.size = 1.2 + Math.random() * 1.0;
                this.baseBright = 0.4 + Math.random() * 0.3;
                this.glow = true;
                this.twinkleSpeed = 0.004 + Math.random() * 0.015;
            }
            this.twinklePhase = Math.random() * Math.PI * 2;
            this.c = this.randomColor();
            this.ox = this.x;
            this.oy = this.y;
        }
        randomColor() {
            const r = Math.random();
            if (r < 0.6) return { r: 240, g: 236, b: 228 };
            if (r < 0.75) return { r: 200, g: 215, b: 245 };
            if (r < 0.88) return { r: 245, g: 220, b: 200 };
            return { r: 220, g: 210, b: 245 };
        }
        update(time) {
            const t = time * this.twinkleSpeed + this.twinklePhase;
            this.bright = this.baseBright * (0.5 + 0.5 * Math.sin(t));
        }
        draw() {
            const a = Math.max(0.02, this.bright);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.c.r},${this.c.g},${this.c.b},${a})`;
            ctx.fill();
            if (this.glow && this.bright > 0.7) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.c.r},${this.c.g},${this.c.b},${a * 0.05})`;
                ctx.fill();
            }
        }
    }

    const starCount = Math.min(safeInt(cfg.starCount, 800), 1500);
    const stars = Array.from({ length: starCount }, () => new Star());

    class Cloud {
        constructor() {
            this.reset();
        }
        reset() {
            this.y = 0.1 + Math.random() * 0.2;
            this.speed = 0.05 + Math.random() * 0.1;
            this.opacity = 0.02 + Math.random() * 0.03;
            this.width = 100 + Math.random() * 200;
            this.height = 10 + Math.random() * 20;
            this.x = -this.width;
            this.points = [];
            const n = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i <= n; i++) {
                this.points.push({ offset: i / n, yOff: (Math.random() - 0.5) * this.height * 0.5 });
            }
        }
        update() {
            this.x += this.speed;
            if (this.x > w + this.width) this.reset();
        }
        draw() {
            const cy = this.y * h;
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.beginPath();
            ctx.moveTo(this.x, cy);
            for (const p of this.points) ctx.lineTo(this.x + p.offset * this.width, cy + p.yOff);
            for (let i = this.points.length - 1; i >= 0; i--) {
                const p = this.points[i];
                ctx.lineTo(this.x + p.offset * this.width, cy + p.yOff + this.height * 0.5);
            }
            ctx.closePath();
            ctx.fillStyle = '#f0ece4';
            ctx.fill();
            ctx.restore();
        }
    }

    const clouds = Array.from({ length: 2 }, () => new Cloud());

    let moonX, moonY, moonRadius;
    let moonClickCount = 0;

    function calcMoonPos() {
        moonX = w * 0.8;
        moonY = h * 0.12;
        moonRadius = Math.min(w, h) * 0.055;
    }
    calcMoonPos();
    window.addEventListener('resize', calcMoonPos);

    function drawMoon() {
        const mx = moonX, my = moonY, r = moonRadius;
        const og = ctx.createRadialGradient(mx, my, r * 0.3, mx, my, r * 4);
        og.addColorStop(0, 'rgba(232,196,196,0.06)');
        og.addColorStop(0.3, 'rgba(232,196,196,0.03)');
        og.addColorStop(1, 'rgba(232,196,196,0)');
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.arc(mx, my, r * 4, 0, Math.PI * 2);
        ctx.fill();
        const mg = ctx.createRadialGradient(mx, my, r * 0.5, mx, my, r * 2);
        mg.addColorStop(0, 'rgba(232,196,196,0.1)');
        mg.addColorStop(1, 'rgba(232,196,196,0)');
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(mx, my, r * 2, 0, Math.PI * 2);
        ctx.fill();
        const grad = ctx.createRadialGradient(mx - r * 0.1, my - r * 0.1, 0, mx, my, r);
        grad.addColorStop(0, '#f5f0e8');
        grad.addColorStop(0.4, '#ede4d4');
        grad.addColorStop(0.75, '#e0d4c0');
        grad.addColorStop(0.92, '#d4c8b0');
        grad.addColorStop(1, '#c0b4a0');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fill();
        const craters = [
            { x: 0.18, y: -0.2, r: 0.1 }, { x: -0.22, y: 0.15, r: 0.06 },
            { x: 0.3, y: 0.25, r: 0.08 }, { x: -0.1, y: -0.32, r: 0.04 },
            { x: -0.32, y: -0.25, r: 0.05 }, { x: 0.06, y: 0.32, r: 0.03 },
            { x: 0.38, y: -0.04, r: 0.04 }
        ];
        craters.forEach(c => {
            const cx = mx + c.x * r, cy = my + c.y * r, cr = c.r * r;
            ctx.beginPath();
            ctx.arc(cx, cy, cr, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(180,160,120,0.15)';
            ctx.fill();
        });
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(240,236,228,0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    class ShootingStar {
        constructor() {
            this.reset();
        }
        reset() {
            this.active = false;
            this.x = 0; this.y = 0;
            this.len = 60 + Math.random() * 100;
            this.speed = 8 + Math.random() * 12;
            this.angle = Math.PI / 4 + (Math.random() - 0.3) * Math.PI / 4;
            this.opacity = 1;
            this.trail = [];
            this.timer = 0;
            this.delay = 5000 + Math.random() * 15000;
        }
        update(dt) {
            if (!this.active) {
                this.timer += dt;
                if (this.timer >= this.delay) {
                    this.active = true;
                    this.timer = 0;
                    this.x = 50 + Math.random() * (w * 0.6);
                    this.y = Math.random() * h * 0.25;
                    this.opacity = 1;
                    this.trail = [];
                }
                return;
            }
            const dx = Math.cos(this.angle) * this.speed;
            const dy = Math.sin(this.angle) * this.speed;
            this.x += dx; this.y += dy;
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 20) this.trail.shift();
            this.opacity -= 0.015;
            if (this.opacity <= 0 || this.x > w + 100 || this.y > h + 100) {
                this.active = false;
                this.delay = 5000 + Math.random() * 20000;
                this.timer = 0;
            }
        }
        draw() {
            if (!this.active) return;
            for (let i = 1; i < this.trail.length; i++) {
                const t = this.trail[i];
                const o = this.opacity * (i / this.trail.length) * 0.2;
                ctx.beginPath();
                ctx.arc(t.x, t.y, 1, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(240,236,228,${o})`;
                ctx.fill();
            }
            const gx = this.x - Math.cos(this.angle) * this.len;
            const gy = this.y - Math.sin(this.angle) * this.len;
            const grad = ctx.createLinearGradient(this.x, this.y, gx, gy);
            grad.addColorStop(0, `rgba(240,236,228,${this.opacity})`);
            grad.addColorStop(0.4, `rgba(240,236,228,${this.opacity * 0.4})`);
            grad.addColorStop(1, 'rgba(240,236,228,0)');
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(gx, gy);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(240,236,228,${this.opacity})`;
            ctx.fill();
        }
    }

    const ssCount = safeInt(cfg.shootingStarCount, 1);
    const shootingStars = Array.from({ length: ssCount }, () => new ShootingStar());

    let lastT = 0;
    function animate(time) {
        const dt = lastT ? Math.min(time - lastT, 50) : 16;
        lastT = time;
        ctx.clearRect(0, 0, w, h);
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#050510');
        bg.addColorStop(0.3, '#080818');
        bg.addColorStop(0.6, '#0a0a1a');
        bg.addColorStop(0.85, '#0a0a18');
        bg.addColorStop(1, '#0a0a12');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        stars.forEach(s => { s.update(time); s.draw(); });
        drawMoon();
        clouds.forEach(c => { c.update(); c.draw(); });
        shootingStars.forEach(ss => { ss.update(dt); ss.draw(); });
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    // =============================================
    // 3. RELATIONSHIP TIMER
    // =============================================
    function parseRelationshipDate() {
        const dateEl = qs('.hero-timer-date');
        if (!dateEl) return new Date(2023, 0, 23);
        const match = dateEl.textContent.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (match) {
            return new Date(parseInt(match[3], 10), parseInt(match[2], 10) - 1, parseInt(match[1], 10));
        }
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
    // 4. ENVELOPE LOVE LETTER
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
        startTypewriter(letterParagraphs, letterBody, 50);
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
                setTimeout(tick, speed + (Math.random() - 0.5) * 20);
            } else {
                paraIdx++; charIdx = 0;
                if (paraIdx < paragraphs.length) { currentP = document.createElement('p'); container.insertBefore(currentP, cursor); }
                setTimeout(tick, 500);
            }
        }
        setTimeout(tick, 600);
    }

    // =============================================
    // 5. EASTER EGG
    // =============================================
    if (canvas) {
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            const dx = cx - moonX, dy = cy - moonY;
            if (Math.sqrt(dx * dx + dy * dy) < moonRadius * 1.8) {
                moonClickCount++;
                if (moonClickCount >= 5) {
                    moonClickCount = 0;
                    const em = $('easter-modal');
                    if (em) em.classList.add('active');
                }
            }
        });
    }

    const easterClose = $('easter-close');
    const easterModal = $('easter-modal');
    if (easterClose) easterClose.addEventListener('click', () => easterModal.classList.remove('active'));
    if (easterModal) easterModal.addEventListener('click', (e) => { if (e.target === easterModal) easterModal.classList.remove('active'); });

    // =============================================
    // 6. PHOTO GALLERY + LIGHTBOX
    // =============================================
    const galleryGrid = $('galleryGrid');
    const lightbox = $('lightbox');
    const lightboxImg = $('lightbox-img');
    const lightboxClose = $('lightbox-close');
    const lightboxPrev = $('lightbox-prev');
    const lightboxNext = $('lightbox-next');
    let galleryImages = [];
    let currentImageIndex = 0;

    function isCloudinaryUrl(url) {
        return url && url.indexOf('cloudinary') !== -1;
    }

    function cloudinarySrcset(url) {
        if (!isCloudinaryUrl(url)) return '';
        const base = url.replace('/upload/', '/upload/');
        const widths = [400, 800, 1200];
        return widths.map(w => {
            const src = url.replace('/upload/', `/upload/w_${w/2},f_auto,q_auto/`);
            return `${src} ${w}w`;
        }).join(', ');
    }

    function cloudinarySrc(url, width) {
        if (!isCloudinaryUrl(url)) return url;
        if (!width) return url;
        return url.replace('/upload/', `/upload/w_${width},f_auto,q_auto/`);
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
            frame.className = 'gallery-frame reveal empty-frame';
            frame.innerHTML = '<div class="gallery-placeholder"><span class="placeholder-text">Fotoğraflarını Bekliyor</span></div>';
            galleryGrid.appendChild(frame);
            return;
        }
        photos.forEach((photo, idx) => {
            const frame = document.createElement('div');
            frame.className = 'gallery-frame reveal';
            const src = photo.cloudinary_url || photo.url;
            const srcset = cloudinarySrcset(src);
            const img = document.createElement('img');
            img.src = cloudinarySrc(src, 600);
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
        lightboxImg.src = cloudinarySrc(src, 1200);
        lightboxImg.srcset = cloudinarySrcset(src);
        lightboxImg.sizes = '85vw';
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateLightboxNav();
    }

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function prevImage() {
        if (galleryImages.length <= 1) return;
        currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
        const photo = galleryImages[currentImageIndex];
        const src = photo.cloudinary_url || photo.url;
        lightboxImg.src = cloudinarySrc(src, 1200);
        lightboxImg.srcset = cloudinarySrcset(src);
    }

    function nextImage() {
        if (galleryImages.length <= 1) return;
        currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
        const photo = galleryImages[currentImageIndex];
        const src = photo.cloudinary_url || photo.url;
        lightboxImg.src = cloudinarySrc(src, 1200);
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

    loadGallery();

    // =============================================
    // 7. SCROLL REVEAL
    // =============================================
    const revealEls = qsa('.reveal');
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -80px 0px' });
    revealEls.forEach(el => obs.observe(el));

    // =============================================
    // 8. HERO PARALLAX (very subtle)
    // =============================================
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const sy = window.pageYOffset;
                const heroSection = document.getElementById('hero');
                if (heroSection && sy <= heroSection.offsetHeight) {
                    const content = qs('.hero-content');
                    if (content) {
                        const pct = sy / heroSection.offsetHeight;
                        content.style.transform = `translateY(${pct * 20}px)`;
                        content.style.opacity = 1 - pct * 0.5;
                    }
                }
                ticking = false;
            });
            ticking = true;
        }
    });
});
