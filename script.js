// DOM Elements
const pattern = document.getElementById('pattern');
const feedback = document.getElementById('feedback');
const bpmDisplay = document.getElementById('bpm-display');
const levelDisplay = document.getElementById('level-display');
const levelNotification = document.getElementById('level-notification');
const achievementDisplay = document.getElementById('achievement-display');
const levelNav = document.getElementById('level-nav');
const circles = document.querySelectorAll(".circle");
const overlay = document.getElementById("overlay");

// Audio Context and Resources
let audioContext;
let gainNodePool = [];
const POOL_SIZE = 10;

// Audio buffers and sources
let snareBuffers = [], bassBuffers = [];
let snareSourceNodes = [], bassSourceNodes = [];

// Global variables 
let currentPatternIndex = 0;
let currentLevel = 1;
let startTime = null;
let patternSpans = [];
let currentSoundSet = 1;
let lastTouchEnd = 0;
let audioInitialized = false;
let soundsLoaded = false;

// Achievements tracker
let achievements = {
    1: null, 2: null, 3: null, 4: null, 5: null,
    6: null, 7: null, 8: null, 9: null, 10: null,
    11: null, 12: null, 13: null, 14: null, 15: null,
    16: null, 17: null, 18: null, 19: null, 20: null
};

const rudiments = {
    1: {
        name: "Double Stroke Roll",
        pattern: ['R', 'R', 'L', 'L', 'R', 'R', 'L', 'L', 'R', 'R', 'L', 'L', 'R', 'R', 'L', 'L'],
        thresholds: { bronze: 60, silver: 120, gold: 160 }
    },
    2: {
        name: "Single Paradiddle",
        pattern: ['R', 'L', 'R', 'R', 'L', 'R', 'L', 'L', 'R', 'L', 'R', 'R', 'L', 'R', 'L', 'L'],
        thresholds: { bronze: 70, silver: 130, gold: 180 }
    },
    3: {
        name: "Five Stroke Roll",
        pattern: ['R', 'R', 'L', 'L', 'R', 'L', 'L', 'R', 'R', 'L', 'R', 'R', 'L', 'L', 'R', 'L'],
        thresholds: { bronze: 65, silver: 125, gold: 170 }
    }
};

// Current pattern based on level
let currentPattern = rudiments[currentLevel].pattern;

// Trophy icons
const trophies = {
    gold: '🏆',
    silver: '🥈',
    bronze: '🥉'
};

// Create optimized audio context
function createOptimizedAudioContext() {
    const contextOptions = {
        latencyHint: 'balanced',
        sampleRate: 8000
    };

    const ctx = new (window.AudioContext || window.webkitAudioContext)(contextOptions);

    const hasAudioWorklet = typeof AudioWorkletNode === 'function';

    if (ctx.audioWorklet && hasAudioWorklet) {
        console.log('AudioWorklet API available for lower latency');
    }

    if (navigator.userAgent.toLowerCase().includes('android') && ctx.createScriptProcessor) {
        const bufferSize = 256;
        const unusedProcessor = ctx.createScriptProcessor(bufferSize, 1, 1);
        unusedProcessor.connect(ctx.destination);
        unusedProcessor.onaudioprocess = function () { };
        ctx._unusedProcessor = unusedProcessor;
    }

    return ctx;
}

// Initialize audio resources
function initAudio() {
    if (audioInitialized) return;

    try {
        audioContext = createOptimizedAudioContext();
        initAudioPool();

        // Load sound resources here
        // This would typically include loading and decoding audio buffers

        audioInitialized = true;
        console.log('Audio initialized successfully');

        // Resume audio context for mobile
        if (audioContext.state !== 'running') {
            audioContext.resume();
        }
    } catch (err) {
        console.error('Error initializing audio:', err);
    }
}

// Initialize gain node pool for efficient audio handling
function initAudioPool() {
    gainNodePool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1.0;
        gainNode.connect(audioContext.destination);
        gainNodePool.push({ gainNode, inUse: false });
    }
}

