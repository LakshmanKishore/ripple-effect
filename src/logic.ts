import type { PlayerId, RuneClient } from "rune-sdk"

// Constants
const GRID_WIDTH = 6
const GRID_HEIGHT = 9
const TOTAL_CELLS = GRID_WIDTH * GRID_HEIGHT
const MAX_EXPLOSION_ITERATIONS = TOTAL_CELLS * 3 // Safety limit to prevent infinite loops/hangs

// Helper to get cell capacity
const getCapacity = (index: number) => {
  const isTopOrBottom = index < GRID_WIDTH || index >= TOTAL_CELLS - GRID_WIDTH
  const isLeftOrRight = index % GRID_WIDTH === 0 || (index + 1) % GRID_WIDTH === 0

  if (isTopOrBottom && isLeftOrRight) return 1 // Corner
  if (isTopOrBottom || isLeftOrRight) return 2 // Edge
  return 3 // Inner
}

export interface Cell {
  owner: PlayerId | null
  count: number
  capacity: number
}

export interface GameState {
  cells: Cell[]
  playerIds: PlayerId[]
  turn: PlayerId
  players: {
    [key: string]: {
      id: PlayerId
      color: string
      isEliminated: boolean
      hasPlacedFirstBot: boolean
    }
  }
  winner: PlayerId | null
  turnCount: number
  isAiTurn: boolean
  explosionQueue: number[]
  iterationCount: number
}

type GameActions = {
  place: (args: { cellIndex: number, fromBot?: boolean }) => void
  processExplosion: () => void
}

declare global {
  const Rune: RuneClient<GameState, GameActions>
}

const PLAYER_COLORS = ["#F44336", "#4CAF50", "#2196F3", "#FFEB3B", "#9C27B0", "#FF9800", "#00BCD4"]

Rune.initLogic({
  minPlayers: 1,
  maxPlayers: 6,
  setup: (allPlayerIds) => {
    const playerIds = [...allPlayerIds]
    if (playerIds.length === 1) {
      playerIds.push("ai")
    }

    const initialState: GameState = {
      cells: Array.from({ length: TOTAL_CELLS }, (_, i) => ({
        owner: null,
        count: 0,
        capacity: getCapacity(i),
      })),
      playerIds: playerIds,
      turn: playerIds[0],
      players: {},
      winner: null,
      turnCount: 0,
      isAiTurn: false,
      explosionQueue: [],
      iterationCount: 0,
    }

    playerIds.forEach((id, index) => {
      initialState.players[id] = {
        id,
        color: PLAYER_COLORS[index % PLAYER_COLORS.length],
        isEliminated: false,
        hasPlacedFirstBot: false,
      }
    })

    return initialState
  },
  
  actions: {
    place: ({ cellIndex, fromBot }, { game, playerId }) => {
      if (game.winner) throw Rune.invalidAction()

      const isFromBot = !!fromBot
      let actualPlayer: PlayerId

      if (isFromBot) {
        actualPlayer = "ai"
        if (!game.isAiTurn) throw Rune.invalidAction("AI move received but it's not AI's turn.")
      } else {
        if (playerId === undefined) throw Rune.invalidAction("Player ID is undefined for a human move.")
        actualPlayer = playerId
        if (game.isAiTurn) throw Rune.invalidAction("Human move received but it's AI's turn.")
        if (actualPlayer !== game.turn) throw Rune.invalidAction("It's not your turn.")
      }

      const cell = game.cells[cellIndex]
      if (cell.owner !== null && cell.owner !== actualPlayer) throw Rune.invalidAction()

      cell.count++
      cell.owner = actualPlayer
      game.players[actualPlayer].hasPlacedFirstBot = true

      if (cell.count > cell.capacity) {
        game.explosionQueue.push(cellIndex)
      }

      game.iterationCount = 0

      if (game.explosionQueue.length === 0) {
        if (!checkGameEndConditions(game)) {
          endTurn(game)
        }
      }
    },

    processExplosion: (_, { game }) => {
      if (game.explosionQueue.length === 0) return

      game.iterationCount++
      if (game.iterationCount > MAX_EXPLOSION_ITERATIONS) {
        checkGameEndConditions(game) // Force check game end conditions
        return
      }

      const currentCellIndex = game.explosionQueue.shift()!
      const currentCell = game.cells[currentCellIndex]
      const actualPlayer = currentCell.owner!

      if (currentCell.count <= currentCell.capacity) return

      currentCell.count = 0
      currentCell.owner = null

      const neighbors = [
        currentCellIndex - GRID_WIDTH, // Top
        currentCellIndex + GRID_WIDTH, // Bottom
        (currentCellIndex + 1) % GRID_WIDTH !== 0 ? currentCellIndex + 1 : -1, // Right
        currentCellIndex % GRID_WIDTH !== 0 ? currentCellIndex - 1 : -1, // Left
      ].filter(i => i >= 0 && i < TOTAL_CELLS)

      for (const neighborIndex of neighbors) {
        const neighborCell = game.cells[neighborIndex]
        neighborCell.count++
        neighborCell.owner = actualPlayer
        if (neighborCell.count > neighborCell.capacity && !game.explosionQueue.includes(neighborIndex)) {
          game.explosionQueue.push(neighborIndex)
        }
      }

      // Check for game end conditions after each explosion step
      if (checkGameEndConditions(game)) {
        return // Game ended, stop processing explosions
      }

      if (game.explosionQueue.length === 0) {
        endTurn(game)
      }
    },
  },

  events: {
    playerJoined: (playerId, { game }) => {
      // If a bot is currently playing, replace it with the new player
      const botIndex = game.playerIds.indexOf("ai")
      if (botIndex !== -1) {
        game.playerIds[botIndex] = playerId
        game.players[playerId] = { id: playerId, color: PLAYER_COLORS[botIndex % PLAYER_COLORS.length], isEliminated: false, hasPlacedFirstBot: false }
        // Transfer bot's nanobots to the new player
        game.cells.forEach(cell => {
          if (cell.owner === "ai") {
            cell.owner = playerId
          }
        })
        // If it was AI's turn, transfer turn to new player
        if (game.turn === "ai") {
          game.turn = playerId
          game.isAiTurn = false
        }
      } else {
        // Add new player to the game
        game.playerIds.push(playerId)
        game.players[playerId] = { id: playerId, color: PLAYER_COLORS[(game.playerIds.length - 1) % PLAYER_COLORS.length], isEliminated: false, hasPlacedFirstBot: false }
      }

      // Adjust turnCount to prevent immediate elimination of new player
      if (game.turnCount >= game.playerIds.length) {
        game.turnCount = game.playerIds.length - 1;
      }
    },

    playerLeft: (playerId, { game }) => {
      const playerIndex = game.playerIds.indexOf(playerId)
      if (playerIndex === -1) return // Player not found

      // If only one human player remains, replace the leaving player with a bot
      const humanPlayers = game.playerIds.filter(id => id !== "ai")
      if (humanPlayers.length === 2 && humanPlayers.includes(playerId)) {
        game.playerIds[playerIndex] = "ai"

        // Find an unused color for the AI
        let aiColor = "#000000"; // Default to black if no color found
        const usedColors = new Set(
          Object.values(game.players)
            .filter(player => !player.isEliminated) // Only consider active players
            .map(player => player.color)
        );
        for (const color of PLAYER_COLORS) {
          if (!usedColors.has(color)) {
            aiColor = color;
            break;
          }
        }

        game.players["ai"] = { id: "ai", color: aiColor, isEliminated: false }
        // Transfer leaving player's nanobots to the bot
        game.cells.forEach(cell => {
          if (cell.owner === playerId) {
            cell.owner = "ai"
          }
        })
        // If it was leaving player's turn, transfer turn to bot
        if (game.turn === playerId) {
          game.turn = "ai"
          game.isAiTurn = true
        }
      } else {
        // More than two players, or leaving player is not a human player (e.g., bot leaving)
        // Remove player from playerIds and eliminate them
        game.playerIds = game.playerIds.filter(id => id !== playerId)
        game.players[playerId].isEliminated = true
        // Remove their nanobots from the board
        game.cells.forEach(cell => {
          if (cell.owner === playerId) {
            cell.owner = null
            cell.count = 0
          }
        })
        // If it was leaving player's turn, advance turn
        if (game.turn === playerId) {
          let nextPlayerIndex = game.playerIds.indexOf(game.turn)
          do {
            nextPlayerIndex = (nextPlayerIndex + 1) % game.playerIds.length
          } while (game.players[game.playerIds[nextPlayerIndex]].isEliminated)
          game.turn = game.playerIds[nextPlayerIndex]
          game.isAiTurn = (game.turn === "ai")
        }
      }
      // Check for game end conditions after player leaves
      checkGameEndConditions(game)
    },
  },
})

