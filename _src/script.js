/**
 * MINESWEEPER - CUSTOM CHALLENGE EDITION
 * Includes: Variable mine counts, countdown logic, and tick sounds.
 */

// 1. STATE & CONSTANTS

const { Engine, Render, Runner, Bodies, Composite, Body } = Matter;
let engine, runner;

const ROWS = 15;
const COLS = 10;
const SOUND_PATH = '/sounds/keyboard/keypress-';
const TICK_SOUND_PATH = '/sounds/S1_CD.wav';

let board = [];
let gameOver = false;
let firstClick = true;
let seconds = 0;
let timerInterval = null;
let minesFlagged = 0;
let winInterval = null;

// Dynamic Game Settings
let currentMines = 15;
let isChallengeMode = false;
const tickAudio = new Audio(TICK_SOUND_PATH);

// DOM Elements
const boardElement = document.getElementById('board');
const mineDisplay = document.getElementById('mine-count');
const timerDisplay = document.getElementById('timer');
const resetBtn = document.getElementById('reset-btn');
const windowElement = document.querySelector('.minesweeper-window');
const timeInput = document.getElementById('time-input');
const mineInput = document.getElementById('mine-input');
const goBtn = document.getElementById('go-btn');

function initPhysics() {
    // We don't need a visible 'Render' because we'll attach physics to DOM elements
    engine = Engine.create();
    runner = Runner.create();
    Runner.run(runner, engine);
}

// 2. AUDIO & VISUAL EFFECTS
function playKeySound() {
    const rand = Math.floor(Math.random() * 32) + 1;
    const fileName = rand.toString().padStart(3, '0');
    const audio = new Audio(`${SOUND_PATH}${fileName}.wav`);
    audio.playbackRate = 0.95 + Math.random() * 0.1; 
    audio.play().catch(() => {}); 
}

function triggerShake() {
    windowElement.classList.remove('shake-trigger');
    void windowElement.offsetWidth; 
    windowElement.classList.add('shake-trigger');
}

function spawnParticles(element, color = '#888') {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 6; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.backgroundColor = color;
        document.body.appendChild(p);

        let vx = (Math.random() - 0.5) * 8;
        let vy = (Math.random() - 0.5) * 8 - 3; 
        let px = centerX;
        let py = centerY;
        let opacity = 1;

        const animate = () => {
            px += vx; py += vy; vy += 0.2; opacity -= 0.02;
            p.style.left = `${px}px`; p.style.top = `${py}px`; p.style.opacity = opacity;
            if (opacity > 0) requestAnimationFrame(animate);
            else p.remove();
        };
        requestAnimationFrame(animate);
    }
}

// 3. GAME INITIALIZATION
function init() {
    if (winInterval) clearInterval(winInterval);
    winInterval = null;
    stopTimer();

    board = [];
    gameOver = false;
    firstClick = true;
    minesFlagged = 0;
    
    if (!isChallengeMode) seconds = 0;

    boardElement.innerHTML = '';
    boardElement.style.setProperty('--grid-rows', ROWS);
    boardElement.style.setProperty('--grid-cols', COLS);
    
    mineDisplay.classList.remove('flash-active');
    timerDisplay.classList.remove('flash-active');
    mineDisplay.style.color = "#ff0000"; 
    
    // Update HUD with current settings
    mineDisplay.innerText = currentMines.toString().padStart(4, '0');
    timerDisplay.innerText = seconds.toString().padStart(4, '0');
    
    resetBtn.innerText = '🙂';
    windowElement.classList.remove('shake-trigger');

    for (let r = 0; r < ROWS; r++) {
        let row = [];
        for (let c = 0; c < COLS; c++) {
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');
            cellElement.addEventListener('mousedown', () => { if(!gameOver) resetBtn.innerText = '😮'; });
            cellElement.addEventListener('mouseup', () => { if(!gameOver) resetBtn.innerText = '🙂'; });
            cellElement.addEventListener('click', () => handleLeftClick(r, c));
            cellElement.addEventListener('contextmenu', (e) => { e.preventDefault(); handleRightClick(r, c); });
            boardElement.appendChild(cellElement);
            row.push({ r, c, isMine: false, isRevealed: false, isFlagged: false, mineCount: 0, element: cellElement });
        }
        board.push(row);
    }
}

