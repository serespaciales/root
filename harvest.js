//TAKEAWAY LOGS FOR DEBUG
const ENABLE_REALTIME = true;
let __harvestUnsub = null;
let __usingPolling = false;

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

  // ¿Hay capas?
  if (window.currentLayers?.length) {
    if (window.hasGrown) {
      // === Growth real ===
      const gc = window.growthConfig || {};
      const startMs = gc.startDate ? new Date(gc.startDate).getTime() : Date.now();
      const days    = Math.max(1, gc.days || 21); // evita /0
      const now     = Date.now();
      const elapsedMs = Math.max(0, now - startMs);

      const rawT = TEST_MODE
        ? Math.min(elapsedMs / (1000 * days), 1)
        : Math.min(elapsedMs / (days * 86400000), 1);

      const t = logisticEase(rawT, 12);

      if (!hasFrozenGrowth) {
        const { sun = 0, water = 0, vitamins = 0 } = window.normGrowthConfig || {};
        window.currentGrowthConfig = {
          sun:      sun      * t,
          water:    water    * t,
          vitamins: vitamins * t
        };
        if (rawT >= 1) {
          hasFrozenGrowth = true;
          console.log('🌳 Fully grown');
        }
      }

      renderVisuals(window.currentLayers, { bloom: true });
    } else {
      // === Sin growth: render original (growth en 0) y asegúrate de NO mostrar fully-grown
      hasFrozenGrowth = false; // ← clave para no mostrar la etiqueta
      window.currentGrowthConfig = { sun: 0, water: 0, vitamins: 0 };
      renderVisuals(window.currentLayers, { bloom: false });;
    }
  }

  // Mostrar la etiqueta SOLO si hay growth y se congeló al 100%
  if (window.hasGrown && hasFrozenGrowth) {
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
  const w = window.gridConfig?.canvasWidth  || 600;
  const h = window.gridConfig?.canvasHeight || 600;

  // Reset de estado de crecimiento al iniciar (evita “fully grown” fantasma)
  hasFrozenGrowth = false;
  window.globalFrameCount = 0;

  // Definimos setup y draw en modo global p5
  setup = () => {
    window.gradientCache = {};
    canvas = createCanvas(w, h).parent(growingWrapper);
    gradientBuffer = createGraphics(w, h);
    loop();
  };

  draw = () => {
    if (!window.gridConfig) return;
    clear();
    drawGrid();

    if (window.currentLayers?.length) {
      if (window.hasGrown) {
        // === Growth real ===
        const gc = window.growthConfig || {};
        const startMs = gc.startDate ? new Date(gc.startDate).getTime() : Date.now();
        const days    = Math.max(1, gc.days || 21);
        const now     = Date.now();
        const elapsedMs = Math.max(0, now - startMs);

        const rawT = TEST_MODE
          ? Math.min(elapsedMs / (1000 * days), 1)
          : Math.min(elapsedMs / (days * 86400000), 1);

        const t = logisticEase(rawT, 12);

        if (!hasFrozenGrowth) {
          const { sun = 0, water = 0, vitamins = 0 } = window.normGrowthConfig || {};
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

        // Render con efectos de growth (bloom = true)
        renderVisuals(window.currentLayers, { bloom: true });
      } else {
        // === Sin growth: render original y NO mostrar fully-grown
        hasFrozenGrowth = false;
        window.currentGrowthConfig = { sun: 0, water: 0, vitamins: 0 };
        renderVisuals(window.currentLayers, { bloom: false });
      }
    }

    // Etiqueta solo si hay growth y ya está al 100%
    if (window.hasGrown && hasFrozenGrowth) {
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
    const docSnap = await window.seedsCol.doc(seedId).get({ source: 'server' });
    if (!docSnap.exists) throw new Error('Seed not found');

    const data = docSnap.data();

    // Canvas + capas originales
    window.gridConfig     = data.gridConfig || { rows: 2, cols: 2, canvasWidth: 400, canvasHeight: 300 };
    window.originalLayers = data.originalLayers || [];
    window.layers         = window.originalLayers;

    // 👇 clave para que el render original lo controle esta función:
    window.currentLayers  = window.originalLayers; // lo que pinta el draw()
    window.hasGrown       = false;                 // render original (sin growth)

    if (!canvas) {
      initializeCanvas(seedId);
    } else {
      resizeCanvas(window.gridConfig.canvasWidth, window.gridConfig.canvasHeight);
    }

    // Mostrar fecha de plantado
    const plantedAt = data.plantedAt?.toDate?.() || new Date();
    plantSummary.textContent = `Planted at: ${plantedAt.toLocaleString()}`;

    // Luego, el growth (si lo hay) lo mantiene fetchAndRenderGrowth + polling
    fetchAndRenderGrowth(seedId);
    subscribeToSeedRealtime(seedId);     // 🔁 tiempo real con fallback a polling
    enablePolling(seedId, 5000);         // arranca polling de inmediato; se apagará solo al llegar snapshot

    window.addEventListener('unload', () => {
      if (__harvestUnsub) { try { __harvestUnsub(); } catch {} }
      disablePolling();
    });
    
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


function getFrameIntensities() {
  if (window.currentGrowthConfig &&
      typeof window.currentGrowthConfig.sun === 'number') {
    return window.currentGrowthConfig;
  }
  const gc   = window.growthConfig || {};
  const norm = window.normGrowthConfig || {};
  const startMs = gc.startDate ? new Date(gc.startDate).getTime() : Date.now();
  const days    = Math.max(1, gc.days || 21);
  const now     = Date.now();
  const elapsed = Math.max(0, now - startMs);

  const rawT = (typeof TEST_MODE !== 'undefined' && TEST_MODE)
    ? Math.min(elapsed / (1000 * days), 1)
    : Math.min(elapsed / (days * 86400000), 1);

  const t = (typeof logisticEase === 'function') ? logisticEase(rawT, 12) : rawT;

  return {
    sun:      (norm.sun      || 0) * t,
    water:    (norm.water    || 0) * t,
    vitamins: (norm.vitamins || 0) * t
  };
}

function renderVisuals(layers = null, options = { bloom: false }) {
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
  const useBloom = !!options.bloom;

  for (const layer of target) {
    if (!layer || !layer.visuals) continue;

    for (const [cellKey, visual] of Object.entries(layer.visuals)) {
      const [r, c] = cellKey.split('-').map(Number);
      if (!Number.isInteger(r) || !Number.isInteger(c)) continue;

      push();
      translate(c * cellW, r * cellH);
      if (visual.type === 'gradient' && Array.isArray(visual.colors)) {
        // Buffer por celda (necesario para water wobble)
        const key = `r${r}c${c}`;
        let pg = cache[key];
        if (!pg) pg = cache[key] = createGraphics(cellW, cellH);
      
        // === 1) Colores base (y en GROWTH aplicar Sun/Vitamins) ===
        let cols = visual.colors.slice();
        if (useBloom) {
          const intens = (window.currentGrowthConfig || {sun:0, water:0, vitamins:0});
          const sunI = Math.max(0, Math.min(1, intens.sun      || 0));
          const vitI = Math.max(0, Math.min(1, intens.vitamins || 0));
          if (vitI > 0 && typeof applySaturationBoost === 'function') {
            cols = applySaturationBoost(cols, vitI);
          }
          if (sunI > 0 && typeof applySunBurnEffect === 'function') {
            const burnt = applySunBurnEffect(cols, sunI);
            cols = burnt.map(c => color(c).toString('#rrggbb'));
          }
        }
      
        // === 2) Scroll del gradiente SIN costura (doble stops como en Sketch) ===
        const fc = (typeof animationsPaused !== 'undefined' && animationsPaused)
          ? (typeof pausedFrameCount !== 'undefined' ? pausedFrameCount : frameCount)
          : frameCount;
        const o = (fc * 0.01 + (visual.offset || 0)) % 1;
      
        const steps = [];
        const n = Math.max(2, cols.length);
        for (let i = 0; i <= n; i++) steps.push([color(cols[i % n]), i / n / 2]);       // 0..0.5
        for (let i = 0; i <= n; i++) steps.push([color(cols[i % n]), 0.5 + i / n / 2]); // 0.5..1
      
        pg.clear();
        // Usa fillGradient sobre el CONTEXTO del buffer, no el global
        if (typeof fillGradient === 'function') {
          fillGradient(
            'linear',
            { from: [0, -cellH * o], to: [0, cellH * (2 - o)], steps },
            pg.drawingContext
          );
          pg.drawingContext.fillRect(0, 0, cellW, cellH);
        } else {
          // Fallback: si falta la lib, degrade por líneas (no tan suave)
          pg.noStroke();
          for (let y = 0; y < cellH; y++) {
            const ty  = (y / cellH + o) % 1;
            const seg = Math.min(n - 2, Math.floor(ty * (n - 1)));
            const tt  = (ty * (n - 1)) - seg;
            const cA  = color(cols[seg]);
            const cB  = color(cols[seg + 1]);
            pg.stroke(lerp(red(cA), red(cB), tt), lerp(green(cA), green(cB), tt), lerp(blue(cA), blue(cB), tt));
            pg.line(0, y, cellW, y);
          }
        }
      
      
        // === 4) Dibujar buffer en la celda ===
        image(pg, 0, 0);
      
        // === 5) Bloom opcional ===
        if (useBloom && visual.bloom && typeof applyBloomExpansion === 'function') {
          applyBloomExpansion(visual);
        }
      
      }  else if (visual.type === 'shape' && visual.shape) {
        const s = visual.shape;
      
        // tamaño: si viene 0..1, pásalo a %
        let sizePct = s.size != null ? s.size : 1;
        if (sizePct <= 1) sizePct *= 100;
      
        // props base con defaults
        const subdivisions    = Number.isInteger(s.subdivisions)    ? s.subdivisions    : 5;
        const breathPhase     = typeof s.breathPhase     === 'number' ? s.breathPhase     : 0;
        const breathAmplitude = typeof s.breathAmplitude === 'number' ? s.breathAmplitude : 0.3;
        const breathSpeed     = typeof s.breathSpeed     === 'number' ? s.breathSpeed     : 0.5;
        const rotationSpeed   = typeof s.rotationSpeed   === 'number' ? s.rotationSpeed   : 0.1;
        const spikes   = typeof s.spikes   === 'number' ? s.spikes   : 5;
        
      
        // Colores base
        let fillCol   = s.fillColor;
        let strokeCol = s.strokeColor;
      
        if (useBloom) {
          // intensidades por frame (0..1)
          const { sun = 0, water = 0, vitamins = 0 } = getFrameIntensities();
      
          // Vitamins = +saturación; Sun = “quemado” cálido
          const adjColor = (hex) => {
            if (!hex) return hex;
            let arr = [hex];
            if (vitamins > 0 && typeof applySaturationBoost === 'function') {
              arr = applySaturationBoost(arr, vitamins);
            }
            if (sun > 0 && typeof applySunBurnEffect === 'function') {
              arr = applySunBurnEffect(arr, sun);
            }
            const out = arr[0];
            return (typeof out === 'string') ? out : color(out).toString('#rrggbb');
          };
      
          fillCol   = adjColor(fillCol);
          strokeCol = adjColor(strokeCol);
      
          // Water: solo aumenta la “respiración” (sin wobble de posición)
          const waterAmpBoost = water * 0.4;      // +40% máx. sobre breath
          const vitaminScale  = 1 + vitamins * 0.2; // +20% máx. de tamaño
      
          drawShape(
            cellW, cellH,
            s.shapeType,
            fillCol,
            strokeCol,
            sizePct * vitaminScale,
            subdivisions,
            breathPhase,
            breathAmplitude + waterAmpBoost,
            breathSpeed,
            rotationSpeed,
            spikes
          );
        } else {
          // ORIGINAL (sin efectos de growth)
          drawShape(
            cellW, cellH,
            s.shapeType,
            fillCol,
            strokeCol,
            sizePct,
            subdivisions,
            breathPhase,
            breathAmplitude,
            breathSpeed,
            rotationSpeed,
            spikes
          );
        }
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

// --- Shortcut: S para guardar PNG en Harvest ---
function keyPressed() {
  // evita interferir si estás escribiendo en un input
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  const k = (typeof key === 'string') ? key.toLowerCase() : '';
  if (k === 's') {
    // intentamos obtener el seed para el nombre del archivo
    const params = new URLSearchParams(window.location.search);
    const seedParam =
      params.get('seed') ||
      (document.getElementById('seedId') && document.getElementById('seedId').value) ||
      'harvest';

    // si quisieras ocultar textos superpuestos antes de exportar, podrías
    // forzar un redraw aquí. En Harvest no dibujas cursor, así que no hace falta.
    saveCanvas(`seed_${seedParam}_harvest`, 'png');
    console.log('✅ PNG guardado desde Harvest');
    return false; // consumimos el atajo
  }
}

function enablePolling(seedId, ms = 5000) {
  if (__usingPolling) return;
  __usingPolling = true;
  if (typeof startGrowthPolling === 'function') {
    startGrowthPolling(seedId, ms);
  }
}

function disablePolling() {
  if (window._growthInterval) {
    clearInterval(window._growthInterval);
    window._growthInterval = null;
  }
  __usingPolling = false;
}
function subscribeToSeedRealtime(seedId) {
  if (!ENABLE_REALTIME || !firebase?.firestore) {
    enablePolling(seedId);
    return;
  }

  const db = firebase.firestore();
  const docRef = db.collection('seeds').doc(seedId);

  // Limpia sub anterior
  if (__harvestUnsub) { try { __harvestUnsub(); } catch {} __harvestUnsub = null; }

  __harvestUnsub = docRef.onSnapshot(async (snap) => {
    try {
      if (!snap.exists) return;

      // leer SIEMPRE del servidor para evitar caché
      const fresh = await docRef.get({ source: 'server' });
      const data  = fresh.data();

      // refrescar base
      window.gridConfig     = data.gridConfig || window.gridConfig;
      window.originalLayers = Array.isArray(data.originalLayers) ? data.originalLayers : (window.originalLayers || []);
      const currLayers      = Array.isArray(data.layers) ? data.layers : [];

      // decidir si hay growth
      const gc = data.growthConfig || null;
      const hasStart = !!(gc?.startDate?.toDate?.() && gc.startDate.toMillis() > 0);
      const hasDose  = !!(gc && ((gc.sun||0) > 0 || (gc.water||0) > 0 || (gc.vitamins||0) > 0));
      const HAS_GROWTH = hasStart && hasDose;

      if (HAS_GROWTH) {
        window.currentLayers = mergeLayers(window.originalLayers, currLayers);
        window.hasGrown = true;
        await fetchAndRenderGrowth(seedId);   // tu UI de growth
      } else {
        window.currentLayers = window.originalLayers;
        window.hasGrown = false;
      }

      if (typeof redraw === 'function') redraw();

      // si llegó snapshot, apaga polling
      disablePolling();
    } catch (err) {
      console.error('Realtime refresh error:', err);
      // si falla, nos apoyamos en polling
      enablePolling(seedId);
    }
  }, (err) => {
    console.error('onSnapshot error:', err);
    enablePolling(seedId);
  });
}
