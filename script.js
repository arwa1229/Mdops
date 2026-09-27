/* ===== Language toggle (EN <-> AR with RTL) ===== */
const htmlEl = document.documentElement;

function applyLang(lang) {
  htmlEl.setAttribute('data-lang', lang);
  htmlEl.setAttribute('lang', lang);
  htmlEl.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.title = lang === 'ar'
    ? 'إم دي أوبس — عمليات رعاية صحية ذكية'
    : 'MDops — Intelligent Healthcare Operations';
  // swap form placeholders
  document.querySelectorAll('[data-ph-en]').forEach(function (el) {
    el.placeholder = lang === 'ar' ? el.dataset.phAr : el.dataset.phEn;
  });
  try { localStorage.setItem('mdops-lang', lang); } catch (e) { /* private mode */ }
}

document.getElementById('langToggle').addEventListener('click', function () {
  applyLang(htmlEl.getAttribute('data-lang') === 'en' ? 'ar' : 'en');
});

(function initLang() {
  let saved = null;
  try { saved = localStorage.getItem('mdops-lang'); } catch (e) { /* private mode */ }
  applyLang(saved === 'ar' ? 'ar' : 'en');
})();

/* ===== Mobile nav ===== */
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', function () {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
});
navLinks.addEventListener('click', function (e) {
  if (e.target.closest('a')) navLinks.classList.remove('open');
});

/* ===== Implementation journey map ===== */
(function initJourney() {
  const path = document.getElementById('journeyPath');
  if (!path) return;
  const progress = document.getElementById('journeyProgress');
  const nodes = Array.prototype.slice.call(document.querySelectorAll('.journey-node'));
  const cards = Array.prototype.slice.call(document.querySelectorAll('.journey-card'));
  const total = path.getTotalLength();
  const VBW = 1000, VBH = 300;
  // node anchor points as fractions along the path
  const fractions = [0.02, 0.21, 0.40, 0.60, 0.79, 0.98];

  progress.style.strokeDasharray = total;
  progress.style.strokeDashoffset = total;

  nodes.forEach(function (node, i) {
    const pt = path.getPointAtLength(total * fractions[i]);
    node.style.insetInlineStart = (pt.x / VBW * 100) + '%';
    node.style.top = (pt.y / VBH * 100) + '%';
  });
  cards.forEach(function (card, i) { card.dataset.num = i + 1; });

  let active = -1;
  let timer = null;

  function setActive(i) {
    if (i === active) return;
    active = i;
    nodes.forEach(function (n, k) {
      n.classList.toggle('done', k < i);
      n.classList.toggle('active', k === i);
    });
    cards.forEach(function (c, k) { c.classList.toggle('active', k === i); });
    progress.style.strokeDashoffset = total * (1 - fractions[i]);
  }

  function stopAuto() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  nodes.forEach(function (node, i) {
    node.addEventListener('click', function () { stopAuto(); setActive(i); });
  });

  setActive(0);

  // gently auto-advance through the phases until the visitor interacts
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) {
    timer = setInterval(function () { setActive((active + 1) % nodes.length); }, 3200);
    document.getElementById('journey').addEventListener('pointerdown', stopAuto, { once: true });
  }
})();

/* ===== Contact form -> falfawwaz@mdops.ai via FormSubmit ===== */
const form = document.getElementById('contactForm');
const statusEl = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');

const MSG = {
  sending: { en: 'Sending…', ar: 'جارٍ الإرسال…' },
  ok: {
    en: 'Thank you — your message has been sent. We will get back to you shortly.',
    ar: 'شكرًا لك — تم إرسال رسالتك. سنعاود التواصل معك قريبًا.'
  },
  err: {
    en: 'Something went wrong. Please email us directly at falfawwaz@mdops.ai.',
    ar: 'حدث خطأ ما. يرجى مراسلتنا مباشرة على falfawwaz@mdops.ai.'
  }
};

function setStatus(key, cls) {
  const lang = htmlEl.getAttribute('data-lang');
  statusEl.textContent = MSG[key][lang];
  statusEl.className = 'form-status ' + (cls || '');
}

form.addEventListener('submit', function (e) {
  e.preventDefault();
  setStatus('sending');
  submitBtn.disabled = true;

  fetch('https://formsubmit.co/ajax/falfawwaz@mdops.ai', {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
    body: new FormData(form)
  })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function () {
      setStatus('ok', 'ok');
      form.reset();
    })
    .catch(function () {
      setStatus('err', 'err');
    })
    .finally(function () {
      submitBtn.disabled = false;
    });
});
