// DOM Elements
const circleR = document.getElementById('circleR');
const circleL = document.getElementById('circleL');
const pattern = document.getElementById('pattern');
const feedback = document.getElementById('feedback');
const bpmDisplay = document.getElementById('bpm-display');
const levelDisplay = document.getElementById('level-display');
const levelNotification = document.getElementById('level-notification');
const achievementDisplay = document.getElementById('achievement-display');
const levelNav = document.getElementById('level-nav');

// Create audio context with low latency options
let audioContext;
function createOptimizedAudioContext() {
    const contextOptions = {
        latencyHint: 'interactive',
        sampleRate: 44100
    };
    return new (window.AudioContext || window.webkitAudioContext)(contextOptions);
}

// Audio buffers and sources
let snareBuffers = [], bassBuffers = [];
let snareSourceNodes = [], bassSourceNodes = [];

// Global variables
let currentPatternIndex = 0;
let currentLevel = 1;
let startTime = null;
let patternSpans = [];
let currentSoundSet = 1; // Track which sound set we're using (1, 2, or 3)
let touchStartTime = 0; // For detecting double taps
let lastTouchEnd = 0; // For preventing double tap zoom on mobile
let audioInitialized = false;

// Achievements tracker
let achievements = {
    1: null, 2: null, 3: null, 4: null, 5: null,
    6: null, 7: null, 8: null, 9: null, 10: null,
    11: null, 12: null, 13: null, 14: null, 15: null,
    16: null, 17: null, 18: null, 19: null, 20: null
};

