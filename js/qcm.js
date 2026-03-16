// qcm.js — moteur de QCM interactif

let score = 0;
let answered = 0;
let total = 0;

function initQCM(questions) {
  total = questions.length;
  score = 0;
  answered = 0;

  const container = document.getElementById('qcm');
  container.innerHTML = '';
  document.getElementById('result').classList.add('hidden');

  // Cacher le QCM par défaut
  const qcmSection = document.querySelector('.qcm-section');
  qcmSection.style.display = 'none';

  // Bouton "Passer au QCM" à la fin de la fiche
  const ficheSection = document.querySelector('.fiche-section');
  const btnWrap = document.createElement('div');
  btnWrap.className = 'qcm-launch-wrap';
  btnWrap.innerHTML = `
    <div class="qcm-launch-card">
      <div class="qcm-launch-left">
        <div>
          <div class="qcm-launch-title">Teste tes connaissances</div>
          <div class="qcm-launch-meta">
            <span>📝 ${total} questions</span>
            <span>⚡ ~${Math.ceil(total * 0.75)} min</span>
            <span>✅ Corrigé instantanément</span>
          </div>
        </div>
      </div>
      <button class="qcm-launch-btn" onclick="lancerQCM()">
        Lancer le QCM →
      </button>
    </div>
  `;
  ficheSection.appendChild(btnWrap);

  // Panneau score en direct
  const tracker = document.createElement('div');
  tracker.id = 'score-tracker';
  tracker.className = 'score-tracker';
  tracker.innerHTML = `
    <div class="score-tracker-title">Score en direct</div>
    <div class="score-live" id="score-live">0 <span>/ ${total}</span></div>
    <div class="score-stats">
      <div class="score-correct" id="score-correct">✅ 0</div>
      <div class="score-wrong" id="score-wrong">❌ 0</div>
    </div>
    <div class="score-bar-wrap">
      <div class="score-bar-fill" id="score-bar" style="width:0%"></div>
    </div>
    <div class="score-progress" id="score-progress">0 / ${total} répondues</div>
  `;
  document.querySelector('.qcm-section').appendChild(tracker);

  questions.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.id = `q-${i}`;

    card.innerHTML = `
      <div class="question-num">Question ${i + 1} / ${questions.length}</div>
      <div class="question-text">${q.q}</div>
      <div class="options" id="options-${i}">
        ${q.options.map((opt, j) => `
          <button class="option-btn" onclick="answer(${i}, ${j}, ${q.correct}, \`${q.explication}\`)">
            ${opt}
          </button>
        `).join('')}
      </div>
      <div class="explication" id="exp-${i}">💡 ${q.explication}${q.exemple ? `<div class="exemple">📌 <strong>Exemple :</strong> ${q.exemple}</div>` : ''}</div>
    `;

    container.appendChild(card);
  });
}

function answer(qIndex, chosen, correct, explication) {
  const optionsEl = document.getElementById(`options-${qIndex}`);
  const buttons = optionsEl.querySelectorAll('.option-btn');
  const expEl = document.getElementById(`exp-${qIndex}`);

  buttons.forEach(btn => btn.disabled = true);
  buttons[correct].classList.add('correct');

  if (chosen !== correct) {
    buttons[chosen].classList.add('wrong');
  } else {
    score++;
  }

  expEl.classList.add('visible');
  answered++;

  // Mise à jour du score en direct
  const wrong = answered - score;
  document.getElementById('score-live').innerHTML = `${score} <span>/ ${total}</span>`;
  document.getElementById('score-correct').textContent = `✅ ${score}`;
  document.getElementById('score-wrong').textContent = `❌ ${wrong}`;
  document.getElementById('score-progress').textContent = `${answered} / ${total} répondues`;
  document.getElementById('score-bar').style.width = `${(score / total) * 100}%`;

  if (answered === total) {
    setTimeout(showResult, 800);
  }
}

