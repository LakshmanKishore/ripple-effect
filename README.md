# Ripple Effect

A turn-based strategy game where players compete to control the grid by placing nanobots and triggering chain reactions.

## Development Approach

This game was built using the Rune platform, with the game logic written in TypeScript. The development process followed these steps:

1.  **Game Initialization**: The game starts with a blank grid and assigns each player a unique color.
2.  **Cell & Nanobot Model**: Each cell in the grid has an owner, a nanobot count, and a capacity. Nanobots are rendered as SVG icons and colored according to their owner.
3.  **Turn Sequence**: Players take turns placing nanobots in empty cells or cells they already own.
4.  **Explosion & Chain Reaction**: When a cell's nanobot count exceeds its capacity, it explodes, distributing nanobots to neighboring cells and potentially triggering a chain reaction.
5.  **Territory Conversion**: When a nanobot is added to a cell, the cell's ownership switches to the acting player.
6.  **Player Elimination**: Players are eliminated when they have no nanobots left on the board.
7.  **Win Condition**: The last player with nanobots on the board wins the game.

## Development on Termux

To set up a development environment on Termux, you'll need to install Node.js, Git, and the Gemini CLI.

1.  **Install Node.js and Git**:

    ```bash
    pkg install nodejs git
    ```

2.  **Install Gemini CLI**:

    ```bash
    npm install -g @gemini-cli/core
    ```

3.  **Clone the repository**:

    ```bash
    git clone https://github.com/rune/ripple-effect.git
    ```

4.  **Install dependencies**:

    ```bash
    cd ripple-effect
    npm install
    ```

5.  **Run the game**:

    ```bash
    npm run dev
    ```

## Getting Started with Rune

### `npm run dev`

Runs the game in Dev UI.

The page will reload when you make changes.

### `npm run upload`

Builds the game and starts upload process to Rune.

### `npm run build`

Builds the game. You can then upload it to Rune using `npx rune@latest upload`.

### `npm run lint`

Runs the validation rules. You can read about them in the [docs on server-side logic](https://developers.rune.ai/docs/advanced/server-side-logic).

### `npm run typecheck`

Verifies that TypeScript is valid.


## Learn More

See the [Rune docs](https://developers.rune.ai/docs/quick-start) for more info. You can also ask any questions in the [Rune Discord](https://discord.gg/rune-devs), we're happy to help!