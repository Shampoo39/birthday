// Progress Tracker Class
class ProgressTracker {
    constructor() {
        this.visitedPages = new Set();
        this.completedInteractions = new Map();
        this.unlockedSecrets = new Set();
        this.achievements = new Map();
        this.collectibles = new Map();
        this.loadProgress();
    }

    loadProgress() {
        const stored = localStorage.getItem('birthdayProgress');
        if (stored) {
            const progress = JSON.parse(stored);
            this.visitedPages = new Set(progress.visitedPages || []);
            this.completedInteractions = new Map(Object.entries(progress.completedInteractions || {}));
            this.unlockedSecrets = new Set(progress.unlockedSecrets || []);
            this.achievements = new Map(progress.achievements?.map(a => [a.id, a]) || []);
            this.collectibles = new Map(Object.entries(progress.collectibles || {}));
        }
    }

    saveProgress() {
        const progress = {
            visitedPages: Array.from(this.visitedPages),
            completedInteractions: Object.fromEntries(this.completedInteractions),
            unlockedSecrets: Array.from(this.unlockedSecrets),
            achievements: Array.from(this.achievements.values()),
            collectibles: Object.fromEntries(this.collectibles),
            lastVisit: new Date().toISOString()
        };
        localStorage.setItem('birthdayProgress', JSON.stringify(progress));
    }

    markPageVisited(pageId) {
        if (!this.visitedPages.has(pageId)) {
            this.visitedPages.add(pageId);
            this.saveProgress();
            return true; // First visit
        }
        return false; // Already visited
    }

    markInteractionComplete(pageId, interactionId) {
        if (!this.completedInteractions.has(pageId)) {
            this.completedInteractions.set(pageId, new Set());
        }
        const pageInteractions = this.completedInteractions.get(pageId);
        if (!pageInteractions.has(interactionId)) {
            pageInteractions.add(interactionId);
            this.completedInteractions.set(pageId, pageInteractions);
            this.saveProgress();
            return true; // First completion
        }
        return false; // Already completed
    }

    unlockSecret(secretId) {
        if (!this.unlockedSecrets.has(secretId)) {
            this.unlockedSecrets.add(secretId);
            this.saveProgress();
            return true; // First unlock
        }
        return false; // Already unlocked
    }

    addCollectible(pageId, collectibleId) {
        if (!this.collectibles.has(pageId)) {
            this.collectibles.set(pageId, new Set());
        }
        const pageCollectibles = this.collectibles.get(pageId);
        if (!pageCollectibles.has(collectibleId)) {
            pageCollectibles.add(collectibleId);
            this.collectibles.set(pageId, pageCollectibles);
            this.saveProgress();
            return true; // First collection
        }
        return false; // Already collected
    }

    getCompletionPercentage() {
        const totalPages = 4; // gallery, reasons, wishes, games
        const validPages = new Set(['gallery', 'reasons', 'wishes', 'games']);
        const visitedCount = Array.from(this.visitedPages).filter(page => validPages.has(page)).length;
        return Math.round((visitedCount / totalPages) * 100);
    }

    isPageCompleted(pageId) {
        // Define completion criteria for each page
        const completionCriteria = {
            gallery: 2,
            reasons: 3,
            wishes: 1,
            games: 1
        };

        const pageInteractions = this.completedInteractions.get(pageId);
        const required = completionCriteria[pageId] || 1;
        return pageInteractions && pageInteractions.size >= required;
    }
}

// Page Management System
class PageManager {
    constructor() {
        this.currentPage = 'landing';
        this.pageHistory = [];
        this.transitionDuration = 500;
        this.pages = new Map();
        this.progressTracker = new ProgressTracker();
        this.prevCompletionPercentage = 0;
        this.hasShownCompletion = false;
        this.initializePages();
        // Initialize previous completion from stored progress to avoid false celebration on load
        this.prevCompletionPercentage = this.progressTracker.getCompletionPercentage() || 0;
    }

    initializePages() {
        // Register all pages
        this.pages.set('landing', { element: null, title: 'Welcome' });
        this.pages.set('menu', { element: null, title: 'Main Menu' });
        this.pages.set('gallery', { element: null, title: 'Photo Gallery' });
        // removed: memories
        this.pages.set('reasons', { element: null, title: 'Amazing You' });
        this.pages.set('wishes', { element: null, title: 'Birthday Wishes' });
        this.pages.set('games', { element: null, title: 'Play Together' });
        // removed: surprises
    }

    navigateTo(pageId, transitionType = 'slide') {
        if (!this.pages.has(pageId)) {
            console.error(`Page ${pageId} not found`);
            return;
        }

        // Add current page to history if it's not the same page
        if (this.currentPage !== pageId) {
            this.pageHistory.push(this.currentPage);
        }

        const currentPageElement = document.querySelector(`[data-page="${this.currentPage}"]`);
        const targetPageElement = document.querySelector(`[data-page="${pageId}"]`);

        if (currentPageElement && targetPageElement) {
            this.executeTransition(currentPageElement, targetPageElement, transitionType);
        }

        this.currentPage = pageId;
        this.trackProgress(pageId);
        this.updateBackButton();
    }

    goBack() {
        if (this.pageHistory.length > 0) {
            const previousPage = this.pageHistory.pop();
            this.navigateTo(previousPage, 'slideBack');
        }
    }

    executeTransition(fromElement, toElement, transitionType) {
        // Mark transitioning state to prevent background flashes
        try { document.body.classList.add('transitioning'); } catch (e) {}

        // Prepare target page first to avoid background flicker
        toElement.classList.remove('page-hidden');
        toElement.classList.add('page-enter');

        // Begin exit animation slightly after target is visible
        setTimeout(() => {
            fromElement.classList.add('page-exit');
            
            setTimeout(() => {
                fromElement.classList.remove('page-active', 'page-exit');
                fromElement.classList.add('page-hidden');
                try { document.body.classList.remove('transitioning'); } catch (e) {}
            }, this.transitionDuration);
        }, 20);

        // Promote target to active
        setTimeout(() => {
            toElement.classList.remove('page-enter');
            toElement.classList.add('page-active');
        }, 50);
    }

    trackProgress(pageId) {
        const isFirstVisit = this.progressTracker.markPageVisited(pageId);
        if (isFirstVisit && pageId !== 'landing' && pageId !== 'menu') {
            this.unlockAchievement(`first-visit-${pageId}`);
        }
        this.updateMenuProgress();
    }

    updateMenuProgress() {
        // Update menu cards with progress indicators
        const menuCards = document.querySelectorAll('.menu-card');
        const pageIds = ['gallery', 'reasons', 'wishes', 'games'];
        
        menuCards.forEach((card, index) => {
            const pageId = pageIds[index];
            const isVisited = this.progressTracker.visitedPages.has(pageId);
            const isCompleted = this.progressTracker.isPageCompleted(pageId);
            
            // Remove existing indicators
            card.querySelectorAll('.progress-indicator').forEach(indicator => indicator.remove());
            
            // Add new indicator
            const indicator = document.createElement('div');
            indicator.className = 'progress-indicator';
            
            if (isCompleted) {
                indicator.innerHTML = '<i class="fas fa-check-circle"></i>';
                indicator.classList.add('completed');
            } else if (isVisited) {
                indicator.innerHTML = '<i class="fas fa-eye"></i>';
                indicator.classList.add('visited');
            } else {
                indicator.innerHTML = '<i class="fas fa-circle"></i>';
                indicator.classList.add('unvisited');
            }
            
            card.appendChild(indicator);
        });
        
        // Progress bar removed - was causing issues showing 100% immediately
        // this.updateProgressBar();
    }

   

    updateBackButton() {
        const backButton = document.querySelector('.back-button');
        if (backButton) {
            if (this.pageHistory.length > 0 && this.currentPage !== 'landing') {
                backButton.style.display = 'flex';
            } else {
                backButton.style.display = 'none';
            }
        }
    }

    unlockAchievement(achievementId) {
        const achievementData = this.getAchievementData(achievementId);
        if (!this.progressTracker.achievements.has(achievementId)) {
            this.progressTracker.achievements.set(achievementId, {
                id: achievementId,
                title: achievementData.title,
                description: achievementData.description,
                icon: achievementData.icon,
                unlockedAt: new Date().toISOString()
            });
            this.progressTracker.saveProgress();
            this.showAchievementNotification(achievementData);
        }
    }

