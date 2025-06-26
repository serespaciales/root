let seedCtrl;
let growingCtrl;
let refreshTimer;


// 1) Inicializa ambos canvases SOLO UNA VEZ
function initializeCanvas() {
  const scaleFactor = 0.5;
  const { canvasWidth = 400, canvasHeight = 300 } = window.gridConfig || {};
  const aspectRatio = canvasWidth / canvasHeight;
  const w = canvasWidth * scaleFactor;
  const h = w / aspectRatio;

  const canvasWrapper = document.getElementById('canvas-wrapper');
  const growingWrapper = document.getElementById('growing-wrapper');
  if (!canvasWrapper || !growingWrapper) {
    console.error('initializeCanvas: Missing canvas-wrapper or growing-wrapper');
    return false;
  }

  // Clean up previous canvases
  canvasWrapper.innerHTML = '';
  growingWrapper.innerHTML = '';
  if (window.seedCtrl) {
    window.seedCtrl.remove();
    window.seedCtrl = null;
  }
  if (window.growingCtrl) {
    window.growingCtrl.remove();
    window.growingCtrl = null;
  }

  // Original Canvas
  window.seedCtrl = new p5(p => {
    p.setup = () => {
      p.createCanvas(w, h).parent(canvasWrapper);
      p.noLoop();
    };
    p.draw = () => {
      if (window.originalLayers) {
        const prev = window.layers;
        window.layers = window.originalLayers;
        drawSeed(p, false);
        window.layers = prev;
      } else {
        p.background(200);
        p.textAlign(p.CENTER, p.CENTER);
        p.text('No original seed data', p.width / 2, p.height / 2);
      }
    };
  });

  // Growing Canvas
  window.growingCtrl = new p5(p => {
    p.setup = () => {
      p.createCanvas(w, h).parent(growingWrapper);
      p.noLoop();
    };
    p.draw = () => {
      if (window.currentLayers) {
        const prev = window.layers;
        window.layers = window.currentLayers;
        drawSeed(p, true);
        window.layers = prev;
      } else {
        p.background(200);
        p.textAlign(p.CENTER, p.CENTER);
        p.text('No growth data', p.width / 2, p.height / 2);
      }
    };
  });

  return true;
}
/*
 * Utility to convert raw Firestore layers into the format expected by the controllers.
 */
function parseRawLayers(rawLayers) {
  return (rawLayers || []).map(rawLayer => {
    const layer = rawLayer instanceof Map ? Object.fromEntries(rawLayer) : { ...rawLayer };
    const visualsMap = layer.visuals instanceof Map
      ? Object.fromEntries(layer.visuals)
      : layer.visuals || {};

    layer.visuals = Object.fromEntries(
      Object.entries(visualsMap).map(([cellKey, rawVisual]) => {
        const v = rawVisual instanceof Map ? Object.fromEntries(rawVisual) : { ...rawVisual };
        const g = v.gradient || {};
        return [cellKey, {
          type: v.type || layer.type || 'empty',
          colors: Array.isArray(g.colors) ? g.colors : [],
          offset: typeof g.offset === 'number' ? g.offset : 0,
          direction: typeof g.direction === 'number' ? g.direction : 0,
          scale: typeof g.scale === 'number' ? g.scale : 1,
          distortion: typeof g.distortion === 'number' ? g.distortion : 0,
          bloom: v.bloom || { sigma: 0, intensity: 0 },
          shape: {
            shapeType:   v.shape?.shapeType   || 'circle',
            fillColor:   v.shape?.fillColor   || '#ffffff',
            strokeColor: v.shape?.strokeColor || '#000000',
            size:        v.shape?.size        || 1,
            opacity:     v.shape?.opacity     || 1,
            extrudePct:  v.shape?.extrudePct  || 0,
            subdivisions: v.shape?.subdivisions|| 0,
            tint:        v.shape?.tint        || null
          },
          text:     v.text     || { extrude: 0, branches: 0, hue: 0, content: "" },
          speckles: v.speckles || { pct: 0, radius: 0 }
        }];
      })
    );

    return layer;
  });
}

/**
 * Fetches a seed from Firestore and renders both the original and grown compositions.
 */
