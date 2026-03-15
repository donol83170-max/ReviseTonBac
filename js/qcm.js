// ===== MOTEUR DE QCM INTERACTIF =====

class QCM {
  constructor(containerId, questions) {
    this.container = document.getElementById(containerId);
    this.questions = questions;
    this.current = 0;
    this.score = 0;
    this.answered = false;
    if (this.container && this.questions.length > 0) this.render();
  }

  render() {
    this.container.innerHTML = '';
    const q = this.questions[this.current];
    const total = this.questions.length;

    // Progress bar
    const progress = document.createElement('div');
    progress.className = 'qcm-progress';
    progress.innerHTML = `
      <span>Question ${this.current + 1} / ${total}</span>
      <div class="progress-bar"><div class="progress-fill" style="width:${((this.current) / total) * 100}%"></div></div>
    `;
    this.container.appendChild(progress);

    // Question
    const questionEl = document.createElement('div');
    questionEl.className = 'qcm-question';
    questionEl.textContent = q.question;
    this.container.appendChild(questionEl);

    // Options
    const optionsEl = document.createElement('div');
    optionsEl.className = 'qcm-options';

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'qcm-option';
      btn.textContent = opt;
      btn.addEventListener('click', () => this.answer(i, btn, optionsEl, q.correct, q.explanation));
      optionsEl.appendChild(btn);
    });

    this.container.appendChild(optionsEl);

    // Placeholder explication
    const expl = document.createElement('div');
    expl.className = 'qcm-explanation hidden';
    expl.id = 'qcm-expl';
    this.container.appendChild(expl);

    // Bouton suivant
    const nextBtn = document.createElement('button');
    nextBtn.className = 'qcm-next hidden';
    nextBtn.id = 'qcm-next';
    nextBtn.textContent = this.current + 1 < total ? 'Question suivante →' : 'Voir mon score';
    nextBtn.addEventListener('click', () => {
      this.current++;
      if (this.current < this.questions.length) {
        this.render();
      } else {
        this.showScore();
      }
    });
    this.container.appendChild(nextBtn);
  }

  answer(index, btn, optionsEl, correct, explanation) {
    if (this.answered) return;
    this.answered = true;

    const btns = optionsEl.querySelectorAll('.qcm-option');
    btns.forEach((b, i) => {
      b.disabled = true;
      if (i === correct) b.classList.add('correct');
      else if (i === index) b.classList.add('wrong');
    });

    if (index === correct) this.score++;

    const expl = document.getElementById('qcm-expl');
    expl.textContent = explanation;
    expl.classList.remove('hidden');
    expl.classList.add(index === correct ? 'expl-correct' : 'expl-wrong');

    document.getElementById('qcm-next').classList.remove('hidden');
    this.answered = false;
  }

  showScore() {
    const total = this.questions.length;
    const pct = Math.round((this.score / total) * 100);
    let emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪';
    let msg = pct >= 80 ? 'Excellent travail !' : pct >= 50 ? 'Bien joué, continue !' : 'Révise encore un peu !';

    this.container.innerHTML = `
      <div class="qcm-score">
        <div class="score-emoji">${emoji}</div>
        <h3>${msg}</h3>
        <div class="score-number">${this.score} / ${total}</div>
        <div class="score-pct">${pct}%</div>
        <button class="qcm-restart" onclick="location.reload()">Recommencer</button>
      </div>
    `;
  }
}

// Styles injectés dynamiquement
const qcmStyles = `
.qcm-progress { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; font-size: 0.85rem; color: #8888AA; }
.progress-bar { flex: 1; height: 6px; background: #2E2E50; border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #6C63FF, #FF6584); border-radius: 3px; transition: width 0.4s; }
.qcm-question { font-size: 1.15rem; font-weight: 700; margin-bottom: 1.5rem; line-height: 1.5; }
.qcm-options { display: flex; flex-direction: column; gap: 0.7rem; margin-bottom: 1rem; }
.qcm-option {
  background: #1E1E35; border: 2px solid #2E2E50; color: #F0F0FF;
  padding: 0.9rem 1.2rem; border-radius: 12px; font-size: 1rem;
  cursor: pointer; text-align: left; transition: border-color 0.2s, background 0.2s;
}
.qcm-option:hover:not(:disabled) { border-color: #6C63FF; background: rgba(108,99,255,0.1); }
.qcm-option.correct { border-color: #43E97B; background: rgba(67,233,123,0.1); color: #43E97B; }
.qcm-option.wrong { border-color: #FF6584; background: rgba(255,101,132,0.1); color: #FF6584; }
.qcm-explanation { padding: 1rem 1.2rem; border-radius: 12px; font-size: 0.92rem; margin: 0.5rem 0 1rem; line-height: 1.6; }
.qcm-explanation.hidden { display: none; }
.expl-correct { background: rgba(67,233,123,0.1); border-left: 4px solid #43E97B; color: #CCFFDD; }
.expl-wrong { background: rgba(255,101,132,0.1); border-left: 4px solid #FF6584; color: #FFCCDD; }
.qcm-next {
  display: block; width: 100%; padding: 0.9rem;
  background: linear-gradient(135deg, #6C63FF, #FF6584); color: white;
  border: none; border-radius: 12px; font-size: 1rem; font-weight: 700; cursor: pointer;
  transition: opacity 0.2s;
}
.qcm-next:hover { opacity: 0.85; }
.qcm-next.hidden { display: none; }
.qcm-score { text-align: center; padding: 2rem 0; }
.score-emoji { font-size: 4rem; margin-bottom: 1rem; }
.qcm-score h3 { font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem; }
.score-number { font-size: 3rem; font-weight: 900; color: #6C63FF; }
.score-pct { color: #8888AA; margin: 0.3rem 0 2rem; font-size: 1.1rem; }
.qcm-restart {
  padding: 0.8rem 2rem; background: #1E1E35; border: 2px solid #2E2E50;
  color: #F0F0FF; border-radius: 12px; font-size: 1rem; cursor: pointer;
  transition: border-color 0.2s;
}
.qcm-restart:hover { border-color: #6C63FF; }
`;

const styleTag = document.createElement('style');
styleTag.textContent = qcmStyles;
document.head.appendChild(styleTag);
