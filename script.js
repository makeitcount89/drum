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
const circles = document.querySelectorAll(".circle");
const overlay = document.getElementById("overlay");



// Create audio context with optimized Android settings
let audioContext;
let hitWorkletNode;

async function createOptimizedAudioContext() {
  // Android-specific optimizations
  const contextOptions = { latencyHint: 'balanced', sampleRate: 8000 };
  const ctx = new (window.AudioContext || window.webkitAudioContext)(contextOptions);

  // Register our AudioWorklet processor for low-latency playback
  if (ctx.audioWorklet && typeof AudioWorkletNode === 'function') {
    await ctx.audioWorklet.addModule('hit-player-processor.js');
    hitWorkletNode = new AudioWorkletNode(ctx, 'hit-player');
    hitWorkletNode.connect(ctx.destination);
    console.log('AudioWorkletNode registered for hit playback');
  }

  return ctx;
}
    

// Audio buffers and sources with optimized caching
let snareBuffers = [], bassBuffers = [];
let snareSourceNodes = [], bassSourceNodes = [];
let cachedGainNode; // Reuse gain node to avoid repeated creation

// Global variables 
let currentPatternIndex = 0;
let currentLevel = 1;
let startTime = null;
let patternSpans = [];
let currentSoundSet = 1;
let touchStartTime = 0;
let lastTouchEnd = 0;
let audioInitialized = false;
let soundsLoaded = false;
let androidAudioSetup = false; // Flag for Android-specific setup

// Pre-create audio nodes for better performance
let preCreatedSourceNodes = [];

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