async function fetchAndRenderSeed(seedId) {
  // DOM References
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

  // Validate DOM elements
  if (!errorDiv || !plantSummary || !growingContainer || !noGrowthMessage || !growSummary ||
      !sunEl || !waterEl || !vitEl || !daysEl || !totalEl || !lastEl) {
    console.error('fetchAndRenderSeed: Missing required UI elements');
    if (errorDiv) errorDiv.textContent = 'Error: Missing UI elements';
    return;
  }

  // Validate Firestore
  if (!window.seedsCol) {
    console.error('fetchAndRenderSeed: Firestore not initialized');
    errorDiv.textContent = 'Error: Firestore not available';
    return;
  }

  try {
    // Fetch seed document
    const docSnap = await window.seedsCol.doc(seedId).get();
    if (!docSnap.exists) throw new Error('Seed not found');
    const data = docSnap.data();

    // Determine growth state
    const hasGrown = Boolean(data.locked) || (data.growthProgress > 0);

    // Update or fallback gridConfig
    window.gridConfig = data.gridConfig || {
      rows: 2, cols: 2, canvasWidth: 400, canvasHeight: 300
    };

    // Initialize canvases/controllers if needed
    if (!window.seedCtrl || !window.growingCtrl) {
      if (!initializeCanvas()) {
        throw new Error('Failed to initialize canvases');
      }
    }

    // Load & parse original composition into window.layers, then clone
    const rawOrig = data.originalLayers || [];
    window.loadSeed({ layers: rawOrig, gridConfig: window.gridConfig });
    window.originalLayers = structuredClone(window.layers);

    // Load & parse growing composition into window.layers, then clone
    const rawGrow = data.layers || [];
    window.loadSeed({ layers: rawGrow, gridConfig: window.gridConfig });
    window.currentLayers = structuredClone(window.layers);

    // Update UI based on growth state
    noGrowthMessage.style.display        = hasGrown ? 'none' : 'block';
    growSummary.style.display            = hasGrown ? 'block' : 'none';
    growingContainer.classList.toggle('no-growth', !hasGrown);

    // === Draw ORIGINAL into the left canvas ===
    window.layers = window.originalLayers;      // point p.draw to the original set
    window.seedCtrl.redraw();

    // === Draw GROWN (or “no growth”) into the right canvas ===
    if (hasGrown) {
      window.layers = window.currentLayers;     // point p.draw to the grown set
      window.growingCtrl.redraw();
    } else {
      // fallback “no growth applied” message
      window.growingCtrl.clear();
      window.growingCtrl.background(200);
      window.growingCtrl.textAlign(
        window.growingCtrl.CENTER,
        window.growingCtrl.CENTER
      );
      window.growingCtrl.text(
        'No growth applied',
        window.growingCtrl.width  / 2,
        window.growingCtrl.height / 2
      );
    }

    // Update plant summary
    const plantedAt = data.plantedAt?.toDate?.() || new Date();
    plantSummary.textContent = `Planted at: ${plantedAt.toLocaleString()}`;

    // Update growth summary
    if (data.growthConfig) {
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
      sunEl.textContent   = '0';
      waterEl.textContent = '0';
      vitEl.textContent   = '0';
      daysEl.textContent  = '0';
      totalEl.textContent = String(21 * 24 * 60);
      lastEl.textContent  = 'Not started';
    }

    // Manage refresh timer
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
    if (window.seedCtrl) {
      window.layers = window.originalLayers;
      window.seedCtrl.redraw();
    }
  }

  console.log('Final window.layers:', window.layers);
if (window.layers.length > 0 && Object.keys(window.layers[0].visuals || {}).length > 0) {
  console.log('✅ Layers and visuals loaded correctly');
} else {
  console.warn('⚠️ No visuals to render');
}
}


function onLookup() {
  console.log('onLookup()');
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

  // Update URL
  const u = new URL(window.location);
  u.searchParams.set('seed', seedId);
  window.history.replaceState({}, '', u);

  // Clear existing timer and fetch new data
  if (refreshTimer) clearInterval(refreshTimer);
  fetchAndRenderSeed(seedId);
}

// Attach event listeners
document.addEventListener('DOMContentLoaded', () => {
  const lookupBtn = document.getElementById('lookupBtn');
  if (lookupBtn) {
    lookupBtn.addEventListener('click', onLookup);
  } else {
    console.error('lookupBtn not found');
  }

  // Check URL for seed parameter
  const urlParams = new URLSearchParams(window.location.search);
  const seedId = urlParams.get('seed');
  if (seedId && /^[A-Za-z0-9]{7}$/.test(seedId)) {
    document.getElementById('seedId').value = seedId;
    fetchAndRenderSeed(seedId);
  }
});

window.addEventListener('unload', () => {
  console.log('Cleaning up...');
  if (refreshTimer) clearInterval(refreshTimer);
  if (window.seedCtrl) {
    window.seedCtrl.remove();
    window.seedCtrl = null;
  }
  if (window.growingCtrl) {
    window.growingCtrl.remove();
    window.growingCtrl = null;
  }
});