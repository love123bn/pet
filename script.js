const page1 = document.getElementById('page1');
const page2 = document.getElementById('page2');
const enterBtn = document.getElementById('enterBtn');
const floatingHearts = document.getElementById('floatingHearts');
const sparkles = document.getElementById('sparkles');
const loveText = document.getElementById('loveText');
const miniHearts = document.getElementById('miniHearts');
const particles = document.getElementById('particles');
const canvas = document.getElementById('heartCanvas');
const ctx = canvas.getContext('2d');

let W, H;
let points = [];
let time = 0;
let running = false;

// Drag
let rotX = 0, rotY = 0;
let tRX = 0, tRY = 0;
let dragging = false;
let ldx = 0, ldy = 0;
let velX = 0, velY = 0;

// Entrance
let entPhase = true;
let entProg = 0;
const ENT_DUR = 4;

// ===== Pre-compute heart shape =====
const HC = [];
for (let i = 0; i < 512; i++) {
    const t = (i / 512) * Math.PI * 2;
    HC.push({
        x: 16 * Math.pow(Math.sin(t), 3),
        y: -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t))
    });
}

// ===== Resize =====
function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', () => { resize(); if (running) createPoints(); });
resize();

// ===== Easing =====
function easeOut(t) { return 1 - (1 - t) * (1 - t) * (1 - t); }
function easeIO(t) { return t < 0.5 ? 2*t*t : 1 - (-2*t+2)*(-2*t+2)/2; }

// ===== Create dense particles =====
function createPoints() {
    points = [];
    const s = Math.min(W, H) / 50;

    function add(bx, by, z, r, hue, sat, lit, a, tw, delay, glow) {
        const ang = Math.random() * 6.28;
        const dist = Math.max(W, H) * 0.9 + Math.random() * 400;
        points.push({
            bx, by, z,
            sx: Math.cos(ang) * dist,
            sy: Math.sin(ang) * dist,
            sz: (Math.random() - 0.5) * 600 - 300,
            r, hue, sat, lit, a, tw, delay, glow
        });
    }

    // === OUTLINE RING (large hearts on edge) ===
    for (let i = 0; i < 110; i++) {
        const c = HC[Math.floor(i / 110 * 512)];
        add(c.x * s, c.y * s, (Math.random()-0.5) * 40,
            5 + Math.random() * 5,
            340 + Math.random() * 20,
            90 + Math.random() * 10,
            55 + Math.random() * 20,
            0.9 + Math.random() * 0.1,
            Math.random() * 6.28,
            Math.random() * 1.2,
            14 + Math.random() * 10);
    }

    // === FILL (dense inner hearts) ===
    for (let i = 0; i < 200; i++) {
        const t = Math.random() * 6.28;
        const rr = Math.pow(Math.random(), 0.5) * 0.92;
        const c = HC[Math.floor(((t%6.28+6.28)%6.28)/6.28*512)];
        add(c.x*s*rr, c.y*s*rr, (Math.random()-0.5) * 80,
            3 + Math.random() * 5,
            335 + Math.random() * 30,
            85 + Math.random() * 15,
            50 + Math.random() * 25,
            0.7 + Math.random() * 0.3,
            Math.random() * 6.28,
            Math.random() * 1.2 + 0.4,
            10 + Math.random() * 10);
    }

    // === CORE (bright center hearts) ===
    for (let i = 0; i < 80; i++) {
        const t = Math.random() * 6.28;
        const rr = Math.pow(Math.random(), 0.7) * 0.55;
        const c = HC[Math.floor(((t%6.28+6.28)%6.28)/6.28*512)];
        add(c.x*s*rr, c.y*s*rr, (Math.random()-0.5) * 50,
            2 + Math.random() * 3,
            350 + Math.random() * 15,
            100,
            70 + Math.random() * 30,
            0.9 + Math.random() * 0.1,
            Math.random() * 6.28,
            Math.random() * 1.0 + 0.6,
            6 + Math.random() * 6);
    }
}