const checkGameEndConditions = (game: GameState) => {
  // 3. Player Elimination (only after first round)
  if (game.turnCount >= game.playerIds.length) {
    for (const pId of game.playerIds) {
      if (game.players[pId].isEliminated) continue

      const hasBots = game.cells.some(c => c.owner === pId)
      if (!hasBots && game.players[pId].hasPlacedFirstBot) {
        game.players[pId].isEliminated = true
      }
    }
  }

  // 4. Win Condition
  const remainingPlayers = game.playerIds.filter(id => !game.players[id].isEliminated)
  if (remainingPlayers.length <= 1) {
    game.winner = remainingPlayers.length === 1 ? remainingPlayers[0] : null

    const finalPlayerStatuses: Record<PlayerId, "WON" | "LOST"> = {};

    const humanPlayers = game.playerIds.filter(id => id !== "ai");

    humanPlayers.forEach(id => {
      if (game.winner && id === game.winner) {
        finalPlayerStatuses[id] = "WON";
      } else {
        finalPlayerStatuses[id] = "LOST";
      }
    });

    Rune.gameOver({
      players: finalPlayerStatuses,
      delayPopUp: false
    })
    return true // Game ended
  }
  return false // Game not ended
}

const endTurn = (game: GameState) => {
  // First, check if the game has already ended.
  if (checkGameEndConditions(game)) {
    return; // Game ended, no need to advance turn.
  }

  let nextPlayerIndex = game.playerIds.indexOf(game.turn);

  // Loop through players to find the next active player
  for (let i = 0; i < game.playerIds.length; i++) {
    nextPlayerIndex = (nextPlayerIndex + 1) % game.playerIds.length;
    const nextPlayerId = game.playerIds[nextPlayerIndex];

    if (!game.players[nextPlayerId].isEliminated) {
      game.turn = nextPlayerId;
      game.turnCount++;
      game.isAiTurn = (game.turn === "ai");
      return; // Found next active player, turn advanced.
    }
  }

  // If we reach here, it means all remaining players are eliminated.
  // This scenario should ideally be caught by checkGameEndConditions.
  // If the game is truly stuck, this might indicate a deeper issue.
  console.error("No active players found to advance turn. Game might be stuck.");
};


