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
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let snareBuffers = [], bassBuffers = [];


// Global variables
let currentPatternIndex = 0
let currentLevel = 1;
let startTime = null;
let patternSpans = [];
let currentSoundSet = 1; // Track which sound set we're using (1, 2, or 3)

// Achievements tracker
let achievements = {
    1: null, 2: null, 3: null, 4: null, 5: null,
    6: null, 7: null, 8: null, 9: null, 10: null,
    11: null, 12: null, 13: null, 14: null, 15: null,
    16: null, 17: null, 18: null, 19: null, 20: null
};

// Rudiment patterns
const rudiments = {
    // 16-beat patterns (easy to moderate)
    1: {
        name: "Single Stroke Roll",
        pattern: ['R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L'],
        thresholds: { bronze: 60, silver: 120, gold: 160 }
    },
    2: {
        name: "Double Stroke Roll",
        pattern: ['R', 'R', 'L', 'L', 'R', 'R', 'L', 'L', 'R', 'R', 'L', 'L', 'R', 'R', 'L', 'L'],
        thresholds: { bronze: 70, silver: 140, gold: 180 }
    },
    3: {
        name: "Single Paradiddle",
        pattern: ['R', 'L', 'R', 'R', 'L', 'R', 'L', 'L', 'R', 'L', 'R', 'R', 'L', 'R', 'L', 'L'],
        thresholds: { bronze: 80, silver: 150, gold: 200 }
    },
    4: {
        name: "Double Paradiddle",
        pattern: ['R', 'L', 'R', 'L', 'R', 'R', 'L', 'R', 'L', 'R', 'L', 'L', 'R', 'L', 'R', 'L'],
        thresholds: { bronze: 90, silver: 160, gold: 220 }
    },
    5: {
        name: "Triple Stroke Roll",
        pattern: ['R', 'R', 'R', 'L', 'L', 'L', 'R', 'R', 'R', 'L', 'L', 'L', 'R', 'R', 'R', 'L'],
        thresholds: { bronze: 100, silver: 170, gold: 230 }
    },

    // 32-beat patterns (moderate)
    6: {
        name: "Single Stroke Four",
        pattern: ['R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L',
            'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L'],
        thresholds: { bronze: 110, silver: 180, gold: 240 }
    },
    7: {
        name: "Paradiddle-Diddle",
        pattern: ['R', 'L', 'R', 'R', 'L', 'L', 'L', 'R', 'L', 'L', 'R', 'R', 'R', 'L', 'R', 'R',
            'L', 'L', 'R', 'R', 'L', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L'],
        thresholds: { bronze: 110, silver: 190, gold: 250 }
    },
    8: {
        name: "Single Stroke Seven",
        pattern: ['R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L',
            'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L'],
        thresholds: { bronze: 120, silver: 200, gold: 270 }
    },
    9: {
        name: "Triplet Paradiddle",
        pattern: ['R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L',
            'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L'],
        thresholds: { bronze: 130, silver: 210, gold: 280 }
    },
    10: {
        name: "Paradiddle Triplets",
        pattern: ['R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L',
            'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L'],
        thresholds: { bronze: 130, silver: 210, gold: 290 }
    },

    // 64-beat patterns (hard)
    11: {
        name: "Ratamacue",
        pattern: ['R', 'L', 'R', 'R', 'L', 'R', 'L', 'L', 'R', 'R', 'R', 'L', 'R', 'L', 'L', 'R',
            'R', 'L', 'L', 'R', 'R', 'L', 'R', 'L', 'L', 'R', 'R', 'L', 'R', 'R', 'L', 'L',
            'R', 'R', 'L', 'L', 'R', 'L', 'R', 'R', 'L', 'R', 'R', 'R', 'L', 'L', 'R', 'L',
            'R', 'R', 'L', 'R', 'L', 'R', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'L', 'R'],
        thresholds: { bronze: 140, silver: 220, gold: 300 }
    },
    12: {
        name: "Single Paradiddle Triplets",
        pattern: ['R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L',
            'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L',
            'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L'],
        thresholds: { bronze: 140, silver: 230, gold: 310 }
    },
    13: {
        name: "Single Stroke Six",
        pattern: ['R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L',
            'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L',
            'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L'],
        thresholds: { bronze: 150, silver: 240, gold: 320 }
    },
    14: {
        name: "Double Stroke Four",
        pattern: ['R', 'R', 'L', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'R', 'L', 'L',
            'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'R', 'L', 'R', 'L', 'L', 'R', 'R'],
        thresholds: { bronze: 150, silver: 240, gold: 330 }
    },
    15: {
        name: "Swiss Triplets",
        pattern: ['R', 'L', 'L', 'R', 'R', 'L', 'L', 'R', 'R', 'L', 'R', 'L', 'R', 'R', 'L', 'L',
            'R', 'L', 'L', 'R', 'R', 'L', 'L', 'R', 'R', 'L', 'L', 'R', 'L', 'R', 'R', 'L'],
        thresholds: { bronze: 160, silver: 250, gold: 340 }
    },
    16: {
        name: "Drag",
        pattern: ['R', 'L', 'L', 'R', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L',
            'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L'],
        thresholds: { bronze: 160, silver: 250, gold: 350 }
    },
    17: {
        name: "Double Stroke Diddle",
        pattern: ['R', 'R', 'L', 'L', 'R', 'L', 'R', 'L', 'R', 'R', 'L', 'L', 'R', 'L', 'R', 'L',
            'R', 'L', 'R', 'L', 'R', 'R', 'L', 'R', 'L', 'R', 'R', 'L', 'R', 'L', 'R', 'L'],
        thresholds: { bronze: 160, silver: 250, gold: 350 }
    },
    18: {
        name: "Triplet Roll",
        pattern: ['R', 'R', 'R', 'L', 'L', 'L', 'R', 'R', 'R', 'L', 'L', 'L', 'R', 'R', 'R', 'L',
            'L', 'L', 'R', 'R', 'R', 'L', 'L', 'L', 'R', 'R', 'R', 'L', 'L', 'L', 'R', 'R'],
        thresholds: { bronze: 170, silver: 260, gold: 360 }
    },
    19: {
        name: "Triple Paradiddle",
        pattern: ['R', 'L', 'R', 'L', 'R', 'L', 'R', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'L',
            'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L',
            'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L'],
        thresholds: { bronze: 180, silver: 270, gold: 370 }
    },
    20: {
        name: "Six Stroke Roll",
        pattern: ['R', 'L', 'R', 'R', 'L', 'L', 'R', 'R', 'L', 'L', 'R', 'R', 'L', 'L', 'R', 'R',
            'R', 'L', 'L', 'R', 'R', 'R', 'L', 'L', 'R', 'L', 'L', 'R', 'L', 'L', 'R', 'R'],
        thresholds: { bronze: 180, silver: 280, gold: 380 }
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

// Create level navigation buttons
function createLevelNav() {
    levelNav.innerHTML = '';

    for (let level = 1; level <= Object.keys(rudiments).length; level++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        if (level === currentLevel) {
            btn.classList.add('active');
        }

        // Check if level is accessible (previous level completed or level 1)
        const isAccessible = level === 1 || achievements[level - 1] !== null;
        if (!isAccessible) {
            btn.classList.add('locked');
        } else if (achievements[level] !== null) {
            btn.classList.add('completed');
        }

        btn.textContent = `Level ${level}`;

        // Add trophy if achieved
        if (achievements[level]) {
            const trophy = document.createElement('span');
            trophy.className = 'trophy';
            trophy.textContent = trophies[achievements[level]];
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
document.addEventListener('DOMContentLoaded', () => {
    const leftArrow = document.getElementById('prev-levels');
    const rightArrow = document.getElementById('next-levels');
    const container = document.getElementById('level-nav');

    if (leftArrow && rightArrow && container) {
        const scrollAmount = () => container.querySelector('.level-btn')?.offsetWidth || 100;

        leftArrow.addEventListener('click', () => {
            container.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
        });

        rightArrow.addEventListener('click', () => {
            container.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
        });
    }
});

function playSound(hand) {
    const buffers = hand === 'L' ? snareBuffers : bassBuffers;
    const idx = Math.min(currentSoundSet - 1, buffers.length - 1);
    const buf = buffers[idx];

    if (!buf) return;  // safety

    const src = audioContext.createBufferSource();
    src.buffer = buf;
    src.connect(audioContext.destination);
    src.start();       // near-instant, low-latency playback
}


// Advance to the next level
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

    // Check if we're advancing to level 2 or 4 to unlock new sounds
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

    setTimeout(() => {
        levelNotification.style.opacity = '0';
    }, 4000);

    // Progress to next level if available, otherwise stay on current
    if (currentLevel < Object.keys(rudiments).length) {
        currentLevel++;
        currentPattern = rudiments[currentLevel].pattern;
        levelDisplay.textContent = `Level ${currentLevel}: ${rudiments[currentLevel].name}`;
        updatePatternDisplay();
    } else {
        feedback.textContent = "You've completed all levels!";
    }

    // Update navigation
    createLevelNav();

    // Update achievement display
    showAchievementInfo();

    // Reset
    currentPatternIndex = 0;
    startTime = null;
}

// 4. Add sound set reset to the changeLevel function
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


    // Update achievement display
    showAchievementInfo();

    // Update navigation
    createLevelNav();
}

// Function to flash the circle when tapped
function flashCircle(circle) {
    circle.classList.add('flash');
    setTimeout(() => {
        circle.classList.remove('flash');
    }, 200);
}

// Function to update pattern text size based on current position
function flashCurrentPatternText() {
    // Only proceed if the patternSpans array has elements and index is valid
    if (patternSpans.length > 0 && currentPatternIndex < patternSpans.length) {
        // Remove flash class from all spans first
        for (let i = 0; i < patternSpans.length; i++) {
            patternSpans[i].classList.remove('flash');
        }

        // Add flash class to the current position in the pattern
        patternSpans[currentPatternIndex].classList.add('flash');

        setTimeout(() => {
            if (patternSpans[currentPatternIndex]) {
                patternSpans[currentPatternIndex].classList.remove('flash');
            }
        }, 300);
    }
}

// Function to update the pattern display
function updatePatternDisplay() {
    pattern.innerHTML = '';
    currentPattern.forEach(stroke => {
        const span = document.createElement('span');
        span.textContent = stroke;
        pattern.appendChild(span);
    });
    // Update our patternSpans array after creating the elements
    patternSpans = Array.from(pattern.getElementsByTagName('span'));
}

// Show level completion notification
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

    setTimeout(() => {
        levelNotification.style.opacity = '0';
    }, 4000);
}

// Display achievement info for current level
function showAchievementInfo() {
    const thresholds = rudiments[currentLevel].thresholds;
    let html = `Achievements: `;
    html += `<span class="achievement-bronze">${trophies.bronze} (${thresholds.bronze}+ BPM)</span> | `;
    html += `<span class="achievement-silver">${trophies.silver} (${thresholds.silver}+ BPM)</span> | `;
    html += `<span class="achievement-gold">${trophies.gold} (${thresholds.gold}+ BPM)</span>`;

    if (achievements[currentLevel]) {
        html += `<br>Current achievement: <span class="achievement-${achievements[currentLevel]}">${trophies[achievements[currentLevel]]}</span>`;
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



// Handle circle click or keyboard press
function handleStroke(hand) {
    const circle = hand === 'L' ? circleL : circleR;
    flashCircle(circle);
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
            setTimeout(() => {
                advanceLevel();
                feedback.textContent = "";
            }, 1000);
        }
    } else {
        // Reset if the wrong circle is clicked
        feedback.textContent = "Oops! Try again.";
        currentPatternIndex = 0;
        startTime = null;

        setTimeout(() => {
            feedback.textContent = "";
        }, 1000);
    }
}

// Attach click events to the circles
circleL.addEventListener('click', () => handleStroke('L'));
circleR.addEventListener('click', () => handleStroke('R'));

// Add keyboard event listener
document.addEventListener('keydown', (event) => {
    // Left arrow key for L, Right arrow key for R
    if (event.key === 'ArrowLeft') {
        handleStroke('L');
    } else if (event.key === 'ArrowRight') {
        handleStroke('R');
    }
});

// Initialize app
function initApp() {
    // Make sure we start at level 1
    currentLevel = 1;
    currentPattern = rudiments[currentLevel].pattern;
    levelDisplay.textContent = `Level ${currentLevel}: ${rudiments[currentLevel].name}`;
    updatePatternDisplay();
    createLevelNav();
    showAchievementInfo();

    // Initialize audio context on first user interaction
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });
}
async function initAudio() {
    const snareFiles = [
        'snare.mp3', 'snare1.mp3', 'snare2.mp3',
        'snare3.mp3', 'snare4.mp3', 'snare5.mp3'
    ];
    const bassFiles = [
        'bass.mp3', 'bass1.mp3', 'bass2.mp3',
        'bass3.mp3', 'bass4.mp3', 'bass5.mp3'
    ];

    // Helper to fetch & decode
    const load = async url => {
        const resp = await fetch(url);
        const data = await resp.arrayBuffer();
        return audioContext.decodeAudioData(data);
    };

    // Preload all snares and basses
    [snareBuffers, bassBuffers] = await Promise.all([
        Promise.all(snareFiles.map(load)),
        Promise.all(bassFiles.map(load))
    ]);

    console.log('All drum sounds decoded');
}

// Initialize on page load
window.onload = initApp;

