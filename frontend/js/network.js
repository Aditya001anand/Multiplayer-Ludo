// frontend/js/network.js

const socket = new WebSocket('ws://localhost:8765');

socket.onopen = () => {
    updateStatus("Connected! Awaiting color assignment...", "#f1c40f"); 
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("[NETWORK] Payload received:", data);

    switch (data.type) {
        case "welcome":
            setPlayerColor(data.color);
            updateStatus(`You are ${data.color}. Waiting for others...`);
            break;
            
        case "dice_rolled":
            displayDiceRoll(data.player, data.value);
            // If they rolled but have no moves, the server sends a message here
            if (data.message) {
                 updateStatus(data.message, "#e74c3c"); 
            }
            break;

        case "game_start":
            updateStatus(`Game Started!`, "#2ecc71");
            if (data.state && data.state.positions) {
                renderBoard(data.state.positions); 
                updateTurn(data.state.current_turn); // Sync turn indicator
            }
            break;

        case "board_update":
            renderBoard(data.positions);
            updateTurn(data.current_turn);       // Sync turn indicator
            handleWinStates(data.winners);
            break;    
            
        case "error":
            displayError(data.message);
            break;
    }
};

socket.onclose = () => {
    updateStatus("Disconnected from server.", "#e74c3c");
    document.getElementById('turn-indicator').innerText = "DISCONNECTED";
};

function sendDiceRollRequest() {
    const payload = { action: "roll_dice" };
    socket.send(JSON.stringify(payload));
}

function sendMoveRequest(tokenIndex) {
    const payload = { action: "move_token", token_index: tokenIndex };
    socket.send(JSON.stringify(payload));
}