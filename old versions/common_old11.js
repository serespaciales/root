
const MODE = document.body.dataset.mode || 'edit';
const DAY_IN_MINUTES = 1; // 1 day = 1 minute for debugging
const firebaseConfig = {
  apiKey: "AIzaSyAN1_EbV_HesrVr2PUZEqwH5xkT23jNXko",
  authDomain: "root-online.firebaseapp.com",
  projectId: "root-online",
  storageBucket: "root-online.firebasestorage.app",
  messagingSenderId: "414106332565",
  appId: "1:414106332565:web:54bd602fe0657f25435a9c"
};
let animationsPaused = false; //PAUSAR EL CRECIMIENTO GLOBAL, AYUDA CON EL LAG !!!



// Firebase SDKs are loaded synchronously before common.js in the HTML,
// so we can initialize immediately and synchronously right here.
// No retries, no DOMContentLoaded — just init once, cleanly.
(function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK not available — check script load order in HTML.');
      return;
    }
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    window.seedsCol = firebase.firestore().collection('seeds');
    console.log('Firebase ready, seedsCol defined');
  } catch (err) {
    console.error('Firebase init failed:', err);
  }
})();

function computeElapsedDays(ts) {
  const then = ts?.toDate ? ts.toDate() : new Date();
  const now = new Date();
  const diff = now - then;
  return Math.max(0, Math.min(21, diff / (1000 * 60 * 60 * 24)));
}

function generateSeed() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let seed = '';
  for (let i = 0; i < 7; i++) {
    seed += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return seed;
}

window.layers = [];
window.originalLayers = [];
window.activeLayer = null;

function generateLayerID() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
}

function randomColorFromNeonPalette() {
  const neonPalette = [
    [255, 255, 255], // blanco
    [55, 55, 55],    // gris
    [31, 96, 237],   // azul de la marca
    [116, 82, 91],   // café
    [116, 91, 216],  // morado
    [202, 109, 216], // rosado
    [208, 252, 118], // amarillo de la marca
    [255, 82, 91]    // rojo candente
  ];
  const arr = neonPalette[Math.floor(Math.random() * neonPalette.length)];
  return `rgb(${arr[0]}, ${arr[1]}, ${arr[2]})`;
}


window.loadSeed = function(data) {
  if (data.gridConfig) {
    window.gridConfig = window.gridConfig || {};
    window.gridConfig.rows         = data.gridConfig.rows         || 2;
    window.gridConfig.cols         = data.gridConfig.cols         || 2;
    window.gridConfig.canvasWidth  = data.gridConfig.canvasWidth  || 800;
    window.gridConfig.canvasHeight = data.gridConfig.canvasHeight || 600;
  }

  if (data.layers && Array.isArray(data.layers)) {
    window.layers = data.layers.map(rawLayer => {
      const layer = rawLayer instanceof Map ? Object.fromEntries(rawLayer) : { ...rawLayer };
      const visualsMap = layer.visuals instanceof Map ? Object.fromEntries(layer.visuals) : layer.visuals || {};

      layer.visuals = Object.fromEntries(
        Object.entries(visualsMap).map(([cellKey, rawVisual]) => {
          const visualObj = rawVisual instanceof Map ? Object.fromEntries(rawVisual) : { ...rawVisual };
          const gradient = visualObj.gradient || {};
          const colors     = Array.isArray(gradient.colors)    ? gradient.colors     : [];
          const offset     = typeof gradient.offset === 'number'     ? gradient.offset     : 0;
          const direction  = typeof gradient.direction === 'number'  ? gradient.direction  : 0;
          const scale      = typeof gradient.scale === 'number'      ? gradient.scale      : 1;
          const distortion = typeof gradient.distortion === 'number' ? gradient.distortion : 0;

          return [ cellKey, {
            type: visualObj.type || layer.type || 'gradient',
            colors,
            offset,
            direction,
            scale,
            distortion,
            bloom: visualObj.bloom || { sigma: 0, intensity: 0 },
            shape: {
              shapeType:   visualObj.shape?.shapeType   || 'circle',
              fillColor:   visualObj.shape?.fillColor   || '#ffffff',
              strokeColor: visualObj.shape?.strokeColor || '#000000',
              size:        visualObj.shape?.size        || 1,
              opacity:     visualObj.shape?.opacity     || 1,
              extrudePct:  visualObj.shape?.extrudePct  || 0,
              subdivisions:visualObj.shape?.subdivisions|| 0,
              tint:        visualObj.shape?.tint        || null,
              breathAmplitude: typeof visualObj.shape?.breathAmplitude === 'number'
                    ? visualObj.shape.breathAmplitude : 0,
              breathSpeed:     typeof visualObj.shape?.breathSpeed     === 'number'
                    ? visualObj.shape.breathSpeed     : 0,
              breathPhase:     typeof visualObj.shape?.breathPhase     === 'number'
                    ? visualObj.shape.breathPhase     : 0,
                    rings:       typeof visualObj.shape?.rings === 'number'
                    ? visualObj.shape.rings : 1,
              rotationSpeed:   typeof visualObj.shape?.rotationSpeed   === 'number' 
                    ? visualObj.shape.rotationSpeed   : 0, 
              spikes:          typeof visualObj.shape?.spikes          === 'number' 
                    ? visualObj.shape.spikes          : 5  
            },
            text:     visualObj.text     || { extrude: 0, branches: 0, hue: 0, content: "" },
            speckles: visualObj.speckles || { pct: 0, radius: 0 }
          }];
        })
      );

      return layer;
    });

    window.activeLayer = window.layers[0] || null;
  } else {
    window.layers = [{
      id:      generateLayerID(),
      name:    "Layer 1",
      type:    "gradient",
      color:   randomColorFromNeonPalette(),
      visible: true,
      visuals: {
        '0-0': {
          type:     "gradient",
          colors:   [randomColorFromNeonPalette(), randomColorFromNeonPalette(), randomColorFromNeonPalette()],
          offset:     0,
          direction:  0,
          scale:      1,
          distortion: 0,
          bloom:   { sigma: 0, intensity: 0 },
          shape: {
            shapeType:   'circle',
            fillColor:   '#ffffff',
            strokeColor: '#000000',
            size:        1,
            opacity:     1,
            extrudePct:  0,
            subdivisions:0,
            tint:        null
          },
          text:     { extrude: 0, branches: 0, hue: 0, content: "" },
          speckles: { pct: 0, radius: 0 }
        }
      }
    }];
    window.activeLayer = window.layers[0];
  }
  console.log('✅ Seed loaded from layers', JSON.stringify(window.layers, null, 2));
};