// ===== Draw heart shape =====
function heartPath(x, y, r) {
    const h = r * 0.9;
    ctx.moveTo(x, y + h * 0.35);
    ctx.bezierCurveTo(x, y, x-r, y, x-r, y+h*0.35);
    ctx.bezierCurveTo(x-r, y+h*0.7, x, y+h, x, y+h);
    ctx.bezierCurveTo(x, y+h, x+r, y+h*0.7, x+r, y+h*0.35);
    ctx.bezierCurveTo(x+r, y, x, y, x, y+h*0.35);
}

// ===== Main render =====
const proj = [];
let projLen = 0;

function render() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    time += 0.016;

    // Entrance
    if (entPhase) {
        entProg += 0.016 / ENT_DUR;
        if (entProg >= 1) {
            entProg = 1;
            entPhase = false;
            const h = document.getElementById('dragHint');
            if (h) h.classList.add('show');
        }
    }

    // Heartbeat
    let bs = 1, b1 = 0;
    if (!entPhase) {
        const bt = time * 5;
        b1 = Math.pow(Math.max(0, Math.sin(bt)), 8);
        bs = 1 + b1 * 0.2 + Math.pow(Math.max(0, Math.sin(bt+1.2)), 8) * 0.06;
    }

    // Rotation
    if (!dragging) {
        tRY += velY; tRX += velX;
        velX *= 0.95; velY *= 0.95;
        if (velX*velX < 1e-8) velX = 0;
        if (velY*velY < 1e-8) velY = 0;
    }
    rotX += (tRX - rotX) * 0.12;
    rotY += (tRY - rotY) * 0.12;

    const crx = Math.cos(rotX), srx = Math.sin(rotX);
    const cry = Math.cos(rotY), sry = Math.sin(rotY);
    const cx = W * 0.5, cy = H * 0.5 - 20;
    const fov = 500;
    const len = points.length;

    // Background glow - use screen blending, no visible circle edges
    const gf = entPhase ? easeIO(entProg) : 1;
    const bg = 0.6 + b1 * 0.4;
    const ga = gf * bg;

    ctx.globalCompositeOperation = 'screen';

    ctx.globalAlpha = 0.08 * ga;
    ctx.fillStyle = '#cc1050';
    ctx.beginPath(); ctx.arc(cx, cy, 320, 0, 6.28); ctx.fill();

    ctx.globalAlpha = 0.15 * ga;
    ctx.fillStyle = '#ff3080';
    ctx.beginPath(); ctx.arc(cx, cy, 160, 0, 6.28); ctx.fill();

    ctx.globalAlpha = 0.12 * ga;
    ctx.fillStyle = '#ffa0c0';
    ctx.beginPath(); ctx.arc(cx, cy, 60, 0, 6.28); ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Project all particles
    if (proj.length < len) proj.length = len;

    for (let i = 0; i < len; i++) {
        const p = points[i];
        let px, py, pz;

        if (entPhase) {
            const t = Math.max(0, Math.min(1, (entProg - p.delay) / (1 - p.delay)));
            const e = easeOut(t);
            px = p.sx + (p.bx - p.sx) * e;
            py = p.sy + (p.by - p.sy) * e;
            pz = p.sz + (p.z - p.sz) * e;
        } else {
            px = p.bx * bs;
            py = p.by * bs;
            pz = p.z;
        }

        const x1 = px*cry + pz*sry;
        const z1 = -px*sry + pz*cry;
        const y1 = py*crx - z1*srx;
        const z2 = py*srx + z1*crx;

        const sc = fov / (fov + z2 + 300);
        const tw = 0.7 + Math.sin(time * 3 + p.tw) * 0.3;

        let a = p.a * tw * Math.min(sc * 1.8, 1);
        if (entPhase) {
            const t = Math.max(0, Math.min(1, (entProg - p.delay) / 0.6));
            a *= easeOut(t);
        }

        const o = proj[i] || (proj[i] = {});
        o.x = x1 * sc + cx;
        o.y = y1 * sc + cy;
        o.z = z2;
        o.r = p.r * sc;
        o.a = a;
        o.hue = p.hue;
        o.sat = p.sat;
        o.lit = p.lit;
        o.glow = p.glow * sc;
    }

    projLen = len;

    // Sort by z
    for (let i = 1; i < projLen; i++) {
        let j = i;
        while (j > 0 && proj[j].z < proj[j-1].z) {
            const tmp = proj[j]; proj[j] = proj[j-1]; proj[j-1] = tmp;
            j--;
        }
    }

    // ===== Draw hearts =====
    for (let i = 0; i < projLen; i++) {
        const p = proj[i];
        if (p.a < 0.02) continue;

        const r = p.r;
        const col = `hsl(${p.hue},${p.sat}%,${p.lit}%)`;
        const brightCol = `hsl(${p.hue},100%,${Math.min(p.lit+20,100)}%)`;

        // Glow (soft circle behind, screen blend for light effect)
        if (r > 2) {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = p.a * 0.15;
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r * 1.8, 0, 6.28);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        // Main heart shape
        ctx.globalAlpha = p.a;
        ctx.fillStyle = col;
        ctx.beginPath();
        heartPath(p.x, p.y, r);
        ctx.fill();

        // Bright inner heart
        if (r > 3) {
            ctx.globalAlpha = p.a * 0.5;
            ctx.fillStyle = brightCol;
            ctx.beginPath();
            heartPath(p.x, p.y, r * 0.5);
            ctx.fill();
        }

        // White highlight dot
        if (r > 4) {
            ctx.globalAlpha = p.a * 0.7;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(p.x - r*0.2, p.y + r*0.3, r*0.18, 0, 6.28);
            ctx.fill();
        }
    }

    // Sparkle ring
    if (!entPhase) {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 10; i++) {
            const ang = 0.628*i + time*0.5;
            const rad = 180 + Math.sin(time*2+i)*30;
            const sz = 2 + Math.sin(time*4+i)*1.2;
            ctx.globalAlpha = 0.3 + Math.sin(time*3+i)*0.2;
            ctx.beginPath();
            ctx.arc(cx+Math.cos(ang)*rad, cy+Math.sin(ang)*rad, sz, 0, 6.28);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // No burst flash - clean entrance

    ctx.globalAlpha = 1;
    requestAnimationFrame(render);
}