// Play sound with optimized resource usage
function playSound(hand, volume = 0) {
    if (!audioInitialized) {
        initAudio();
        return;
    }

    if (audioContext.state !== 'running') {
        audioContext.resume();
    }

    try {
        const buffers = hand === 'L' ? snareBuffers : bassBuffers;
        const idx = Math.min(currentSoundSet - 1, buffers.length - 1);
        const buf = buffers[idx];

        if (!buf) return;

        let gainWrapper = gainNodePool.find(gw => !gw.inUse);
        if (!gainWrapper) {
            const gainNode = audioContext.createGain();
            gainNode.connect(audioContext.destination);
            gainWrapper = { gainNode, inUse: false };
            gainNodePool.push(gainWrapper);
        }

        gainWrapper.inUse = true;
        gainWrapper.gainNode.gain.value = volume;

        const source = audioContext.createBufferSource();
        source.buffer = buf;
        source.connect(gainWrapper.gainNode);
        source.start(0);

        setTimeout(() => {
            gainWrapper.inUse = false;
        }, 500);

    } catch (err) {
        console.error("Error playing sound:", err);
        if (audioContext.state !== 'running') {
            audioContext.resume();
        }
    }
}

// Clean up completed source nodes
function cleanupSourceNodes() {
    const currentTime = audioContext.currentTime;
    const cleanup = (nodes) => {
        let i = 0;
        while (i < nodes.length) {
            if (nodes[i] && nodes[i].startTime && (currentTime - nodes[i].startTime > 0.5)) {
                nodes.splice(i, 1);
            } else {
                i++;
            }
        }
    };

    cleanup(snareSourceNodes);
    cleanup(bassSourceNodes);

    if (snareSourceNodes.length > 10) snareSourceNodes.splice(0, snareSourceNodes.length - 10);
    if (bassSourceNodes.length > 10) bassSourceNodes.splice(0, bassSourceNodes.length - 10);
}

// Create level navigation buttons
function createLevelNav() {
    levelNav.innerHTML = '';

    for (let level = 1; level <= Object.keys(rudiments).length; level++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        if (level === currentLevel) {
            btn.classList.add('active');
            btn.style.backgroundColor = '#0077ff';
            btn.style.color = 'white';
            btn.setAttribute('aria-current', 'true');
        }

        const isAccessible = level === 1 || achievements[level - 1] !== null;
        if (!isAccessible) {
            btn.classList.add('locked');
            btn.setAttribute('aria-disabled', 'true');
            btn.setAttribute('tabindex', '-1');
        } else if (achievements[level] !== null) {
            btn.classList.add('completed');
        }

        btn.textContent = `Level ${level}`;
        btn.setAttribute('aria-label', `Level ${level} ${!isAccessible ? '(locked)' : (achievements[level] ? `(completed with ${achievements[level]} trophy)` : '')}`);

        if (achievements[level]) {
            const trophy = document.createElement('span');
            trophy.className = 'trophy';
            trophy.textContent = trophies[achievements[level]];
            trophy.setAttribute('aria-hidden', 'true');
            btn.appendChild(trophy);
        }

        btn.addEventListener('click', (e) => {
            if (isAccessible) {
                e.preventDefault();
                changeLevel(level);
            }
        });

        levelNav.appendChild(btn);
    }
}

// Horizontal scroll functionality for level navigation
document.addEventListener('DOMContentLoaded', () => {
    const leftArrow = document.getElementById('prev-levels');
    const rightArrow = document.getElementById('next-levels');
    const container = document.getElementById('level-nav');

    if (leftArrow && rightArrow && container) {
        const scrollAmount = () => container.querySelector('.level-btn')?.offsetWidth + 10 || 100;

        leftArrow.addEventListener('click', () => {
            container.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
        });

        rightArrow.addEventListener('click', () => {
            container.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
        });

        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;

            if (Math.abs(touchEndY - touchStartY) < 50) {
                handleSwipe();
            }
        }, { passive: true });

        function handleSwipe() {
            const swipeThreshold = 50;
            if (touchEndX < touchStartX - swipeThreshold) {
                container.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
            }
            if (touchEndX > touchStartX + swipeThreshold) {
                container.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
            }
        }
    }
});

