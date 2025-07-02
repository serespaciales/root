//TAKEAWAY LOGS FOR DEBUG


//TAKE IT OUT/ COMMENT IF YOU WANT TO SEE CONSOLE LOGS 

const DEBUG = false;
if (!DEBUG) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
//TAKEAWAY LOGS FOR DEBUG




// ========== GLOBAL VARIABLES ========== //

let seedCtrl;
let growingCtrl;
let refreshTimer;



// ========= Initialize both canvases once ========= //
function initializeCanvas(seedId) { 
  console.log('initializeCanvas called');
  const canvasWrapper = document.getElementById('canvas-wrapper');
  const growingWrapper = document.getElementById('growing-wrapper');
  const w = window.gridConfig?.canvasWidth || 600;
  const h = window.gridConfig?.canvasHeight || 600;

  window.globalFrameCount = 0;

  fetchAndRenderSeed(seedId).then(() => {
    // Ahora sí ya existe window.originalLayers
    fetchAndRenderGrowth(seedId);
    startGrowthPolling(seedId, 5000);
  });

  //==================== THESE CALLS DRAW BOTH CANVAS ========================///
  // ORIGINAL SEED CANVAS
  window.seedCtrl = new p5(p => {
    const scaleFactor = 0.2;
  
    p.setup = () => {
      p.frameRate(12); //FRAME RATE PARA QUE NO SE SOBRECARGUE LA PAGINA
      // 1) Inicializa cache de gradientes
      window.gradientCache = {};
  
      // 2) Patch de createGraphics para que todo buffer conozca a la instancia `p`
      const _origCreateGraphics = p.createGraphics;
      p.createGraphics = function(w, h) {
        const pg = _origCreateGraphics.call(this, w, h);
        // Asignamos siempre la instancia correcta
        pg._renderer._pInst = p;
        return pg;
      };
  
      // 3) Creamos el canvas
      const { canvasWidth: w, canvasHeight: h } = window.gridConfig;
      p.createCanvas(w * scaleFactor, h * scaleFactor)
       .parent(canvasWrapper);
  
      // No llamamos a noLoop(): queremos animación continua
    };
  
    p.draw = () => {
      // 0) Limpiar y escalar
      p.clear();
      p.push();
      p.scale(scaleFactor);
  
      // 1) Dibuja rejilla (si la necesitas)
      drawGrid(p);
  
      // 3) dibujar la seed ENCIMA
      if (window.originalLayers) {
        const prev = window.layers;
        window.layers = window.originalLayers;
        drawSeedInst(p, window.layers);
        window.layers = prev;
      } else {
        p.background(200);
        p.fill(0);
        p.textAlign(p.CENTER, p.CENTER);
        p.text('No original seed data',
               canvasWidth / 2, canvasHeight / 2);
      }
  
      // 4) salir del espacio escalado
      p.pop();
    };
  });
  
  // GROWING SEED CANVAS
  window.growingCtrl = new p5(p => {
    const scaleFactor = 0.2;
    const TEST_MODE   = true;    // 21s → 21d
    let hasFrozenGrowth = false;
    let w, h;
  
    // MediaRecorder vars
    let recorder, recordedChunks = [];
  
    p.setup = () => {
      p.frameRate(12);
      w = window.gridConfig.canvasWidth;
      h = window.gridConfig.canvasHeight;
      p._gradientCache = {};
  
      // Patch para createGraphics
      const _orig = p.createGraphics;
      p.createGraphics = (gw, gh) => {
        const pg = _orig.call(p, gw, gh);
        pg._renderer._pInst = p;
        return pg;
      };
  
      // Canvas
      p.createCanvas(w * scaleFactor, h * scaleFactor)
       .parent(growingWrapper);
  
      // Inicia grabación a 1fps
      const stream = p.canvas.captureStream(1);
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recorder.ondataavailable = e => { if (e.data.size) recordedChunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'growth.webm';
        a.click();
        URL.revokeObjectURL(url);
      };
      recorder.start(1000);  // chunk cada 1s
    };
  
    p.draw = () => {
      p.clear();
      p.push();
      p.scale(scaleFactor);
      drawGrid(p);
  
      if (window.hasGrown && window.currentLayers?.length) {
        // 1) rawT en [0,1]
        const now       = Date.now();
        const startMs   = new Date(window.growthConfig.startDate).getTime();
        const elapsedMs = now - startMs;
        const days      = window.growthConfig.days; // normalmente 21
  
        const rawT = TEST_MODE
          ? Math.min(elapsedMs/1000/days, 1)
          : Math.min(elapsedMs/(days*86400000), 1);
  
        // 2) Curva logística
        const t = logisticEase(rawT, 12);
  
        // 3) Actualiza growthConfig mientras crece
        if (!hasFrozenGrowth) {
          const { sun = 0, water = 0, vitamins = 0 } = window.normGrowthConfig;
          window.currentGrowthConfig = {
            sun:      sun      * t,
            water:    water    * t,
            vitamins: vitamins * t
          };
          if (rawT >= 1) {
            hasFrozenGrowth = true;
            recorder.stop();  // detiene y descarga
            console.log('🌳 Fully grown – simulación completada.');
          }
        }
  
        // 4) Dibuja el crecimiento
        drawSeedGrowthInst(p, window.currentGrowthConfig, window.currentLayers);
      }
  
      // Indicador de fully grown
      if (hasFrozenGrowth) {
        p.push();
        p.noStroke();
        p.fill(255, 220);
        p.textAlign(p.RIGHT, p.BOTTOM);
        p.textSize(14);
        p.text('✓ Fully grown', p.width - 10, p.height - 10);
        p.pop();
      }
  
      p.pop();
    };
  });
  
  
  
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
function drawGrid(p) {
  //console.log('drawGrid');
  const { rows, cols } = window.gridConfig;
  const gridColor = window.gridConfig.gridColor || '#000000';
  const gridOpacity = window.gridConfig.gridOpacity ?? 0.2;
  const cellWidth = window.gridConfig.canvasWidth / cols;
  const cellHeight = window.gridConfig.canvasHeight / rows;

  p.push();
  p.stroke(gridColor);
  p.drawingContext.globalAlpha = gridOpacity;
  p.strokeWeight(1);
  for (let c = 0; c <= cols; c++) {
    const x = c * cellWidth;
    p.line(x, 0, x, window.gridConfig.canvasHeight);
  }
  for (let r = 0; r <= rows; r++) {
    const y = r * cellHeight;
    p.line(0, y, window.gridConfig.canvasWidth, y);
  }
  p.drawingContext.globalAlpha = 1;
  p.pop();
}


// ========= Fetch data and render original seed ========= //
async function fetchAndRenderSeed(seedId) {
  console.log('fetchAndRenderSeed called with seedId', seedId);

  const errorDiv     = document.getElementById('seedError');
  const plantSummary = document.getElementById('harvest-summary');

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
    window.gridConfig     = data.gridConfig || { rows: 2, cols: 2, canvasWidth: 400, canvasHeight: 300 };
    window.originalLayers = data.originalLayers || [];
    window.layers         = window.originalLayers;

    // Inicializar canvas si no existe
    if (!window.seedCtrl) {
      if (!initializeCanvas(seedId)) throw new Error('Failed to initialize seed canvas');
    }

    // Mostrar fecha de plantado
    const plantedAt = data.plantedAt?.toDate?.() || new Date();
    plantSummary.textContent = `Planted at: ${plantedAt.toLocaleString()}`;

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
  if (lookupBtn) lookupBtn.addEventListener('click', onLookup);

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
function drawSeedInst(p, isGrown = false, layers = null) {
  const {
    rows,
    cols,
    canvasWidth,
    canvasHeight
  } = window.gridConfig;       // ≤—— aquí ya está normalizado
  const cellW = canvasWidth / cols;
  const cellH = canvasHeight / rows;

  const target = layers || window.layers;
  if (!Array.isArray(target) || target.length === 0) return;

  const cache = p._gradientCache || (p._gradientCache = {});

  for (const layer of target) {
    //console.log("🧱 layer.visuals:", layer.visuals);
    if (!layer.visuals) continue;
    for (const [cellKey, visual] of Object.entries(layer.visuals)) {
      const [r, c] = cellKey.split('-').map(Number);
      if (!Number.isInteger(r) || !Number.isInteger(c)) continue;

      p.push();
      p.translate(c * cellW, r * cellH);

      if (visual.type === 'gradient' && Array.isArray(visual.colors)) {
        const key = `r${r}c${c}`;
        let pg = cache[key];
        if (!pg) pg = cache[key] = p.createGraphics(cellW, cellH);

        updateGradientBufferInst(p, pg, visual.colors, visual.offset || 0, p.frameCount);
        p.image(pg, 0, 0);

        if (isGrown && visual.bloom) applyBloomExpansion(p, visual);

      } else if (visual.type === 'shape' && visual.shape) {
        const s = visual.shape;
        // normaliza size (0–1 → 0–100)
        let sizePct = s.size != null ? s.size : 1;
        if (sizePct <= 1) sizePct *= 100;

        drawShape(
          p,
          cellW, cellH,
          s.shapeType   || 'circle',
          s.fillColor   || '#ffffff',
          s.strokeColor || '#000000',
          sizePct,
          r, c,
          layer.visuals
        );

        if (isGrown && visual.bloom) applyBloomExpansion(p, visual);
      }

      p.pop();
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


