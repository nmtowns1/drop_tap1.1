/* ========================================
   CATCH THE CLEAN WATER - GAME LOGIC
   Vanilla JavaScript ES6+
   ======================================== */

// ----- DIFFICULTY SETTINGS -----
const DIFFICULTY_SETTINGS = {
  easy:   { timer: 45, dropletDuration: 1800 },
  normal: { timer: 30, dropletDuration: 1200 },
  hard:   { timer: 10, dropletDuration: 700 }
};

// ----- STATE MANAGEMENT -----
let score = 0;
let GAME_DURATION = DIFFICULTY_SETTINGS.normal.timer; // Will be set by difficulty
let BASE_DROPLET_DURATION = DIFFICULTY_SETTINGS.normal.dropletDuration; // Will be set by difficulty
let timeLeft = GAME_DURATION;
let gameLoopTimeout = null;
let timerInterval = null;
let isGameRunning = false;
let currentDifficulty = 'normal'; // Track current difficulty mode

// ----- AUDIO MANAGEMENT -----
// Using Web Audio API to create simple sounds that will always work
const createBeep = (frequency, duration, volume) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

// Audio play functions
const playErrorSound = () => {
  createBeep(200, 0.2, 0.3); // Low buzz for error
};

const playSuccessSound = () => {
  createBeep(800, 0.1, 0.3); // High beep for success
};

// Death metal for hard mode - using local audio file
const deathMetalSound = new Audio('death_metal.mp3');
deathMetalSound.loop = true;
deathMetalSound.volume = 0.3;

// ----- DOM SELECTION -----
const scoreDisplay = document.getElementById('score-value');
const timerDisplay = document.getElementById('timer-value');
const holes = document.querySelectorAll('.hole');
const resetButton = document.getElementById('reset-game');
const endgameModal = document.getElementById('endgame-modal');
const finalScoreDisplay = document.getElementById('final-score');
const playAgainButton = document.getElementById('play-again');
const endgameMessage = document.getElementById('endgame-message');

// Start screen elements
const startScreen = document.getElementById('start-screen');
const easyBtn = document.getElementById('easy-btn');
const normalBtn = document.getElementById('normal-btn');
const hardBtn = document.getElementById('hard-btn');
const gameDashboard = document.getElementById('game-dashboard');
const gameBoard = document.getElementById('game-board');
const resetButtonContainer = document.getElementById('reset-button-container');

// ----- UTILITY FUNCTIONS -----

/**
 * Get a random integer between min and max (inclusive)
 */
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Get a random number between min and max (for decimal values)
 */
const getRandomFloat = (min, max) => {
  return Math.random() * (max - min) + min;
};

/**
 * Select a random hole from the grid
 * @returns {HTMLElement} A random hole element
 */
const getRandomHole = () => {
  const randomIndex = getRandomInt(0, holes.length - 1);
  return holes[randomIndex];
};

/**
 * Check if a hole is currently occupied by water
 */
const isHoleOccupied = (hole) => {
  return hole.querySelector('.clean-water') || hole.querySelector('.dirty-water');
};

/**
 * Update the score display in the DOM
 */
const updateScoreDisplay = () => {
  scoreDisplay.textContent = score;
};

/**
 * Update the timer display in the DOM
 */
const updateTimerDisplay = () => {
  timerDisplay.textContent = timeLeft;
};

/**
 * Calculate dynamic lifespan based on remaining time
 * Scales from BASE_DROPLET_DURATION at start to 50% of that at end for increasing difficulty
 * @returns {number} Lifespan in milliseconds
 */
const calculateDynamicLifespan = () => {
  const maxLifespan = BASE_DROPLET_DURATION; // Maximum time water stays visible (at game start)
  const minLifespan = BASE_DROPLET_DURATION * 0.5;  // Minimum time water stays visible (at game end)
  
  // Linear interpolation based on time remaining
  // As timeLeft decreases, lifespan decreases (game gets harder)
  const lifespan = minLifespan + (timeLeft / GAME_DURATION) * (maxLifespan - minLifespan);
  
  return Math.max(minLifespan, Math.min(maxLifespan, lifespan));
};

// ----- CORE GAME LOOP -----

/**
 * Spawn water (clean or dirty) in a random hole with dynamic difficulty
 * 70% chance of clean water, 30% chance of dirty water
 * Lifespan scales dynamically based on time remaining
 */