// Advance to the next level
function advanceLevel() {
    const bpm = calculateBPM();
    let achievement = 'bronze';

    if (bpm) {
        bpmDisplay.textContent = `Your tempo: ${bpm} BPM`;
        achievement = getAchievement(bpm);

        const currentAchievement = achievements[currentLevel];
        const achievementRank = { gold: 3, silver: 2, bronze: 1, null: 0 };

        if (achievementRank[achievement] > achievementRank[currentAchievement]) {
            achievements[currentLevel] = achievement;
        }
    } else {
        if (!achievements[currentLevel]) {
            achievements[currentLevel] = 'bronze';
        }
    }

    const newLevel = currentLevel + 1;
    let soundUnlocked = false;

    if (newLevel === 2 && currentSoundSet < 2) {
        currentSoundSet = 2;
        soundUnlocked = true;
    } else if (newLevel === 4 && currentSoundSet < 3) {
        currentSoundSet = 3;
        soundUnlocked = true;
    } else if (newLevel === 6 && currentSoundSet < 4) {
        currentSoundSet = 4;
        soundUnlocked = true;
    } else if (newLevel === 8 && currentSoundSet < 5) {
        currentSoundSet = 5;
        soundUnlocked = true;
    }

    let notificationMessage = `Level ${currentLevel} Completed!`;

    if (soundUnlocked) {
        notificationMessage += `<br>New drum sounds unlocked!`;
    }

    if (newLevel <= Object.keys(rudiments).length) {
        notificationMessage += `<br>You're now on Level ${newLevel}!`;
    } else {
        notificationMessage += `<br>You've completed all levels!`;
    }

    if (bpm) {
        notificationMessage += `<br><br>Your tempo: ${bpm} BPM`;
        notificationMessage += `<br><span class="achievement-${achievement}">${achievement.toUpperCase()} Achievement!</span>`;
        notificationMessage += `<br><span class="achievement-icon trophy-${achievement}">${trophies[achievement]}</span>`;
    }

    levelNotification.innerHTML = notificationMessage;
    levelNotification.style.opacity = '1';

    if (navigator.vibrate) {
        navigator.vibrate([70, 30, 70]);
    }

    setTimeout(() => {
        levelNotification.style.opacity = '0';
    }, 4000);

    if (currentLevel < Object.keys(rudiments).length) {
        changeLevel(newLevel);
        currentPattern = rudiments[currentLevel].pattern;
        levelDisplay.textContent = `Level ${currentLevel}: ${rudiments[currentLevel].name}`;
        updatePatternDisplay();
        createLevelNav();
    } else {
        feedback.textContent = "You've completed all levels!";
        createLevelNav();
    }

   
    //showAchievementInfo();

    currentPatternIndex = 0;
    startTime = null;

    // Save progress
    saveProgress();
    
}

// Change level
function changeLevel(level) {
    console.log('Changing to level:', level);
    if (level === currentLevel) return;

    currentLevel = level;
    currentPattern = rudiments[currentLevel].pattern;
    levelDisplay.textContent = `Level ${currentLevel}: ${rudiments[currentLevel].name}`;
    updatePatternDisplay();

    currentPatternIndex = 0;
    startTime = null;
    feedback.textContent = '';
    bpmDisplay.textContent = '';

    if (level >= 8) {
        currentSoundSet = 5;
    } else if (level >= 6) {
        currentSoundSet = 4;
    } else if (level >= 4) {
        currentSoundSet = 3;
    } else if (level >= 2) {
        currentSoundSet = 2;
    } else {
        currentSoundSet = 1;
    }

    const drums = document.querySelectorAll('.basket-item');
    drums.forEach(drum => {
        const drumLevel = parseInt(drum.getAttribute('data-level'), 10);
        drum.style.display = drumLevel <= level ? 'block' : 'none';
    });


    if (navigator.vibrate) {
        navigator.vibrate(30);
    }

    showAchievementInfo();
    createLevelNav();

    // Save progress
    saveProgress();
}


