/* ==========================================
   STATE MANAGEMENT & VARIABLES
   ========================================== */
const XP_BASE = 10;
const COMBO_MULTIPLIER_THRESHOLD = 3;

let allQuestions = [];
let currentSession = [];
let currentIndex = 0;
let sessionCorrect = 0;
let sessionXpGained = 0;
let currentCombo = 0;

// User Data Object (Saved to LocalStorage)
let user = {
    xp: 0,
    streak: 0,
    lastActiveDate: null,
    missedQuestionIds: []
};

/* ==========================================
   DOM ELEMENTS
   ========================================== */
// Screens
const dashboardScreen = document.getElementById('dashboard-screen');
const quizScreen = document.getElementById('quiz-screen');
const summaryScreen = document.getElementById('summary-screen');

// Dashboard Stats
const rankEl = document.getElementById('user-rank');
const xpEl = document.getElementById('user-xp');
const streakEl = document.getElementById('user-streak');

// Buttons
const btnStartRandom = document.getElementById('btn-start-random');
const btnReviewWeak = document.getElementById('btn-review-weak');
const btnNextQ = document.getElementById('btn-next-q');
const btnHome = document.getElementById('btn-home');

// Quiz Elements
const qNumEl = document.getElementById('current-q-num');
const totalNumEl = document.getElementById('total-q-num');
const comboTracker = document.getElementById('combo-tracker');
const comboCountEl = document.getElementById('combo-count');
const qCategoryEl = document.getElementById('question-category');
const qTextEl = document.getElementById('question-text');
const choicesContainer = document.getElementById('choices-container');
const explanationBox = document.getElementById('explanation-box');
const resultTitle = document.getElementById('result-title');
const explanationText = document.getElementById('explanation-text');

// Summary Elements
const summaryScore = document.getElementById('summary-score');
const summaryXpGained = document.getElementById('summary-xp-gained');
const missedList = document.getElementById('missed-list');
const missedContainer = document.getElementById('missed-questions-container');

/* ==========================================
   INITIALIZATION
   ========================================== */
document.addEventListener('DOMContentLoaded', async () => {
    loadUserData();
    checkStreak();
    updateDashboardUI();

    try {
        // Fetch the properly named JSON file from your directory
        const response = await fetch('questions.json');
        allQuestions = await response.json();
        
        // Enable buttons once data is loaded
        btnStartRandom.disabled = false;
        if (user.missedQuestionIds.length > 0) {
            btnReviewWeak.disabled = false;
        }
    } catch (error) {
        console.error("Failed to load question bank:", error);
        qTextEl.innerText = "Error loading questions. Are you testing on a local server?";
    }
});

/* ==========================================
   LOCAL STORAGE & GAMIFICATION LOGIC
   ========================================== */
function loadUserData() {
    const saved = localStorage.getItem('iscUserData');
    if (saved) {
        user = JSON.parse(saved);
        
        // Handle migration for users with old saved data structure
        if (!user.missedQuestionIds) {
            user.missedQuestionIds = [];
        }
    }
}

function saveUserData() {
    localStorage.setItem('iscUserData', JSON.stringify(user));
    updateDashboardUI();
}

function checkStreak() {
    const today = new Date().toDateString();
    
    if (user.lastActiveDate) {
        const lastActive = new Date(user.lastActiveDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastActive.toDateString() === yesterday.toDateString()) {
            // Streak continues
            user.streak++;
        } else if (lastActive.toDateString() !== today) {
            // Streak broken
            user.streak = 0;
        }
    } else {
        // First time playing
        user.streak = 1;
    }
    
    user.lastActiveDate = today;
    saveUserData();
}

function updateDashboardUI() {
    xpEl.innerText = user.xp;
    streakEl.innerText = `${user.streak} 🔥`;
    
    // Update Weakness Button
    btnReviewWeak.innerText = `Review Weaknesses (${user.missedQuestionIds.length})`;
    btnReviewWeak.disabled = user.missedQuestionIds.length === 0;

    // Rank Logic based on total XP
    let rank = "Intern";
    if (user.xp >= 5000) rank = "Partner";
    else if (user.xp >= 2500) rank = "Manager";
    else if (user.xp >= 1000) rank = "Senior Auditor";
    else if (user.xp >= 300) rank = "Staff Auditor";
    
    rankEl.innerText = rank;
}

/* ==========================================
   NAVIGATION
   ========================================== */
function showScreen(screenEl) {
    dashboardScreen.classList.add('hidden');
    quizScreen.classList.add('hidden');
    summaryScreen.classList.add('hidden');
    screenEl.classList.remove('hidden');
}

