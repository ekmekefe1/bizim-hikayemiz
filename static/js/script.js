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
                if (window.pageYOffset > 60) {
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
        div.innerHTML = '<span class="note-icon">🎵</span><span>Müzik açık</span><div class="bar-group"><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div></div>';
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

    function drawMilkyWay() {
        const gw = w * 0.9;
        const cx = w * 0.45;
        const cy = h * 0.35;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, gw);
        grad.addColorStop(0, 'rgba(120,100,180,0.03)');
        grad.addColorStop(0.3, 'rgba(100,80,160,0.025)');
        grad.addColorStop(0.6, 'rgba(80,60,140,0.015)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, gw, gw * 0.35, -0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    class Star {
        constructor() {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            const r = Math.random();
            if (r < 0.55) {
                this.size = 0.3 + Math.random() * 0.7;
                this.baseBright = 0.3 + Math.random() * 0.6;
                this.drift = 0;
                this.glow = false;
                this.twinkleSpeed = 0.01 + Math.random() * 0.03;
            } else if (r < 0.80) {
                this.size = 0.8 + Math.random() * 1.0;
                this.baseBright = 0.5 + Math.random() * 0.5;
                this.drift = 0.02 + Math.random() * 0.04;
                this.driftAngle = Math.random() * Math.PI * 2;
                this.glow = false;
                this.twinkleSpeed = 0.008 + Math.random() * 0.02;
            } else if (r < 0.93) {
                this.size = 1.5 + Math.random() * 1.2;
                this.baseBright = 0.7 + Math.random() * 0.3;
                this.drift = 0.04 + Math.random() * 0.06;
                this.driftAngle = Math.random() * Math.PI * 2;
                this.glow = true;
                this.twinkleSpeed = 0.006 + Math.random() * 0.015;
            } else {
                this.size = 2.2 + Math.random() * 1.8;
                this.baseBright = 0.85 + Math.random() * 0.15;
                this.drift = 0.05 + Math.random() * 0.08;
                this.driftAngle = Math.random() * Math.PI * 2;
                this.glow = true;
                this.twinkleSpeed = 0.005 + Math.random() * 0.01;
            }
            this.twinklePhase = Math.random() * Math.PI * 2;
            this.c = this.randomColor();
            this.ox = this.x;
            this.oy = this.y;
        }
        randomColor() {
            const r = Math.random();
            if (r < 0.55) return { r: 255, g: 255, b: 255 };
            if (r < 0.70) return { r: 210, g: 225, b: 255 };
            if (r < 0.82) return { r: 255, g: 225, b: 210 };
            if (r < 0.92) return { r: 200, g: 200, b: 255 };
            return { r: 255, g: 210, b: 230 };
        }
        update(time) {
            const t = time * this.twinkleSpeed + this.twinklePhase;
            this.bright = this.baseBright * (0.55 + 0.45 * Math.sin(t));
            if (this.drift) {
                this.x = this.ox + Math.sin(time * this.drift + this.driftAngle) * 3;
                this.y = this.oy + Math.cos(time * this.drift * 0.7 + this.driftAngle) * 2;
            }
        }
        draw() {
            const a = Math.max(0.04, this.bright);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.c.r},${this.c.g},${this.c.b},${a})`;
            ctx.fill();
            if (this.glow && this.bright > 0.7) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.c.r},${this.c.g},${this.c.b},${a * 0.08})`;
                ctx.fill();
            }
        }
    }

    const starCount = safeInt(cfg.starCount, 4000);
    const stars = Array.from({ length: starCount }, () => new Star());

    class Cloud {
        constructor() {
            this.reset();
        }
        reset() {
            this.y = 0.08 + Math.random() * 0.25;
            this.speed = 0.08 + Math.random() * 0.15;
            this.opacity = 0.03 + Math.random() * 0.05;
            this.width = 120 + Math.random() * 250;
            this.height = 15 + Math.random() * 30;
            this.x = -this.width;
            this.points = [];
            const n = 4 + Math.floor(Math.random() * 4);
            for (let i = 0; i <= n; i++) {
                this.points.push({ offset: i / n, yOff: (Math.random() - 0.5) * this.height * 0.6 });
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
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.restore();
        }
    }

    const clouds = Array.from({ length: 3 }, () => new Cloud());

    let moonX, moonY, moonRadius;
    let moonClickCount = 0;

    function calcMoonPos() {
        moonX = w * 0.78;
        moonY = h * 0.14;
        moonRadius = Math.min(w, h) * 0.065;
    }
    calcMoonPos();
    window.addEventListener('resize', calcMoonPos);

    function drawMoon() {
        const mx = moonX, my = moonY, r = moonRadius;
        const og = ctx.createRadialGradient(mx, my, r * 0.3, mx, my, r * 4);
        og.addColorStop(0, 'rgba(255,245,210,0.08)');
        og.addColorStop(0.25, 'rgba(255,245,210,0.04)');
        og.addColorStop(1, 'rgba(255,245,210,0)');
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.arc(mx, my, r * 4, 0, Math.PI * 2);
        ctx.fill();
        const mg = ctx.createRadialGradient(mx, my, r * 0.5, mx, my, r * 2);
        mg.addColorStop(0, 'rgba(255,245,210,0.15)');
        mg.addColorStop(1, 'rgba(255,245,210,0)');
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(mx, my, r * 2, 0, Math.PI * 2);
        ctx.fill();
        const grad = ctx.createRadialGradient(mx - r * 0.15, my - r * 0.15, 0, mx, my, r);
        grad.addColorStop(0, '#fffbe8');
        grad.addColorStop(0.4, '#f5edc0');
        grad.addColorStop(0.75, '#e8d8a0');
        grad.addColorStop(0.92, '#d4c488');
        grad.addColorStop(1, '#b8a868');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fill();
        const sh = ctx.createRadialGradient(mx + r * 0.3, my - r * 0.2, r * 0.1, mx + r * 0.4, my - r * 0.1, r * 1.2);
        sh.addColorStop(0, 'rgba(0,0,0,0)');
        sh.addColorStop(0.7, 'rgba(0,0,0,0.03)');
        sh.addColorStop(1, 'rgba(0,0,0,0.08)');
        ctx.fillStyle = sh;
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fill();
        const craters = [
            { x: 0.18, y: -0.22, r: 0.11 }, { x: -0.25, y: 0.15, r: 0.07 },
            { x: 0.32, y: 0.28, r: 0.09 }, { x: -0.08, y: -0.35, r: 0.05 },
            { x: -0.35, y: -0.28, r: 0.06 }, { x: 0.05, y: 0.35, r: 0.04 },
            { x: 0.40, y: -0.05, r: 0.05 }
        ];
        craters.forEach(c => {
            const cx = mx + c.x * r, cy = my + c.y * r, cr = c.r * r;
            ctx.beginPath();
            ctx.arc(cx, cy, cr, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(160,140,80,0.2)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx - cr * 0.2, cy - cr * 0.2, cr * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,220,0.08)';
            ctx.fill();
        });
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,245,210,0.1)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    class HeartParticle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * w;
            this.y = h + 60 + Math.random() * 120;
            this.size = 6 + Math.random() * 16;
            this.speed = 0.2 + Math.random() * 0.45;
            this.oscAmp = 12 + Math.random() * 30;
            this.oscSpeed = 0.006 + Math.random() * 0.012;
            this.phase = Math.random() * Math.PI * 2;
            this.opacity = 0.15 + Math.random() * 0.3;
            this.hue = Math.random() < 0.55 ? 345 : 0;
        }
        update() {
            this.y -= this.speed;
            this.phase += this.oscSpeed;
            this.x += Math.sin(this.phase) * 0.35;
            if (this.y < -80) this.reset();
        }
        draw() {
            const s = this.size;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.scale(s / 16, s / 16);
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = this.hue === 345 ? '#e94560' : '#ff6b6b';
            ctx.beginPath();
            ctx.moveTo(0, 4);
            ctx.bezierCurveTo(-8, -4, -10, -10, -3, -10);
            ctx.bezierCurveTo(0, -10, 0, -6, 0, -6);
            ctx.bezierCurveTo(0, -10, 3, -10, 10, -10);
            ctx.bezierCurveTo(10, -4, 8, -4, 0, 4);
            ctx.fill();
            ctx.restore();
        }
    }

    const heartCount = Math.max(4, Math.floor(safeInt(cfg.heartCount, 20) * 0.2));
    const hearts = Array.from({ length: heartCount }, () => new HeartParticle());

    class ShootingStar {
        constructor() {
            this.reset();
        }
        reset() {
            this.active = false;
            this.x = 0; this.y = 0;
            this.len = 80 + Math.random() * 150;
            this.speed = 10 + Math.random() * 16;
            this.angle = Math.PI / 4 + (Math.random() - 0.3) * Math.PI / 4;
            this.opacity = 1;
            this.trail = [];
            this.timer = 0;
            this.delay = 2000 + Math.random() * 10000;
        }
        update(dt) {
            if (!this.active) {
                this.timer += dt;
                if (this.timer >= this.delay) {
                    this.active = true;
                    this.timer = 0;
                    this.x = 50 + Math.random() * (w * 0.7);
                    this.y = Math.random() * h * 0.3;
                    this.opacity = 1;
                    this.trail = [];
                }
                return;
            }
            const dx = Math.cos(this.angle) * this.speed;
            const dy = Math.sin(this.angle) * this.speed;
            this.x += dx; this.y += dy;
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 25) this.trail.shift();
            this.opacity -= 0.012;
            if (this.opacity <= 0 || this.x > w + 100 || this.y > h + 100) {
                this.active = false;
                this.delay = 3000 + Math.random() * 12000;
                this.timer = 0;
            }
        }
        draw() {
            if (!this.active) return;
            for (let i = 1; i < this.trail.length; i++) {
                const t = this.trail[i];
                const o = this.opacity * (i / this.trail.length) * 0.25;
                ctx.beginPath();
                ctx.arc(t.x, t.y, 1.2 * (i / this.trail.length), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${o})`;
                ctx.fill();
            }
            const gx = this.x - Math.cos(this.angle) * this.len;
            const gy = this.y - Math.sin(this.angle) * this.len;
            const grad = ctx.createLinearGradient(this.x, this.y, gx, gy);
            grad.addColorStop(0, `rgba(255,255,255,${this.opacity})`);
            grad.addColorStop(0.35, `rgba(255,250,230,${this.opacity * 0.5})`);
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(gx, gy);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${this.opacity})`;
            ctx.fill();
        }
    }

    const ssCount = safeInt(cfg.shootingStarCount, 4);
    const shootingStars = Array.from({ length: ssCount }, () => new ShootingStar());

    let lastT = 0;
    function animate(time) {
        const dt = lastT ? Math.min(time - lastT, 50) : 16;
        lastT = time;
        ctx.clearRect(0, 0, w, h);
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#040416');
        bg.addColorStop(0.3, '#060620');
        bg.addColorStop(0.6, '#080828');
        bg.addColorStop(0.85, '#0a0a20');
        bg.addColorStop(1, '#060612');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        drawMilkyWay();
        stars.forEach(s => { s.update(time); s.draw(); });
        drawMoon();
        clouds.forEach(c => { c.update(); c.draw(); });
        shootingStars.forEach(ss => { ss.update(dt); ss.draw(); });
        hearts.forEach(h => { h.update(); h.draw(); });
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
        const heroTimer = $('heroTimerValue');
        if (heroTimer) heroTimer.textContent = `${years} Yıl ${months} Ay ${days} Gün · ${hh}:${mm}:${ss}`;
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
        startTypewriter(letterParagraphs, letterBody, 40);
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
    // 6. HEART BURST
    // =============================================
    document.addEventListener('click', (e) => {
        const tag = e.target.tagName;
        if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
            e.target.closest('.modal-overlay') || e.target.closest('.envelope') ||
            e.target.closest('.lightbox') || e.target.closest('.gallery-frame')) return;
        burstHearts(e.clientX, e.clientY);
    });

    function burstHearts(x, y) {
        const count = 10 + Math.floor(Math.random() * 8);
        const symbols = ['❤️', '💖', '💕', '✨'];
        for (let i = 0; i < count; i++) {
            const el = document.createElement('span');
            el.className = 'heart-particle';
            el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            const angle = Math.random() * Math.PI * 2;
            const dist = 60 + Math.random() * 120;
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.style.setProperty('--tx', (Math.cos(angle) * dist) + 'px');
            el.style.setProperty('--ty', (Math.sin(angle) * dist - 30) + 'px');
            el.style.fontSize = (10 + Math.random() * 16) + 'px';
            el.style.animationDuration = (0.8 + Math.random() * 0.6) + 's';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1600);
        }
    }

    // =============================================
    // 7. PHOTO GALLERY + LIGHTBOX
    // =============================================
    const galleryGrid = $('galleryGrid');
    const lightbox = $('lightbox');
    const lightboxImg = $('lightbox-img');
    const lightboxClose = $('lightbox-close');
    const lightboxPrev = $('lightbox-prev');
    const lightboxNext = $('lightbox-next');
    let galleryImages = [];
    let currentImageIndex = 0;

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
            frame.className = 'gallery-frame glass-card reveal empty-frame';
            frame.innerHTML = '<div class="gallery-placeholder"><span class="placeholder-icon">❤️</span><span class="placeholder-text">Fotoğraflarını Bekliyor</span></div>';
            galleryGrid.appendChild(frame);
            return;
        }
        photos.forEach((photo, idx) => {
            const frame = document.createElement('div');
            frame.className = 'gallery-frame glass-card reveal';
            frame.innerHTML = `<img src="${photo.url}" alt="${photo.caption || 'Fotoğraf ' + (idx + 1)}" loading="lazy">`;
            frame.addEventListener('click', () => openLightbox(idx));
            galleryGrid.appendChild(frame);
        });
    }

    function openLightbox(idx) {
        if (!lightbox || !lightboxImg) return;
        currentImageIndex = idx;
        lightboxImg.src = galleryImages[idx].url;
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
        lightboxImg.src = galleryImages[currentImageIndex].url;
    }

    function nextImage() {
        if (galleryImages.length <= 1) return;
        currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
        lightboxImg.src = galleryImages[currentImageIndex].url;
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
    // 8. SCROLL REVEAL
    // =============================================
    const revealEls = qsa('.reveal');
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => obs.observe(el));

    // =============================================
    // 9. HERO PARALLAX
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
                        content.style.transform = `translateY(${pct * 50}px)`;
                        content.style.opacity = 1 - pct * 0.5;
                    }
                }
                ticking = false;
            });
            ticking = true;
        }
    });

    // =============================================
    // 10. FLOATING DECORATIVE (reduced by 80%)
    // =============================================
    const floatingContainer = $('floating-elements');
    if (floatingContainer) {
        const fhCount = Math.max(3, Math.floor(safeInt(cfg.floatingHearts, 15) * 0.2));
        const frCount = safeInt(cfg.floatingRoses, 6);

        for (let i = 0; i < fhCount; i++) {
            const el = document.createElement('span');
            el.className = 'floating-heart';
            el.textContent = Math.random() > 0.5 ? '❤️' : '💖';
            el.style.left = Math.random() * 94 + '%';
            el.style.fontSize = (10 + Math.random() * 18) + 'px';
            el.style.animationDuration = (12 + Math.random() * 18) + 's';
            el.style.animationDelay = (Math.random() * 15) + 's';
            floatingContainer.appendChild(el);
        }

        for (let i = 0; i < frCount; i++) {
            const el = document.createElement('span');
            el.className = 'floating-rose';
            el.textContent = i % 2 === 0 ? '🌹' : '🤍';
            el.style.left = Math.random() * 94 + '%';
            el.style.fontSize = (14 + Math.random() * 16) + 'px';
            el.style.animationDuration = (14 + Math.random() * 18) + 's';
            el.style.animationDelay = (Math.random() * 15) + 's';
            floatingContainer.appendChild(el);
        }
    }
});