// Rudiment patterns - placeholder as requested
const rudiments = {
     {
        name: "Double Stroke Roll",
        pattern: ['R', 'R', 'L', 'L', 'R', 'R', 'L', 'L', 'R', 'R', 'L', 'L', 'R', 'R', 'L', 'L'],
        thresholds: { bronze: 60, silver: 120, gold: 160 }
    },
    {
        name: "Single Paradiddle",
        pattern: ['R', 'L', 'R', 'R', 'L', 'R', 'L', 'L', 'R', 'L', 'R', 'R', 'L', 'R', 'L', 'L'],
        thresholds: { bronze: 70, silver: 130, gold: 180 }
    },
    { 
        name: "Five Stroke Roll",
        pattern: ['R', 'R', 'L', 'L', 'R', 'L', 'L', 'R', 'R', 'L', 'R', 'R', 'L', 'L', 'R', 'L'],
        thresholds: { bronze: 80, silver: 140, gold: 190 }
    },
     {
        name: "Flam",
        pattern: ['rR', 'lL', 'rR', 'lL', 'rR', 'lL', 'rR', 'lL', 'rR', 'lL', 'rR', 'lL', 'rR', 'lL', 'rR', 'lL'],
        thresholds: { bronze: 90, silver: 150, gold: 200 }
    },
     {
        name: "Double Paradiddle",
        pattern: ['R', 'L', 'R', 'L', 'R', 'R', 'L', 'R', 'L', 'R', 'L', 'L', 'R', 'L', 'R', 'L'],
        thresholds: { bronze: 100, silver: 160, gold: 220 }
    },
     {
        name: "Flam Paradiddle",
        pattern: ['rR', 'L', 'R', 'R', 'lL', 'R', 'L', 'L', 'rR', 'L', 'R', 'R', 'lL', 'R', 'L', 'L'],
        thresholds: { bronze: 110, silver: 170, gold: 240 }
    },
    {
        name: "Six Stroke Roll",
        pattern: ['R', 'L', 'R', 'R', 'L', 'L', 'R', 'L', 'R', 'R', 'L', 'L', 'R', 'L', 'R', 'R'],
        thresholds: { bronze: 120, silver: 180, gold: 260 }
    },
     {
        name: "Flam Tap",
        pattern: ['rR', 'L', 'lL', 'R', 'rR', 'L', 'lL', 'R', 'rR', 'L', 'lL', 'R', 'rR', 'L', 'lL', 'R'],
        thresholds: { bronze: 130, silver: 200, gold: 280 }
    },
     {
        name: "Ratamacue",
        pattern: ['R', 'L', 'R', 'L', 'R', 'rR', 'L', 'R', 'L', 'R', 'lL', 'R', 'L', 'R', 'L', 'R'],
        thresholds: { bronze: 140, silver: 230, gold: 320 }
    },
     {
        name: "Swiss Army Triplet",
        pattern: ['rR', 'L', 'R', 'lL', 'R', 'L', 'rR', 'L', 'R', 'lL', 'R', 'L', 'rR', 'L', 'R', 'lL'],
        thresholds: { bronze: 160, silver: 260, gold: 380 }
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

// Create level navigation buttons with improved accessibility
function createLevelNav() {
    levelNav.innerHTML = '';

    for (let level = 1; level <= Object.keys(rudiments).length; level++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        if (level === currentLevel) {
            btn.classList.add('active');
            btn.setAttribute('aria-current', 'true');
        }

        // Check if level is accessible (previous level completed or level 1)
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

        // Add trophy if achieved
        if (achievements[level]) {
            const trophy = document.createElement('span');
            trophy.className = 'trophy';
            trophy.textContent = trophies[achievements[level]];
            trophy.setAttribute('aria-hidden', 'true'); // Trophy is decorative since we included it in the aria-label
            btn.appendChild(trophy);
        }

        // Add click handler
        btn.addEventListener('click', () => {
            if (isAccessible) {
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

        // Add touch swipe support for mobile
        let touchStartX = 0;
        let touchEndX = 0;

        container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, {passive: true});

        container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, {passive: true});

        function handleSwipe() {
            const swipeThreshold = 50;
            if (touchEndX < touchStartX - swipeThreshold) {
                // Swipe left, scroll right
                container.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
            }
            if (touchEndX > touchStartX + swipeThreshold) {
                // Swipe right, scroll left
                container.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
            }
        }
    }
});

// Optimized sound playback with pre-buffering and low latency
function playSound(hand) {
    if (!audioInitialized) {
        initAudio();
        return;
    }

    try {
        const buffers = hand === 'L' ? snareBuffers : bassBuffers;
        const idx = Math.min(currentSoundSet - 1, buffers.length - 1);
        const buf = buffers[idx];

        if (!buf) return;  // safety check

        // Resume audio context if suspended (needed for iOS)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        // Create and configure source node with optimized settings
        const source = audioContext.createBufferSource();
        source.buffer = buf;
        
        // Create a gain node for volume control
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1.0; // Full volume
        
        // Connect source to gain node, then to destination
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Start playback immediately with no delay
        source.start(0);
        
        // Store the source node for potential later cleanup
        if (hand === 'L') {
            snareSourceNodes.push(source);
        } else {
            bassSourceNodes.push(source);
        }
        
        // Clean up old source nodes to prevent memory leaks
        cleanupSourceNodes();
    } catch (err) {
        console.error("Error playing sound:", err);
    }
}

// Clean up completed source nodes
function cleanupSourceNodes() {
    const currentTime = audioContext.currentTime;
    const cleanup = (nodes) => {
        let i = 0;
        while (i < nodes.length) {
            // Remove nodes that have finished playing or are 2+ seconds old
            if (nodes[i].buffer && (currentTime > 2.0)) {
                nodes.splice(i, 1);
            } else {
                i++;
            }
        }
    };
    
    // Clean both arrays of source nodes
    cleanup(snareSourceNodes);
    cleanup(bassSourceNodes);
}

// Advance to the next level with improved notification
function advanceLevel() {
    const bpm = calculateBPM();
    let achievement = 'bronze';

    if (bpm) {
        bpmDisplay.textContent = `Your tempo: ${bpm} BPM`;
        achievement = getAchievement(bpm);

        // Update achievement if better than previous
        const currentAchievement = achievements[currentLevel];
        const achievementRank = { gold: 3, silver: 2, bronze: 1, null: 0 };

        if (achievementRank[achievement] > achievementRank[currentAchievement]) {
            achievements[currentLevel] = achievement;
        }
    } else {
        // Still award bronze if BPM calculation failed
        if (!achievements[currentLevel]) {
            achievements[currentLevel] = 'bronze';
        }
    }

    // Check if we're advancing to a level that unlocks new sounds
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

    // Show notification with the level complete and sound unlock if applicable
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
    // Add a vibration for mobile devices if supported
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }

    setTimeout(() => {
        levelNotification.style.opacity = '0';
    }, 4000);

    // Progress to next level if available, otherwise stay on current
    if (currentLevel < Object.keys(rudiments).length) {
        // Update navigation BEFORE changing the level
        createLevelNav();
        
        currentLevel++;
        currentPattern = rudiments[currentLevel].pattern;
        levelDisplay.textContent = `Level ${currentLevel}: ${rudiments[currentLevel].name}`;
        updatePatternDisplay();
    } else {
        feedback.textContent = "You've completed all levels!";
        // Still update navigation to show final level trophy
        createLevelNav();
    }

    // Update achievement display
    showAchievementInfo();

    // Reset
    currentPatternIndex = 0;
    startTime = null;
}

// Change level with improved experience
function changeLevel(level) {
    if (level === currentLevel) return;

    currentLevel = level;
    currentPattern = rudiments[currentLevel].pattern;
    levelDisplay.textContent = `Level ${currentLevel}: ${rudiments[currentLevel].name}`;
    updatePatternDisplay();

    // Reset state
    currentPatternIndex = 0;
    startTime = null;
    feedback.textContent = '';
    bpmDisplay.textContent = '';

    // Set appropriate sound set based on level
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

    // Add haptic feedback for mobile if available
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }

    // Update achievement display
    showAchievementInfo();

    // Update navigation
    createLevelNav();
}

