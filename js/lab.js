/* PREVIEW ONLY — interactive "lab" layer (live project visuals, hero dot field, engineer's cursor, 3D photo tilt).
   Switches: ?lab=off shows the site without it; ?cursor=arrow keeps the system arrow. */
(() => {
  if (new URLSearchParams(location.search).get('lab') === 'off') return;
  const st = document.createElement('style'); st.textContent = "\n.live { position: relative; display: block; width: 100%; }\n.live canvas { display: block; width: 100%; height: 100%; }\n.live--oppy { height: 15.5rem; }\n.live--medi { height: 15rem; }\n.live--hand { height: 10rem; min-width: 12rem; }\n.live--metro { height: 19rem; margin-top: .4rem; border: 1px solid var(--line-2); border-radius: 4px; background: var(--paper-3); }\n.live__read { position: absolute; left: .6rem; top: .35rem; font-family: var(--font-mono); font-size: .62rem; letter-spacing: .06em; pointer-events: none; }\n.case--flagship .live__read { color: rgb(245 240 231 / .85); } .case--dark .live__read { color: rgb(245 240 231 / .8); } .case--sage .live__read { color: var(--sage-700); }\n.live--metro .live__read { color: var(--ink-3); top: auto; bottom: .45rem; }\n.live--medi .live__read { left: auto; right: .6rem; top: auto; bottom: .45rem; }\n.live--oppy .live__read { top: auto; bottom: .2rem; }\n\n\n#top { position: relative; }\n#top > .wrap { position: relative; z-index: 1; }\n.dotfield { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }\n@media (hover: none), (pointer: coarse) { .dotfield { display: none; } }\n/* 3D tilt — same photo file, same colours; layers only move in depth */\n.portrait { perspective: 1100px; }\n.portrait__frame { transform-style: preserve-3d; transform: rotateX(var(--rx, 2deg)) rotateY(var(--ry, -6deg)); transition: transform .6s var(--ease-out); will-change: transform; }\n.portrait__frame.is-live { transition-duration: .18s; }\n.portrait__offset { transform: translateZ(-34px); }\n.portrait__pop { position: absolute; inset: 0 1.1rem 1.1rem 0; pointer-events: none; transform: translateZ(46px); clip-path: inset(-40% -8% 0 -8%); }\n.portrait__pop img { position: absolute; left: 50%; bottom: 0; width: 92%; height: auto; transform: translateX(-50%); filter: drop-shadow(var(--sx, -8px) var(--sy, 12px) 14px rgb(33 29 43 / .22)); }\n.portrait__stamp { transform: translateZ(72px); }\n.portrait__postmark { transform: translateZ(58px); }\n@media (hover: none), (pointer: coarse) { .portrait__frame { animation: p3d-sway 9s ease-in-out infinite; } }\n@keyframes p3d-sway { 0%, 100% { transform: rotateX(2deg) rotateY(-6deg); } 50% { transform: rotateX(-1deg) rotateY(5deg); } }\n@media (prefers-reduced-motion: reduce) { .portrait__frame { animation: none !important; transform: none !important; } }\n\n\nhtml.eng-cursor, html.eng-cursor * { cursor: none !important; }\nhtml.eng-cursor input, html.eng-cursor textarea { cursor: text !important; }\n.cmark { display: none !important; }   /* replaced by the reticle */\n.reticle { position: fixed; left: 0; top: 0; z-index: 100; pointer-events: none; color: #fff; mix-blend-mode: difference; opacity: 0; transition: opacity .15s ease; }\nhtml.eng-cursor .reticle.is-on { opacity: 1; }\n.reticle__x { position: absolute; left: -14px; top: -14px; width: 28px; height: 28px; overflow: visible; transition: opacity .15s ease, scale .2s cubic-bezier(.16,1,.3,1); }\n.reticle.is-lock .reticle__x { opacity: .0; scale: .6; }\n.reticle__read { position: absolute; left: 14px; top: 12px; white-space: nowrap; font: 500 10px/1 \"IBM Plex Mono\", monospace; letter-spacing: .1em; text-transform: uppercase; }\n.reticle__box { position: fixed; left: 0; top: 0; width: 0; height: 0; z-index: 100; pointer-events: none; mix-blend-mode: difference; opacity: 0;\n  transition: left .18s cubic-bezier(.16,1,.3,1), top .18s cubic-bezier(.16,1,.3,1), width .18s cubic-bezier(.16,1,.3,1), height .18s cubic-bezier(.16,1,.3,1), opacity .15s ease; }\n.reticle__box.is-on { opacity: 1; }\n.reticle__box b { position: absolute; left: 0; top: calc(100% + 5px); white-space: nowrap; color: #fff; }\n.reticle__box b::after { content: attr(data-label); font: 500 10px/1 \"IBM Plex Mono\", monospace; letter-spacing: .1em; text-transform: uppercase; }\n.reticle.is-lock .reticle__read { opacity: 0; }\n.reticle__box i { position: absolute; width: 10px; height: 10px; border: 0 solid #fff; }\n.reticle__box i:nth-child(1) { left: 0; top: 0; border-left-width: 1.5px; border-top-width: 1.5px; }\n.reticle__box i:nth-child(2) { right: 0; top: 0; border-right-width: 1.5px; border-top-width: 1.5px; }\n.reticle__box i:nth-child(3) { left: 0; bottom: 0; border-left-width: 1.5px; border-bottom-width: 1.5px; }\n.reticle__box i:nth-child(4) { right: 0; bottom: 0; border-right-width: 1.5px; border-bottom-width: 1.5px; }\n.magnet { transition: transform .25s cubic-bezier(.16,1,.3,1); }\n@media (hover: none), (pointer: coarse) { .reticle, .reticle__box { display: none; } }\n"; document.head.append(st);

(() => {
  const LINES = {"purple":["Whitefield","Channasandra","Kadugodi Tree Park","Pattandur Agrahara","Sri Sathya Sai Hospital","Nallurhalli","Seetharam Palya","Hoodi","Garudacharpalya","KR Pura","Benniganahalli","Baiyappanahalli","Swami Vivekananda Road","Indiranagar","Halasuru","Trinity","MG Road","Cubbon Park","Vidhana Soudha","Central College","Majestic","City Railway Station","Magadi Road","Hosahalli","Vijayanagar","Attiguppe","Deepanjali Nagar","Mysuru Road","Nayandahalli","Rajarajeshwari Nagar","Jnanabharathi","Pattanagere","Kengeri","Kengeri Bus Terminal"],"green":["Nagasandra","Dasarahalli","Jalahalli","Peenya Industry","Peenya","Goraguntepalya","Yeshwantpur","Sandal Soap Factory","Mahalakshmi","Rajajinagar","Kuvempu Road","Srirampura","Majestic","Chickpete","KR Market","National College","Lalbagh","South End Circle","Jayanagar","Rashtreeya Vidyalaya Road","Banashankari","Jaya Prakash Nagar","Yelachenahalli","Konanakunte Cross","Doddakallasandra","Vajarahalli","Thalaghattapura","Silk Institute"],"yellow":["Rashtreeya Vidyalaya Road","Ragigudda","Jayadeva Hospital","BTM Layout","Central Silk Board","HSR Layout","Agara Lake","Iblur","Bellandur","Kadubeesanahalli","Devarabeesanahalli","Marathahalli","Doddanekundi","DRDO Sports Complex","Mahadevapura","Garudacharpalya"],"blue":["Central Silk Board","HSR Layout","Agara Lake","Iblur","Bellandur","Kadubeesanahalli","Devarabeesanahalli","Marathahalli","Doddanekundi","DRDO Sports Complex","Mahadevapura","Garudacharpalya","KR Pura","Benniganahalli","Kasturinagar","Horamavu","Kalyan Nagar","HBR Layout","Nagawara","Hebbal","Kodigehalli","Jakkur Cross","Yelahanka","Bagalur Cross","Bettahalasuru","Doddajala","Airport City","Kempegowda International Airport"],"pink":["Kalena Agrahara","Hulimavu","IIM Bangalore","JP Nagar 4th Phase","Jayadeva Hospital","Tavarekere","Dairy Circle","Lakkasandra","Langford Town","Shivajinagar","Pottery Town","Tannery Road","Venkateshpura","Kempapura","Veerannapalya","Hebbal"]};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const MONO = '500 8px "IBM Plex Mono", monospace';

  /* shared: a canvas that resizes with its box and animates only while on screen */
  const live = (box, draw) => {
    const cv = document.createElement('canvas'); box.prepend(cv);
    const ctx = cv.getContext('2d'); let w = 0; let h = 0; let on = false; let raf = 0; let t0 = performance.now();
    const size = () => { const r = box.getBoundingClientRect(); const d = Math.min(2, devicePixelRatio || 1); w = r.width; h = r.height; cv.width = w * d; cv.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const frame = (now) => { raf = 0; if (!w) size(); draw(ctx, w, h, (now - t0) / 1000); if (on && !reduce) raf = requestAnimationFrame(frame); };
    new ResizeObserver(() => { size(); if (!raf) raf = requestAnimationFrame(frame); }).observe(box);
    new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(frame); }).observe(box);
    return { box, cv, get w() { return w; }, get h() { return h; } };
  };
  const swap = (fig, box) => { const sv = fig.querySelector('svg'); const hh = sv.getBoundingClientRect().height; sv.remove(); if (hh) box.style.height = hh + 'px'; fig.append(box); };
  const mkBox = (cls, read) => { const b = document.createElement('div'); b.className = 'live ' + cls; b.setAttribute('aria-hidden', 'true'); if (read) { const r = document.createElement('span'); r.className = 'live__read'; b.append(r); } return b; };
  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

  /* ================= OPPY — opportunities flowing through ingest → normalise → de-dupe → quality → match ================= */
  {
    const fig = document.querySelector('#oppy-panel-2 figure.sketch');
    if (fig) {
      fig.querySelector('.sk-caption .label').textContent = 'Opportunity pipeline · live';
      const box = mkBox('live--oppy', true); swap(fig, box);
      const read = box.querySelector('.live__read');
      const CATS = ['internships', 'jobs', 'hackathons', 'fellowships', 'events', 'grants', 'scholarships'];
      const STAGES = [['INGEST', 'scheduled · AWS λ'], ['NORMALISE', 'one schema'], ['DE-DUPE', 'merge repeats'], ['QUALITY', 'filter'], ['MATCH', 'your interests']];
      let parts = []; let last = 0; let merged = 0; let dropped = 0; let matched = 0;
      const spawn = (w, h) => { const c = Math.floor(Math.random() * CATS.length); parts.push({ c, x: 0.2 * w, y: 26 + (c + 0.5) * ((h - 60) / CATS.length) + (Math.random() - 0.5) * 6, lane: Math.floor(Math.random() * 5), dup: Math.random() < 0.16, bad: Math.random() < 0.12, fit: Math.random() < 0.45, a: 1, done: false }); };
      live(box, (ctx, w, h, t) => {
        const paper = 'rgba(245,240,231,'; const tan = css('--tan');
        ctx.clearRect(0, 0, w, h);
        const sx = (i) => w * (0.32 + i * 0.13);
        // stage rules + labels
        ctx.font = MONO; ctx.textAlign = 'center';
        STAGES.forEach(([n, s], i) => { const x = sx(i); ctx.strokeStyle = paper + '.28)'; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, h - 30); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = paper + '.95)'; ctx.fillText(n, x, 14); ctx.fillStyle = paper + '.6)'; ctx.fillText(s, x, 24); });
        ctx.textAlign = 'left';
        CATS.forEach((c, i) => { ctx.fillStyle = paper + '.7)'; ctx.fillText(c, 4, 26 + (i + 0.5) * ((h - 60) / CATS.length) + 3); });
        // "for you" node
        const ux = w - 10; const uy = h / 2; ctx.strokeStyle = tan; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ux - 6, uy, 7, 0, 7); ctx.stroke();
        // particles
        const now = t; const dt = Math.min(0.05, now - (last || now)); last = now;
        if (!reduce && Math.random() < 0.5) spawn(w, h); if (reduce && !parts.length) for (let i = 0; i < 40; i++) { spawn(w, h); parts[i].x = w * (0.2 + Math.random() * 0.75); }
        const laneY = (l) => 40 + l * ((h - 80) / 4);
        parts.forEach((p) => {
          if (!reduce) p.x += (44 + p.c * 3) * dt;
          let ty = p.y;
          if (p.x > sx(1)) ty = laneY(p.lane);
          if (p.x > sx(2) && p.dup && !p.m) { p.m = 1; merged++; }
          if (p.m) p.a -= dt * 3;
          if (p.x > sx(3) && p.bad && !p.b) { p.b = 1; dropped++; }
          if (p.b) { p.a -= dt * 2.5; ty = p.y + 8; }
          if (p.x > sx(4)) ty = p.fit ? uy : (p.y > uy ? h - 34 : 34);
          if (p.x > sx(4) && p.fit && !p.f && p.x > ux - 14) { p.f = 1; matched++; p.a = 0; }
          p.y += (ty - p.y) * Math.min(1, dt * 4);
          if (p.x > w + 10 || p.a <= 0) p.done = true;
          ctx.globalAlpha = Math.max(0, p.a);
          ctx.fillStyle = p.x > sx(4) && p.fit ? tan : (p.b ? 'rgba(33,29,43,.6)' : paper + '.92)');
          ctx.beginPath(); ctx.arc(p.x, p.y, p.dup && p.x > sx(1) && p.x < sx(2) ? 3.2 : 2.3, 0, 7); ctx.fill();
          ctx.globalAlpha = 1;
        });
        parts = parts.filter((p) => !p.done);
        read.textContent = 'merged ' + merged + ' · filtered ' + dropped + ' · matched to you ' + matched + '  (simulation)';
      });
    }
  }

  /* ================= MediAssist — prescription OCR: clean → read → parse (illustration) ================= */
  {
    const fig = document.querySelector('#case-mediassist figure.sketch');
    if (fig) {
      fig.querySelector('.sk-caption .label').textContent = 'Prescription OCR · illustration';
      const box = mkBox('live--medi', true); swap(fig, box); const read = box.querySelector('.live__read');
      const RX = [['Tab. Paracetamol', '500 mg', '1-0-1', '5 days'], ['Cap. Amoxicillin', '250 mg', '1-1-1', '7 days'], ['Tab. Cetirizine', '10 mg', '0-0-1', '3 days']];
      let hover = -1;
      box.addEventListener('pointermove', (e) => { const r = box.getBoundingClientRect(); const y = e.clientY - r.top; hover = Math.floor((y - 56) / 36); if (hover < 0 || hover > 2) hover = -1; });
      box.addEventListener('pointerleave', () => { hover = -1; });
      live(box, (ctx, w, h, t) => {
        const ink = css('--ink'); const sage = css('--sage-700'); const tan = css('--tan-700');
        ctx.clearRect(0, 0, w, h);
        const cyc = reduce ? 0.99 : (t % 7) / 7; // 0..1 over 7 s
        // the photo of the prescription (left) — tilted paper
        const pw = w * 0.5; const ph = h - 30;
        ctx.save(); ctx.translate(14, 12); ctx.rotate(-0.02);
        ctx.fillStyle = '#FBF8F2'; ctx.strokeStyle = 'rgba(33,29,43,.25)'; ctx.fillRect(0, 0, pw, ph); ctx.strokeRect(0, 0, pw, ph);
        ctx.fillStyle = ink; ctx.font = '700 18px "Space Grotesk", sans-serif'; ctx.fillText('℞', 10, 26);
        ctx.strokeStyle = 'rgba(33,29,43,.35)'; ctx.beginPath(); ctx.moveTo(36, 22); ctx.bezierCurveTo(60, 12, 80, 30, 110, 18); ctx.stroke();
        const scanY = ease(cyc / 0.6) * ph;
        RX.forEach((row, i) => {
          const y0 = 58 + i * 36; let x = 10;
          ctx.font = 'italic 500 11px Georgia, serif';
          row.forEach((tok, j) => {
            if (j === 2) x = 22; const y = j < 2 ? y0 : y0 + 14;
            const tw = ctx.measureText(tok).width; ctx.fillStyle = 'rgba(33,29,43,.85)'; ctx.fillText(tok, x, y);
            if (scanY > y + 4) { ctx.strokeStyle = hover === i ? tan : sage; ctx.lineWidth = hover === i ? 1.6 : 1; ctx.strokeRect(x - 2, y - 10, tw + 4, 13); }
            x += tw + 8;
          });
        });
        // scan beam
        if (cyc < 0.62) { const g = ctx.createLinearGradient(0, scanY - 16, 0, scanY); g.addColorStop(0, 'rgba(75,95,68,0)'); g.addColorStop(1, 'rgba(75,95,68,.28)'); ctx.fillStyle = g; ctx.fillRect(0, scanY - 16, pw, 16); ctx.strokeStyle = sage; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, scanY); ctx.lineTo(pw, scanY); ctx.stroke(); }
        ctx.restore();
        // parsed table (right)
        const tx = pw + 34; const cols = [['MEDICINE', 0], ['DOSE', 0.46], ['FREQ', 0.66], ['DAYS', 0.84]]; const tw2 = w - tx - 8;
        ctx.font = MONO; ctx.fillStyle = sage; cols.forEach(([c, f]) => ctx.fillText(c, tx + f * tw2, 22));
        ctx.strokeStyle = 'rgba(75,95,68,.5)'; ctx.beginPath(); ctx.moveTo(tx, 28); ctx.lineTo(w - 8, 28); ctx.stroke();
        RX.forEach((row, i) => {
          const rowT = (scanY - (72 + i * 36)) / 24; if (rowT <= 0) return;
          const y = 48 + i * 26; ctx.globalAlpha = Math.min(1, rowT);
          if (hover === i) { ctx.fillStyle = 'rgba(231,139,72,.18)'; ctx.fillRect(tx - 4, y - 12, tw2 + 8, 18); }
          ctx.font = '500 10px Inter, sans-serif'; ctx.fillStyle = css('--ink');
          ctx.fillText(row[0].replace(/^(Tab|Cap)\. /, ''), tx, y); ctx.font = MONO; ctx.fillStyle = css('--ink-2');
          ctx.fillText(row[1], tx + 0.46 * tw2, y); ctx.fillText(row[2], tx + 0.66 * tw2, y); ctx.fillText(row[3].replace(' days', ''), tx + 0.84 * tw2, y); ctx.globalAlpha = 1;
        });
        // pipeline tag
        ctx.font = MONO; ctx.fillStyle = sage; ctx.fillText('FastAPI · OpenCV → PaddleOCR → parser', tx, 48 + 3 * 26 + 6);
        const done = scanY >= ph * 0.98; read.textContent = done ? '3 medicines parsed → reminders' : 'reading…';
      });
    }
  }

  /* ================= Gesture — 21-landmark hand model that follows the cursor; pinch on click ================= */
  {
    const fig = document.querySelector('#case-gesture figure.sketch');
    if (fig) {
      fig.querySelector('.sk-caption .label').textContent = 'Hand landmarks · live';
      const box = mkBox('live--hand', true); swap(fig, box); const read = box.querySelector('.live__read');
      const OPEN = [[0,0],[-.12,-.10],[-.22,-.22],[-.30,-.33],[-.36,-.43],[-.08,-.42],[-.08,-.62],[-.08,-.76],[-.08,-.88],[.04,-.44],[.06,-.6],[.04,-.5],[.02,-.44],[.15,-.4],[.18,-.54],[.15,-.46],[.13,-.4],[.24,-.34],[.27,-.45],[.24,-.39],[.22,-.34]];
      const PINCH = OPEN.map((p, i) => ([3, 4].includes(i) ? [p[0] + (i === 4 ? 0.1 : 0.05), p[1] - (i === 4 ? 0.1 : 0.06)] : [6, 7, 8].includes(i) ? [p[0] - (i - 5) * 0.06, p[1] + (i - 5) * 0.11] : p));
      const BONES = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
      const caseEl = document.getElementById('case-gesture');
      let tx = null; let ty = null; let down = false; let px = 0; let py = 0; let pinch = 0;
      caseEl.addEventListener('pointermove', (e) => { const r = box.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; });
      caseEl.addEventListener('pointerleave', () => { tx = ty = null; down = false; });
      caseEl.addEventListener('pointerdown', () => { down = true; }); addEventListener('pointerup', () => { down = false; });
      live(box, (ctx, w, h, t) => {
        ctx.clearRect(0, 0, w, h);
        const S = h * 0.62;
        // target: cursor (clamped into the box) or an idle figure-eight
        let gx = tx; let gy = ty;
        if (gx === null) { gx = w * 0.55 + Math.sin(t * 0.9) * w * 0.18; gy = h * 0.3 + Math.sin(t * 1.8) * h * 0.08; }
        gx = Math.max(S * 0.45, Math.min(w - S * 0.32, gx)); gy = Math.max(6, Math.min(h - S * 0.92, gy));
        px += (gx - px) * 0.18; py += (gy - py) * 0.18;
        const want = down || (tx === null && Math.sin(t * 1.3) > 0.92) ? 1 : 0; pinch += (want - pinch) * 0.25;
        const pts = OPEN.map((p, i) => { const q = PINCH[i]; const x = p[0] + (q[0] - p[0]) * pinch; const y = p[1] + (q[1] - p[1]) * pinch; return [x, y]; });
        // place so landmark 8 (index tip, open pose) sits on the target; tiny tracking jitter
        const ox = px - OPEN[8][0] * S; const oy = py - OPEN[8][1] * S;
        const P = pts.map(([x, y]) => [ox + x * S + (Math.random() - 0.5) * 0.6, oy + y * S + (Math.random() - 0.5) * 0.6]);
        ctx.strokeStyle = 'rgba(245,240,231,.75)'; ctx.lineWidth = 1.3;
        BONES.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(P[b][0], P[b][1]); ctx.stroke(); });
        P.forEach(([x, y], i) => { ctx.fillStyle = i === 8 || i === 4 ? css('--tan') : 'rgba(245,240,231,.95)'; ctx.beginPath(); ctx.arc(x, y, i === 8 || i === 4 ? 3.2 : 2.1, 0, 7); ctx.fill(); });
        // pinch distance (thumb tip 4 ↔ index tip 8)
        const d = Math.hypot(P[4][0] - P[8][0], P[4][1] - P[8][1]) / S;
        ctx.setLineDash([2, 3]); ctx.strokeStyle = d < 0.12 ? css('--tan') : 'rgba(245,240,231,.4)'; ctx.beginPath(); ctx.moveTo(P[4][0], P[4][1]); ctx.lineTo(P[8][0], P[8][1]); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = css('--tan'); ctx.beginPath(); ctx.arc(P[8][0], P[8][1], 7, 0, 7); ctx.stroke();
        read.textContent = 'LM 8 x ' + (P[8][0] / w).toFixed(2) + ' y ' + (P[8][1] / h).toFixed(2) + ' · pinch ' + d.toFixed(2) + (d < 0.12 ? ' → CLICK' : '');
      });
    }
  }

  /* ================= Metro — the project's real network; depth-first search finds every route, shortest wins ================= */
  {
    const tpl = document.querySelector('template[data-notes="metro-fare-calculator"]');
    if (tpl) {
      const blk = document.createElement('div'); blk.className = 'notes-block';
      blk.innerHTML = '<p class="label">Route search · live, on the project\'s own network data</p><div class="live live--metro" data-live="metro" aria-hidden="true"><span class="live__read"></span></div>';
      tpl.content.prepend(blk);
    }
    const COL = { purple: '#6E4FB8', green: '#3F8F5A', yellow: '#C99A1C', blue: '#3B6FBF', pink: '#C8578C' };
    const A = { 'Whitefield': [505, 112], 'Garudacharpalya': [430, 122], 'KR Pura': [410, 126], 'Benniganahalli': [390, 130], 'Majestic': [205, 165], 'Kengeri Bus Terminal': [15, 205],
      'Nagasandra': [150, 14], 'Rashtreeya Vidyalaya Road': [225, 262], 'Silk Institute': [205, 310], 'Jayadeva Hospital': [266, 272], 'Central Silk Board': [322, 276],
      'Hebbal': [300, 62], 'Kempegowda International Airport': [372, 8], 'Kalena Agrahara': [250, 316] };
    const BEND = { 'Central Silk Board|Garudacharpalya': [[404, 266], [442, 200]], 'Benniganahalli|Hebbal': [[380, 92], [338, 70]], 'Hebbal|Kempegowda International Airport': [[318, 30]],
      'Nagasandra|Majestic': [[160, 96]], 'Majestic|Kengeri Bus Terminal': [[120, 186]], 'Jayadeva Hospital|Hebbal': [[284, 200], [292, 110]] };
    const pos = {}; const adj = {}; const edgeLine = {};
    Object.entries(LINES).forEach(([ln, st]) => {
      st.forEach((s, i) => { adj[s] = adj[s] || new Set(); if (i) { adj[s].add(st[i - 1]); adj[st[i - 1]].add(s); edgeLine[[st[i - 1], s].sort().join('|')] = edgeLine[[st[i - 1], s].sort().join('|')] || ln; } });
      const anchors = st.map((s, i) => (A[s] ? i : -1)).filter((i) => i >= 0);
      for (let k = 0; k < anchors.length - 1; k++) {
        const i0 = anchors[k]; const i1 = anchors[k + 1]; const a = st[i0]; const b = st[i1];
        const bends = BEND[a + '|' + b] || (BEND[b + '|' + a] ? [...BEND[b + '|' + a]].reverse() : []);
        const poly = [A[a], ...bends, A[b]]; const seg = []; let L = 0; for (let j = 1; j < poly.length; j++) { const l = Math.hypot(poly[j][0] - poly[j - 1][0], poly[j][1] - poly[j - 1][1]); seg.push(l); L += l; }
        for (let i = i0; i <= i1; i++) { if (pos[st[i]]) continue; let d = (L * (i - i0)) / (i1 - i0); let j = 0; while (j < seg.length - 1 && d > seg[j]) { d -= seg[j]; j++; } const f = d / seg[j]; pos[st[i]] = [poly[j][0] + (poly[j + 1][0] - poly[j][0]) * f, poly[j][1] + (poly[j + 1][1] - poly[j][1]) * f]; }
      }
    });
    // the project's RouteService.findAllRoutes (depth-first, maxDepth 40), recorded so it can be replayed
    const findAll = (start, end, maxDepth = 40) => { const res = []; const order = []; const dfs = (n, path, seen) => { if (path.length > maxDepth || res.length > 400) return; if (n === end) { res.push([...path]); return; } for (const nb of adj[n]) { if (!seen.has(nb)) { seen.add(nb); path.push(nb); if (order.length < 900) order.push(nb); dfs(nb, path, seen); path.pop(); seen.delete(nb); } } }; dfs(start, [start], new Set([start])); return { res, order }; };
    const lineOf = (a, b) => edgeLine[[a, b].sort().join('|')];
    const changes = (p) => { const c = []; for (let i = 2; i < p.length; i++) if (lineOf(p[i - 2], p[i - 1]) !== lineOf(p[i - 1], p[i])) c.push(p[i - 1]); return c; };
    const TRIPS = [['Whitefield', 'Majestic'], ['Kengeri Bus Terminal', 'Kempegowda International Airport'], ['Nagasandra', 'Central Silk Board'], ['Silk Institute', 'Hebbal'], ['Kalena Agrahara', 'Whitefield']];
    const plans = TRIPS.map(([s, e]) => { const { res, order } = findAll(s, e); res.sort((x, y) => x.length - y.length); return { s, e, all: res, best: res[0], order, ch: res[0] ? changes(res[0]) : [] }; });
    window.__metroPlans = plans.map((p) => ({ trip: p.s + ' → ' + p.e, routes: p.all.length, stops: p.best ? p.best.length - 1 : null, changes: p.ch }));
    const start = (box) => {
      if (box.__live) return; box.__live = 1; const read = box.querySelector('.live__read');
      live(box, (ctx, w, h, t) => {
        ctx.clearRect(0, 0, w, h); const sc = Math.min(w / 525, (h - 24) / 322); const ox = (w - 525 * sc) / 2; const oy = 6;
        const X = (s) => ox + pos[s][0] * sc; const Y = (s) => oy + pos[s][1] * sc;
        const T = reduce ? 9 : t; const k = Math.floor(T / 9) % plans.length; const u = (T % 9) / 9; const p = plans[k];
        // network
        Object.entries(LINES).forEach(([ln, st]) => { ctx.strokeStyle = COL[ln]; ctx.globalAlpha = 0.6; ctx.lineWidth = 2.4; ctx.beginPath(); st.forEach((s, i) => (i ? ctx.lineTo(X(s), Y(s)) : ctx.moveTo(X(s), Y(s)))); ctx.stroke(); });
        ctx.globalAlpha = 1;
        Object.keys(pos).forEach((s) => { const inter = Object.values(LINES).filter((l) => l.includes(s)).length > 1; ctx.fillStyle = '#FBF8F2'; ctx.strokeStyle = 'rgba(33,29,43,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(X(s), Y(s), inter ? 3 : 1.6, 0, 7); ctx.fill(); ctx.stroke(); });
        // DFS exploration replay
        const ex = Math.floor(ease(u / 0.3) * Math.min(p.order.length, 260));
        if (u < 0.42) { ctx.fillStyle = 'rgba(98,80,200,' + (u < 0.3 ? 0.55 : 0.55 * (1 - (u - 0.3) / 0.12)) + ')'; for (let i = 0; i < ex; i++) { const s = p.order[i]; ctx.beginPath(); ctx.arc(X(s), Y(s), 2.6, 0, 7); ctx.fill(); } }
        // shortest route drawn in, then a train runs it
        if (p.best && u > 0.34) {
          const f = ease((u - 0.34) / 0.3); const n = Math.max(1, Math.floor(f * (p.best.length - 1)));
          ctx.strokeStyle = css('--ink'); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); for (let i = 0; i <= n; i++) { const s = p.best[i]; i ? ctx.lineTo(X(s), Y(s)) : ctx.moveTo(X(s), Y(s)); } ctx.stroke();
          if (u > 0.66) { const g = Math.min(p.best.length - 1.001, ((u - 0.66) / 0.3) * (p.best.length - 1)); const i = Math.floor(g); const fr = g - i; const a = p.best[i]; const b = p.best[i + 1];
            ctx.fillStyle = css('--tan'); ctx.beginPath(); ctx.arc(X(a) + (X(b) - X(a)) * fr, Y(a) + (Y(b) - Y(a)) * fr, 4.5, 0, 7); ctx.fill(); }
          ctx.font = MONO; ctx.fillStyle = css('--ink'); [p.s, p.e, ...p.ch].forEach((s, i) => { ctx.beginPath(); ctx.strokeStyle = i < 2 ? css('--tan-700') : css('--lilac'); ctx.lineWidth = 1.5; ctx.arc(X(s), Y(s), 5, 0, 7); ctx.stroke(); ctx.fillText(s.replace('Kempegowda International Airport', 'KIA Airport'), X(s) + 7, Y(s) - 6); });
        }
        read.textContent = 'DFS · ' + p.s.replace('Kempegowda International Airport', 'KIA Airport') + ' → ' + p.e.replace('Kempegowda International Airport', 'KIA Airport') + ' · ' + p.all.length + ' routes · shortest ' + (p.best.length - 1) + ' stops' + (p.ch.length ? ' · change at ' + p.ch.join(', ') : ' · no change');
      });
    };
    const extra = document.getElementById('projectModalExtra');
    if (extra) new MutationObserver(() => extra.querySelectorAll('[data-live="metro"]').forEach(start)).observe(extra, { childList: true });
  }
})();


