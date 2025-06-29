// ========== GLOBAL VARIABLES ========== //

let seedCtrl;
let growingCtrl;
let refreshTimer;

// Tracks whether any growth has occurred
window.hasGrown = false;
window.lastDrawnHour = null;


// ========= Initialize both canvases once ========= //
function initializeCanvas(seedId) { 
  console.log('initializeCanvas called');
  const canvasWrapper = document.getElementById('canvas-wrapper');
  const growingWrapper = document.getElementById('growing-wrapper');
  const w = window.gridConfig?.canvasWidth || 600;
  const h = window.gridConfig?.canvasHeight || 600;

  window.globalFrameCount = 0;

  fetchAndRenderSeed(seedId);
  fetchAndRenderGrowth(seedId);
  startGrowthPolling(seedId, 5000);

  //==================== THESE CALLS DRAW BOTH CANVAS ========================///
  // ORIGINAL SEED CANVAS
  window.seedCtrl = new p5(p => {
    const scaleFactor = 0.2;
  
    p.setup = () => {
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
    const MS_PER_HOUR = 1000 * 60 * 60;
    let lastDrawnHour = -1;
  
    p.setup = () => {
      p._gradientCache = {};
  
      const _origCreateGraphics = p.createGraphics;
      p.createGraphics = function(w, h) {
        const pg = _origCreateGraphics.call(this, w, h);
        pg._renderer._pInst = p;
        return pg;
      };
  
      p.createCanvas(w * scaleFactor, h * scaleFactor).parent(growingWrapper);
    };
  
    p.draw = () => {
      p.clear();
      p.push();
      p.scale(scaleFactor);
      drawGrid(p);
  
      if (window.hasGrown && window.currentLayers?.length) {
        const startDate = new Date(window.growthConfig?.startDate || new Date());
        const days = window.growthConfig?.days || 21;
        const totalHours = days * 24;
  
        const elapsedMs = Date.now() - startDate.getTime();
        const elapsedHours = Math.floor(elapsedMs / MS_PER_HOUR);
  
        if (elapsedHours !== lastDrawnHour) {
          lastDrawnHour = elapsedHours;
  
          const t = Math.min(Math.max(elapsedHours / totalHours, 0), 1);
  
          const { sun = 0, water = 0, vitamins = 0 } = window.growthConfig || {};
          window.currentGrowthConfig = {
            sun: sun * t,
            water: water * t,
            vitamins: vitamins * t
          };
  
          console.log('🌿 Updated growth parameters:', window.currentGrowthConfig);
        }
  
        drawSeedGrowthInst(p, window.currentGrowthConfig, window.currentLayers);
      } else {
        p.background(0);
        p.fill(255);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(16);
        p.text('No growth applied yet\nReturn to Root', (w * scaleFactor) / 2, (h * scaleFactor) / 2);
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


// ========= Fetch data and render both canvases ========= //
async function fetchAndRenderSeed(seedId) {
  console.log('fetchAndRenderSeed called with seedId', seedId);
  const errorDiv         = document.getElementById('seedError');
  const plantSummary     = document.getElementById('harvest-summary');
  const growingContainer = document.getElementById('growing-container');
  const noGrowthMessage  = document.getElementById('no-growth-message');
  const growSummary      = document.getElementById('growing-summary');
  const sunEl            = document.getElementById('sun-value');
  const waterEl          = document.getElementById('water-value');
  const vitEl            = document.getElementById('vitamins-value');
  const daysEl           = document.getElementById('days-elapsed');
  const totalEl          = document.getElementById('total-days');
  const lastEl           = document.getElementById('growth-last-update');

  if (!errorDiv || !plantSummary || !growingContainer || !noGrowthMessage || !growSummary ||
      !sunEl || !waterEl || !vitEl || !daysEl || !totalEl || !lastEl) {
    console.error('fetchAndRenderSeed: Missing required UI elements');
    if (errorDiv) errorDiv.textContent = 'Error: Missing UI elements';
    return;
  }

  if (!window.seedsCol) {
    console.error('fetchAndRenderSeed: Firestore not initialized');
    errorDiv.textContent = 'Error: Firestore not available';
    return;
  }

  try {
    const docSnap = await window.seedsCol.doc(seedId).get();
    if (!docSnap.exists) throw new Error('Seed not found');
    const data = docSnap.data();

    const hasGrown = Boolean(data.locked) || (data.growthProgress > 0);

    window.gridConfig = data.gridConfig || { rows: 2, cols: 2, canvasWidth: 400, canvasHeight: 300 };

    if (!window.seedCtrl || !window.growingCtrl) {
      if (!initializeCanvas(seedId)) throw new Error('Failed to initialize canvases');
    }

    window.originalLayers = data.originalLayers || [];
    window.currentLayers  = data.layers         || [];

    noGrowthMessage.style.display        = hasGrown ? 'none' : 'block';
    growSummary.style.display            = hasGrown ? 'block' : 'none';
    growingContainer.classList.toggle('no-growth', !hasGrown);

    // draw original
    window.layers = window.originalLayers;

    // draw growth or placeholder
    if (hasGrown) {
      window.hasGrown = true; // Esto activa el render del canvas de crecimiento
      window.layers = window.currentLayers;

    } else {
      window.hasGrown = false;
      if (window.growingCtrl) {
        window.growingCtrl.clear();
        window.growingCtrl.background(200);
        window.growingCtrl.textAlign(window.growingCtrl.CENTER, window.growingCtrl.CENTER);
        window.growingCtrl.text('No growth applied', window.growingCtrl.width/2, window.growingCtrl.height/2);
      }
    }    

    const plantedAt = data.plantedAt?.toDate?.() || new Date();
    plantSummary.textContent = `Planted at: ${plantedAt.toLocaleString()}`;

    if (data.growthConfig) {
      console.log('Displaying growthConfig');
      const cfg = data.growthConfig;
      sunEl.textContent   = String(cfg.sun || 0);
      waterEl.textContent = String(cfg.water || 0);
      vitEl.textContent   = String(cfg.vitamins || 0);

      const startTs = cfg.startDate?.toDate?.() || plantedAt;
      const mins    = Math.floor((Date.now() - startTs.getTime()) / 60000);
      daysEl.textContent  = String(mins);
      totalEl.textContent = String((cfg.days || 21) * 24 * 60);

      const updatedAt = data.updatedAt?.toDate?.() || new Date();
      lastEl.textContent = updatedAt.toLocaleString();
    } else {
      console.log('No growthConfig, displaying defaults');
      sunEl.textContent   = '0';
      waterEl.textContent = '0';
      vitEl.textContent   = '0';
      daysEl.textContent  = '0';
      totalEl.textContent = String(21 * 24 * 60);
      lastEl.textContent  = 'Not started';
    }

    if (refreshTimer) clearInterval(refreshTimer);
    if (hasGrown && data.growthProgress < 100) {
      refreshTimer = setInterval(() => fetchAndRenderSeed(seedId), 5000);
    }

  } catch (err) {
    console.error('fetchAndRenderSeed error:', err);
    plantSummary.textContent = `Error: ${err.message}`;
    errorDiv.textContent     = `Error: ${err.message}`;
    noGrowthMessage.style.display = 'none';
    growSummary.style.display     = 'none';
    growingContainer.classList.add('no-growth');

    if (window.seedCtrl && window.originalLayers) {
      window.layers = window.originalLayers;
    }
  }

  console.log('Final window.layers:', window.layers);
  console.log(window.layers.length > 0 && Object.keys(window.layers[0].visuals || {}).length > 0 ? '✅ Layers loaded' : '⚠️ No visuals');
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

// 2) Dibuja el gradiente en un p5.Graphics usando SOLO métodos de `p`
function updateGradientBufferInst(p, pg, colors, offset = 0, frameCountOverride) {
  const steps = pg.height;
  pg.noStroke();
  pg.clear();

  // Usa el frameCount de la instancia si no se pasa override
  const fc = (frameCountOverride != null) ? frameCountOverride : p.frameCount;

  for (let i = 0; i < steps; i++) {
    const t  = i / steps;
    const tt = (t + offset + fc * 0.01) % 1;

    // Color base
    const c0 = p.color(colors[0]);
    let colr;
    if (colors.length === 3) {
      // De color0→color1 en la mitad baja, luego 1→2 en la mitad alta
      if (tt < 0.5) {
        colr = p.lerpColor(c0, p.color(colors[1]), tt * 2);
      } else {
        colr = p.lerpColor(p.color(colors[1]), p.color(colors[2]), (tt - 0.5) * 2);
      }
    } else {
      // Sólo dos colores
      colr = p.lerpColor(c0, p.color(colors[1] || "#000000"), tt);
    }

    pg.stroke(colr);
    pg.line(0, i, pg.width, i);
  }
}
