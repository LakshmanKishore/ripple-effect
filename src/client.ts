import "./styles.css"
import type { GameState, Cell } from "./logic"
import { nanobotSVG } from "./assets/nanobot.ts"

const board = document.getElementById("board")!
const turnDisplay = document.getElementById("turnDisplay")!

let playerColors: { [key: string]: string } = {}

// Global game state reference
let currentGame: GameState | null = null;

// Helper to get player info, including AI
function getPlayerInfo(playerId: string) {
  if (playerId === "ai") {
    return {
      displayName: "AI Bot",
      avatarUrl: `data:image/svg+xml,${encodeURIComponent(`<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5" fill="black"/></svg>`)}`,
      playerId: "ai",
    }
  }
  return Rune.getPlayerInfo(playerId)
}

function getCellHtml(cell: Cell, cellIndex: number, game: GameState) {
  let content = ""
  if (cell.owner) {
    const color = playerColors[cell.owner]
    const coloredNanobot = nanobotSVG.replace(/#4d79ff/g, color)
    content = `<div class="nanobot-container nanobot-count-${cell.count}" style="--player-color: ${color};">${`<div class="nanobot">${coloredNanobot}</div>`.repeat(cell.count)}</div>`
  }
  return `<button class="cell" data-cell-index="${cellIndex}">${content}</button>`
}

// This function will be called by the event listener.
function handleCellClick(event: Event) {
  const cellEl = event.currentTarget as HTMLElement;
  const cellIndex = parseInt(cellEl.dataset.cellIndex!);

  if (currentGame && (currentGame.isAiTurn || currentGame.explosionQueue.length > 0)) {
    return;
  }
  Rune.actions.place({ cellIndex, fromBot: false });
}

function render(game: GameState, yourPlayerId: string | undefined) {
  // Update global game state reference
  currentGame = game;

  // Render board
  board.innerHTML = game.cells.map((cell, i) => getCellHtml(cell, i, game)).join("")

  // Dim screen and disable input during AI turn
  if (game.isAiTurn) {
    document.body.classList.add("ai-turn")
  } else {
    document.body.classList.remove("ai-turn")
  }

  // Attach event listeners and set disabled state
  for (const cellEl of board.querySelectorAll(".cell")) {
    // Remove existing listener to prevent duplicates
    cellEl.removeEventListener("click", handleCellClick);

    // Attach new listener
    cellEl.addEventListener("click", handleCellClick);

    // Disable individual cells if it's AI's turn or explosion is in progress
    (cellEl as HTMLButtonElement).disabled = game.isAiTurn || game.explosionQueue.length > 0;
  }

  // Render current turn display
  const currentPlayerInfo = getPlayerInfo(game.turn);
  const currentPlayerColor = game.players[game.turn].color;
  turnDisplay.innerHTML = `
    <div class="turn-indicator" style="--player-color: ${currentPlayerColor}">
      <img src="${currentPlayerInfo.avatarUrl}" />
      <span>${currentPlayerInfo.displayName}'s Turn</span>
    </div>
  `;
    
    // Show winner
    if (game.winner) {
        const winnerInfo = getPlayerInfo(game.winner)
        const winnerColor = playerColors[game.winner]
        board.innerHTML += `<div class="winner-overlay" style="--winner-color: ${winnerColor}">
            <h2>${winnerInfo.displayName} Wins!</h2>
        </div>`
    }
    
    // Set nanobot icon as a CSS variable
    document.documentElement.style.setProperty('--nanobot-icon', `url("data:image/svg+xml,${encodeURIComponent(nanobotSVG)}")`);
}

let botMoveTimer: number | null = null;
let explosionInterval: number | null = null;

function processExplosionQueue() {
  if (currentGame && currentGame.explosionQueue.length > 0) {
    Rune.actions.processExplosion();
  }
}

Rune.initClient({
  onChange: ({ game, yourPlayerId }) => {
    currentGame = game; // Keep a global reference to the latest game state
    playerColors = {}; // Clear existing colors
    for(const pId in game.players) {
        playerColors[pId] = game.players[pId].color
    }
    render(game, yourPlayerId)

    if (explosionInterval) {
      clearInterval(explosionInterval)
      explosionInterval = null
    }

    if (game.explosionQueue.length > 0 && !game.winner) {
      explosionInterval = setInterval(() => {
        processExplosionQueue()
      }, 200)
    } else if (game.winner && explosionInterval) {
      clearInterval(explosionInterval)
      explosionInterval = null
    }

    // Clear any existing bot move timer
    if (botMoveTimer) {
      clearTimeout(botMoveTimer)
      botMoveTimer = null
    }

    // AI Logic
    if (game.isAiTurn && !game.winner) {
      botMoveTimer = setTimeout(() => {
        const validCells = game.cells.reduce((acc: number[], cell, index) => {
          if (cell.owner === null || cell.owner === "ai") {
            acc.push(index)
          }
          return acc
        }, [])

        if (validCells.length > 0) {
          const randomIndex = Math.floor(Math.random() * validCells.length)
          const cellToPlay = validCells[randomIndex]
          Rune.actions.place({ cellIndex: cellToPlay, fromBot: true });
        } else {
        }
        botMoveTimer = null // Clear timer after move
      }, 1000) // 1 second delay for AI move
    }
  },
})