const spawnWater = () => {
  // Find an empty hole (try a few times, but allow overlaps)
  let hole = getRandomHole();
  let attempts = 0;
  const maxAttempts = 5; // Reduced attempts - allow more overlaps
  
  // Try to find an unoccupied hole (with fewer attempts to increase overlap)
  while (isHoleOccupied(hole) && attempts < maxAttempts) {
    hole = getRandomHole();
    attempts++;
  }
  
  // If all holes checked are occupied, just skip this spawn
  if (isHoleOccupied(hole)) {
    // Still schedule next spawn even if we couldn't place water
    scheduleNextSpawn();
    return;
  }
  
  // Determine water type based on probability
  const isCleanWater = Math.random() < 0.7; // 70% chance
  const waterType = isCleanWater ? 'clean-water' : 'dirty-water';
  
  // Create water element
  const waterElement = document.createElement('div');
  waterElement.classList.add(waterType);
  hole.appendChild(waterElement);
  
  // Calculate dynamic lifespan based on remaining time
  const dynamicLifespan = calculateDynamicLifespan();
  
  // Auto-remove water after dynamic lifespan if not clicked
  setTimeout(() => {
    if (waterElement.parentElement === hole) {
      hole.removeChild(waterElement);
    }
  }, dynamicLifespan);
  
  // Schedule the next water spawn
  scheduleNextSpawn();
};

/**
 * Recursive function to schedule the next water spawn with dynamic difficulty
 * Uses setTimeout instead of setInterval for variable timing
 * Spawns more frequently to allow multiple droplets on screen
 */
const scheduleNextSpawn = () => {
  if (!isGameRunning) return;
  
  // Faster spawn rate: 30-50% of droplet lifespan for overlap
  const baseSpawnRate = calculateDynamicLifespan() * 0.4;
  
  // Add some randomness to the spawn timing (±150ms)
  const randomOffset = getRandomInt(-150, 150);
  const nextSpawnDelay = Math.max(200, baseSpawnRate + randomOffset);
  
  // Schedule next spawn using recursive setTimeout
  gameLoopTimeout = setTimeout(() => {
    spawnWater();
  }, nextSpawnDelay);
};

// ----- INTERACTIVITY & SCORING -----

/**
 * Handle click events on holes
 */
const handleHoleClick = (event) => {
  if (!isGameRunning) return;
  
  const hole = event.currentTarget;
  const cleanWater = hole.querySelector('.clean-water');
  const dirtyWater = hole.querySelector('.dirty-water');
  
  // If clicked on clean water (good!)
  if (cleanWater) {
    score += 10;
    updateScoreDisplay();
    
    // Play success sound
    playSuccessSound();
    
    // Visual feedback
    hole.classList.add('clicked-good');
    setTimeout(() => {
      hole.classList.remove('clicked-good');
    }, 400);
    
    // Remove water element
    hole.removeChild(cleanWater);
  }
  
  // If clicked on dirty water (bad!)
  else if (dirtyWater) {
    score -= 5;
    updateScoreDisplay();
    
    // Play error sound
    playErrorSound();
    
    // Visual feedback
    hole.classList.add('clicked-bad');
    setTimeout(() => {
      hole.classList.remove('clicked-bad');
    }, 400);
    
    // Remove water element
    hole.removeChild(dirtyWater);
  }
};

// Attach click listeners to all holes
holes.forEach(hole => {
  hole.addEventListener('click', handleHoleClick);
});

// ----- TIMER & GAME FLOW -----

/**
 * Countdown timer that runs every second
 */
const startTimer = () => {
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
};

/**
 * Start the dynamic difficulty game loop
 * Uses recursive setTimeout for variable spawn timing
 */
const startGameLoop = () => {
  // Kick off the first spawn immediately
  spawnWater();
};

/**
 * Clear all water elements from the grid
 */
const clearGrid = () => {
  holes.forEach(hole => {
    const water = hole.querySelector('.clean-water, .dirty-water');
    if (water) {
      hole.removeChild(water);
    }
    hole.classList.remove('clicked-good', 'clicked-bad');
  });
};

/**
 * End the game and show the modal
 */
