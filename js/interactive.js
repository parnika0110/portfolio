/* Parnika S M — interactive layer: live project visuals, hero dot field, layered 3D portrait, engineer's cursor.
   Plain JS, no dependencies. Loaded with `defer` after main.js.
   - Every canvas runs only while on screen; with prefers-reduced-motion it draws one still frame.
   - Desktop-only effects (dot field, custom cursor, magnetic controls) need a hovering fine pointer. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const MONO = '"IBM Plex Mono", ui-monospace, monospace';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  /* Break a status line into lines that fit maxW (at spaces, never leaving a "·" at a line edge).
     `model` is a same-shaped string at its longest, so a changing number never makes the lines jump. */
  const wrap = (ctx, text, maxW, model = text) => {
    const words = text.split(' '); const mw = model.split(' '); const lines = []; let cur = []; let curM = [];
    words.forEach((word, i) => {
      const m = mw[i] ?? word;
      if (curM.length && ctx.measureText([...curM, m].join(' ')).width > maxW) { lines.push(cur); cur = []; curM = []; }
      cur.push(word); curM.push(m);
    });
    if (cur.length) lines.push(cur);
    return lines.map((l) => { while (l[0] === '·') l.shift(); while (l[l.length - 1] === '·') l.pop(); return l.join(' '); });
  };

  /* ======================================================================= live canvas helper
     A canvas that sizes itself to its box, animates only while visible, and draws a single still
     frame (at `stillT` seconds) when reduced motion is on. */
  function live(host, draw, { stillT = 3 } = {}) {
    const cv = document.createElement('canvas');
    host.prepend(cv);
    const ctx = cv.getContext('2d');
    let w = 0; let h = 0; let visible = false; let raf = 0; let last = 0; const t0 = performance.now();
    const size = () => {
      const r = host.getBoundingClientRect(); const d = Math.min(2, devicePixelRatio || 1);
      w = r.width; h = r.height; cv.width = Math.round(w * d); cv.height = Math.round(h * d); ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    const frame = (now) => {
      raf = 0;
      if (!w || !h) return;
      const still = reducedMotion.matches;
      const t = still ? stillT : (now - t0) / 1000;
      const dt = still ? 0 : Math.min(0.05, (now - (last || now)) / 1000); last = now;
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h, t, dt, still);
      if (visible && !still) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    new ResizeObserver(() => { size(); kick(); }).observe(host);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { last = 0; kick(); } }).observe(host);
    document.fonts?.ready.then(kick);
    return { kick };
  }

  /* Lay a live canvas exactly over a sketch's <svg>. The svg keeps its box (hidden), so the layout is
     unchanged; without JavaScript the original sketch still shows. */
  function overSketch(fig, { caption, label, wide = false, touch = false }) {
    const svg = fig && $('svg', fig);
    if (!svg) return null;
    const host = document.createElement('div');
    host.className = 'live' + (touch ? ' live--touch' : '');
    host.setAttribute('role', 'img');
    host.setAttribute('aria-label', label);
    fig.append(host);
    fig.classList.add('is-live');
    svg.setAttribute('aria-hidden', 'true');
    const cap = $('.sk-caption .label', fig);
    if (cap && caption) cap.textContent = caption;
    const place = () => {
      // layout box of the svg relative to the figure's padding box (corrected for any running scale transform)
      const f = fig.getBoundingClientRect(); const r = svg.getBoundingClientRect();
      if (!f.width) return;
      const k = fig.offsetWidth / f.width;
      const top = (r.top - f.top) * k - fig.clientTop; const height = r.height * k;
      let left = (r.left - f.left) * k - fig.clientLeft; let width = r.width * k;
      if (wide) {
        const cs = getComputedStyle(fig);
        const capEl = $('.sk-caption', fig);
        left = parseFloat(cs.paddingLeft);
        const right = fig.clientWidth - parseFloat(cs.paddingRight);
        if (cs.display.includes('flex') && cs.flexDirection === 'row' && capEl) left = capEl.offsetLeft - fig.clientLeft + capEl.offsetWidth + (parseFloat(cs.columnGap) || 0);
        width = right - left;
      }
      Object.assign(host.style, { left: `${left}px`, top: `${top}px`, width: `${Math.max(0, width)}px`, height: `${height}px` });
    };
    new ResizeObserver(place).observe(fig);
    place();
    return host;
  }

  /* ======================================================================= OPPY — pipeline (simulation) */
  {
    const host = overSketch($('#oppy-panel-2 figure.sketch'), {
      caption: 'Pipeline · simulation', wide: true,
      label: "Simulation of OPPY's opportunity pipeline: listings from seven categories pass through scheduled ingestion, normalisation, de-duplication and quality filtering, and matching ones flow to the user. The counts are simulated.",
    });
    if (host) {
      const CATS = ['internships', 'jobs', 'hackathons', 'fellowships', 'events', 'grants', 'scholarships'];
      const STAGES = [['INGEST', 'AWS Lambda'], ['NORMALISE', 'one schema'], ['DE-DUPE', 'merge repeats'], ['QUALITY', 'filter'], ['MATCH', 'your interests']];
      let parts = []; let merged = 0; let dropped = 0; let matched = 0; let acc = 0;
      const seed = (w, h, x) => { const c = (Math.random() * CATS.length) | 0; parts.push({ c, x, y: 30 + (c + 0.5) * ((h - 66) / CATS.length) + (Math.random() - 0.5) * 6, lane: (Math.random() * 5) | 0, dup: Math.random() < 0.16, bad: Math.random() < 0.12, fit: Math.random() < 0.45, a: 1 }); };
      live(host, (ctx, w, h, t, dt, still) => {
        const P = (a) => `rgba(245,240,231,${a})`; const tan = css('--tan');
        ctx.font = `500 8px ${MONO}`;
        const catW = Math.max(...CATS.map((c) => ctx.measureText(c).width));
        const left = Math.min(92, Math.max(w * 0.22, catW + 6)); const sx = (i) => left + (w - left - 26) * (0.08 + i * 0.2);
        // header: name + note per stage when they fit the column; names only; or names staggered on two rows
        const col = (w - left - 26) * 0.2 - 6;
        const nameW = Math.max(...STAGES.map(([n]) => ctx.measureText(n).width));
        ctx.font = `500 7px ${MONO}`; const noteW = Math.max(...STAGES.map(([, n]) => ctx.measureText(n).width));
        const mode = nameW <= col && noteW <= col ? 'notes' : nameW <= col ? 'names' : 'stagger';
        ctx.textAlign = 'center';
        STAGES.forEach(([n, s], i) => {
          const x = sx(i); ctx.strokeStyle = P(0.28); ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(x, 34); ctx.lineTo(x, h - 30); ctx.stroke(); ctx.setLineDash([]);
          ctx.font = `500 8px ${MONO}`; ctx.fillStyle = P(0.95); ctx.fillText(n, x, mode === 'stagger' && i % 2 ? 26 : 14);
          if (mode === 'notes') { ctx.font = `500 7px ${MONO}`; ctx.fillStyle = P(0.62); ctx.fillText(s, x, 25); }
        });
        ctx.font = `500 8px ${MONO}`;
        ctx.textAlign = 'left'; ctx.fillStyle = P(0.72);
        CATS.forEach((c, i) => ctx.fillText(c, 0, 30 + (i + 0.5) * ((h - 66) / CATS.length) + 3));
        const ux = w - 12; const uy = h / 2;
        ctx.strokeStyle = tan; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ux, uy, 7, 0, 7); ctx.stroke();
        if (still && !parts.length) for (let i = 0; i < 46; i++) seed(w, h, left + Math.random() * (w - left - 30));
        if (!still) { acc += dt * 26; while (acc > 1) { acc -= 1; seed(w, h, left - 4); } }
        const laneY = (l) => 44 + l * ((h - 92) / 4);
        for (const p of parts) {
          if (!still) p.x += (46 + p.c * 3) * dt;
          let ty = p.y;
          if (p.x > sx(1)) ty = laneY(p.lane);
          if (p.x > sx(2) && p.dup && !p.m) { p.m = 1; merged++; }
          if (p.m) p.a -= dt * 3;
          if (p.x > sx(3) && p.bad && !p.b) { p.b = 1; dropped++; }
          if (p.b) { p.a -= dt * 2.5; ty = p.y + 8; }
          if (p.x > sx(4)) ty = p.fit ? uy : (p.y > uy ? h - 36 : 40);
          if (p.fit && !p.f && p.x > ux - 10) { p.f = 1; matched++; p.a = 0; }
          p.y += (ty - p.y) * Math.min(1, dt * 4 || 1);
          if (p.x > w + 8 || p.a <= 0) { p.gone = 1; continue; }
          ctx.globalAlpha = Math.max(0, p.a);
          ctx.fillStyle = p.x > sx(4) && p.fit ? tan : (p.b ? 'rgba(33,29,43,.6)' : P(0.94));
          ctx.beginPath(); ctx.arc(p.x, p.y, p.dup && p.x > sx(1) && p.x < sx(2) ? 3.2 : 2.3, 0, 7); ctx.fill();
          ctx.globalAlpha = 1;
        }
        parts = parts.filter((p) => !p.gone);
        ctx.fillStyle = P(0.85);
        const foot = still ? ['simulated flow'] : wrap(ctx, `simulated · merged ${merged} · filtered ${dropped} · matched to you ${matched}`, w, 'simulated · merged 000 · filtered 000 · matched to you 000');
        foot.forEach((l, i) => ctx.fillText(l, 0, h - 6 - (foot.length - 1 - i) * 11));
      }, { stillT: 0 });
    }
  }

  /* ======================================================================= MediAssist — prescription OCR (illustration, sample data) */
  {
    const host = overSketch($('#case-mediassist figure.sketch'), {
      caption: 'Sample data · OCR', wide: true, touch: true,
      label: 'Illustration with sample data: a prescription photo is scanned, OCR boxes each word, and a table lists each medicine with its dose, frequency and duration. Not real patient data.',
    });
    if (host) {
      const RX = [['Tab. Paracetamol', '500 mg', '1-0-1', '5 days'], ['Cap. Amoxicillin', '250 mg', '1-1-1', '7 days'], ['Tab. Cetirizine', '10 mg', '0-0-1', '3 days']];
      let hover = -1;
      host.addEventListener('pointermove', (e) => { const r = host.getBoundingClientRect(); const i = Math.floor((e.clientY - r.top - 44) / 36); hover = i >= 0 && i < 3 ? i : -1; });
      host.addEventListener('pointerleave', () => { hover = -1; });
      live(host, (ctx, w, h, t, dt, still) => {
        const ink = css('--ink'); const sage = css('--sage-700'); const tan = css('--tan-700');
        const cyc = still ? 0.99 : (t % 7) / 7;
        const pw = Math.min(w * 0.48, 230); const ph = h - 18;
        ctx.save(); ctx.translate(4, 6); ctx.rotate(-0.02);
        ctx.fillStyle = '#FBF8F2'; ctx.strokeStyle = 'rgba(33,29,43,.25)'; ctx.fillRect(0, 0, pw, ph); ctx.strokeRect(0, 0, pw, ph);
        ctx.fillStyle = ink; ctx.font = '700 17px "Space Grotesk", sans-serif'; ctx.fillText('℞', 10, 24);
        ctx.font = `500 7px ${MONO}`; ctx.fillStyle = tan; ctx.fillText('SAMPLE', pw - 42, 18);
        const scanY = ease(cyc / 0.6) * ph;
        RX.forEach((row, i) => {
          const y0 = 52 + i * 36; let x = 10;
          ctx.font = 'italic 500 11px Georgia, serif';
          row.forEach((tok, j) => {
            if (j === 2) x = 22;
            const y = j < 2 ? y0 : y0 + 14; const tw = ctx.measureText(tok).width;
            ctx.fillStyle = 'rgba(33,29,43,.85)'; ctx.fillText(tok, x, y);
            if (scanY > y + 4) { ctx.strokeStyle = hover === i ? tan : sage; ctx.lineWidth = hover === i ? 1.6 : 1; ctx.strokeRect(x - 2, y - 10, tw + 4, 13); }
            x += tw + 8;
          });
        });
        if (cyc < 0.62) {
          const g = ctx.createLinearGradient(0, scanY - 16, 0, scanY); g.addColorStop(0, 'rgba(75,95,68,0)'); g.addColorStop(1, 'rgba(75,95,68,.28)');
          ctx.fillStyle = g; ctx.fillRect(0, scanY - 16, pw, 16); ctx.strokeStyle = sage; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, scanY); ctx.lineTo(pw, scanY); ctx.stroke();
        }
        ctx.restore();
        const tx = pw + 22; const tw2 = w - tx - 4;
        if (tw2 < 120) return;
        // columns sit at their usual proportions, pushed right where the text needs it; on a narrow
        // table the type steps down a little so every column fits
        const name = (row) => row[0].replace(/^(Tab|Cap)\. /, ''); const days = (row) => row[3].replace(' days', '');
        const HEAD = ['MEDICINE', 'DOSE', 'FREQ', 'DAYS'];
        ctx.font = '500 10px Inter, sans-serif'; const nw = Math.max(...RX.map((r) => ctx.measureText(name(r)).width));
        ctx.font = `500 8px ${MONO}`; const mw = (s) => ctx.measureText(s).width;
        const cw = [Math.max(nw, mw(HEAD[0])), Math.max(mw(HEAD[1]), ...RX.map((r) => mw(r[1]))), Math.max(mw(HEAD[2]), ...RX.map((r) => mw(r[2]))), Math.max(mw(HEAD[3]), ...RX.map((r) => mw(days(r))))];
        const GAP = 8; const sc = Math.min(1, tw2 / (cw.reduce((a, b) => a + b, 0) + GAP * 3));
        const cx = [0]; [0.48, 0.68, 0.86].forEach((f, i) => cx.push(Math.max(sc < 1 ? 0 : f * tw2, cx[i] + (cw[i] + GAP) * sc)));
        const nameFont = `500 ${(10 * sc).toFixed(2)}px Inter, sans-serif`; const monoFont = `500 ${(8 * sc).toFixed(2)}px ${MONO}`;
        ctx.font = monoFont; ctx.fillStyle = sage;
        HEAD.forEach((c, i) => ctx.fillText(c, tx + cx[i], 18));
        ctx.strokeStyle = 'rgba(75,95,68,.5)'; ctx.beginPath(); ctx.moveTo(tx, 24); ctx.lineTo(w - 4, 24); ctx.stroke();
        RX.forEach((row, i) => {
          const k = (scanY - (66 + i * 36)) / 24; if (k <= 0) return;
          const y = 44 + i * 26; ctx.globalAlpha = Math.min(1, k);
          if (hover === i) { ctx.fillStyle = 'rgba(231,139,72,.18)'; ctx.fillRect(tx - 4, y - 12, tw2 + 8, 18); }
          ctx.font = nameFont; ctx.fillStyle = ink; ctx.fillText(name(row), tx, y);
          ctx.font = monoFont; ctx.fillStyle = css('--ink-2');
          ctx.fillText(row[1], tx + cx[1], y); ctx.fillText(row[2], tx + cx[2], y); ctx.fillText(days(row), tx + cx[3], y);
          ctx.globalAlpha = 1;
        });
        ctx.font = `500 8px ${MONO}`; ctx.fillStyle = sage;
        wrap(ctx, 'FastAPI · OpenCV → PaddleOCR → parser', tw2).forEach((l, i) => ctx.fillText(l, tx, 44 + 3 * 26 + 4 + i * 11));
        ctx.fillText(scanY >= ph * 0.98 ? 'sample: 3 medicines parsed' : 'reading…', tx, h - 6);
      }, { stillT: 7 });
    }
  }

  /* ======================================================================= Gesture — simulated 21-point hand model (mouse-driven, no camera) */
  {
    const caseEl = $('#case-gesture');
    const host = overSketch($('#case-gesture figure.sketch'), {
      caption: 'Hand model · simulated', wide: true, touch: true,
      label: "Simulated hand-landmark model using MediaPipe's 21-point layout. It follows the mouse and pinches when you click; it does not use a camera.",
    });
    if (host && caseEl) {
      // landmark layout: 0 wrist · 1–4 thumb · 5–8 index · 9–12 middle · 13–16 ring · 17–20 little
      const OPEN = [[0, 0], [-.12, -.1], [-.22, -.22], [-.3, -.33], [-.36, -.43], [-.08, -.42], [-.08, -.62], [-.08, -.76], [-.08, -.88], [.04, -.44], [.06, -.6], [.04, -.5], [.02, -.44], [.15, -.4], [.18, -.54], [.15, -.46], [.13, -.4], [.24, -.34], [.27, -.45], [.24, -.39], [.22, -.34]];
      const PINCH = OPEN.map((p, i) => ([3, 4].includes(i) ? [p[0] + (i === 4 ? 0.1 : 0.05), p[1] - (i === 4 ? 0.1 : 0.06)] : [6, 7, 8].includes(i) ? [p[0] - (i - 5) * 0.06, p[1] + (i - 5) * 0.11] : p));
      const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];
      let tx = null; let ty = null; let down = false; let tapUntil = 0; let px = null; let py = null; let pinch = 0;
      caseEl.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const r = host.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; });
      caseEl.addEventListener('pointerleave', () => { tx = ty = null; down = false; });
      caseEl.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') down = true; });
      host.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') tapUntil = performance.now() + 600; });
      addEventListener('pointerup', () => { down = false; });
      live(host, (ctx, w, h, t, dt, still) => {
        const S = h * 0.62; const paper = 'rgba(245,240,231,'; const tan = css('--tan');
        let gx = tx; let gy = ty;
        if (gx === null) { gx = w * 0.55 + Math.sin(t * 0.9) * w * 0.18; gy = h * 0.3 + Math.sin(t * 1.8) * h * 0.08; }
        ctx.font = `500 8px ${MONO}`;
        const twoLines = ctx.measureText('simulated · LM 8 x 0.00 y 0.00 · pinch 0.00 → click').width > w;
        gx = clamp(gx, S * 0.45, w - S * 0.32); gy = clamp(gy, twoLines ? 30 : 18, h - S * 0.92);
        if (px === null || still) { px = gx; py = gy; } else { px += (gx - px) * 0.18; py += (gy - py) * 0.18; }
        const want = down || performance.now() < tapUntil || (tx === null && !still && Math.sin(t * 1.3) > 0.92) ? 1 : 0;
        pinch = still ? 0 : pinch + (want - pinch) * 0.25;
        const ox = px - OPEN[8][0] * S; const oy = py - OPEN[8][1] * S;
        const P = OPEN.map((p, i) => { const q = PINCH[i]; return [ox + (p[0] + (q[0] - p[0]) * pinch) * S, oy + (p[1] + (q[1] - p[1]) * pinch) * S]; });
        ctx.strokeStyle = paper + '.75)'; ctx.lineWidth = 1.3;
        BONES.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(P[b][0], P[b][1]); ctx.stroke(); });
        P.forEach(([x, y], i) => { const tip = i === 8 || i === 4; ctx.fillStyle = tip ? tan : paper + '.95)'; ctx.beginPath(); ctx.arc(x, y, tip ? 3.2 : 2.1, 0, 7); ctx.fill(); });
        const d = Math.hypot(P[4][0] - P[8][0], P[4][1] - P[8][1]) / S;
        ctx.setLineDash([2, 3]); ctx.strokeStyle = d < 0.12 ? tan : paper + '.4)'; ctx.beginPath(); ctx.moveTo(P[4][0], P[4][1]); ctx.lineTo(P[8][0], P[8][1]); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = tan; ctx.beginPath(); ctx.arc(P[8][0], P[8][1], 7, 0, 7); ctx.stroke();
        ctx.font = `500 8px ${MONO}`; ctx.fillStyle = paper + '.85)'; ctx.textAlign = 'right';
        const lm = `simulated · LM 8 x ${(P[8][0] / w).toFixed(2)} y ${(P[8][1] / h).toFixed(2)}`; const pn = `pinch ${d.toFixed(2)}${d < 0.12 ? ' → click' : ''}`;
        if (twoLines) { ctx.fillText(lm, w, 10); ctx.fillText(pn, w, 21); } else ctx.fillText(`${lm} · ${pn}`, w, 10);
        ctx.textAlign = 'left';
      }, { stillT: 1.2 });
    }
  }

  /* ======================================================================= Metro — route search on the project's own data
     Station lists: metro-fare-calculator/frontend/data.js. Graph building (connectLine, mergeGraphs,
     de-duplicated neighbours) and RouteService.findAllRoutes (depth-first, maxDepth 40) are ported
     unchanged; like the app, routes are sorted by stop count and the shortest is shown. */
  {
    const LINES = {
      purple: ['Whitefield', 'Channasandra', 'Kadugodi Tree Park', 'Pattandur Agrahara', 'Sri Sathya Sai Hospital', 'Nallurhalli', 'Seetharam Palya', 'Hoodi', 'Garudacharpalya', 'KR Pura', 'Benniganahalli', 'Baiyappanahalli', 'Swami Vivekananda Road', 'Indiranagar', 'Halasuru', 'Trinity', 'MG Road', 'Cubbon Park', 'Vidhana Soudha', 'Central College', 'Majestic', 'City Railway Station', 'Magadi Road', 'Hosahalli', 'Vijayanagar', 'Attiguppe', 'Deepanjali Nagar', 'Mysuru Road', 'Nayandahalli', 'Rajarajeshwari Nagar', 'Jnanabharathi', 'Pattanagere', 'Kengeri', 'Kengeri Bus Terminal'],
      green: ['Nagasandra', 'Dasarahalli', 'Jalahalli', 'Peenya Industry', 'Peenya', 'Goraguntepalya', 'Yeshwantpur', 'Sandal Soap Factory', 'Mahalakshmi', 'Rajajinagar', 'Kuvempu Road', 'Srirampura', 'Majestic', 'Chickpete', 'KR Market', 'National College', 'Lalbagh', 'South End Circle', 'Jayanagar', 'Rashtreeya Vidyalaya Road', 'Banashankari', 'Jaya Prakash Nagar', 'Yelachenahalli', 'Konanakunte Cross', 'Doddakallasandra', 'Vajarahalli', 'Thalaghattapura', 'Silk Institute'],
      yellow: ['Rashtreeya Vidyalaya Road', 'Ragigudda', 'Jayadeva Hospital', 'BTM Layout', 'Central Silk Board', 'HSR Layout', 'Agara Lake', 'Iblur', 'Bellandur', 'Kadubeesanahalli', 'Devarabeesanahalli', 'Marathahalli', 'Doddanekundi', 'DRDO Sports Complex', 'Mahadevapura', 'Garudacharpalya'],
      blue: ['Central Silk Board', 'HSR Layout', 'Agara Lake', 'Iblur', 'Bellandur', 'Kadubeesanahalli', 'Devarabeesanahalli', 'Marathahalli', 'Doddanekundi', 'DRDO Sports Complex', 'Mahadevapura', 'Garudacharpalya', 'KR Pura', 'Benniganahalli', 'Kasturinagar', 'Horamavu', 'Kalyan Nagar', 'HBR Layout', 'Nagawara', 'Hebbal', 'Kodigehalli', 'Jakkur Cross', 'Yelahanka', 'Bagalur Cross', 'Bettahalasuru', 'Doddajala', 'Airport City', 'Kempegowda International Airport'],
      pink: ['Kalena Agrahara', 'Hulimavu', 'IIM Bangalore', 'JP Nagar 4th Phase', 'Jayadeva Hospital', 'Tavarekere', 'Dairy Circle', 'Lakkasandra', 'Langford Town', 'Shivajinagar', 'Pottery Town', 'Tannery Road', 'Venkateshpura', 'Kempapura', 'Veerannapalya', 'Hebbal'],
    };
    // --- ported from the project (data.js + GraphService + RouteService) ---
    const connectLine = (st) => { const g = {}; for (let i = 0; i < st.length; i++) { g[st[i]] = g[st[i]] || []; if (i > 0) g[st[i]].push(st[i - 1]); if (i < st.length - 1) g[st[i]].push(st[i + 1]); } return g; };
    const mergeGraphs = (...gs) => { const m = {}; gs.forEach((g) => { for (const k in g) { m[k] = m[k] || []; m[k].push(...g[k]); } }); return m; };
    const graph = mergeGraphs(...Object.values(LINES).map(connectLine));
    for (const k in graph) graph[k] = [...new Set(graph[k])];
    const findAllRoutes = (start, end, maxDepth = 40, onVisit) => {
      const results = [];
      const dfs = (node, path, visited) => {
        if (path.length > maxDepth) return;
        if (node === end) { results.push([...path]); return; }
        for (const neighbor of graph[node] || []) {
          if (!visited.has(neighbor)) { visited.add(neighbor); path.push(neighbor); if (onVisit) onVisit(neighbor); dfs(neighbor, path, visited); path.pop(); visited.delete(neighbor); }
        }
      };
      dfs(start, [start], new Set([start]));
      return results;
    };
    // --- end of port ---
    const TRIPS = [['Whitefield', 'Majestic'], ['Yeshwantpur', 'Indiranagar'], ['Kengeri Bus Terminal', 'Kempegowda International Airport'], ['Majestic', 'Hebbal'], ['Kalena Agrahara', 'Whitefield']];
    let plans = null;
    const plan = () => plans || (plans = TRIPS.map(([s, e]) => {
      const order = []; const routes = findAllRoutes(s, e, 40, (n) => { if (order.length < 400) order.push(n); });
      const sorted = routes.sort((a, b) => a.length - b.length);
      return { s, e, order, count: routes.length, best: sorted[0] };
    }));
    // schematic layout (not geographic): a few anchor stations, the rest spaced evenly along each line
    const COL = { purple: '#6E4FB8', green: '#3F8F5A', yellow: '#C99A1C', blue: '#3B6FBF', pink: '#C8578C' };
    const A = { 'Whitefield': [505, 112], 'Garudacharpalya': [430, 122], 'KR Pura': [410, 126], 'Benniganahalli': [390, 130], 'Majestic': [205, 165], 'Kengeri Bus Terminal': [15, 205], 'Nagasandra': [150, 14], 'Rashtreeya Vidyalaya Road': [225, 262], 'Silk Institute': [205, 310], 'Jayadeva Hospital': [266, 272], 'Central Silk Board': [322, 276], 'Hebbal': [300, 62], 'Kempegowda International Airport': [372, 8], 'Kalena Agrahara': [250, 316] };
    const BEND = { 'Central Silk Board|Garudacharpalya': [[404, 266], [442, 200]], 'Benniganahalli|Hebbal': [[380, 92], [338, 70]], 'Hebbal|Kempegowda International Airport': [[318, 30]], 'Nagasandra|Majestic': [[160, 96]], 'Majestic|Kengeri Bus Terminal': [[120, 186]], 'Jayadeva Hospital|Hebbal': [[284, 200], [292, 110]] };
    const pos = {};
    Object.values(LINES).forEach((st) => {
      const idx = st.map((s, i) => (A[s] ? i : -1)).filter((i) => i >= 0);
      for (let k = 0; k < idx.length - 1; k++) {
        const i0 = idx[k]; const i1 = idx[k + 1]; const a = st[i0]; const b = st[i1];
        const bends = BEND[`${a}|${b}`] || (BEND[`${b}|${a}`] ? [...BEND[`${b}|${a}`]].reverse() : []);
        const poly = [A[a], ...bends, A[b]]; const seg = []; let L = 0;
        for (let j = 1; j < poly.length; j++) { const l = Math.hypot(poly[j][0] - poly[j - 1][0], poly[j][1] - poly[j - 1][1]); seg.push(l); L += l; }
        for (let i = i0; i <= i1; i++) {
          if (pos[st[i]]) continue;
          let d = (L * (i - i0)) / (i1 - i0); let j = 0; while (j < seg.length - 1 && d > seg[j]) { d -= seg[j]; j++; }
          const f = d / seg[j]; pos[st[i]] = [poly[j][0] + (poly[j + 1][0] - poly[j][0]) * f, poly[j][1] + (poly[j + 1][1] - poly[j][1]) * f];
        }
      }
    });
    const multi = new Set(Object.keys(pos).filter((s) => Object.values(LINES).filter((l) => l.includes(s)).length > 1));
    const short = (s) => s.replace('Kempegowda International Airport', 'KIA Airport');

    const tpl = $('template[data-notes="metro-fare-calculator"]');
    if (tpl) {
      const blk = document.createElement('div');
      blk.className = 'notes-block';
      blk.innerHTML = '<p class="label">Route search · project data + its depth-first search</p><div class="live live--metro" data-metro role="img" aria-label="Route search on the Metro Fare Calculator\'s own station data, using the project\'s depth-first search: it replays the search, draws the shortest route and runs a train along it. The map is schematic, not geographic."></div>';
      tpl.content.prepend(blk);
    }
    const start = (host) => {
      if (host.dataset.on) return; host.dataset.on = '1';
      live(host, (ctx, w, h, t, dt, still) => {
        const P = plan();
        const readout = (q) => `depth-first search · ${short(q.s)} → ${short(q.e)} · ${q.count} route${q.count === 1 ? '' : 's'} found · shortest ${q.best ? q.best.length - 1 : '–'} stops`;
        ctx.font = `500 9px ${MONO}`; const rows = Math.max(...P.map((q) => wrap(ctx, readout(q), w - 16).length));
        const sc = Math.min(w / 525, (h - 14 - rows * 12) / 322); const ox = (w - 525 * sc) / 2; const oy = 6;
        const X = (s) => ox + pos[s][0] * sc; const Y = (s) => oy + pos[s][1] * sc;
        const k = Math.floor(t / 9) % P.length; const u = still ? 0.99 : (t % 9) / 9; const p = P[k];
        Object.entries(LINES).forEach(([ln, st]) => { ctx.strokeStyle = COL[ln]; ctx.globalAlpha = 0.6; ctx.lineWidth = 2.4; ctx.beginPath(); st.forEach((s, i) => (i ? ctx.lineTo(X(s), Y(s)) : ctx.moveTo(X(s), Y(s)))); ctx.stroke(); });
        ctx.globalAlpha = 1;
        Object.keys(pos).forEach((s) => { const m = multi.has(s); ctx.fillStyle = '#FBF8F2'; ctx.strokeStyle = 'rgba(33,29,43,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(X(s), Y(s), m ? 3 : 1.6, 0, 7); ctx.fill(); ctx.stroke(); });
        if (!still && u < 0.42) {
          const n = Math.floor(ease(u / 0.3) * p.order.length);
          ctx.fillStyle = `rgba(98,80,200,${u < 0.3 ? 0.55 : 0.55 * (1 - (u - 0.3) / 0.12)})`;
          for (let i = 0; i < n; i++) { const s = p.order[i]; ctx.beginPath(); ctx.arc(X(s), Y(s), 2.6, 0, 7); ctx.fill(); }
        }
        if (p.best && u > 0.34) {
          const f = ease((u - 0.34) / 0.3); const n = Math.max(1, Math.floor(f * (p.best.length - 1)));
          ctx.strokeStyle = css('--ink'); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
          for (let i = 0; i <= n; i++) { const s = p.best[i]; i ? ctx.lineTo(X(s), Y(s)) : ctx.moveTo(X(s), Y(s)); }
          ctx.stroke();
          if (u > 0.66) {
            const g = Math.min(p.best.length - 1.001, ((u - 0.66) / 0.3) * (p.best.length - 1)); const i = Math.floor(g); const fr = g - i; const a = p.best[i]; const b = p.best[i + 1];
            ctx.fillStyle = css('--tan'); ctx.beginPath(); ctx.arc(X(a) + (X(b) - X(a)) * fr, Y(a) + (Y(b) - Y(a)) * fr, 4.5, 0, 7); ctx.fill();
          }
          ctx.font = `500 9px ${MONO}`;
          [p.s, p.e].forEach((s) => {
            ctx.beginPath(); ctx.strokeStyle = css('--tan-700'); ctx.lineWidth = 1.5; ctx.arc(X(s), Y(s), 5, 0, 7); ctx.stroke();
            const lw = ctx.measureText(short(s)).width; let lx = X(s) + 7; let ly = Y(s) - 6;
            if (lx + lw > w - 4) lx = Math.max(4, X(s) - 7 - lw); if (ly < 11) ly = Y(s) + 15;
            ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#FBF8F2'; ctx.strokeText(short(s), lx, ly);
            ctx.fillStyle = css('--ink'); ctx.fillText(short(s), lx, ly);
          });
        }
        ctx.font = `500 9px ${MONO}`; ctx.fillStyle = css('--ink-3');
        const ro = wrap(ctx, readout(p), w - 16); ro.forEach((l, i) => ctx.fillText(l, 8, h - 8 - (ro.length - 1 - i) * 12));
      }, { stillT: 0 });
    };
    const extra = $('#projectModalExtra');
    if (extra) new MutationObserver(() => $$('[data-metro]', extra).forEach(start)).observe(extra, { childList: true });
  }

  /* ======================================================================= layered 3D portrait
     The same <picture> (same file, same colours) moves onto its own depth plane. Each plane is
     counter-scaled about the perspective origin, so at rest the portrait renders exactly as before;
     the depth only shows when the frame tilts. */
  {
    const frame = $('.portrait__frame');
    const card = frame && $('.portrait__card', frame);
    const pic = card && $('picture', card);
    if (pic) {
      const PERSPECTIVE = 1100;
      const layer = (z, ...els) => {
        const d = document.createElement('div');
        d.className = 'depth';
        d.style.setProperty('--z', `${z}px`);
        d.style.setProperty('--k', ((PERSPECTIVE - z) / PERSPECTIVE).toFixed(5));
        els.forEach((el) => el && d.append(el));
        if (z < 0) frame.insertBefore(d, card); else frame.append(d);   // keep the original paint order
        return d;
      };
      const pop = document.createElement('div'); pop.className = 'portrait__pop'; pop.append(pic);
      layer(-34, $('.portrait__offset', frame));
      layer(46, pop);
      layer(58, $('.portrait__postmark', frame));
      layer(72, $('.portrait__stamp', frame));
      frame.classList.add('is-3d');
      const hero = $('#top');
      let raf = 0; let ex = 0; let ey = 0;
      const tilt = () => {
        raf = 0; const r = frame.getBoundingClientRect();
        const dx = clamp((ex - (r.left + r.width / 2)) / (innerWidth * 0.45), -1, 1);
        const dy = clamp((ey - (r.top + r.height / 2)) / (innerHeight * 0.55), -1, 1);
        frame.style.setProperty('--ry', `${(dx * 10).toFixed(2)}deg`); frame.style.setProperty('--rx', `${(-dy * 7).toFixed(2)}deg`);
      };
      let off = 0;
      hero.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || reducedMotion.matches || !finePointer.matches) return;
        clearTimeout(off); ex = e.clientX; ey = e.clientY; frame.classList.add('is-tilt', 'is-live'); if (!raf) raf = requestAnimationFrame(tilt);
      });
      hero.addEventListener('pointerleave', () => {
        frame.classList.remove('is-live'); frame.style.removeProperty('--rx'); frame.style.removeProperty('--ry');
        off = setTimeout(() => frame.classList.remove('is-tilt'), 650);   // back to the plain flat portrait once it has settled
      });
    }
  }

  /* ======================================================================= hero dot field (desktop) */
  {
    const hero = $('#top');
    let ready = false;
    const init = () => {
      if (ready || !finePointer.matches || reducedMotion.matches || !hero) return;
      ready = true;
      const cv = document.createElement('canvas'); cv.className = 'dotfield'; cv.setAttribute('aria-hidden', 'true'); hero.prepend(cv);
      const ctx = cv.getContext('2d'); let W = 0; let H = 0; let dots = [];
      const build = () => {
        const r = hero.getBoundingClientRect(); const d = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height;
        cv.width = Math.round(W * d); cv.height = Math.round(H * d); ctx.setTransform(d, 0, 0, d, 0, 0);
        dots = []; const G = 24;
        for (let y = G / 2; y < H; y += G) for (let x = G / 2; x < W; x += G) { const bx = x + (Math.random() - 0.5) * 7; const by = y + (Math.random() - 0.5) * 7; dots.push({ bx, by, x: bx, y: by, vx: 0, vy: 0 }); }
      };
      let mx = -1e4; let my = -1e4; let inside = false; let holdT = 0; let hold = 0; let raf = 0; let lastMove = 0;
      const step = (now) => {
        raf = 0; ctx.clearRect(0, 0, W, H); let moving = false;
        hold += (holdT - hold) * 0.12; if (Math.abs(hold - holdT) > 0.01) moving = true;
        for (const p of dots) {
          let tx = p.bx; let ty = p.by; const dx = p.bx - mx; const dy = p.by - my; const dist = Math.hypot(dx, dy);
          if (inside && hold > 0.02 && dist < 300) { const f = (1 - dist / 300) * hold * 0.82; tx = mx + dx * (1 - f); ty = my + dy * (1 - f); }
          else if (inside && dist < 120 && dist > 0.1) { const f = (120 - dist) / 120; tx = p.bx + (dx / dist) * f * 34; ty = p.by + (dy / dist) * f * 34; }
          p.vx = (p.vx + (tx - p.x) * 0.12) * 0.74; p.vy = (p.vy + (ty - p.y) * 0.12) * 0.74; p.x += p.vx; p.y += p.vy;
          if (Math.abs(p.vx) + Math.abs(p.vy) > 0.02) moving = true;
          const near = inside ? Math.hypot(p.x - mx, p.y - my) : 1e9;
          ctx.fillStyle = near < 150 ? `rgba(98,80,200,${(0.75 - near / 300).toFixed(2)})` : 'rgba(33,29,43,.17)';
          ctx.beginPath(); ctx.arc(p.x, p.y, near < 150 ? 1.5 : 1.1, 0, 7); ctx.fill();
          if (inside && near < 105 && hold < 0.5) { ctx.strokeStyle = `rgba(98,80,200,${((1 - near / 105) * 0.45).toFixed(2)})`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(p.x, p.y); ctx.stroke(); }
        }
        if (moving || now - lastMove < 400) raf = requestAnimationFrame(step);
      };
      const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
      build(); kick();
      new ResizeObserver(() => { build(); kick(); }).observe(hero);
      hero.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const r = hero.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; inside = true; lastMove = performance.now(); kick(); });
      hero.addEventListener('pointerleave', () => { inside = false; holdT = 0; kick(); });
      let ht = 0;
      hero.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('a, button')) return; ht = setTimeout(() => { holdT = 1; kick(); }, 180); });
      addEventListener('pointerup', () => { clearTimeout(ht); holdT = 0; kick(); });
    };
    init();
    finePointer.addEventListener?.('change', init);
  }

  /* ======================================================================= engineer's cursor (desktop)
     Replaces the system arrow with a crosshair whose centre is the pointer hotspot, plus live page
     coordinates. Over interactive controls and visuals it locks on with corner brackets and a label.
     Text inputs keep the text cursor; keyboard use brings the system cursor back until the mouse moves. */
  {
    const LOCK = [
      ['.pc__stamp', 'View screenshot'], ['.shot-btn', 'View project'], ['.photo-btn', 'View photo'],
      ['[data-open-project]', 'Case notes'], ['[role="tab"]', 'Switch view'], ['.filter', 'Filter'],
      ['a[href^="mailto:"]', 'Email'], ['a[href$=".pdf"]', 'Download'], ['#copyEmail', 'Copy'],
      ['.modal__close, #photoModalClose', 'Close'], ['a[href^="#"]', 'Jump'], ['a[target="_blank"]', 'Open ↗'],
      ['a[href]', 'Open'], ['button', 'Select'],
    ];
    const PLAIN = '.ms, .cred';             // text cards: crosshair only, no brackets or magnetism
    const TEXT = 'input, textarea, select, [contenteditable="true"]';
    let ready = false;
    const init = () => {
      if (ready || !finePointer.matches) return;
      ready = true;
      const root = document.documentElement;
      const cur = document.createElement('div'); cur.className = 'xcur'; cur.setAttribute('aria-hidden', 'true');
      cur.innerHTML = '<svg class="xcur__x" viewBox="-14 -14 28 28"><path d="M-11 0H-4M4 0H11M0-11V-4M0 4V11" stroke="currentColor" stroke-width="1.3"/><circle r="1.4" fill="currentColor"/></svg><span class="xcur__read"></span>';
      const box = document.createElement('div'); box.className = 'xlock'; box.setAttribute('aria-hidden', 'true');
      box.innerHTML = '<i></i><i></i><i></i><i></i><b></b>';
      document.body.append(box, cur);
      const read = $('.xcur__read', cur); const tag = $('b', box);
      let lock = null; let pageX = 0; let pageY = 0;
      const lockFor = (el) => {
        if (!(el instanceof Element) || el.closest(PLAIN)) return null;
        const pc = el.closest('.pc');
        if (pc && !el.closest('a, button')) return { t: pc, label: 'Open postcard' };
        for (const [sel, label] of LOCK) { const t = el.closest(sel); if (t) return { t, label }; }
        return null;
      };
      const placeBox = () => {
        if (!lock) return;
        const r = lock.getBoundingClientRect(); const pad = 6;
        Object.assign(box.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
      };
      const hide = () => { root.classList.remove('has-xcur'); cur.classList.remove('is-on', 'is-lock', 'is-hot', 'is-press'); box.classList.remove('is-on'); lock = null; };
      addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        if (e.target instanceof Element && e.target.closest(TEXT)) { cur.classList.remove('is-on'); box.classList.remove('is-on'); lock = null; return; }
        root.classList.add('has-xcur'); cur.classList.add('is-on');
        cur.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        pageX = e.pageX; pageY = e.pageY;
        const l = lockFor(e.target);
        const hot = e.target instanceof Element && !!e.target.closest('a[href], button, [role="tab"], summary, label[for]');
        cur.classList.toggle('is-hot', hot && !l);
        if (l) { lock = l.t; tag.dataset.label = l.label; box.classList.add('is-on'); cur.classList.add('is-lock'); placeBox(); }
        else { lock = null; box.classList.remove('is-on'); cur.classList.remove('is-lock'); read.dataset.v = `x ${String(Math.round(pageX)).padStart(4, '0')}  y ${String(Math.round(pageY)).padStart(4, '0')}`; }
      }, { passive: true });
      addEventListener('scroll', () => { placeBox(); }, { passive: true });
      addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') cur.classList.add('is-press'); });
      addEventListener('pointerup', () => cur.classList.remove('is-press'));
      addEventListener('keydown', hide);                         // keyboard: system cursor and focus rings only
      addEventListener('blur', hide);
      root.addEventListener('mouseleave', hide);
      document.addEventListener('pointerover', (e) => { if (e.target instanceof HTMLIFrameElement) hide(); });

      /* magnetic controls: a small pull toward the pointer (not on text cards; off with reduced motion) */
      const MAG = '.btn, .icon-btn, .filter, .media-tab';
      let held = null;
      const release = () => { if (held) { held.style.transform = ''; held = null; } };
      addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || reducedMotion.matches) { release(); return; }
        const m = e.target instanceof Element ? e.target.closest(MAG) : null;
        if (m && m.closest(PLAIN)) { release(); return; }
        if (held && held !== m) release();
        if (!m) return;
        held = m; m.classList.add('magnetic');
        const r = m.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2); const dy = e.clientY - (r.top + r.height / 2);
        m.style.transform = `translate(${clamp(dx * 0.18, -6, 6).toFixed(1)}px, ${clamp(dy * 0.3, -5, 5).toFixed(1)}px)`;
        requestAnimationFrame(placeBox);
      }, { passive: true });
      addEventListener('keydown', release);
    };
    init();
    finePointer.addEventListener?.('change', init);
  }
})();
