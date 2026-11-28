window.VT_CONFIG = {
  whatsappNumber: '910000000000',
  formEndpoint: 'https://script.google.com/macros/s/AKfycbzIDiunCgS9rWcjUh-rLnIuqxZ8FfwI4XDDPaNq_VXRqfo9JTAM4QczmuMMLdx9KGCM/exec',
  replyPromise: 'Our team is preparing your quote and will get back to you shortly.'
};

(function () {
  'use strict';
  var CFG = window.VT_CONFIG, root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var store = function (area, key, val) {
    try {
      var s = window[area];
      if (val === undefined) return s.getItem(key);
      if (val === null) s.removeItem(key); else s.setItem(key, val);
    } catch (e) { return null; }
  };
  var track = function (name, params) { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); };
  var icon = function (id, cls) { return '<svg class="' + (cls || 'i') + '" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  document.addEventListener('touchstart', function () {}, { passive: true }); /* lets iOS show pressed states */

  /* ---------- Links and analytics ---------- */
  $$('a[href*="wa.me/910000000000"]').forEach(function (a) { a.href = a.href.replace('910000000000', CFG.whatsappNumber); });
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-track]');
    if (t) track(t.getAttribute('data-track'));
  });
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Where the visitor came from (first page of the visit; no cookies) ---------- */
  if (!store('sessionStorage', 'vt-source') || /[?&](utm_source|gclid|fbclid)=/.test(location.search)) { /* a campaign link beats an earlier plain visit */
    var q = new URLSearchParams(location.search), refHost = '';
    try { refHost = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''; } catch (e) { refHost = ''; }
    if (refHost === location.hostname.replace(/^www\./, '')) refHost = '';
    store('sessionStorage', 'vt-source', JSON.stringify({
      source: q.get('utm_source') || (q.has('gclid') ? 'google' : q.has('fbclid') && !refHost ? 'facebook' : ''), medium: q.get('utm_medium') || (q.has('gclid') ? 'ads' : ''),
      campaign: q.get('utm_campaign') || '', referrer: refHost, landing: location.pathname
    }));
  }

  /* ---------- Announcement ---------- */
  $('.announce-close').addEventListener('click', function () {
    root.classList.add('announce-dismissed');
    store('localStorage', 'vt-announce-dismissed', 'sabarimala-2026');
  });

  /* ---------- Intro ---------- */
  function playIntro() {
    if (!root.classList.contains('intro-pending')) return;
    var lock = $('.lockup').getBoundingClientRect(), logo = $('.lockup-logo'), l = logo.getBoundingClientRect(), bus = $('.lockup-bus');
    logo.style.setProperty('--lx', (lock.left + lock.width / 2 - l.left - l.width / 2) + 'px');
    logo.style.setProperty('--ly', (lock.top + lock.height / 2 - l.top - l.height / 2) + 'px');
    bus.style.setProperty('--run', -($('.lockup-name').offsetWidth + 10) + 'px');
    root.classList.add('intro-play');
    root.classList.remove('intro-pending');
    store('sessionStorage', 'vt-intro-played', '1');
    setTimeout(function () { root.classList.remove('intro-play'); }, 3200);
  }
  if (root.classList.contains('intro-pending')) {
    var fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([fonts, new Promise(function (r) { setTimeout(r, 700); })]).then(function () { requestAnimationFrame(playIntro); });
  }

  /* ---------- Header ---------- */
  var header = $('#header'), lockup = $('.lockup'), lastY = window.scrollY, ticking = false;
  var links = $$('.nav a'), spyTargets = [['services'], ['why-us'], ['enquire'], ['faq'], ['about'], ['contact']].map(function (a) { return document.getElementById(a[0]); });
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    header.classList.toggle('compact', lockup.getBoundingClientRect().top < header.offsetHeight);
    if (innerWidth < 960) {
      if (y > 320 && y > lastY + 4) header.classList.add('away');
      else if (y < lastY - 4 || y <= 320) header.classList.remove('away');
    } else header.classList.remove('away');
    if (Math.abs(y - lastY) > 4) lastY = y;
    var mid = innerHeight / 2, cur = '';
    spyTargets.forEach(function (s) { if (s.getBoundingClientRect().top <= mid) cur = s.id; });
    if (innerHeight + y >= document.documentElement.scrollHeight - 4) cur = 'contact';
    links.forEach(function (a) {
      if (a.getAttribute('href') === '#' + cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Mobile menu ---------- */
  var menu = $('#menu'), burger = $('#burger'), outside = $$('body > *').filter(function (n) { return n !== menu && n.tagName !== 'SCRIPT'; });
  function openMenu() {
    menu.hidden = false; burger.setAttribute('aria-expanded', 'true'); root.classList.add('no-scroll');
    outside.forEach(function (n) { n.inert = true; });
    $('#menu-close').focus(); syncBar();
  }
  function closeMenu(focus) {
    if (menu.hidden) return;
    menu.hidden = true; burger.setAttribute('aria-expanded', 'false'); root.classList.remove('no-scroll');
    outside.forEach(function (n) { n.inert = false; });
    if (focus !== false) burger.focus({ preventScroll: true });
    syncBar();
  }
  burger.addEventListener('click', openMenu);
  $('#menu-close').addEventListener('click', closeMenu);
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(false); });
  menu.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') return closeMenu();
    if (e.key !== 'Tab') return;
    var f = $$('a,button', menu), first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  matchMedia('(min-width: 960px)').addEventListener('change', function (m) { if (m.matches) closeMenu(false); });

  /* ---------- Reveal ---------- */
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('[data-reveal]').forEach(function (n) { io.observe(n); });
  } else $$('[data-reveal]').forEach(function (n) { n.classList.add('in'); });

  /* ---------- Services ---------- */
  var cards = $$('.svc');
  function setCard(c, open) {
    c.classList.toggle('open', open);
    $('.svc-row', c).setAttribute('aria-expanded', open);
    $('.chip-l', c).textContent = open ? 'Less' : 'More';
  }
  cards.forEach(function (c) {
    $('.svc-row', c).addEventListener('click', function () {
      var open = !c.classList.contains('open');
      cards.forEach(function (o) { setCard(o, o === c && open); });
      if (open && innerWidth < 640) setTimeout(function () { if (c.classList.contains("open")) $(".svc-body", c).scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "nearest" }); }, 480);
    });
  });

  /* ---------- Map ---------- */
  $('#show-map').addEventListener('click', function () {
    var f = document.createElement('iframe');
    f.src = 'https://www.google.com/maps?q=Ernakulam%2C%20Kerala&output=embed';
    f.title = 'Map of Ernakulam, Kerala'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
    $('#map').replaceChildren(f);
  });

  /* ---------- Mobile action bar ---------- */
  var bar = $('#actionbar'), cardVisible = false, typing = false;
  function syncBar() { bar.classList.toggle('off', cardVisible || typing || !menu.hidden); }
  var isTyping = function (n) { return !!n && n.matches && n.matches('textarea,select,input:not([type=radio]):not([type=checkbox])'); };
  document.addEventListener('focusin', function (e) { typing = isTyping(e.target); syncBar(); });
  document.addEventListener('focusout', function () { typing = false; syncBar(); });
  if ('IntersectionObserver' in window) {
    /* A tall card may never be 12% visible on a short screen, so also count covering 12% of the screen. */
    new IntersectionObserver(function (es) {
      var e = es[es.length - 1];
      cardVisible = e.isIntersecting && (e.intersectionRatio >= .12 || e.intersectionRect.height >= innerHeight * .4);
      syncBar();
    }, { threshold: [0, .05, .12, .2, .3] }).observe($('#plan'));
  }

  /* =====================================================
     Enquiry form
     ===================================================== */
  var form = $('#form'), live = $('#live'), card = $('#plan'), done = $('#done'), progress = $('#progress');
  var DRAFT = 'vt-enquiry-draft', step = 1, sending = false, finished = false, saveT, touched = {};
  var LABELS = { tour: 'Tour package', pilgrimage: 'Sabarimala / Pilgrimage', transfer: 'Airport / Railway transfer', event: 'Wedding / Event', vehicle: 'Vehicle hire', corporate: 'Corporate / B2B contract', other: 'Something else' };
  var STEP_LABELS = ['Trip type', 'Trip details', 'Contact details'];
  var say = function (t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 50); };

  $$('[data-pills]').forEach(function (box) {
    var p = box.getAttribute('data-pills').split(':'), def = box.getAttribute('data-default');
    box.innerHTML = box.textContent.trim().split('|').map(function (o) {
      var b = o.split('~');
      return '<label class="pill"><input type="' + p[0] + '" name="' + p[1] + '" value="' + esc(b[0]) + '"' + (b[0] === def ? ' checked' : '') + '>' + icon('check') + '<span>' + esc(b[0]) + (b[1] ? '<small>' + b[1] + '</small>' : '') + '</span></label>';
    }).join('');
  });

  var els = form.elements;
  var val = function (n) { var f = els[n]; return f ? String(f.value || '').trim() : ''; };
  var multi = function (n) { return $$('input[name="' + n + '"]:checked', form).map(function (i) { return i.value; }); };
  var trip = function () { return val('trip'); };
  function isoToday() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  /* ---- Trip type drives which fields show ---- */
  function applyTrip() {
    var t = trip();
    $$('[data-for]', form).forEach(function (n) {
      var on = !!t && n.getAttribute('data-for').split(' ').indexOf(t) > -1;
      n.hidden = !on;
      $$('input,textarea,select', n).forEach(function (i) { i.disabled = !on; });
    });
    /* nested: a steppers row can be on while its Bags field is off */
    $$('[data-for] [data-for]', form).forEach(function (n) {
      var on = !!t && n.getAttribute('data-for').split(' ').indexOf(t) > -1;
      n.hidden = !on; $$('input', n).forEach(function (i) { i.disabled = !on; });
    });
    $('#l-start').textContent = { transfer: 'Travel date', event: 'Event date', corporate: 'Contract start date' }[t] || 'Start date';
    $('#picked').textContent = LABELS[t] || '';
    applyDates();
  }
  function applyDates() {
    var open = els.datesOpen.checked && !els.datesOpen.disabled, t = trip();
    $('#date-row').hidden = open;
    els.startDate.disabled = open || !t;
    els.endDate.disabled = open || !t || $('[data-field="endDate"]').hidden;
    els.startDate.min = isoToday();
    els.endDate.min = els.startDate.value || isoToday();
    if (open) { setError('startDate', ''); setError('endDate', ''); }
  }
  function applyContact() {
    var mail = val('contact') === 'Email';
    $('#email-opt').hidden = mail; $('#email-req').hidden = !mail;
    els.email.required = mail;
    if (!mail && !val('email')) setError('email', '');
  }

  /* ---- Validation ---- */
  var digits = function (s) { return s.replace(/\D/g, ''); };
  function phoneDigits() {
    var d = digits(val('phone'));
    if (val('code') === '+91') { if (d.length === 12 && d.slice(0, 2) === '91') d = d.slice(2); else if (d.length === 11 && d[0] === '0') d = d.slice(1); }
    return d;
  }
  var check = {
    trip: function () { return trip() ? '' : 'Please choose what you are planning.'; },
    startDate: function () { return !els.startDate.disabled && els.startDate.value && els.startDate.value < isoToday() ? 'Please choose today or a later date.' : ''; },
    endDate: function () {
      if (els.endDate.disabled || !els.endDate.value) return '';
      if (els.startDate.value && els.endDate.value < els.startDate.value) return "The end date can't be before the start date.";
      return els.endDate.value < isoToday() ? 'Please choose today or a later date.' : '';
    },
    name: function () { var v = val('name'); return !v ? 'Please enter your name.' : v.length < 2 ? 'Please enter your full name.' : ''; },
    phone: function () {
      if (!val('phone')) return 'Please enter your mobile number.';
      var d = phoneDigits();
      if (val('code') === '+91') return /^[6-9]\d{9}$/.test(d) ? '' : 'Please enter a valid 10-digit mobile number.';
      return d.length >= 6 && d.length <= 15 ? '' : 'Please enter a valid phone number.';
    },
    email: function () {
      var v = val('email');
      if (!v) return val('contact') === 'Email' ? 'Please add your email so we can reply there.' : '';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Please enter a valid email, like name@example.com.';
    }
  };
  var STEP_FIELDS = { 1: ['trip'], 2: ['startDate', 'endDate'], 3: ['name', 'phone', 'email'] };
  function fieldInput(n) { return n === 'trip' ? (form.querySelector('input[name=trip]')) : els[n]; }
  function setError(n, msg, shake) {
    var box = form.querySelector('[data-field="' + n + '"]'), err = $('#err-' + n), was = box.classList.contains('bad');
    box.classList.toggle('bad', !!msg);
    err.hidden = !msg;
    if (msg) err.innerHTML = icon('alert') + '<span>' + esc(msg) + '</span>';
    var inputs = n === 'trip' ? $$('input[name=trip]', form) : [els[n]];
    inputs.forEach(function (i) { if (msg) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); });
    if (msg && (shake || !was)) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); }
  }
  function markValid(n) { var b = form.querySelector('[data-field="' + n + '"]'); if (n === 'name' || n === 'phone' || n === 'email') b.classList.toggle('valid', !!val(n) && !check[n]()); }
  function validate(n, shake) { var m = check[n](); setError(n, m, shake); markValid(n); return m; }
  function validateStep(s) {
    var bad = STEP_FIELDS[s].filter(function (n) { touched[n] = true; return validate(n, true); });
    var box = $('#summary');
    if (bad.length > 1) {
      box.innerHTML = '<strong>Please check ' + bad.length + ' details:</strong><ul>' + bad.map(function (n) { return '<li><a href="#' + fieldInput(n).id + '" data-jump="' + n + '">' + esc(check[n]()) + '</a></li>'; }).join('') + '</ul>';
      box.hidden = false;
    } else box.hidden = true;
    if (bad.length) { var f = fieldInput(bad[0]); f.focus({ preventScroll: true }); (f.closest('.field') || f).scrollIntoView({ behavior: 'instant', block: 'center' }); track('form_error', { step: s, fields: bad.join(',') }); }
    return !bad.length;
  }
  $('#summary').addEventListener('click', function (e) { var a = e.target.closest('[data-jump]'); if (a) { e.preventDefault(); fieldInput(a.getAttribute('data-jump')).focus(); } });

  /* ---- Progress ---- */
  function required3() { var r = ['name', 'phone']; if (val('contact') === 'Email') r.push('email'); return r; }
  function update() {
    var req = required3(), ok = req.filter(function (n) { return !!val(n) && !check[n](); }).length, left = req.length - ok;
    /* an optional but invalid email still blocks sending */
    var emailBad = !!check.email() && req.indexOf('email') < 0;
    var pct = step === 1 ? (trip() ? 30 : 6) : step === 2 ? 45 : Math.round(66 + 34 * ok / req.length);
    $('.bar span').style.width = pct + '%';
    $('.bar').setAttribute('aria-valuenow', pct);
    var sub = $('#submit'), ready = left === 0 && !emailBad, label = left ? left + ' more detail' + (left > 1 ? 's' : '') + ' to go' : 'Get my free quote';
    sub.style.setProperty('--fill', (100 * ok / req.length) + '%');
    $$('.submit-l', sub).forEach(function (l) { l.textContent = label; });
    sub.classList.toggle('ready', ready);
    if (!$('#summary').hidden && STEP_FIELDS[step].every(function (n) { return !check[n](); })) $('#summary').hidden = true;
  }

  /* ---- Steps ---- */
  function goToCard(smooth) {
    var target = function () { return card.getBoundingClientRect().top - header.offsetHeight - 12; };
    card.classList.add('in');
    card.scrollIntoView({ behavior: smooth && !reduced ? 'smooth' : 'instant', block: 'start' });
    if (!smooth) return;
    /* A closing keyboard or a stray touch can cancel smooth scrolling, so make sure we arrive. */
    var last = null, tries = 0, moved = false, stop = function () { moved = true; };
    addEventListener('touchmove', stop, { once: true, passive: true });
    addEventListener('wheel', stop, { once: true, passive: true });
    (function settle() {
      setTimeout(function () {
        var y = window.scrollY;
        if (moved || ++tries > 12) return;
        if (y !== last) { last = y; return settle(); }
        if (Math.abs(target()) > 40) card.scrollIntoView({ behavior: 'instant', block: 'start' });
      }, 180);
    })();
  }
  function pulseCard() { card.classList.remove('pulse'); void card.offsetWidth; card.classList.add('pulse'); }
  function showStep(n, opts) {
    opts = opts || {};
    step = n;
    $$('.step', form).forEach(function (s) { s.hidden = +s.getAttribute('data-step') !== n; });
    $('#step-n').textContent = 'Step ' + n + ' of 3';
    $('#step-l').textContent = STEP_LABELS[n - 1];
    $('#back').hidden = n === 1; $('#next').hidden = n === 3; $('#submit').hidden = n !== 3;
    $('#summary').hidden = true; $('#fail').hidden = true;
    update();
    if (!opts.quiet) {
      var top = card.getBoundingClientRect().top;
      if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
      if (opts.scroll) goToCard(true);
      else if (top < header.offsetHeight || top > innerHeight * .6) goToCard(false);
      $('.step[data-step="' + n + '"] legend').focus({ preventScroll: true });
      say('Step ' + n + ' of 3: ' + STEP_LABELS[n - 1]);
      track('form_step', { step: n, trip: trip() });
      save();
    }
  }
  function next() { if (validateStep(step) && step < 3) showStep(step + 1); }
  $('#next').addEventListener('click', next);
  $('#back').addEventListener('click', function () { showStep(step - 1); });
  $('#change').addEventListener('click', function () { showStep(1); });

  var moreBtn = $('#more-toggle');
  function setMore(open) {
    form.classList.toggle('show-more', open);
    moreBtn.setAttribute('aria-expanded', open);
    $('span', moreBtn).textContent = open ? 'Show fewer details' : 'Add more details';
  }
  moreBtn.addEventListener('click', function () { setMore(!form.classList.contains('show-more')); });

  var tapped = false, advT;
  $('.tiles').addEventListener('pointerdown', function () { tapped = true; });
  $('.tiles').addEventListener('keydown', function () { tapped = false; });
  $('.tiles').addEventListener('click', function (e) {
    if (e.target.name !== 'trip' || !tapped) return;
    tapped = false;
    clearTimeout(advT);
    advT = setTimeout(function () { if (step === 1 && trip()) showStep(2); }, 320);
  });

  /* ---- Steppers ---- */
  function setStepper(box, v) {
    var min = +box.getAttribute('data-min'), max = +box.getAttribute('data-max'), b = $$('button', box), o = $('output', box), i = $('input', box);
    v = Math.max(min, Math.min(max, isNaN(v) ? min : v));
    i.value = v; o.textContent = v; b[0].disabled = v <= min; b[1].disabled = v >= max;
  }
  $$('.stepper').forEach(function (box) {
    var b = $$('button', box), o = $('output', box), i = $('input', box);
    i.setAttribute('data-default', i.value);
    setStepper(box, +i.value);
    b.forEach(function (btn, k) {
      btn.addEventListener('click', function () {
        setStepper(box, +i.value + (k ? 1 : -1));
        o.classList.remove('bump'); void o.offsetWidth; o.classList.add('bump');
        queueSave();
      });
    });
  });

  /* ---- Field events ---- */
  form.addEventListener('input', function (e) {
    var n = e.target.name;
    if (touched[n] && check[n]) validate(n);
    else if (check[n] && n !== 'trip') markValid(n);
    if (n === 'code' && touched.phone) validate('phone'); else if (n === 'code') markValid('phone');
    if (n === 'startDate') { els.endDate.min = els.startDate.value || isoToday(); if (touched.endDate) validate('endDate'); }
    update(); queueSave();
  });
  form.addEventListener('change', function (e) {
    var n = e.target.name;
    if (n === 'trip') { setError('trip', ''); applyTrip(); }
    if (n === 'datesOpen') applyDates();
    if (n === 'contact') {
      if (val('contact') === 'WhatsApp') els.onWhatsApp.checked = true;
      applyContact(); markValid('email');
    }
    if (n === 'onWhatsApp' && !els.onWhatsApp.checked && val('contact') === 'WhatsApp') {
      $('input[name=contact][value=Call]', form).checked = true;
      applyContact(); say('Preferred way to reach you changed to Call.');
    }
    if (n === 'code') $('#phone').placeholder = val('code') === '+91' ? '10-digit mobile number' : 'Mobile number';
    update(); queueSave();
  });
  /* Wait before validating on blur: an error message appearing mid-tap would move the button out from under the finger. */
  var pointerDown = false;
  addEventListener('pointerdown', function () { pointerDown = true; }, true);
  ['pointerup', 'pointercancel'].forEach(function (t) { addEventListener(t, function () { pointerDown = false; }, true); });
  function afterBlur(n) {
    if (pointerDown) return setTimeout(afterBlur, 120, n);
    if (STEP_FIELDS[step].indexOf(n) < 0 || finished || document.activeElement === els[n]) return;
    if (n === 'phone' && val('code') === '+91') { var d = phoneDigits(); if (/^\d{10}$/.test(d)) els.phone.value = d.slice(0, 5) + ' ' + d.slice(5); }
    if (val(n)) touched[n] = true;
    if (touched[n]) validate(n);
    update();
  }
  form.addEventListener('focusout', function (e) {
    var n = e.target.name;
    if (check[n] && n !== 'trip') setTimeout(afterBlur, 260, n);
  });

  /* ---- Draft ---- */
  function snapshot() {
    var d = {};
    Array.prototype.forEach.call(form.querySelectorAll('input,select,textarea'), function (i) {
      if (!i.name || i.name === 'website') return;
      if (i.type === 'radio') { if (i.checked) d[i.name] = i.value; }
      else if (i.type === 'checkbox') {
        if (i.name === 'places' || i.name === 'temples' || i.name === 'best') { d[i.name] = d[i.name] || []; if (i.checked) d[i.name].push(i.value); }
        else d[i.name] = i.checked;
      } else d[i.name] = i.value;
    });
    return d;
  }
  function save() {
    clearTimeout(saveT);
    if (finished) return;
    var d = snapshot();
    if (!d.trip && !d.name && !d.phone) return;
    store('localStorage', DRAFT, JSON.stringify({ at: Date.now(), step: step, data: d }));
  }
  function queueSave() { clearTimeout(saveT); saveT = setTimeout(save, 400); }
  function clearDraft() { clearTimeout(saveT); store('localStorage', DRAFT, null); }
  function restore() {
    var raw = store('localStorage', DRAFT), d;
    if (!raw) return false;
    try { d = JSON.parse(raw); } catch (e) { clearDraft(); return false; }
    if (!d || !d.data || Date.now() - d.at > 14 * 864e5) { clearDraft(); return false; }
    Array.prototype.forEach.call(form.querySelectorAll('input,select,textarea'), function (i) {
      var v = d.data[i.name];
      if (!i.name || v === undefined) return;
      if (i.type === 'radio') i.checked = i.value === v;
      else if (i.type === 'checkbox') i.checked = Array.isArray(v) ? v.indexOf(i.value) > -1 : !!v;
      else i.value = v;
    });
    $$('.stepper').forEach(function (b) { setStepper(b, +$('input', b).value); });
    setMore(['otherPlaces', 'flight', 'shifts', 'notes', 'virtualQ'].some(function (k) { return !!val(k); }) || (val('vehicle') && val('vehicle') !== 'Not sure') || els.gst.checked);
    applyTrip(); applyContact();
    ['name', 'phone', 'email'].forEach(markValid);
    showStep(trip() ? Math.min(3, Math.max(1, d.step || 1)) : 1, { quiet: true });
    $('#welcome').hidden = false;
    return true;
  }
  function resetAll() {
    clearDraft(); finished = false; touched = {};
    form.reset();
    $$('.stepper').forEach(function (b) { setStepper(b, +$('input', b).getAttribute('data-default')); });
    ['trip', 'startDate', 'endDate', 'name', 'phone', 'email'].forEach(function (n) { setError(n, ''); });
    $$('.valid', form).forEach(function (n) { n.classList.remove('valid'); });
    $('#phone').placeholder = '10-digit mobile number';
    setMore(false);
    $('#welcome').hidden = true; done.hidden = true; done.innerHTML = ''; form.hidden = false; progress.hidden = false;
    applyTrip(); applyContact();
  }
  $('#start-over').addEventListener('click', function () { resetAll(); showStep(1); });

  /* ---- Preselect from links ---- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#plan"],[data-trip]');
    if (!a) return;
    e.preventDefault();
    if (!a.hasAttribute('data-trip')) {
      goToCard(true); pulseCard();
      var h = finished ? $('h3', done) : $('.step[data-step="' + step + '"] legend');
      if (h) h.focus({ preventScroll: true });
      return;
    }
    if (finished) resetAll();
    var r = form.querySelector('input[name=trip][value="' + a.getAttribute('data-trip') + '"]');
    r.checked = true; setError('trip', ''); applyTrip();
    card.classList.add('in');
    showStep(2, { scroll: true });
    pulseCard();
  });

  /* ---- Summary ---- */
  function fmt(iso) { if (!iso) return ''; var p = iso.split('-'); return new Date(+p[0], p[1] - 1, +p[2]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function fmtTime(t) { if (!t) return ''; var p = t.split(':'), h = +p[0]; return (h % 12 || 12) + ':' + p[1] + (h < 12 ? ' AM' : ' PM'); }
  function on(n) { var f = els[n]; if (!f) return false; if (f.length && !f.tagName) f = f[0]; return !f.disabled; }
  function get(n) { return on(n) ? val(n) : ''; }
  function rows() {
    var t = trip(), places = [].concat(t === 'tour' ? multi('places') : [], t === 'pilgrimage' ? multi('temples') : []), out = [];
    if (get('otherPlaces')) places.push(get('otherPlaces'));
    var open = on('datesOpen') && els.datesOpen.checked;
    var dates = open ? 'Not fixed yet' : [fmt(get('startDate')), fmt(get('endDate'))].filter(Boolean).join(' – ');
    var ad = +get('adults'), ch = +get('children'), v = get('vehicle');
    var add = function (k, x) { if (x) out.push([k, x]); };
    add('Trip', LABELS[t] + (places.length ? ' – ' + places.join(', ') : ''));
    add('Service', get('service') || get('need'));
    add('Company', get('company'));
    add(t === 'corporate' ? 'Start' : 'Dates', dates);
    add('Time', fmtTime(get('time')));
    add('Travellers', ad ? ad + (ad === 1 ? ' adult' : ' adults') + (ch ? ', ' + ch + (ch === 1 ? ' child' : ' children') : '') : '');
    add('Bags', get('bags'));
    add('Guests / vehicles', get('guests'));
    add('People / vehicles', get('people'));
    add('Shifts / routes', get('shifts'));
    add('Pickup', get('pickup'));
    add('Drop', get('drop'));
    add('Venue', get('venue'));
    add('Flight / train', get('flight').toUpperCase());
    add('Vehicle', v === 'Not sure' ? '' : v);
    add('Virtual-Q booked', get('virtualQ'));
    add('GST invoice', on('gst') && els.gst.checked ? 'Needed' : '');
    add('Notes', get('notes'));
    add('Name', val('name'));
    add('Phone', val('code') + ' ' + (val('code') === '+91' ? phoneDigits().replace(/^(\d{5})(\d{5})$/, '$1 $2') : digits(val('phone'))) + (els.onWhatsApp.checked ? ' (WhatsApp)' : ''));
    add('Email', val('email'));
    add('Contact via', [val('contact'), multi('best').join(', ')].filter(Boolean).join(' · '));
    return out;
  }
  function makeRef() {
    var d = isoToday().replace(/-/g, '').slice(2);
    return 'VT-' + d + '-' + (1000 + Math.floor(Math.random() * 9000));
  }
  function waLink(ref, list) {
    var text = 'Hi Velocity Travels! (Ref ' + ref + ')\n\n' + list.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n');
    return 'https://wa.me/' + CFG.whatsappNumber + '?text=' + encodeURIComponent(text);
  }

  /* ---- Submit ---- */
  var ref = '', reqId = '', loadedAt = Date.now();
  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var a = new Uint8Array(16); crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function payload() {
    var src = {};
    try { src = JSON.parse(store('sessionStorage', 'vt-source')) || {}; } catch (e) { /* none saved */ }
    var t = trip();
    return {
      v: 1, requestId: reqId, reference: ref, elapsed: Date.now() - loadedAt, website: val('website'), trip: t,
      service: get('service'), need: get('need'), company: get('company'), pickup: get('pickup'),
      places: t === 'tour' ? multi('places') : t === 'pilgrimage' ? multi('temples') : [], otherPlaces: get('otherPlaces'),
      drop: get('drop'), venue: get('venue'), flight: get('flight'), startDate: get('startDate'), endDate: get('endDate'),
      datesOpen: on('datesOpen') && els.datesOpen.checked, time: get('time'), adults: get('adults'), children: get('children'), bags: get('bags'),
      guests: get('guests'), people: get('people'), shifts: get('shifts'), vehicle: get('vehicle') === 'Not sure' ? '' : get('vehicle'),
      virtualQ: get('virtualQ'), gst: on('gst') && els.gst.checked, notes: get('notes'),
      name: val('name'), code: val('code'), phone: phoneDigits(), onWhatsApp: els.onWhatsApp.checked, email: val('email'),
      contact: val('contact'), best: multi('best'), source: src
    };
  }
  /* Plain text keeps this a "simple" cross-site request, which Google Apps Script needs. */
  function call(url, opts, ms) {
    var ctrl = new AbortController(), to = setTimeout(function () { ctrl.abort(); }, ms);
    opts.signal = ctrl.signal; opts.credentials = 'omit'; opts.redirect = 'follow';
    return fetch(url, opts).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { clearTimeout(to); return j; }, function (e) { clearTimeout(to); throw e; });
  }
  function send() {
    var body = payload();
    return call(CFG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }, 30000)
      .then(function (j) {
        if (j && j.ok) return j;
        var e = new Error((j && j.error) || 'rejected'); e.answered = true; throw e;
      })
      .catch(function (e) {
        if (e.answered) throw e;
        /* The connection dropped: ask once whether the request was saved before saying it failed. */
        return call(CFG.formEndpoint + (CFG.formEndpoint.indexOf('?') < 0 ? '?' : '&') + 'check=' + encodeURIComponent(body.requestId), { method: 'GET' }, 12000)
          .then(function (j) { if (j && j.saved) return { ok: true, reference: ref }; throw e; }, function () { throw e; });
      });
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (step < 3) return next();
    if (sending || !validateStep(3)) return;
    /* step 2 dates can go stale in a restored draft */
    if (check.trip()) { showStep(1); validateStep(1); return; }
    if (check.startDate() || check.endDate()) { showStep(2); validateStep(2); return; }
    ref = ref || makeRef();
    reqId = reqId || newId();
    var list = rows(), link = waLink(ref, list);
    $('#fail').hidden = true;
    if (val('website')) return finish(list);
    if (!CFG.formEndpoint) { /* not connected yet: show the finished screen, clearly marked as a preview */
      setSending(true);
      setTimeout(function () { setSending(false); finish(list, true); }, 900);
      return;
    }
    setSending(true);
    /* the server treats sub-3-second submissions as bots, so a very quick human just waits a moment */
    new Promise(function (r) { setTimeout(r, Math.max(0, 3000 - (Date.now() - loadedAt))); }).then(send)
      .then(function (j) {
        if (/^VT-\d{6}-\d{4}$/.test(j.reference)) ref = j.reference;
        track('form_submit', { mode: 'sent', trip: trip() });
        finish(list);
      })
      .catch(function (err) {
        save();
        $('#fail-wa').href = link;
        $('#fail-mail').href = $('.foot-contact a[href^="mailto:"]').getAttribute('href') + '?subject=' + encodeURIComponent('Trip request ' + ref) + '&body=' + encodeURIComponent(list.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n'));
        $('#fail').hidden = false;
        track('form_error', { step: 3, fields: 'send_' + (err && err.answered ? err.message : 'network') });
      })
      .then(function () { setSending(false); });
  });
  function setSending(on) { sending = on; var b = $('#submit'); b.classList.toggle('sending', on); b.setAttribute('aria-busy', on); if (on) say('Sending your request'); }
  function finish(list, preview) {
    var r = ref, t = trip(), by = val('contact'), first = val('name').split(/\s+/)[0], phone = '', mail = val('email');
    list.forEach(function (x) { if (x[0] === 'Phone') phone = x[1].replace(' (WhatsApp)', ''); });
    var reach = by === 'Email' ? 'by email at <strong>' + esc(mail) + '</strong>' : by === 'Call' ? 'by phone on <strong class="nb">' + esc(phone) + '</strong>' : 'on WhatsApp at <strong class="nb">' + esc(phone) + '</strong>';

    /* ticket */
    var from = get('pickup'), places = t === 'tour' ? multi('places') : t === 'pilgrimage' ? multi('temples') : [];
    places = places.filter(function (p) { return p !== 'Help me choose'; });
    var to = get('drop') || get('venue') || (places.length > 2 ? places.slice(0, 2).join(', ') + ' +' + (places.length - 2) : places.join(', '));
    var iconId = { tour: 'mountain', pilgrimage: 'lamp', transfer: 'plane', event: 'heart', vehicle: 'car', corporate: 'briefcase' }[t] || 'dots';
    var route = from && to ? '<div class="tk-route"><div><small>From</small><b>' + esc(from) + '</b></div><svg class="tk-bus" aria-hidden="true"><use href="#bus"/></svg><div><small>To</small><b>' + esc(to) + '</b></div></div>'
      : from || to ? '<div class="tk-route tk-one"><div><small>' + (to ? 'Going to' : 'Pickup') + '</small><b>' + esc(to || from) + '</b></div></div>' : '';
    var pick = ['Company', 'Dates', 'Start', 'Time', 'Travellers', 'Guests / vehicles', 'People / vehicles', 'Vehicle', 'Service'];
    var facts = list.filter(function (x) { return pick.indexOf(x[0]) > -1; }).sort(function (a, b) { return pick.indexOf(a[0]) - pick.indexOf(b[0]); }).slice(0, 4);

    /* contact options reuse the page's own links, so details live in one place */
    var tel = $('.foot-contact a[href^="tel:"]'), em = $('.foot-contact a[href^="mailto:"]');
    var hello = 'Hi Velocity Travels! I just sent a trip request' + (preview ? '' : ' (Ref ' + r + ')') + ' and would like to talk about it.';
    var wa = 'https://wa.me/' + CFG.whatsappNumber + '?text=' + encodeURIComponent(hello);
    var mailto = em.getAttribute('href') + '?subject=' + encodeURIComponent('Trip request ' + r) + '&body=' + encodeURIComponent(hello);
    var social = $('.about .social').outerHTML.replace(/about_/g, 'done_');

    finished = true; clearDraft(); ref = ''; reqId = '';
    if (document.activeElement) document.activeElement.blur();
    form.hidden = true; progress.hidden = true; $('#welcome').hidden = true;
    done.innerHTML =
      '<div class="done-scene" aria-hidden="true"><span class="done-road"></span><svg class="done-bus"><use href="#bus"/></svg><span class="sparks"><i></i><i></i><i></i><i></i><i></i><i></i></span><span class="done-tick">' + icon('check') + '</span></div>' +
      '<div class="done-in">' +
      '<h3 tabindex="-1">Thank you' + (first ? ', ' + esc(first) : '') + '!<br>Your quote request is in.</h3>' +
      '<p class="done-text">' + esc(CFG.replyPromise) + " We'll reach you " + reach + '.</p>' +
      (preview ? '<p class="done-preview">Preview only: this request was not delivered. The form isn\'t connected to our team yet.</p>' : '') +
      '<section class="ticket" aria-label="Your trip request">' +
        '<header class="tk-top"><span class="tk-i">' + icon(iconId) + '</span><span class="tk-t"><small>Trip request</small><b>' + esc(LABELS[t]) + '</b></span><span class="tk-r"><small>Reference</small><b>' + r + '</b></span></header>' +
        route +
        (facts.length ? '<dl class="tk-facts">' + facts.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl>' : '') +
        '<details class="tk-more"><summary>See everything you sent' + icon('chevron') + '</summary><dl>' + list.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl></details>' +
      '</section>' +
      '<ol class="steps-next"><li class="is-done"><span>' + icon('check') + '</span>Request sent</li><li><span>2</span>We plan your trip</li><li><span>3</span>Your quote arrives</li></ol>' +
      '<div class="talk"><p class="talk-h">Nothing more to do. Need it sooner?</p><div class="talk-b">' +
        '<a href="' + tel.getAttribute('href') + '" id="talk-call" data-track="done_call">' + icon('phone') + '<span><b>Call us</b><small>' + esc(tel.textContent) + '</small></span></a>' +
        '<a href="' + esc(mailto) + '" id="talk-mail" data-track="done_email">' + icon('mail') + '<span><b>Email us</b><small>' + esc(em.textContent) + '</small></span></a>' +
        '<a class="talk-wa" href="' + esc(wa) + '" target="_blank" rel="noopener" data-track="done_whatsapp">' + icon('whatsapp', 'i-brand') + '<span><b>WhatsApp</b><small>Chat with us</small></span></a>' +
      '</div></div>' +
      '<div class="done-foot"><button type="button" class="linkbtn" id="again">Plan another trip</button>' + social + '</div></div>';
    done.hidden = false;
    goToCard(false);
    $('h3', done).focus({ preventScroll: true });
    say('Your quote request is in. Reference ' + r + '.');
    $('#again').addEventListener('click', function () { resetAll(); showStep(1, { scroll: true }); });
    /* computers often can't dial or open a mail app, so copy the number or address there too */
    [['#talk-call', tel, 'Number copied'], ['#talk-mail', em, 'Address copied']].forEach(function (c) {
      $(c[0]).addEventListener('click', function (e) {
        if (!matchMedia('(hover:hover) and (pointer:fine)').matches || !navigator.clipboard) return;
        if (c[0] === '#talk-call') e.preventDefault();
        var label = $('b', this), was = label.getAttribute('data-l') || label.textContent;
        label.setAttribute('data-l', was);
        navigator.clipboard.writeText(c[1].textContent.trim()).then(function () {
          label.textContent = c[2]; say(c[2] + '.');
          setTimeout(function () { label.textContent = was; }, 2400);
        }, function () { if (c[0] === '#talk-call') location.href = tel.href; });
      });
    });
  }

  applyTrip(); applyContact();
  if (!restore()) update();
})();
