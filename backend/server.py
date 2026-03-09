# backend/server.py
import asyncio
import websockets
import json
from game_state import GameState
import os

# Dictionary to store connected clients and their assigned colors
clients = {}

# --- UPDATED: Color Assignment Order ---
# Tab 1: Red | Tab 2: Blue | Tab 3: Yellow | Tab 4: Green
AVAILABLE_COLORS = ["Red", "Blue", "Yellow", "Green"]

# Create a single instance of the game state to act as the "Brain"
game = GameState()

async def broadcast(message):
    """Sends a JSON payload to all connected players concurrently."""
    if clients:
        payload = json.dumps(message)
        await asyncio.gather(*[client.send(payload) for client in clients.keys()])

async def handle_client(websocket):
    """Handles the lifecycle of a single player's connection."""
    global AVAILABLE_COLORS
    
    # 1. Reject if lobby is full
    if len(clients) >= 4:
        await websocket.send(json.dumps({"type": "error", "message": "Game is full!"}))
        return

    # 2. Assign color to the new connection
    assigned_color = AVAILABLE_COLORS.pop(0)
    clients[websocket] = assigned_color
    print(f"[NETWORK] Player joined. Assigned: {assigned_color}")

    try:
        # 3. Send welcome message
        await websocket.send(json.dumps({
            "type": "welcome",
            "color": assigned_color,
            "message": f"You are {assigned_color}. Waiting for players..."
        }))

        # 4. Trigger game start when 4 players join
        if len(clients) == 4:
            print("[NETWORK] Lobby full. Starting the game!")
            game.start_game() 
            
            await broadcast({
                "type": "game_start",
                "message": "All players connected! The game begins.",
                "state": game.get_full_state()
            })

        # 5. The Event Loop: Process incoming messages from this client
        async for message in websocket:
            data = json.loads(message)
            print(f"[NETWORK] Received from {assigned_color}: {data}")
            
            # --- ACTION ROUTER ---
            if data.get("action") == "roll_dice":
                result = game.roll_dice(assigned_color)
                
                if "error" in result:
                    await websocket.send(json.dumps({
                        "type": "error", 
                        "message": result["error"]
                    }))
                else:
                    await broadcast(result)
                    await broadcast(game.get_full_state())
                    
            elif data.get("action") == "move_token":
                token_index = data.get("token_index")
                result = game.move_token(assigned_color, token_index)
                
                if "error" in result:
                    await websocket.send(json.dumps({"type": "error", "message": result["error"]}))
                else:
                    await broadcast(game.get_full_state())

    except websockets.exceptions.ConnectionClosed:
        print(f"[NETWORK] Player {assigned_color} disconnected.")
        
    finally:
        # Cleanup on disconnect
        if websocket in clients:
            del clients[websocket]
            AVAILABLE_COLORS.append(assigned_color)
            
            # Keeps the list in the correct order if a player drops mid-lobby
            AVAILABLE_COLORS.sort(key=lambda x: ["Red", "Blue", "Yellow", "Green"].index(x))

        # --- THE FIX: AUTO-RESET THE GAME ---
        if len(clients) == 0:
            print("[SERVER] All players left. Resetting the game board!")
            global game
            game = GameState() # Creates a fresh, empty game board for the next group
async def main():
    # Cloud providers assign a dynamic port. If local, default to 8765.
    port = int(os.environ.get("PORT", 8765))
    
    print(f"[SERVER] Starting Authoritative Ludo Server on port {port}")
    
    # "0.0.0.0" allows the server to accept connections from the outside internet
    async with websockets.serve(handle_client, "0.0.0.0", port):
        await asyncio.Future()
if __name__ == "__main__":
    asyncio.run(main())