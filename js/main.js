// ReviseTonBac — main.js

// ─── Mode admin (raccourci : taper "adminrtb") ────────────────────────────────
(function() {
  let buffer = '';

  document.addEventListener('keydown', (e) => {
    buffer += e.key.toLowerCase();
    if (buffer.length > 10) buffer = buffer.slice(-10);

    if (buffer.endsWith('adminrtb')) {
      const isAdmin = localStorage.getItem('rsb_admin') === '1';
      if (isAdmin) {
        localStorage.removeItem('rsb_admin');
        const badge = document.getElementById('admin-badge');
        if (badge) badge.remove();
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
    badge.innerHTML = '🔑 MODE ADMIN';
    badge.style.cssText = [
      'position:fixed', 'top:1rem', 'right:1rem',
      'background:#ef4444', 'color:white',
      'font-family:monospace', 'font-size:.8rem', 'font-weight:700',
      'padding:.4rem 1rem', 'border-radius:100px',
      'z-index:9999', 'cursor:default',
      'box-shadow:0 4px 12px rgba(239,68,68,.4)',
      'letter-spacing:1px'
    ].join(';');
    document.body.appendChild(badge);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('rsb_admin') === '1') afficherBadgeAdmin();
  });
})();

// Scroll fade-in pour les sections
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.card, .step, .tarif-card, .theme-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity .5s ease, transform .5s ease';
  observer.observe(el);
});

document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }';
  document.head.appendChild(style);

  // Smooth scroll ancres
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});
