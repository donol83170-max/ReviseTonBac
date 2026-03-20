let currentDayIndex = 0;
let userPlan = null;
const ID_MAP = {
    'm1': 'ma-suites', 'm2': 'ma-log', 'm3': 'ma-geo', 'm4': 'ma-probas',
    'f1': 'fr-roman', 'f2': 'fr-poesie', 'f3': 'fr-theatre', 'f4': 'fr-idees'
};
const FREE_TOPICS = ['ma-suites', 'fr-roman', 'hg-sgm'];

document.addEventListener('DOMContentLoaded', () => {
    // Check for file:// protocol
    if (window.location.protocol === 'file:') {
        document.body.innerHTML = `<div style="padding: 50px; text-align: center; font-family: sans-serif; color: white;">
            <h2>🚫 Mode restreint</h2>
            <p>Le tableau de bord nécessite le serveur local pour fonctionner correctement.</p>
            <p>Ouvre cette page ici : <a href="http://localhost:3000/pages/dashboard.html" style="color: #6366f1;">http://localhost:3000/pages/dashboard.html</a></p>
        </div>`;
        return;
    }

    const rawPlan = localStorage.getItem('revise_ton_bac_plan');
    if (!rawPlan) {
        console.warn("Aucun plan trouvé, redirection vers onboarding...");
        window.location.href = 'onboarding.html';
        return;
    }

    try {
        userPlan = JSON.parse(rawPlan);
        console.log("Plan chargé :", userPlan);
        
        // Detect current day
        const today = new Date().setHours(0,0,0,0);
        const createdRaw = userPlan.createdDate || Date.now();
        const start = new Date(createdRaw).setHours(0,0,0,0);
        
        let diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
        if (isNaN(diff)) diff = 0;
        
        currentDayIndex = Math.max(0, Math.min(diff, userPlan.schedule.length - 1));
        console.log("Index du jour :", currentDayIndex);
        
        initDashboard(userPlan);

        // Click handler for Start Session
        const startBtn = document.getElementById('btn-start-task');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                const dayData = userPlan.schedule[currentDayIndex];
                if (dayData && dayData.tasks && dayData.tasks.length > 0) {
                    let topicId = dayData.tasks[0].topicId;
                    console.log("Lancement du cours :", topicId);
                    
                    // Support legacy IDs
                    if (ID_MAP[topicId]) topicId = ID_MAP[topicId];
                    
                    window.location.href = `reader.html?id=${topicId}`;
                } else {
                    console.error("Aucune tâche trouvée pour ce jour :", currentDayIndex);
                    alert("Erreur : Impossible de trouver la tâche prévue. Recommence l'onboarding ?");
                }
            });
        }
    } catch (e) {
        console.error("Erreur lors du chargement du dashboard :", e);
        alert("Une erreur est survenue lors du chargement de ton planning.");
    }
});

function initDashboard(plan) {
    updateDayView();
    
    const today = new Date();
    const exam = new Date(plan.examDate);
    const diffTime = Math.abs(exam - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    document.getElementById('exam-countdown').textContent = `J-${diffDays} avant ton épreuve`;

    // 2. Stats
    document.getElementById('stat-completed').textContent = `${Math.round((currentDayIndex / plan.schedule.length) * 100)}%`; 
}

function updateDayView() {
    const dayData = userPlan.schedule[currentDayIndex];
    if (!dayData) return;

    const isToday = currentDayIndex === Math.floor((new Date().setHours(0,0,0,0) - new Date(userPlan.createdDate).setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
    
    const isFree = FREE_TOPICS.includes(dayData.tasks[0].topicId);
    
    document.querySelector('.tag-today').textContent = isToday ? "Aujourd'hui" : `Jour ${dayData.day}`;
    document.getElementById('today-topic').innerHTML = (isFree ? '' : '<span class="badge-premium-dash">Premium</span> ') + dayData.tasks[0].title;
    document.getElementById('today-details').textContent = `${dayData.tasks[0].subject} — Session de ${dayData.tasks[0].hours}h.`;

    // Update Mini Timeline (next 5 days from current)
    const miniTimeline = document.getElementById('mini-timeline');
    miniTimeline.innerHTML = '';
    
    userPlan.schedule.slice(currentDayIndex + 1, currentDayIndex + 6).forEach(day => {
        const isFree = FREE_TOPICS.includes(day.tasks[0].topicId);
        const dayEl = document.createElement('div');
        dayEl.className = 'mini-day';
        dayEl.innerHTML = `
            <div class="mini-day-title">Jour ${day.day}</div>
            <div class="mini-day-topic">${isFree ? '' : '<span class="badge-premium-mini">Premium</span> '}${day.tasks[0].title}</div>
        `;
        miniTimeline.appendChild(dayEl);
    });
}

function nextDay() {
    if (currentDayIndex < userPlan.schedule.length - 1) {
        currentDayIndex++;
        updateDayView();
    }
}

function prevDay() {
    if (currentDayIndex > 0) {
        currentDayIndex--;
        updateDayView();
    }
}