function flashCurrentPatternText() {
    if (patternSpans.length > 0 && currentPatternIndex < patternSpans.length) {
        for (let i = 0; i < patternSpans.length; i++) {
            patternSpans[i].classList.remove('flash');
            patternSpans[i].classList.remove('next');
        }

        patternSpans[currentPatternIndex].classList.add('flash');

        if (currentPatternIndex + 1 < patternSpans.length) {
            patternSpans[currentPatternIndex + 1].classList.add('next');
        }

        setTimeout(() => {
            if (patternSpans[currentPatternIndex]) {
                patternSpans[currentPatternIndex].classList.remove('flash');
            }
        }, 250);
    }
}

// Update pattern display
function updatePatternDisplay() {
    pattern.innerHTML = '';

    for (let i = 0; i < currentPattern.length; i++) {
        const span = document.createElement('span');
        span.textContent = currentPattern[i];
        span.setAttribute('data-index', i);
        pattern.appendChild(span);

        if ((i + 1) % 4 === 0 && i !== currentPattern.length - 1) {
            pattern.appendChild(document.createTextNode(' '));
        }
    }

    patternSpans = Array.from(pattern.getElementsByTagName('span'));

    if (patternSpans.length > 0) {
        patternSpans[0].classList.add('next');
    }
}

// Display achievement info for current level
function showAchievementInfo() {
    const thresholds = rudiments[currentLevel].thresholds;
    let html = `<div class="achievement-header">Achievements:</div>`;
    html += `<div class="achievement-grid">`;
    html += `<div class="achievement-item achievement-bronze">${trophies.bronze} <span>${thresholds.bronze}+ BPM</span></div>`;
    html += `<div class="achievement-item achievement-silver">${trophies.silver} <span>${thresholds.silver}+ BPM</span></div>`;
    html += `<div class="achievement-item achievement-gold">${trophies.gold} <span>${thresholds.gold}+ BPM</span></div>`;
    html += `</div>`;

    if (achievements[currentLevel]) {
        html += `<div class="current-achievement">Current: <span class="achievement-${achievements[currentLevel]}">${trophies[achievements[currentLevel]]}</span></div>`;
    }

    achievementDisplay.innerHTML = html;
}

// Calculate BPM based on completion time
function calculateBPM() {
    if (!startTime) return null;

    const endTime = new Date();
    const timeElapsed = (endTime - startTime) / 1000; // in seconds

    const beatsPerSecond = currentPattern.length / timeElapsed;
    const bpm = Math.round(beatsPerSecond * 60);

    return bpm;
}

// Get achievement level based on BPM
function getAchievement(bpm) {
    const thresholds = rudiments[currentLevel].thresholds;

    if (bpm >= thresholds.gold) return 'gold';
    if (bpm >= thresholds.silver) return 'silver';
    if (bpm >= thresholds.bronze) return 'bronze';
    return 'bronze'; // Minimum achievement is bronze
}

function preventZoom(e) {
    const now = Date.now();
    const timeSince = now - lastTouchEnd;

    if (timeSince < 500) {
        e.preventDefault();
        e.stopPropagation();
    }

    lastTouchEnd = now;
}

// Calculate position-based effects for drums
window.calculatePositionEffects = function (element, clientX, clientY) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = rect.width / 2;
    const normDist = distance / radius;

    let volume, color;

    if (normDist <= 0.33) {
        volume = 1.0;
        color = 'radial-gradient(circle, rgba(255,0,0,0.7) 0%, rgba(255,0,0,0) 70%)';
    } else if (normDist <= 0.66) {
        volume = 0.5;
        color = 'radial-gradient(circle, rgba(255,165,0,0.7) 0%, rgba(255,165,0,0) 70%)';
    } else if (normDist <= 1.0) {
        volume = 0.25;
        color = 'radial-gradient(circle, rgba(255,255,0,0.7) 0%, rgba(255,255,0,0) 70%)';
    } else {
        volume = 0.2;
        color = 'none';
    }

    return { volume, color };
};

