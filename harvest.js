//TAKEAWAY LOGS FOR DEBUG


//TAKE IT OUT/ COMMENT IF YOU WANT TO SEE CONSOLE LOGS 

const DEBUG = true;
if (!DEBUG) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
//TAKEAWAY LOGS FOR DEBUG


const TEST_MODE = true; 

// ========== GLOBAL VARIABLES ========== //
let canvas;
let seedCtrl;
let growingCtrl;
let refreshTimer;
let hasFrozenGrowth = false;


function draw() {
  if (!window.gridConfig) return;
  clear();
  drawGrid();

  if (window.hasGrown && window.currentLayers?.length) {
    const now = Date.now();
    const startMs = new Date(window.growthConfig.startDate).getTime();
    const elapsedMs = now - startMs;
    const days = window.growthConfig.days;

    const rawT = TEST_MODE
      ? Math.min(elapsedMs / 1000 / days, 1)
      : Math.min(elapsedMs / (days * 86400000), 1);

    const t = logisticEase(rawT, 12);

    if (!hasFrozenGrowth) {
      const { sun = 0, water = 0, vitamins = 0 } = window.normGrowthConfig;
      window.currentGrowthConfig = {
        sun: sun * t,
        water: water * t,
        vitamins: vitamins * t
      };
      if (rawT >= 1) {
        hasFrozenGrowth = true;
        console.log('🌳 Fully grown');
      }
    }

    drawSeedGrowthInst(window.currentGrowthConfig, window.currentLayers);
  }

  if (hasFrozenGrowth) {
    noStroke();
    fill(255, 220);
    textAlign(RIGHT, BOTTOM);
    textSize(14);
    text('✓ Fully grown', width - 10, height - 10);
  }
}


// ========= Initialize the single growing canvas (global p5) ========= //
function initializeCanvas(seedId) { 
  console.log('initializeCanvas called');
  const growingWrapper = document.getElementById('growing-wrapper');
  const w = window.gridConfig?.canvasWidth || 600;
  const h = window.gridConfig?.canvasHeight || 600;

  window.globalFrameCount = 0;

  setup = () => {
    window.gradientCache = {};
    canvas = createCanvas(w, h).parent(growingWrapper);
    gradientBuffer = createGraphics(w, h);  // Add this line here
    loop();
  };

  draw = () => {
    clear();
    drawGrid();

    if (window.hasGrown && window.currentLayers?.length) {
      const now       = Date.now();
      const startMs   = new Date(window.growthConfig.startDate).getTime();
      const elapsedMs = now - startMs;
      const days      = window.growthConfig.days;

      const rawT = TEST_MODE
        ? Math.min(elapsedMs / 1000 / days, 1)
        : Math.min(elapsedMs / (days * 86400000), 1);

      const t = logisticEase(rawT, 12);

      if (!hasFrozenGrowth) {
        const { sun = 0, water = 0, vitamins = 0 } = window.normGrowthConfig;
        window.currentGrowthConfig = {
          sun:      sun      * t,
          water:    water    * t,
          vitamins: vitamins * t
        };
        if (rawT >= 1) {
          hasFrozenGrowth = true;
          console.log('🌳 Fully grown – simulación completada.');
        }
      }

      drawSeedGrowthInst(window.currentGrowthConfig, window.currentLayers);
    }

    if (hasFrozenGrowth) {
      noStroke();
      fill(255, 220);
      textAlign(RIGHT, BOTTOM);
      textSize(14);
      text('✓ Fully grown', width - 10, height - 10);
    }
  };

  if (typeof setup === 'function') {
    setup();
  }

  return true;
}

//==================== THESE CALLS DRAW BOTH CANVAS ========================///

// ========== MERGE LAYERS FOR GROWTH =========//

/**
 * mergeLayers(originalLayers, currentLayers)
 * @param {Array<Object>} originalLayers  Array base de layers (semilla inicial)
 * @param {Array<Object>} currentLayers   Array mutado según crecimiento
 * @returns {Array<Object>}               Nuevo array fusionado (deep clone)
 */
