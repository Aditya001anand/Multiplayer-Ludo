// frontend/js/ui.js

const statusEl = document.getElementById('status');
const diceBtn = document.getElementById('dice');
const diceResultEl = document.getElementById('dice-result');
const boardEl = document.getElementById('ludo-board');

let myColor = null;

function updateStatus(message, borderColor = "#bdc3c7") {
    if (statusEl.innerText.includes("Leaderboard")) return;
    statusEl.innerText = message;
    statusEl.parentElement.style.borderLeftColor = borderColor;
}

function setPlayerColor(color) { 
    myColor = color; 
    
    // 1. Rotate board to put player's base at Bottom-Left
    // Red is already BL (0deg). Blue is BR (90deg). Yellow is TR (180deg). Green is TL (270deg).
    const rotations = { "Red": 0, "Blue": 90, "Yellow": 180, "Green": 270 };
    boardEl.style.transform = `rotate(${rotations[color]}deg)`;
    
    // 2. Apply artistic background theme
    document.body.className = `theme-${color.toLowerCase()}`;
}

function enableControls() { diceBtn.classList.remove('disabled'); }
function disableControls() { diceBtn.classList.add('disabled'); }
function displayError(message) { alert(`Rule Check: ${message}`); }

// --- NEW: Turn Indicator Logic ---
function updateTurn(currentTurnColor) {
    const turnEl = document.getElementById('turn-indicator');
    
    if (currentTurnColor === myColor) {
        turnEl.innerText = "YOUR TURN!";
        enableControls(); 
    } else {
        turnEl.innerText = `${currentTurnColor}'s Turn`;
        disableControls(); 
    }
    
    turnEl.style.color = `var(--color-${currentTurnColor.toLowerCase()})`;
    
    // NEW: Apply the active turn class to the board to boost token Z-indexes
    boardEl.className = `turn-${currentTurnColor.toLowerCase()}`;
}

// --- UPDATED: Win State Logic ---
function handleWinStates(winners) {
    if (!winners || winners.length === 0) return;

    // Check if I am in the winners list
    const myRank = winners.indexOf(myColor);
    
    if (myRank !== -1) {
        // If I just finished, tell me!
        const suffixes = ["st", "nd", "rd", "th"];
        const rankString = `${myRank + 1}${suffixes[myRank]}`;
        updateStatus(`🎉 You finished in ${rankString} place!`, "#f1c40f");
        
        // Change the Turn Indicator to show I'm done
        const turnEl = document.getElementById('turn-indicator');
        turnEl.innerText = `FINISHED (${rankString})`;
        turnEl.style.color = "#f1c40f";
        disableControls();
    }

    // If the game is officially over (3 or 4 players finished)
    if (winners.length >= 3) {
        showVictoryScreen(winners);
    }
}

function showVictoryScreen(winners) {
    const overlay = document.getElementById('victory-overlay');
    const list = document.getElementById('final-leaderboard');
    list.innerHTML = '';
    
    const suffixes = ["st", "nd", "rd", "th"];
    winners.forEach((color, index) => {
        const li = document.createElement('li');
        li.innerText = `${index + 1}${suffixes[index]} Place: ${color}`;
        
        // Paint the background of the list item to match the player
        li.style.backgroundColor = `var(--color-${color.toLowerCase()})`;
        if (color === "Yellow") li.style.color = "black"; // Keep text readable
        
        list.appendChild(li);
    });
    
    overlay.classList.remove('hidden');
}

function drawDiceDots(value) {
    const diceInner = document.getElementById('dice-layout');
    diceInner.innerHTML = ''; 
    const layouts = { 1: ['p5'], 2: ['p1', 'p9'], 3: ['p1', 'p5', 'p9'], 4: ['p1', 'p3', 'p7', 'p9'], 5: ['p1', 'p3', 'p5', 'p7', 'p9'], 6: ['p1', 'p3', 'p4', 'p6', 'p7', 'p9'] };
    if(layouts[value]) {
        layouts[value].forEach(pos => {
            const dot = document.createElement('div');
            dot.className = `dot ${pos}`;
            diceInner.appendChild(dot);
        });
    }
}

function displayDiceRoll(player, value) {
    diceBtn.classList.add('rolling');
    setTimeout(() => { drawDiceDots(value); }, 200);
    setTimeout(() => { diceBtn.classList.remove('rolling'); }, 400);

    // Dice text above the dice
    diceResultEl.innerText = `Roll: ${value}`;
    
    // Lock the dice immediately if it's your turn so you can't double-roll before moving a token
    if (player === myColor) {
        disableControls();
    }
}

diceBtn.addEventListener('click', () => {
    if (!diceBtn.classList.contains('disabled') && typeof sendDiceRollRequest === 'function') {
        sendDiceRollRequest();
    }
});

