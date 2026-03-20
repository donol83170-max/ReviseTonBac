// ReviseTonBac — main.js

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAnimations();
  initCookieBanner();
});

// ─── Theme Switcher (Light/Dark) ──────────────────────────────────────────────
function initTheme() {
  const savedTheme = localStorage.getItem('rsb_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  // Injection du bouton dans la nav si non présent
  const navLinks = document.querySelector('.nav-links');
  if (navLinks && !document.getElementById('theme-toggle')) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.className = 'theme-toggle-btn';
    btn.title = 'Changer le thème';
    btn.innerHTML = savedTheme === 'dark' ? 
      '<span class="toggle-icon">☀️</span> Sombre' : 
      '<span class="toggle-icon">🌙</span> Clair';
    btn.onclick = toggleTheme;
    
    li.appendChild(btn);
    
    // On l'insère avant le dernier item (Commencer) ou à la fin
    const lastItem = navLinks.querySelector('li:last-child');
    if (lastItem) {
      navLinks.insertBefore(li, lastItem);
    } else {
      navLinks.appendChild(li);
    }
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('rsb_theme', newTheme);
  
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.innerHTML = newTheme === 'dark' ? 
      '<span class="toggle-icon">☀️</span> Sombre' : 
      '<span class="toggle-icon">🌙</span> Clair';
  }
}

// ─── Cookie Consent Banner ────────────────────────────────────────────────────
function initCookieBanner() {
  const consent = localStorage.getItem('rsb_cookie_consent');
  if (consent) return;

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

window.acceptCookies = function() {
  localStorage.setItem('rsb_cookie_consent', 'true');
  const banner = document.getElementById('cookie-banner');
  if (banner) {
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 600);
  }
};

function initAnimations() {
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
}
