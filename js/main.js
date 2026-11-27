/* Parnika S M — portfolio interactions.
   Plain JS, no dependencies. Loaded with `defer` from index.html. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => (reducedMotion.matches ? 'auto' : 'smooth');

  /* ------------------------------------------------------------ data */
  let projects = [];
  try { projects = JSON.parse($('#project-data')?.textContent || '[]'); } catch { projects = []; }
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const certificateImages = {
    jpmorgan: './certifications/jpmorgan-certificate.webp',
    commonwealth: './certifications/commonwealth-certificate.webp',
    'wells-fargo': './certifications/wells-fargo-certificate.webp',
    deloitte: './certifications/deloitte-certificate.webp',
    'google-genai': './certifications/google-genai-certificate.webp',
    sap: './certifications/sap-certificate.webp',
    'oracle-agentic-ai': './certifications/oracle-agentic-ai-badge.jpg',
  };

  /* ------------------------------------------------------------ nav state, progress, back-to-top */
  const navbar = $('#navbar');
  const progress = $('#scrollProgress');
  const backTop = $('#backTop');
  let ticking = false;
  let lastY = window.scrollY;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      navbar.classList.toggle('is-scrolled', y > 8);
      progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      // Wide screens: the button sits in the margin, so it can always show.
      // Narrow screens: only show it while scrolling up, so it never covers text you're reading.
      const roomy = window.innerWidth >= 1340;
      const goingUp = y < lastY - 2;
      if (y <= 700) backTop.classList.remove('is-shown');
      else if (roomy || goingUp) backTop.classList.add('is-shown');
      else if (y > lastY + 2) backTop.classList.remove('is-shown');
      lastY = y;
      ticking = false;
    });
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
    $('#top')?.querySelector('a, button')?.focus({ preventScroll: true });
  });

  /* ------------------------------------------------------------ mobile menu */
  const menuBtn = $('#menuBtn');
  const mobileMenu = $('#mobileMenu');
  const setMenu = (open) => {
    mobileMenu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  menuBtn.addEventListener('click', () => setMenu(mobileMenu.hidden));
  $$('a', mobileMenu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  window.matchMedia('(min-width: 1180px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ------------------------------------------------------------ active section in nav */
  const navLinks = $$('[data-nav]');
  const sections = [...new Set(navLinks.map((a) => a.dataset.nav))].map((id) => document.getElementById(id)).filter(Boolean);
  const setActive = (id) => {
    navLinks.forEach((a) => {
      if (a.dataset.nav === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };
  if ('IntersectionObserver' in window) {
    const visible = new Map();
    const navIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => visible.set(e.target.id, e.isIntersecting));
      const current = sections.find((s) => visible.get(s.id));
      setActive(current ? current.id : null);
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => navIO.observe(s));
  }

  /* ------------------------------------------------------------ reveal + stamp-in */
  const revealEls = $$('.reveal, .stamp-in');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const show = (el) => { el.classList.add('is-in'); io.unobserve(el); };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || e.target.classList.contains('is-in')) return;
        show(e.target);
        // siblings in the same row of a grid reveal together (their reveal-d* delays give a gentle stagger)
        if (!e.target.matches('.reveal')) return;
        const top = e.target.getBoundingClientRect().top;
        Array.from(e.target.parentElement?.children || []).forEach((s) => {
          if (s !== e.target && s.matches('.reveal:not(.is-in)') && Math.abs(s.getBoundingClientRect().top - top) < window.innerHeight * 0.5) show(s);
        });
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ------------------------------------------------------------ arrows nudge the way they point */
  const ARROW_DIR = { '↗': 'ne', '→': 'e', '←': 'w', '↓': 's', '↑': 'n' };
  $$('.arrow').forEach((a) => { const d = ARROW_DIR[a.textContent.trim()]; if (d) a.dataset.dir = d; });

  /* ------------------------------------------------------------ hero orbit: pause the slow satellite while the hero is off screen */
  const orbit = $('.orbit svg');
  const sat = orbit && $('.orbit__sat', orbit);
  if (sat && !reducedMotion.matches && typeof orbit.pauseAnimations === 'function') {
    sat.setAttribute('cx', '0'); sat.setAttribute('cy', '0');
    const motion = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
    motion.setAttribute('dur', '120s'); motion.setAttribute('repeatCount', 'indefinite');
    motion.setAttribute('path', 'M156 86 A104 34 0 0 0 84.4 22.1 A104 34 0 0 0 156 86');
    sat.append(motion);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => (e.isIntersecting ? orbit.unpauseAnimations() : orbit.pauseAnimations())).observe(orbit);
    }
  }

  /* ------------------------------------------------------------ wide sketches: keyboard-scrollable only when they overflow */
  const wideSketches = $$('.sketch--wide');
  const syncScrollable = () => wideSketches.forEach((el) => {
    if (el.scrollWidth > el.clientWidth + 1) el.setAttribute('tabindex', '0');
    else el.removeAttribute('tabindex');
  });
  syncScrollable();
  window.addEventListener('resize', syncScrollable, { passive: true });

  /* ------------------------------------------------------------ media switcher tabs (OPPY case study) */
  $$('[role="tablist"].media-tabs').forEach((list) => {
    const tabs = $$('[role="tab"]', list);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const select = (i, focus = false) => {
      tabs.forEach((t, n) => {
        const on = n === i;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panels[n].classList.toggle('is-off', !on);
        panels[n].inert = !on;
      });
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        const last = tabs.length - 1;
        const next = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
        if (next !== undefined) { e.preventDefault(); select(next, true); }
      });
    });
    select(Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')));
  });

  /* ------------------------------------------------------------ project filters */
  const filterBtns = $$('#projectFilters .filter');
  const filterStatus = $('#filterStatus');
  const filterables = () => $$('#projectList .case, #more-projects .pc');
  filterBtns.forEach((btn) => btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    filterBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    let shown = 0;
    filterables().forEach((el) => {
      const match = f === 'all' || (el.dataset.category || '').split(' ').includes(f);
      el.hidden = !match;
      if (match) { shown += 1; el.classList.add('is-in'); }
    });
    if (filterStatus) filterStatus.textContent = `Showing ${shown} project${shown === 1 ? '' : 's'}${f === 'all' ? '' : ` tagged ${btn.textContent.trim()}`}.`;
  }));

  /* ------------------------------------------------------------ modal manager (focus trap, scroll lock) */
  const openStack = [];
  const FOCUSABLE = 'a[href]:not([hidden]), button:not([disabled]):not([hidden]), input, [tabindex]:not([tabindex="-1"])';

  function openModal(modal, focusTarget) {
    modal._returnFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    openStack.push(modal);
    requestAnimationFrame(() => (focusTarget || modal.querySelector('[role="dialog"]'))?.focus());
  }
  function closeModal(modal) {
    if (modal.hidden) return;
    modal.hidden = true;
    const i = openStack.indexOf(modal);
    if (i > -1) openStack.splice(i, 1);
    if (!openStack.length) document.body.style.overflow = '';
    modal._returnFocus?.focus?.({ preventScroll: true });
    modal.dispatchEvent(new CustomEvent('modal:closed'));
  }
  $$('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });
    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const items = $$(FOCUSABLE, modal).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === modal.querySelector('[role="dialog"]'))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });

  /* ------------------------------------------------------------ project case-notes modal */
  const pm = $('#projectModal');
  const pmClose = $('#projectModalClose');
  const gallery = $('#projectGallery');
  const galleryMain = $('#galleryMain');
  const galleryCap = $('#galleryCap');
  const galleryThumbs = $('#galleryThumbs');
  let shots = [];
  let shotIndex = 0;

  function showShot(i) {
    if (!shots.length) return;
    shotIndex = (i + shots.length) % shots.length;
    const s = shots[shotIndex];
    galleryMain.classList.add('is-swapping');
    galleryMain.onload = () => galleryMain.classList.remove('is-swapping');
    galleryMain.src = s.src;
    if (galleryMain.complete) requestAnimationFrame(() => galleryMain.classList.remove('is-swapping'));
    galleryMain.alt = s.alt || '';
    galleryCap.textContent = `${shotIndex + 1} / ${shots.length} — ${s.alt || ''}`;
    $$('button', galleryThumbs).forEach((b, n) => {
      if (n === shotIndex) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
  }

  function openProject(id, startAt = 0) {
    const p = projectById.get(id);
    if (!p) return;
    $('#projectModalCategory').textContent = p.category || '';
    $('#projectModalTitle').textContent = p.title;
    $('#projectModalOverview').textContent = p.overview || '';
    // extra case notes (problem, approach, diagrams) kept in <template data-notes="id">
    const extra = $('#projectModalExtra');
    const notes = document.querySelector(`template[data-notes="${CSS.escape(id)}"]`);
    extra.replaceChildren(...(notes ? [notes.content.cloneNode(true)] : []));
    extra.hidden = !notes;
    const feats = $('#projectModalFeatures');
    feats.replaceChildren(...(p.features || []).map((f) => Object.assign(document.createElement('li'), { textContent: f })));
    const tech = $('#projectModalTech');
    tech.replaceChildren(...(p.tech || []).map((t) => Object.assign(document.createElement('li'), { className: 'chip', textContent: t })));
    const gh = $('#projectModalGithub');
    const live = $('#projectModalLive');
    gh.href = p.github;
    if (p.live) { live.href = p.live; live.hidden = false; gh.className = 'btn btn--ghost'; }
    else { live.hidden = true; live.removeAttribute('href'); gh.className = 'btn btn--ink'; }

    shots = Array.isArray(p.screenshots) ? p.screenshots : [];
    galleryThumbs.replaceChildren();
    if (shots.length) {
      shots.forEach((s, n) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'gallery__thumb';
        b.setAttribute('aria-label', `Show screenshot ${n + 1}: ${s.alt || ''}`);
        const img = document.createElement('img');
        img.src = s.src; img.alt = ''; img.loading = 'lazy';
        b.append(img);
        b.addEventListener('click', () => showShot(n));
        galleryThumbs.append(b);
      });
      const single = shots.length < 2;
      $('#galleryPrev').hidden = single;
      $('#galleryNext').hidden = single;
      gallery.hidden = false;
      showShot(startAt);
    } else {
      gallery.hidden = true;
      galleryMain.removeAttribute('src');
    }
    openModal(pm, pmClose);
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-open-project]');
    if (!trigger) return;
    e.preventDefault();
    openProject(trigger.dataset.openProject, Number(trigger.dataset.shot || 0));
  });
  // postcards: a click anywhere on the card (outside its links and buttons) opens the case notes
  $$('#more-projects .pc').forEach((card) => card.addEventListener('click', (e) => {
    if (e.target.closest('a, button') || String(window.getSelection())) return;
    card.querySelector('.pc__notes')?.click();
  }));
  pmClose.addEventListener('click', () => closeModal(pm));
  $('#galleryPrev').addEventListener('click', () => showShot(shotIndex - 1));
  $('#galleryNext').addEventListener('click', () => showShot(shotIndex + 1));
  pm.addEventListener('keydown', (e) => {
    if (gallery.hidden || shots.length < 2) return;
    if (e.key === 'ArrowLeft') showShot(shotIndex - 1);
    if (e.key === 'ArrowRight') showShot(shotIndex + 1);
  });

  /* ------------------------------------------------------------ achievement / certificate modal */
  const am = $('#achievementModal');
  const amClose = $('#achievementModalClose');
  const certWrap = $('#certificateWrap');
  const certImg = $('#certificateImage');
  const certDownload = $('#certificateDownload');
  const credlyWrap = $('#credlyWrap');
  const credlyVerify = $('#credlyVerifyLink');

  function resetAchievement() {
    certWrap.hidden = true;
    certImg.removeAttribute('src');
    certDownload.hidden = true;
    certDownload.removeAttribute('href');
    credlyWrap.hidden = true;
  }
  function openAchievement(card) {
    const [title = '', subtitle = '', desc = ''] = (card.dataset.achievement || '').split('|');
    $('#achievementModalTitle').textContent = title;
    $('#achievementModalSubtitle').textContent = subtitle;
    $('#achievementModalDescription').textContent = desc;
    resetAchievement();
    const cert = card.dataset.certificate;
    if (cert && certificateImages[cert]) {
      certImg.src = certificateImages[cert];
      certImg.alt = `${title} certificate`;
      certWrap.hidden = false;
      if (card.dataset.certificateUrl) {
        certDownload.href = card.dataset.certificateUrl;
        certDownload.textContent = card.dataset.certificateLinkLabel || 'View full certificate ↗';
        certDownload.hidden = false;
      }
    } else if (card.dataset.credly) {
      credlyVerify.href = card.dataset.credlyUrl;
      credlyWrap.hidden = false;
    }
    openModal(am, amClose);
  }
  $$('.achievement-card').forEach((card) => card.addEventListener('click', () => openAchievement(card)));
  amClose.addEventListener('click', () => closeModal(am));
  am.addEventListener('modal:closed', resetAchievement);

  /* ------------------------------------------------------------ D-Day photo lightbox */
  const photoModal = $('#photoModal');
  if (photoModal) {
    const photoBtns = $$('[data-photo]').sort((a, b) => Number(a.dataset.photo) - Number(b.dataset.photo));
    const photoImg = $('#photoModalImg');
    const photoCap = $('#photoModalCap');
    const photoClose = $('#photoModalClose');
    let photoIndex = 0;
    const showPhoto = (i) => {
      photoIndex = (i + photoBtns.length) % photoBtns.length;
      const btn = photoBtns[photoIndex];
      const thumb = btn.querySelector('img');
      const caption = btn.closest('figure')?.querySelector('figcaption')?.textContent.trim() || '';
      photoImg.classList.add('is-swapping');
      photoImg.onload = () => photoImg.classList.remove('is-swapping');
      photoImg.src = btn.dataset.full;
      if (photoImg.complete) requestAnimationFrame(() => photoImg.classList.remove('is-swapping'));
      photoImg.alt = thumb ? thumb.alt : '';
      photoCap.textContent = `${photoIndex + 1} / ${photoBtns.length} — ${caption}`;
    };
    photoBtns.forEach((btn, i) => btn.addEventListener('click', () => { showPhoto(i); openModal(photoModal, photoClose); }));
    $('#photoPrev').addEventListener('click', () => showPhoto(photoIndex - 1));
    $('#photoNext').addEventListener('click', () => showPhoto(photoIndex + 1));
    photoClose.addEventListener('click', () => closeModal(photoModal));
    photoModal.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') showPhoto(photoIndex - 1);
      if (e.key === 'ArrowRight') showPhoto(photoIndex + 1);
    });
    photoModal.addEventListener('modal:closed', () => photoImg.removeAttribute('src'));
  }

  /* ------------------------------------------------------------ night shift theme (remembered per visitor) */
  const root = document.documentElement;
  const themeMeta = $('meta[name="theme-color"]');
  const themeBtns = $$('[data-theme-toggle]');
  const isNight = () => root.dataset.theme === 'night';
  function syncTheme() {
    themeBtns.forEach((b) => b.setAttribute('aria-pressed', String(isNight())));
    themeMeta?.setAttribute('content', isNight() ? '#15131C' : '#F5F0E7');
  }
  function setTheme(night) {
    if (night === isNight()) return;
    const fade = !reducedMotion.matches;
    if (fade) root.classList.add('theme-switching');
    if (night) root.dataset.theme = 'night'; else delete root.dataset.theme;
    syncTheme();
    try { localStorage.setItem('theme', night ? 'night' : 'day'); } catch { /* private mode: the choice lasts this visit */ }
    window.dispatchEvent(new CustomEvent('themechange', { detail: { night } }));
    if (fade) setTimeout(() => root.classList.remove('theme-switching'), 450);
  }
  syncTheme();
  themeBtns.forEach((b) => b.addEventListener('click', () => setTheme(!isNight())));

  /* ------------------------------------------------------------ copy email (button + ⌘K) */
  const email = 'parnika.sm2005@gmail.com';
  async function copyEmail() {
    try { await navigator.clipboard.writeText(email); }
    catch {
      const t = document.createElement('textarea');
      t.value = email; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.append(t); t.select(); document.execCommand('copy'); t.remove();
    }
  }

  /* ------------------------------------------------------------ command palette (⌘K / Ctrl+K) */
  const cmdk = $('#cmdkOverlay');
  const cmdkInput = $('#cmdkInput');
  const cmdkList = $('#cmdkList');
  const goTo = (id) => () => document.getElementById(id)?.scrollIntoView({ behavior: scrollBehavior() });
  const openUrl = (url) => () => window.open(url, '_blank', 'noopener');
  const commands = [
    { label: 'About', kind: 'section', run: goTo('about') },
    { label: 'Projects', kind: 'section', run: goTo('projects') },
    { label: 'OPPY — flagship project', kind: 'project', run: goTo('case-oppy') },
    { label: 'Experience', kind: 'section', run: goTo('experience') },
    { label: 'Toolkit', kind: 'section', run: goTo('skills') },
    { label: 'Certifications', kind: 'section', run: goTo('certifications') },
    { label: 'Achievements', kind: 'section', run: goTo('achievements') },
    { label: 'Beyond the terminal', kind: 'section', run: goTo('beyond') },
    { label: 'Contact', kind: 'section', run: goTo('contact') },
    { label: 'GitHub', kind: 'link', run: openUrl('https://github.com/parnika0110') },
    { label: 'LinkedIn', kind: 'link', run: openUrl('https://www.linkedin.com/in/parnika-s-m/') },
    { label: 'LeetCode', kind: 'link', run: openUrl('https://leetcode.com/u/parnika_sm/') },
    { label: 'Postcrossing', kind: 'link', run: openUrl('https://www.postcrossing.com/user/PARNIKA') },
    { label: 'Resume (PDF)', kind: 'file', run: openUrl('./Parnika_SM_Resume.pdf') },
  ];
  // typed commands, shown as a console: "open oppy", "theme night", "copy email", "help"…
  const openNotes = (id) => () => document.querySelector(`[data-open-project="${id}"]`)?.click();
  const consoleCmds = [
    { label: 'open oppy', run: goTo('case-oppy') },
    { label: 'open mediassist', run: goTo('case-mediassist') },
    { label: 'open gesture', keys: 'infotainment', run: goTo('case-gesture') },
    { label: 'open metro', keys: 'fare calculator', run: openNotes('metro-fare-calculator') },
    { label: 'open imperial-wheels', keys: 'rental', run: openNotes('imperial-wheels') },
    { label: 'open campusportal', keys: 'campus', run: openNotes('CampusPortal') },
    { label: 'open khana-kreation', keys: 'recipe', run: openNotes('recipe-app') },
    { label: () => `theme ${isNight() ? 'day' : 'night'}`, keys: 'theme night day dark light mode shift', run: () => setTheme(!isNight()) },
    { label: 'resume', keys: 'cv pdf download', run: openUrl('./Parnika_SM_Resume.pdf') },
    { label: 'email', keys: 'mail write contact', run: () => { window.location.href = `mailto:${email}`; } },
    { label: 'copy email', keys: 'clipboard', stay: true, run: () => copyEmail().then(() => showCmdkNote(`Copied ${email} ✓`)) },
    { label: 'top', keys: 'home start hero', run: goTo('top') },
    { label: 'help', keys: '? commands list', stay: true, run: () => { cmdkInput.value = 'help'; active = 0; renderCmdk(); } },
  ].map((c) => ({ ...c, kind: 'command', cmd: true }));
  const help = consoleCmds[consoleCmds.length - 1];
  const labelOf = (c) => (typeof c.label === 'function' ? c.label() : c.label);
  const matches = (c, q) => { const text = `${labelOf(c)} ${c.keys || ''}`.toLowerCase(); return q.split(/\s+/).every((w) => text.includes(w)); };
  let filtered = commands;
  let active = 0;
  let noteTimer = 0;

  function showCmdkNote(text) {
    cmdkList.replaceChildren(Object.assign(document.createElement('li'), { className: 'cmdk__empty', textContent: text }));
    cmdkList.firstChild.setAttribute('role', 'status');
    cmdkInput.setAttribute('aria-activedescendant', '');
    filtered = [];
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => { if (!cmdk.hidden) closeModal(cmdk); }, 1100);
  }

  function renderCmdk() {
    const q = cmdkInput.value.trim().toLowerCase().replace(/^[>/]\s*/, '');
    if (q === 'help' || q === '?') filtered = consoleCmds;
    else if (!q) filtered = [...commands, help];
    else filtered = [...commands, ...consoleCmds].filter((c) => matches(c, q));
    active = Math.min(active, Math.max(filtered.length - 1, 0));
    if (!filtered.length) {
      cmdkList.replaceChildren(Object.assign(document.createElement('li'), { className: 'cmdk__empty', textContent: 'Nothing matches — type “help” for commands.' }));
      cmdkInput.setAttribute('aria-activedescendant', '');
      return;
    }
    cmdkList.replaceChildren(...filtered.map((c, i) => {
      const li = document.createElement('li');
      li.id = `cmdk-opt-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === active));
      li.className = c.cmd ? 'cmdk__item is-cmd' : 'cmdk__item';
      li.innerHTML = '<span></span><span class="k"></span>';
      li.firstChild.textContent = labelOf(c);
      li.lastChild.textContent = c.kind;
      li.addEventListener('mousemove', () => { if (active !== i) { active = i; renderCmdk(); } });
      li.addEventListener('click', () => runCmd(i));
      return li;
    }));
    cmdkInput.setAttribute('aria-activedescendant', `cmdk-opt-${active}`);
    document.getElementById(`cmdk-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }
  function runCmd(i) {
    const c = filtered[i];
    if (!c) return;
    if (!c.stay) closeModal(cmdk);
    c.run();
  }
  function openCmdk() {
    if (!cmdk.hidden) return;
    clearTimeout(noteTimer);
    cmdkInput.value = '';
    active = 0;
    renderCmdk();
    openModal(cmdk, cmdkInput);
  }
  $('#cmdkBtn').addEventListener('click', openCmdk);
  cmdkInput.addEventListener('input', () => { active = 0; renderCmdk(); });
  cmdkInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % Math.max(filtered.length, 1); renderCmdk(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + filtered.length) % Math.max(filtered.length, 1); renderCmdk(); }
    else if (e.key === 'Enter') { e.preventDefault(); runCmd(active); }
  });

  /* ------------------------------------------------------------ global keys */
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (cmdk.hidden) openCmdk(); else closeModal(cmdk);
      return;
    }
    if (e.key === 'Escape') {
      if (openStack.length) closeModal(openStack[openStack.length - 1]);
      else if (!mobileMenu.hidden) { setMenu(false); menuBtn.focus(); }
    }
  });

  /* ------------------------------------------------------------ GitHub public repo count (live, no hard-coded numbers) */
  const ghStats = $('#githubStats');
  if (ghStats) {
    fetch('https://api.github.com/users/parnika0110')
      .then((r) => { if (!r.ok) throw new Error('GitHub request failed'); return r.json(); })
      .then((d) => {
        ghStats.textContent = typeof d.public_repos === 'number'
          ? `${d.public_repos} public repositories · projects and experiments`
          : 'Explore my GitHub repositories and projects.';
      })
      .catch(() => { ghStats.textContent = 'Explore my GitHub repositories and projects.'; });
  }

  /* ------------------------------------------------------------ build log: latest public commit (live, cached 30 min)
     The most recently pushed non-fork repository, and its latest commit on the default branch (auto-generated
     "Merge …" messages skipped). Without JavaScript, or if GitHub can't be reached, the static link stays. */
  const buildLog = $('#buildLog');
  if (buildLog) {
    const GH = 'https://api.github.com';
    const CACHE = 'build-log-v1';
    const get = (url) => fetch(url, { headers: { Accept: 'application/vnd.github+json' } }).then((r) => { if (!r.ok) throw new Error(`GitHub ${r.status}`); return r.json(); });
    const load = async () => {
      try { const c = JSON.parse(localStorage.getItem(CACHE) || 'null'); if (c && Date.now() - c.at < 30 * 60 * 1000) return c.data; } catch { /* no cache */ }
      const repos = await get(`${GH}/users/parnika0110/repos?sort=pushed&per_page=10&type=owner`);
      const repo = Array.isArray(repos) && repos.find((r) => !r.fork && !r.archived && !r.private);
      if (!repo) throw new Error('no repository');
      const commits = await get(`${GH}/repos/${repo.full_name}/commits?per_page=10`);
      const c = (Array.isArray(commits) && (commits.find((x) => !/^Merge (pull request|branch|remote-tracking branch)\b/.test(x.commit?.message || '')) || commits[0])) || null;
      if (!c) throw new Error('no commit');
      const data = {
        repo: repo.name,
        msg: String(c.commit.message || '').split('\n')[0].trim(),
        url: /^https:\/\/github\.com\//.test(c.html_url) ? c.html_url : repo.html_url,
        date: c.commit.committer?.date || c.commit.author?.date,
      };
      try { localStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), data })); } catch { /* fine */ }
      return data;
    };
    const ago = (iso) => {
      const s = Math.min(0, (new Date(iso) - Date.now()) / 1000);
      const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
      for (const [unit, sec] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]) {
        if (-s >= sec) return rtf.format(Math.round(s / sec), unit);
      }
      return 'just now';
    };
    load().then((d) => {
      if (!d || !d.msg || Number.isNaN(new Date(d.date).getTime())) return;
      const k = $('.build-log__k', buildLog);
      const a = $('.build-log__link', buildLog);
      const time = document.createElement('time');
      time.dateTime = d.date; time.textContent = ago(d.date); time.title = new Date(d.date).toLocaleString();
      const sep = document.createElement('span'); sep.setAttribute('aria-hidden', 'true'); sep.textContent = '·';
      k.textContent = 'Last shipped';
      a.href = d.url; a.textContent = `${d.repo} — “${d.msg}”`; a.title = `${d.repo}: ${d.msg}`;
      k.after(' ', time, ' ', sep, ' ');
      buildLog.classList.add('is-live');
    }).catch(() => { /* keep the static link to GitHub */ });
  }

  /* ------------------------------------------------------------ visitor counter (footer, api/visitors.js)
     The first page view of a browser session counts the visit (POST); later views in the same session only
     read the total (GET). The counter stays hidden unless a real count comes back. */
  const visits = $('#visitCount');
  if (visits) {
    const SEEN = 'visit-counted';
    let counted = false;
    try { counted = sessionStorage.getItem(SEEN) === '1'; } catch { /* storage blocked: the server throttles repeats */ }
    const load = () => fetch('/api/visitors', counted
      ? { headers: { Accept: 'application/json' } }
      : { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: '{}' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`visitors ${r.status}`))))
      .then((d) => {
        if (!d || !Number.isSafeInteger(d.count) || d.count < 1) return;   // never show a made-up or empty number
        if (!counted) { try { sessionStorage.setItem(SEEN, '1'); } catch { /* fine */ } }
        $('.visits__n', visits).textContent = d.count.toLocaleString('en-US');
        $('.visits__l', visits).textContent = d.count === 1 ? 'visitor' : 'visitors';
        visits.hidden = false;
      })
      .catch(() => { /* counter unavailable: keep it hidden, the page carries on */ });
    if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 2500 }); else setTimeout(load, 1200);
  }

  /* ------------------------------------------------------------ copy email */
  const copyBtn = $('#copyEmail');
  copyBtn?.addEventListener('click', async () => {
    await copyEmail();
    copyBtn.textContent = 'Copied ✓';
    setTimeout(() => { copyBtn.textContent = 'Copy email'; }, 2000);
  });
})();