function mergeLayers(originalLayers, currentLayers) {
  // Asegurar que son arrays
  if (!Array.isArray(originalLayers)) return [];
  currentLayers = Array.isArray(currentLayers) ? currentLayers : [];

  // Map de currentLayers por id para lookup rápido
  const currMap = new Map();
  for (const layer of currentLayers) {
    if (layer && layer.id != null) {
      currMap.set(layer.id, layer);
    }
  }

  // Para detectar extras al final
  const origIds = new Set(originalLayers.map(l => l.id));

  const merged = originalLayers.map(orig => {
    // Deep-clone de la capa original (incluye .visuals, .shape, etc.)
    const base = JSON.parse(JSON.stringify(orig));

    const curr = currMap.get(orig.id);
    if (curr) {
      // 1) Merge de visuals: los de curr sobrescriben/añaden
      const currVisuals = curr.visuals
        ? JSON.parse(JSON.stringify(curr.visuals))
        : {};
      base.visuals = {
        ...base.visuals,
        ...currVisuals
      };

      // 2) Propiedades de curr (salvo visuals) sobrescriben
      for (const key of Object.keys(curr)) {
        if (key === 'id' || key === 'visuals') continue;
        base[key] = JSON.parse(JSON.stringify(curr[key]));
      }
    }

    return base;
  });

  // Anexar layers que solo estén en currentLayers (nuevas capas)
  for (const curr of currentLayers) {
    if (curr && curr.id != null && !origIds.has(curr.id)) {
      merged.push(JSON.parse(JSON.stringify(curr)));
    }
  }

  return merged;
}



// ========== MERGE LAYERS FOR GROWTH =========//








// ========== DRAW GRID =========//
// Draws grid lines with configurable color and opacity
function drawGrid() {
  const { rows, cols, canvasWidth, canvasHeight, gridColor = '#000000', gridOpacity = 0.2 } = window.gridConfig;
  const cellWidth = canvasWidth / cols;
  const cellHeight = canvasHeight / rows;

  push();
  stroke(gridColor);
  drawingContext.globalAlpha = gridOpacity;
  strokeWeight(1);
  for (let c = 0; c <= cols; c++) {
    const x = c * cellWidth;
    line(x, 0, x, canvasHeight);
  }
  for (let r = 0; r <= rows; r++) {
    const y = r * cellHeight;
    line(0, y, canvasWidth, y);
  }
  drawingContext.globalAlpha = 1;
  pop();
}


// ========= Fetch data and render original seed ========= //
async function fetchAndRenderSeed(seedId) {
  console.log('fetchAndRenderSeed called with seedId', seedId);

  const errorDiv     = document.getElementById('seedError');
  const plantSummary = document.getElementById('plant-summary');

  if (!errorDiv || !plantSummary) {
    console.error('Missing required UI elements for seed');
    if (errorDiv) errorDiv.textContent = 'Error: Missing UI elements';
    return;
  }

  if (!window.seedsCol) {
    console.error('Firestore not initialized');
    errorDiv.textContent = 'Error: Firestore not available';
    return;
  }

  try {
    const docSnap = await window.seedsCol.doc(seedId).get();
    if (!docSnap.exists) throw new Error('Seed not found');

    const data = docSnap.data();

    // Canvas + capas originales
    window.gridConfig = data.gridConfig || { rows: 2, cols: 2, canvasWidth: 400, canvasHeight: 300 };
    window.originalLayers = data.originalLayers || [];
    window.layers = window.originalLayers;
    
    if (!canvas) {
      initializeCanvas(seedId);
    } else {
      resizeCanvas(window.gridConfig.canvasWidth, window.gridConfig.canvasHeight);
    }
    

    // Mostrar fecha de plantado
    const plantedAt = data.plantedAt?.toDate?.() || new Date();
    plantSummary.textContent = `Planted at: ${plantedAt.toLocaleString()}`;

    // Call growth AFTER data load and canvas init
    fetchAndRenderGrowth(seedId);
    startGrowthPolling(seedId, 5000);

    console.log('✅ Seed data loaded correctly');
  } catch (err) {
    console.error('fetchAndRenderSeed error:', err);
    errorDiv.textContent = `Error: ${err.message}`;
  }
}

// ========= Handle search form lookup ========= //
function onLookup() {
  console.log('onLookup called');
  const seedInput = document.getElementById('seedId');
  const errDiv = document.getElementById('seedError');
  if (!seedInput || !errDiv) {
    console.error('onLookup: Missing seedId or seedError elements');
    return;
  }

  const seedId = seedInput.value.trim();
  if (!/^[A-Za-z0-9]{7}$/.test(seedId)) {
    errDiv.textContent = 'Seed ID must be 7 alphanumeric characters.';
    return;
  }
  errDiv.textContent = '';

  const u = new URL(window.location);
  u.searchParams.set('seed', seedId);
  window.history.replaceState({}, '', u);

  if (refreshTimer) clearInterval(refreshTimer);
  fetchAndRenderSeed(seedId);
}


// ========= Setup event listeners ========= //
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded');
  const lookupBtn = document.getElementById('lookupBtn');