window.drawSeed = function(p, isGrowing = false) {
  console.log('Drawing seed, frameCount:', p.frameCount, 'isGrowing:', isGrowing, 'layers:', window.layers);
  p.clear();
  p.background(255, 255, 255, 20); // Transparent background

  // Validate data
  if (!window.layers || !Array.isArray(window.layers) || !window.gridConfig) {
    console.warn('No seed data or grid config');
    p.background(200);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('No seed data or grid config', p.width / 2, p.height / 2);
    return;
  }

  const { rows, cols } = window.gridConfig;
  const cellWidth  = p.width  / cols;
  const cellHeight = p.height / rows;

  // Draw grid
  drawGrid(p, rows, cols, cellWidth, cellHeight);

  // Render each layer (skip only when visible === false)
  window.layers.forEach((layer, index) => {
    if (!layer || layer.visible === false) {
      console.log(`Skipping layer ${index}: ${layer ? 'hidden' : 'undefined'}`);
      return;
    }
    console.log(`Rendering layer ${index}: ${layer.name}`);
    window.activeLayer = layer;
    const visuals = layer.visuals || {};

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r},${c}`;
        let visual = visuals[key] || {
          type: 'gradient',
          colors: [],
          offset: 0,
          direction: 0,
          scale: 1,
          distortion: 0,
          bloom: { sigma: 0, intensity: 0 },
          shape: {
            shapeType: 'circle',
            fillColor: '#ffffff',
            strokeColor: '#000000',
            size: 1,
            opacity: 1,
            extrudePct: 0,
            subdivisions: 0,
            tint: null
          },
          text: { extrude: 0, branches: 0, hue: 0, content: "" },
          speckles: { pct: 0, radius: 0 }
        };
        console.log(`Processing visual at ${key}:`, visual);

        const x = c * cellWidth;
        const y = r * cellHeight;
        const w = cellWidth;
        const h = cellHeight;

        p.push();
        p.translate(x, y);
        try {
          if (visual.type === "gradient" && visual.colors.length) {
            p.noStroke();
            drawAnimatedGradient(p,
              { x: 0, y: 0 },
              { x: w, y: 0 },
              { x: w, y: h },
              { x: 0, y: h },
              visual.colors,
              visual.offset || 0,
              key,
              w,
              h
            );
            if (isGrowing) applyChlorophyllRadiance(p, visual);
            if (isGrowing && visual.speckles.pct) applyMossMirage(p, visual, w, h);
          }
          else if (visual.type === "shape" && visual.shape) {
            const w0 = w;   // ancho de la celda (o múltiplos)
            const h0 = h;   // alto de la celda
            const s  = visual.shape;
            p.push();
              // NO vuelvas a traducir aquí: ya estás en (x, y)
              drawShape(
                w0, h0,
                   s.shapeType,
                   s.fillColor,
                   s.strokeColor,
                 s.size,
                   s.breathAmplitude,
                   s.breathSpeed,
                   s.rotationSpeed,
                   s.subdivisions,
                   s.spikes,
                 );
            p.pop();
          }
          else if (visual.type === "text" && visual.text.content) {
            // implement text rendering...
          }
          else {
            console.log(`Skipping visual at ${key}: invalid or empty type`);
          }
        } catch (err) {
          console.error(`Error rendering visual at ${key}:`, err);
        }
        p.pop();
      }
    }
  });

  // Reset activeLayer to first
  window.activeLayer = window.layers[0] || null;
};


function addSpeckles(p, w, h, pct, radius, tint) {
  const count = (w * h * pct) / 10000;
  for (let i = 0; i < count; i++) {
    p.fill(tint || randomColorFromNeonPalette());
    p.ellipse(p.random(w), p.random(h), radius * 2);
  }
}

function subdivideShape(subdivisions) {
  scale(1 + subdivisions * 0.1);
}





function drawGrid(p, rows, cols, cellWidth, cellHeight) {
  p.noFill();
  p.stroke(0);
  p.strokeWeight(1);

  for (let c = 0; c <= cols; c++) {
    const x = c * cellWidth;
    p.line(x, 0, x, p.height);
  }

  for (let r = 0; r <= rows; r++) {
    const y = r * cellHeight;
    p.line(0, y, p.width, y);
  }
}

//=========================COLOR HELPERS================================


// common.js
function drawShape(
  cellW, cellH,
  shapeType,
  fillColor,
  strokeColor,
  sizePct,
  subdivisions,    // usado como "rings"
  breathPhase,
  breathAmplitude,
  breathSpeed,
  rotationSpeed,   // 0 = no gira
  spikes           // nº de puntas para star
) {
  const w = cellW, h = cellH;
  const TWO_PI_LOCAL = (typeof TWO_PI !== 'undefined') ? TWO_PI : Math.PI * 2;

  // Tiempo (respeta pausa)
  const tSec = (typeof animationsPaused !== 'undefined' && animationsPaused && typeof pausedMillis === 'number')
    ? pausedMillis / 1000
    : millis() / 1000;

  // --- defaults robustos + saneo ---
  const amp    = Number.isFinite(breathAmplitude) ? Math.max(0, breathAmplitude) : 0.3;
  const freq   = Number.isFinite(breathSpeed)     ? Math.max(0, breathSpeed)     : 0.5;  // Hz
  const rotSpd = Number.isFinite(rotationSpeed)   ? Math.max(0, rotationSpeed)   : 0;    // rad/s (0 = no rota)
  const phase0 = Number.isFinite(breathPhase)     ? breathPhase                  : 0;

  // tamaño (acepta 0..1 como % y también 0..100)
  let size = (sizePct != null) ? sizePct : 100;
  if (size <= 1) size *= 100;
  size = Math.max(0, size);

  const base  = Math.min(w, h) * (size / 100);
  const rings = Math.max(1, (Number.isFinite(subdivisions) ? (subdivisions|0) : 1));
  const type  = (shapeType || 'circle').toLowerCase();

  // estilos
  if (fillColor)   fill(color(fillColor)); else noFill();
  if (strokeColor) stroke(color(strokeColor)); else noStroke();

  push();
  translate(w / 2, h / 2);
  if (rotSpd !== 0) rotate(rotSpd * tSec);

  // dibuja de afuera hacia adentro (1.0, 0.9, 0.8, ...)
  for (let k = 0; k < rings; k++) {
    const scaleK = (rings - k) / rings;
    const phaseK = phase0 + k * 0.12; // pequeño desfase por anillo
    const breath = 1 + Math.sin((TWO_PI_LOCAL * freq * tSec) + phaseK) * amp;
    const sizeK  = Math.max(1, base * breath * scaleK);

    if (type === 'square') {
      rectMode(CENTER);
      rect(0, 0, sizeK, sizeK);
    } else if (type === 'star') {
      const pts    = Math.max(3, Math.min(64, Number.isFinite(spikes) ? (spikes|0) : 5));
      const outerR = sizeK / 2;
      const innerR = outerR * 0.5;
      beginShape();
      for (let i = 0; i < pts * 2; i++) {
        const ang = (i * Math.PI) / pts;
        const r   = (i % 2 === 0) ? outerR : innerR;
        vertex(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      endShape(CLOSE);
    } else {
      // circle (default)
      ellipse(0, 0, sizeK, sizeK);
    }
  }

  pop();
}



function setupToolLogic() {
  if (MODE !== 'edit') {
    console.log('this is is an editing function');
    return;
  }
  const buttons = document.querySelectorAll('.tool-btn:not(#growth-btn)');

  const toolNames = {
    gradient: "Gradient",
    shape: "Shape",
    word: "Word",
    text: "Text",
    image: "Image",
    texture: "Texture",
    grid: "Grid",
    layers: "Layers",
    erase: "Erase",
    color: "Color"
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', e => {
      const sel = btn.dataset.tool;
      if (!sel || sel === 'growth') return;

      activeTool = sel;
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Ocultar todos los paneles
      document.querySelectorAll('.tool-options').forEach(opt => {
        opt.style.display = 'none';
      });

      // Mostrar el correspondiente
      const panel = document.getElementById(`options-${sel}`);
      if (panel) panel.style.display = 'flex';

      // Actualizar título
      const title = document.getElementById("properties-title");
      title.textContent = toolNames[sel] || "Tool Properties";
    });
  });
}
