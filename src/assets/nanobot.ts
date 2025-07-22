export const nanobotSVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <!-- Hexagon Body -->
  <polygon points="50,20 75,35 75,65 50,80 25,65 25,35" 
           fill="none" stroke="#4d79ff" stroke-width="1.5" />
  
  <!-- Inner Circuit Pattern - Simplified -->
  <g fill="none" stroke="#4d79ff" stroke-width="0.8">
    <circle cx="50" cy="50" r="12" />
    <rect x="44" y="44" width="12" height="12" />
    <line x1="38" y1="50" x2="62" y2="50" />
    <line x1="50" y1="38" x2="50" y2="62" />
    <path d="M35,40 L40,45" />
    <path d="M35,60 L40,55" />
    <path d="M65,40 L60,45" />
    <path d="M65,60 L60,55" />
  </g>
  
  <!-- 4 Tentacles (one from each corner except top and bottom) -->
  <!-- Top-right tentacle -->
  <path d="M75,35 C85,30 90,25 95,20" 
        fill="none" stroke="#4d79ff" stroke-width="1" />
  
  <!-- Bottom-right tentacle -->
  <path d="M75,65 C85,70 90,75 95,80" 
        fill="none" stroke="#4d79ff" stroke-width="1" />
  
  <!-- Bottom-left tentacle -->
  <path d="M25,65 C15,70 10,75 5,80" 
        fill="none" stroke="#4d79ff" stroke-width="1" />
  
  <!-- Top-left tentacle -->
  <path d="M25,35 C15,30 10,25 5,20" 
        fill="none" stroke="#4d79ff" stroke-width="1" />
  
  <!-- Connection points on tentacle ends -->
  <circle cx="95" cy="20" r="2" fill="#4d79ff" />
  <circle cx="95" cy="80" r="2" fill="#4d79ff" />
  <circle cx="5" cy="80" r="2" fill="#4d79ff" />
  <circle cx="5" cy="20" r="2" fill="#4d79ff" />
</svg>`