// 4. CORE LOGIC
function handleLeftClick(r, c) {
    if (gameOver || board[r][c].isFlagged || board[r][c].isRevealed) return;
    if (firstClick) {
        firstClick = false;
        placeMines(r, c);
        calculateNumbers();
        startTimer();
    }
    reveal(r, c);
}

function handleRightClick(r, c) {
    if (gameOver || board[r][c].isRevealed) return;
    const cell = board[r][c];
    cell.isFlagged = !cell.isFlagged;
    cell.element.classList.toggle('flagged');
    minesFlagged += cell.isFlagged ? 1 : -1;
    const remaining = Math.max(0, currentMines - minesFlagged);
    mineDisplay.innerText = remaining.toString().padStart(4, '0');
    playKeySound(); 
}

function reveal(r, c) {
    const cell = board[r][c];
    if (cell.isRevealed || cell.isFlagged || gameOver) return;

    if (cell.isMine) {
        endGame(false);
        return;
    }

    cell.isRevealed = true;
    cell.element.classList.add('revealed');
    playKeySound();
    spawnParticles(cell.element, '#888');

    if (cell.mineCount > 0) {
        cell.element.innerText = cell.mineCount;
        cell.element.classList.add(`n-${cell.mineCount}`);
    } else {
        getNeighbors(r, c).forEach((nb, index) => {
            setTimeout(() => reveal(nb.r, nb.c), index * 12);
        });
    }
    checkWin();
}

// 5. SYSTEMS
function placeMines(startR, startC) {
    let placed = 0;
    while (placed < currentMines) {
        let r = Math.floor(Math.random() * ROWS);
        let c = Math.floor(Math.random() * COLS);
        // Avoid placing mine on first click or duplicate locations
        if (!board[r][c].isMine && (r !== startR || c !== startC)) {
            board[r][c].isMine = true;
            placed++;
        }
    }
}

function calculateNumbers() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c].isMine) continue;
            board[r][c].mineCount = getNeighbors(r, c).filter(n => n.isMine).length;
        }
    }
}

function getNeighbors(r, c) {
    const neighbors = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            if (board[r + dr] && board[r + dr][c + dc]) neighbors.push(board[r + dr][c + dc]);
        }
    }
    return neighbors;
}

function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
        if (isChallengeMode) {
            seconds--;
            tickAudio.play().catch(() => {});
            if (seconds <= 0) {
                seconds = 0;
                endGame(false);
            }
        } else {
            seconds = Math.min(seconds + 1, 9999);
        }
        timerDisplay.innerText = seconds.toString().padStart(4, '0');
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function checkWin() {
    const win = board.flat().every(cell => cell.isMine || cell.isRevealed);
    if (win) endGame(true);
}