// Enhanced circle flash animation with visual feedback
function flashCircle(circle) {
    circle.classList.add('flash');
    
    // Add a scaling effect for better visual feedback
    circle.style.transform = 'scale(1.1)';
    
    setTimeout(() => {
        circle.classList.remove('flash');
        circle.style.transform = 'scale(1.0)';
    }, 200);
}

// Enhanced pattern text highlighting
function flashCurrentPatternText() {
    // Only proceed if the patternSpans array has elements and index is valid
    if (patternSpans.length > 0 && currentPatternIndex < patternSpans.length) {
        // Remove flash class from all spans first
        for (let i = 0; i < patternSpans.length; i++) {
            patternSpans[i].classList.remove('flash');
            patternSpans[i].classList.remove('next');
        }

        // Add flash class to the current position in the pattern
        patternSpans[currentPatternIndex].classList.add('flash');
        
        // Highlight the next stroke in the sequence
        if (currentPatternIndex + 1 < patternSpans.length) {
            patternSpans[currentPatternIndex + 1].classList.add('next');
        }

        setTimeout(() => {
            if (patternSpans[currentPatternIndex]) {
                patternSpans[currentPatternIndex].classList.remove('flash');
            }
        }, 300);
    }
}

// Update pattern display with better visibility
function updatePatternDisplay() {
    pattern.innerHTML = '';
    
    // Create groups of 4 for better readability
    for (let i = 0; i < currentPattern.length; i++) {
        const span = document.createElement('span');
        span.textContent = currentPattern[i];
        span.setAttribute('data-index', i);
        pattern.appendChild(span);
        
        // Add a space after every 4 elements for easier reading
        if ((i + 1) % 4 === 0 && i !== currentPattern.length - 1) {
            pattern.appendChild(document.createTextNode(' '));
        }
    }
    
    // Update patternSpans array after creating the elements
    patternSpans = Array.from(pattern.getElementsByTagName('span'));
    
    // Highlight the first stroke to start with
    if (patternSpans.length > 0) {
        patternSpans[0].classList.add('next');
    }
}

// Show level completion notification with enhanced visuals
function showLevelNotification(level, achievement) {
    const bpm = calculateBPM();
    let message = `Level ${level - 1} Completed!`;

    if (level <= Object.keys(rudiments).length) {
        message += `<br>You're now on Level ${level}!`;
    } else {
        message += `<br>You've completed all levels!`;
    }

    if (bpm) {
        message += `<br><br>Your tempo: ${bpm} BPM`;
        message += `<br><span class="achievement-${achievement}">${achievement.toUpperCase()} Achievement!</span>`;
        message += `<br><span class="achievement-icon trophy-${achievement}">${trophies[achievement]}</span>`;
    }

    levelNotification.innerHTML = message;
    levelNotification.style.opacity = '1';
    
    // Add animation classes for better visual effect
    levelNotification.classList.add('notification-animate');

    setTimeout(() => {
        levelNotification.style.opacity = '0';
        levelNotification.classList.remove('notification-animate');
    }, 4000);
}

// Display achievement info for current level with improved UI
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

    // Calculate beats per minute
    // Each note is considered a beat, so pattern.length strokes
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