// ===== Mini hearts =====
function spawnMiniHeart() {
    const el = document.createElement('div');
    el.className = 'mini-heart';
    el.textContent = '❤';
    el.style.left = Math.random()*100+'%';
    el.style.fontSize = (Math.random()+0.5)+'rem';
    el.style.animationDuration = (Math.random()*5+5)+'s';
    const c = ['#ff1744','#ff4081','#ff6b9d','#e91e63','#f50057'];
    el.style.color = c[Math.floor(Math.random()*5)];
    miniHearts.appendChild(el);
    setTimeout(() => el.remove(), 11000);
}

function spawnParticle() {
    const el = document.createElement('div');
    el.className = 'particle';
    el.style.left = Math.random()*100+'%';
    el.style.bottom = '-5px';
    el.style.animationDuration = (Math.random()*7+5)+'s';
    const c = ['#ff1744','#ff4081','#ff6b9d','#e91e63','#ff80ab'];
    el.style.background = c[Math.floor(Math.random()*5)];
    el.style.width = el.style.height = (Math.random()*3+2)+'px';
    particles.appendChild(el);
    setTimeout(() => el.remove(), 13000);
}

// ===== Typewriter =====
function typeWriter(text, el, spd) {
    let i = 0;
    el.textContent = '';
    (function t() { if (i < text.length) { el.textContent += text.charAt(i); i++; setTimeout(t, spd); } })();
}

