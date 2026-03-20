/**
 * ReviseTonBac — Onboarding Logic & Adaptive Planning
 */

let currentStep = 1;
let userData = {
    subjects: ['Maths'],
    examDate: '2026-06-15',
    hoursPerDay: 2,
    diagnosticResults: {} // topicId -> isCorrect
};

let allCourses = {};
let allDiagnostic = [];

const FREE_TOPICS = ['ma-suites', 'fr-roman', 'hg-sgm'];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check for file:// protocol
    if (window.location.protocol === 'file:') {
        alert("⚠️ ATTENTION : L'onboarding ne peut pas fonctionner en ouvrant le fichier directement. \n\nTu dois utiliser le serveur local : \n1. Lance 'npm run dev' dans ton terminal.\n2. Ouvre http://localhost:3000 dans ton navigateur.");
        document.body.innerHTML = `<div style="padding: 50px; text-align: center; font-family: sans-serif;">
            <h2>🚫 Accès restreint</h2>
            <p>Le site doit être lancé via le serveur local pour fonctionner.</p>
            <p>Utilise : <a href="http://localhost:3000/pages/onboarding.html">http://localhost:3000/pages/onboarding.html</a></p>
        </div>`;
        return;
    }

    try {
        const [courseRes, diagRes] = await Promise.all([
            fetch('../data/courses.json').catch(e => { throw new Error("Impossible de charger les cours. Utilise le serveur local."); }),
            fetch('../data/diagnostic.json').catch(e => { throw new Error("Impossible de charger le diagnostic. Utilise le serveur local."); })
        ]);
        
        if (!courseRes.ok || !diagRes.ok) throw new Error("Erreur lors de la récupération des données.");

        allCourses = await courseRes.json();
        allDiagnostic = await diagRes.json();
        
        // Setup hours slider
        const slider = document.getElementById('hours-per-day');
        const output = document.getElementById('hours-val');
        slider.oninput = function() {
            output.textContent = `${this.value} heure${this.value > 1 ? 's' : ''}`;
            userData.hoursPerDay = parseInt(this.value);
        };
    } catch (e) {
        console.error("Erreur de chargement des données", e);
    }
});

function selectAndNext(subject) {
    userData.subjects = [subject];
    nextStep();
}

function nextStep() {
    if (currentStep === 1) {
        if (userData.subjects.length === 0) return alert("Choisis une matière !");
    }
    
    if (currentStep === 2) {
        userData.examDate = document.getElementById('exam-date').value;
        if (!userData.examDate) return alert("Choisis une date !");
        startDiagnostic();
    }
    
    if (currentStep < 4) {
        goToStep(currentStep + 1);
    }
}

function prevStep() {
    if (currentStep > 1) {
        goToStep(currentStep - 1);
    }
}

function goToStep(step) {
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    currentStep = step;
    document.getElementById(`step-${currentStep}`).classList.add('active');
    document.getElementById('current-step-num').textContent = currentStep;
}

// --- Diagnostic Logic ---
let currentQuestionIndex = 0;
let relevantQuestions = [];

function startDiagnostic() {
    relevantQuestions = allDiagnostic.filter(q => userData.subjects.includes(q.subject));
    currentQuestionIndex = 0;
    showQuestion();
}

function showQuestion() {
    const container = document.getElementById('diagnostic-question-container');
    const q = relevantQuestions[currentQuestionIndex];
    
    // Update progress
    const pct = (currentQuestionIndex / relevantQuestions.length) * 100;
    document.getElementById('diag-progress-fill').style.width = `${pct}%`;

    if (!q) {
        finishDiagnostic();
        return;
    }

    container.innerHTML = `
        <div class="diag-card">
            <div class="diag-question">${q.question}</div>
            <div class="diag-options">
                ${q.options.map((opt, i) => `
                    <button class="diag-opt-btn" onclick="answerQuestion(${i})">${opt}</button>
                `).join('')}
            </div>
        </div>
    `;
}

function answerQuestion(index) {
    const q = relevantQuestions[currentQuestionIndex];
    userData.diagnosticResults[q.topicId] = (index === q.correct);
    
    currentQuestionIndex++;
    showQuestion();
}

function finishDiagnostic() {
    const plan = generatePlan();
    // Pre-calculate and show result
    goToStep(4);
}