// --- BOARD MAPPING ---
const baseCoords = { "Green": [[3, 3], [3, 4], [4, 3], [4, 4]], "Yellow": [[3, 12], [3, 13], [4, 12], [4, 13]], "Red": [[12, 3], [12, 4], [13, 3], [13, 4]], "Blue": [[12, 12], [12, 13], [13, 12], [13, 13]] };
const ring = [ [14,7], [13,7], [12,7], [11,7], [10,7], [9,6], [9,5], [9,4], [9,3], [9,2], [9,1], [8,1], [7,1], [7,2], [7,3], [7,4], [7,5], [7,6], [6,7], [5,7], [4,7], [3,7], [2,7], [1,7], [1,8], [1,9], [2,9], [3,9], [4,9], [5,9], [6,9], [7,10], [7,11], [7,12], [7,13], [7,14], [7,15], [8,15], [9,15], [9,14], [9,13], [9,12], [9,11], [9,10], [10,9], [11,9], [12,9], [13,9], [14,9], [15,9], [15,8], [15,7] ];
const homeStretches = { "Red": [[14,8], [13,8], [12,8], [11,8], [10,8], [9,8]], "Green": [[8,2], [8,3], [8,4], [8,5], [8,6], [8,7]], "Yellow": [[2,8], [3,8], [4,8], [5,8], [6,8], [7,8]], "Blue": [[8,14], [8,13], [8,12], [8,11], [8,10], [8,9]] };

// The 8 safe star locations
// --- CORRECTED: The 8 standard Ludo safe star locations ---
const safeSquareCoords = [
    [14, 7], [9, 3],  // Red Start & Left Arm Star
    [7, 2],  [3, 7],  // Green Start & Top Arm Star
    [2, 9],  [7, 13], // Yellow Start & Right Arm Star
    [9, 14], [13, 9]  // Blue Start & Bottom Arm Star
];

function drawBoardGrid() {
    // 1. Draw the white path squares
    ring.forEach(([row, col]) => {
        const square = document.createElement('div');
        square.classList.add('grid-square', 'square-white');
        
        // --- NEW: Add the text-based star class ---
        if (safeSquareCoords.some(c => c[0] === row && c[1] === col)) {
            square.classList.add('safe-square');
        }

        square.style.gridRow = row;
        square.style.gridColumn = col;
        boardEl.insertBefore(square, boardEl.firstChild); 
    });

    // 2. Draw the colored home stretch squares
    for (const [color, coords] of Object.entries(homeStretches)) {
        coords.forEach(([row, col]) => {
            const square = document.createElement('div');
            square.classList.add('grid-square', `square-${color.toLowerCase()}`);
            square.style.gridRow = row;
            square.style.gridColumn = col;
            boardEl.insertBefore(square, boardEl.firstChild);
        });
    }
}

const playerPaths = { "Red": [], "Green": [], "Yellow": [], "Blue": [] };
const startOffsets = { "Red": 0, "Green": 13, "Yellow": 26, "Blue": 39 };
for (const color of ["Red", "Green", "Yellow", "Blue"]) {
    const offset = startOffsets[color];
    for (let i = 0; i < 51; i++) playerPaths[color].push(ring[(offset + i) % 52]);
    playerPaths[color] = playerPaths[color].concat(homeStretches[color]);
}

function renderBoard(positions) {
    document.querySelectorAll('.token').forEach(t => t.remove());
    
    // Dictionary to track how many tokens are currently sitting in each grid cell
    const cellOccupancy = {};

    for (const [color, tokensArray] of Object.entries(positions)) {
        tokensArray.forEach((positionValue, index) => {
            const tokenEl = document.createElement('div');
            tokenEl.classList.add('token', `token-${color.toLowerCase()}`);
            
            tokenEl.onclick = () => { 
                if (color === myColor && typeof sendMoveRequest === 'function') {
                    sendMoveRequest(index); 
                }
            };

            let gridRow, gridCol;
            
            // Scenario A: Locked in base
            if (positionValue === -1) {
                [gridRow, gridCol] = baseCoords[color][index];
            } 
            // Scenario B: On the board
            else { 
                const coord = playerPaths[color][positionValue]; 
                if (coord) {
                    [gridRow, gridCol] = coord; 
                } else return; 
            }
            
            tokenEl.style.gridRow = gridRow; 
            tokenEl.style.gridColumn = gridCol; 
            
            // --- NEW: Token Fanning Logic ---
            // Only fan tokens out if they are on the shared path (not in the bases)
            if (positionValue !== -1) {
                const cellKey = `${gridRow}-${gridCol}`;
                
                // If this is the first token here, initialize the counter
                if (!cellOccupancy[cellKey]) {
                    cellOccupancy[cellKey] = 0;
                }
                
                const count = cellOccupancy[cellKey];
                
                // Push tokens into the 4 corners of the square using margins
                // This preserves your CSS transform hover animations!
                if (count === 1) { tokenEl.style.marginTop = "-12px"; tokenEl.style.marginLeft = "-12px"; }
                else if (count === 2) { tokenEl.style.marginTop = "12px"; tokenEl.style.marginLeft = "12px"; }
                else if (count === 3) { tokenEl.style.marginTop = "-12px"; tokenEl.style.marginLeft = "12px"; }
                else if (count >= 4) { tokenEl.style.marginTop = "12px"; tokenEl.style.marginLeft = "-12px"; }
                
                // Increment the counter for the next token that lands here
                cellOccupancy[cellKey]++;
            }

            boardEl.appendChild(tokenEl);
        });
    }
}

drawDiceDots(6);
drawBoardGrid();