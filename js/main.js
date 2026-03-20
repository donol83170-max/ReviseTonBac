// main.js — Coordinateur principal
// theme.js et hamburger.js doivent être chargés avant ce fichier

document.addEventListener('DOMContentLoaded', () => {
  initTheme();      // défini dans theme.js
  initHamburger();  // défini dans hamburger.js
  initAnimations();
  initCookieBanner();
});

// ─── Mode admin (raccourci : taper "adminrtb") ────────────────────────────────
(function () {
  let buffer = '';

  document.addEventListener('keydown', (e) => {
    buffer += e.key.toLowerCase();
    if (buffer.length > 10) buffer = buffer.slice(-10);

    if (buffer.endsWith('adminrtb')) {
      const isAdmin = localStorage.getItem('rsb_admin') === '1';
      if (isAdmin) {
        localStorage.removeItem('rsb_admin');
        document.getElementById('admin-badge')?.remove();
        location.reload();
      } else {
        localStorage.setItem('rsb_admin', '1');
        afficherBadgeAdmin();
        location.reload();
      }
    }
  });

  function afficherBadgeAdmin() {
    if (document.getElementById('admin-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'admin-badge';
    badge.title = 'Retaper "adminrtb" pour désactiver';
    badge.textContent = 'MODE ADMIN';
    badge.style.cssText = [
      'position:fixed', 'top:1rem', 'right:1rem',
      'background:#ef4444', 'color:white',
      'font-family:monospace', 'font-size:.8rem', 'font-weight:700',
      'padding:.4rem 1rem', 'border-radius:100px',
      'z-index:9999', 'cursor:default',
      'box-shadow:0 4px 12px rgba(239,68,68,.4)',
      'letter-spacing:1px',
    ].join(';');
    document.body.appendChild(badge);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('rsb_admin') === '1') afficherBadgeAdmin();
  });
})();

// ─── Cookie Consent Banner ────────────────────────────────────────────────────
function initCookieBanner() {
  if (localStorage.getItem('rsb_cookie_consent')) return;

  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.className = 'cookie-banner';
  banner.innerHTML = `
    <div class="cookie-text">
      Pour financer notre plateforme gratuite et personnaliser ton parcours, nous utilisons des cookies (dont Google AdSense).
      <a href="/pages/politique-confidentialite.html">En savoir plus</a>
    </div>
    <div class="cookie-btns">
      <button class="btn-primary" onclick="acceptCookies()">J'accepte</button>
    </div>
  `;
  document.body.appendChild(banner);
  setTimeout(() => banner.classList.add('visible'), 1000);
}

window.acceptCookies = function () {
  localStorage.setItem('rsb_cookie_consent', 'true');
  const banner = document.getElementById('cookie-banner');
  if (banner) {
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 600);
  }
};

// ─── Animations & smooth scroll ───────────────────────────────────────────────
function initAnimations() {
  const style = document.createElement('style');
  style.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }';
  document.head.appendChild(style);

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}