    getAchievementData(achievementId) {
        const achievements = {
            'first-visit-gallery': {
                title: 'Memory Keeper',
                description: 'Visited the photo gallery',
                icon: '📸'
            },
            'first-visit-reasons': {
                title: 'Heart Warmer',
                description: 'Discovered why you\'re amazing',
                icon: '🌟'
            },
            'first-visit-wishes': {
                title: 'Wish Collector',
                description: 'Read birthday wishes',
                icon: '💕'
            },
            'first-visit-games': {
                title: 'Fun Seeker',
                description: 'Started playing games',
                icon: '🎮'
            },
            
            'surprise-message': {
                title: 'Secret Keeper',
                description: 'Unlocked a secret message',
                icon: '💌'
            },
            'surprise-photo': {
                title: 'Photo Detective',
                description: 'Found the hidden photo',
                icon: '📷'
            },
            'surprise-wish': {
                title: 'Wish Finder',
                description: 'Discovered the special wish',
                icon: '🌟'
            },
            'explorer': {
                title: 'Complete Explorer',
                description: 'Visited all sections!',
                icon: '🏆'
            }
        };
        
        return achievements[achievementId] || {
            title: 'Achievement Unlocked',
            description: 'You did something special!',
            icon: '✨'
        };
    }

    showAchievementNotification(achievementData) {
        // Create achievement notification
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-icon">${achievementData.icon}</div>
                <div class="achievement-text">
                    <div class="achievement-title">${achievementData.title}</div>
                    <div class="achievement-desc">${achievementData.description}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Add celebration effect
        this.createCelebrationEffect();
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 4000);
    }

    createCelebrationEffect() {
        // Create mini confetti burst for achievements
        const colors = ['#ff69b4', '#ff9a9e', '#fecfef', '#ffd700'];
        
        for (let i = 0; i < 15; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.right = '20px';
            confetti.style.top = '100px';
            confetti.style.width = '8px';
            confetti.style.height = '8px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.pointerEvents = 'none';
            confetti.style.zIndex = '10001';
            confetti.style.borderRadius = '50%';
            
            // Set random movement
            const randomX = (Math.random() - 0.5) * 200;
            const randomY = (Math.random() - 0.5) * 200;
            confetti.style.setProperty('--random-x', randomX + 'px');
            confetti.style.setProperty('--random-y', randomY + 'px');
            confetti.style.animation = `achievementConfetti ${Math.random() * 2 + 1}s ease-out forwards`;
            
            document.body.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 3000);
        }
    }

    showCompletionCelebration() {
        // Special celebration for 100% completion
        const celebration = document.createElement('div');
        celebration.className = 'completion-celebration';
        celebration.innerHTML = `
            <div class="celebration-content">
                <h2>🎉 Congratulations! 🎉</h2>
                <p>You've explored everything!</p>
                <p>You're the most amazing explorer! 💕</p>
            </div>
        `;
        
        document.body.appendChild(celebration);
        
        // Create big confetti explosion
        createConfetti();
        
        setTimeout(() => {
            celebration.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            celebration.classList.remove('show');
            setTimeout(() => {
                celebration.remove();
            }, 500);
        }, 5000);
    }
}

// Initialize Page Manager
const pageManager = new PageManager();

// Animation Controller (reduced motion support)
const AnimationController = {
    prefersReduced: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    enableAnimations() {
        this.prefersReduced = false;
        document.documentElement.classList.remove('reduce-motion');
    },
    disableAnimations() {
        this.prefersReduced = true;
        document.documentElement.classList.add('reduce-motion');
    }
};

// Audio Controller (SFX toggle)
const AudioController = {
    enabled: true,
    _ctx: null,
    _ensureCtx() { if (!this._ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this._ctx = new AC(); } },
    _beep(freq = 880, duration = 0.05, type = 'sine', gain = 0.05) {
        if (!this.enabled) return;
        this._ensureCtx();
        if (!this._ctx) return;
        const ctx = this._ctx;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.value = gain;
        o.connect(g); g.connect(ctx.destination);
        const now = ctx.currentTime;
        o.start(now);
        o.stop(now + duration);
    },
    playClick() { this._beep(680, 0.04, 'triangle', 0.03); },
    playSuccess() { this._beep(1040, 0.08, 'sine', 0.06); setTimeout(()=>this._beep(1320,0.08,'sine',0.05), 60); },
    toggle() {
        this.enabled = !this.enabled;
        const t = document.getElementById('soundToggle');
        if (t) {
            t.innerHTML = this.enabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
        }
    }
};

// Initialize AOS (Animate On Scroll)
AOS.init({
    duration: 1000,
    easing: 'ease-in-out',
    once: true,
    offset: 100
});

// Konami code to unlock secret page
(function setupKonami() {
    const code = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    const buffer = [];
    window.addEventListener('keydown', (e) => {
        buffer.push(e.key);
        if (buffer.length > code.length) buffer.shift();
        if (code.every((k, i) => buffer[i]?.toLowerCase() === k.toLowerCase())) {
            announce('Secret unlocked!');
            pageManager.unlockAchievement('secret-explorer');
            pageManager.navigateTo('secret');
        }
    });
})();

// Loading Animation
window.addEventListener('load', function() {
    setTimeout(() => {
        const loader = document.getElementById('loader');
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
            startFloatingElements();
            // Initialize page system
            pageManager.updateBackButton();
            // Restore celebration shown state this session
            try {
                pageManager.hasShownCompletion = !!sessionStorage.getItem('completionCelebrationShown');
            } catch (e) {}
        }, 500);
    }, 2000);
});

// Floating Hearts Animation
function startFloatingElements() {
    createFloatingHearts();
    createSparkles();
}

function createFloatingHearts() {
    const heartsContainer = document.querySelector('.floating-hearts');
    
    setInterval(() => {
        const heart = document.createElement('div');
        heart.innerHTML = '💕';
        heart.style.position = 'absolute';
        heart.style.left = Math.random() * 100 + '%';
        heart.style.top = '100%';
        heart.style.fontSize = Math.random() * 20 + 15 + 'px';
        heart.style.opacity = Math.random() * 0.5 + 0.3;
        heart.style.pointerEvents = 'none';
        heart.style.animation = `floatUp ${Math.random() * 3 + 4}s linear forwards`;
        
        heartsContainer.appendChild(heart);
        
        setTimeout(() => {
            heart.remove();
        }, 7000);
    }, 3000);
}

function createSparkles() {
    const sparklesContainer = document.querySelector('.sparkles');
    
    setInterval(() => {
        const sparkle = document.createElement('div');
        sparkle.innerHTML = '✨';
        sparkle.style.position = 'absolute';
        sparkle.style.left = Math.random() * 100 + '%';
        sparkle.style.top = Math.random() * 100 + '%';
        sparkle.style.fontSize = Math.random() * 15 + 10 + 'px';
        sparkle.style.opacity = Math.random() * 0.8 + 0.2;
        sparkle.style.pointerEvents = 'none';
        sparkle.style.animation = `sparkle ${Math.random() * 2 + 1}s ease-in-out forwards`;
        
        sparklesContainer.appendChild(sparkle);
        
        setTimeout(() => {
            sparkle.remove();
        }, 3000);
    }, 1500);
}