(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hero = document.getElementById('top');

  /* ---- 3D portrait: move the same <picture> onto its own depth layer ---- */
  const frame = hero.querySelector('.portrait__frame'); const card = frame.querySelector('.portrait__card');
  const pop = document.createElement('div'); pop.className = 'portrait__pop'; pop.append(card.querySelector('picture')); frame.insertBefore(pop, card.nextSibling);

  if (!fine || reduce) return;
  /* ---- dot network ---- */
  const cv = document.createElement('canvas'); cv.className = 'dotfield'; cv.setAttribute('aria-hidden', 'true'); hero.prepend(cv);
  const ctx = cv.getContext('2d'); let W = 0; let H = 0; let dots = []; const d = Math.min(2, devicePixelRatio || 1);
  const build = () => { const r = hero.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    dots = []; const G = 24; for (let y = G / 2; y < H; y += G) for (let x = G / 2; x < W; x += G) { const bx = x + (Math.random() - 0.5) * 7; const by = y + (Math.random() - 0.5) * 7; dots.push({ bx, by, x: bx, y: by, vx: 0, vy: 0 }); } };
  build(); new ResizeObserver(() => { build(); kick(); }).observe(hero);
  let mx = -1e4; let my = -1e4; let inside = false; let hold = 0; let holdT = 0; let raf = 0;
  const lilac = 'rgba(98,80,200,'; const ink = 'rgba(33,29,43,';
  const step = () => {
    raf = 0; ctx.clearRect(0, 0, W, H); let moving = false;
    const R = 120; const HR = 300; const hk = hold;
    for (const p of dots) {
      let tx = p.bx; let ty = p.by; const dx = p.bx - mx; const dy = p.by - my; const dist = Math.hypot(dx, dy);
      if (inside && hk > 0 && dist < HR) { const f = 1 - dist / HR; tx = mx + dx * (1 - 0.82 * f * hk); ty = my + dy * (1 - 0.82 * f * hk); }
      else if (inside && dist < R && dist > 0.1) { const f = (R - dist) / R; tx = p.bx + (dx / dist) * f * 34; ty = p.by + (dy / dist) * f * 34; }
      p.vx = (p.vx + (tx - p.x) * 0.12) * 0.74; p.vy = (p.vy + (ty - p.y) * 0.12) * 0.74; p.x += p.vx; p.y += p.vy;
      if (Math.abs(p.vx) + Math.abs(p.vy) > 0.02) moving = true;
      const near = inside ? Math.hypot(p.x - mx, p.y - my) : 1e9;
      ctx.fillStyle = near < 150 ? lilac + (0.75 - near / 300).toFixed(2) + ')' : ink + '.17)';
      ctx.beginPath(); ctx.arc(p.x, p.y, near < 150 ? 1.5 : 1.1, 0, 7); ctx.fill();
      if (inside && near < 105 && hk < 0.5) { ctx.strokeStyle = lilac + ((1 - near / 105) * 0.45).toFixed(2) + ')'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    }
    if (hold > 0 || holdT) { hold += ((holdT ? 1 : 0) - hold) * 0.12; if (Math.abs(hold - (holdT ? 1 : 0)) > 0.01) moving = true; }
    if (moving || inside) raf = requestAnimationFrame(step);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
  hero.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const r = hero.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; inside = true; kick(); });
  hero.addEventListener('pointerleave', () => { inside = false; holdT = 0; kick(); });
  let ht = 0;
  hero.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('a, button')) return; ht = setTimeout(() => { holdT = 1; kick(); }, 180); });
  addEventListener('pointerup', () => { clearTimeout(ht); holdT = 0; kick(); });
  kick();

  /* ---- 3D tilt toward the cursor ---- */
  let tr = 0; let ex = 0; let ey = 0;
  const tilt = () => { tr = 0; const r = frame.getBoundingClientRect(); const dx = Math.max(-1, Math.min(1, (ex - (r.left + r.width / 2)) / (innerWidth * 0.45))); const dy = Math.max(-1, Math.min(1, (ey - (r.top + r.height / 2)) / (innerHeight * 0.55)));
    frame.style.setProperty('--ry', (dx * 11).toFixed(2) + 'deg'); frame.style.setProperty('--rx', (-dy * 8).toFixed(2) + 'deg'); frame.style.setProperty('--sx', (-dx * 12).toFixed(1) + 'px'); frame.style.setProperty('--sy', (10 - dy * 6).toFixed(1) + 'px'); };
  hero.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; ex = e.clientX; ey = e.clientY; frame.classList.add('is-live'); if (!tr) tr = requestAnimationFrame(tilt); });
  hero.addEventListener('pointerleave', () => { frame.classList.remove('is-live'); ['--rx', '--ry', '--sx', '--sy'].forEach((v) => frame.style.removeProperty(v)); });
})();


