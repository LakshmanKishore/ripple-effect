Title: Build “Ripple Effect” – a Chain Reaction–inspired Nanobot Strategy Game

Objective:
Create a fully playable, turn-based multiplayer game called “Ripple Effect” on the Rune platform. In this game, 2–6 players compete on a rectangular grid by placing nanobots into cells. When a cell’s nanobot count exceeds its capacity, it “bursts” and sends bots into each neighboring cell, potentially triggering cascading chain reactions and converting opponent territory.

End Product:
A live, real-time synchronized game where players can join via Rune matchmaking, take turns placing nanobots, watch explosions animate, eliminate opponents, and ultimately crown the last surviving player as the winner.

---

1. **Game Initialization**
   - On game start, display a blank grid (default 9 rows × 6 columns, but size may be configurable).
   - Show player slots for 2–6 participants; assign each a unique color to tint nanobot icons.
   - Set the “current player” pointer to the first in the match queue.

2. **Cell & Nanobot Model**
   - Every grid cell maintains:
     - **owner** (which player currently controls it, or “empty”),
     - **count** (number of nanobot icons in it; initially 0),
     - **capacity** (determined by cell position: corner=1, edge=2, inner=3).
   - Visually, each nanobot is rendered by repeating the same SVG icon, color-filled to match its owner.

3. **Turn Sequence**
   - Highlight whose turn it is (color and name).
   - That player may click any cell that is either empty or already owned by them.
   - On click:
     1. **Increment** that cell’s nanobot count by 1.
     2. **Immediately** check if the new count exceeds the cell’s capacity.
         - If not, end the turn and pass to the next active player.
         - If yes, begin the **explosion process**.

4. **Explosion & Chain Reaction**
   - Create a queue of cells to process; initially enqueue the just-clicked cell.
   - While the queue is not empty:
     1. Dequeue a cell.
     2. If its count > capacity:
        - **Reset** its count to 0 and mark owner = null (temporarily empty).
        - For each of its four orthogonal neighbors:
          - **Increment** neighbor’s count by 1.
          - **Set** neighbor’s owner to the exploding player.
          - If neighbor’s new count now exceeds its capacity, enqueue it.
   - Continue until no cells in the queue remain.

5. **Territory Conversion**
   - Any time a nanobot is added to a cell—either by click or by explosion—the cell’s ownership immediately switches to the acting player.
   - This ensures that chain reactions can sweep through and convert large regions in a single turn.

6. **Player Elimination**
   - After all explosions fully resolve, scan the board to count total nanobots per player.
   - If any player has **zero** nanobots remaining, they are eliminated:
     - Remove them from the turn rotation.
     - Visually grey-out or hide their UI elements.

7. **Win Detection**
   - If only one player remains with nanobots on the board (all others eliminated), declare them **winner**.
   - Display a victory message and offer “Rematch” or “Return to Lobby.”

8. **User Interface Expectations**
   - The grid updates in real time for all connected players.
   - Nanobot icons should animate a brief “pop” when placed, and a pulsing “burst” effect when exploding.
   - Show a simple turn-order banner and eliminate players’ names as they fall.
   - Provide a “Reset Game” button to restart with the same lobby.

9. **Multiplayer Synchronization (Rune)**
   - All state transitions (place click, explosion steps, eliminations, win) are sent as synchronized events through Rune’s state engine.
   - Ensure consistency: every client processes the same explosion queue in the same order.
   - Disable further inputs until the current player’s entire turn—including all chain reactions—is complete.

10. **Deliverable Criteria**
    - On completion, the agent should replace the Tic-Tac-Toe template with:
      - A working 9×6 or configurable grid.
      - Turn-based click placement respecting ownership rules.
      - Full recursive explosion logic with chain reactions.
      - Real-time sync so two or more players see identical board updates.
      - Clear elimination and win handling.
      - Nanobot SVG icons tinted per player and repeated according to count.

End prompt. The resulting build should launch as a “Ripple Effect” multiplayer game on Rune that’s immediately playable, with no leftover Tic-Tac-Toe artifacts.