// --- Adaptive Planning Algorithm ---
function generatePlan() {
    const today = new Date();
    const exam = new Date(userData.examDate);
    const diffTime = Math.abs(exam - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    document.getElementById('res-days').textContent = diffDays;
    
    // 1. Calculate weighted workload
    let planItems = [];
    userData.subjects.forEach(subject => {
        const topics = allCourses[subject] || [];
        topics.forEach(topic => {
            let gapFactor = 1.2; // Default
            const res = userData.diagnosticResults[topic.id];
            if (res !== undefined) {
                gapFactor = res ? 0.7 : 1.7;
            }
            
            planItems.push({
                ...topic,
                subject,
                adjustedHours: topic.estimated_hours * gapFactor,
                originalHours: topic.estimated_hours * gapFactor
            });
        });
    });

    // 2. Sort: Free topics first for Day 1, then by importance/gap
    planItems.sort((a, b) => {
        const aFree = FREE_TOPICS.includes(a.id);
        const bFree = FREE_TOPICS.includes(b.id);
        if (aFree && !bFree) return -1;
        if (!aFree && bFree) return 1;
        return b.importance - a.importance || b.adjustedHours - a.adjustedHours;
    });

    // 3. Generate Schedule Array
    let schedule = [];
    let itemIdx = 0;
    
    for (let d = 1; d <= diffDays; d++) {
        let dayTasks = [];
        let quota = userData.hoursPerDay;
        
        while (quota > 0 && itemIdx < planItems.length) {
            const item = planItems[itemIdx];
            const workToday = Math.min(item.adjustedHours, quota);
            
            dayTasks.push({
                topicId: item.id,
                title: item.title,
                subject: item.subject,
                hours: parseFloat(workToday.toFixed(1))
            });
            
            item.adjustedHours -= workToday;
            quota -= workToday;
            
            if (item.adjustedHours <= 0) {
                itemIdx++;
            }
        }
        if (dayTasks.length > 0) {
            schedule.push({ day: d, tasks: dayTasks });
        }
    }

    // 4. Update UI (Timeline for first 7 days)
    const timelineContainer = document.getElementById('plan-timeline');
    timelineContainer.innerHTML = '';
    
    schedule.slice(0, 7).forEach(dayData => {
        const itemEl = document.createElement('div');
        itemEl.className = 'timeline-item';
        itemEl.innerHTML = `
            <div class="timeline-day">Jour ${dayData.day}</div>
            <div class="timeline-card">
                ${dayData.tasks.map(t => {
                    const isFree = FREE_TOPICS.includes(t.topicId);
                    return `
                        <div class="timeline-topic">
                            ${t.title}
                            ${isFree ? '<span class="badge-free-mini">Gratuit</span>' : '<span class="badge-premium-mini">Premium</span>'}
                        </div>
                        <div class="timeline-meta">
                            <span>${t.subject}</span>
                            <span>⏱️ ${t.hours}h</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        timelineContainer.appendChild(itemEl);
    });

    // Update remaining days message
    const remaining = diffDays - 7;
    if (remaining > 0) {
        document.getElementById('plan-footer-msg').style.display = 'block';
        document.getElementById('res-remaining-days').textContent = remaining;
    } else {
        document.getElementById('plan-footer-msg').style.display = 'none';
    }

    // 5. Update Sidebar Stats
    const totalNeeded = planItems.reduce((acc, item) => acc + item.originalHours, 0);
    const capacity = diffDays * userData.hoursPerDay;
    const intensity = (totalNeeded / capacity) * 100;
    
    const fill = document.getElementById('intensity-fill');
    fill.style.width = `${Math.min(intensity, 100)}%`;
    
    let intensityText = 'Légère ☕';
    if (intensity > 60) intensityText = 'Modérée ✅';
    if (intensity > 90) intensityText = 'Intense 🚀';
    document.getElementById('res-intensity').textContent = intensityText;

    if (planItems[0]) {
        document.getElementById('res-focus-subject').textContent = planItems[0].subject;
        document.getElementById('res-focus-topic').textContent = planItems[0].title;
    }

    // Return full data for saving
    return {
        createdDate: new Date().getTime(),
        examDate: userData.examDate,
        subjects: userData.subjects,
        hoursPerDay: userData.hoursPerDay,
        schedule: schedule,
        totalTopics: planItems.length
    };
}

function finalizeOnboarding() {
    const plan = generatePlan();
    localStorage.setItem('revise_ton_bac_plan', JSON.stringify(plan));
    window.location.href = 'dashboard.html';
}