// Create level navigation buttons with improved accessibility
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
            trophy.setAttribute('aria-hidden', 'true');
            btn.appendChild(trophy);
        }

        // Add click handler with optimized touch response
        btn.addEventListener('click', (e) => {
            if (isAccessible) {
                // Android optimization: preventDefault to avoid delays
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

        // Add optimized touch swipe support for Android
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, {passive: true}); // Use passive listener for better scrolling performance

        container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            
            // Only process horizontal swipes to avoid interference with scrolling
            if (Math.abs(touchEndY - touchStartY) < 50) {
                handleSwipe();
            }
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

document.body.addEventListener('touchstart', () => {
  if (!audioInitialized) initAudio();
}, { once: true });


function playSound(hand, volume = 1.0) {
  if (!audioInitialized) { initAudio(); return; }
  // Post message into the worklet with hand sample and dynamic volume
  hitWorkletNode.port.postMessage({ hand, volume });
}

async function initAudio() {
  if (audioInitialized) return;
  try {
    audioContext = await createOptimizedAudioContext();

    // Load sample URLs
    const snareFiles = ['snare.mp3','snare1.mp3','snare2.mp3','snare3.mp3','snare4.mp3','snare5.mp3'];
    const bassFiles = ['bass.mp3','bass1.mp3','bass2.mp3','bass3.mp3','bass4.mp3','bass5.mp3'];

    // Decode first buffers synchronously
  const decode = buffer => new Promise(res => ctx.decodeAudioData(buffer, res, () => res(null)));

    const loadArray = async urls => {
      const arr = [];
      for (let url of urls) {
        const resp = await fetch(url);
        const buffer = await resp.arrayBuffer();
        arr.push(await decode(buffer));
      }
      return arr;
    };

    feedback.textContent = "Loading basics...";
    [snareBuffers, bassBuffers] = await Promise.all([loadArray([snareFiles[0]]), loadArray([bassFiles[0]])]);
    audioInitialized = true;
    feedback.textContent = "Basics loaded";

    // Send buffers to the worklet for all samples
    // Worklet will hold them internally
    hitWorkletNode.port.postMessage({ init: true, snareBuffers, bassBuffers });

    // Background load rest
    (async () => {
      snareBuffers = await loadArray(snareFiles);
      bassBuffers = await loadArray(bassFiles);
      soundsLoaded = true;
      feedback.textContent = "All sounds loaded";
      hitWorkletNode.port.postMessage({ update: true, snareBuffers, bassBuffers });
      setTimeout(() => feedback.textContent = '', 1500);
    })();

  } catch (err) {
    console.error('Audio init failed', err);
    feedback.textContent = "Audio error, reload?";
  }
}


// Clean up completed source nodes with optimized memory management
function cleanupSourceNodes() {
    const currentTime = audioContext.currentTime;
    const cleanup = (nodes) => {
        let i = 0;
        while (i < nodes.length) {
            // Android optimization: more aggressive cleanup to prevent audio glitches
            if (nodes[i] && nodes[i].startTime && (currentTime - nodes[i].startTime > 0.5)) {
                nodes.splice(i, 1);
            } else {
                i++;
            }
        }
    };
    
    // Clean both arrays of source nodes
    cleanup(snareSourceNodes);
    cleanup(bassSourceNodes);
    
    // Android optimization: limit array size to prevent memory issues
    if (snareSourceNodes.length > 10) snareSourceNodes.splice(0, snareSourceNodes.length - 10);
    if (bassSourceNodes.length > 10) bassSourceNodes.splice(0, bassSourceNodes.length - 10);
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
    // Android-optimized vibration pattern (more reliable)
    if (navigator.vibrate) {
        navigator.vibrate([70, 30, 70]);
    }

    setTimeout(() => {
        levelNotification.style.opacity = '0';
    }, 4000);

    // Progress to next level if available, otherwise stay on current
    if (currentLevel < Object.keys(rudiments).length) {
        // Update navigation BEFORE changing the level
        currentLevel++;
        currentPattern = rudiments[currentLevel].pattern;
        levelDisplay.textContent = `Level ${currentLevel}: ${rudiments[currentLevel].name}`;
        updatePatternDisplay();
        createLevelNav();
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

    // Android-optimized haptic feedback 
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }

    // Update achievement display
    showAchievementInfo();

    // Update navigation
    createLevelNav();
}

// Enhanced circle flash animation with visual feedback
function flashCircle(circle, color = null) {
    circle.classList.add('flash');
    
    // If color provided, apply it to the circle
    if (color) {
        // Store original background to restore later
        const originalBackground = circle.style.background;
        circle.style.background = color;
        
        setTimeout(() => {
            circle.style.background = originalBackground;
        }, 150);
    }
    
    // Hardware accelerated animation
    circle.style.transform = 'scale(1.1)';
    
    setTimeout(() => {
        circle.classList.remove('flash');
        circle.style.transform = 'scale(1.0)';
    }, 150); // Shorter time for Android to match closer to sound
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
        }, 250); // Slightly faster on Android
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

function handleStroke(hand, volume = 1.0, color = null) {
    // First check if audio ready - on Android this is crucial
    if (!audioInitialized) {
        initAudio();
        return;
    }
    
    // Always try to resume audio context if needed - key for Android
    if (audioContext && audioContext.state !== 'running') {
        audioContext.resume();
    }
    
    // Play sound with volume based on position
    playSound(hand, volume);

    // Update visuals with color based on position
    const circle = hand === 'L' ? circleL : circleR;
    flashCircle(circle, color);

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

// Initialize audio context and preload sounds with Android optimizations
async function initAudio() {
    if (audioInitialized) return;
    
    try {
        // Create optimized audio context
        audioContext = createOptimizedAudioContext();
        
        // Android-specific setup
        setupAndroidAudio(audioContext);
        
        const snareFiles = [
            'snare.mp3', 'snare1.mp3', 'snare2.mp3',
            'snare3.mp3', 'snare4.mp3', 'snare5.mp3'
        ];
        const bassFiles = [
            'bass.mp3', 'bass1.mp3', 'bass2.mp3',
            'bass3.mp3', 'bass4.mp3', 'bass5.mp3'
        ];

        // Show loading indicator
        feedback.textContent = "Loading sounds...";
        
        // Android-specific loading optimizations
        try {
            // Pre-create gain node that will be reused
            cachedGainNode = audioContext.createGain();
            cachedGainNode.gain.value = 1.0;
            cachedGainNode.connect(audioContext.destination);
            
            // Android optimization: Pre-create source nodes
            // Create just a few placeholder source nodes to help "warm up" the audio system
            for (let i = 0; i < 3; i++) {
                const dummyBuffer = audioContext.createBuffer(1, 44100, 44100);
                const source = audioContext.createBufferSource();
                source.buffer = dummyBuffer;
                preCreatedSourceNodes.push(source);
            }
        } catch (err) {
            console.log('Pre-creation step skipped:', err);
        }

        // Android optimization: Helper to fetch & decode with error handling and retries
        const load = async (url, retries = 2) => {
            try {
                // Android: Use XHR instead of fetch for better compatibility
                // with older Android WebView implementations
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', url, true);
                    xhr.responseType = 'arraybuffer';
                    
                    xhr.onload = function() {
                        if (xhr.status === 200) {
                            // Decode with error handling
                            audioContext.decodeAudioData(xhr.response, 
                                (buffer) => resolve(buffer),
                                (err) => {
                                    console.error(`Error decoding ${url}:`, err);
                                    // Return an empty buffer as fallback
                                    resolve(audioContext.createBuffer(2, 44100, 44100));
                                }
                            );
                        } else {
                            reject(new Error(`Failed to load ${url}: ${xhr.status}`));
                        }
                    };
                    
                    xhr.onerror = function() {
                        if (retries > 0) {
                            console.log(`Retrying ${url}, ${retries} attempts left`);
                            setTimeout(() => resolve(load(url, retries - 1)), 500);
                        } else {
                            console.error(`Failed to load ${url} after retries`);
                            // Return an empty buffer to prevent crashes
                            resolve(audioContext.createBuffer(2, 44100, 44100));
                        }
                    };
                    
                    xhr.send();
                });
            } catch (err) {
                console.error(`Error loading audio file ${url}:`, err);
                // Return an empty buffer as fallback
                return audioContext.createBuffer(2, 44100, 44100);
            }
        };

        // Android optimization: Load in small batches to avoid memory issues
        snareBuffers = [];
        bassBuffers = [];
        
        // Load first sounds immediately
        [snareBuffers[0], bassBuffers[0]] = await Promise.all([
            load(snareFiles[0]),
            load(bassFiles[0])
        ]);
        
        // Signal audio is initialized with at least basic sounds
        audioInitialized = true;
        feedback.textContent = "Basic sounds loaded";
        
        // Load the rest of the sounds in the background
        loadRemainingBuffers();
        
        // Function to load remaining buffers in background
        async function loadRemainingBuffers() {
            try {
                // Load the rest of the snare sounds
                for (let i = 1; i < snareFiles.length; i++) {
                    snareBuffers[i] = await load(snareFiles[i]);
                }
                
                // Load the rest of the bass sounds
                for (let i = 1; i < bassFiles.length; i++) {
                    bassBuffers[i] = await load(bassFiles[i]);
                }
                
                soundsLoaded = true;
                feedback.textContent = "All sounds loaded!";
                
                setTimeout(() => {
                    feedback.textContent = "";
                }, 1500);
                
                console.log('All drum sounds decoded and ready');
            } catch (err) {
                console.error('Error loading additional sounds:', err);
                // Still mark as complete to allow play with basic sounds
                soundsLoaded = true;
            }
        }
        
    } catch (err) {
        console.error('Error initializing audio:', err);
        feedback.textContent = "Audio error. Please reload the page.";
        
        // Recovery attempt
        setTimeout(() => {
            feedback.textContent = "Retrying audio setup...";
            audioInitialized = false;
            initAudio();
        }, 3000);
    }
}

