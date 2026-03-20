// hamburger.js — Menu mobile
// Chargé avant main.js, expose initHamburger globalement

function initHamburger() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  const btn = document.createElement('button');
  btn.className = 'nav-hamburger';
  btn.setAttribute('aria-label', 'Ouvrir le menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span></span><span></span><span></span>';
  nav.appendChild(btn);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = nav.classList.toggle('nav-open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });

  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      nav.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) {
      nav.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      nav.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}
