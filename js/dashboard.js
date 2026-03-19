let currentDayIndex = 0;
let userPlan = null;
const FREE_TOPICS = ['ma-suites', 'fr-roman'];

document.addEventListener('DOMContentLoaded', () => {
    const rawPlan = localStorage.getItem('revise_ton_bac_plan');
    if (!rawPlan) {
        window.location.href = 'onboarding.html';
        return;
    }

    userPlan = JSON.parse(rawPlan);
    
    // Detect current day based on progress
    const today = new Date().setHours(0,0,0,0);
    const start = new Date(userPlan.createdDate).setHours(0,0,0,0);
    const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    
    currentDayIndex = Math.max(0, Math.min(diff, userPlan.schedule.length - 1));
    
    initDashboard(userPlan);
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