// Handle drum stroke
function handleStroke(hand, volume = 0, color = null) {
    if (!audioInitialized) {
        initAudio();
        return;
    }

    if (audioContext && audioContext.state !== 'running') {
        audioContext.resume();
    }

    playSound(hand, volume);

    if (currentPatternIndex === 0 && hand === currentPattern[0]) {
        startTime = new Date();
        bpmDisplay.textContent = "";
    }

    if (currentPattern[currentPatternIndex] === hand) {
        flashCurrentPatternText();
        currentPatternIndex++;

        if (currentPatternIndex === currentPattern.length) {
            feedback.textContent = "Well done!";
            feedback.classList.add('success');

            setTimeout(() => {
                advanceLevel();
                feedback.textContent = "";
                feedback.classList.remove('success');
            }, 1000);
        }
    } else {
        feedback.textContent = "Oops! Try again.";
        feedback.classList.add('error');
        currentPatternIndex = 0;
        startTime = null;

        pattern.classList.add('error-shake');

        if (patternSpans.length > 0) {
            for (let i = 0; i < patternSpans.length; i++) {
                patternSpans[i].classList.remove('flash', 'next');
            }
            patternSpans[0].classList.add('next');
        }

        setTimeout(() => {
            feedback.textContent = "";
            feedback.classList.remove('error');
            pattern.classList.remove('error-shake');
        }, 1000);
    }
}

// Setup event listeners for drum pad interaction

function setupNetworkMonitoring() {
    if ('connection' in navigator) {
        const connection = navigator.connection;

        const updateConnectionStatus = () => {
            if (connection.saveData) {
                console.log('Data Saver enabled - reducing resource usage');
            }

            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                console.log('Slow connection detected - using minimal mode');
            }
        };

        connection.addEventListener('change', updateConnectionStatus);
        updateConnectionStatus();
    }
}

// Preload images for better performance
function preloadImages() {
    const images = [
        '/snareimg.jpg',
        '/maracas.jpg',
        '/bassimg.jpg',
        
    ];

    images.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// Setup battery optimization for Android
function setupBatteryOptimization() {
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            const handleBatteryChange = () => {
                if (battery.level < 0.15 && !battery.charging) {
                    document.body.classList.add('power-saving');
                    console.log('Low battery mode enabled');
                } else {
                    document.body.classList.remove('power-saving');
                }
            };

            battery.addEventListener('levelchange', handleBatteryChange);
            battery.addEventListener('chargingchange', handleBatteryChange);
            handleBatteryChange();
        });
    }
}

// Share achievements function
function shareAchievements() {
    let bronzeCount = 0, silverCount = 0, goldCount = 0;

    Object.values(achievements).forEach(achievement => {
        if (achievement === 'bronze') bronzeCount++;
        if (achievement === 'silver') silverCount++;
        if (achievement === 'gold') goldCount++;
    });

    const shareText = `I've mastered ${Object.keys(achievements).filter(k => achievements[k]).length} drum rudiments with ${goldCount} gold, ${silverCount} silver, and ${bronzeCount} bronze achievements! Try Drum Rudiment Trainer!`;

    if (navigator.share) {
        navigator.share({
            title: 'My Drum Rudiments Progress',
            text: shareText,
            url: window.location.href
        })
            .catch(err => console.log('Error sharing:', err));
    } else {
        navigator.clipboard.writeText(shareText)
            .then(() => {
                feedback.textContent = "Achievements copied to clipboard!";
                setTimeout(() => {
                    feedback.textContent = "";
                }, 2000);
            })
            .catch(err => console.log('Error copying text:', err));
    }
}

// Reset progress function
function resetProgress() {
    if (confirm("Are you sure you want to reset all your progress?")) {
        Object.keys(achievements).forEach(key => {
            achievements[key] = null;
        });

        currentLevel = 1;
        currentPattern = rudiments[currentLevel].pattern;
        currentSoundSet = 1;

        levelDisplay.textContent = `Level ${currentLevel}: ${rudiments[currentLevel].name}`;
        updatePatternDisplay();
        currentPatternIndex = 0;
        startTime = null;

        createLevelNav();
        showAchievementInfo();

        saveProgress();

        feedback.textContent = "Progress reset!";
        setTimeout(() => {
            feedback.textContent = "";
        }, 2000);
    }
}