const endGame = () => {
  // Stop game
  isGameRunning = false;
  clearTimeout(gameLoopTimeout);
  clearInterval(timerInterval);
  
  // Stop death metal if playing
  deathMetalSound.pause();
  deathMetalSound.currentTime = 0;
  
  // Update final score
  finalScoreDisplay.textContent = score;
  
  // Update message based on score
  if (score > 100) {
    endgameMessage.textContent = '🎉 Amazing! You\'re a Water Hero!';
    
    // EXTRA CREDIT: Confetti celebration
    if (typeof confetti !== 'undefined') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  } else if (score > 50) {
    endgameMessage.textContent = 'Great Job! Keep Going!';
  } else if (score >= 0) {
    endgameMessage.textContent = 'Good Try! Practice Makes Perfect!';
  } else {
    endgameMessage.textContent = 'Oops! Watch Out for Dirty Water!';
  }
  
  // Show modal
  endgameModal.classList.remove('hidden');
  endgameModal.setAttribute('aria-hidden', 'false');
};

/**
 * Start a new game
 */
const startGame = () => {
  // Reset state
  score = 0;
  timeLeft = GAME_DURATION;
  isGameRunning = true;
  
  // Update displays
  updateScoreDisplay();
  updateTimerDisplay();
  
  // Clear any existing water
  clearGrid();
  
  // Hide modal if visible
  endgameModal.classList.add('hidden');
  endgameModal.setAttribute('aria-hidden', 'true');
  
  // Start death metal in hard mode
  if (currentDifficulty === 'hard') {
    deathMetalSound.currentTime = 0;
    deathMetalSound.play().catch(err => console.log('Audio play failed:', err));
  }
  
  // Start game systems
  startTimer();
  startGameLoop();
};

/**
 * EXTRA CREDIT: Reset the game
 */
const resetGame = () => {
  // Stop the game
  isGameRunning = false;
  
  // Clear intervals and timeouts
  clearTimeout(gameLoopTimeout);
  clearInterval(timerInterval);
  
  // Stop death metal if playing
  deathMetalSound.pause();
  deathMetalSound.currentTime = 0;
  
  // Clear grid
  clearGrid();
  
  // Hide game board and dashboard
  gameDashboard.style.display = 'none';
  gameBoard.style.display = 'none';
  resetButtonContainer.style.display = 'none';
  
  // Hide modal if visible
  endgameModal.classList.add('hidden');
  endgameModal.setAttribute('aria-hidden', 'true');
  
  // Show start screen
  startScreen.style.display = 'flex';
  
  // Reset score display
  score = 0;
  updateScoreDisplay();
};

// ----- DIFFICULTY SELECTION -----

/**
 * Set difficulty and start the game
 */
const selectDifficulty = (mode) => {
  currentDifficulty = mode; // Track the difficulty mode
  GAME_DURATION = DIFFICULTY_SETTINGS[mode].timer;
  BASE_DROPLET_DURATION = DIFFICULTY_SETTINGS[mode].dropletDuration;
  
  // Hide start screen, show game
  startScreen.style.display = 'none';
  gameDashboard.style.display = 'flex';
  gameBoard.style.display = 'block';
  resetButtonContainer.style.display = 'flex';
  
  // Start the game
  startGame();
};

easyBtn.addEventListener('click', () => selectDifficulty('easy'));
normalBtn.addEventListener('click', () => selectDifficulty('normal'));
hardBtn.addEventListener('click', () => selectDifficulty('hard'));

// ----- EVENT LISTENERS FOR BUTTONS -----

resetButton.addEventListener('click', resetGame);
playAgainButton.addEventListener('click', resetGame);

// ----- INITIALIZE GAME ON PAGE LOAD -----

// Hide game board and dashboard initially, show start screen
window.addEventListener('DOMContentLoaded', () => {
  gameDashboard.style.display = 'none';
  gameBoard.style.display = 'none';
  resetButtonContainer.style.display = 'none';
  startScreen.style.display = 'flex';
});

// Optional: Add keyboard support for accessibility
document.addEventListener('keydown', (event) => {
  if (!isGameRunning) return;
  
  // Map number keys 1-9 to corresponding holes
  const keyMap = {
    '1': 0, '2': 1, '3': 2,
    '4': 3, '5': 4, '6': 5,
    '7': 6, '8': 7, '9': 8
  };
  
  if (keyMap.hasOwnProperty(event.key)) {
    const holeIndex = keyMap[event.key];
    holes[holeIndex].click();
  }
});
