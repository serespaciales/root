

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
  const docSnap = await docRef.get({ source: 'server' });
  if (!docSnap.exists) return;
  const data = docSnap.data();

  // 🔄 Refresca SIEMPRE base antes del merge (importantísimo)
  window.gridConfig     = data.gridConfig || window.gridConfig;
  window.originalLayers = Array.isArray(data.originalLayers)
    ? data.originalLayers
    : (window.originalLayers || []);

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

  // Gate de growth real
  const gcPre = data.growthConfig || null;
  const hasStart = !!(gcPre?.startDate?.toDate?.() && gcPre.startDate.toMillis() > 0);
  const hasDoses = !!(gcPre && ((gcPre.sun||0) > 0 || (gcPre.water||0) > 0 || (gcPre.vitamins||0) > 0));
  const HAS_GROWTH = hasStart && hasDoses;

  // === Si NO hay growth, mostrar ORIGINAL y salir temprano ===
  if (!HAS_GROWTH) {
    window.hasGrown = false;

    // Mostrar solo original (fallback a layers si faltara)
    window.currentLayers = (window.originalLayers && window.originalLayers.length)
      ? window.originalLayers
      : (data.layers || []);

    // Actualizar UI "no growth"
    growSummary.style.display     = 'none';
    noGrowthMessage.style.display = 'block';
    growingContainer.classList.add('no-growth');

    // Valores visibles en 0 para evitar confusión
    sunEl.textContent   = '0';
    waterEl.textContent = '0';
    vitEl.textContent   = '0';
    daysEl.textContent  = '0';
    totalEl.textContent = String(gcPre?.days || 21);
    const updatedAtRaw  = data.updatedAt?.toDate?.() || new Date();
    lastEl.textContent  = updatedAtRaw.toLocaleString();
    progressEl.textContent = '0.0%';

    return; // 👈 importantísimo: no sigas con lógica de growth
  }

  // === SÍ hay growth: fusionar capas y configurar estado ===
  window.currentLayers = mergeLayers(
    window.originalLayers,
    Array.isArray(data.layers) ? data.layers : []
  );
  window.hasGrown = true;

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
  const elapsedMs   = Math.max(0, now.getTime() - startDate.getTime());
  const elapsedDays = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
  daysEl.textContent  = String(elapsedDays);
  totalEl.textContent = String(totalDays);

  // — Mostrar última actualización antes de posible sobrescritura
  const updatedAtRaw = data.updatedAt?.toDate?.() || now;
  lastEl.textContent = updatedAtRaw.toLocaleString();

  // — Calcular progreso fino en horas (con guard por si totalDays=0)
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const totalHours   = Math.max(1, totalDays * 24); // evita división por 0
  let progress       = (elapsedHours / totalHours) * 100;
  if (progress > 100) progress = 100;
  if (progress < 0)   progress = 0;
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