// CSS Animations for floating elements
const style = document.createElement('style');
style.textContent = `
    @keyframes floatUp {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.7;
        }
        100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
        }
    }
    
    @keyframes sparkle {
        0%, 100% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
        }
        50% {
            transform: scale(1) rotate(180deg);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Sound effects toggle
const soundToggle = document.getElementById('soundToggle');
if (soundToggle) {
    soundToggle.addEventListener('click', () => AudioController.toggle());
}

// Page Navigation Initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize page system
    pageManager.updateBackButton();
    pageManager.updateMenuProgress();
    
    // Add click sound effects to interactive elements
    const interactiveElements = document.querySelectorAll('.menu-card, .enter-button, .back-button');
    interactiveElements.forEach(element => {
        element.addEventListener('click', function() {
            // Add click animation
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
    
    // Music toggle functionality
    const musicToggle = document.getElementById('musicToggle');
    const backgroundMusic = document.getElementById('backgroundMusic');
    let isMusicPlaying = false;
    
    if (musicToggle && backgroundMusic) {
        // Set initial state
        musicToggle.style.opacity = '1';
        musicToggle.style.cursor = 'pointer';
        musicToggle.title = 'Toggle Background Music';
        
        musicToggle.addEventListener('click', function() {
            if (isMusicPlaying) {
                // Pause music
                backgroundMusic.pause();
                musicToggle.innerHTML = '<i class="fas fa-music"></i>';
                musicToggle.style.opacity = '0.6';
                isMusicPlaying = false;
                announce('Music paused');
            } else {
                // Play music
                backgroundMusic.play().catch(e => {
                    console.log('Audio play failed:', e);
                    announce('Music file not found - add your music to /music/ folder');
                });
                musicToggle.innerHTML = '<i class="fas fa-pause"></i>';
                musicToggle.style.opacity = '1';
                isMusicPlaying = true;
                announce('Music playing');
            }
        });
        
        // Auto-start music after user interaction (browsers require user gesture)
        document.addEventListener('click', function startMusicOnFirstClick() {
            if (!isMusicPlaying) {
                backgroundMusic.play().catch(e => console.log('Auto-play failed:', e));
                if (!backgroundMusic.paused) {
                    musicToggle.innerHTML = '<i class="fas fa-pause"></i>';
                    isMusicPlaying = true;
                }
            }
            document.removeEventListener('click', startMusicOnFirstClick);
        }, { once: true });
    }
});

// Typewriter Effect
const typewriterText = document.getElementById('typewriter-text');
const messages = [
    "Dear beautiful soul, on this special day...",
    "I want you to know how grateful I am for your friendship...",
    "You bring so much joy and light into my life...",
    "May this new year of your life be filled with endless happiness...",
    "Here's to many more years of amazing friendship! 💕"
];

let messageIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeWriter() {
    const currentMessage = messages[messageIndex];
    
    if (isDeleting) {
        typewriterText.textContent = currentMessage.substring(0, charIndex - 1);
        charIndex--;
    } else {
        typewriterText.textContent = currentMessage.substring(0, charIndex + 1);
        charIndex++;
    }
    
    let typeSpeed = isDeleting ? 50 : 100;
    
    if (!isDeleting && charIndex === currentMessage.length) {
        typeSpeed = 2000;
        isDeleting = true;
        
        // Mark completion after first full message
        if (messageIndex === 0 && !typewriterCompleted) {
            setTimeout(() => {
                markTypewriterComplete();
            }, 1000);
        }
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        messageIndex = (messageIndex + 1) % messages.length;
        typeSpeed = 500;
    }
    
    setTimeout(typeWriter, typeSpeed);
}

// Start typewriter when wishes page is visited
function startTypewriterOnWishesPage() {
    const typewriterText = document.getElementById('typewriter-text');
    if (typewriterText && pageManager.currentPage === 'wishes') {
        setTimeout(typeWriter, 1000);
    }
}

// Enhanced page navigation with typewriter trigger
const originalNavigateTo = pageManager.navigateTo;
pageManager.navigateTo = function(pageId, transitionType = 'slide') {
    originalNavigateTo.call(this, pageId, transitionType);
    
    // Trigger typewriter on wishes page
    if (pageId === 'wishes') {
        setTimeout(startTypewriterOnWishesPage, 600);
    }
    
    // Initialize gallery features
    if (pageId === 'gallery') {
        // Gallery initialized
    }
    
    // removed: memories page hooks
    
    // Initialize reasons page features
    if (pageId === 'reasons') {
        // Reasons page initialized
    }
    
    // Initialize wishes page features
    if (pageId === 'wishes') {
        setTimeout(() => {
            // Reset counters for fresh experience
            candlesBlown = 0;
            wishBubblesPopped = 0;
            updateWishesCounter();
        }, 300);
    }
    
    // Initialize games page features
    if (pageId === 'games') {
        setTimeout(() => {
            // Reset to games menu
            backToGamesMenu();
            
            // Check for completed games achievements
            const gameInteractions = this.progressTracker.completedInteractions.get('games');
            if (gameInteractions) {
                // Show achievement indicators for completed games
                if (gameInteractions.has('completed-quiz')) {
                    const quizOption = document.querySelector('.game-option[onclick*="quiz"]');
                    if (quizOption && !quizOption.querySelector('.completed-badge')) {
                        const badge = document.createElement('div');
                        badge.className = 'completed-badge';
                        badge.innerHTML = '✅';
                        badge.style.position = 'absolute';
                        badge.style.top = '10px';
                        badge.style.right = '10px';
                        badge.style.fontSize = '1.5rem';
                        quizOption.style.position = 'relative';
                        quizOption.appendChild(badge);
                    }
                }
                
                if (gameInteractions.has('completed-memory')) {
                    const memoryOption = document.querySelector('.game-option[onclick*="memory"]');
                    if (memoryOption && !memoryOption.querySelector('.completed-badge')) {
                        const badge = document.createElement('div');
                        badge.className = 'completed-badge';
                        badge.innerHTML = '✅';
                        badge.style.position = 'absolute';
                        badge.style.top = '10px';
                        badge.style.right = '10px';
                        badge.style.fontSize = '1.5rem';
                        memoryOption.style.position = 'relative';
                        memoryOption.appendChild(badge);
                    }
                }
                
                if (gameInteractions.has('completed-word')) {
                    const wordOption = document.querySelector('.game-option[onclick*="word"]');
                    if (wordOption && !wordOption.querySelector('.completed-badge')) {
                        const badge = document.createElement('div');
                        badge.className = 'completed-badge';
                        badge.innerHTML = '✅';
                        badge.style.position = 'absolute';
                        badge.style.top = '10px';
                        badge.style.right = '10px';
                        badge.style.fontSize = '1.5rem';
                        wordOption.style.position = 'relative';
                        wordOption.appendChild(badge);
                    }
                }
                
                if (gameInteractions.has('completed-guess')) {
                    const guessOption = document.querySelector('.game-option[onclick*="guess"]');
                    if (guessOption && !guessOption.querySelector('.completed-badge')) {
                        const badge = document.createElement('div');
                        badge.className = 'completed-badge';
                        badge.innerHTML = '✅';
                        badge.style.position = 'absolute';
                        badge.style.top = '10px';
                        badge.style.right = '10px';
                        badge.style.fontSize = '1.5rem';
                        guessOption.style.position = 'relative';
                        guessOption.appendChild(badge);
                    }
                }
            }
        }, 300);
    }
    
    // removed: surprises page hooks
    
    // Update progress when returning to menu
    if (pageId === 'menu') {
        setTimeout(() => this.updateMenuProgress(), 300);
    }
};

// Global keyboard activation for buttons/cards
document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement) {
        const el = document.activeElement;
        if (el instanceof HTMLElement && (el.onclick || el.getAttribute('onclick'))) {
            e.preventDefault();
            el.click();
        }
    }
});

// Enhanced Games System
let gamesCompleted = new Set();
let currentGame = null;

// Quiz Game
const quizQuestions = [
    {
        question: "What's my favorite thing about our friendship?",
        options: [
            "How we can talk for hours",
            "Our inside jokes", 
            "How we support each other",
            "All of the above! 💕"
        ],
        correct: 3
    },
    {
        question: "What do I love most about you?",
        options: [
            "Your amazing sense of humor",
            "Your kind and caring heart",
            "Your incredible strength", 
            "Everything about you! ✨"
        ],
        correct: 3
    },
    {
        question: "What's our friendship superpower?",
        options: [
            "Making each other laugh",
            "Being there through everything",
            "Understanding without words",
            "All of these and more! 🌟"
        ],
        correct: 3
    },
    {
        question: "What's the best part of our adventures?",
        options: [
            "The spontaneous moments",
            "Getting lost together",
            "The inside jokes we create",
            "All of the above! 🌟"
        ],
        correct: 3
    },
    {
        question: "How do you know I care about you?",
        options: [
            "I remember the little things",
            "I'm always there to listen",
            "I celebrate your wins",
            "All of these ways! 💕"
        ],
        correct: 3
    }
];

let currentQuestionIndex = 0;
let quizScore = 0;

function startGame(gameType) {
    currentGame = gameType;
    
    // Hide games menu
    document.querySelector('.games-menu').style.display = 'none';
    
    // Show selected game
    document.getElementById(`${gameType}-game`).style.display = 'block';
    
    // Initialize game
    switch(gameType) {
        case 'quiz':
            initQuiz();
            break;
        case 'memory':
            initMemoryGame();
            break;
        case 'wordsearch':
            initWordSearch();
            break;
        case 'guessing':
            initGuessingGame();
            break;
    }
}

function backToGamesMenu() {
    // Hide all games
    document.querySelectorAll('.game-container').forEach(game => {
        game.style.display = 'none';
    });
    
    // Show games menu
    document.querySelector('.games-menu').style.display = 'grid';
    currentGame = null;
}

function initQuiz() {
    currentQuestionIndex = 0;
    quizScore = 0;
    document.getElementById('question-number').textContent = '1';
    document.getElementById('total-questions').textContent = quizQuestions.length;
    loadQuestion();
}

function loadQuestion() {
    const question = quizQuestions[currentQuestionIndex];
    document.getElementById('question-text').textContent = question.question;
    document.getElementById('question-number').textContent = currentQuestionIndex + 1;
    
    const optionButtons = document.querySelectorAll('#quiz-game .option-btn');
    optionButtons.forEach((btn, index) => {
        btn.textContent = question.options[index];
        btn.onclick = () => selectAnswer(index);
        btn.disabled = false;
        btn.classList.remove('correct', 'incorrect');
    });
    
    document.querySelector('#quiz-game .question-container').style.display = 'block';
    document.getElementById('quiz-result').style.display = 'none';
    document.getElementById('quiz-final').style.display = 'none';
}

function selectAnswer(answerIndex) {
    const question = quizQuestions[currentQuestionIndex];
    const optionButtons = document.querySelectorAll('#quiz-game .option-btn');
    
    // Disable all buttons
    optionButtons.forEach(btn => btn.disabled = true);
    
    // Show correct/incorrect
    if (answerIndex === question.correct) {
        optionButtons[answerIndex].classList.add('correct');
        quizScore++;
    } else {
        optionButtons[answerIndex].classList.add('incorrect');
        optionButtons[question.correct].classList.add('correct');
    }
    
    // Show result
    setTimeout(() => {
        document.querySelector('#quiz-game .question-container').style.display = 'none';
        document.getElementById('quiz-result').style.display = 'block';
        createConfetti();
    }, 1500);
}

function nextQuestion() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex >= quizQuestions.length) {
        // Quiz complete
        document.getElementById('quiz-result').style.display = 'none';
        document.getElementById('final-score').textContent = quizScore;
        document.getElementById('quiz-final').style.display = 'block';
        
        // Mark quiz as completed
        completeGame('quiz');
    } else {
        loadQuestion();
    }
}

// Memory Match Game
const memoryCards = [
    { id: 1, emoji: '🏖️', name: 'Beach' },
    { id: 2, emoji: '😂', name: 'Laughter' },
    { id: 3, emoji: '🌟', name: 'Adventure' },
    { id: 4, emoji: '💕', name: 'Love' },
    { id: 5, emoji: '🎭', name: 'Fun' },
    { id: 6, emoji: '🌈', name: 'Joy' }
];

let memoryGameCards = [];
let flippedCards = [];
let matchedPairs = 0;
let moveCount = 0;

function initMemoryGame() {
    // Create pairs
    memoryGameCards = [...memoryCards, ...memoryCards].sort(() => Math.random() - 0.5);
    flippedCards = [];
    matchedPairs = 0;
    moveCount = 0;
    
    updateMemoryStats();
    createMemoryGrid();
}

function createMemoryGrid() {
    const grid = document.getElementById('memory-grid');
    grid.innerHTML = '';
    
    memoryGameCards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'memory-card';
        cardElement.dataset.cardId = card.id;
        cardElement.dataset.index = index;
        cardElement.innerHTML = `
            <div class="card-front">?</div>
            <div class="card-back">${card.emoji}</div>
        `;
        cardElement.onclick = () => flipMemoryCard(index);
        grid.appendChild(cardElement);
    });
}

function flipMemoryCard(index) {
    const card = document.querySelector(`[data-index="${index}"]`);
    
    if (card.classList.contains('flipped') || card.classList.contains('matched') || flippedCards.length >= 2) {
        return;
    }
    
    card.classList.add('flipped');
    flippedCards.push({ index, id: memoryGameCards[index].id });
    
    if (flippedCards.length === 2) {
        moveCount++;
        updateMemoryStats();
        
        setTimeout(() => {
            checkMemoryMatch();
        }, 1000);
    }
}

function checkMemoryMatch() {
    const [card1, card2] = flippedCards;
    
    if (card1.id === card2.id) {
        // Match found
        document.querySelector(`[data-index="${card1.index}"]`).classList.add('matched');
        document.querySelector(`[data-index="${card2.index}"]`).classList.add('matched');
        matchedPairs++;
        
        if (matchedPairs === memoryCards.length) {
            // Game complete
            setTimeout(() => {
                document.getElementById('final-moves').textContent = moveCount;
                document.getElementById('memory-complete').style.display = 'block';
                completeGame('memory');
            }, 500);
        }
    } else {
        // No match - flip cards back
        setTimeout(() => {
            document.querySelector(`[data-index="${card1.index}"]`).classList.remove('flipped');
            document.querySelector(`[data-index="${card2.index}"]`).classList.remove('flipped');
        }, 1000);
    }
    
    flippedCards = [];
}

function updateMemoryStats() {
    document.getElementById('matches-found').textContent = matchedPairs;
    document.getElementById('move-count').textContent = moveCount;
}

function resetMemoryGame() {
    initMemoryGame();
}

// Word Search Game Functions
function initWordSearch() {
    wordsFound = 0;
    generateWordGrid();
    generateWordList();
    document.getElementById('words-found-count').textContent = '0';
    document.getElementById('word-complete').style.display = 'none';
}

function generateWordGrid() {
    const grid = document.getElementById('word-grid');
    grid.innerHTML = '';
    
    // Create 10x10 grid
    const gridSize = 10;
    const gridArray = Array(gridSize).fill().map(() => Array(gridSize).fill(''));
    
    // Place words in grid (simplified - horizontal only for this demo)
    friendshipWords.forEach((word, wordIndex) => {
        const row = Math.floor(Math.random() * gridSize);
        const startCol = Math.floor(Math.random() * (gridSize - word.length));
        
        for (let i = 0; i < word.length; i++) {
            gridArray[row][startCol + i] = word[i];
        }
    });
    
    // Fill empty spaces with random letters
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            if (gridArray[row][col] === '') {
                gridArray[row][col] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
            }
        }
    }
    
    // Create grid elements
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const cell = document.createElement('div');
            cell.className = 'word-cell';
            cell.textContent = gridArray[row][col];
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.onclick = () => selectWordCell(row, col);
            grid.appendChild(cell);
        }
    }
}

function generateWordList() {
    const wordList = document.getElementById('word-list');
    wordList.innerHTML = '';
    
    friendshipWords.forEach(word => {
        const wordItem = document.createElement('div');
        wordItem.className = 'word-item';
        wordItem.textContent = word;
        wordItem.dataset.word = word;
        wordList.appendChild(wordItem);
    });
}

function selectWordCell(row, col) {
    // Simplified word selection - just mark words as found when clicked
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    const letter = cell.textContent;
    
    // Check if this letter starts any unfound word
    friendshipWords.forEach(word => {
        if (word[0] === letter && !document.querySelector(`[data-word="${word}"].found`)) {
            markWordFound(word);
        }
    });
}

function markWordFound(word) {
    const wordItem = document.querySelector(`[data-word="${word}"]`);
    if (!wordItem.classList.contains('found')) {
        wordItem.classList.add('found');
        wordsFound++;
        document.getElementById('words-found-count').textContent = wordsFound;
        
        if (wordsFound >= friendshipWords.length) {
            setTimeout(() => {
                document.getElementById('word-complete').style.display = 'block';
                pageManager.progressTracker.markInteractionComplete('games', 'completed-word');
                pageManager.unlockAchievement('word-finder');
            }, 500);
        }
    }
}

// Guess the Memory Game Functions
function initGuessGame() {
    currentGuessQuestion = 0;
    guessScore = 0;
    document.getElementById('guess-score').textContent = '0';
    loadGuessQuestion();
    document.querySelector('.guess-container').style.display = 'block';
    document.getElementById('guess-result').style.display = 'none';
    document.getElementById('guess-complete').style.display = 'none';
}

function loadGuessQuestion() {
    const question = guessQuestions[currentGuessQuestion];
    document.getElementById('memory-clue-text').textContent = question.clue;
    const guessButtons = document.querySelectorAll('.guess-btn');
    guessButtons.forEach((btn, index) => {
        btn.textContent = question.options[index];
        btn.onclick = () => guessMemory(index);
        btn.disabled = false;
        btn.style.background = '';
    });
}

function guessMemory(answerIndex) {
    const question = guessQuestions[currentGuessQuestion];
    const guessButtons = document.querySelectorAll('.guess-btn');
    
    // Disable all buttons
    guessButtons.forEach(btn => btn.disabled = true);
    
    // Highlight correct answer
    guessButtons[question.correct].style.background = '#4CAF50';
    
    if (answerIndex === question.correct) {
        guessScore++;
        document.getElementById('guess-score').textContent = guessScore;
        guessButtons[answerIndex].style.background = '#4CAF50';
        document.getElementById('guess-result-title').textContent = 'Correct! 🎉';
    } else {
        guessButtons[answerIndex].style.background = '#f44336';
        document.getElementById('guess-result-title').textContent = 'Not quite! 😊';
    }
    
    document.getElementById('guess-result-text').textContent = question.explanation;
    
    // Show result
    document.querySelector('.guess-container').style.display = 'none';
    document.getElementById('guess-result').style.display = 'block';
    
    if (answerIndex === question.correct) {
        createGameConfetti();
    }
}

function nextGuessQuestion() {
    currentGuessQuestion++;
    
    if (currentGuessQuestion < guessQuestions.length) {
        loadGuessQuestion();
        document.querySelector('.guess-container').style.display = 'block';
        document.getElementById('guess-result').style.display = 'none';
    } else {
        // Game complete
        document.getElementById('guess-result').style.display = 'none';
        document.getElementById('guess-complete').style.display = 'block';
        document.getElementById('final-guess-score').textContent = guessScore;
        
        // Track completion
        pageManager.progressTracker.markInteractionComplete('games', 'completed-guess');
        if (guessScore >= 4) {
            pageManager.unlockAchievement('memory-keeper');
        }
    }
}

function createGameConfetti() {
    if (AnimationController.prefersReduced) return;
    const colors = ['#ff69b4', '#ff9a9e', '#fecfef', '#ffd700', '#98fb98'];
    
    for (let i = 0; i < 20; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.width = '8px';
        confetti.style.height = '8px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '10001';
        confetti.style.borderRadius = '50%';
        confetti.style.animation = `confettiFall ${Math.random() * 3 + 2}s linear forwards`;
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
}

function updateMemoryStats() {
    document.getElementById('move-count').textContent = moveCount;
    document.getElementById('match-count').textContent = matchedPairs;
}

// Word Search Game
const friendshipWords = ['FRIEND', 'LOVE', 'JOY', 'LAUGH', 'TRUST', 'CARE'];
let wordsFound = new Set();

function initWordSearch() {
    wordsFound.clear();
    createWordSearchGrid();
    createWordList();
}

function createWordList() {
    const wordList = document.getElementById('word-list');
    wordList.innerHTML = '';
    
    friendshipWords.forEach(word => {
        const wordElement = document.createElement('div');
        wordElement.className = 'word-item';
        wordElement.textContent = word;
        wordElement.id = `word-${word}`;
        wordList.appendChild(wordElement);
    });
}

function createWordSearchGrid() {
    const grid = document.getElementById('wordsearch-grid');
    grid.innerHTML = '';
    
    // Simple 8x8 grid with words placed horizontally
    const gridSize = 8;
    const letters = [];
    
    // Initialize with random letters
    for (let i = 0; i < gridSize * gridSize; i++) {
        letters.push(String.fromCharCode(65 + Math.floor(Math.random() * 26)));
    }
    
    // Place words horizontally
    friendshipWords.forEach((word, wordIndex) => {
        const row = wordIndex;
        const startCol = Math.floor(Math.random() * (gridSize - word.length));
        
        for (let i = 0; i < word.length; i++) {
            letters[row * gridSize + startCol + i] = word[i];
        }
    });
    
    // Create grid elements
    letters.forEach((letter, index) => {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.textContent = letter;
        cell.dataset.index = index;
        cell.onclick = () => selectGridCell(index);
        grid.appendChild(cell);
    });
}

function selectGridCell(index) {
    const cell = document.querySelector(`[data-index="${index}"]`);
    cell.classList.toggle('selected');
    
    // Check for word completion (simplified)
    checkWordCompletion();
}

function checkWordCompletion() {
    // Simplified word finding - in a real implementation, you'd check for actual word patterns
    const selectedCells = document.querySelectorAll('.grid-cell.selected');
    
    if (selectedCells.length >= 4) {
        // Mark a word as found (simplified)
        const wordToFind = friendshipWords.find(word => !wordsFound.has(word));
        if (wordToFind) {
            wordsFound.add(wordToFind);
            document.getElementById(`word-${wordToFind}`).classList.add('found');
            
            // Clear selection
            selectedCells.forEach(cell => cell.classList.remove('selected'));
            
            if (wordsFound.size === friendshipWords.length) {
                setTimeout(() => {
                    document.getElementById('wordsearch-complete').style.display = 'block';
                    completeGame('wordsearch');
                }, 500);
            }
        }
    }
}

// Guess the Memory Game
const memoryClues = [
    {
        clue: "This memory involves laughter and a rainy day...",
        options: ["Beach Adventure", "Dancing in the Rain", "Movie Night", "Road Trip"],
        correct: 1
    },
    {
        clue: "We built something together by the water...",
        options: ["Sandcastles at Beach", "Tree House", "Snowman", "Puzzle"],
        correct: 0
    },
    {
        clue: "We got lost but found something beautiful...",
        options: ["Shopping Mall", "Hidden Waterfall", "Restaurant", "Library"],
        correct: 1
    },
    {
        clue: "This involved lots of snacks and entertainment...",
        options: ["Hiking", "Movie Marathon", "Swimming", "Dancing"],
        correct: 1
    }
];

let currentMemoryIndex = 0;
let memoryScore = 0;

function initGuessingGame() {
    currentMemoryIndex = 0;
    memoryScore = 0;
    loadMemoryClue();
}

function loadMemoryClue() {
    const memory = memoryClues[currentMemoryIndex];
    document.getElementById('memory-clue').textContent = memory.clue;
    
    const guessButtons = document.querySelectorAll('.guess-btn');
    guessButtons.forEach((btn, index) => {
        btn.textContent = memory.options[index];
        btn.onclick = () => guessMemory(index);
        btn.disabled = false;
        btn.classList.remove('correct', 'incorrect');
    });
    
    document.querySelector('.guess-options').style.display = 'grid';
    document.getElementById('guess-result').style.display = 'none';
    document.getElementById('guessing-complete').style.display = 'none';
}

function guessMemory(guessIndex) {
    const memory = memoryClues[currentMemoryIndex];
    const guessButtons = document.querySelectorAll('.guess-btn');
    
    guessButtons.forEach(btn => btn.disabled = true);
    
    if (guessIndex === memory.correct) {
        guessButtons[guessIndex].classList.add('correct');
        memoryScore++;
    } else {
        guessButtons[guessIndex].classList.add('incorrect');
        guessButtons[memory.correct].classList.add('correct');
    }
    
    setTimeout(() => {
        document.querySelector('.guess-options').style.display = 'none';
        document.getElementById('guess-result').style.display = 'block';
    }, 1500);
}

function nextMemoryGuess() {
    currentMemoryIndex++;
    
    if (currentMemoryIndex >= memoryClues.length) {
        document.getElementById('guess-result').style.display = 'none';
        document.getElementById('memory-score').textContent = memoryScore;
        document.getElementById('guessing-complete').style.display = 'block';
        completeGame('guessing');
    } else {
        loadMemoryClue();
    }
}

function completeGame(gameType) {
    gamesCompleted.add(gameType);
    
    // Update game status
    document.getElementById(`${gameType}-status`).textContent = 'Completed ✅';
    document.getElementById(`${gameType}-status`).classList.add('completed');
    
    // Track completion
    pageManager.progressTracker.markInteractionComplete('games', `${gameType}-complete`);
    
    // Update counter
    updateGamesCounter();
    
    // Check if all games completed
    if (gamesCompleted.size >= 4) {
        setTimeout(() => {
            showGamesCompletion();
            pageManager.unlockAchievement('game-master');
        }, 1000);
    }
}

function updateGamesCounter() {
    document.getElementById('games-completed').textContent = gamesCompleted.size;
}

function showGamesCompletion() {
    const message = document.createElement('div');
    message.className = 'completion-celebration';
    message.innerHTML = `
        <div class="celebration-content">
            <h2>🏆 Game Master! 🏆</h2>
            <p>You've completed all the games!</p>
            <p>You're the ultimate friendship champion! 🎮💕</p>
        </div>
    `;
    
    document.body.appendChild(message);
    
    createConfetti();
    
    setTimeout(() => {
        message.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        message.classList.remove('show');
        setTimeout(() => message.remove(), 500);
    }, 4000);
}

// Enhanced Photo Gallery
let currentPhotoIndex = 0;
const photoData = [
    {
        src: "images/pic1.jpg",
        caption: "Om ko manane ke liye bula bataye aye the alag bakchodi tha 🏖️"
    },
    {
        src: "images/pic2.jpg", 
        caption: "Last Day of our last meet 😢"
    },
    {
        src: "images/pic3.jpg",
        caption: "Holiiiii 🎉"
    },
    {
        src: "images/pic4.jpg",
        caption: "Don't forget the BETRAYAL"
    },
    {
        src: "images/sec1.jpg",
        caption: "Remember the Dokha, Bhul jati ho na aap 😡"
    }
];

function expandPhoto(photoId) {
    currentPhotoIndex = photoId - 1;
    const lightbox = document.getElementById('photo-lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxText = document.getElementById('lightbox-text');
    
    lightboxImage.src = photoData[currentPhotoIndex].src;
    lightboxText.textContent = photoData[currentPhotoIndex].caption;
    
    lightbox.style.display = 'flex';
    setTimeout(() => {
        lightbox.classList.add('show');
    }, 10);
    
    // Track interaction
    pageManager.progressTracker.markInteractionComplete('gallery', `photo-${photoId}`);
    
    // Add double-tap listener for hearts
    let tapCount = 0;
    lightboxImage.addEventListener('click', function() {
        tapCount++;
        if (tapCount === 1) {
            setTimeout(() => {
                if (tapCount === 2) {
                    addPhotoHeart(photoId);
                }
                tapCount = 0;
            }, 300);
        }
    });
}

function closeLightbox() {
    const lightbox = document.getElementById('photo-lightbox');
    lightbox.classList.remove('show');
    setTimeout(() => {
        lightbox.style.display = 'none';
    }, 300);
}

function navigatePhoto(direction) {
    currentPhotoIndex += direction;
    if (currentPhotoIndex < 0) currentPhotoIndex = photoData.length - 1;
    if (currentPhotoIndex >= photoData.length) currentPhotoIndex = 0;
    
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxText = document.getElementById('lightbox-text');
    
    lightboxImage.src = photoData[currentPhotoIndex].src;
    lightboxText.textContent = photoData[currentPhotoIndex].caption;
}

function addPhotoHeart(photoId) {
    const photoItem = document.querySelector(`[data-photo-id="${photoId}"]`);
    const heartsContainer = photoItem.querySelector('.photo-hearts');
    
    const heart = document.createElement('div');
    heart.className = 'floating-photo-heart';
    heart.innerHTML = '💕';
    heart.style.left = Math.random() * 80 + 10 + '%';
    heart.style.animationDelay = Math.random() * 0.5 + 's';
    
    heartsContainer.appendChild(heart);
    
    setTimeout(() => {
        heart.remove();
    }, 2000);
    
    // Track heart addition
    pageManager.progressTracker.markInteractionComplete('gallery', `heart-added-${photoId}`);
}

function collectHeart(event, pageId, heartId) {
    event.stopPropagation();
    
    const heartElement = event.target;
    
    // Simple heart animation
    heartElement.style.animation = 'heartCollect 0.8s ease-out forwards';
    
    // Create collection effect
    createHeartCollectionEffect(heartElement);
    
    setTimeout(() => {
        heartElement.style.display = 'none';
    }, 800);
}

// Hearts counter removed

function showHeartCollectionComplete() {
    // Show completion message
    const message = document.createElement('div');
    message.className = 'unlock-message';
    message.innerHTML = '🎉 All hearts collected! You found all our precious memories! 💖';
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        message.classList.remove('show');
        setTimeout(() => message.remove(), 300);
    }, 3000);
    
    // Create celebration effect
    createConfetti();
}

function createHeartCollectionEffect(heartElement) {
    const rect = heartElement.getBoundingClientRect();
    
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.innerHTML = '✨';
        particle.style.position = 'fixed';
        particle.style.left = rect.left + rect.width/2 + 'px';
        particle.style.top = rect.top + rect.height/2 + 'px';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '10000';
        particle.style.fontSize = '12px';
        particle.style.animation = `sparkleCollect ${Math.random() * 1 + 0.5}s ease-out forwards`;
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 1500);
    }
}

// removed: Enhanced Memory Lane functions

// removed: collectMemoryToken (function deleted)

// removed: updateTokensCounter

// removed: unlockSecretMemory

// removed: createTokenCollectionEffect

// Enhanced Reasons Page
function flipReasonCard(reasonId) {
    const card = document.querySelector(`[data-reason-id="${reasonId}"]`);
    const isFlipped = card.classList.contains('flipped');
    
    if (!isFlipped) {
        card.classList.add('flipped');
        
        // Track interaction
        pageManager.progressTracker.markInteractionComplete('reasons', `reason-${reasonId}`);
        
        // Add flip sound effect (visual feedback)
        card.style.transform = 'scale(1.05)';
        setTimeout(() => {
            card.style.transform = '';
        }, 200);
    } else {
        card.classList.remove('flipped');
    }
}

// Star collection functionality removed

// Stars counter removed

// Secret reason unlock removed - all cards now visible

// Star collection effect removed

// Enhanced Birthday Wishes Page
let candlesBlown = 0;
let wishBubblesPopped = 0;
let typewriterCompleted = false;

function blowCandle(candleNumber) {
    const candle = document.querySelector(`[data-candle="${candleNumber}"]`);
    
    if (!candle.classList.contains('blown')) {
        candle.classList.add('blown');
        candle.innerHTML = '💨';
        candlesBlown++;
        
        // Create smoke effect
        createSmokeEffect(candle);
        
        // Track interaction
        pageManager.progressTracker.markInteractionComplete('wishes', `candle-${candleNumber}`);
        
        // Check if all candles blown
        if (candlesBlown >= 5) {
            setTimeout(() => {
                showCakeMessage();
                pageManager.unlockAchievement('candle-blower');
            }, 500);
        }
        
        updateWishesCounter();
    }
}

function popWishBubble(bubbleNumber) {
    const bubble = document.querySelector(`[data-wish="${bubbleNumber}"]`);
    
    if (!bubble.classList.contains('popped')) {
        bubble.classList.add('popped');
        
        // Show bubble content
        const content = bubble.querySelector('.bubble-content');
        content.style.display = 'block';
        content.style.animation = 'bubblePop 0.6s ease-out';
        
        // Create pop effect
        createBubblePopEffect(bubble);
        
        wishBubblesPopped++;
        
        // Track interaction
        pageManager.progressTracker.markInteractionComplete('wishes', `bubble-${bubbleNumber}`);
        
        setTimeout(() => {
            bubble.style.animation = 'bubbleFloat 0.8s ease-out forwards';
        }, 600);
        
        updateWishesCounter();
    }
}

function expandWishCard(cardNumber) {
    const card = document.querySelector(`[data-card="${cardNumber}"]`);
    const preview = card.querySelector('.card-preview');
    const fullContent = card.querySelector('.card-full');
    
    if (fullContent.style.display === 'none') {
        preview.style.display = 'none';
        fullContent.style.display = 'block';
        fullContent.style.animation = 'fadeInUp 0.5s ease-out';
        card.classList.add('expanded');
        
        // Track interaction
        pageManager.progressTracker.markInteractionComplete('wishes', `wish-card-${cardNumber}`);
    } else {
        preview.style.display = 'block';
        fullContent.style.display = 'none';
        card.classList.remove('expanded');
    }
}

function collectWishGem(event, pageId, gemId) {
    event.stopPropagation();
    
    const gemElement = event.target;
    const isFirstCollection = pageManager.progressTracker.addCollectible(pageId, gemId);
    
    if (isFirstCollection) {
        gemElement.style.animation = 'gemCollect 0.8s ease-out forwards';
        
        createGemCollectionEffect(gemElement);
        
        setTimeout(() => {
            gemElement.style.display = 'none';
        }, 800);
        
        updateWishesCounter();
    }
}

function updateWishesCounter() {
    const counter = document.getElementById('wishes-collected');
    let totalWishes = candlesBlown + wishBubblesPopped;
    
    // Add gem collections
    const collectedGems = pageManager.progressTracker.collectibles.get('wishes');
    if (collectedGems) {
        totalWishes += collectedGems.size;
    }
    
    // Add typewriter completion
    if (typewriterCompleted) {
        totalWishes += 1;
    }
    
    counter.textContent = totalWishes;
    
    // Check for completion
    if (totalWishes >= 8) {
        setTimeout(() => {
            showWishesCompletion();
            pageManager.unlockAchievement('wish-master');
        }, 500);
    }
}

function showCakeMessage() {
    const message = document.createElement('div');
    message.className = 'cake-message';
    message.innerHTML = '🎉 All candles blown! Make a wish! 🎉';
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        message.classList.remove('show');
        setTimeout(() => message.remove(), 300);
    }, 3000);
}

function showWishesCompletion() {
    const message = document.createElement('div');
    message.className = 'completion-celebration';
    message.innerHTML = `
        <div class="celebration-content">
            <h2>🌟 All Wishes Granted! 🌟</h2>
            <p>You've experienced all the birthday magic!</p>
            <p>May all these wishes come true! 💕</p>
        </div>
    `;
    
    document.body.appendChild(message);
    
    createConfetti();
    
    setTimeout(() => {
        message.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        message.classList.remove('show');
        setTimeout(() => message.remove(), 500);
    }, 4000);
}

function createSmokeEffect(candle) {
    const rect = candle.getBoundingClientRect();
    
    for (let i = 0; i < 5; i++) {
        const smoke = document.createElement('div');
        smoke.innerHTML = '💨';
        smoke.style.position = 'fixed';
        smoke.style.left = rect.left + rect.width/2 + 'px';
        smoke.style.top = rect.top + 'px';
        smoke.style.pointerEvents = 'none';
        smoke.style.zIndex = '10000';
        smoke.style.fontSize = '12px';
        smoke.style.animation = `smokeRise ${Math.random() * 2 + 1}s ease-out forwards`;
        smoke.style.animationDelay = i * 0.1 + 's';
        
        document.body.appendChild(smoke);
        
        setTimeout(() => {
            smoke.remove();
        }, 3000);
    }
}

function createBubblePopEffect(bubble) {
    const rect = bubble.getBoundingClientRect();
    
    for (let i = 0; i < 6; i++) {
        const sparkle = document.createElement('div');
        sparkle.innerHTML = '✨';
        sparkle.style.position = 'fixed';
        sparkle.style.left = rect.left + rect.width/2 + 'px';
        sparkle.style.top = rect.top + rect.height/2 + 'px';
        sparkle.style.pointerEvents = 'none';
        sparkle.style.zIndex = '10000';
        sparkle.style.fontSize = '14px';
        sparkle.style.animation = `sparkleCollect ${Math.random() * 1 + 0.5}s ease-out forwards`;
        
        document.body.appendChild(sparkle);
        
        setTimeout(() => {
            sparkle.remove();
        }, 1500);
    }
}

function createGemCollectionEffect(gemElement) {
    const rect = gemElement.getBoundingClientRect();
    
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.innerHTML = '💎';
        particle.style.position = 'fixed';
        particle.style.left = rect.left + rect.width/2 + 'px';
        particle.style.top = rect.top + rect.height/2 + 'px';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '10000';
        particle.style.fontSize = '12px';
        particle.style.animation = `sparkleCollect ${Math.random() * 1 + 0.5}s ease-out forwards`;
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 1500);
    }
}

// Enhanced typewriter completion tracking
function markTypewriterComplete() {
    if (!typewriterCompleted) {
        typewriterCompleted = true;
        pageManager.progressTracker.markInteractionComplete('wishes', 'typewriter-complete');
        
        const completeMessage = document.getElementById('typewriter-complete');
        completeMessage.style.display = 'block';
        completeMessage.style.animation = 'fadeInUp 0.5s ease-out';
        
        updateWishesCounter();
    }
}

// Enhanced Multi-Layer Surprise Box System
// removed: surprisesUnlocked related features if page removed
let surprisesUnlocked = new Set();
let gesturePoints = [];
let isDrawing = false;

// Enhanced Surprise Box
function revealSurprise(type) {
    const surpriseElement = document.getElementById(`surprise-${type}`);
    if (surpriseElement && surpriseElement.style.display === 'none') {
        surpriseElement.style.display = 'block';
        surpriseElement.style.animation = 'fadeInUp 0.8s ease-out';
        
        // Mark surprise as unlocked
        surprisesUnlocked.add(type);
        
        // Update surprise box item state
        const surpriseBox = document.querySelector(`[data-surprise="${type}"]`);
        if (surpriseBox) {
            surpriseBox.classList.remove('locked');
            surpriseBox.classList.add('unlocked');
        }
        
        // Create celebration effect
        createCelebrationEffect();
        
        // Track surprise reveal
        pageManager.progressTracker.markInteractionComplete('surprises', `revealed-${type}`);
        
        // Update progress
        updateSurpriseProgress();
        
        // Check for layer completion
        checkLayerCompletion();
    }
}

function createHeartExplosion() {
    const surpriseBox = document.querySelector('.surprise-box');
    
    for (let i = 0; i < 20; i++) {
        const heart = document.createElement('div');
        heart.innerHTML = '💖';
        heart.style.position = 'absolute';
        heart.style.left = '50%';
        heart.style.top = '50%';
        heart.style.fontSize = '20px';
        heart.style.pointerEvents = 'none';
        heart.style.zIndex = '10000';
        heart.style.animation = `heartExplosion 2s ease-out forwards`;
        
        surpriseBox.appendChild(heart);
        
        setTimeout(() => {
            heart.remove();
        }, 2000);
    }
}

// Add heart explosion animation
const heartExplosionStyle = document.createElement('style');
heartExplosionStyle.textContent = `
    @keyframes heartExplosion {
        0% {
            transform: translate(-50%, -50%) scale(0) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translate(${Math.random() * 400 - 200}px, ${Math.random() * 400 - 200}px) scale(1) rotate(360deg);
            opacity: 0;
        }
    }
    
    @keyframes fadeInUp {
        0% {
            opacity: 0;
            transform: translateY(30px);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(heartExplosionStyle);

// Confetti Effect
function createConfetti() {
    if (AnimationController.prefersReduced) return;
    const colors = ['#ff69b4', '#ff9a9e', '#fecfef', '#c44569', '#f8b500'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '9999';
        confetti.style.animation = `confettiFall ${Math.random() * 3 + 2}s linear forwards`;
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
}

// Confetti animation
const confettiStyle = document.createElement('style');
confettiStyle.textContent = `
    @keyframes confettiFall {
        0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(confettiStyle);

// Countdown removed

// Share Website
function shareWebsite() {
    if (navigator.share) {
        navigator.share({
            title: 'Happy Birthday Beautiful!',
            text: 'Check out this amazing birthday website!',
            url: window.location.href
        });
    } else {
        // Fallback for browsers that don't support Web Share API
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            alert('Website link copied to clipboard! 💕');
        });
    }
}

// ARIA live announcements and error toast
function announce(message) {
    const live = document.getElementById('aria-live');
    if (live) {
        live.textContent = '';
        setTimeout(() => { live.textContent = message; }, 10);
    }
}

function showError(message) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(244,67,54,0.95)';
    toast.style.color = '#fff';
    toast.style.padding = '12px 18px';
    toast.style.borderRadius = '10px';
    toast.style.zIndex = '10003';
    toast.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
    toast.textContent = message || 'Something went wrong. Please try again.';
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// Download Birthday Card
function downloadCard() {
    // Create a simple birthday card as HTML and convert to downloadable format
    const cardContent = `
        <div style="width: 400px; height: 600px; background: linear-gradient(45deg, #ff9a9e, #fecfef); 
                    padding: 40px; text-align: center; font-family: 'Dancing Script', cursive; 
                    color: white; border-radius: 20px;">
            <h1 style="font-size: 3rem; margin-bottom: 20px;">Happy Birthday!</h1>
            <div style="font-size: 4rem; margin: 20px 0;">🎂</div>
            <p style="font-size: 1.5rem; margin-bottom: 30px;">
                You're not just my best friend,<br>
                you're my chosen family! 💕
            </p>
            <div style="font-size: 2rem;">✨🌟💖🌟✨</div>
            <p style="font-size: 1.2rem; margin-top: 30px;">
                Made with love for the most<br>
                amazing person in the world!
            </p>
        </div>
    `;
    
    // For now, just show an alert. In a real implementation, you'd convert this to PDF or image
    alert('Birthday card ready! 🎁 (In a real implementation, this would download a beautiful PDF card)');
}

// Fixed interactive hover effects - prevent stuck transforms
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects with proper cleanup
    const interactiveElements = document.querySelectorAll('button, .photo-item, .reason-card, .menu-card, .wish-bubble');
    
    interactiveElements.forEach(element => {
        // Store original transform
        const originalTransform = element.style.transform || '';
        
        element.addEventListener('mouseenter', function() {
            if (!this.classList.contains('flipped') && !this.classList.contains('popped')) {
                this.style.transform = originalTransform + ' scale(1.05)';
            }
        });
        
        element.addEventListener('mouseleave', function() {
            // Reset to original transform, removing any scale
            this.style.transform = originalTransform;
        });
        
        // Also reset on click to prevent stuck states
        element.addEventListener('click', function() {
            setTimeout(() => {
                if (!this.classList.contains('flipped') && !this.classList.contains('popped')) {
                    this.style.transform = originalTransform;
                }
            }, 200);
        });
    });
});

// Populate Achievement Gallery when opening achievements page
function populateAchievementsGallery() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const achievements = Array.from(pageManager.progressTracker.achievements.values());
    achievements.sort((a,b)=> (a.title||'').localeCompare(b.title||''));
    achievements.forEach(a => {
        const item = document.createElement('div');
        item.className = 'achievement-card';
        item.style.background = 'white';
        item.style.borderRadius = '15px';
        item.style.padding = '16px';
        item.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
        item.setAttribute('role','group');
        item.setAttribute('aria-label', a.title || 'Achievement');
        item.innerHTML = `<div style="font-size:2rem">${a.icon || '✨'}</div>
            <div style="font-weight:600;color:#ff69b4;margin-top:8px">${a.title || 'Achievement'}</div>
            <div style="font-size:0.9rem;color:#666">${a.description || ''}</div>`;
        grid.appendChild(item);
    });
    const totalEl = document.getElementById('total-achievements');
    const completionEl = document.getElementById('completion-percentage');
    const secretsEl = document.getElementById('secret-discoveries');
    if (totalEl) totalEl.textContent = String(achievements.length);
    if (completionEl) completionEl.textContent = pageManager.progressTracker.getCompletionPercentage() + '%';
    if (secretsEl) secretsEl.textContent = String(pageManager.progressTracker.unlockedSecrets.size || 0);
    const completionMsg = document.getElementById('completion-message');
    if (completionMsg) completionMsg.style.display = achievements.length >= 10 ? 'block' : 'none';
}

// Hook to navigation for achievements page
(function hookAchievementsNav(){
    const _nav = pageManager.navigateTo;
    pageManager.navigateTo = function(pageId, transitionType='slide'){
        _nav.call(this, pageId, transitionType);
        if (pageId === 'achievements') {
            setTimeout(populateAchievementsGallery, 400);
        }
    };
})();

// Custom cursor trail effect
document.addEventListener('mousemove', function(e) {
    if (AnimationController.prefersReduced) return;
    if (Math.random() < 0.1) { // Only create trail 10% of the time to avoid performance issues
        const trail = document.createElement('div');
        trail.innerHTML = '💕';
        trail.style.position = 'fixed';
        trail.style.left = e.clientX + 'px';
        trail.style.top = e.clientY + 'px';
        trail.style.pointerEvents = 'none';
        trail.style.zIndex = '1';
        trail.style.fontSize = '12px';
        trail.style.opacity = '0.7';
        trail.style.animation = `fadeOut 1s ease-out forwards`;
        
        document.body.appendChild(trail);
        
        setTimeout(() => {
            trail.remove();
        }, 1000);
    }
});

// Fade out animation for cursor trail
const trailStyle = document.createElement('style');
trailStyle.textContent = `
    @keyframes fadeOut {
        0% {
            opacity: 0.7;
            transform: scale(1);
        }
        100% {
            opacity: 0;
            transform: scale(0.5);
        }
    }
`;
document.head.appendChild(trailStyle);
function checkSurprisePassword() {
    const passwordInput = document.getElementById('surprise-password');
    const password = passwordInput.value.toLowerCase().trim();
    
    // The magic word is "love" (as hinted)
    if (password === 'love') {
        revealSurprise('password');
        passwordInput.style.border = '2px solid #4CAF50';
        
        // Hide password input and show success
        setTimeout(() => {
            document.querySelector('.password-input-container').style.display = 'none';
            document.querySelector('.password-hint').style.display = 'none';
        }, 1000);
        
        pageManager.unlockAchievement('password-cracker');
    } else {
        // Wrong password animation
        passwordInput.style.border = '2px solid #f44336';
        passwordInput.style.animation = 'shake 0.5s ease-in-out';
        
        setTimeout(() => {
            passwordInput.style.border = '';
            passwordInput.style.animation = '';
            passwordInput.value = '';
        }, 1000);
    }
}

// Gesture-based unlock system
function initGestureCanvas() {
    const canvas = document.querySelector('#gesture-canvas canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Set up canvas
    ctx.strokeStyle = '#ff69b4';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    gesturePoints = [];
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    gesturePoints.push({x, y});
}

function draw(e) {
    if (!isDrawing) return;
    
    const canvas = e.target;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    gesturePoints.push({x, y});
    
    if (gesturePoints.length > 1) {
        const prevPoint = gesturePoints[gesturePoints.length - 2];
        ctx.beginPath();
        ctx.moveTo(prevPoint.x, prevPoint.y);
        ctx.lineTo(x, y);
        ctx.stroke();
    }
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    
    // Check if gesture resembles a heart
    if (isHeartGesture(gesturePoints)) {
        revealSurprise('gesture');
        pageManager.unlockAchievement('heart-drawer');
    }
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                     e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    e.target.dispatchEvent(mouseEvent);
}

function isHeartGesture(points) {
    // Simplified heart detection - check for curved path with return to start
    if (points.length < 20) return false;
    
    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    const distance = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2));
    
    // Check if path returns close to start (heart shape characteristic)
    return distance < 50 && points.length > 30;
}

function clearGesture() {
    const canvas = document.querySelector('#gesture-canvas canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gesturePoints = [];
}

// Achievement-based surprise unlocks
function checkAchievementSurprises() {
    const achievements = pageManager.progressTracker.achievements;
    
    // Derive missing aggregate achievements when conditions are met
    ensureDerivedAchievements();
    
    // Explorer (visited all sections)
    if (achievements.has('explorer') && !surprisesUnlocked.has('explorer')) {
        unlockAchievementSurprise('explorer');
    }
    
    // Collector (collected hidden items across sections)
    if (achievements.has('collector') && !surprisesUnlocked.has('collector')) {
        unlockAchievementSurprise('collector');
    }
    
    // Game Master → Gamer surprise
    if (achievements.has('game-master') && !surprisesUnlocked.has('gamer')) {
        unlockAchievementSurprise('gamer');
    }
    
    // Check for ultimate surprise (all achievements)
    const totalAchievements = pageManager.progressTracker.achievements.size;
    const requiredAchievements = 10; // Adjust based on total achievements in system
    
    const progressElement = document.getElementById('ultimate-progress');
    if (progressElement) {
        progressElement.textContent = `${totalAchievements}/${requiredAchievements} Achievements`;
    }
    
    if (totalAchievements >= requiredAchievements && !surprisesUnlocked.has('ultimate')) {
        unlockAchievementSurprise('ultimate');
        createUltimateCelebration();
    }
}

// Create aggregate/derived achievements based on existing progress
function ensureDerivedAchievements() {
    const ach = pageManager.progressTracker.achievements;
    
    // Collector: unlock if user has collected hearts, tokens, and stars
    const hasHearts = ach.has('heart-collector');
    const hasTokens = ach.has('memory-keeper');
    const hasStars = ach.has('star-collector');
    if (!ach.has('collector') && hasHearts && hasTokens && hasStars) {
        pageManager.unlockAchievement('collector');
    }
}

function unlockAchievementSurprise(type) {
    const surpriseBox = document.querySelector(`[data-surprise="${type}"]`);
    if (surpriseBox) {
        surpriseBox.classList.remove('locked');
        surpriseBox.classList.add('unlocked');
        
        // Add click handler
        surpriseBox.onclick = () => revealSurprise(type);
        
        // Show unlock animation
        surpriseBox.style.animation = 'unlockPulse 1s ease-in-out';
        announce(`${type} surprise unlocked`);
        AudioController.playSuccess();
        
        // Update unlock requirement text
        const requirement = surpriseBox.querySelector('.unlock-requirement');
        if (requirement) {
            requirement.innerHTML = '<i class="fas fa-unlock"></i><span>Click to Open!</span>';
            requirement.style.color = '#4CAF50';
        }
    }
}

function updateSurpriseProgress() {
    const totalSurprises = 8; // Total number of surprises
    const unlockedCount = surprisesUnlocked.size;
    
    const unlockedElement = document.getElementById('surprises-unlocked');
    if (unlockedElement) {
        unlockedElement.textContent = `${unlockedCount}/${totalSurprises}`;
    }
    
    // Update layers completed
    let layersCompleted = 0;
    if (surprisesUnlocked.has('message') && surprisesUnlocked.has('photo')) layersCompleted++;
    if (surprisesUnlocked.has('password')) layersCompleted++;
    if (surprisesUnlocked.has('gesture')) layersCompleted++;
    if (surprisesUnlocked.has('explorer') || surprisesUnlocked.has('collector') || surprisesUnlocked.has('gamer')) layersCompleted++;
    if (surprisesUnlocked.has('ultimate')) layersCompleted++;
    
    const layersElement = document.getElementById('layers-completed');
    if (layersElement) {
        layersElement.textContent = `${layersCompleted}/5`;
    }
}

function checkLayerCompletion() {
    // Layer 1 completion
    if (surprisesUnlocked.has('message') && surprisesUnlocked.has('photo')) {
        pageManager.unlockAchievement('layer-1-complete');
    }
    
    // Layer 2 completion
    if (surprisesUnlocked.has('password')) {
        pageManager.unlockAchievement('layer-2-complete');
    }
    
    // Layer 3 completion
    if (surprisesUnlocked.has('gesture')) {
        pageManager.unlockAchievement('layer-3-complete');
    }
    
    // Check for surprise master achievement
    if (surprisesUnlocked.size >= 7) {
        pageManager.unlockAchievement('surprise-master');
    }
}

function createUltimateCelebration() {
    // Create massive celebration effect
    const colors = ['#ff69b4', '#ff9a9e', '#fecfef', '#ffd700', '#98fb98', '#87ceeb', '#dda0dd'];
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.width = '12px';
        confetti.style.height = '12px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '10001';
        confetti.style.borderRadius = '50%';
        confetti.style.animation = `ultimateConfetti ${Math.random() * 4 + 3}s linear forwards`;
        confetti.style.animationDelay = Math.random() * 2 + 's';
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 7000);
    }
    
    // Add crown animation
    const crownAnimation = document.querySelector('.crown-animation');
    if (crownAnimation) {
        crownAnimation.style.animation = 'crownSpin 2s ease-in-out infinite';
    }
}

// Create confetti effect
function createConfetti() {
    const colors = ['#ff69b4', '#ff9a9e', '#fecfef', '#ffd700', '#98fb98', '#87ceeb', '#dda0dd'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '10001';
        confetti.style.borderRadius = '50%';
        confetti.style.animation = `confettiFall ${Math.random() * 3 + 2}s linear forwards`;
        confetti.style.animationDelay = Math.random() * 2 + 's';
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
}

// Announce function for accessibility
function announce(message) {
    const ariaLive = document.getElementById('aria-live');
    if (ariaLive) {
        ariaLive.textContent = message;
        setTimeout(() => {
            ariaLive.textContent = '';
        }, 1000);
    }
    console.log('Announcement:', message);
}