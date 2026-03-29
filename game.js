/* ========================================
   CATCH THE CLEAN WATER - GAME LOGIC
   Vanilla JavaScript ES6+
   ======================================== */

// ----- STATE MANAGEMENT -----
let score = 0;
let timeLeft = 30;
let gameLoopTimeout = null;
let timerInterval = null;
let isGameRunning = false;
const GAME_DURATION = 30; // Total game time in seconds

// ----- DOM SELECTION -----
const scoreDisplay = document.getElementById('score-value');
const timerDisplay = document.getElementById('timer-value');
const holes = document.querySelectorAll('.hole');
const resetButton = document.getElementById('reset-game');
const endgameModal = document.getElementById('endgame-modal');
const finalScoreDisplay = document.getElementById('final-score');
const playAgainButton = document.getElementById('play-again');
const endgameMessage = document.getElementById('endgame-message');

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
 * Scales from 2000ms at start to 500ms at end for increasing difficulty
 * @returns {number} Lifespan in milliseconds
 */
const calculateDynamicLifespan = () => {
  const maxLifespan = 2000; // Maximum time water stays visible (at game start)
  const minLifespan = 500;  // Minimum time water stays visible (at game end)
  
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
  // Find an empty hole
  let hole = getRandomHole();
  let attempts = 0;
  const maxAttempts = 20;
  
  // Try to find an unoccupied hole (with limit to prevent infinite loop)
  while (isHoleOccupied(hole) && attempts < maxAttempts) {
    hole = getRandomHole();
    attempts++;
  }
  
  // If all holes are occupied, skip this spawn
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
 */
const scheduleNextSpawn = () => {
  if (!isGameRunning) return;
  
  // Calculate dynamic delay based on remaining time
  const dynamicDelay = calculateDynamicLifespan();
  
  // Add some randomness to the spawn timing (±200ms)
  const randomOffset = getRandomInt(-200, 200);
  const nextSpawnDelay = Math.max(300, dynamicDelay + randomOffset);
  
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
  timeLeft = 30;
  isGameRunning = true;
  
  // Update displays
  updateScoreDisplay();
  updateTimerDisplay();
  
  // Clear any existing water
  clearGrid();
  
  // Hide modal if visible
  endgameModal.classList.add('hidden');
  endgameModal.setAttribute('aria-hidden', 'true');
  
  // Start game systems
  startTimer();
  startGameLoop();
};

/**
 * EXTRA CREDIT: Reset the game
 */
const resetGame = () => {
  // Clear intervals and timeouts
  clearTimeout(gameLoopTimeout);
  clearInterval(timerInterval);
  
  // Clear grid
  clearGrid();
  
  // Start fresh
  startGame();
};

// ----- EVENT LISTENERS FOR BUTTONS -----

resetButton.addEventListener('click', resetGame);
playAgainButton.addEventListener('click', resetGame);

// ----- INITIALIZE GAME ON PAGE LOAD -----

// Auto-start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
  startGame();
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
