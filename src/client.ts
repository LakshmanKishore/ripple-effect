import "./styles.css"
import type { GameState, Cell } from "./logic"
import { nanobotSVG } from "./assets/nanobot.ts"

const board = document.getElementById("board")!
const playersSection = document.getElementById("playersSection")!

let playerColors: { [key: string]: string } = {}

// Global game state reference
let currentGame: GameState | null = null;

// Helper to get player info, including AI
function getPlayerInfo(playerId: string) {
  if (playerId === "ai") {
    return {
      displayName: "AI Bot",
      avatarUrl: `data:image/svg+xml,${encodeURIComponent(nanobotSVG)}`,
      playerId: "ai",
    }
  }
  return Rune.getPlayerInfo(playerId)
}

function getCellHtml(cell: Cell, cellIndex: number, game: GameState) {
  let content = ""
  if (cell.owner) {
    const color = playerColors[cell.owner]
    content = `<div class="nanobot-container">${`<div class="nanobot" style="background-color: ${color};"></div>`.repeat(cell.count)}</div>`
  }
  return `<button class="cell" data-cell-index="${cellIndex}">${content}</button>`
}

// This function will be called by the event listener.
function handleCellClick(event: Event) {
  const cellEl = event.currentTarget as HTMLElement;
  const cellIndex = parseInt(cellEl.dataset.cellIndex!);

  // Crucial: Prevent human clicks during AI turn
  if (currentGame && currentGame.isAiTurn) {
    console.log("client.ts: Click ignored. AI turn.");
    return;
  }
  console.log("client.ts: Calling Rune.actions.place for human move. cellIndex:", cellIndex, "fromBot:", false);
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

    // Disable individual cells if it's AI's turn
    (cellEl as HTMLButtonElement).disabled = game.isAiTurn;
  }

  // Render players
  playersSection.innerHTML = game.playerIds
    .map((playerId) => {
      const player = game.players[playerId]
      const isYou = playerId === yourPlayerId
      const isTurn = playerId === game.turn
      const playerInfo = getPlayerInfo(playerId)

      return `
        <li style="--player-color: ${player.color}" class="${isTurn ? 'your-turn' : ''} ${player.isEliminated ? 'eliminated' : ''}">
          <img src="${playerInfo.avatarUrl}" />
          <span>${playerInfo.displayName}${isYou ? " (You)" : ""}</span>
        </li>
      `
    })
    .join("")
    
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

Rune.initClient({
  onChange: ({ game, yourPlayerId }) => {
    console.log("client.ts: onChange triggered. game.turn:", game.turn, "game.isAiTurn:", game.isAiTurn)
    if (!Object.keys(playerColors).length) {
        for(const pId in game.players) {
            playerColors[pId] = game.players[pId].color
        }
    }
    render(game, yourPlayerId)

    // Clear any existing bot move timer
    if (botMoveTimer) {
      clearTimeout(botMoveTimer)
      botMoveTimer = null
    }

    // AI Logic
    if (game.isAiTurn && !game.winner) {
      console.log("client.ts: AI logic entered.")
      botMoveTimer = setTimeout(() => {
        const validCells = game.cells.reduce((acc: number[], cell, index) => {
          if (cell.owner === null || cell.owner === "ai") {
            acc.push(index)
          }
          return acc
        }, [])

        console.log("client.ts: Valid cells for AI:", validCells)

        if (validCells.length > 0) {
          const randomIndex = Math.floor(Math.random() * validCells.length)
          const cellToPlay = validCells[randomIndex]
          console.log("client.ts: AI playing cell:", cellToPlay);
          console.log("client.ts: Calling Rune.actions.place for AI move. cellToPlay:", cellToPlay, "fromBot:", true);
          Rune.actions.place({ cellIndex: cellToPlay, fromBot: true });
        } else {
          console.log("client.ts: No valid cells for AI to play.")
        }
        botMoveTimer = null // Clear timer after move
      }, 1000) // 1 second delay for AI move
    }
  },
})
