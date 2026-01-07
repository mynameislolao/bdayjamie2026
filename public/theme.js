// --- THEME CONFIGURATION --- //
// Everything visual lives here.
// Change colors, fonts, sizes, and effects freely.

const theme = {
  // --- GENERAL ---
  background: '#ffffffff',
  font: 'Inter, sans-serif',
  textColor: '#ffffff',

  // --- AUDIO CIRCLES ---
  circle: {
    baseColor: '#fff3f3ff',
    hoverColor: '#ff0000ff',
    activeColor: '#fff700ff',
    textColor: '#ffffff',
    borderRadius: '16px',
    padding: '8px 14px',
    boxShadow: '0 0 10px rgba(255,255,255,0.2)',
    transition: 'all 0.3s ease',
    glowActive: '0 0 20px 5px rgba(46,204,113,0.6)',
  },

  // --- CONNECTIONS ---
  connection: {
    color: '#00bcd4',
    weight: 2,
    textSize: 14,
    textColor: '#ffffff',
    dashed: false,
  },

  // --- TAG CLOUD ---
  tags: {
    hueMin: 150,
    hueMax: 255,
    sizeMin: 14,
    sizeMax: 24,
    alphaMin: 150,
    alphaMax: 220,
    italic: true,
  },

  // --- FLOCK / BACKGROUND BOIDS ---
  flock: {
    fillColor: [180, 200, 255, 80], // HSB or RGBA
    shape: 'circle', // 'circle' | 'triangle'
    size: 30,
  },

  // --- BUTTONS ---
  button: {
    background: '#222',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '8px',
    padding: '10px 18px',
    hoverBackground: '#00aaff',
    hoverColor: '#000',
  },
};