/* ==========================================
   CORE APP LOGIC
   ========================================== */

// Helper to shuffle arrays (Fisher-Yates)
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function startSession(isWeaknessMode = false) {
    sessionCorrect = 0;
    sessionXpGained = 0;
    currentCombo = 0;
    currentIndex = 0;

    if (isWeaknessMode) {
        // Filter the main array to only include missed questions
        let missedData = allQuestions.filter(q => user.missedQuestionIds.includes(q.id));
        currentSession = shuffleArray(missedData).slice(0, 10); // Max 10 at a time
    } else {
        // Random 10 questions
        currentSession = shuffleArray(allQuestions).slice(0, 10);
    }

    totalNumEl.innerText = currentSession.length;
    showScreen(quizScreen);
    loadQuestion();
}

function loadQuestion() {
    const q = currentSession[currentIndex];
    
    // Reset UI
    qNumEl.innerText = currentIndex + 1;
    qCategoryEl.innerText = q.domain;
    qTextEl.innerText = q.question;
    choicesContainer.innerHTML = '';
    explanationBox.classList.add('hidden');
    
    // Manage Combo UI
    if (currentCombo >= COMBO_MULTIPLIER_THRESHOLD) {
        comboTracker.classList.remove('hidden');
        comboCountEl.innerText = currentCombo;
    } else {
        comboTracker.classList.add('hidden');
    }

    // Shuffle and display options
    const shuffledOptions = shuffleArray(q.options);
    shuffledOptions.forEach(opt => {
        const btn = document.createElement('button');
        btn.classList.add('choice-btn');
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(opt, btn, q);
        choicesContainer.appendChild(btn);
    });
}

function handleAnswer(selectedOption, btnEl, questionObj) {
    // Disable all buttons to prevent double clicking
    const allBtns = choicesContainer.querySelectorAll('.choice-btn');
    allBtns.forEach(b => b.disabled = true);

    const isCorrect = selectedOption === questionObj.correct_answer;

    if (isCorrect) {
        btnEl.classList.add('correct');
        resultTitle.innerText = "✅ Correct!";
        resultTitle.style.color = "var(--success-color)";
        
        sessionCorrect++;
        currentCombo++;
        
        // Calculate XP
        let xpEarned = XP_BASE;
        if (currentCombo >= COMBO_MULTIPLIER_THRESHOLD) {
            xpEarned *= 2; // Double XP on hot streaks
        }
        sessionXpGained += xpEarned;
        user.xp += xpEarned;

        // Remove from weaknesses if it was there
        user.missedQuestionIds = user.missedQuestionIds.filter(id => id !== questionObj.id);

    } else {
        btnEl.classList.add('incorrect');
        resultTitle.innerText = "❌ Incorrect";
        resultTitle.style.color = "var(--danger-color)";
        currentCombo = 0; // Reset combo

        // Highlight the correct answer
        allBtns.forEach(b => {
            if (b.innerText === questionObj.correct_answer) {
                b.classList.add('correct');
            }
        });

        // Add to weaknesses if not already there
        if (!user.missedQuestionIds.includes(questionObj.id)) {
            user.missedQuestionIds.push(questionObj.id);
        }
    }

    // Show Explanation
    explanationText.innerText = questionObj.explanation;
    explanationBox.classList.remove('hidden');
    saveUserData();
}

function finishSession() {
    showScreen(summaryScreen);
    
    summaryScore.innerText = `${sessionCorrect} / ${currentSession.length} Correct`;
    summaryXpGained.innerText = `+${sessionXpGained} XP Earned!`;

    // Populate missed list for review
    missedList.innerHTML = '';
    const missedThisSession = currentSession.filter(q => user.missedQuestionIds.includes(q.id));
    
    if (missedThisSession.length > 0) {
        missedContainer.classList.remove('hidden');
        missedThisSession.forEach(q => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${q.domain}:</strong> ${q.question}`;
            missedList.appendChild(li);
        });
    } else {
        missedContainer.classList.add('hidden');
    }
}

/* ==========================================
   EVENT LISTENERS
   ========================================== */
btnStartRandom.addEventListener('click', () => startSession(false));
btnReviewWeak.addEventListener('click', () => startSession(true));

btnNextQ.addEventListener('click', () => {
    currentIndex++;
    if (currentIndex < currentSession.length) {
        loadQuestion();
    } else {
        finishSession();
    }
});

btnHome.addEventListener('click', () => {
    updateDashboardUI();
    showScreen(dashboardScreen);
});