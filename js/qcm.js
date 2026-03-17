// ReviseTonBrevet — qcm.js (Duolingo style)

let _questions = [];
let _current   = 0;
let _score     = 0;

function initQCM(questions) {
  _questions = questions;
  _current   = 0;
  _score     = 0;

  // Cacher la section QCM au départ
  const qcmSection = document.querySelector('.qcm-section');
  qcmSection.style.display = 'none';

  // Bouton "Lancer le QCM" en bas de la fiche
  const ficheSection = document.querySelector('.fiche-section');
  const btnWrap = document.createElement('div');
  btnWrap.className = 'qcm-launch-wrap';
  btnWrap.innerHTML = `
    <div class="qcm-launch-card">
      <div>
        <div class="qcm-launch-title">Teste tes connaissances</div>
        <div class="qcm-launch-meta">
          <span>📝 ${questions.length} questions</span>
          <span>⚡ ~${Math.ceil(questions.length * 0.75)} min</span>
          <span>✅ Corrigé instantanément</span>
        </div>
      </div>
      <button class="qcm-launch-btn" onclick="lancerQCM()">Lancer le QCM →</button>
    </div>
  `;
  ficheSection.appendChild(btnWrap);

  // Construire la structure Duolingo dans #qcm
  const container = document.getElementById('qcm');
  container.innerHTML = `
    <div class="qcm-inner">
      <div class="qcm-top">
        <div class="qcm-progress-wrap">
          <div class="qcm-progress-fill" id="qcm-progress-fill" style="width:0%"></div>
        </div>
        <div class="qcm-counter" id="qcm-counter">1 / ${questions.length}</div>
      </div>
      <div class="qcm-card" id="qcm-card"></div>
    </div>
  `;
}

function showQuestion(index) {
  const q     = _questions[index];
  const total = _questions.length;

  // Barre de progression
  document.getElementById('qcm-progress-fill').style.width = `${(index / total) * 100}%`;
  document.getElementById('qcm-counter').textContent = `${index + 1} / ${total}`;

  const card = document.getElementById('qcm-card');
  card.innerHTML = `
    <div class="question-text">${q.q}</div>
    <div class="options" id="options">
      ${q.options.map((opt, j) => `
        <button class="option-btn" onclick="repondre(${j}, ${q.correct}, \`${q.explication.replace(/`/g, "'")}\`)">
          ${opt}
        </button>
      `).join('')}
    </div>
    <div class="explication" id="explication">💡 ${q.explication}</div>
    <button class="btn-next" id="btn-next" onclick="nextQuestion()">
      ${index + 1 < total ? 'Question suivante →' : 'Voir mon score 🏆'}
    </button>
  `;

  // Animation d'entrée
  card.style.animation = 'none';
  card.offsetHeight;
  card.style.animation = 'fadeInCard .35s ease';
}

function repondre(chosen, correct) {
  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach(btn => btn.disabled = true);

  buttons[correct].classList.add('correct');
  if (chosen !== correct) {
    buttons[chosen].classList.add('wrong');
  } else {
    _score++;
  }

  document.getElementById('explication').classList.add('visible');
  document.getElementById('btn-next').classList.add('visible');
}

function nextQuestion() {
  _current++;
  if (_current < _questions.length) {
    showQuestion(_current);
  } else {
    showResult();
  }
}

function showResult() {
  const total    = _questions.length;
  const pct      = Math.round((_score / total) * 100);
  const nextPage = document.querySelector('.qcm-section').dataset.next || '../../index.html';

  document.getElementById('qcm-progress-fill').style.width = '100%';

  let emoji, msg;
  if (_score <= Math.floor(total * .25))      { emoji = '😬'; msg = "C'est un début… relis la fiche et retente !"; }
  else if (_score <= Math.floor(total * .5))  { emoji = '📖'; msg = "La moitié ! Relis les points ratés, tu vas y arriver."; }
  else if (_score <= Math.floor(total * .75)) { emoji = '👏'; msg = "Beau travail ! Encore un effort pour être imbattable."; }
  else if (_score < total)                    { emoji = '🔥'; msg = "Excellent ! Presque parfait, tu es prêt(e) pour le brevet !"; }
  else                                        { emoji = '🏆'; msg = "PARFAIT ! 20/20 — Tu maîtrises ce thème à 100% !"; }

  document.getElementById('qcm').style.display = 'none';
  const resultEl = document.getElementById('result');
  resultEl.classList.remove('hidden');
  resultEl.innerHTML = `
    <div class="result-emoji">${emoji}</div>
    <div class="result-score">${_score}<span> / ${total}</span></div>
    <div class="result-pct">${pct}%</div>
    <p class="result-msg">${msg}</p>
    <button class="btn-next visible" style="margin-top:1.5rem" onclick="resetQCM()">🔄 Recommencer</button>
    ${_score === total ? `<a href="${nextPage}" class="btn-next-link">Thème suivant →</a>` : ''}
  `;
}

function lancerQCM() {
  document.querySelector('.qcm-launch-wrap').style.display = 'none';
  const qcmSection = document.querySelector('.qcm-section');
  qcmSection.style.display  = 'flex';
  qcmSection.style.opacity  = '0';
  qcmSection.style.transition = 'opacity .4s ease';
  requestAnimationFrame(() => { qcmSection.style.opacity = '1'; });
  setTimeout(() => qcmSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  showQuestion(0);
}

function resetQCM() { location.reload(); }
