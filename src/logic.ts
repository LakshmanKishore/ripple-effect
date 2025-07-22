import type { PlayerId, RuneClient } from "rune-sdk"
import { nanobotSVG } from "./assets/nanobot.ts"

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
    }
  }
  winner: PlayerId | null
  turnCount: number
  isAiTurn: boolean
}

type GameActions = {
  place: (args: { cellIndex: number, fromBot?: boolean }) => void
}

declare global {
  const Rune: RuneClient<GameState, GameActions>
}

const PLAYER_COLORS = ["#F44336", "#4CAF50", "#2196F3", "#FFEB3B", "#9C27B0", "#FF9800"]

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
    }

    playerIds.forEach((id, index) => {
      initialState.players[id] = {
        id,
        color: PLAYER_COLORS[index % PLAYER_COLORS.length],
        isEliminated: false,
      }
    })

    // AI player info is handled on the client-side

    return initialState
  },
  
  actions: {
    place: ({ cellIndex, fromBot }, { game, playerId }) => {
      console.log("logic.ts: place called. cellIndex:", cellIndex, "playerId:", playerId, "fromBot:", fromBot, "game.turn:", game.turn, "game.isAiTurn:", game.isAiTurn)
      if (game.winner) throw Rune.invalidAction()

      const isFromBot = !!fromBot; // Ensure fromBot is a boolean

      let actualPlayer: PlayerId

      if (isFromBot) {
        actualPlayer = "ai"
        if (!game.isAiTurn) {
          console.error("logic.ts: AI move received but game.isAiTurn is false.")
          throw Rune.invalidAction("AI move received (fromBot: true) but it's not AI's turn.");
        }
        console.log("logic.ts: AI move.")
      } else {
        // This is a human player's move (fromBot: undefined or false)
        if (playerId === undefined) {
          throw Rune.invalidAction("Player ID is undefined for a human move (fromBot: undefined).");
        }
        actualPlayer = playerId

        if (game.isAiTurn) {
          throw Rune.invalidAction("Human move received (fromBot: undefined) but it's AI's turn.");
        }

        if (actualPlayer !== game.turn) {
          console.error("logic.ts: Invalid human player move. Expected turn:", game.turn, "Actual playerId:", actualPlayer)
          throw Rune.invalidAction("It's not your turn (fromBot: undefined).");
        }
      }
      processMove(cellIndex, actualPlayer, game)
    },
  },
})

const processMove = (cellIndex: number, actualPlayer: PlayerId, game: GameState) => {
  const cell = game.cells[cellIndex]
  if (cell.owner !== null && cell.owner !== actualPlayer) {
    console.error("logic.ts: Invalid cell owner. Cell owner:", cell.owner, "Actual player:", actualPlayer)
    throw Rune.invalidAction()
  }

  // 1. Increment cell and set owner
  cell.count++
  cell.owner = actualPlayer
  console.log("logic.ts: Cell updated. cellIndex:", cellIndex, "owner:", cell.owner, "count:", cell.count)

  // 2. Explosion processing
  const explosionQueue: number[] = []
  if (cell.count > cell.capacity) {
    explosionQueue.push(cellIndex)
    console.log("logic.ts: Cell exploded. cellIndex:", cellIndex)
  }

  let iterations = 0;
  while (explosionQueue.length > 0) {
    iterations++;
    if (iterations > MAX_EXPLOSION_ITERATIONS) {
      console.error("logic.ts: Max explosion iterations exceeded. Aborting to prevent hang.");
      throw Rune.invalidAction("Max explosion iterations exceeded. Game state might be unstable.");
    }

    const currentCellIndex = explosionQueue.shift()!
    const currentCell = game.cells[currentCellIndex]

    if (currentCell.count <= currentCell.capacity) continue

    // Reset exploding cell and distribute bots
    currentCell.count = 0
    currentCell.owner = null
    console.log("logic.ts: Exploding cell reset. cellIndex:", currentCellIndex)

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
      console.log("logic.ts: Neighbor updated. neighborIndex:", neighborIndex, "owner:", neighborCell.owner, "count:", neighborCell.count)
      if (neighborCell.count > neighborCell.capacity) {
        if (!explosionQueue.includes(neighborIndex)) {
          explosionQueue.push(neighborIndex)
          console.log("logic.ts: Neighbor added to explosion queue. neighborIndex:", neighborIndex)
        }
      }
    }
  }

  // 3. Player Elimination (only after first round)
  if (game.turnCount >= game.playerIds.length) {
    for (const pId of game.playerIds) {
        if (game.players[pId].isEliminated) continue

        const hasBots = game.cells.some(c => c.owner === pId)
        if (!hasBots) {
            game.players[pId].isEliminated = true
            console.log("logic.ts: Player eliminated:", pId)
        }
    }
  }

  // 4. Win Condition
  const remainingPlayers = game.playerIds.filter(id => !game.players[id].isEliminated)
  if (remainingPlayers.length <= 1) {
    game.winner = remainingPlayers.length === 1 ? remainingPlayers[0] : null
    console.log("logic.ts: Game over. Winner:", game.winner)
    Rune.gameOver({
        players: game.playerIds.reduce((acc, id) => ({
            ...acc,
            [id]: game.winner && id === game.winner ? "WON" : "LOST"
        }), {}),
        delayPopUp: false
    })
  } else {
    // 5. Advance turn
    let nextPlayerIndex = game.playerIds.indexOf(game.turn)
    do {
        nextPlayerIndex = (nextPlayerIndex + 1) % game.playerIds.length
    } while (game.players[game.playerIds[nextPlayerIndex]].isEliminated)
    game.turn = game.playerIds[nextPlayerIndex]
    game.turnCount++
    game.isAiTurn = (game.turn === "ai") // Set isAiTurn if next is AI
    console.log("logic.ts: Turn advanced. Next turn:", game.turn, "game.isAiTurn:", game.isAiTurn)
  }
}