if (lookupBtn) {
  lookupBtn.addEventListener('click', (e) => {
    e.preventDefault(); // 🔒 Detiene el refresh del formulario
    onLookup();         // 🚀 Llama tu función de búsqueda
  });
}


  const urlParams = new URLSearchParams(window.location.search);
  const seedId = urlParams.get('seed');
  if (seedId && /^[A-Za-z0-9]{7}$/.test(seedId)) {
    document.getElementById('seedId').value = seedId;
    fetchAndRenderSeed(seedId);
  }
});

// ========= Cleanup on unload ========= //
window.addEventListener('unload', () => {
  console.log('window unload: cleaning up');
  if (refreshTimer) clearInterval(refreshTimer);
  if (window.seedCtrl) window.seedCtrl.remove();
  if (window.growingCtrl) window.growingCtrl.remove();
});


//========= instances auf p5 =================

//THIS is necesary because im working with p5 on the sketch, but since harvest has more than one canvas, 
// its better to wark as instances, that means that i needed to create functions that work throughtout the instance
//without touching the p5 functions that only work from sketch, ik there is an easier way but this is what
//i did for it :)))

// ================================================
// harvest.js — Función instance‐safe drawSeed (r-c keys)
// ================================================

/**
 * Dibuja gradientes y shapes según window.layers, en modo instancia p5.
 * Las claves de celdas son "row-col" (r-c).
 * @param {p5} p - Instancia de p5
 * @param {boolean} isGrown - Si true, aplica bloom expansion
 * @param {Array} layers - Array de layers; cada layer contiene `visuals` con keys "r-c"
 */
/** 
 * Dibuja gradientes y shapes en modo instancia, usando window.gridConfig (sin p.width)
 * Las claves de celdas son "row-col".
 */
function drawSeedGrowthInst(growthConfig, layers = null) {
  const {
    rows,
    cols,
    canvasWidth,
    canvasHeight
  } = window.gridConfig;
  const cellW = canvasWidth / cols;
  const cellH = canvasHeight / rows;

  const target = layers || window.layers;
  if (!Array.isArray(target) || target.length === 0) return;

  const cache = window.gradientCache || (window.gradientCache = {});

  for (const layer of target) {
    if (!layer.visuals) continue;

    for (const [cellKey, visual] of Object.entries(layer.visuals)) {
      const [r, c] = cellKey.split('-').map(Number);
      if (!Number.isInteger(r) || !Number.isInteger(c)) continue;

      push();
      translate(c * cellW, r * cellH);

      if (visual.type === 'gradient' && Array.isArray(visual.colors)) {
        const key = `r${r}c${c}`;
        let pg = cache[key];
        if (!pg) pg = cache[key] = createGraphics(cellW, cellH);

        const fc = animationsPaused ? pausedFrameCount : frameCount;
        updateGradientBuffer(pg, visual.colors, visual.offset || 0, fc);
        image(pg, 0, 0);

        if (visual.bloom && growthConfig) {
          applyBloomExpansion(null, visual); // null porque no pasamos instancia
        }

      } else if (visual.type === 'shape' && visual.shape) {
        const s = visual.shape;
        // convertido a porcentaje si viene en [0..1]
        let sizePct = s.size != null ? s.size : 1;
        if (sizePct <= 1) sizePct *= 100;
      
        // 1) Recupera las nuevas propiedades de tu objeto
        const subdivisions    = Number.isInteger(s.subdivisions)    ? s.subdivisions    : 5;
        const breathPhase     = typeof s.breathPhase     === 'number' ? s.breathPhase     : 0;
        const breathAmplitude = typeof s.breathAmplitude === 'number' ? s.breathAmplitude : 0.3;
        const breathSpeed     = typeof s.breathSpeed     === 'number' ? s.breathSpeed     : 0.5;
        const rotationSpeed   = typeof s.rotationSpeed   === 'number' ? s.rotationSpeed   : 0.1;
      
        // 2) Llama a drawShape pasando **todas** las props
        drawShape(
          cellW, cellH,              // ancho / alto de celda
          s.shapeType,               // tipo de forma
          s.fillColor,               // fill
          s.strokeColor,             // stroke
          sizePct,                   // tamaño
          subdivisions,              // **nº de rings**
          breathPhase,               // **desfase inicial**
          breathAmplitude,           // **amplitud de respiración**
          breathSpeed,               // **velocidad de respiración**
          rotationSpeed              // **velocidad de rotación**
        );
      }
      pop();
    }
  }
}


function _getCellBuffer(p, cache, row, col, cellW, cellH) {
  const key = `r${row}c${col}`;
  if (!cache[key]) {
    cache[key] = p.createGraphics(cellW, cellH);
  }
  return cache[key];
}