function endGame(isWin) {
    gameOver = true;
    stopTimer();
    resetBtn.innerText = isWin ? '😎' : '😵';
    
    if (!isWin) {
        // Initialize Matter.js Physics Engine
        initPhysics(); 

        mineDisplay.innerText = "GAME";
        timerDisplay.innerText = "OVER";
        mineDisplay.classList.add('flash-active');
        timerDisplay.classList.add('flash-active');

        // 1. Filter only 'Active' cells (Mines and Flags) to prevent delay on empty tiles
        const activeCells = board.flat().filter(cell => cell.isMine || cell.isFlagged);

        activeCells.forEach((cell, index) => {
            // Sequential delay based only on the active items
            const delay = index * 60; 

            setTimeout(() => {
                // Handle Mine Explosion
                if (cell.isMine) {
                    cell.element.classList.add('mine');
                    triggerShake();
                    spawnParticles(cell.element, '#ff0000');
                    // Play sound every few mines to prevent audio lag
                    if (index % 3 === 0) playKeySound();
                }

                // Handle Flag Ejection (Physical Matter.js Object)
                if (cell.isFlagged) {
                    // Create a separate div for the physical flag so it can "fly"
                    const flyingFlag = document.createElement('div');
                    flyingFlag.innerText = "🚩";
                    flyingFlag.style.fontSize = "1.2rem";
                    flyingFlag.style.position = "absolute";
                    document.body.appendChild(flyingFlag);
                    
                    // Trigger the physical upward burst and slow rotation
                    spawnPhysicalFlag(flyingFlag, cell.element);
                    
                    // Remove flag from the board tile so we can see the result underneath
                    cell.element.classList.remove('flagged'); 

                    // If they flagged a non-mine, mark it with the Red X
                    if (!cell.isMine) {
                        cell.element.classList.add('incorrect-flag');
                    }
                }
            }, delay);
        });

    } else {
        // Win Logic: Flash messages and flag all mines
        const messages = ["YOU ", "WIN ", "GG  ", "NICE"];
        let idx = 0;
        winInterval = setInterval(() => {
            mineDisplay.innerText = messages[idx];
            idx = (idx + 1) % messages.length;
        }, 1000);
        
        board.flat().filter(c => c.isMine).forEach(c => {
            c.element.classList.add('flagged');
        });

        setTimeout(promptHighScore, 1000);
    }
}

/**
 * Helper to initialize Matter.js components
 */
function initPhysics() {
    engine = Engine.create();
    runner = Runner.create();
    Runner.run(runner, engine);
}

/**
 * Helper to spawn a physical flag and sync its position to a DOM element
 */
function spawnPhysicalFlag(visualElement, originElement) {
    const rect = originElement.getBoundingClientRect();
    
    // THE FIX: Anchor the element to the top-left of the viewport 
    // so translate(x,y) perfectly matches the Matter.js physics body coordinates.
    visualElement.style.position = "fixed";
    visualElement.style.top = "0px";
    visualElement.style.left = "0px";
    visualElement.style.margin = "0px";
    
    // Create physical body at the tile's coordinates
    const flagBody = Bodies.rectangle(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        rect.width,
        rect.height,
        { 
            frictionAir: 0.04, // Simulates air resistance for "slow" fall
            restitution: 0.5   // Slight bounciness
        }
    );

    // Initial Physics: Pop up slightly and rotate
    Body.setVelocity(flagBody, { 
        x: (Math.random() - 0.5) * 6, // Random horizontal drift
        y: -12                        // Initial upward burst
    });
    Body.setAngularVelocity(flagBody, (Math.random() - 0.5) * 0.15); // Slow rotation

    Composite.add(engine.world, flagBody);

    // Sync loop: Updates DOM position based on Physics body
    const updateLoop = () => {
        const { x, y } = flagBody.position;
        const angle = flagBody.angle;
        
        visualElement.style.transform = `translate(${x - rect.width/2}px, ${y - rect.height/2}px) rotate(${angle}rad)`;
        visualElement.style.zIndex = "2000";
        visualElement.style.pointerEvents = "none";

        // Performance: Keep updating until it falls below the screen
        if (y < window.innerHeight + 100) {
            requestAnimationFrame(updateLoop);
        } else {
            Composite.remove(engine.world, flagBody);
            visualElement.remove();
        }
    };
    requestAnimationFrame(updateLoop);
}

// 6. EVENT LISTENERS
goBtn.addEventListener('click', () => {
    isChallengeMode = true;
    
    // 1. Set Mine Count (Clamp between 1 and total cells - 1)
    const requestedMines = parseInt(mineInput.value) || 15;
    currentMines = Math.max(1, Math.min(requestedMines, (ROWS * COLS) - 1));
    mineInput.value = currentMines;

    // 2. Set Time
    const inputMins = parseFloat(timeInput.value);
    
    // Logic: Always use the input box value to calculate seconds
    if (!isNaN(inputMins) && inputMins > 0) {
        seconds = Math.min(Math.floor(inputMins * 60), 3600); // Max 1 hour
    } else {
        // Fallback only if input is empty or invalid
        seconds = currentMines * 9;
    }
    
    init();
});