// Android-specific audio setup
function setupAndroidAudio(ctx) {
    if (androidAudioSetup) return;
    
    // Check if we're on Android
    const isAndroid = /android/i.test(navigator.userAgent);
    
    if (isAndroid) {
        console.log('Android-specific audio optimizations applied');
        
        // Create and connect a silent oscillator to keep audio context active
        // This helps reduce latency on Android devices
        try {
            const silentOsc = ctx.createOscillator();
            silentOsc.frequency.value = 0;
            silentOsc.connect(ctx.destination);
            silentOsc.start();
            // Don't stop it - we want it to keep the audio context hot
            
            // Set up a periodic ping to keep the audio system awake
            setInterval(() => {
                if (ctx.state === 'running') {
                    // Create very short, silent buffer and play it
                    const silentBuffer = ctx.createBuffer(1, 1, 44100);
                    const source = ctx.createBufferSource();
                    source.buffer = silentBuffer;
                    source.connect(ctx.destination);
                    source.start();
                }
            }, 3000); // Every 3 seconds
        } catch (e) {
            console.log('Silent oscillator setup failed:', e);
        }
    }
    
    androidAudioSetup = true;
}

// Prevent zooming on double tap for mobile devices
// Optimized for Android touch handling
function preventZoom(e) {
    const now = Date.now();
    const timeSince = now - lastTouchEnd;
    
    if (timeSince < 500) {
        // Use preventDefault and stopPropagation on Android
        e.preventDefault();
        e.stopPropagation();
    }
    
    lastTouchEnd = now;
}// Setup event listeners for drum pad interaction
function setupEventListeners() {
    // Function to calculate position-based volume and color
    function calculatePositionEffects(element, clientX, clientY) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radius = rect.width / 2;
        const normDist = distance / radius;
        
        let volume, color;
        
        // Determine volume and color based on distance from center
        if (normDist <= 0.33) {
            // Center hit - full volume
            volume = 1.0;
            color = 'radial-gradient(circle, rgba(255,0,0,0.7) 0%, rgba(255,0,0,0) 70%)';
        } else if (normDist <= 0.66) {
            // Mid area - medium volume
            volume = 0.7;
            color = 'radial-gradient(circle, rgba(255,165,0,0.7) 0%, rgba(255,165,0,0) 70%)';
        } else if (normDist <= 1.0) {
            // Edge hit - low volume
            volume = 0.4;
            color = 'radial-gradient(circle, rgba(255,255,0,0.7) 0%, rgba(255,255,0,0) 70%)';
        } else {
            // Outside drum - very low volume (shouldn't happen with proper hit detection)
            volume = 0.2;
            color = 'none';
        }
        
        return { volume, color };
    }

    // Touch events for mobile with Android-specific optimizations
    circleR.addEventListener('touchstart', function(e) {
        e.preventDefault(); // Prevent default to avoid delays on Android
        
        const touch = e.touches[0];
        const effects = calculatePositionEffects(circleR, touch.clientX, touch.clientY);
        
        handleStroke('R', effects.volume, effects.color);
        touchStartTime = Date.now();
        
        // Show visual effect at touch point
        if (overlay) {
            overlay.style.opacity = '1';
            overlay.style.background = effects.color;
            overlay.style.left = (touch.clientX - 50) + 'px';
            overlay.style.top = (touch.clientY - 50) + 'px';
        }
    }, { passive: false });

    circleL.addEventListener('touchstart', function(e) {
        e.preventDefault(); // Prevent default to avoid delays on Android
        
        const touch = e.touches[0];
        const effects = calculatePositionEffects(circleL, touch.clientX, touch.clientY);
        
        handleStroke('L', effects.volume, effects.color);
        touchStartTime = Date.now();
        
        // Show visual effect at touch point
        if (overlay) {
            overlay.style.opacity = '1';
            overlay.style.background = effects.color;
            overlay.style.left = (touch.clientX - 50) + 'px';
            overlay.style.top = (touch.clientY - 50) + 'px';
        }
    }, { passive: false });

    // Handle touch end to reset overlay
    document.addEventListener('touchend', function() {
        if (overlay) {
            overlay.style.opacity = '0';
        }
    });

    // Mouse events for desktop with position detection
    circleR.addEventListener('mousedown', function(e) {
        const effects = calculatePositionEffects(circleR, e.clientX, e.clientY);
        handleStroke('R', effects.volume, effects.color);
        
        // Show visual effect at click point
        if (overlay) {
            overlay.style.opacity = '1';
            overlay.style.background = effects.color;
            overlay.style.left = (e.clientX - 50) + 'px';
            overlay.style.top = (e.clientY - 50) + 'px';
        }
    });

    circleL.addEventListener('mousedown', function(e) {
        const effects = calculatePositionEffects(circleL, e.clientX, e.clientY);
        handleStroke('L', effects.volume, effects.color);
        
        // Show visual effect at click point
        if (overlay) {
            overlay.style.opacity = '1';
            overlay.style.background = effects.color;
            overlay.style.left = (e.clientX - 50) + 'px';
            overlay.style.top = (e.clientY - 50) + 'px';
        }
    });
    
    // Handle mouse up to reset overlay
    document.addEventListener('mouseup', function() {
        if (overlay) {
            overlay.style.opacity = '0';
        }
    });

    // Keyboard events for accessibility - use default volume since no position info
    document.addEventListener('keydown', function(e) {
        // Only trigger if not typing in an input
        if (document.activeElement.tagName !== 'INPUT' && 
            document.activeElement.tagName !== 'TEXTAREA') {
            
            if (e.key === 'd' || e.key === 'D') {
                handleStroke('R', 1.0);
                flashCircle(circleR);
            } else if (e.key === 'a' || e.key === 'A') {
                handleStroke('L', 1.0);
                flashCircle(circleL);
            }
        }
    });

    // Prevent double-tap zoom on Android
    document.addEventListener('touchend', preventZoom, { passive: false });

    // Prevent context menu on long press for Android
    document.addEventListener('contextmenu', function(e) {
        if (/Android/i.test(navigator.userAgent)) {
            e.preventDefault();
            return false;
        }
    });

    // Service worker registration for PWA support
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/sw.js').then(function(registration) {
                console.log('ServiceWorker registration successful');
            }).catch(function(err) {
                console.log('ServiceWorker registration failed:', err);
            });
        });
    }

    // Handle visibility change for better Android performance
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Pause audio processing when app is in background
            if (audioContext && audioContext.state === 'running') {
                try {
                    audioContext.suspend();
                } catch (e) {
                    console.log('Could not suspend audio context:', e);
                }
            }
        } else {
            // Resume audio when app is visible again
            if (audioContext && audioContext.state === 'suspended') {
                try {
                    audioContext.resume();
                } catch (e) {
                    console.log('Could not resume audio context:', e);
                }
            }
        }
    });

    // Setup full screen mode for Android
    const fullscreenButton = document.getElementById('fullscreen-button');
    if (fullscreenButton) {
        fullscreenButton.addEventListener('click', function() {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
                document.documentElement.webkitRequestFullscreen();
            }
        });
    }
}

// Add CSS styles for the overlay
function addOverlayStyles() {
    // Check if we already have style element
    let styleEl = document.getElementById('drum-overlay-styles');
    
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'drum-overlay-styles';
        
        styleEl.innerHTML = `
            #overlay {
                position: absolute;
                width: 100px;
                height: 100px;
                border-radius: 50%;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.15s ease-out;
                z-index: 1000;
            }
            
            .circle {
                position: relative;
                overflow: visible; /* Allow effects to expand beyond boundary */
            }
        `;
        
        document.head.appendChild(styleEl);
    }
}

// Initialize overlay during app startup
function initOverlay() {
    // Only create if it doesn't exist
    if (!document.getElementById('overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'overlay';
        document.body.appendChild(overlay);
    }
    
    // Add the styles for overlay
    addOverlayStyles();
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

    // Initialize overlay for visual feedback
    initOverlay();
    
    // Setup event listeners
    setupEventListeners();
    
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
function preloadImages() {
    // List of images to preload
    const images = [
        'img/background.png',
        'img/drum-left.png',
        'img/drum-right.png',
        'img/trophy-bronze.png',
        'img/trophy-silver.png',
        'img/trophy-gold.png'
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