(() => {
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches; if (!fine) return;
  const arrow = new URLSearchParams(location.search).get('cursor') === 'arrow';   // preview switch: keep the system arrow, brackets only
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const ret = document.createElement('div'); ret.className = 'reticle'; ret.setAttribute('aria-hidden', 'true');
  ret.innerHTML = '<svg class="reticle__x" viewBox="-14 -14 28 28"><path d="M-11 0 H-4 M4 0 H11 M0 -11 V-4 M0 4 V11" stroke="currentColor" stroke-width="1.3"/><circle r="1.4" fill="currentColor"/></svg><span class="reticle__read"></span>';
  const box = document.createElement('div'); box.className = 'reticle__box'; box.setAttribute('aria-hidden', 'true'); box.innerHTML = '<i></i><i></i><i></i><i></i><b></b>'; const boxLabel = box.querySelector('b');
  document.body.append(box, ret); const read = ret.querySelector('.reticle__read');
  const TAGS = [['.pc__stamp', 'View screenshot'], ['.case .shot-btn', 'View project'], ['.photo-btn', 'View photo'], ['[data-open-project]', 'Case notes'], ['.media-tab', 'Switch view'], ['.filter', 'Filter'],
    ['a[href^="mailto:"]', 'Email'], ['a[href$=".pdf"]', 'Download'], ['a[href^="#"]', 'Jump'], ['a[href^="http"]', 'Open ↗'], ['.achievement-card', 'Details'], ['button', 'Press'], ['.pc', 'Open postcard']];
  const lockFor = (el) => { if (!(el instanceof Element)) return null; for (const [sel, label] of TAGS) { const t = el.closest(sel); if (t) { if (sel === '.pc' && el.closest('a, button')) continue; return { t, label }; } } return null; };
  let lock = null;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return; if (!arrow) { root.classList.add('eng-cursor'); ret.classList.add('is-on'); }
    ret.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
    const l = lockFor(e.target);
    if (l) { const r = l.t.getBoundingClientRect(); const pad = 6; Object.assign(box.style, { left: (r.left - pad) + 'px', top: (r.top - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' }); box.classList.add('is-on'); ret.classList.add('is-lock'); boxLabel.dataset.label = l.label; lock = l.t; }
    else { box.classList.remove('is-on'); ret.classList.remove('is-lock'); lock = null; read.textContent = 'x ' + String(Math.round(e.pageX)).padStart(4, '0') + '  y ' + String(Math.round(e.pageY)).padStart(4, '0'); }
  }, { passive: true });
  addEventListener('scroll', () => { if (lock) { const r = lock.getBoundingClientRect(); box.style.left = (r.left - 6) + 'px'; box.style.top = (r.top - 6) + 'px'; } }, { passive: true });
  addEventListener('keydown', () => { root.classList.remove('eng-cursor'); ret.classList.remove('is-on'); box.classList.remove('is-on'); });   // keyboard: native behaviour, focus rings only
  root.addEventListener('mouseleave', () => { ret.classList.remove('is-on'); box.classList.remove('is-on'); });

  /* magnetic controls */
  if (!reduce) {
    const mags = [...document.querySelectorAll('.btn, .icon-btn, .media-tab, .filter, .back-top')]; mags.forEach((m) => m.classList.add('magnet'));
    let cur = null;
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return; const m = e.target.closest && e.target.closest('.magnet');
      if (cur && cur !== m) { cur.style.transform = ''; cur = null; }
      if (!m) return; cur = m; const r = m.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2); const dy = e.clientY - (r.top + r.height / 2);
      m.style.transform = 'translate(' + Math.max(-6, Math.min(6, dx * 0.18)).toFixed(1) + 'px,' + Math.max(-5, Math.min(5, dy * 0.3)).toFixed(1) + 'px)';
    }, { passive: true });
  }

  /* headings decode from random characters into the real text */
  if (!reduce) {
    const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+/<>=';
    const heads = [...document.querySelectorAll('.sec-title, .contact__title, .others__title')];
    heads.forEach((hd) => {
      hd.setAttribute('aria-label', hd.textContent.replace(/\s+/g, ' ').trim());
      const nodes = []; const walk = (n) => n.childNodes.forEach((c) => (c.nodeType === 3 ? nodes.push([c, c.textContent]) : walk(c))); walk(hd);
      let busy = false;
      const run = () => { if (busy) return; busy = true; const h = hd.getBoundingClientRect().height; hd.style.minHeight = h + 'px'; const t0 = performance.now(); const total = nodes.reduce((a, [, s]) => a + s.length, 0);
        const tick = (now) => { const u = Math.min(1, (now - t0) / 650); let k = 0;
          nodes.forEach(([n, s]) => { n.textContent = [...s].map((ch) => { const i = k++; return /\s/.test(ch) || u > (i / total) * 0.85 + 0.15 ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]; }).join(''); });
          if (u < 1) requestAnimationFrame(tick); else { nodes.forEach(([n, s]) => { n.textContent = s; }); hd.style.minHeight = ''; busy = false; } };
        requestAnimationFrame(tick); };
      hd.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') run(); });
      new IntersectionObserver(([e], o) => { if (e.isIntersecting) { run(); o.disconnect(); } }, { threshold: 0.6 }).observe(hd);
      hd.__decode = run;
    });
  }
})();

})();