// ===== Transition =====
function goToPage2() {
    page1.classList.add('slide-out');
    setTimeout(() => {
        page1.classList.remove('active','slide-out');
        page2.classList.add('active','slide-in');
        createPoints();
        running = true;
        entPhase = true;
        entProg = 0;
        render();
        setInterval(spawnMiniHeart, 600);
        setInterval(spawnParticle, 500);
        for (let i = 0; i < 8; i++) setTimeout(spawnMiniHeart, i*100);
        setTimeout(() => typeWriter('Yêu Em Nhiều Lắm ❤', loveText, 100), ENT_DUR*1000+300);
    }, 800);
}

// ===== Page 1 =====
function spawnFloatingHeart() {
    const el = document.createElement('div');
    el.className = 'floating-heart';
    el.textContent = '❤';
    el.style.left = Math.random()*100+'%';
    el.style.fontSize = (Math.random()*1.5+0.8)+'rem';
    el.style.animationDuration = (Math.random()*4+5)+'s';
    const c = ['#ff6b9d','#ff1744','#ec407a','#f48fb1','#ff80ab'];
    el.style.color = c[Math.floor(Math.random()*5)];
    floatingHearts.appendChild(el);
    setTimeout(() => el.remove(), 10000);
}

function spawnSparkle() {
    const el = document.createElement('div');
    el.className = 'sparkle';
    el.style.left = Math.random()*100+'%';
    el.style.top = Math.random()*100+'%';
    el.style.animationDuration = (Math.random()*2+1)+'s';
    el.style.animationDelay = Math.random()*2+'s';
    sparkles.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// ===== Events =====
canvas.addEventListener('mousedown', e => {
    dragging = true; ldx = e.clientX; ldy = e.clientY; velX = velY = 0;
    const h = document.getElementById('dragHint');
    if (h) h.classList.add('hidden');
});
document.addEventListener('mousemove', e => {
    if (!dragging) return;
    tRY += (e.clientX-ldx)*0.008; tRX -= (e.clientY-ldy)*0.008;
    velY = (e.clientX-ldx)*0.008; velX = -(e.clientY-ldy)*0.008;
    ldx = e.clientX; ldy = e.clientY;
});
document.addEventListener('mouseup', () => dragging = false);

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    dragging = true;
    ldx = e.touches[0].clientX; ldy = e.touches[0].clientY; velX = velY = 0;
    const h = document.getElementById('dragHint');
    if (h) h.classList.add('hidden');
}, { passive: false });
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!dragging) return;
    const t = e.touches[0];
    tRY += (t.clientX-ldx)*0.008; tRX -= (t.clientY-ldy)*0.008;
    velY = (t.clientX-ldx)*0.008; velX = -(t.clientY-ldy)*0.008;
    ldx = t.clientX; ldy = t.clientY;
}, { passive: false });
canvas.addEventListener('touchend', () => dragging = false);

canvas.addEventListener('click', e => {
    if (entPhase) return;
    const ox = e.clientX-W/2, oy = e.clientY-H/2;
    for (let i = 0; i < 12; i++) {
        points.push({
            bx: ox, by: oy, z: 0, sx: ox, sy: oy, sz: 0,
            r: 4+Math.random()*3, hue: 340+Math.random()*20,
            sat: 95, lit: 60+Math.random()*15,
            a: 0.9, tw: Math.random()*6.28, delay: 0, glow: 12
        });
    }
    setTimeout(() => { points.splice(points.length-12, 12); }, 2000);
});

enterBtn.addEventListener('click', e => { e.stopPropagation(); goToPage2(); });
page1.addEventListener('click', goToPage2);

// ===== Init =====
setInterval(spawnFloatingHeart, 500);
setInterval(spawnSparkle, 300);
for (let i = 0; i < 8; i++) setTimeout(spawnFloatingHeart, i*150);