resetBtn.addEventListener('click', () => {
    isChallengeMode = false; 
    init();
});

// Initial Load
init();

// 7. HIGH SCORE SYSTEM
async function saveHighScore(playerData) {
    // Replace with your actual Google Web App URL from the deployment step
    const GOOGLE_URL = "https://script.google.com/macros/s/AKfycbwFcodrcxA3X5nQnq-phL5j-ibjzsXF10tLb5KQFpCsXJiFNkHssz9v84g-Pg_bakfO/exec";

    try {
        await fetch(GOOGLE_URL, {
            method: "POST",
            mode: "no-cors", 
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(playerData)
        });
        alert("Score saved to the global leaderboard!");
    } catch (error) {
        console.error("Error saving score:", error);
    }
}

function getFormattedTime() {
    // 1. Determine total seconds elapsed
    // In Challenge Mode: Total Time Input - Remaining Seconds
    // In Classic Mode: Just the 'seconds' variable
    let totalSeconds;
    
    if (isChallengeMode) {
        const totalAllowed = parseInt(timeInput.value) * 60;
        totalSeconds = totalAllowed - seconds;
    } else {
        totalSeconds = seconds;
    }

    // 2. Math to break seconds into HH:MM:SS
    const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    
    // 3. Milliseconds placeholder (standard for your requested format)
    const ms = "00"; 
    
    return `${hrs}:${mins}:${secs};${ms}`;
}

// Function to handle the user interaction
function promptHighScore() {
    const playerName = prompt("NEW HIGH SCORE! Enter your name:", "N/A");
    
    // If user hits 'Cancel' or leaves it blank, we don't send anything
    if (playerName === null) return;

    const scoreData = {
        name: playerName || "Anonymous",
        mode: isChallengeMode ? "Challenge" : "Classic",
        flagsPlanted: minesFlagged,
        minesInGame: currentMines,
        timeAllowed: isChallengeMode ? timeInput.value + "m" : "N/A",
        completionTime: getFormattedTime() // Uses the value currently in the HUD
    };

    saveHighScore(scoreData);
}

const leaderboardWindow = document.getElementById('leaderboard-window');
const scoresBody = document.getElementById('scores-body');
const closeLeaderboard = document.getElementById('close-leaderboard');

// Toggle the window open
viewScoresBtn.addEventListener('click', async () => {
    // Re-using the URL you already have in your script
    const GOOGLE_URL = "https://script.google.com/macros/s/AKfycbwFcodrcxA3X5nQnq-phL5j-ibjzsXF10tLb5KQFpCsXJiFNkHssz9v84g-Pg_bakfO/exec";
    
    viewScoresBtn.innerText = "WAIT...";
    leaderboardWindow.style.display = 'block';
    scoresBody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
    
    try {
        const response = await fetch(GOOGLE_URL);
        const scores = await response.json();
        
        // Sort fastest first
        scores.sort((a, b) => a.time.localeCompare(b.time));
        
        scoresBody.innerHTML = ''; // Clear loading text
        
        scores.slice(0, 10).forEach(s => {
            const row = `<tr>
                <td>${s.name.toUpperCase()}</td>
                <td>${s.time}</td>
                <td>${s.mode}</td>
            </tr>`;
            scoresBody.innerHTML += row;
        });
        
    } catch (err) {
        scoresBody.innerHTML = '<tr><td colspan="3">ERROR LOADING</td></tr>';
    } finally {
        viewScoresBtn.innerText = "SCORES";
    }
});

// Close window logic
closeLeaderboard.addEventListener('click', () => {
    leaderboardWindow.style.display = 'none';
});
