

//=========GROWING FUNCTIONS !!!!! ===================

//RETRIEVE DATA 

/**
 * fetchAndRenderGrowth(seedId)
 * – Lee de Firestore la configuración de grid, originalLayers, currentLayers y growthConfig
 * – Convierte growthConfig.startDate (Timestamp) a JS Date
 * – Guarda todo en window.*
 * – Si ya existe el sketch de crecimiento (window.growthCtrl), fuerza un redraw()
 */
async function fetchAndRenderGrowth(seedId) {
  const db     = firebase.firestore();
  const docRef = db.collection('seeds').doc(seedId);
  const docSnap = await docRef.get();
  if (!docSnap.exists) return;
  const data = docSnap.data();

  // — Referencias DOM
  const sunEl            = document.getElementById('sun-value');
  const waterEl          = document.getElementById('water-value');
  const vitEl            = document.getElementById('vitamins-value');
  const daysEl           = document.getElementById('days-elapsed');
  const totalEl          = document.getElementById('total-days');
  const lastEl           = document.getElementById('growth-last-update');
  const progressEl       = document.getElementById('growth-progress-text');
  const growSummary      = document.getElementById('growing-summary');
  const noGrowthMessage  = document.getElementById('no-growth-message');
  const growingContainer = document.getElementById('growing-container');

  if (!sunEl || !waterEl || !vitEl || !daysEl || !totalEl
      || !lastEl || !progressEl || !growSummary
      || !noGrowthMessage || !growingContainer) {
    console.error('Missing growth UI elements');
    return;
  }

  // — Datos y capas
  window.gridConfig    = data.gridConfig;
  window.currentLayers = mergeLayers(
    window.originalLayers,          // ya cargado en fetchAndRenderSeed
    data.layers       || []
  );
  window.hasGrown      = true;

  const gc        = data.growthConfig || {};
  const plantedAt = data.plantedAt?.toDate?.() || new Date();
  const startDate = gc.startDate?.toDate?.()   || plantedAt;
  const totalDays = gc.days    || 21;
  const prevDay   = gc.lastGrowthDay || 0;

  // — Configuración “cruda”
  window.growthConfig = {
    sun:              gc.sun       || 0,
    water:            gc.water     || 0,
    vitamins:         gc.vitamins  || 0,
    days:             totalDays,
    startDate:        startDate,
    lastGrowthDay:    prevDay,
    hasFullyGrown:    gc.hasFullyGrown    || false,
    growthFinishedAt: gc.growthFinishedAt?.toDate?.() || null
  };

  // — Normalizamos a [0,1] con máximos 10
  const MAX_SUN      = 10;
  const MAX_WATER    = 10;
  const MAX_VITAMINS = 10;
  window.normGrowthConfig = {
    sun:      Math.min(1, window.growthConfig.sun      / MAX_SUN),
    water:    Math.min(1, window.growthConfig.water    / MAX_WATER),
    vitamins: Math.min(1, window.growthConfig.vitamins / MAX_VITAMINS),
  };

  // — Actualizar UI básica
  sunEl.textContent   = String(gc.sun       || 0);
  waterEl.textContent = String(gc.water     || 0);
  vitEl.textContent   = String(gc.vitamins  || 0);

  // — Cálculo de días y horas transcurridos
  const now         = new Date();
  const elapsedMs   = now.getTime() - startDate.getTime();
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  daysEl.textContent  = String(elapsedDays);
  totalEl.textContent = String(totalDays);

  // — Mostrar última actualización antes de posible sobrescritura
  const updatedAtRaw = data.updatedAt?.toDate?.() || now;
  lastEl.textContent = updatedAtRaw.toLocaleString();

  // — Calcular progreso fino en horas
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const totalHours   = totalDays * 24;
  let progress       = (elapsedHours / totalHours) * 100;
  if (progress > 100) progress = 100;
  progressEl.textContent = `${progress.toFixed(1)}%`;

  // — PASO 2: solo al cruzar un día completo, actualizar lastGrowthDay y updatedAt
  if (elapsedDays > prevDay && elapsedDays <= totalDays) {
    await docRef.update({
      'growthConfig.lastGrowthDay': elapsedDays,
      updatedAt: now
    });
    console.log(`✅ Cruzado nuevo día: ${elapsedDays}, updatedAt seteado a ${now.toLocaleString()}`);
    window.growthConfig.lastGrowthDay = elapsedDays;
    lastEl.textContent = now.toLocaleString();
  }

  // — Mostrar sección de crecimiento
  growSummary.style.display       = 'block';
  noGrowthMessage.style.display   = 'none';
  growingContainer.classList.remove('no-growth');

}


// Exportar para poder llamarla desde tu código principal:
window.fetchAndRenderGrowth = fetchAndRenderGrowth;

//=== RETRIEVE DATA 

//==== PULLING DATA 

/**
 * startGrowthPolling(seedId, intervalMs)
 * – Inicia un intervalo que cada intervalMs ms llama a fetchAndRenderGrowth(seedId)
 * – Guarda el ID del interval en window._growthInterval para poder cancelarlo
 */
function startGrowthPolling(seedId, intervalMs = 5000) {
  // Si ya había un polling activo, lo detenemos
  if (window._growthInterval) {
    clearInterval(window._growthInterval);
  }

  // Llamada inicial
  fetchAndRenderGrowth(seedId);

  // Arrancamos el intervalo
  window._growthInterval = setInterval(() => {
    fetchAndRenderGrowth(seedId);
  }, intervalMs);
}

