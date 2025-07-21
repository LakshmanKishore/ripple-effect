import type { PlayerId, RuneClient } from "rune-sdk"

// Constants
const GRID_WIDTH = 6
const GRID_HEIGHT = 9
const TOTAL_CELLS = GRID_WIDTH * GRID_HEIGHT

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
}

type GameActions = {
  placeBot: (cellIndex: number) => void
}

declare global {
  const Rune: RuneClient<GameState, GameActions>
}

const PLAYER_COLORS = ["#F44336", "#4CAF50", "#2196F3", "#FFEB3B", "#9C27B0", "#FF9800"]

Rune.initLogic({
  minPlayers: 2,
  maxPlayers: 6,
  setup: (allPlayerIds) => {
    const initialState: GameState = {
      cells: Array.from({ length: TOTAL_CELLS }, (_, i) => ({
        owner: null,
        count: 0,
        capacity: getCapacity(i),
      })),
      playerIds: allPlayerIds,
      turn: allPlayerIds[0],
      players: {},
      winner: null,
      turnCount: 0,
    }

    allPlayerIds.forEach((id, index) => {
      initialState.players[id] = {
        id,
        color: PLAYER_COLORS[index % PLAYER_COLORS.length],
        isEliminated: false,
      }
    })

    return initialState
  },
  actions: {
    placeBot: (cellIndex, { game, playerId }) => {
      if (game.winner) throw Rune.invalidAction()
      if (playerId !== game.turn) throw Rune.invalidAction()
      
      const cell = game.cells[cellIndex]
      if (cell.owner !== null && cell.owner !== playerId) {
        throw Rune.invalidAction()
      }

      // 1. Increment cell and set owner
      cell.count++
      cell.owner = playerId

      // 2. Explosion processing
      const explosionQueue: number[] = []
      if (cell.count > cell.capacity) {
        explosionQueue.push(cellIndex)
      }

      while (explosionQueue.length > 0) {
        const currentCellIndex = explosionQueue.shift()!
        const currentCell = game.cells[currentCellIndex]

        if (currentCell.count <= currentCell.capacity) continue

        // Reset exploding cell and distribute bots
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
          neighborCell.owner = playerId
          if (neighborCell.count > neighborCell.capacity) {
            if (!explosionQueue.includes(neighborIndex)) {
              explosionQueue.push(neighborIndex)
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
            }
        }
      }

      // 4. Win Condition
      const remainingPlayers = game.playerIds.filter(id => !game.players[id].isEliminated)
      if (remainingPlayers.length <= 1) {
        game.winner = remainingPlayers.length === 1 ? remainingPlayers[0] : null
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
      }
    },
  },
})
