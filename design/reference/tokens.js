// XO Play design tokens - pure grayscale system, franchise colors are hues
// Using oklch with zero chroma for true neutrals

const XO = {
  // System grayscale palette — true neutral
  gray: {
    0:   '#ffffff',
    25:  '#fbfbfb',
    50:  '#f6f6f6',
    100: '#ededed',
    200: '#dcdcdc',
    300: '#c4c4c4',
    400: '#a0a0a0',
    500: '#767676',
    600: '#565656',
    700: '#3d3d3d',
    800: '#262626',
    900: '#141414',
    950: '#0a0a0a',
  },
  // Status — desaturated, muted
  status: {
    success: '#1d7d4c',
    successBg: '#e8f1ec',
    warning: '#9c6a00',
    warningBg: '#f6eedd',
    error:   '#b82727',
    errorBg: '#f6e4e4',
    info:    '#2c5d8f',
    live:    '#d81c1c', // live dot only
  },
  // Position color coding (saturated but restrained)
  pos: {
    QB: '#b8446b',
    RB: '#1f7a4c',
    WR: '#2656a5',
    TE: '#b36a1a',
    K:  '#6e4a9a',
    DEF:'#4a4a4a',
    FLEX:'#565656',
  },
  // Injury
  injury: {
    Q: '#9c6a00',
    D: '#b82727',
    O: '#b82727',
    IR:'#141414',
  },
  radius: {
    none: 0,
    sm: 3,
    md: 6,
    lg: 10,
    xl: 16,
    full: 999,
  },
  // Franchise colors (5 - broad range including edge cases)
  franchises: [
    // 1. Safe/classic - forest green + cream
    { id:'oak', name:'Oakdale Timberwolves', slug:'OAK', abbr:'OAK', primary:'#1b4332', secondary:'#d4c79a', owner:'M. Torres', record:'7-3' },
    // 2. Bold clashing - hot pink + electric orange
    { id:'mia', name:'Miami Tempo', slug:'MIA', abbr:'MIA', primary:'#e0266f', secondary:'#ff8a2d', owner:'J. Whitaker', record:'6-4' },
    // 3. Near-black - deep navy + graphite (tricky - needs contrast safety)
    { id:'bro', name:'Bronxville Iron', slug:'BRO', abbr:'BRO', primary:'#0f1626', secondary:'#3a3f4a', owner:'D. Kovac', record:'8-2' },
    // 4. Near-white - cream + pale yellow (VERY tricky)
    { id:'san', name:'Santa Fe Dust', slug:'SAN', abbr:'SAN', primary:'#efe7cf', secondary:'#d9b86b', owner:'A. Brennan', record:'5-5' },
    // 5. Unexpected - purple + teal
    { id:'prt', name:'Portland Rainwater', slug:'PRT', abbr:'PRT', primary:'#4c2a6e', secondary:'#2ba59a', owner:'K. Oshiro', record:'4-6' },
  ],
};

// Determine if text should be white or dark on a given color
function onColor(hex) {
  const h = hex.replace('#','');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
  return lum > 0.62 ? '#0a0a0a' : '#ffffff';
}

// Lightly darken a near-white franchise color so it reads as a color block,
// or lighten a near-black one slightly. Used sparingly.
function safeBlock(hex) {
  const h = hex.replace('#','');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
  // If very light (>0.9 lum) we return the color unchanged but caller should add a dark border
  return { color: hex, veryLight: lum > 0.85, veryDark: lum < 0.12, lum };
}

window.XO = XO;
window.onColor = onColor;
window.safeBlock = safeBlock;
