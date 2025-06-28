// ========== GLOBAL VARIABLES ========== //

let seedCtrl;
let growingCtrl;
let refreshTimer;

// Tracks whether any growth has occurred
window.hasGrown = false;


// ========= Initialize both canvases once ========= //
function initializeCanvas() {
  console.log('initializeCanvas called');
  const canvasWrapper = document.getElementById('canvas-wrapper');
  const growingWrapper = document.getElementById('growing-wrapper');
  const w = window.gridConfig?.canvasWidth || 600;
  const h = window.gridConfig?.canvasHeight || 600;
  const scaleFactor = 0.5;


  //==================== THESE CALLS DRAW BOTH CANVAS ========================///
  // ORIGINAL SEED CANVAS
  window.seedCtrl = new p5(p => {
    p.setup = () => {
      p.createCanvas(w * scaleFactor, h * scaleFactor)
       .parent(canvasWrapper);
    };
  
    p.draw = () => {
      // 0) limpiar **una vez al inicio**
      p.clear();
  
      // 1) entrar en espacio escalado
      p.push();
      p.scale(scaleFactor);
  
      // 2) dibujar la rejilla **antes** de los visuals
      const {
        rows, cols,
        canvasWidth = w,
        canvasHeight = h,
        gridColor = '#000',
        gridOpacity = 255
      } = window.gridConfig;
  
      const cellW = canvasWidth / cols;
      const cellH = canvasHeight / rows;
      p.noFill();
      p.stroke(gridColor);
      p.drawingContext.globalAlpha = gridOpacity;
      for (let c = 0; c <= cols; c++) {
        const x = c * cellW;
        p.line(x, 0, x, canvasHeight);
      }
      for (let r = 0; r <= rows; r++) {
        const y = r * cellH;
        p.line(0, y, canvasWidth, y);
      }
      p.drawingContext.globalAlpha = 1;
  
      // 3) dibujar la seed ENCIMA
      if (window.originalLayers) {
        const prev = window.layers;
        window.layers = window.originalLayers;
        drawSeed(p, window.layers);
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
    p.setup = () => {
      p.createCanvas(w * scaleFactor, h * scaleFactor)
       .parent(growingWrapper);
      p.noLoop();
    };
    p.draw = () => {
      p.push();
      p.scale(scaleFactor);
  
      if (window.hasGrown && window.currentLayers?.length) {
        const backup = window.layers;
        window.layers = window.currentLayers;
        drawSeed(p, window.layers);
        window.layers = backup;
      } else {
        p.background(0);
        p.fill(255);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(
          'No growth applied yet\nReturn to Root',
          p.width/2,
          p.height/2
        );
      }
  
      p.pop();
    };
  });
  

  return true;
}

// ========== DRAW GRID =========//
// Draws grid lines with configurable color and opacity
function drawGrid(p) {
  console.log('drawGrid');
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

// ========= Draw grid and visuals for a set of layers ========= //
function drawSeed(p, layers) {
  console.log('drawSeed called with', layers.length, 'layers');
  const { rows, cols, canvasWidth, canvasHeight } = window.gridConfig;
  const cellWidth = canvasWidth / cols;
  const cellHeight = canvasHeight / rows;


  for (const layer of layers) {
    for (const [key, visual] of Object.entries(layer.visuals || {})) {
      if (!visual || !visual.type) {
        console.log('Skipping empty cell at', key);
        continue; // skip empty or undefined visuals
      }
      const [r, c] = key.split('-').map(Number);
      const x = c * cellWidth;
      const y = r * cellHeight;

      if (visual.type === 'gradient') {
        console.log('drawSeed: gradient cell', key);
        p.noStroke();
        // call shared drawAnimatedGradient from common.js
        drawAnimatedGradient(
          p,
          { x: x, y: y },
          { x: x + cellWidth, y: y },
          { x: x + cellWidth, y: y + cellHeight },
          { x: x, y: y + cellHeight },
          visual.colors || ['#000', '#fff'],
          visual.offset || 0
        );
      }

      if (visual.type === 'shape') {
        const s = visual.shape || {};
        // Dibujamos la forma conectada con common.js
        p.push();
        // Movemos el origen al tope-izquierda de la celda
        p.translate(x, y);
        drawShape(
          p,
          cellWidth,
          cellHeight,
          s.shapeType,   // 'circle' | 'square' | 'star' | 'organic'
          s.fillColor,   // e.g. '#ff0000'
          s.strokeColor, // e.g. '#000000'
          s.size,        // 0–100
          r,
          c,
          layer.visuals
        );
        p.pop();
      }
    }
  }
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
      if (!initializeCanvas()) throw new Error('Failed to initialize canvases');
    }

    window.originalLayers = data.originalLayers || [];
    window.currentLayers  = data.layers         || [];

    noGrowthMessage.style.display        = hasGrown ? 'none' : 'block';
    growSummary.style.display            = hasGrown ? 'block' : 'none';
    growingContainer.classList.toggle('no-growth', !hasGrown);

    // draw original
    window.layers = window.originalLayers;
    if (window.seedCtrl) window.seedCtrl.redraw();

    // draw growth or placeholder
    if (hasGrown) {
      window.layers = window.currentLayers;
      if (window.growingCtrl) window.growingCtrl.redraw();
    } else {
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
      window.seedCtrl.redraw();
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