// Save progress to local storage
function saveProgress() {
    try {
        localStorage.setItem('drumAchievements', JSON.stringify(achievements));
        localStorage.setItem('drumLevel', currentLevel);
        localStorage.setItem('drumSoundSet', currentSoundSet);
        return true;
    } catch (e) {
        console.error('Failed to save progress:', e);
        return false;
    }
}

// Load progress from local storage
function loadProgress() {
    try {
        const savedAchievements = localStorage.getItem('drumAchievements');
        const savedLevel = localStorage.getItem('drumLevel');
        const savedSoundSet = localStorage.getItem('drumSoundSet');

        if (savedAchievements) {
            achievements = JSON.parse(savedAchievements);
        }

        if (savedLevel) {
            currentLevel = parseInt(savedLevel);
            currentPattern = rudiments[currentLevel].pattern;
        }

        if (savedSoundSet) {
            currentSoundSet = parseInt(savedSoundSet);
        }

        return true;
    } catch (e) {
        console.error('Failed to load progress:', e);
        return false;
    }
}

// Auto-save progress
function setupAutoSave() {
    setInterval(saveProgress, 60000);
}



// Initialize app with optimized startup sequence
function initApp() {
    // Create level navigation
    createLevelNav();
    
    // Set up pattern display
    levelDisplay.textContent = `Level ${currentLevel}: ${rudiments[currentLevel].name}`;
    updatePatternDisplay();
    
    // Show achievement info
    showAchievementInfo();

    
   
    
    // Add Android-specific touch class if needed
    if (/Android/i.test(navigator.userAgent)) {
        document.body.classList.add('android-device');
    }
    
    // Optimize for Android touch experience
    document.addEventListener('touchstart', function() {
        // Initialize audio on first touch (required for Android)
        if (!audioInitialized) {
            initAudio();
        }
    }, { once: true, passive: true });
    
    // Add orientation change handler for Android
    window.addEventListener('orientationchange', function() {
        // Small delay to let the orientation change complete
        setTimeout(function() {
            // Adjust UI based on orientation
            const isLandscape = window.innerWidth > window.innerHeight;
            if (isLandscape) {
                document.body.classList.add('landscape');
            } else {
                document.body.classList.remove('landscape');
            }
        }, 300);
    });
    
    // Set up network status monitoring
    setupNetworkMonitoring();
    
    // Preload images for better performance
    preloadImages();
    
    // Setup battery optimization
    setupBatteryOptimization();
    
    // Initial setup complete
    console.log('Drum rudiment app initialized!');
}

// Setup network status monitoring
function setupNetworkMonitoring() {
    if ('connection' in navigator) {
        const connection = navigator.connection;
        
        const updateConnectionStatus = () => {
            if (connection.saveData) {
                // User has requested reduced data usage
                // Lower sound quality or disable certain features
                console.log('Data Saver enabled - reducing resource usage');
            }
            
            // Adjust based on connection type
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                // Minimal experience for very slow connections
                console.log('Slow connection detected - using minimal mode');
            }
        };
        
        // Update on changes
        connection.addEventListener('change', updateConnectionStatus);
        
        // Initial check
        updateConnectionStatus();
    }
}

// Preload images for better performance

function setupBatteryOptimization() {
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            const handleBatteryChange = () => {
                // If battery level is low, reduce animations and background processes
                if (battery.level < 0.15 && !battery.charging) {
                    document.body.classList.add('power-saving');
                    console.log('Low battery mode enabled');
                } else {
                    document.body.classList.remove('power-saving');
                }
            };
            
            // Listen for battery changes
            battery.addEventListener('levelchange', handleBatteryChange);
            battery.addEventListener('chargingchange', handleBatteryChange);
            
            // Initial check
            handleBatteryChange();
        });
    }
}

