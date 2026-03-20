// theme.js — Gestion du thème sombre/clair
// Chargé avant main.js, expose initTheme et toggleTheme globalement

function initTheme() {
  const savedTheme = localStorage.getItem('rsb_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  const navLinks = document.querySelector('.nav-links');
  if (navLinks && !document.getElementById('theme-toggle')) {
    const li  = document.createElement('li');
    const btn = document.createElement('button');
    btn.id        = 'theme-toggle';
    btn.className = 'theme-toggle-btn';
    btn.title     = 'Changer le thème';
    btn.innerHTML = savedTheme === 'dark'
      ? '<span class="toggle-icon">☀️</span> Sombre'
      : '<span class="toggle-icon">🌙</span> Clair';
    btn.addEventListener('click', toggleTheme);
    li.appendChild(btn);

    const lastItem = navLinks.querySelector('li:last-child');
    if (lastItem) navLinks.insertBefore(li, lastItem);
    else navLinks.appendChild(li);
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('rsb_theme', next);

  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.innerHTML = next === 'dark'
      ? '<span class="toggle-icon">☀️</span> Sombre'
      : '<span class="toggle-icon">🌙</span> Clair';
  }
}
