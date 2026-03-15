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
      <div class="explication" id="exp-${i}">💡 ${q.explication}</div>
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

  if (answered === total) {
    setTimeout(showResult, 800);
  }
}

function showResult() {
  const resultEl = document.getElementById('result');
  const scoreText = document.getElementById('score-text');
  const msgEl = document.getElementById('result-msg');

  resultEl.classList.remove('hidden');
  scoreText.textContent = `${score} / ${total}`;

  const pct = score / total;
  if (pct === 1) {
    msgEl.textContent = '🏆 Parfait ! Tu maîtrises ce thème à 100%.';
    scoreText.style.color = '#22c55e';
  } else if (pct >= 0.7) {
    msgEl.textContent = '👍 Très bien ! Quelques points à revoir mais c\'est solide.';
    scoreText.style.color = '#f59e0b';
  } else if (pct >= 0.5) {
    msgEl.textContent = '📖 Pas mal, mais relis la fiche de cours pour consolider.';
    scoreText.style.color = '#f97316';
  } else {
    msgEl.textContent = '💪 Courage ! Relis attentivement la fiche et réessaie.';
    scoreText.style.color = '#ef4444';
  }

  resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetQCM() {
  location.reload();
}