// Share achievements function
function shareAchievements() {
    // Count achievements
    let bronzeCount = 0, silverCount = 0, goldCount = 0;
    
    Object.values(achievements).forEach(achievement => {
        if (achievement === 'bronze') bronzeCount++;
        if (achievement === 'silver') silverCount++;
        if (achievement === 'gold') goldCount++;
    });
    
    // Create share text
    const shareText = `I've mastered ${Object.keys(achievements).filter(k => achievements[k]).length} drum rudiments with ${goldCount} gold, ${silverCount} silver, and ${bronzeCount} bronze achievements! Try Drum Rudiment Trainer!`;
    
    // Share via Web Share API if available
    if (navigator.share) {
        navigator.share({
            title: 'My Drum Rudiments Progress',
            text: shareText,
            url: window.location.href
        })
        .catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareText)
            .then(() => {
                feedback.textContent = "Achievements copied to clipboard!";
                setTimeout(() => {
                    feedback.textContent = "";
                }, 2000);
            })
            .catch(err => console.log('Error copying text:', err));
    }
}

// Reset progress function
function resetProgress() {
    if (confirm("Are you sure you want to reset all your progress?")) {
        // Reset achievements
        Object.keys(achievements).forEach(key => {
            achievements[key] = null;
        });
        
        // Reset to level 1
        currentLevel = 1;
        currentPattern = rudiments[currentLevel].pattern;
        currentSoundSet = 1;
        
        // Reset UI
        levelDisplay.textContent = `Level ${currentLevel}: ${rudiments[currentLevel].name}`;
        updatePatternDisplay();
        currentPatternIndex = 0;
        startTime = null;
        
        // Update navigation
        createLevelNav();
        showAchievementInfo();
        
        // Save to local storage
        saveProgress();
        
        feedback.textContent = "Progress reset!";
        setTimeout(() => {
            feedback.textContent = "";
        }, 2000);
    }
}

// Save progress to local storage
function saveProgress() {
    try {
        localStorage.setItem('drumAchievements', JSON.stringify(achievements));
        localStorage.setItem('drumLevel', currentLevel);
        localStorage.setItem('drumSoundSet', currentSoundSet);
        return true;
    } catch (e) {
        console.error('Failed to save progress:', e);
        return false;
    }
}

// Load progress from local storage
function loadProgress() {
    try {
        const savedAchievements = localStorage.getItem('drumAchievements');
        const savedLevel = localStorage.getItem('drumLevel');
        const savedSoundSet = localStorage.getItem('drumSoundSet');
        
        if (savedAchievements) {
            achievements = JSON.parse(savedAchievements);
        }
        
        if (savedLevel) {
            currentLevel = parseInt(savedLevel);
            currentPattern = rudiments[currentLevel].pattern;
        }
        
        if (savedSoundSet) {
            currentSoundSet = parseInt(savedSoundSet);
        }
        
        return true;
    } catch (e) {
        console.error('Failed to load progress:', e);
        return false;
    }
}

// Auto-save progress
function setupAutoSave() {
    // Save progress every minute and on level completion
    setInterval(saveProgress, 60000);
}

// Add share button event listener
document.addEventListener('DOMContentLoaded', function() {
    const shareButton = document.getElementById('share-button');
    if (shareButton) {
        shareButton.addEventListener('click', shareAchievements);
    }
    
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', resetProgress);
    }
    
    // Try to load saved progress
    if (loadProgress()) {
        console.log('Saved progress loaded');
    } else {
        console.log('No saved progress found, starting fresh');
    }
    
    // Setup auto-save
    setupAutoSave();
    
    // Initialize the app
    initApp();
});




// Handle online/offline events
window.addEventListener('online', function() {
    console.log('App is online');
    // Re-enable online features if needed
});

window.addEventListener('offline', function() {
    console.log('App is offline');
    // Disable features that require connectivity
});

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleStroke,
        calculateBPM,
        getAchievement,
        advanceLevel
    };
}
