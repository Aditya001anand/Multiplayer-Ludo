# backend/game_state.py
import random

class GameState:
    def __init__(self):
        self.turn_order = ["Red", "Blue", "Yellow", "Green"]
        self.current_turn_index = 0
        
        self.positions = {
            "Red": [-1, -1, -1, -1], "Green": [-1, -1, -1, -1],
            "Yellow": [-1, -1, -1, -1], "Blue": [-1, -1, -1, -1]
        }
        
        self.last_roll = 0
        self.has_rolled = False
        self.game_started = False
        self.game_over = False
        self.winners = []
        
        self.consecutive_sixes = 0
        self.bonus_roll_awarded = False
        self.safe_squares = [0, 8, 13, 21, 26, 34, 39, 47]
        self.offsets = {"Red": 0, "Green": 13, "Yellow": 26, "Blue": 39}

        self.stuck_counters = {"Red": 0, "Green": 0, "Yellow": 0, "Blue": 0}
        self.game_has_started_moving = False
        self.total_turns_taken = 0

    def get_fair_roll(self, color):
        is_stuck = all(p == -1 for p in self.positions[color])
        if not self.game_has_started_moving and self.total_turns_taken >= 12:
            self.game_has_started_moving = True
            self.stuck_counters[color] = 0
            return 6
        if is_stuck:
            self.stuck_counters[color] += 1
            chance_of_six = 0.166 + (self.stuck_counters[color] * 0.08)
            if random.random() <= chance_of_six:
                self.stuck_counters[color] = 0 
                self.game_has_started_moving = True
                return 6
            else:
                return random.randint(1, 5)
        return random.randint(1, 6)

    def start_game(self):
        self.game_started = True
        self.current_turn_index = 0

    def get_current_turn(self):
        return self.turn_order[self.current_turn_index]

    def next_turn(self):
        self.has_rolled = False
        self.last_roll = 0
        self.consecutive_sixes = 0
        self.bonus_roll_awarded = False
        
        if self.game_over: return "Game Over"

        while True:
            self.current_turn_index = (self.current_turn_index + 1) % 4
            if self.get_current_turn() not in self.winners:
                break
        return self.get_current_turn()

    def rel_to_abs(self, color, rel_pos):
        if rel_pos < 0 or rel_pos > 50: return -1 
        return (self.offsets[color] + rel_pos) % 52

    def roll_dice(self, requesting_color):
        if not self.game_started or self.game_over:
            return {"error": "Game is not active."}
        if requesting_color != self.get_current_turn():
            return {"error": f"Not your turn! Waiting for {self.get_current_turn()}."}
        if self.has_rolled:
            return {"error": "You already rolled! Select a token to move."}
            
        self.total_turns_taken += 1
        actual_roll = self.get_fair_roll(requesting_color)
        self.last_roll = actual_roll
        self.has_rolled = True
        
        if actual_roll == 6:
            self.consecutive_sixes += 1
            if self.consecutive_sixes == 3:
                next_p = self.next_turn()
                return {"type": "dice_rolled", "player": requesting_color, "value": 6, "message": f"Three 6s! Turn forfeited. {next_p}'s turn."}
        else:
            self.consecutive_sixes = 0

        can_move = False
        for pos in self.positions[requesting_color]:
            if pos != -1 and (pos + actual_roll) <= 56: 
                can_move = True
                break
            elif pos == -1 and actual_roll == 6: 
                can_move = True
                break
        
        if not can_move:
            next_player = self.next_turn()
            return {"type": "dice_rolled", "player": requesting_color, "value": actual_roll, "message": f"No valid moves. {next_player}'s turn."}
        
        return {"type": "dice_rolled", "player": requesting_color, "value": actual_roll}

    def move_token(self, player_color, token_index):
        if player_color != self.get_current_turn() or not self.has_rolled:
            return {"error": "Invalid move request."}
            
        current_pos = self.positions[player_color][token_index]
        message = ""
        
        if current_pos == -1:
            if self.last_roll == 6:
                self.positions[player_color][token_index] = 0
                message = "Token deployed! Roll again."
                self.bonus_roll_awarded = True
            else:
                return {"error": "You need a 6 to deploy a token."}
        else:
            new_pos = current_pos + self.last_roll
            if new_pos > 56:
                return {"error": "You need an exact roll to reach Home."}
                
            self.positions[player_color][token_index] = new_pos
            message = f"Moved {self.last_roll} spaces."

            abs_new_pos = self.rel_to_abs(player_color, new_pos)
            if abs_new_pos != -1 and abs_new_pos not in self.safe_squares:
                for other_color, tokens in self.positions.items():
                    if other_color != player_color:
                        for i, opp_pos in enumerate(tokens):
                            if self.rel_to_abs(other_color, opp_pos) == abs_new_pos:
                                self.positions[other_color][i] = -1
                                self.bonus_roll_awarded = True
                                message += f" Captured {other_color}'s token! Bonus roll."

            # --- THE BUG FIX: VICTORY LOGIC ---
            if new_pos == 56:
                # Check if this was their final token
                if all(p == 56 for p in self.positions[player_color]):
                    if player_color not in self.winners:
                        self.winners.append(player_color)
                    message += f" {player_color} has finished!"
                    self.bonus_roll_awarded = False # Force the turn to pass to the next player
                    
                    # If 3 players finish, the game is over. Auto-assign 4th place.
                    if len(self.winners) >= 3:
                        for c in self.turn_order:
                            if c not in self.winners:
                                self.winners.append(c)
                                break
                        self.game_over = True
                        message += " GAME OVER."
                else:
                    self.bonus_roll_awarded = True
                    message += " Token reached Home! Bonus roll."

        if self.last_roll == 6:
            self.bonus_roll_awarded = True

        if self.bonus_roll_awarded and not self.game_over:
            self.has_rolled = False 
            self.bonus_roll_awarded = False
        else:
            self.next_turn()

        return {"type": "move_success", "message": message}

    def get_full_state(self):
        return {
            "type": "board_update", "positions": self.positions,
            "current_turn": self.get_current_turn(), "last_roll": self.last_roll, "winners": self.winners
        }