/**
 * stopGrowthPolling()
 * – Detiene el polling de crecimiento si está activo
 */
function stopGrowthPolling() {
  if (window._growthInterval) {
    clearInterval(window._growthInterval);
    window._growthInterval = null;
  }
}

// Exponemos globalmente para poder llamar desde tu main.js
window.startGrowthPolling = startGrowthPolling;
window.stopGrowthPolling  = stopGrowthPolling;


//===PULLING DATA 

//== GRADIENT HELPER GROWING BY STEPS 

/**
 * updateGradientBufferInst
 * @param {p5} p                      - Instancia de p5
 * @param {p5.Graphics} pg            - Buffer donde pintar el gradiente
 * @param {string[]} colors           - Array de colores hex (2 o 3 elementos)
 * @param {number} [offset=0]         - Desfase inicial del gradiente (0…1)
 * @param {number} [frameCountOverride] - Si se quiere usar un frameCount distinto al de p
 */
function updateGradientBufferInst(colors, offset = 0, frame = frameCount) {
  const h = height;
  const o = (frame * 0.01 + offset) % 1;
  const n = colors.length;

  if (n < 2) return;

  const stops = [];

  // Primera mitad (0 → 0.5)
  for (let i = 0; i <= n; i++) {
    stops.push([color(colors[i % n]), i / n / 2]);
  }

  // Segunda mitad (0.5 → 1)
  for (let i = 0; i <= n; i++) {
    stops.push([color(colors[i % n]), 0.5 + i / n / 2]);
  }

  fillGradient('linear', {
    from: [0, -h * o],
    to: [0, h * (2 - o)],
    steps: stops
  }, drawingContext);
}


//== GRADIENT HELPER GROWING BY STEPS 

//== LOGIC FOR DRAWING THE SEED FOR GROW !!! ONLY USE THIS ONE!!!! =====
/**
 * Dibuja las capas de crecimiento aplicando efectos visuales
 * según la configuración de crecimiento actual.
 *
 * @param {p5} p - Instancia de p5.js (modo instancia)
 * @param {{sun:number, water:number, vitamins:number}} growthConfig - Niveles de crecimiento
 * @param {Array} layers - Capas actuales con elementos visuales por celda (r-c)
 */
// Adapt drawSeedGrowthInst to global (in growth.js, remove 'p' params and use global functions)
function drawSeedGrowthInst(growthConfig = {}, layers = null) {
  const { rows, cols, canvasWidth, canvasHeight } = window.gridConfig;
  const cellW = canvasWidth / cols;
  const cellH = canvasHeight / rows;

  const target = Array.isArray(layers) ? layers : window.currentLayers || [];
  if (!target.length) {
    console.log("⚠️ No hay capas para dibujar.");
    return;
  }

  for (const layer of target) {
    if (!layer.visuals) continue;

    for (const [cellKey, visual] of Object.entries(layer.visuals)) {
      const [r, c] = cellKey.split('-').map(Number);
      if (!Number.isInteger(r) || !Number.isInteger(c)) continue;

      translate(c * cellW, r * cellH);

      if (visual.type === 'gradient' && Array.isArray(visual.colors)) {
        let tmpColors = [...visual.colors];
      
        if (growthConfig?.sun) {
          tmpColors = applySunBurnEffect(tmpColors, growthConfig.sun);
        }
        if (growthConfig?.vitamins) {
          tmpColors = applySaturationBoost(tmpColors, growthConfig.vitamins);
        }
      
        noStroke();
      
        let o = (frameCount * 0.01 + (visual.offset || 0)) % 1;
        let n = tmpColors.length;
        let s = [];
        for (let i = 0; i <= n; i++) s.push([color(tmpColors[i % n]), i / n / 2]);
        for (let i = 0; i <= n; i++) s.push([color(tmpColors[i % n]), 0.5 + i / n / 2]);
      
        fillGradient('linear', {
          from: [0, -cellH * o],
          to: [0, cellH * (2 - o)],
          steps: s
        }, drawingContext);
      
        rect(0, 0, cellW, cellH);
      
        if (growthConfig?.water) {
          applyWaterWobble(drawingContext, growthConfig.water, frameCount); // si aplicas sobre el canvas principal
        }
      
        if (visual.bloom) {
          applyBloomExpansion(null, visual);
        }
      } else if (visual.type === 'shape' && visual.shape) {
        const s = visual.shape;
        let sizePct = s.size != null ? s.size : 1;
        if (sizePct <= 1) sizePct *= 100;

        push();
        tint(255, 255 * (s.opacity ?? 1));

        drawShape(
          cellW, cellH,
          s.shapeType || 'circle',
          s.fillColor || '#ffffff',
          s.strokeColor || '#000000',
          sizePct,
          r, c,
          layer.visuals
        );
        pop();

        if (s.extrudePct || s.subdivisions || s.tint || visual.bloom) {
          push();
          applyBloomExpansion(visual);
          pop();
        }

        if (visual.speckles?.pct || visual.blur) {
          push();
          applyMossMirage(visual, cellW, cellH);
          pop();
        }
      }

      translate(-c * cellW, -r * cellH);  // Reset translate (global)
    }
  }
}
