(function () {
  'use strict';

  var htmlEl = document.documentElement;
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function T(en, ar) { return '<span class="en">' + en + '</span><span class="ar">' + ar + '</span>'; }
  function lang() { return htmlEl.getAttribute('data-lang'); }
  function $(id) { return document.getElementById(id); }

  /* ================= Language ================= */
  function applyLang(l) {
    htmlEl.setAttribute('data-lang', l);
    htmlEl.setAttribute('lang', l);
    htmlEl.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
    document.title = l === 'ar' ? 'إم دي أوبس — عمليات رعاية صحية ذكية' : 'MDops — Intelligent Healthcare Operations';
    try { localStorage.setItem('mdops-lang', l); } catch (e) { /* storage unavailable */ }
    window.dispatchEvent(new Event('mdops:lang'));
  }
  $('langToggle').addEventListener('click', function () { applyLang(lang() === 'en' ? 'ar' : 'en'); });
  (function () {
    var saved = null;
    try { saved = localStorage.getItem('mdops-lang'); } catch (e) { /* storage unavailable */ }
    applyLang(saved === 'ar' ? 'ar' : 'en');
  })();

  /* ================= Mobile nav ================= */
  var burger = $('navToggle'), links = $('navLinks');
  burger.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  links.addEventListener('click', function (e) {
    if (e.target.closest('a')) { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
  });

  /* ================= Riyadh clock ================= */
  var ruhFmt = null;
  try {
    ruhFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch (e) { ruhFmt = null; }
  function ruhParts() {
    if (!ruhFmt) return null;
    var p = {};
    ruhFmt.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return p;
  }
  function tickClock() {
    var p = ruhParts();
    if (p) $('ruhClock').textContent = p.hour + ':' + p.minute + ':' + p.second;
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ================= In-view helper ================= */
  function watchVisibility(el, cb) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { cb(en.isIntersecting); });
    }, { threshold: 0.05 }).observe(el);
  }

  /* ================= ECG sweep ================= */
  function gauss(x, mu, s) { return Math.exp(-((x - mu) * (x - mu)) / (2 * s * s)); }
  function beat(p) {
    return 0.11 * gauss(p, 0.17, 0.024)
      - 0.13 * gauss(p, 0.355, 0.008)
      + 1.0 * gauss(p, 0.385, 0.011)
      - 0.28 * gauss(p, 0.415, 0.01)
      + 0.3 * gauss(p, 0.62, 0.042);
  }

  function Ecg(canvas, opts) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.color = opts.color;
    this.lineWidth = opts.lineWidth || 1.6;
    this.amp = opts.amp || 0.42;
    this.base = opts.base || 0.62;
    this.speed = opts.speed || 190;
    this.beatPx = opts.beatPx || 160;
    this.gap = 26;
    this.running = false;
    this.last = 0;
    this.resize();
    var self = this;
    if ('ResizeObserver' in window) new ResizeObserver(function () { self.resize(); self.draw(); }).observe(canvas);
    watchVisibility(canvas, function (v) { v ? self.start() : self.stop(); });
  }
  Ecg.prototype.sample = function (px) {
    var n = Math.floor(px / this.beatPx);
    var jitter = ((n * 9301 + 49297) % 233280) / 233280;
    var len = this.beatPx * (0.92 + jitter * 0.16);
    return beat((px % this.beatPx) / len);
  };
  Ecg.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(this.c.clientWidth));
    var h = Math.max(1, Math.round(this.c.clientHeight));
    this.w = w; this.h = h;
    this.c.width = w * dpr; this.c.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ys = new Float32Array(w);
    for (var x = 0; x < w; x++) this.ys[x] = this.sample(x);
    this.px = w;
    this.head = w - 1;
  };
  Ecg.prototype.y = function (v) { return this.h * this.base - v * this.amp * this.h; };
  Ecg.prototype.draw = function () {
    var ctx = this.ctx, w = this.w, ys = this.ys, head = this.head, gap = this.gap;
    ctx.clearRect(0, 0, w, this.h);
    ctx.lineWidth = this.lineWidth;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.color;
    ctx.beginPath();
    var pen = false;
    for (var x = 0; x < w; x++) {
      var d = (x - head + w) % w;
      if (this.running && d > 0 && d <= gap) { pen = false; continue; }
      var yy = this.y(ys[x]);
      if (!pen) { ctx.moveTo(x, yy); pen = true; } else { ctx.lineTo(x, yy); }
    }
    ctx.stroke();
    if (this.running) {
      var hy = this.y(ys[head]);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(head, hy, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  };
  Ecg.prototype.frame = function (t) {
    if (!this.running) return;
    var dt = this.last ? Math.min((t - this.last) / 1000, 0.05) : 0;
    this.last = t;
    var steps = Math.round(this.speed * dt);
    for (var i = 0; i < steps; i++) {
      this.head = (this.head + 1) % this.w;
      this.px++;
      this.ys[this.head] = this.sample(this.px);
    }
    this.draw();
    var self = this;
    requestAnimationFrame(function (tt) { self.frame(tt); });
  };
  Ecg.prototype.start = function () {
    if (RM) { this.draw(); return; }
    if (this.running) return;
    this.running = true; this.last = 0;
    var self = this;
    requestAnimationFrame(function (t) { self.frame(t); });
  };
  Ecg.prototype.stop = function () { this.running = false; this.draw(); };

  new Ecg($('ecgHero'), { color: '#2563EB', amp: 0.44, base: 0.66 });
  new Ecg($('ecgFooter'), { color: '#22D3EE', amp: 0.34, base: 0.55, lineWidth: 1.4, speed: 150, beatPx: 210 });

  /* ================= Hero OR board ================= */
  var SPEC = {
    ortho: T('Ortho', 'عظام'), cardiac: T('Cardiac', 'قلب'), paeds: T('Paeds', 'أطفال'),
    obs: T('Obs', 'نساء'), general: T('General', 'عامة'), ent: T('ENT', 'أنف وأذن')
  };
  var LOCK = '<svg viewBox="0 0 9 10" aria-hidden="true"><rect x="0.5" y="4" width="8" height="5.5" rx="1" fill="currentColor"/><path d="M2.3 4V2.8a2.2 2.2 0 0 1 4.4 0V4" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';
  var ROOMS = [
    { id: 'OR-1', cases: [[7, 10.5, 'ortho'], [11, 15, 'ortho'], [15.5, 18, 'general']] },
    { id: 'OR-2', cases: [[7, 13, 'cardiac', true], [13.5, 18.5, 'cardiac']] },
    { id: 'OR-3', cases: [[7.5, 10, 'paeds'], [10.5, 13, 'paeds'], [14, 17, 'ent']] },
    { id: 'OR-4', cases: [[7, 9, 'obs'], [9.5, 12, 'obs'], [12.5, 16, 'general']] },
    { id: 'OR-5', cases: [[8, 12.5, 'general'], [13, 17.5, 'ortho']] },
    { id: 'OR-6', cases: [[7, 11, 'ent'], [12, 14.5, 'paeds']] }
  ];
  var CONS = ['AH', 'MS', 'NR', 'KF', 'SQ', 'LB', 'YD', 'RA'];
  var RES = ['R1', 'R2', 'R3', 'R4', 'R2', 'R3'];
  function pct(h) { return ((h - 7) / 12) * 100; }
  function shuffled(a) {
    var b = a.slice();
    for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = b[i]; b[i] = b[j]; b[j] = t; }
    return b;
  }

  var axis = $('boardAxis');
  [7, 9, 11, 13, 15, 17, 19].forEach(function (h) {
    var s = document.createElement('span');
    s.style.insetInlineStart = pct(h) + '%';
    s.textContent = (h < 10 ? '0' : '') + h;
    axis.appendChild(s);
  });

  var rowsEl = $('boardRows');
  var staffEls = [], blockEls = [], trackEls = [];
  var initialCons = CONS.slice(0, 6);
  ROOMS.forEach(function (room, ri) {
    var row = document.createElement('div');
    row.className = 'b-row';
    row.innerHTML = '<span class="b-room">' + room.id + '</span><span class="b-staff">' + initialCons[ri] + ' · ' + RES[ri] + '</span><div class="b-track"></div>';
    var track = row.querySelector('.b-track');
    var blocks = room.cases.map(function (c) {
      var b = document.createElement('span');
      b.className = 'b-block' + (c[3] ? ' is-locked' : '');
      b.style.insetInlineStart = pct(c[0]) + '%';
      b.style.width = 'calc(' + ((c[1] - c[0]) / 12) * 100 + '% - 2px)';
      b.innerHTML = (c[3] ? LOCK : '') + '<span>' + SPEC[c[2]] + '</span>';
      if (c[3]) b.title = 'Locked slot';
      track.appendChild(b);
      return b;
    });
    staffEls.push(row.querySelector('.b-staff'));
    blockEls.push(blocks);
    trackEls.push(track);
    rowsEl.appendChild(row);
  });

  var nowLines = [];
  function placeNow() {
    var p = ruhParts();
    var h = p ? parseInt(p.hour, 10) + parseInt(p.minute, 10) / 60 : -1;
    var show = h >= 7 && h < 19;
    trackEls.forEach(function (tr, i) {
      if (!nowLines[i]) { nowLines[i] = document.createElement('span'); nowLines[i].className = 'b-now'; tr.appendChild(nowLines[i]); }
      nowLines[i].hidden = !show;
      if (show) nowLines[i].style.insetInlineStart = pct(h) + '%';
    });
  }
  placeNow();
  setInterval(placeNow, 30000);

  var statusEl = $('boardStatus'), placedEl = $('boardPlaced');
  var boardBusy = false, boardVisible = false;
  function distribute() {
    if (boardBusy) return;
    boardBusy = true;
    statusEl.setAttribute('data-state', 'distributing');
    var placed = 0;
    placedEl.textContent = '0';
    var k = 0;
    blockEls.forEach(function (blocks) {
      blocks.forEach(function (b) {
        if (b.classList.contains('is-locked')) return;
        (function (el, d) { setTimeout(function () { el.classList.add('is-out'); }, d); })(b, (k++) * 22);
      });
    });
    staffEls.forEach(function (s) { s.classList.add('is-blank'); s.textContent = '— · —'; });
    var cons = shuffled(CONS), res = shuffled(RES);
    setTimeout(function () {
      ROOMS.forEach(function (room, ri) {
        setTimeout(function () {
          staffEls[ri].textContent = cons[ri] + ' · ' + res[ri];
          staffEls[ri].classList.remove('is-blank');
          blockEls[ri].forEach(function (b, bi) {
            setTimeout(function () { b.classList.remove('is-out'); }, bi * 110);
          });
          placed += 2;
          placedEl.textContent = String(placed);
          if (ri === ROOMS.length - 1) {
            setTimeout(function () { statusEl.setAttribute('data-state', 'published'); boardBusy = false; }, 650);
          }
        }, ri * 280);
      });
    }, 750);
  }
  watchVisibility($('boardRows'), function (v) { boardVisible = v; });
  if (!RM) {
    setTimeout(function () { if (boardVisible) distribute(); }, 2200);
    setInterval(function () { if (boardVisible && !document.hidden) distribute(); }, 9000);
  }

  /* ================= Story rota ================= */
  var STAFF = [
    { id: 'AH', role: T('Consultant', 'استشاري'), sub: T('Paeds', 'أطفال') },
    { id: 'MS', role: T('Consultant', 'استشاري'), sub: T('Cardiac', 'قلب') },
    { id: 'NR', role: T('Consultant', 'استشاري'), sub: T('General', 'عامة') },
    { id: 'KF', role: T('Fellow', 'زميل'), sub: T('Obs', 'نساء') },
    { id: 'SQ', role: T('Resident', 'مقيم'), sub: 'R4' },
    { id: 'LB', role: T('Resident', 'مقيم'), sub: 'R3' },
    { id: 'YD', role: T('Resident', 'مقيم'), sub: 'R2' },
    { id: 'RA', role: T('Technologist', 'فنّي'), sub: T('Anaesthesia', 'تخدير') }
  ];
  var DAYS = [['Thu', 'خميس'], ['Fri', 'جمعة'], ['Sat', 'سبت'], ['Sun', 'أحد'], ['Mon', 'إثنين'], ['Tue', 'ثلاثاء'], ['Wed', 'أربعاء']];
  var ROTA = {
    manual: [
      'OR OR CL OC PC OR CL',
      'OR L OR! L OR CL OR',
      'CL OR OR . OR OC PC',
      'N N N! PC . OR OR',
      'OR OC OR! CL OR . OR',
      '? OR CL OR ? OC PC',
      'CL . OR OR OC OR! .',
      'OR OR . ? OR OR CL'
    ],
    noon: [
      'OR ?~ CL OC PC OR CL',
      'OR L OR! L OR CL OR',
      'CL OR OR . OR OC PC',
      'N N N! PC . OR OR',
      'OR OC OR! OC~ OR . OR',
      '? OR CL OR ? OC PC',
      'CL . .~ OR OC OR! .',
      'OR OR . ? OR OR CL'
    ],
    mdops: [
      'OR OR CL OC PC OR CL',
      'OR L L L OR CL OR',
      'CL OR OR OC PC OR CL',
      'N PC . OR OR CL OR',
      'OR OC PC CL OR CL OR',
      'OC PC OR CL OR OR .',
      'CL OR OC PC OR CL OR',
      'OR CL OR OR OC PC OR'
    ]
  };
  var rota = $('rota'), rotaGrid = $('rotaGrid');
  var rotaState = null;
  function renderRota(state) {
    if (state === rotaState) return;
    rotaState = state;
    rota.setAttribute('data-state', state);
    var html = '<span class="r-h">' + T('Staff', 'الكادر') + '</span>';
    DAYS.forEach(function (d) { html += '<span class="r-h">' + T(d[0], d[1]) + '</span>'; });
    html += '<span class="r-h">' + T('Load', 'العبء') + '</span>';
    var conflicts = 0, gaps = 0, idx = 0;
    ROTA[state].forEach(function (line, r) {
      var s = STAFF[r];
      html += '<span class="r-name"><span>' + s.role + '</span><small>' + s.id + ' · ' + s.sub + '</small></span>';
      var load = 0;
      line.split(' ').forEach(function (tok) {
        var bad = tok.indexOf('!') > -1, chg = tok.indexOf('~') > -1;
        var code = tok.replace(/[!~]/g, '');
        var cls, txt = code;
        if (code === '.') { cls = 'c-off'; txt = ''; }
        else if (code === '?') { cls = 'c-gap'; txt = '?'; gaps++; }
        else { cls = 'c-' + code; }
        if (code === 'OC' || code === 'N') load++;
        if (bad) conflicts++;
        var extra = (bad ? ' bad' : '') + (chg ? ' chg' : '') + (state === 'mdops' && !RM ? ' pop' : '');
        var delay = state === 'mdops' ? ' style="animation-delay:' + (idx * 16) + 'ms"' : '';
        html += '<i class="c ' + cls + extra + '"' + delay + '>' + txt + '</i>';
        idx++;
      });
      html += '<span class="r-fair"><i class="' + (load >= 3 ? 'hi' : '') + '" style="width:' + Math.max(8, Math.min(load, 3) / 3 * 100) + '%"></i></span>';
    });
    rotaGrid.innerHTML = html;
    var cEl = $('rotaConflicts'), gEl = $('rotaGaps');
    cEl.textContent = String(conflicts);
    gEl.textContent = String(gaps);
    cEl.className = 'ro-val tnum ' + (conflicts ? 'ro-bad' : 'ro-ok');
    gEl.className = 'ro-val tnum ' + (gaps ? 'ro-bad' : 'ro-ok');
  }
  renderRota('manual');

  var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
  function activateStep(step) {
    steps.forEach(function (s) { s.classList.toggle('is-active', s === step); });
    renderRota(step.getAttribute('data-state'));
  }
  if ('IntersectionObserver' in window) {
    var stepObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) activateStep(en.target); });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    steps.forEach(function (s) { stepObs.observe(s); });
  }

  /* ================= Product suite ================= */
  var SAMPLE = T('Sample data', 'بيانات توضيحية');

  function mockOR() {
    var rows = [
      ['OR-1', [[7, 10.5, 'ortho'], [11, 15, 'ortho']]],
      ['OR-2', [[7, 13, 'cardiac', true], [13.5, 18, 'cardiac']]],
      ['OR-3', [[7.5, 10, 'paeds'], [10.5, 13, 'paeds'], [14, 17, 'ent']]],
      ['OR-4', [[7, 9, 'obs'], [9.5, 12, 'obs'], [12.5, 16, 'general']]]
    ];
    var h = '<div class="m-or">';
    var k = 0;
    rows.forEach(function (r) {
      h += '<div class="b-row"><span class="b-room">' + r[0] + '</span><div class="b-track">';
      r[1].forEach(function (c) {
        h += '<span class="b-block m-grow' + (c[3] ? ' is-locked' : '') + '" style="inset-inline-start:' + pct(c[0]) + '%;width:calc(' + ((c[1] - c[0]) / 12 * 100) + '% - 2px);animation-delay:' + (k++ * 70) + 'ms">' + (c[3] ? LOCK : '') + '<span>' + SPEC[c[2]] + '</span></span>';
      });
      h += '</div></div>';
    });
    h += '</div>';
    h += '<div class="m-flow"><span class="m-btn done">✓ ' + T('Distribute', 'توزيع') + '</span><span class="sep">→</span><span class="m-chip">' + T('Review', 'مراجعة') + '</span><span class="sep">→</span><span class="m-btn primary">' + T('Publish', 'نشر') + '</span><span class="m-chip ok">' + LOCK + ' ' + T('1 locked slot', 'فترة مثبّتة واحدة') + '</span></div>';
    return h;
  }

  function mockWF() {
    var heads = [['S', 'ح'], ['M', 'ن'], ['T', 'ث'], ['W', 'ر'], ['T', 'خ'], ['F', 'ج'], ['S', 'س']];
    var h = '<div class="m-stack"><span class="m-label">' + T('September 2026 · leave &amp; approvals', 'سبتمبر 2026 · الإجازات والاعتمادات') + '</span><div class="m-cal" dir="ltr">';
    heads.forEach(function (d) { h += '<span class="hd">' + T(d[0], d[1]) + '</span>'; });
    for (var i = 0; i < 35; i++) {
      var day = i - 1;
      if (day < 1 || day > 30) { h += '<span class="x"></span>'; continue; }
      var cls = (day >= 8 && day <= 12) ? 'lv m-fade' : (day === 23 ? 'hol m-fade' : '');
      h += '<span class="' + cls + '" style="animation-delay:' + (i * 12) + 'ms">' + day + '</span>';
    }
    h += '</div><div class="m-row" style="flex-wrap:wrap"><span class="m-chip ok">✓ ' + T('Approved', 'معتمد') + '</span><span class="m-chip cy">' + T('Leave · 8–12 Sep', 'إجازة · 8–12 سبتمبر') + '</span><span class="m-chip">' + T('National Day · 23 Sep', 'اليوم الوطني · 23 سبتمبر') + '</span></div>';
    h += '<div class="m-stack" style="gap:6px"><div class="m-row" style="justify-content:space-between"><span class="m-label">' + T('Working hours this week', 'ساعات العمل هذا الأسبوع') + '</span><span class="m-label tnum" style="color:#E8EEF7">44 / 48 h</span></div><div class="m-meter"><i class="m-grow" style="width:92%"></i></div></div></div>';
    return h;
  }

  function mockOC() {
    var people = [['AH', 4], ['MS', 4], ['NR', 5], ['KF', 4], ['SQ', 4], ['LB', 4]];
    var h = '<div class="m-stack"><div class="m-row" style="justify-content:space-between;flex-wrap:wrap"><span class="m-label">' + T('On-call this month', 'المناوبات هذا الشهر') + '</span><span class="m-chip ok">' + T('Fairness spread ±1', 'فارق العدالة ±1') + '</span></div><div class="m-bars">';
    var k = 0;
    people.forEach(function (p) {
      h += '<div class="m-bar"><span>' + p[0] + '</span><span class="trk">';
      for (var i = 0; i < 8; i++) {
        h += i < p[1] ? '<i class="m-fade" style="animation-delay:' + (k++ * 25) + 'ms"></i>' : '<i style="opacity:.14"></i>';
      }
      h += '</span><b class="tnum">' + p[1] + '</b></div>';
    });
    h += '</div><div class="m-row" style="flex-wrap:wrap"><span class="m-chip cy">' + T('Post-call rest enforced', 'راحة ما بعد المناوبة مُطبَّقة') + '</span><span class="m-chip">' + T('Coverage 100%', 'التغطية 100%') + '</span></div></div>';
    return h;
  }

  function mockAN() {
    var pts = [71, 74, 73, 77, 76, 80, 79, 82, 81, 84, 85, 86];
    var W = 300, H = 100, lo = 64, hi = 90;
    var coords = pts.map(function (v, i) { return [(i / (pts.length - 1)) * W, H - ((v - lo) / (hi - lo)) * H]; });
    var line = coords.map(function (c) { return c[0].toFixed(1) + ',' + c[1].toFixed(1); }).join(' ');
    var area = 'M0,' + H + ' L' + line.split(' ').join(' L') + ' L' + W + ',' + H + ' Z';
    var last = coords[coords.length - 1];
    var h = '<div class="m-kpis">' +
      '<div class="m-kpi"><span class="m-label">' + T('Utilisation', 'الاستخدام') + '</span><b class="tnum">86%</b></div>' +
      '<div class="m-kpi"><span class="m-label">' + T('Staffing health', 'صحة التوظيف') + '</span><b class="ok">' + T('Stable', 'مستقرة') + '</b></div>' +
      '<div class="m-kpi"><span class="m-label">' + T('Fairness spread', 'فارق العدالة') + '</span><b class="tnum">±1</b></div></div>';
    h += '<p class="m-label" style="margin-top:18px">' + T('Theatre utilisation · last 12 weeks', 'استخدام غرف العمليات · آخر 12 أسبوعًا') + '</p>';
    h += '<div style="position:relative" dir="ltr"><svg class="m-spark" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22D3EE" stop-opacity=".28"/><stop offset="1" stop-color="#22D3EE" stop-opacity="0"/></linearGradient></defs>' +
      '<line x1="0" y1="25" x2="300" y2="25" stroke="rgba(148,178,220,.14)" vector-effect="non-scaling-stroke"/>' +
      '<line x1="0" y1="50" x2="300" y2="50" stroke="rgba(148,178,220,.14)" vector-effect="non-scaling-stroke"/>' +
      '<line x1="0" y1="75" x2="300" y2="75" stroke="rgba(148,178,220,.14)" vector-effect="non-scaling-stroke"/>' +
      '<path d="' + area + '" fill="url(#sparkFill)"/>' +
      '<polyline points="' + line + '" fill="none" stroke="#22D3EE" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>' +
      '<span style="position:absolute;right:-4px;top:calc(' + (last[1]) + '% - 4px);width:8px;height:8px;border-radius:50%;background:#22D3EE;box-shadow:0 0 0 4px rgba(34,211,238,.2)"></span></div>';
    return h;
  }

  function mockAI() {
    var codes = ['OR', 'OR', 'CL', 'OC', 'PC', 'OR', 'CL', 'CL', 'OR', 'OR', 'OC', 'PC', 'L', 'L', 'N', 'PC', 'OR', 'CL', 'OR', 'OR', 'OC', 'OR', 'OC', 'PC', 'CL', 'OR', 'N', 'PC', 'OC', 'PC', 'OR', 'OR', 'CL', 'OR', 'OC'];
    var h = '<div class="m-stack"><div class="m-row" style="flex-wrap:wrap"><span class="m-chip cy">' + T('Vacation-aware', 'يراعي الإجازات') + '</span><span class="m-chip cy">' + T('Rule-compliant', 'ملتزم بالقواعد') + '</span><span class="m-chip cy">' + T('Fair', 'عادل') + '</span></div><div class="m-grid">';
    codes.forEach(function (c, i) {
      h += '<i class="c c-' + c + ' m-fade" style="animation-delay:' + (i * 28) + 'ms"></i>';
    });
    h += '</div><div class="m-row" style="justify-content:space-between;flex-wrap:wrap"><span class="m-btn primary">' + T('Generate rota', 'توليد الجدول') + '</span><span class="m-label" style="color:#10B981">' + T('35 assignments · 0 conflicts', '35 تكليفًا · 0 تعارض') + '</span></div></div>';
    return h;
  }

  function mockMB() {
    return '<div class="m-phone"><div class="notch"></div><div class="m-stack">' +
      '<span class="m-label">' + T('Today · Thursday', 'اليوم · الخميس') + '</span>' +
      '<div class="m-card m-fade"><span class="m-label">' + T('Assignment', 'التكليف') + '</span><b>OR-3 · 07:30</b><span class="m-label">' + T('Cardiac list', 'قائمة القلب') + '</span></div>' +
      '<div class="m-card m-fade" style="animation-delay:90ms"><span class="m-label">' + T('Next on-call', 'المناوبة القادمة') + '</span><b>' + T('Sunday · 16:00', 'الأحد · 16:00') + '</b></div>' +
      '<div class="m-card alert m-fade" style="animation-delay:180ms"><span class="m-label" style="color:#10B981">' + T('Alert', 'تنبيه') + '</span><b>' + T('Leave approved · 8–12 Sep', 'اعتُمدت الإجازة · 8–12 سبتمبر') + '</b></div>' +
      '<span class="m-btn" style="text-align:center">' + T('Request leave', 'طلب إجازة') + '</span>' +
      '</div></div>';
  }

  function mockCM() {
    return '<div class="m-tiles">' +
      '<div class="m-kpi"><span class="m-label">' + T('Rooms running', 'الغرف العاملة') + '</span><b class="tnum">8/9</b></div>' +
      '<div class="m-kpi"><span class="m-label">' + T('Staff on duty', 'الكوادر المناوِبة') + '</span><b class="tnum">46</b></div>' +
      '<div class="m-kpi"><span class="m-label">' + T('Open alerts', 'تنبيهات مفتوحة') + '</span><b class="tnum" style="color:#F2B138">2</b></div></div>' +
      '<p class="m-label" style="margin-top:18px">' + T('Department live status', 'الحالة اللحظية للقسم') + '</p>' +
      '<div class="m-live">' +
      '<div class="m-fade"><span>OR-4</span><span class="m-chip am">' + T('Delayed 20 min', 'متأخّرة 20 دقيقة') + '</span></div>' +
      '<div class="m-fade" style="animation-delay:80ms"><span>OR-7</span><span class="m-chip cy">' + T('Turnover', 'تجهيز') + '</span></div>' +
      '<div class="m-fade" style="animation-delay:160ms"><span>OR-9</span><span class="m-chip">' + T('Closed', 'مغلقة') + '</span></div>' +
      '<div class="m-fade" style="animation-delay:240ms"><span>' + T('Recovery', 'الإفاقة') + '</span><span class="m-chip ok">' + T('Flowing', 'انسيابية') + '</span></div>' +
      '</div>';
  }

  var PRODUCTS = [
    { code: 'OR', name: 'MDops OR', short: T('Operating-room &amp; perioperative management.', 'إدارة غرف العمليات وما حولها.'),
      detail: T('Daily OR distribution with specialty-aware placement, slot locking, and a distribute-then-publish workflow.', 'توزيع يومي لغرف العمليات مع إسناد يراعي التخصّص، وتثبيت الفترات، وسير عمل «وزّع ثم انشر».'), mock: mockOR },
    { code: 'WF', name: 'MDops Workforce', short: T('Scheduling, leave, staffing, and workload balancing.', 'الجدولة والإجازات والتوظيف وموازنة العبء.'),
      detail: T('Monthly scheduling, leave and approvals, holiday handling, and working-hour compliance.', 'جدولة شهرية، وإجازات واعتمادات، وإدارة العطلات، والتزام بحدود ساعات العمل.'), mock: mockWF },
    { code: 'OC', name: 'MDops OnCall', short: T('On-call planning, fairness, and coverage.', 'تخطيط المناوبات والعدالة والتغطية.'),
      detail: T('On-call generation with fairness tracking and post-call rest.', 'توليد المناوبات مع تتبّع العدالة وراحة ما بعد المناوبة.'), mock: mockOC },
    { code: 'AN', name: 'MDops Analytics', short: T('Executive dashboards, KPIs, and reporting.', 'لوحات تنفيذية ومؤشرات أداء وتقارير.'),
      detail: T('An executive KPI centre for utilisation, staffing health, and fairness.', 'مركز مؤشرات أداء تنفيذي للاستخدام وصحة التوظيف والعدالة.'), mock: mockAN },
    { code: 'AI', name: 'MDops AI', short: T('AI-assisted scheduling and recommendations.', 'جدولة وتوصيات بمساعدة الذكاء الاصطناعي.'),
      detail: T('Fair, vacation-aware, rule-compliant scheduling in one click.', 'جدولة عادلة تراعي الإجازات وتلتزم بالقواعد، بنقرة واحدة.'), mock: mockAI },
    { code: 'MB', name: 'MDops Mobile', short: T('Mobile access for healthcare professionals.', 'وصول عبر الجوال للكوادر الصحية.'),
      detail: T('See assignments, request leave, and receive alerts anywhere.', 'اطّلع على التكليفات، واطلب الإجازات، وتلقَّ التنبيهات أينما كنت.'), mock: mockMB },
    { code: 'CM', name: 'MDops Command', short: T('Executive command centre for operations.', 'مركز قيادة تنفيذي للعمليات.'),
      detail: T("The department's live status in one executive view.", 'الحالة اللحظية للقسم في شاشة تنفيذية واحدة.'), mock: mockCM }
  ];

  var suiteList = $('suiteList'), suitePanel = $('suitePanel');
  var tabs = PRODUCTS.map(function (p, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 's-item';
    b.id = 'tab-' + p.code;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', 'suitePanel');
    b.innerHTML = '<span class="s-code">' + p.code + '</span><span><span class="s-name">' + p.name + '</span><span class="s-short">' + p.short + '</span></span><span class="s-arrow" aria-hidden="true">→</span>';
    b.addEventListener('click', function () { selectProduct(i); });
    b.addEventListener('keydown', function (e) {
      var d = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : (e.key === 'ArrowUp' || e.key === 'ArrowLeft') ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = (i + d + PRODUCTS.length) % PRODUCTS.length;
      selectProduct(n);
      tabs[n].focus();
    });
    suiteList.appendChild(b);
    return b;
  });
  var current = -1;
  function selectProduct(i) {
    if (i === current) return;
    current = i;
    tabs.forEach(function (t, k) {
      t.setAttribute('aria-selected', String(k === i));
      t.tabIndex = k === i ? 0 : -1;
    });
    var p = PRODUCTS[i];
    suitePanel.setAttribute('aria-labelledby', 'tab-' + p.code);
    suitePanel.innerHTML = '<div class="p-enter"><div class="p-top"><h3 class="p-name">' + p.name + '</h3><span class="p-tag">' + SAMPLE + '</span></div><p class="p-detail">' + p.detail + '</p><div class="p-mock">' + p.mock() + '</div></div>';
  }
  selectProduct(0);

  /* ================= Security vault ================= */
  var layerItems = Array.prototype.slice.call(document.querySelectorAll('#layerList li'));
  var rings = Array.prototype.slice.call(document.querySelectorAll('#vault [data-ring]'));
  var vaultTouched = false, vaultIdx = 0, vaultVisible = false;
  function highlight(n) {
    layerItems.forEach(function (li) { li.classList.toggle('hl', li.getAttribute('data-layer') === String(n)); });
    rings.forEach(function (r) { r.classList.toggle('hl', r.getAttribute('data-ring') === String(n)); });
  }
  function userHighlight(n) { vaultTouched = true; highlight(n); }
  layerItems.forEach(function (li) {
    var n = li.getAttribute('data-layer');
    li.addEventListener('mouseenter', function () { userHighlight(n); });
    li.addEventListener('focus', function () { userHighlight(n); });
  });
  $('vault').addEventListener('mouseover', function (e) {
    var r = e.target.closest('[data-ring]');
    if (r) userHighlight(r.getAttribute('data-ring'));
  });
  watchVisibility($('vault'), function (v) { vaultVisible = v; });
  if (!RM) {
    setInterval(function () {
      if (vaultTouched || !vaultVisible || document.hidden) return;
      vaultIdx = vaultIdx % 6 + 1;
      highlight(vaultIdx);
    }, 2200);
  }

  /* ================= Journey map ================= */
  (function initJourney() {
    var path = $('journeyPath');
    if (!path) return;
    var progress = $('journeyProgress');
    var nodes = Array.prototype.slice.call(document.querySelectorAll('.journey-node'));
    var cards = Array.prototype.slice.call(document.querySelectorAll('.journey-card'));
    var total = path.getTotalLength();
    var fractions = [0.02, 0.21, 0.40, 0.60, 0.79, 0.98];
    progress.style.strokeDasharray = total;
    progress.style.strokeDashoffset = total;
    nodes.forEach(function (node, i) {
      var pt = path.getPointAtLength(total * fractions[i]);
      node.style.insetInlineStart = (pt.x / 1000 * 100) + '%';
      node.style.top = (pt.y / 300 * 100) + '%';
    });
    cards.forEach(function (card, i) { card.setAttribute('data-num', i + 1); });
    var active = -1, timer = null, inView = false;
    function setActive(i) {
      if (i === active) return;
      active = i;
      nodes.forEach(function (n, k) {
        n.classList.toggle('done', k < i);
        n.classList.toggle('active', k === i);
        n.setAttribute('aria-pressed', String(k === i));
      });
      cards.forEach(function (c, k) { c.classList.toggle('active', k === i); });
      progress.style.strokeDashoffset = total * (1 - fractions[i]);
    }
    function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }
    nodes.forEach(function (node, i) { node.addEventListener('click', function () { stopAuto(); setActive(i); }); });
    setActive(0);
    watchVisibility($('journey'), function (v) { inView = v; });
    if (!RM) {
      timer = setInterval(function () { if (inView && !document.hidden) setActive((active + 1) % nodes.length); }, 3200);
      $('journey').addEventListener('pointerdown', stopAuto, { once: true });
    }
  })();

  /* ================= Copy email ================= */
  $('copyEmail').addEventListener('click', function () {
    var btn = this, emailEl = $('contactEmail');
    function done() {
      var prev = btn.innerHTML;
      btn.innerHTML = T('Copied', 'تم النسخ');
      setTimeout(function () { btn.innerHTML = prev; }, 1600);
    }
    function selectText() {
      var r = document.createRange(); r.selectNodeContents(emailEl);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(emailEl.textContent).then(done, selectText);
    } else { selectText(); }
  });

  /* ================= Contact form -> falfawwaz@mdops.ai (FormSubmit) ================= */
  var form = $('contactForm'), statusMsg = $('formStatus'), submitBtn = $('submitBtn');
  var MSG = {
    sending: ['Sending your message…', 'جارٍ إرسال رسالتك…'],
    invalid: ['Please fill in your name, a valid work email, and a message.', 'يرجى إدخال الاسم وبريد عمل صحيح والرسالة.'],
    ok: ['Thank you. Your message reached the MDops team, and we will reply shortly.', 'شكرًا لك. وصلت رسالتك إلى فريق إم دي أوبس، وسنعاود التواصل قريبًا.'],
    err: ['The message could not be sent from this page. Please email falfawwaz@mdops.ai directly.', 'تعذّر إرسال الرسالة من هذه الصفحة. يرجى مراسلتنا مباشرة على falfawwaz@mdops.ai.']
  };
  function setStatus(k, cls) {
    statusMsg.textContent = MSG[k][lang() === 'ar' ? 1 : 0];
    statusMsg.className = 'form-status' + (cls ? ' ' + cls : '');
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if ($('f-honey').value) return;
    var name = $('f-name'), email = $('f-email'), msg = $('f-msg');
    var okName = name.value.trim().length > 1;
    var okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    var okMsg = msg.value.trim().length > 3;
    name.setAttribute('aria-invalid', String(!okName));
    email.setAttribute('aria-invalid', String(!okEmail));
    msg.setAttribute('aria-invalid', String(!okMsg));
    if (!(okName && okEmail && okMsg)) { setStatus('invalid', 'err'); return; }

    setStatus('sending');
    submitBtn.disabled = true;
    var data = new FormData(form);
    data.delete('_honey');
    data.append('_subject', 'New inquiry from mdops.ai');
    data.append('_template', 'table');
    data.append('_captcha', 'false');
    fetch('https://formsubmit.co/ajax/falfawwaz@mdops.ai', { method: 'POST', headers: { 'Accept': 'application/json' }, body: data })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function (json) {
        if (json && (json.success === false || json.success === 'false')) throw new Error('rejected');
        setStatus('ok', 'ok');
        form.reset();
      })
      .catch(function () { setStatus('err', 'err'); })
      .then(function () { submitBtn.disabled = false; });
  });
})();