function showResult() {
  const resultEl = document.getElementById('result');
  const pct = score / total;
  const pctInt = Math.round(pct * 100);

  // Messages selon le score
  let msg, couleur, emoji;
  if (score <= 5) {
    emoji = '😬';
    msg = "C'est un début… disons que la fiche de cours n'attend que toi. Courage quand même !";
    couleur = '#ef4444';
  } else if (score <= 10) {
    emoji = '📖';
    msg = "La moitié, c'est pas mal ! Relis les points que tu as ratés et tu seras au top.";
    couleur = '#f97316';
  } else if (score <= 15) {
    emoji = '👏';
    msg = "Beau travail ! Tu maîtrises bien le sujet, encore un petit effort pour être imbattable.";
    couleur = '#f59e0b';
  } else if (score < total) {
    emoji = '🔥';
    msg = "Excellent ! Presque parfait, tu es clairement prêt(e) pour l'épreuve !";
    couleur = '#22c55e';
  } else {
    emoji = '🏆';
    msg = "PARFAIT ! 20/20 — Tu maîtrises ce thème à 100%. Passe au thème suivant !";
    couleur = '#c8a017';
  }

  // Cercle SVG
  const circumference = 2 * Math.PI * 54; // r=54 → ~339
  resultEl.classList.remove('hidden');
  resultEl.innerHTML = `
    <div class="result-circle-wrap">
      <div class="result-circle">
        <svg width="130" height="130" viewBox="0 0 130 130">
          <circle class="rc-bg" cx="65" cy="65" r="54"/>
          <circle class="rc-fill" id="rc-fill" cx="65" cy="65" r="54"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${circumference}"/>
        </svg>
        <div class="rc-pct" id="rc-pct">0%</div>
      </div>
      <div class="rc-score" id="rc-score" style="color:${couleur}">${score} / ${total}</div>
    </div>
    <div class="result-emoji">${emoji}</div>
    <p class="result-msg-text" id="result-msg-text" style="opacity:0">${msg}</p>
    <div class="result-actions" style="opacity:0" id="result-actions">
      <button class="btn-primary" onclick="resetQCM()">Recommencer</button>
      ${score === total ? '<a href="../../pages/maths.html" class="btn-ghost" style="margin-top:.5rem">Thèmes suivants →</a>' : ''}
    </div>
  `;

  resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Animation du cercle
  const fill = document.getElementById('rc-fill');
  const pctEl = document.getElementById('rc-pct');
  const targetOffset = circumference - (pct * circumference);
  let current = 0;
  const duration = 1500;
  const start = performance.now();

  function animateCircle(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    current = Math.round(eased * pctInt);
    fill.style.strokeDashoffset = circumference - (eased * pct * circumference);
    pctEl.textContent = current + '%';

    if (progress < 1) {
      requestAnimationFrame(animateCircle);
    } else {
      // Révèle le message après l'animation
      document.getElementById('result-msg-text').style.transition = 'opacity .5s ease';
      document.getElementById('result-msg-text').style.opacity = '1';
      document.getElementById('result-actions').style.transition = 'opacity .5s ease .2s';
      document.getElementById('result-actions').style.opacity = '1';
    }
  }

  requestAnimationFrame(animateCircle);
}

function lancerQCM() {
  const qcmSection = document.querySelector('.qcm-section');
  const btnWrap = document.querySelector('.qcm-launch-wrap');
  btnWrap.style.display = 'none';
  qcmSection.style.display = 'block';
  qcmSection.style.opacity = '0';
  qcmSection.style.transform = 'translateY(20px)';
  qcmSection.style.transition = 'opacity .5s ease, transform .5s ease';
  requestAnimationFrame(() => {
    qcmSection.style.opacity = '1';
    qcmSection.style.transform = 'translateY(0)';
  });
  setTimeout(() => qcmSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

function resetQCM() {
  location.reload();
}
