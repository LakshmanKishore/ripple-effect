import "./styles.css"
import type { GameState, Cell } from "./logic"
import { nanobotSVG } from "./assets/nanobot.ts"

const board = document.getElementById("board")!
const playersSection = document.getElementById("playersSection")!

let playerColors: { [key: string]: string } = {}

function getCellHtml(cell: Cell, cellIndex: number, game: GameState) {
  let content = ""
  if (cell.owner) {
    const color = playerColors[cell.owner]
    content = `<div class="nanobot-container">${`<div class="nanobot" style="background-color: ${color};"></div>`.repeat(cell.count)}</div>`
  }
  return `<button class="cell" data-cell-index="${cellIndex}">${content}</button>`
}

function render(game: GameState, yourPlayerId: string | undefined) {
  // Render board
  board.innerHTML = game.cells.map((cell, i) => getCellHtml(cell, i, game)).join("")

  // Attach event listeners
  for (const cellEl of board.querySelectorAll(".cell")) {
    cellEl.addEventListener("click", () => {
      const cellIndex = parseInt((cellEl as HTMLElement).dataset.cellIndex!)
      Rune.actions.placeBot(cellIndex)
    })
  }

  // Render players
  playersSection.innerHTML = game.playerIds
    .map((playerId) => {
      const player = game.players[playerId]
      const isYou = playerId === yourPlayerId
      const isTurn = playerId === game.turn
      const playerInfo = Rune.getPlayerInfo(playerId)

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
        const winnerInfo = Rune.getPlayerInfo(game.winner)
        const winnerColor = playerColors[game.winner]
        board.innerHTML += `<div class="winner-overlay" style="--winner-color: ${winnerColor}">
            <h2>${winnerInfo.displayName} Wins!</h2>
        </div>`
    }
    
    // Set nanobot icon as a CSS variable
    document.documentElement.style.setProperty('--nanobot-icon', `url("data:image/svg+xml,${encodeURIComponent(nanobotSVG)}")`);
}

Rune.initClient({
  onChange: ({ game, yourPlayerId }) => {
    if (!Object.keys(playerColors).length) {
        for(const pId in game.players) {
            playerColors[pId] = game.players[pId].color
        }
    }
    render(game, yourPlayerId)
  },
})