// Handle stroke input (click, touch, or keyboard) with improved response
function handleStroke(hand) {
    const circle = hand === 'L' ? circleL : circleR;
    flashCircle(circle);
    
    // Wake audio context if needed (iOS, Safari)
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    playSound(hand);

    // Start timing from first correct hit
    if (currentPatternIndex === 0 && hand === currentPattern[0]) {
        startTime = new Date();
        bpmDisplay.textContent = "";
    }

    // Check if the clicked circle matches the pattern
    if (currentPattern[currentPatternIndex] === hand) {
        // Flash the current pattern position
        flashCurrentPatternText();

        // Move to next position in pattern
        currentPatternIndex++;

        // Check if pattern is complete
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
        // Reset if the wrong circle is clicked
        feedback.textContent = "Oops! Try again.";
        feedback.classList.add('error');
        currentPatternIndex = 0;
        startTime = null;
        
        // Visual indication of mistake
        pattern.classList.add('error-shake');

        // Highlight the first stroke again
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

// Initialize audio context and preload sounds
async function initAudio() {
    if (audioInitialized) return;
    
    try {
        // Create optimized audio context
        audioContext = createOptimizedAudioContext();
        
        const snareFiles = [
            'snare.mp3', 'snare1.mp3', 'snare2.mp3',
            'snare3.mp3', 'snare4.mp3', 'snare5.mp3'
        ];
        const bassFiles = [
            'bass.mp3', 'bass1.mp3', 'bass2.mp3',
            'bass3.mp3', 'bass4.mp3', 'bass5.mp3'
        ];

        // Helper to fetch & decode with error handling
        const load = async url => {
            try {
                const resp = await fetch(url);
                if (!resp.ok) throw new Error(`Failed to load ${url}: ${resp.status}`);
                const data = await resp.arrayBuffer();
                return await audioContext.decodeAudioData(data);
            } catch (err) {
                console.error(`Error loading audio file ${url}:`, err);
                // Return an empty buffer as fallback
                return audioContext.createBuffer(2, 44100, 44100);
            }
        };

        // Show loading indicator
        feedback.textContent = "Loading sounds...";

        // Preload all snares and basses with Promise.all for parallel loading
        [snareBuffers, bassBuffers] = await Promise.all([
            Promise.all(snareFiles.map(load)),
            Promise.all(bassFiles.map(load))
        ]);

        audioInitialized = true;
        feedback.textContent = "Ready to play!";
        
        setTimeout(() => {
            feedback.textContent = "";
        }, 1500);
        
        console.log('All drum sounds decoded and ready');
    } catch (err) {
        console.error('Error initializing audio:', err);
        feedback.textContent = "Audio error. Please reload the page.";
    }
}

// Prevent zooming on double tap for mobile devices
function preventZoom(e) {
    const now = Date.now();
    const timeSince = now - lastTouchEnd;
    
    if (timeSince < 300) {
        e.preventDefault();
    }
    
    lastTouchEnd = now;
}

// Add iOS/Safari specific optimizations
function setupIOSOptimizations() {
    // These are needed for iOS audio to work properly
    document.addEventListener('touchstart', () => {
        // iOS requires first user interaction to start audio
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }, {passive: false});
    
    // Prevent double-tap zoom on iOS
    document.addEventListener('touchend', preventZoom, {passive: false});
}

// Set up all event listeners
function setupEventListeners() {
    // Attach click events to the circles
    circleL.addEventListener('click', () => handleStroke('L'));
    circleR.addEventListener('click', () => handleStroke('R'));
    
    // Touch events for mobile with better handling
    circleL.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent default to avoid delay
        handleStroke('L');
    }, {passive: false});
    
    circleR.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent default to avoid delay
        handleStroke('R');
    }, {passive: false});

    // Add keyboard event listener
    document.addEventListener('keydown', (event) => {
        // Left arrow key for L, Right arrow key for R
        if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
            handleStroke('L');
            event.preventDefault(); // Prevent page scrolling
        } else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
            handleStroke('R');
            event.preventDefault(); // Prevent page scrolling
        }
    });
    
    // Handle visibility change for better audio resumption
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
    });
    
    // Handle resize events to adjust UI for different screen sizes
    window.addEventListener('resize', debounce(() => {
        updateUIForScreenSize();
    }, 250));
}

// Handle UI updates based on screen size
function updateUIForScreenSize() {
    const isMobile = window.innerWidth < 768;
    document.body.classList.toggle('mobile-view', isMobile);
    
    // Update text size or layout if needed
    if (isMobile) {
        // Mobile-specific adjustments
        pattern.classList.add('mobile-pattern');
    } else {
        pattern.classList.remove('mobile-pattern');
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize app with improved startup
function initApp() {
    // Make sure we start at level 1
    currentLevel = 1;
    currentPattern = rudiments[currentLevel].pattern;
    levelDisplay.textContent = `Level ${currentLevel}: ${rudiments[currentLevel].name}`;
    updatePatternDisplay();
    createLevelNav();
    showAchievementInfo();
    updateUIForScreenSize();
    
    // Set up event listeners
    setupEventListeners();
    setupIOSOptimizations();
    
    // Initialize audio on first user interaction for better mobile compatibility
    const startAudioInit = () => {
        if (!audioInitialized) {
            initAudio();
        }
    };
    
    document.addEventListener('click', startAudioInit, { once: true });
    document.addEventListener('touchstart', startAudioInit, { once: true, passive: true });
    document.addEventListener('keydown', startAudioInit, { once: true });
    
    // Add a welcome message
    feedback.textContent = "Tap to start!";
    setTimeout(() => {
        feedback.textContent = "";
    }, 3000);
}

// Start the app when the page loads
window.addEventListener('load', initApp);
