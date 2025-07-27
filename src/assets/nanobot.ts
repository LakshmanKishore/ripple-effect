import type { PlayerId } from "../../src/logic.ts"

// This will be used for the CSS mask to clip the avatar
export function getNanobotMaskSVG() {
  return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <polygon points="50,20 75,35 75,65 50,80 25,65 25,35" fill="black" />
  </svg>`
}

// This will be layered on top to show the colored frame and tentacles
export function getNanobotFrameSVG(color: string) {
  return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Hexagon Border -->
    <polygon points="50,20 75,35 75,65 50,80 25,65 25,35"
             fill="none" stroke="${color}" stroke-width="1.5" />

    <!-- 4 Tentacles -->
    <path d="M75,35 C85,30 90,25 95,20" fill="none" stroke="${color}" stroke-width="1" />
    <path d="M75,65 C85,70 90,75 95,80" fill="none" stroke="${color}" stroke-width="1" />
    <path d="M25,65 C15,70 10,75 5,80" fill="none" stroke="${color}" stroke-width="1" />
    <path d="M25,35 C15,30 10,25 5,20" fill="none" stroke="${color}" stroke-width="1" />

    <!-- Connection points -->
    <circle cx="95" cy="20" r="2" fill="${color}" />
    <circle cx="95" cy="80" r="2" fill="${color}" />
    <circle cx="5" cy="80" r="2" fill="${color}" />
    <circle cx="5" cy="20" r="2" fill="${color}" />
  </svg>`
}
