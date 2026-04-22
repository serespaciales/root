//-----------------------------------R
                                      //O
                                      //O
                                      ///T---------------------------------------------------------
// 
// 
// 
// 
// 
// 
// 
// 
// //TAKE IT OUT/ COMMENT IF YOU WANT TO SEE CONSOLE LOGS 

const DEBUG = true;
if (!DEBUG) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
//TAKEAWAY LOGS FOR DEBUG

// 
// 
// 
// 
// 
// 
// 
// global variables

const minGap = 10;
const handleRadius = 8;
const wrapper = document.getElementById('canvas-wrapper');
const fullscreenBtn = document.querySelector('.fullscreen-btn');
const palette = document.getElementById('palette');

window.layers = window.layers || [];
window.activeLayer = window.activeLayer || null;
window.activeTool = window.activeTool || "gradient";


let pausedFrameCount = 0; // GUARDA EL ULTIMO VALUE DEL FRAME PARA STOP ANIMATION
let pausedMillis = 0;
let sliders = {};
let canvas;
let editingGrid = false;
let draggingHandle = null;
let draggingLine = null;
let draggingType = null;
let colStart, rowStart, colEnd, rowEnd;
let textStartCell;
let startX, startY;
let startOffsetX, startOffsetY;
let startDragOffsetX = 0;
let startDragOffsetY = 0;
let dragOffsetX = 0, dragOffsetY = 0;
let selectedTool = null;
let activeTool = "gradient";
let isFullscreen = false;
let lastCellKey = null;
let lastShapeCells = [];
let gradientColors = ["#ffffff", "#888888", "#000000"];
let globalOffset = 0;
let columnPositions = [];
let rowPositions = [];
let gridPoints = [];
let useUnifiedOffset = false;
let typedText = "";
let gridColor = "#000000";
let gridOpacity = 100;
let loadedImage = null;
let topZIndex = 1000;
let gradientBuffer;
let uploadedImage = null;
let uploadedImageReady = true;
let justSelectedImage = false;
let activeImageEdit = null;
let imageScaleSlider = null;
let activePopups = [];
let textCursorVisible = false;
let lastCursorBlink = 0;
const cursorBlinkSpeed = 500;
let textCursor = 0;
let textSelectionStart = -1;
let isSelectingText = false;
let compositionText = "";
let compositionActive = false;
let mouseDownOnText = false;
let clickOffsetIndex = null;
let currentTextarea = null;
let activeTextEdit = null;
let imageStartCell = null;
let saveTimeout = null;
let suppressCursor = false;
let hasUnsavedChanges = false; 


let textSettings = {
  font: "sans-serif",
  size: 20,
  color: "black",
  lineHeight: 24,
  letterSpacing: 0
};


// --- SEED LOGIC ---



// THIS IS THE LOGIC FOR SAVING ON FIRESTORE FROM THE EDIT TOOL 
function markChanges() {
  hasUnsavedChanges = true;
}

async function saveToFirestore() {
  if (MODE === 'view') return;

  try {
    const now = firebase.firestore.Timestamp.now();

    const sanitizedLayers = window.layers.map((layer, index) => ({
      id: layer.id || generateLayerID(),
      name: layer.name || `Layer ${index + 1}`,
      type: layer.type || 'gradient',
      color: typeof layer.color === 'string' ? layer.color : randomColorFromNeonPalette(),
      visible: typeof layer.visible === 'boolean' ? layer.visible : true,
      visuals: Object.keys(layer.visuals || {}).reduce((acc, key) => {
        const visual = { ...layer.visuals[key] };
        delete visual.pg;

        if (visual.colors) {
          visual.colors = visual.colors.map(c => typeof c === 'string' ? c : c.toString().replace(/ /g, ''));
        }

        if (visual.text && visual.text.color) {
          visual.text.color = typeof visual.text.color === 'string' ? visual.text.color : visual.text.color.toString().replace(/ /g, '');
        }

        if (visual.shape) {
          visual.shape = {
            shapeType: visual.shape.shapeType || 'circle',
            fillColor: typeof visual.shape.fillColor === 'string' ? visual.shape.fillColor : '#ffffff',
            strokeColor: typeof visual.shape.strokeColor === 'string' ? visual.shape.strokeColor : '#000000',
            size: visual.shape.size || 1,
            opacity: visual.shape.opacity || 1,
            extrudePct: visual.shape.extrudePct || 0,
            subdivisions: visual.shape.subdivisions || 0,
            tint: visual.shape.tint || null,
            breathAmplitude: visual.shape.breathAmplitude || 0,
            breathSpeed:     visual.shape.breathSpeed     || 0,
            breathPhase:     visual.shape.breathPhase     || 0,
            rings:           visual.shape.rings || 1,
            rotationSpeed:   visual.shape.rotationSpeed || 0,   
            spikes:          visual.shape.spikes || 5            
          };
        }

        acc[key] = visual;
        return acc;
      }, {})
    }));

    const gridConfig = {
      rows: parseInt(sliders.rows?.value?.() || 2, 10),
      cols: parseInt(sliders.columns?.value?.() || 2, 10),
      canvasWidth: width || 800,
      canvasHeight: height || 600,
      gridColor,
      gridOpacity,
      columnPositions: columnPositions.slice(), // Save exact positions
      rowPositions: rowPositions.slice()
      
    };

    const docRef = seedsCol.doc(seed);
const doc = await docRef.get();
// ...ya tienes: const docRef = seedsCol.doc(seed); const doc = await docRef.get();
const alreadyExists = doc.exists;
const existingData = alreadyExists ? (doc.data() || {}) : {};

// Detecta si YA empezó el growth (o está bloqueado)
const hasStartedGrowth =
  !!existingData.locked ||
  !!existingData.isBlockedForGrowth ||
  !!existingData.growthConfig?.startDate ||
  ((existingData.growthConfig?.sun || 0) +
   (existingData.growthConfig?.water || 0) +
   (existingData.growthConfig?.vitamins || 0) > 0);

// Mientras NO haya growth: el “original” sigue a tus ediciones
const nextOriginalLayers = hasStartedGrowth
  ? (existingData.originalLayers || sanitizedLayers)
  : sanitizedLayers;

const data = {
  seed: seed,
  name: seed,
  gridConfig,
  layers: sanitizedLayers,
  originalLayers: nextOriginalLayers,     // ⬅️ AQUÍ EL CAMBIO CLAVE
  plantedAt: alreadyExists ? (existingData.plantedAt || now) : now,
  updatedAt: now,
  lastUpdate: now,
  growthProgress: alreadyExists ? (existingData.growthProgress || 0) : 0,
  locked: alreadyExists ? (existingData.locked ?? false) : false
};

// Si ya existía growthConfig, la preservas (tu lógica actual)
if (alreadyExists && existingData.growthConfig) {
  const gc = existingData.growthConfig;
  data.growthConfig = {
    sun:              gc.sun ?? 0,
    water:            gc.water ?? 0,
    vitamins:         gc.vitamins ?? 0,
    days:             gc.days ?? 21,
    startDate:        gc.startDate || null,
    lastGrowthDay:    gc.lastGrowthDay ?? 0,
    hasFullyGrown:    gc.hasFullyGrown || false,
    growthFinishedAt: gc.growthFinishedAt || null
  };
}

console.log('Saving data to Firestore:', JSON.stringify(data, null, 2));
await docRef.set(data, { merge: true });

try {
  // 1) Asegura que el canvas está actualizado (por si hay draw diferido)
  if (typeof computeGridPoints === 'function') computeGridPoints();
  if (typeof drawSeed === 'function') drawSeed();
  if (typeof redraw === 'function') redraw();

  // 2) Tomar el canvas actual y reducirlo (máx 600 px de ancho)
  const srcCanvas =
    (window.canvas && window.canvas.elt) ||
    document.querySelector('#canvas-wrapper canvas') ||
    document.querySelector('canvas');

  if (srcCanvas) {
    const maxW = 600;
    const ratio = srcCanvas.width / srcCanvas.height;
    const dstW = Math.min(maxW, srcCanvas.width);
    const dstH = Math.round(dstW / ratio);

    const off = document.createElement('canvas');
    off.width = dstW; off.height = dstH;
    const ctx = off.getContext('2d');
    ctx.drawImage(srcCanvas, 0, 0, dstW, dstH);

    // 3) A blob (JPEG liviano) y subir a Storage
    const blob = await new Promise(res => off.toBlob(b => res(b), 'image/jpeg', 0.85));
    const storage = firebase.storage(); // compat
    const ref = storage.ref().child(`thumbs/${seed}.jpg`);
    await ref.put(blob);
    const url = await ref.getDownloadURL();

    // 4) Guardar la URL del thumbnail en el doc
    await docRef.set({
      thumbUrl: url,
      updatedAt: firebase.firestore.Timestamp.now()
    }, { merge: true });

    console.log('✅ Thumbnail guardado:', url);
  } else {
    console.warn('No encontré canvas para generar thumbnail.');
  }
} catch (e) {
  console.warn('No se pudo generar/subir thumbnail:', e);
}

console.log(`✅ Auto-saved seed ${seed} to Firestore`);
hasUnsavedChanges = false;

  } catch (err) {
    console.error('Error saving to Firestore:', err);
    console.warn(`❌ Failed to auto-save: ${err.message}`);
  }
}


function debounceSaveToFirestore() {
  clearTimeout(saveTimeout);
  markChanges();
  saveTimeout = setTimeout(saveToFirestore, 1000);
}

setInterval(() => {
  if (hasUnsavedChanges) {
    saveToFirestore();
  }
}, 5000);

function generateSeed() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let seed = '';
  for (let i = 0; i < 7; i++) {
    seed += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return seed;
}

function getOrCreateSeed() {
  const params = new URLSearchParams(window.location.search);
  let s = params.get('seed');
  if (!s || s.length !== 7) {
    s = generateSeed();
    params.set('seed', s);
    history.replaceState(null, '', '?' + params.toString());
  }
  return s;
}

const seed = getOrCreateSeed();

//SEED BAR FOR THE INDEX UI 

// ── Seed search UI ──
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('seed-search-input');
  if (!input) return;
  // Inicializa con el seed actual
  input.value = seed;
  // Al pulsar Enter recarga con ?seed=…
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const s = input.value.trim();
      if (/^[A-Za-z0-9]{7}$/.test(s)) {
        const url = new URL(window.location);
        url.searchParams.set('seed', s);
        window.location.href = url.toString();
      } else {
        // destello de error
        input.style.borderColor = 'red';
        setTimeout(() => input.style.borderColor = '#000', 300);
      }
    }
  });
});

//SEED BAR FOR THE INDEX UI 


function saveGridConfig() {
  markChanges();
  debounceSaveToFirestore();
}

function saveVisuals() {
  markChanges();
  debounceSaveToFirestore();
}



/*seed saving*----- SAVING POSTER */



// === PALETA NEÓN SOLO TRES COLORES ===
const neonPalette = [
 /* [0, 0, 255],    // AZUL
  [0, 255, 0],    // VERDE
  [255, 255, 0],    // AMARILLO
  [255, 82, 0],    // NARANJA
  [0, 69, 255],    // AZUL REY
  [255, 0, 255]     // FUCSIA
  */
  [255, 255, 255], //blanco
  [55, 55, 55], //gris
  //[0, 0, 0], // negro
  [31, 96, 237], //azul de la marca
  //[20, 194, 0], //verde
  [116, 82, 91], //cafe
  [116, 91, 216], //morado
  [202, 109, 216], //rosado
 //[255, 205, 91], //amarillo
  [208, 252, 118], // amarillo de la marca
  [255,82,91] // rojo candente


 
];

function randomColorFromNeonPalette() {
  const arr = neonPalette[Math.floor(Math.random() * neonPalette.length)];
  return `rgb(${arr[0]}, ${arr[1]}, ${arr[2]})`;
}
function setup() {
  // ⚡ Detenemos el loop hasta tener los datos
  noLoop();

  // Reset dragging state to avoid stale values
  draggingHandle = null;
  draggingLine = null;
  draggingType = null;
  startDragOffsetX = 0;
  startDragOffsetY = 0;
  editingGrid = false; // Ensure grid editing is off initially

  // 1. Inicializamos los sliders e input de seed (antes del fetch)
  if (MODE === 'edit') {
    const seedInput = select('input[name="seed"]');
    if (seedInput) seedInput.value(seed);

    const btn = document.getElementById('seed-btn');
    if (btn) btn.addEventListener('click', () =>
      window.open(`index.html?seed=`, '_blank', 'noopener')
    );

    sliders.rows = select('input[name="rows"]') || { value: () => 6 };
    sliders.columns = select('input[name="columns"]') || { value: () => 6 };
    sliders.sun = select('input[name="sun"]') || { value: () => 0 };
    sliders.water = select('input[name="water"]') || { value: () => 0 };
    sliders.vitamins = select('input[name="vitamins"]') || { value: () => 0 };
    sliders.days = select('input[name="days"]') || { value: () => 1 };

    // Aseguramos .value() correcto
    ['rows', 'columns', 'sun', 'water', 'vitamins', 'days'].forEach(k => {
      if (typeof sliders[k].value !== 'function')
        sliders[k].value = () => parseInt(sliders[k].elt?.value || 6, 10);
    });
  }

  // 2. Función de capa por defecto (solo para new seed)
  const initializeDefaultLayer = (r = 2, c = 2) => {
    const L = {
      id: generateLayerID(),
      name: "gradient 1",
      type: "gradient",
      color: randomColorFromNeonPalette(),
      visible: true,
      visuals: {}
    };
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        L.visuals[`${i}-${j}`] = {
          type: "gradient",
          colors: [
            randomColorFromNeonPalette(),
            randomColorFromNeonPalette(),
            randomColorFromNeonPalette()
          ],
          offset: random(0, 1)
        };
      }
    }
    return L;
  };

  // 3. Fetch inicial a Firestore (tamaño + contenido)
  const container = select('#canvas-wrapper').elt;
  seedsCol.doc(seed).get().then(doc => {
    let rows = 6, cols = 6;
    let w = container.clientWidth;
    let h = container.clientHeight;

    if (doc.exists) {
      const data = doc.data();
      const seenSeeds = JSON.parse(localStorage.getItem('seen_root_popups') || '[]');

    if (!seenSeeds.includes(seed)) {
      // Show popup (this will happen in setupInfoPopup(), but we ensure it's displayed)
      // Mark as seen
      seenSeeds.push(seed);
      localStorage.setItem('seen_root_popups', JSON.stringify(seenSeeds));
    }

      // 3.1 Si guardaste tamaño, lo aplicas
      if (data.gridConfig?.canvasWidth && data.gridConfig?.canvasHeight) {
        w = data.gridConfig.canvasWidth;
        h = data.gridConfig.canvasHeight;
        container.style.width = `${w}px`;
        container.style.height = `${h}px`;
      }

      // 3.2 Ahora creas el canvas con el tamaño correcto
      canvas = createCanvas(w, h).parent('canvas-wrapper');
      canvas.elt.setAttribute('tabindex', '0');
      canvas.style('display', 'block');
      canvas.style('width', '100%');
      canvas.style('height', '100%');

      gradientBuffer = createGraphics(width, height);

      // 3.3 Leemos filas/cols y posiciones guardadas
      if (data.gridConfig) {
        rows = data.gridConfig.rows || rows;
        cols = data.gridConfig.cols || cols;
        columnPositions = data.gridConfig.columnPositions
          || Array.from({ length: cols + 1 }, (_, i) => (i * width) / cols);
        rowPositions = data.gridConfig.rowPositions
          || Array.from({ length: rows + 1 }, (_, i) => (i * height) / rows);
  
        // —— AÑADIDO: reaplicar color y opacidad guardados —— 
        if (data.gridConfig.gridColor) {
          gridColor = data.gridConfig.gridColor;
          const ci = document.getElementById("gridColor");
          if (ci) ci.value = gridColor;
        }
        if (typeof data.gridConfig.gridOpacity === "number") {
          gridOpacity = data.gridConfig.gridOpacity;
          const oi = document.getElementById("gridOpacity");
          if (oi) oi.value = gridOpacity;
        }
        // —— FIN de reaplicar color/opacidad —— 
  
        // validaciones de minGap y bounds…
        for (let i = 1; i < columnPositions.length; i++) {
          columnPositions[i] = constrain(columnPositions[i], columnPositions[i-1] + minGap, width);
        }
        for (let i = 1; i < rowPositions.length; i++) {
          rowPositions[i] = constrain(rowPositions[i], rowPositions[i-1] + minGap, height);
        }
      }
      // —— FIN: carga de filas/cols y posiciones guardadas —— 
  
      computeGridPoints();
  
      // —— REAPLICAMOS EL REDRAW para ver el grid con color/opacidad restaurados —— 
      redraw();

      // 🔥 Actualiza sliders
      if (MODE === 'edit') {
        sliders.rows.value(rows);
        sliders.columns.value(cols);
      }

      // 3.4 Cargamos layers guardadas o creamos nueva
      if (Array.isArray(data.layers)) {
        window.layers = data.layers;
      } else {
        window.layers = [initializeDefaultLayer(rows, cols)];
        seedsCol.doc(seed).set({
          seedCode: seed,
          layers: window.layers,
          originalLayers: window.layers,
          gridConfig: {
            rows,
            cols,
            canvasWidth: w,
            canvasHeight: h,
            columnPositions: columnPositions.slice(), // Save initial positions
            rowPositions: rowPositions.slice()
          },
          plantedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      // 3.5 Lock si corresponde
 // 3.5 Lock si corresponde
if (data.locked) {
  // bandera global
  window.editLocked = true;

  // === WHITELIST de controles permitidos ===
  const WHITELIST = new Set(['clone-seed', 'harvestgo-btn', 'gardengo-btn', 'seed-search-input']);

  // 1) Desactivar interacción con el canvas (así no se dibuja con click/drag)
  if (window.canvas?.elt) {
    window.canvas.elt.style.pointerEvents = 'none';
  }

  // 2) Deshabilitar TODO menos lo permitido
  document.querySelectorAll('.tool-btn, button, a, input, select, textarea').forEach(el => {
    const id = el.id || '';
    if (!WHITELIST.has(id)) {
      el.disabled = true;
      el.classList.add('disabled');
      el.setAttribute('aria-disabled', 'true');
      el.setAttribute('tabindex', '-1');
      el.style.pointerEvents = 'none';
    }
  });

  // 3) Semilla: que se pueda copiar con el cursor
  const seedInput = document.getElementById('seed-search-input');
  if (seedInput) {
    // muestra la seed actual y evita edición accidental, pero deja seleccionar y copiar
    seedInput.value = (typeof seed === 'string' ? seed : seedInput.value || '');
    seedInput.readOnly = true;
    seedInput.style.userSelect = 'text';
    seedInput.style.pointerEvents = 'auto'; // aseguramos que el cursor pueda seleccionar
    seedInput.addEventListener('focus', () => seedInput.select());
  }

  // 4) Guardia de puntero (captura) — bloquea clicks fuera de la whitelist
  if (!window.__lockPointerGuardInstalled) {
    window.__lockPointerGuardInstalled = true;
    const blockIfNotWhitelisted = (e) => {
      if (!window.editLocked) return;
      const ctrl = e.target.closest?.('.tool-btn, button, a, input, select, textarea');
      const id = ctrl?.id || '';
      if (!WHITELIST.has(id)) {
        e.stopPropagation();
        e.preventDefault();
        return false;
      }
    };
    ['click','mousedown','mouseup','touchstart','touchend','pointerdown','pointerup']
      .forEach(ev => document.addEventListener(ev, blockIfNotWhitelisted, true));
  }

  // 5) Guardia de teclado — permite Tab, Escape y copiar (Ctrl/Cmd+C) sobre seed input
  if (!window.__lockKeyGuardInstalled) {
    window.__lockKeyGuardInstalled = true;
    window.addEventListener('keydown', (e) => {
      if (!window.editLocked) return;

      const active = document.activeElement;
      const activeId = active?.id || '';
      const isSeedInput = activeId === 'seed-search-input';

      // Permitir navegación básica
      const SAFE_KEYS = new Set(['Escape', 'Tab']);
      if (SAFE_KEYS.has(e.key)) return;

      // Permitir copiar si el foco está en el seed input
      const isCopy = (e.key.toLowerCase() === 'c') && (e.ctrlKey || e.metaKey);
      if (isSeedInput && isCopy) return;

      // Bloquear todo lo demás (incluye atajos de herramientas, dibujo, etc.)
      e.stopPropagation();
      e.preventDefault();
      return false;
    }, true);
  }

  // 6) Banner “bloqueada” (solo una vez)
  if (!document.getElementById('growth-blocker-msg')) {
    const msg = document.createElement('div');
    msg.id = 'growth-blocker-msg';
    msg.textContent = 'is blocked for growth';
    msg.style = 'position:fixed;top:10px;right:10px;padding:8px 12px;background:#d0fc76;color:#333;border-radius:4px;z-index:2000;';
    document.body.appendChild(msg);
  }
}



    } else {
      // 🌱 Nueva semilla
      canvas = createCanvas(container.clientWidth, container.clientHeight)
        .parent('canvas-wrapper');
      canvas.elt.setAttribute('tabindex', '0');
      canvas.style('display', 'block');
      canvas.style('width', '100%');
      canvas.style('height', '100%');
      gradientBuffer = createGraphics(width, height);

      rows = Math.floor(random(2, 9));
      cols = Math.floor(random(2, 9));
      if (MODE === 'edit') {
        sliders.rows.value(rows);
        sliders.columns.value(cols);
      }

      columnPositions = Array.from({ length: cols + 1 }, (_, i) => (i * width) / cols);
      rowPositions = Array.from({ length: rows + 1 }, (_, i) => (i * height) / rows);
      computeGridPoints();

      window.layers = [initializeDefaultLayer(rows, cols)];
      seedsCol.doc(seed).set({
        seedCode: seed,
        layers: window.layers,
        originalLayers: window.layers,
        gridConfig: {
          rows,
          cols,
          canvasWidth: width,
          canvasHeight: height,
          columnPositions: columnPositions.slice(), // Save initial positions
          rowPositions: rowPositions.slice()
        },
        plantedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // 4. Una vez creado canvas y cargados layers
    window.activeLayer = window.layers[0] || null;
    if (MODE === 'edit') renderLayersUI();
    redraw();
    loop(); // ¡arrancamos el draw()!
  }).catch(err => {
    console.error('Error loading seed:', err);
    // Fallback
    canvas = createCanvas(container.clientWidth, container.clientHeight)
      .parent('canvas-wrapper');
    gradientBuffer = createGraphics(width, height);
    columnPositions = Array.from({ length: 3 }, (_, i) => (i * width) / 2);
    rowPositions = Array.from({ length: 3 }, (_, i) => (i * height) / 2);
    computeGridPoints();
    window.layers = [initializeDefaultLayer()];
    window.activeLayer = window.layers[0];
    if (MODE === 'edit') renderLayersUI();
    redraw();
    loop();
  });

  // 5. Inicializaciones UI que no dependen de load
  setupGradientColorInputs();
  setupInfoPopup();
  setupImageUpload();
  setupSliderFeedback();
  setupToolLogic();
  setupUnifyButton();
  setupGridEditingLogic(); // Ensure this sets up grid tool toggle
  setupResizerHandle();
  setupPauseButton();
  setupGridColorControls();
  setupGrowthIntegration(seed)

  activeBorderColor = color(0, 255, 0);
}

function setupResizerHandle() {
  if (MODE !== 'edit') {
    console.log('this is an editing function');
    return;
  }

  const wrapper = document.getElementById('canvas-wrapper');

  const fullscreenBtn = document.createElement('div');
  fullscreenBtn.innerHTML = `<img src="tool-icons/R_fullscreen-off.svg" alt="" />`;
  fullscreenBtn.title = "Fullscreen";
  fullscreenBtn.classList.add('tool-btn', 'fullscreen-btn');
  wrapper.appendChild(fullscreenBtn);

  const resizer = document.createElement('div');
  resizer.classList.add('tool-btn', 'resizer', 'top-right');
  resizer.innerHTML = `<img src="tool-icons/R_resizer-off.svg" alt="" />`;
  wrapper.appendChild(resizer);

  // ✅ Get manual input UI
  const manualResizeControls = document.getElementById('manual-resize-controls');
  const widthInput = document.getElementById('canvas-width-input');
  const heightInput = document.getElementById('canvas-height-input');
  const applyBtn = document.getElementById('apply-canvas-size');

  let isFullscreen = false;

  function enterFullscreen() {
    isFullscreen = true;
    document.body.classList.add('hide-ui');
    wrapper.style.position = 'fixed';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.width = '100vw';
    wrapper.style.height = '100vh';
    resizeCanvas(window.innerWidth, window.innerHeight);
    updateGridPositions();
    fullscreenBtn.innerHTML = `<img src="tool-icons/R_fullscreen-on.svg" alt="" />`;
  }

  function exitFullscreen() {
    isFullscreen = false;
    document.body.classList.remove('hide-ui');
    wrapper.style.position = 'absolute';
    wrapper.style.top = '5px';
    wrapper.style.left = '5px';
    wrapper.style.width = 'calc(100vw - 10px)';
    wrapper.style.height = 'calc(100vh - 10px)';
    resizeCanvas(wrapper.offsetWidth, wrapper.offsetHeight);
    updateGridPositions();
    fullscreenBtn.innerHTML = `<img src="tool-icons/R_fullscreen-off.svg" alt="" />`;
  }

  fullscreenBtn.addEventListener('click', () => {
    isFullscreen ? exitFullscreen() : enterFullscreen();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreen) {
      exitFullscreen();
    }
  });

  // 🖱️ Drag-resize
  resizer.addEventListener('mousedown', e => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = wrapper.offsetWidth;
    const startH = wrapper.offsetHeight;

    function resize(e) {
      let newW = startW + (e.clientX - startX);
      let newH = startH + (e.clientY - startY);
      newW = Math.min(newW, window.innerWidth - wrapper.offsetLeft - 5);
      newH = Math.min(newH, window.innerHeight - wrapper.offsetTop - 5);
      newW = Math.max(200, newW);
      newH = Math.max(200, newH);
      wrapper.style.width = `${newW}px`;
      wrapper.style.height = `${newH}px`;
      resizeCanvas(newW, newH);
      updateGridPositions();
    }

    function stopResize() {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResize);
      debounceSaveToFirestore(); // Save when resizing stops
    }

    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResize);
  });

  // ✅ Show manual resize inputs on click
  resizer.addEventListener('click', () => {
    if (!manualResizeControls || !widthInput || !heightInput) return;
    const visible = manualResizeControls.style.display === 'flex';
    manualResizeControls.style.display = visible ? 'none' : 'flex';

    if (!visible) {
      widthInput.value = wrapper.offsetWidth;
      heightInput.value = wrapper.offsetHeight;
    }
  });

  // ✅ Apply manual width/height
  applyBtn?.addEventListener('click', () => {
    const newW = parseInt(widthInput.value);
    const newH = parseInt(heightInput.value);

    if (!isNaN(newW) && !isNaN(newH) && newW >= 200 && newH >= 200) {
      wrapper.style.width = `${newW}px`;
      wrapper.style.height = `${newH}px`;
      resizeCanvas(newW, newH);
      updateGridPositions();
      debounceSaveToFirestore();
    }
  });
}


/**
 * Carga en el sketch el estado guardado de un seed:
 * - gridConfig: filas, columnas, margen…
 * - visuals: capa activa y sus visuals por celda
 * - layers (si usas múltiples)
 */
function loadSeed(data) {
  // 1) Grid
  if (data.gridConfig) {
    sliders.rows.value(data.gridConfig.rows);
    sliders.columns.value(data.gridConfig.cols);
    updateGridPositions();
  }

  // 2) Layers
  if (data.layers) {
    window.layers = data.layers;
    window.activeLayer = window.layers[0] || null;
  }

  // 3) Update UI and canvas
  if (typeof renderLayersUI === 'function') renderLayersUI();
  if (typeof redraw === 'function') redraw();

  console.log(`✅ Seed ${seed} loaded from layers`);
}

// ------------------------------------------------------------------
// Draw the full “seed” composition on demand
// ------------------------------------------------------------------
function drawSeed() {
  clear();

  if (!window.layers || !Array.isArray(window.layers)) {
    console.warn('⚠️ drawSeed: No layers found');
    return;
  }

  // Draw all visible layers in order (bottom to top)
  window.layers.forEach((layer, index) => {
    if (layer.visible) {
      console.log(`Rendering layer ${index}: ${layer.name} (visible: ${layer.visible})`);
      window.activeLayer = layer; // Temporarily set for drawVisuals
      drawVisuals();
    }
  });

  // Draw the grid once, after all layers
  drawGrid();

  // Restore active layer for editing
  window.activeLayer = window.layers.find(l => l.id === window.activeLayer?.id) || window.layers[0] || null;

  if (editingGrid) drawGridHandles();

  console.log(`✅ drawSeed() executed with ${window.layers.reduce((acc, layer) => acc + Object.keys(layer.visuals || {}).length, 0)} elements across ${window.layers.length} layers`);
}
// --- p5.js draw en bucle ---
function draw() {
  drawSeed();
  // Feedback de cursor 
  if (!suppressCursor && (editingGrid || (activeTool && activeTool !== 'export'))) {
    stroke(60, 60, 60);         // ahora: gris oscuro (60,60,60)
    strokeWeight(1);            // 1px de ancho
    fill(237, 237, 237);       // blanco muy claro
    ellipse(mouseX, mouseY, 17, 17);
  }
  
  // Rectángulo verde al dibujar texto
  if (activeTool === "text" && textStartCell) {
    const col1 = textStartCell.col;
    const row1 = textStartCell.row;
    const col2 = getColFromX(mouseX);
    const row2 = getRowFromY(mouseY);

    if (col2 !== null && row2 !== null) {
      const colStart = min(col1, col2);
      const rowStart = min(row1, row2);
      const colEnd = max(col1, col2);
      const rowEnd = max(row1, row2);

      const p00 = gridPoints[rowStart][colStart];
      const p10 = gridPoints[rowStart][colEnd + 1];
      const p01 = gridPoints[rowEnd + 1][colStart];

      const x = p00.x;
      const y = p00.y;
      const w = p10.x - p00.x;
      const h = p01.y - p00.y;

      noFill();
      stroke('red');
      strokeWeight(3);
      rect(x, y, w, h);
    }
  }

  if (editingGrid) {
    drawGridHandles();
  }
}

// --- Dibujar el grid (líneas) ---
function drawGrid() {
  if (MODE === 'view') return;
  if (!Array.isArray(window.layers)) return;

  noFill();
  const c = color(gridColor);
  c.setAlpha(gridOpacity);
  stroke(c);
  strokeWeight(1);

  // Detect mouse hover for feedback
  let hoverCol = null, hoverRow = null;
  if (editingGrid && !draggingHandle && !draggingLine) {
    for (let c = 1; c < columnPositions.length - 1; c++) {
      if (abs(mouseX - columnPositions[c]) < handleRadius) {
        hoverCol = c;
        break;
      }
    }
    for (let r = 1; r < rowPositions.length - 1; r++) {
      if (abs(mouseY - rowPositions[r]) < handleRadius) {
        hoverRow = r;
        break;
      }
    }
  }

  // Draw horizontal lines (rows)
  for (let r = 0; r < rowPositions.length; r++) {
    if (r === draggingLine && draggingType === 'row') {
      stroke(0, 255, 0); // Highlight dragged row
      strokeWeight(3);
    } else if (r === hoverRow) {
      stroke(100, 100, 255); // Highlight hovered row
      strokeWeight(2);
    } else {
      stroke(c);
      strokeWeight(1);
    }
    beginShape();
    for (let c = 0; c < columnPositions.length; c++) {
      vertex(columnPositions[c], rowPositions[r]);
    }
    endShape();
  }

  // Draw vertical lines (columns)
for (let i = 0; i < columnPositions.length; i++) {
  if (i === draggingLine && draggingType === 'column') {
    stroke(0, 255, 0); // Highlight dragged column
    strokeWeight(3);
  } else if (i === hoverCol) {
    stroke(100, 100, 255); // Highlight hovered column
    strokeWeight(2);
  } else {
    stroke(c); // ✅ Este c viene del color con alpha definido arriba
    strokeWeight(1);
  }

  beginShape();
  for (let r = 0; r < rowPositions.length; r++) {
    vertex(columnPositions[i], rowPositions[r]);
  }
  endShape();
}

}

function drawVisuals() {
  const activeLayer = window.activeLayer;
  if (!activeLayer) return;

  const { rows, cols, cellW, cellH } = getGridMetrics();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r}-${c}`;
      let visual = activeLayer.visuals[key];
      if (!visual) {
        activeLayer.visuals[key] = { type: "empty" };
        visual = activeLayer.visuals[key];
      }

      const A = gridPoints[r][c];
      const B = gridPoints[r][c + 1];
      const C = gridPoints[r + 1][c + 1];
      const D = gridPoints[r + 1][c];
      const x = A.x;
      const y = A.y;
      const w = B.x - A.x;
      const h = D.y - A.y;

      // Inside drawVisuals() function, replace the gradient drawing block with this optimized version
// that uses normalized offset for consistent animation speed across different cell heights.

// Inside drawVisuals() function, replace the gradient drawing block with this updated version
// that adds a cycle back to the first color for seamless looping without jumps.

// Inside drawVisuals() function, replace the gradient drawing block with this updated version
// that uses a fixed 2x cycle length to eliminate clamping and ensure seamless looping without jumps.

if (visual.type === 'gradient' && visual.colors?.length >= 2) {
  push(); translate(x, y); noStroke();
  const fc = animationsPaused ? pausedFrameCount : frameCount;
  let o = (fc * 0.01 + (useUnifiedOffset ? globalOffset : visual.offset || 0)) % 1;
  let c = visual.colors, n = c.length;
  let s = [];
  for (let i = 0; i <= n; i++) s.push([color(c[i % n]), i / n / 2]); // ciclo 1
  for (let i = 0; i <= n; i++) s.push([color(c[i % n]), 0.5 + i / n / 2]); // ciclo 2
  fillGradient('linear', { from: [0, -h * o], to: [0, h * (2 - o)], steps: s }, drawingContext);
  drawingContext.fillRect(0, 0, w, h);
  pop();
} 
      
      else if (visual.type === "text" && visual.text) {
        const wCells = visual.w || 1;
        const hCells = visual.h || 1;
        const p10 = gridPoints[r][c + wCells];
        const p01 = gridPoints[r + hCells][c];
        if (p10 && p01) {
          const x0 = A.x;
          const y0 = A.y;
          const w0 = p10.x - x0;
          const h0 = p01.y - y0;
          const textKey = key;

          if (!(activeTextEdit === textKey && currentTextarea)) {
            const font = visual.text.font || "sans-serif";
            const size = Math.max(Number(visual.text.size) || 20, 4);
            const color = visual.text.color || "#000000";
            const leadingPx = Math.max(Number(visual.text.lineHeight) || size, 4);
            let content = visual.text.content || "";

            if (compositionActive && activeTextEdit === textKey) {
              content = content.substring(0, textCursor) + compositionText + content.substring(textCursor);
            }

            push();
            noStroke();
            textFont(font);
            textSize(size);
            textAlign(LEFT, TOP);
            textLeading(leadingPx);

            drawingContext.save();
            drawingContext.beginPath();
            drawingContext.rect(x0, y0, w0, h0);
            drawingContext.clip();

            const ctx = drawingContext;
            const paddingX = cellW * 0.05;
            const paddingY = cellH * 0.05;
            const usableWidth = Math.max(w0 - 2 * paddingX, 1);
            const usableHeight = Math.max(h0 - 2 * paddingY, 1);
            const lineHeightPx = leadingPx;
            const maxLines = Math.max(Math.floor(usableHeight / lineHeightPx), 1);

            ctx.font = `${size}px ${font}`;
            ctx.textBaseline = "top";
            ctx.textAlign = "left";

            const wrappedLines = wrapTextInBox(ctx, content, usableWidth, maxLines, lineHeightPx, true);
            paintWrappedText(ctx, x0, y0, usableWidth, h0, wrappedLines, paddingX, paddingY, lineHeightPx, `${size}px ${font}`, color);

            visual._wrappedLines = wrappedLines;
            visual._paddingX = paddingX;
            visual._paddingY = paddingY;
            visual._lineHeightPx = lineHeightPx;
            visual._fontSize = size;

            drawingContext.restore();
            pop();

            if (activeTextEdit === textKey) {
              if (textSelectionStart >= 0 && textSelectionStart !== textCursor) {
                const start = Math.min(textSelectionStart, textCursor);
                const end = Math.max(textSelectionStart, textCursor);
                const wrapped = visual._wrappedLines || [];

                fill(30, 120, 255, 100);
                noStroke();

                let charCount = 0;
                let selY = y0 + paddingY;
                for (let i = 0; i < wrapped.length; i++) {
                  const line = wrapped[i];
                  const lineStart = charCount;
                  const lineEnd = charCount + line.length;
                  if (end > lineStart && start < lineEnd) {
                    const selStart = Math.max(start - lineStart, 0);
                    const selEnd = Math.min(end - lineStart, line.length);
                    const xStart = x0 + paddingX + textWidth(line.substring(0, selStart));
                    const selWidth = textWidth(line.substring(selStart, selEnd));
                    if (selY + lineHeightPx > y0 && selY < y0 + h0) {
                      rect(xStart, selY, selWidth, lineHeightPx);
                    }
                  }
                  charCount += line.length;
                  selY += lineHeightPx;
                }
              }

              const cycle = millis() % (cursorBlinkSpeed * 2);
              const cursorVisible = cycle < cursorBlinkSpeed && !compositionActive;
              if (cursorVisible && textCursor >= 0) {
                let remChars = textCursor;
                let curY = y0 + paddingY;
                let curX = x0 + paddingX;
                let found = false;
                for (const line of visual._wrappedLines || []) {
                  if (remChars <= line.length) {
                    curX += textWidth(line.substring(0, remChars));
                    found = true;
                    break;
                  }
                  remChars -= line.length;
                  curY += lineHeightPx;
                }
                if (found && curY + lineHeightPx > y0 && curY < y0 + h0) {
                  fill(color);
                  noStroke();
                  rect(curX, curY, 2, lineHeightPx);
                }
              }

              if (compositionActive && compositionText) {
                let remChars = textCursor;
                let imeY = y0 + paddingY;
                let imeX = x0 + paddingX;
                let found = false;
                for (const line of visual._wrappedLines || []) {
                  if (remChars <= line.length) {
                    imeX += textWidth(line.substring(0, remChars));
                    found = true;
                    break;
                  }
                  remChars -= line.length;
                  imeY += lineHeightPx;
                }
                if (found) {
                  const compWidth = textWidth(compositionText);
                  stroke(color);
                  strokeWeight(1);
                  line(imeX, imeY + lineHeightPx - 2, imeX + compWidth, imeY + lineHeightPx - 2);
                }
              }
            }

            if (activeTextEdit === textKey) {
              push();
              noFill();
              stroke("limegreen");
              strokeWeight(3);
              rect(x0, y0, w0, h0);
              pop();
            }
          }
        }
      }
      else if (visual.type === "image" && typeof visual.img === 'string') {
        const wCells = visual.w || 1;
        const hCells = visual.h || 1;
        const p10 = gridPoints[r][c + wCells];
        const p01 = gridPoints[r + hCells][c];
        if (p10 && p01) {
          const x0 = A.x;
          const y0 = A.y;
          const w0 = p10.x - x0;
          const h0 = p01.y - y0;
          loadImage(visual.img, (img) => {
            push();
            translate(x0, y0);
            scale(visual.scale || 1);
            imageMode(CORNER);
            image(img, 0, 0, w0, h0);
            if (activeImageEdit === key) {
              noFill();
              stroke("limegreen");
              strokeWeight(2);
              rect(0, 0, w0, h0);
            }
            pop();
          });
          visual.w = wCells;
          visual.h = hCells;
        }
      }
      if (visual.type === "shape" && visual.shape) {
        const wCells = visual.w || 1;
        const hCells = visual.h || 1;
        const p10 = gridPoints[r][c + wCells];
        const p01 = gridPoints[r + hCells][c];
        if (p10 && p01) {
          const x0 = A.x;
          const y0 = A.y;
          const w = p10.x - x0;
          const h = p01.y - y0;
          const s = visual.shape;
          push();
          translate(x0, y0);
          drawShape(w, h, s.shapeType, s.fillColor, s.strokeColor, s.size, s.subdivisions, s.breathPhase, s.breathAmplitude || 0.3, s.breathSpeed || 0.5, s.rotationSpeed || 0.1, s.spikes || 5);
          pop();
          visual.w = wCells;
          visual.h = hCells;
        }
      }
        
      
    }
  }
}


function isMouseOverUI() {
  return isClickOnUI();
}

function isClickOnUI() {
  const el = document.elementFromPoint(mouseX, mouseY);
  return el && el.closest('#palette, #popup, .tool-options, .choices__inner');
}  

// ─────────────────────────────────────────────────────────────────────────────
// mousePressed: Manejo de clics para texto, imágenes y edición de grid
// ─────────────────────────────────────────────────────────────────────────────
function mousePressed() {
  if (!editingGrid || isMouseOverUI()) {
    console.log("🛑 Clic sobre UI o no en modo editingGrid");
    return;
  }

  
  // Prioritize handles (junctures)
  for (let r = 0; r < rowPositions.length; r++) {
    for (let c = 0; c < columnPositions.length; c++) {
      const p = gridPoints[r][c];
      if (dist(mouseX, mouseY, p.x, p.y) < handleRadius) {
        draggingHandle = { r, c };
        draggingType = 'both';
        startDragOffsetX = mouseX - p.x;
        startDragOffsetY = mouseY - p.y;
        console.log(`Dragging handle at row ${r}, col ${c}`);
        return;
      }
    }
  }

  // Check vertical lines (columns), skip edges
  for (let c = 1; c < columnPositions.length - 1; c++) {
    if (abs(mouseX - columnPositions[c]) < handleRadius && mouseY > 0 && mouseY < height) {
      draggingLine = c;
      draggingType = 'column';
      startDragOffsetX = mouseX - columnPositions[c];
      console.log(`Dragging column ${c}`);
      return;
    }
  }

  // Check horizontal lines (rows), skip edges
  for (let r = 1; r < rowPositions.length - 1; r++) {
    if (abs(mouseY - rowPositions[r]) < handleRadius && mouseX > 0 && mouseX < width) {
      draggingLine = r;
      draggingType = 'row';
      startDragOffsetY = mouseY - rowPositions[r];
      console.log(`Dragging row ${r}`);
      return;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// mouseDragged: Manejo de arrastre para texto, dibujo normal y edición de grid
// ─────────────────────────────────────────────────────────────────────────────
function mouseDragged(event) {
  const el = document.elementFromPoint(event.clientX, event.clientY);
  if (
    el &&
    el.closest('#palette, #palette-sidebar-wrapper, .popup, .tool-options, .choices__inner')
  ) {
    return;
  }




  // 1) Texto: selección interna mientras editamos texto
  if (
    !editingGrid &&
    activeTool === "text" &&
    mouseDownOnText &&
    activeTextEdit
  ) {
    const [row, col] = activeTextEdit.split("-").map(Number);
    const key = `${row}-${col}`;
    const visual = window.activeLayer.visuals[key];
    if (!visual || visual.type !== "text") return;

    const A       = gridPoints[row][col];
    const size    = Number(visual.text.size)       || 20;
    const leading = Number(visual.text.lineHeight) || 0.2;
    const content = visual.text.content;
    const x       = A.x;
    const y       = A.y;
    const w       = gridPoints[row][col + visual.w].x - x;

    // 1.a) Reconstruir líneas envueltas (word-wrap)
    let wrapped = [];
    let rem = content;
    push();
    textFont(visual.text.font);
    textSize(size);
    textLeading(size * leading);
    textWrap(CHAR);
    while (rem.length > 0) {
      let fit = "";
      let p   = 0;
      while (p < rem.length) {
        const test = rem.substring(0, p + 1);
        if (textWidth(test) <= w) {
          fit = test;
          p++;
        } else break;
      }
      if (fit === "" && rem.length > 0) {
        fit = rem.charAt(0);
        p = 1;
      }
      wrapped.push(fit);
      rem = rem.substring(p);
    }
    pop();

    // 1.b) Determinar línea bajo mouseY
    const relY = mouseY - y;
    let lineIdx = Math.floor(relY / (size * leading));
    if (lineIdx < 0) lineIdx = 0;
    if (lineIdx >= wrapped.length) lineIdx = wrapped.length - 1;

    // 1.c) Hallar charInLine según mouseX
    const lineText = wrapped[lineIdx];
    let relX = mouseX - x;
    if (relX < 0) relX = 0;
    if (relX > textWidth(lineText)) relX = textWidth(lineText);

    let charInLine = 0;
    for (; charInLine < lineText.length; charInLine++) {
      const wChar = textWidth(lineText.substring(0, charInLine + 1));
      if (wChar >= relX) break;
    }
    if (charInLine > lineText.length) charInLine = lineText.length;

    // 1.d) Convertir (lineIdx, charInLine) a índice absoluto
    let absIdx = 0;
    for (let i = 0; i < lineIdx; i++) {
      absIdx += wrapped[i].length;
    }
    absIdx += charInLine;

    // 1.e) Actualizar textCursor
    textCursor = absIdx;
    textCursorVisible = true;
    lastCursorBlink = millis();
    return false;
  }

  if (isSelectingText) {
    // Update textCursor based on mouse position
    // (Reuse the cursor positioning logic)
    textCursor = calculateCursorPosition(mouseX, mouseY);
    redraw();
  }

  // 2) Si no estamos editando texto y la herramienta no es texto, dibujar normal
  if (!editingGrid && activeTool !== "text") {
    drawOnCellUnderMouse();
    return;
  }
  if (draggingHandle) {
    const { r, c } = draggingHandle;
    // Constrain x and y positions
    const newX = constrain(
      mouseX - startDragOffsetX,
      c > 0 ? columnPositions[c - 1] + minGap : 0,
      c < columnPositions.length - 1 ? columnPositions[c + 1] - minGap : width
    );
    const newY = constrain(
      mouseY - startDragOffsetY,
      r > 0 ? rowPositions[r - 1] + minGap : 0,
      r < rowPositions.length - 1 ? rowPositions[r + 1] - minGap : height
    );
    columnPositions[c] = newX;
    rowPositions[r] = newY;
    computeGridPoints();
    redraw();
    return;
  }

  if (draggingLine !== null) {
    if (draggingType === 'column') {
      const newX = constrain(
        mouseX - startDragOffsetX,
        draggingLine > 0 ? columnPositions[draggingLine - 1] + minGap : 0,
        draggingLine < columnPositions.length - 1 ? columnPositions[draggingLine + 1] - minGap : width
      );
      columnPositions[draggingLine] = newX;
    } else if (draggingType === 'row') {
      const newY = constrain(
        mouseY - startDragOffsetY,
        draggingLine > 0 ? rowPositions[draggingLine - 1] + minGap : 0,
        draggingLine < rowPositions.length - 1 ? rowPositions[draggingLine + 1] - minGap : height
      );
      rowPositions[draggingLine] = newY;
    }
    computeGridPoints();
    redraw();
    return;
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// mouseReleased: Manejo de soltar para texto, imágenes y limpieza general
// ─────────────────────────────────────────────────────────────────────────────
function mouseReleased() {
  if (isMouseOverUI()) {
    console.log("🛑 Mouse release sobre UI, cancelando flujo");
    imageStartCell = null;
    textStartCell = null;
    return;
  }

  console.log("mouseReleased ejecutado");
  console.log("🔍 activeTool:", activeTool);
  console.log("🔍 imageStartCell:", imageStartCell);
  console.log("🔍 textStartCell:", textStartCell);

  if (activeTool === "image" && keyIsDown(SHIFT)) {
    return;
  }

  draggingHandle = null;
  draggingLine = null;
  draggingType = null;
  lastCellKey = null;
  markChanges();
  debounceSaveToFirestore();
  redraw();

  saveVisuals();
  saveGridConfig();
  updateActiveImagesPanel();

  if (justSelectedImage) {
    justSelectedImage = false;
    return;
  }

  const { cellW, cellH } = getGridMetrics();

  if (activeTool === "text" && textStartCell) {
    console.log("  → Entré en mouseReleased para herramienta text");
    const col2 = getColFromX(mouseX);
    const row2 = getRowFromY(mouseY);
    console.log("  → col2, row2:", col2, row2);

    if (
      col2 === null || row2 === null ||
      !gridPoints[row2] || !gridPoints[row2][col2]
    ) {
      textStartCell = null;
      return;
    }

    const col1 = textStartCell.col;
    const row1 = textStartCell.row;
    const maxCol = columnPositions.length - 2;
    const maxRow = rowPositions.length - 2;
    const colStart = constrain(Math.min(col1, col2), 0, maxCol);
    const rowStart = constrain(Math.min(row1, row2), 0, maxRow);
    const colEnd = constrain(Math.max(col1, col2), 0, maxCol);
    const rowEnd = constrain(Math.max(row1, row2), 0, maxRow);
    console.log("  → área celdas:", rowStart, colStart, "a", rowEnd, colEnd);

    const A = gridPoints[rowStart][colStart];
    const P10 = gridPoints[rowStart][colEnd + 1];
    const P01 = gridPoints[rowEnd + 1][colStart];
    if (!A || !P10 || !P01) {
      textStartCell = null;
      return;
    }

    const widthPx = P10.x - A.x;
    const heightPx = P01.y - A.y;
    console.log("  → dimensiones px:", widthPx, heightPx);
    if (widthPx < 10 || heightPx < 10) {
      textStartCell = null;
      return;
    }

    const key = `${rowStart}-${colStart}`;
    const visuals = window.activeLayer.visuals;

    if (visuals[key] && visuals[key].type === "text") {
      const visual = visuals[key];
      activeTextEdit = key;
      mouseDownOnText = false;

      const w = visual._widthPx;
      const h = visual._heightPx;

      startTextEditing(key, visual._x0, visual._y0, w, h, visual);
      textStartCell = null;
      return;
    }

    visuals[key] = {
      type: "text",
      w: colEnd - colStart + 1,
      h: rowEnd - rowStart + 1,
      text: {
        content: "type",
        font: textSettings.font,
        size: textSettings.size,
        color: textSettings.color,
        lineHeight: textSettings.lineHeight,
        kerning: textSettings.letterSpacing,
        align: textSettings.align || "left"
      },
      _x0: A.x,
      _y0: A.y,
      _widthPx: widthPx,
      _heightPx: heightPx,
      _lineHeightPx: cellH * (textSettings.lineHeight || 1.2)
    };

    const visual = visuals[key];
    visual._x0 = A.x;
    visual._y0 = A.y;
    visual._widthPx = widthPx;
    visual._heightPx = heightPx;
    visual._paddingX = cellW * 0.05;
    visual._paddingY = cellH * 0.05;
    visual._lineHeightPx = cellH * visual.text.lineHeight;
    visual._maxLines = Math.floor(
      (heightPx - 2 * visual._paddingY) / visual._lineHeightPx
    );

    {
      const ctx = drawingContext;
      ctx.font = `${visual.text.size}px ${visual.text.font}`;
      visual._wrappedLines = wrapTextInBox(
        ctx,
        visual.text.content,
        visual._widthPx - 2 * visual._paddingX,
        visual._maxLines,
        visual._lineHeightPx,
        true
      );
    }

    activeTextEdit = key;
    mouseDownOnText = false;
    textStartCell = null;

    startTextEditing(key, A.x, A.y, widthPx, heightPx, visual);
    isSelectingText = false;
    saveVisuals(); // Trigger Firestore save
    return;
  }

  if (activeTool === "image" && imageStartCell && uploadedImageReady) {
    const col2 = getColFromX(mouseX);
    const row2 = getRowFromY(mouseY);

    if (col2 === null || row2 === null) {
      imageStartCell = null;
      return;
    }

    const col1 = imageStartCell.col;
    const row1 = imageStartCell.row;
    const colStart = min(col1, col2);
    // ... (rest of image logic remains unchanged)
    saveVisuals(); // Trigger Firestore save after image placement
  }
}
/**
 * Serializes visuals (turning any p5.Image into a data-URL)
 * and writes them to localStorage under `modulariem-<seed>`.
 */
/**
 * Saves layers and grid config to Firestore
 */
/**
 * Saves layers and grid config to Firestore, cleaning unsupported objects
 */
/**
 * Saves layers and grid config to Firestore, cleaning unsupported objects and handling undefined
 */

/**
 * Cleans a visual object by removing unsupported fields and handling undefined
 * @param {Object} visual - The visual object to clean
 * @returns {Object} - A cleaned visual object
 */
function cleanVisual(visual) {
  const cleanVisual = {};
  if (!visual) return cleanVisual;

  // Set type if undefined
  cleanVisual.type = visual.type || "empty";

  // Handle specific visual types
  switch (cleanVisual.type) {
    case "gradient":
      cleanVisual.colors = visual.colors || ["#ffffff", "#888888", "#000000"];
      cleanVisual.offset = visual.offset !== undefined ? visual.offset : 0;
      break;
    case "text":
      cleanVisual.w = visual.w || 1;
      cleanVisual.h = visual.h || 1;
      cleanVisual.text = {
        content: visual.text?.content || "type",
        font: visual.text?.font || "sans-serif",
        size: visual.text?.size || 20,
        color: visual.text?.color || "#000000",
        lineHeight: visual.text?.lineHeight || 24,
        letterSpacing: visual.text?.letterSpacing || 0,
        align: visual.text?.align || "left"
      };
      break;
    case "image":
      cleanVisual.w = visual.w || 1;
      cleanVisual.h = visual.h || 1;
      cleanVisual.img = typeof visual.img === 'string' ? visual.img : undefined;
      cleanVisual.scale = visual.scale || 1;
      cleanVisual.offsetX = visual.offsetX || 0;
      cleanVisual.offsetY = visual.offsetY || 0;
      break;
    case "shape":
      cleanVisual.w = visual.w || 1;
      cleanVisual.h = visual.h || 1;
      cleanVisual.shape = {
        shapeType: visual.shape?.shapeType || "circle",
        fillColor: visual.shape?.fillColor || "#ff0000",
        strokeColor: visual.shape?.strokeColor || "#000000",
        size: visual.shape?.size || 20,
        rotation: visual.shape?.rotation || 0
      };
      break;
  }

  // Remove unsupported or temporary fields
  if (cleanVisual.pg) delete cleanVisual.pg;
  if (cleanVisual._wrappedLines) delete cleanVisual._wrappedLines;
  if (cleanVisual._paddingX) delete cleanVisual._paddingX;
  if (cleanVisual._paddingY) delete cleanVisual._paddingY;
  if (cleanVisual._lineHeightPx) delete cleanVisual._lineHeightPx;
  if (cleanVisual._fontSize) delete cleanVisual._fontSize;
  if (cleanVisual._x0) delete cleanVisual._x0;
  if (cleanVisual._y0) delete cleanVisual._y0;
  if (cleanVisual._widthPx) delete cleanVisual._widthPx;
  if (cleanVisual._heightPx) delete cleanVisual._heightPx;

  return cleanVisual;
}

/**
 * Cleans a visual object by removing unsupported fields
 * @param {Object} visual - The visual object to clean
 * @returns {Object} - A cleaned visual object
 */
function cleanVisual(visual) {
  const cleanVisual = { ...visual };
  // Remove p5.Graphics (pg) and p5.Image (img as p5.Image) objects
  if (cleanVisual.pg) delete cleanVisual.pg;
  if (cleanVisual.img && !(typeof cleanVisual.img === 'string')) {
    console.warn(`Image at ${visual} is a p5.Image, not saved. Use a URL instead.`);
    delete cleanVisual.img;
  }
  // Remove temporary rendering data
  if (cleanVisual._wrappedLines) delete cleanVisual._wrappedLines;
  if (cleanVisual._paddingX) delete cleanVisual._paddingX;
  if (cleanVisual._paddingY) delete cleanVisual._paddingY;
  if (cleanVisual._lineHeightPx) delete cleanVisual._lineHeightPx;
  if (cleanVisual._fontSize) delete cleanVisual._fontSize;
  if (cleanVisual._x0) delete cleanVisual._x0;
  if (cleanVisual._y0) delete cleanVisual._y0;
  if (cleanVisual._widthPx) delete cleanVisual._widthPx;
  if (cleanVisual._heightPx) delete cleanVisual._heightPx;
  return cleanVisual;
}


// --- Dibujar en la celda bajo el ratón ---
// ——————— Helpers to hit-test a convex quad ———————

// returns true if point P(px,py) is inside triangle ABC
function _pointInTriangle(px, py, A, B, C) {
  // barycentric technique
  const v0x = C.x - A.x, v0y = C.y - A.y;
  const v1x = B.x - A.x, v1y = B.y - A.y;
  const v2x = px   - A.x, v2y = py   - A.y;
  const dot00 = v0x*v0x + v0y*v0y;
  const dot01 = v0x*v1x + v0y*v1y;
  const dot02 = v0x*v2x + v0y*v2y;
  const dot11 = v1x*v1x + v1y*v1y;
  const dot12 = v1x*v2x + v1y*v2y;
  const invDen = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = ( dot11 * dot02 - dot01 * dot12 ) * invDen;
  const v = ( dot00 * dot12 - dot01 * dot02 ) * invDen;
  return u >= 0 && v >= 0 && u + v <= 1;
}

// returns true if P(px,py) is inside the quad p00→p10→p11→p01
function _pointInQuad(px, py, p00, p10, p11, p01) {
  return _pointInTriangle(px, py, p00, p10, p11)
      || _pointInTriangle(px, py, p00, p11, p01);
}


// ——————— The fixed drawOnCellUnderMouse() ———————

function drawOnCellUnderMouse() {
  if (MODE === 'view') return;
  if (!window.activeLayer) return;
  const visuals = window.activeLayer.visuals;

  const rows = rowPositions.length - 1;
  const cols = columnPositions.length - 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x1 = columnPositions[c];
      const y1 = rowPositions[r];
      const x2 = columnPositions[c + 1];
      const y2 = rowPositions[r + 1];

      if (mouseX > x1 && mouseX < x2 && mouseY > y1 && mouseY < y2) {
        const key = `${r}-${c}`;
        const visuals = window.activeLayer.visuals;

        if (lastCellKey !== key || activeTool === "erase") {
          if (activeTool === "gradient") {
            // Usa los inputs de colores para el gradiente
            const color1 = document.getElementById("gradient-color-1").value;
            const color2 = document.getElementById("gradient-color-2").value;
            const color3 = document.getElementById("gradient-color-3").value;
            visuals[key] = {
              type: "gradient",
              colors: [color1, color2, color3],
              offset: random(0, 1000)
            };
            markChanges();
            saveVisuals();
            debounceSaveToFirestore();

          } else if (activeTool === "texture") {
            // Usa los selects y ranges de texture
            visuals[key] = {
              type: "texture",
              texture: {
                type: document.getElementById("texture-type").value,
                density: parseInt(document.getElementById("texture-density").value)
              }
            };
            markChanges();
            saveVisuals();
            debounceSaveToFirestore();

          } else if (activeTool === "shape") {
            const shapeType = document.getElementById('shape-type')?.value || 'circle';
            const fillColor = document.getElementById('shape-fill-color')?.value || '#ff0000'; // Rojo por defecto
            const strokeColor = document.getElementById('shape-stroke-color')?.value || '#ffffff'; // Blanco por defecto
            const size = parseFloat(document.getElementById('shape-size')?.value) || 50;
            const breathAmplitude = parseFloat(document.getElementById('breath-amplitude').value) || 0;
            const breathSpeed     = parseFloat(document.getElementById('breath-speed').value)     || 0.5;
            const rotationSpeed   = parseFloat(document.getElementById('rotation-speed')?.value)  || 0.1;
            const subdivisions = parseInt(document.getElementById('shape-rings').value, 10) || 1;
            const breathPhase = random(0, TWO_PI)  
            const rotSpeed = parseFloat(document.getElementById('shape-rot-speed')?.value ?? '0') || 0;
            const spikes   = parseInt(document.getElementById('shape-spikes')?.value ?? '5', 10) || 5;

            visuals[key] = {
              type: "shape",
              shape: {
                shapeType,
                fillColor,
                strokeColor,
                size,
                breathPhase,
                breathAmplitude,
                breathSpeed,
                rotationSpeed,
                subdivisions,
                rotationSpeed: rotSpeed, 
                spikes 
              },
              w: 1,
              h: 1
            };
            lastShapeCells.push(key);
            console.log(`Added animated shape at ${key}:`, visuals[key]);
            saveVisuals();
            debounceSaveToFirestore();
            redraw();

          } else if (activeTool === "text") {
            visuals[key] = {
              type: "text",
              x: colStart,
              y: rowStart,
              w: colEnd - colStart + 1,
              h: rowEnd - rowStart + 1,
              text: {
                content: "",
                font: textSettings.font,
                size: textSettings.size,
                color: textSettings.color,
                lineHeight: textSettings.lineHeight,
                kerning: textSettings.letterSpacing
              }
            };
            markChanges();
            saveVisuals();
            debounceSaveToFirestore();
            

          } else if (activeTool === "image" && loadedImage) {
            // Toma la escala desde el slider de imagen
            const scale = parseFloat(document.getElementById("scale-slider").value) || 1;
            visuals[key] = {
              type: "image",
              img: loadedImage,
              x: c,
              y: r,
              w: 1, // ajusta si manejas múltiples celdas
              h: 1,
              scale: scale,
              offsetX: 0,
              offsetY: 0
            };
            markChanges();
            saveVisuals();
            debounceSaveToFirestore();

          } else if (activeTool === "erase") {
            delete visuals[key];
            markChanges();
            saveVisuals();
            debounceSaveToFirestore();
          }

          lastCellKey = key;
        }

        return;
      }
    }
  }
}


// --- Obtener métricas del grid ---
// 1) Métricas: ancho/alto de celda descontando márgenes
function getGridMetrics() {
  let rows = 2, cols = 2, margin = 10;
  if (MODE !== 'view' && sliders.rows && sliders.columns) {
    rows = parseInt(sliders.rows.value(), 10) || 2;
    cols = parseInt(sliders.columns.value(), 10) || 2;
  } else if (window.layers[0]?.gridConfig) {
    rows = window.layers[0].gridConfig.rows || 2;
    cols = window.layers[0].gridConfig.cols || 2;
  }
  const cellW = (width - margin * (cols + 1)) / cols;
  const cellH = (height - margin * (rows + 1)) / rows;
  return { rows, cols, margin, cellW, cellH };
}
// 2) Recalcula columnPositions / rowPositions  

function updateGridPositions() {
  const rows = sliders.rows?.value?.() || 2;
  const cols = sliders.columns?.value?.() || 2;

  // If positions exist (e.g., loaded from Firestore), scale on resize
  if (columnPositions.length === cols + 1 && rowPositions.length === rows + 1) {
    const oldW = columnPositions[columnPositions.length - 1] || width;
    const oldH = rowPositions[rowPositions.length - 1] || height;
    for (let i = 0; i < columnPositions.length; i++) {
      columnPositions[i] = (columnPositions[i] / oldW) * width;
    }
    for (let i = 0; i < rowPositions.length; i++) {
      rowPositions[i] = (rowPositions[i] / oldH) * height;
    }
  } else {
    // Initialize even distribution
    columnPositions = Array.from({ length: cols + 1 }, (_, i) => (i * width) / cols);
    rowPositions = Array.from({ length: rows + 1 }, (_, i) => (i * height) / rows);
  }

  computeGridPoints();
  markChanges();
  debounceSaveToFirestore();
}


function computeGridPoints() {
  gridPoints = [];
  for (let r = 0; r < rowPositions.length; r++) {
    gridPoints[r] = [];
    for (let c = 0; c < columnPositions.length; c++) {
      gridPoints[r][c] = { x: columnPositions[c], y: rowPositions[r] };
    }
  }
}


// --- Dibujar handles del grid ---
function drawGridHandles() {
  if (!editingGrid) return;
  for (let r = 0; r < rowPositions.length; r++) {
    for (let c = 0; c < columnPositions.length; c++) {
      const p = gridPoints[r][c];
      const isDragging = draggingHandle && draggingHandle.r === r && draggingHandle.c === c;
      const isHovering = !draggingHandle && !draggingLine && dist(mouseX, mouseY, p.x, p.y) < handleRadius;
      fill(isDragging ? color(0, 255, 0) : isHovering ? color(100, 100, 255) : 255);
      stroke(0);
      strokeWeight(1);
      ellipse(p.x, p.y, handleRadius * 2);
    }
  }
}



// --- Configuración de Grid Editing ---
function setupGridEditingLogic() {
  if (MODE !== 'edit') {
    console.log('this is is an editing function');
    return;
  }
  document.getElementById('editGridButton').addEventListener('click', function() {
    editingGrid = !editingGrid;
    this.innerText = editingGrid ? "edit grid: ON" : "edit grid: OFF";
  });
  document.getElementById('gridColor').addEventListener('input', function() {
    gridColor = this.value;
  });
  document.getElementById('gridOpacity').addEventListener('input', function() {
    gridOpacity = map(this.value, 0, 100,0, 255);
  });
  sliders.rows.input   (updateGridPositions);
  sliders.columns.input(updateGridPositions);
}
function drawTexture(w,h,settings) {
  if (MODE === 'view') return;
  const { type, density } = settings;
  const count = density*10;
  noFill(); stroke(0,30);
  if (type==='pixel'){
    for (let i=0;i<count;i++){
      circle(random(w), random(h),1.5);
    }
  } else if (type==='dither'){
    for (let y=0;y<h;y+=4){
      for (let x=0;x<w;x+=4){
        if ((x+y)%(density+1)===0) point(x,y);
      }
    }
  } else if (type==='noise'){
    for (let i=0;i<count;i++) point(random(w), random(h));
  } else if (type==='distort'){
    for (let i=0;i<count;i++){
      const x1=random(w), y1=random(h);
      line(x1,y1, x1+sin(frameCount*0.1+i)*5, y1+cos(frameCount*0.1+i)*5);
    }
  } else if (type==='line'){
    for (let i=0;i<count;i++) line(0, random(h), w, random(h));
  }
  
  ['shape-vertices', 'shape-fill-color', 'shape-stroke-color', 'shape-size'].forEach(id => {
    const inp = document.getElementById(id);
    if (inp) inp.addEventListener('input', updateLastShapeSettingsLive);
  });
}



function updateLastShapeSettingsLive() {
  const visuals = window.activeLayer.visuals; // <--- ¡esta línea es CLAVE!

  lastShapeCells.forEach(key => {
    if (!visuals[key] || !visuals[key].shape) return;
    visuals[key].shape.vertices = verts;
    visuals[key].shape.fillColor = fC;
    visuals[key].shape.strokeColor = sC;
    visuals[key].shape.size = sz;
    //visuals[key].shape.rotation = rot;
  });
}  
// --- UI SETUP FUNCTIONS ---
function setupSliderFeedback(selector = 'input[type="range"]') {
  if (MODE !== 'edit') {
    console.log('Slider feedback setup skipped in view mode');
    return;
  }
  if (typeof tippy === 'undefined') {
    console.warn('tippy.js is not loaded, slider tooltips will not work');
    return;
  }
  const sliders = document.querySelectorAll(selector);
  console.log(`Found ${sliders.length} sliders for Tippy setup`); // Debug: Should log 6
  sliders.forEach((slider, index) => {
    if (!slider) {
      console.warn(`No range input found at index ${index}`);
      return;
    }
    console.log(`Initializing Tippy for slider: ${slider.name || index}, value: ${slider.value}`);
    const instance = tippy(slider, {
      content: slider.value || '0',
      theme: 'modulariem',
      placement: 'right',
      trigger: 'manual',
      hideOnClick: false,
      animation: 'scale',
      duration: [200, 150],
      zIndex: 9999,
      offset: [0, 10] // Slightly left to approximate thumb center, 10px above
    });
    let timeout;
    const updateTippy = () => {
      console.log(`Updating Tippy for ${slider.name || index}: ${slider.value}`);
      instance.setContent(slider.value || '0');
      instance.show();
      clearTimeout(timeout);
      timeout = setTimeout(() => instance.hide(), 1000);
    };
    slider.addEventListener('mousedown', updateTippy);
    slider.addEventListener('input', updateTippy);
    slider.addEventListener('change', updateTippy);
  });
}

function setupUnifyButton() {
  if (MODE !== 'edit') {
    console.log('Unify button setup skipped in view mode');
    return;
  }
  const btn = document.getElementById('unify-btn');
  if (!btn) {
    console.warn('Unify button not found, deferring setup');
    setTimeout(() => {
      const delayedBtn = document.getElementById('unify-btn');
      if (delayedBtn) {
        delayedBtn.addEventListener('click', () => {
          useUnifiedOffset = !useUnifiedOffset;
          globalOffset = random(0, 1000);
          delayedBtn.textContent = useUnifiedOffset ? '=' : '~';
          delayedBtn.style.backgroundColor = useUnifiedOffset ? 'black' : 'white';
          delayedBtn.style.color = useUnifiedOffset ? 'white' : 'black';
        });
        console.log('Unify button setup completed after delay');
      } else {
        console.error('Unify button still not found after delay');
      }
    }, 1000);
    return;
  }
  btn.addEventListener('click', () => {
    useUnifiedOffset = !useUnifiedOffset;
    globalOffset = random(0, 1000);
    btn.textContent = useUnifiedOffset ? '=' : '~';
    btn.style.backgroundColor = useUnifiedOffset ? 'black' : 'white';
    btn.style.color = useUnifiedOffset ? 'white' : 'black';
  });
}


//POP UP DRAGGABLE 
function makePopupDraggable(popup) {
  if (!popup) return;
  const header = popup.querySelector('.popup-header');
  if (!header) return;

  popup.addEventListener('mousedown', () => {
    popup.style.zIndex = ++topZIndex;
  });

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    popup.classList.remove('dragging'); 
    header.style.cursor = 'grabbing';
    popup.style.zIndex = ++topZIndex;

    const rect = popup.getBoundingClientRect();
    popup.style.position = 'fixed';
    popup.style.left = `${rect.left}px`;
    popup.style.top = `${rect.top}px`;
    popup.style.margin = '0';
    popup.style.transform = 'none';

    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    e.preventDefault();
  });


  function onMouseMove(e) {
    if (!isDragging) return;

    let newLeft = e.clientX - offsetX;
    let newTop = e.clientY - offsetY;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = popup.offsetWidth;
    const popupHeight = popup.offsetHeight;

    newLeft = Math.max(0, Math.min(viewportWidth - popupWidth, newLeft));
    newTop = Math.max(0, Math.min(viewportHeight - popupHeight, newTop));

    popup.style.left = `${newLeft}px`;
    popup.style.top = `${newTop}px`;
  }
  
  function onMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    header.style.cursor = 'grab';
    popup.classList.remove('dragging'); 

    const popupRect = popup.getBoundingClientRect();
    const margin = 6;
    const snapRange = 30;

    activePopups.forEach(other => {
      if (other === popup) return;
      const otherRect = other.getBoundingClientRect();

      if (Math.abs(popupRect.left - (otherRect.right + margin)) < snapRange) {
        popup.style.left = `${otherRect.right + margin}px`;
        popup.style.top = `${otherRect.top}px`;
      }

      if (Math.abs(popupRect.right - (otherRect.left - margin)) < snapRange) {
        popup.style.left = `${otherRect.left - popup.offsetWidth - margin}px`;
        popup.style.top = `${otherRect.top}px`;
      }

      if (Math.abs(popupRect.left - otherRect.left) < snapRange) {
        popup.style.left = `${otherRect.left}px`;
      }

      if (Math.abs(popupRect.right - otherRect.right) < snapRange) {
        popup.style.left = `${otherRect.right - popup.offsetWidth}px`;
      }

      if (Math.abs(popupRect.top - otherRect.top) < snapRange) {
        popup.style.top = `${otherRect.top}px`;
      }
    });
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}


//POP UP PALETA FLOTANTE


//OPENING POP UP INFORMATION 
function setupInfoPopup() {
  if (MODE !== 'edit') {
    console.log('this is an editing function');
    return;
  }
  const popup = document.getElementById('info-popup');
  const closeBtn = popup.querySelector('.popup-close');
  const infoBtn = document.getElementById('info-btn');

  // Check local storage to decide initial visibility
  const seenSeeds = JSON.parse(localStorage.getItem('seen_root_popups') || '[]');
  if (seenSeeds.includes(seed)) {
    popup.style.display = 'none'; // Hide if already seen
  } else {
    popup.style.display = 'flex'; // Show for first-time seed creation
    popup.style.zIndex = ++topZIndex;
  }

  closeBtn.addEventListener('click', () => {
    popup.style.display = 'none';
  });

  infoBtn.addEventListener('click', () => {
    popup.style.display = 'flex';
    popup.style.zIndex = ++topZIndex;
  });

  makePopupDraggable(popup);
}

makePopupDraggable(document.getElementById('palette'));

//abrirlo con el boton


//LIBRERIAS 

//TIPPY



if (MODE === 'edit' && typeof tippy !== 'undefined') {
  tippy('[data-tippy-content]', {
    theme: 'modulariem',
    animation: 'scale',
    duration: [200, 150],
    placement: 'top',
  });
} else {
  if (MODE !== 'edit') {
    console.log('Tooltips skipped in view mode');
  } else {
    console.warn('tippy.js is not loaded, tooltips will not work');
  }
}
function setupGradientColorInputs() {
  if (MODE !== 'edit') {
    console.log('this is is an editing function');
    return;
  }
  const color1 = document.getElementById("gradient-color-1");
  const color2 = document.getElementById("gradient-color-2");
  const color3 = document.getElementById("gradient-color-3");
  if (color1) {
    color1.addEventListener("input", e => {
      gradientColors[0] = e.target.value;
      markChanges();
      debounceSaveToFirestore();
    });
  }
  if (color2) {
    color2.addEventListener("input", e => {
      gradientColors[1] = e.target.value;
      markChanges();
      debounceSaveToFirestore();
    });
  }
  if (color3) {
    color3.addEventListener("input", e => {
      gradientColors[2] = e.target.value;
      markChanges();
      debounceSaveToFirestore();
    });
  }
}


const fontElement = document.getElementById("text-font");
if (MODE === 'edit' && fontElement) {
  fontElement.addEventListener("change", e => {
    textSettings.font = e.target.value;
    markChanges();
    debounceSaveToFirestore();
  });
} else if (MODE !== 'edit') {
  console.log('Text font change setup skipped in view mode');
} else {
  console.warn('text-font element not found in edit mode');
}

document.getElementById("text-size").addEventListener("input", e => {
  if (MODE !== 'edit') {
    console.log('this is is an editing function');
    return;
  }
  // El usuario escribe directamente el font-size en px:
  const v = parseInt(e.target.value, 10);
  if (!isNaN(v) && v > 0) {
    textSettings.size = v;
  }
});

document.getElementById("text-lineheight").addEventListener("input", e => {
  if (MODE !== 'edit') {
    console.log('this is is an editing function');
    return;
  }
  // Interpretamos el valor como px absolutos de leading:
  const v = parseInt(e.target.value, 10);
  if (!isNaN(v) && v > 0) {
    textSettings.lineHeight = v;
  }
});

document.getElementById("text-kerning").addEventListener("input", e => {
  if (MODE !== 'edit') {
    console.log('this is is an editing function');
    return;
  }
  textSettings.letterSpacing = parseFloat(e.target.value);
});

document.getElementById("add-layer").addEventListener("click", createLayer);


function updateAllTextBlocks() {
  if (MODE !== 'edit') {
    console.log('this is is an editing function');
    return;
  }
  const visuals = window.activeLayer.visuals; // <--- importante

  Object.keys(visuals).forEach(key => {
    const v = visuals[key];
    if (v.type === "text") {
      v.font = document.getElementById("text-font").value;
      v.fontSize = parseInt(document.getElementById("text-size").value);
      v.lineHeight = parseFloat(document.getElementById("text-lineheight").value);
      v.letterSpacing = parseFloat(document.getElementById("text-kerning").value);
    }
  });
  
}



//TRICKS AND COMMANDS


//FOR TEXTS & BUTTONS 



function getColFromX(x) {
  for (let i = 0; i < columnPositions.length - 1; i++) {
    if (x >= columnPositions[i] && x < columnPositions[i + 1]) return i;
  }
  return null;
}

function getRowFromY(y) {
  for (let i = 0; i < rowPositions.length - 1; i++) {
    if (y >= rowPositions[i] && y < rowPositions[i + 1]) return i;
  }
  return null;
}
function keyPressed() {
  // ─────────────────────────────────────────────────────────────────────────────
  // 1) Let your <textarea> (or other p5 text edit) handle keys when focused
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentTextarea && document.activeElement === currentTextarea) {
    return true;
  }

  if (activeTextEdit) {
    // … your entire text-editing block unchanged …
    // (ends in `return false;` whenever you modify the text)
    // ─────────────────────────────────────────────────────────────────────────────
    // [CODE YOU ALREADY HAVE]
    // ─────────────────────────────────────────────────────────────────────────────
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2) If not in edit-mode OR if an INPUT/TEXTAREA is focused, bail out with
  //    a plain `return;` so we don’t preventDefault other keys (e.g. Ctrl+V).
  // ─────────────────────────────────────────────────────────────────────────────
  const tag = document.activeElement.tagName;
  if (MODE !== 'edit' || tag === 'INPUT' || tag === 'TEXTAREA') {
    return;
  }

  // normalize once
  const k = key.toLowerCase();

  // ─────────────────────────────────────────────────────────────────────────────
  // 3) Your shortcuts: return false for each handled key
  // ─────────────────────────────────────────────────────────────────────────────

  // H: Hide/show all tools
  if (k === 'h') {
    document.body.classList.toggle('hide-ui');
    document.getElementById('bottom-buttons').classList.toggle('hidden');
    return false;
  }

  // S: Save work as PNG
  if (k === 's') {
    suppressCursor = true;
    redraw();
    saveCanvas(`seed_${seed}`, 'png');
    suppressCursor = false;
    console.log('Canvas saved as PNG without cursor');
    return false;
  }

  // G: Gradient tool
  if (k === 'g') {
    activeTool = 'gradient';
    selectToolButton('gradient');
    console.log('Gradient tool selected');
    return false;
  }

  // Q: Shape tool
  if (k === 'q') {
    activeTool = 'shape';
    selectToolButton('shape');
    console.log('Shape tool selected');
    return false;
  }

  // Esc: Close popups, deselect
  if (keyCode === ESCAPE) {
    document.querySelectorAll('.popup').forEach(p => p.style.display = 'none');
    activeTextEdit = null;
    activeImageEdit = null;
    textStartCell = null;
    imageStartCell = null;
    editingGrid = false;
    redraw();
    console.log('Popups closed, selections cleared');
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4) Everything else: let p5/browser have it
  // ─────────────────────────────────────────────────────────────────────────────
  return;
}


//IMAGE UPLOADER

function setupImageUpload() {
  if (MODE !== 'edit') {
    console.log('this is is an editing function');
    return;
  }
  const fileInput = document.getElementById("image-file-input");
  const selectBtn = document.getElementById("select-image-btn");
  const dropzone  = document.getElementById("image-dropzone");

  selectBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    handleImageUpload(e.target.files[0]);
  });

  // Drag & Drop
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "#00aa00";
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.style.borderColor = "#aaa";
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "#aaa";
    if (e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  });
}
function handleImageUpload(file) {
  if (!file.type.startsWith("image/")) {
    alert("Solo se permiten imágenes");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(event) {
    loadImage(event.target.result, (img) => {
      uploadedImage = img;
      uploadedImageReady = true;
      alert("Imagen cargada. Ahora dibuja el área.");
    });
  };
  reader.readAsDataURL(file);
}

const scaleSlider = document.getElementById("scale-slider");

if (scaleSlider) {
  scaleSlider.addEventListener("input", () => {
    const visuals = window.activeLayer.visuals; // <--- IMPORTANTE
    if (activeImageEdit && visuals[activeImageEdit]) {
      visuals[activeImageEdit].scale = parseFloat(scaleSlider.value);
      console.log("🔍 Nueva escala:", visuals[activeImageEdit].scale);
    }
  });
}

const imageScaleValue = document.getElementById("image-scale-value");
// imageScaleSlider is assigned below at line ~2614; this listener is safely re-attached there


function selectImageVisual(key) {
  const visuals = window.activeLayer.visuals; // <--- IMPORTANTE
  activeImageEdit = key;
  const visual = visuals[key];
  if (visual) {
    imageScaleSlider.value = visual.scale || 1;
  }
}

function getVisualKeyUnderMouse() {
  const visuals = window.activeLayer.visuals; // <--- IMPORTANTE
  const rows = rowPositions.length - 1;
  const cols = columnPositions.length - 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r}-${c}`;
      const visual = visuals[key];
      if (!visual || visual.type !== "image") continue;

      const wCells = visual.w || 1;
      const hCells = visual.h || 1;

      const x1 = columnPositions[c];
      const y1 = rowPositions[r];
      const x2 = columnPositions[c + wCells];
      const y2 = rowPositions[r + hCells];

      if (mouseX >= x1 && mouseX <= x2 && mouseY >= y1 && mouseY <= y2) {
        return key;
      }
    }
  }
  return null;
}

function showImageScaleSlider() {
  const visuals = window.activeLayer.visuals; // <--- IMPORTANTE
  const slider = document.getElementById("image-scale");
  if (!slider || !activeImageEdit) return;

  slider.value = visuals[activeImageEdit]?.scale || 1;

  slider.oninput = () => {
    const newScale = parseFloat(slider.value);
    if (visuals[activeImageEdit]) {
      visuals[activeImageEdit].scale = newScale;
    }
  };
}

function updateImageSliderUI(value) {
  const slider = document.getElementById("scale-slider");
  if (slider) {
    slider.value = value;
  }
}

imageScaleSlider = document.getElementById("scale-slider");

if (imageScaleSlider) {
  imageScaleSlider.addEventListener("input", () => {
    const visuals = window.activeLayer.visuals; // <--- IMPORTANTE
    if (activeImageEdit && visuals[activeImageEdit]) {
      const scale = parseFloat(imageScaleSlider.value);
      visuals[activeImageEdit].scale = scale;

      // Actualiza el número mostrado (si usas uno)
      const imageScaleValue = document.getElementById("scale-value");
      if (imageScaleValue) {
        imageScaleValue.textContent = scale.toFixed(2);
      }
    }
  });  
}

function updateActiveImagesPanel() {
  if (MODE !== 'edit') return;
  const panel = document.getElementById("active-images");
  if (!panel) return;

  panel.innerHTML = "";

  const visuals = window.activeLayer?.visuals || {};
  for (const key in visuals) {
    const visual = visuals[key];
    if (visual.type === "image" && visual.img instanceof p5.Image) {
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.alignItems = "center";
      wrapper.style.gap = "8px";

      const thumb = document.createElement("canvas");
      thumb.width = 40;
      thumb.height = 40;
      const ctx = thumb.getContext("2d");
      ctx.drawImage(visual.img.canvas, 0, 0, 40, 40);

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "✖";
      deleteBtn.style.background = "transparent";
      deleteBtn.style.border = "none";
      deleteBtn.style.cursor = "pointer";
      deleteBtn.style.fontSize = "16px";
      deleteBtn.onclick = () => {
        delete visuals[key];
        if (activeImageEdit === key) activeImageEdit = null;

        const imageScaleSlider = document.getElementById("scale-slider");
        if (imageScaleSlider) {
          imageScaleSlider.value = 1;
        }

        updateActiveImagesPanel();
        redraw();
        saveVisuals();
      };

      thumb.style.cursor = "pointer";
      thumb.onclick = () => {
        activeImageEdit = key;
        const imageScaleSlider = document.getElementById("scale-slider");
        if (imageScaleSlider && visual.scale) {
          imageScaleSlider.value = visual.scale;
        }
      };

      wrapper.appendChild(thumb);
      wrapper.appendChild(deleteBtn);
      panel.appendChild(wrapper);
    }
  }
}
// PANEL UI UPDATES 
function isMouseOverUI() {
  const el = document.elementFromPoint(mouseX + window.scrollX, mouseY + window.scrollY);
  return el && el.closest('#palette, #palette-sidebar-wrapper, .popup, .tool-options, .choices__inner');
}


// FUNCIONES DE LAYERS
function createLayer() {
  if (!window.layers) window.layers = [];
  if (window.layers.length >= 10) {
    alert("Max 10 layers");
    return;
  }
  const newLayer = {
    id: generateLayerID(),
    name: `Layer ${window.layers.length + 1}`,
    type: "gradient",
    color: randomColorFromNeonPalette(),
    visible: true,
    visuals: {}
  };

  window.layers.push(newLayer);
  window.activeLayer = newLayer;
  console.log(">> After createLayer, layers =", window.layers.map(l => l.name));
  renderLayersUI();
  markChanges();
  debounceSaveToFirestore();
}



function selectToolButton(toolType) {
  document.querySelectorAll('.tool-btn').forEach(b => {
    if (b.dataset.tool === toolType) b.classList.add('active');
    else b.classList.remove('active');
  });
  // Muestra solo el panel de propiedades correspondiente
  document.querySelectorAll('.tool-options').forEach(opt => {
    opt.style.display = 'none';
  });
  const panel = document.getElementById(`options-${toolType}`);
  if (panel) panel.style.display = 'flex';
  const title = document.getElementById("properties-title");
  if (title) title.textContent = toolType.charAt(0).toUpperCase() + toolType.slice(1);
}


function renderLayersUI() {
  if (MODE !== 'edit') return;
  const list = document.getElementById("layers-list");
  if (!list) {
    console.error("Layers list element not found");
    return;
  }
  list.innerHTML = "";

  window.layers.forEach((layer, index) => {
    const div = document.createElement("div");
    div.className = "layer-entry";
    div.style.backgroundColor = layer.color;
    div.style.padding = "4px";
    div.style.marginBottom = "4px";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "space-between";
    div.style.cursor = "pointer";
    div.dataset.layerId = layer.id;

    const name = document.createElement("input");
    name.type = "text";
    name.value = layer.name;
    name.className = "layer-name";
    name.style.flex = "1";
    name.oninput = () => {
      layer.name = name.value;

      redraw();
    };

    const upBtn = document.createElement("button");
    upBtn.innerText = "↑";
    upBtn.onclick = (e) => {
      e.stopPropagation();
      if (index > 0) {
        [window.layers[index-1], window.layers[index]] = [window.layers[index], window.layers[index-1]];
        renderLayersUI();
  
        redraw();
      }
    };

    const downBtn = document.createElement("button");
    downBtn.innerText = "↓";
    downBtn.onclick = (e) => {
      e.stopPropagation();
      if (index < window.layers.length - 1) {
        [window.layers[index + 1], window.layers[index]] = [window.layers[index], window.layers[index + 1]];
        renderLayersUI();
        redraw();
      }
    };

    const visibleBtn = document.createElement("button");
    visibleBtn.innerHTML = layer.visible ? "👁️" : "👁️‍🗨️";
    visibleBtn.onclick = (e) => {
      e.stopPropagation();
      layer.visible = !layer.visible;
      renderLayersUI();
      redraw();
    };

    const delBtn = document.createElement("button");
    delBtn.innerText = "✕";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      window.layers.splice(index, 1);
      if (window.activeLayer === layer) {
        window.activeLayer = window.layers[0] || null;
      }
      renderLayersUI();
      debounceSaveToFirestore();
      redraw();
      const addLayerBtn = document.getElementById("add-layer");
      if (window.layers.length < 10 && addLayerBtn) {
        addLayerBtn.disabled = false;
      }
    };

    div.onclick = () => {
      window.activeLayer = layer;
      console.log(`Selected layer: ${layer.name}`);
      renderLayersUI();
      redraw();
    };

    if (window.activeLayer === layer) {
      div.style.outline = "2px solid #fff";
      div.style.boxShadow = "0 0 5px rgba(208, 252, 118, 0.8)";
      name.style.fontWeight = "bold";
      name.style.color = "#222";
      div.insertAdjacentHTML('afterbegin', '<span style="margin-right:4px; color: rgb(208, 252, 118);">*</span>');
    } else {
      div.style.outline = "none";
      div.style.boxShadow = "none";
      name.style.fontWeight = "normal";
      name.style.color = "";
    }

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "4px";
    controls.appendChild(upBtn);
    controls.appendChild(downBtn);
    controls.appendChild(visibleBtn);
    controls.appendChild(delBtn);

    div.appendChild(name);
    div.appendChild(controls);
    list.appendChild(div);
  });

  const layerCount = document.getElementById("layer-count");
  if (layerCount) layerCount.textContent = `(${window.layers.length}/10)`;
}
// --------- FUNCIONES EXTRA ---------

function countLayersOfType(type) {
  return window.layers.filter(layer => layer.type === type).length;
}

function generateLayerID() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
}


//RANDOM COLORS
function randomNeonColor() {
  return "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}


// --------- MENÚ Y EVENTOS UI ---------
document.addEventListener('DOMContentLoaded', function () {
  const addLayerBtn = document.getElementById("add-layer");
  const layersList = document.getElementById("layers-list");

  addLayerBtn.addEventListener("click", function () {
    console.log("▶ Click en + antes de createLayer()");
    createLayer();
    // Opcional: desactiva el botón si llegas a 10 layers
    if (window.layers.length >= 10) {
      addLayerBtn.disabled = true;
    }
  });

  if (!window.layers || window.layers.length === 0) {
    createLayer();
  }
  if (!window.activeLayer && window.layers.length > 0) {
    window.activeLayer = window.layers[0];
  }

  // Desactiva el botón "+" si ya hay 10 layers al cargar
  if (window.layers.length >= 10) {
    addLayerBtn.disabled = true;
  }

  function removeLayer(index) {
    window.layers.splice(index, 1);
    renderLayersUI();
    const addLayerBtn = document.getElementById("add-layer");
    if (window.layers.length < 10) {
      addLayerBtn.disabled = false;
    }
  }
  

  // Render inicial
  renderLayersUI();
});


//TEXT OVERLAY

/**
 * Inicia la edición de texto en pantalla para el módulo dado.
 * @param {string} key       – “r-c” (la clave del activo text visual)
 * @param {number} x         – Coordenada X (en píxeles) en el canvas (esquina superior del módulo)
 * @param {number} y         – Coordenada Y (en píxeles) en el canvas (esquina superior del módulo)
 * @param {number} w         – Ancho (en píxeles) del módulo
 * @param {number} h         – Alto (en píxeles) del módulo
 * @param {object} visual    – El objeto visual.text al que estamos editando
 */


// ─────────────────────────────────────────────────────────────────────────────
// Función que abre (o vuelve a abrir) el <textarea> para editar el bloque de texto
// ─────────────────────────────────────────────────────────────────────────────
function startTextEditing(key, x, y, w, h, visual) {
  // 1) Marcamos qué bloque está en edición:
  activeTextEdit = key;

  // 2) Si había un <textarea> abierto, lo cerramos estrictamente si su padre es body:
  if (currentTextarea && currentTextarea.parentNode === document.body) {
    document.body.removeChild(currentTextarea);
  }
  currentTextarea = null;

  // 3) Ahora creamos un nuevo <textarea> y le ponemos el texto actual:
  const ta = document.createElement("textarea");
  ta.value = visual.text.content || "";

  // 4) Calculamos posición absoluta sobre el canvas:
  const canvasBounds = canvas.elt.getBoundingClientRect();
  ta.style.position      = "absolute";
  ta.style.left          = `${canvasBounds.left + x}px`;
  ta.style.top           = `${canvasBounds.top  + y}px`;
  ta.style.width         = `${w}px`;
  ta.style.height        = `${h}px`;
  ta.style.boxSizing     = "border-box";
  ta.style.zIndex        = 9999;           // Siempre encima del canvas
  ta.style.pointerEvents = "auto";         // Para recibir clics/doble-clic/selección
  ta.style.userSelect    = "text";         // Para permitir selección de texto en el textarea

  // 5) Tipografía y color:
  const fontSize  = Number(visual.text.size) || 32;
  const leadingPx = Number(visual.text.lineHeight) || fontSize;
  ta.style.fontFamily = visual.text.font || "sans-serif";
  ta.style.fontSize   = `${fontSize}px`;
  ta.style.lineHeight = `${leadingPx}px`;
  ta.style.color      = visual.text.color || "#000000";
  ta.style.caretColor = visual.text.color || "#000000";

  // 6) Multilínea + wrap automático + sin scroll horizontal:
  ta.style.whiteSpace = "pre-wrap";
  ta.style.wordWrap   = "break-word";
  ta.style.overflowY  = "hidden";   // Scroll vertical lo ajustaremos manualmente
  ta.style.overflowX  = "hidden";
  ta.style.resize     = "vertical"; // Solo permitir cambiar la altura

  // 7) Sin padding/margen visibles, con fondo semitransparente:
  ta.style.padding    = "0";
  ta.style.margin     = "0";
  ta.style.border     = "1px solid #ccc";
  ta.style.background = "rgba(255, 255, 255, 0.9)";
  ta.style.outline    = "none";

  // 8) Evitar que un mousedown en el textarea se propague al canvas:
  ta.addEventListener("mousedown", (ev) => {
    ev.stopPropagation();
  });

  // 9) Al escribir (“input”), actualizamos visual.text.content y recalculamos el wrap:
  ta.addEventListener("input", () => {
    visual.text.content = ta.value;

    // Recalcular envoltorio de líneas (wrap) con tus métricas de grid:
    const { cellW, cellH } = getGridMetrics();
    const paddingX     = cellW * 0.05;
    const paddingY     = cellH * 0.05;
    const usableWidth  = w - 2 * paddingX;
    const usableHeight = h - 2 * paddingY;
    const lineHeightPx = leadingPx;
    const maxLines     = Math.floor(usableHeight / lineHeightPx);

    const ctx = drawingContext;
    ctx.font = `${fontSize}px ${visual.text.font}`;
    visual._wrappedLines = wrapTextInBox(
      ctx,
      visual.text.content,
      usableWidth,
      maxLines,
      lineHeightPx,
      /* hyphenate= */ true
    );

    // Si usas noLoop(), forzamos redraw:
    redraw();

    // Ajuste dinámico de la altura del textarea según el contenido:
    ta.style.height = "auto";
    const needed = ta.scrollHeight;
    ta.style.height = Math.min(needed, h) + "px";
  });

  // 10) Si presionan “Escape”, forzamos blur() para cerrar edición:
  ta.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      ta.blur(); // Esto disparará el handler de “blur”
    }
  });

  // 11) Cuando pierda foco (“blur”), guardamos y eliminamos el textarea:
  ta.addEventListener("blur", () => {
    // 11.a) Guardar contenido en visual.text.content
    visual.text.content = ta.value;

    // 11.b) Recalcular wrap por última vez:
    const { cellW, cellH } = getGridMetrics();
    const paddingX     = cellW * 0.05;
    const paddingY     = cellH * 0.05;
    const usableWidth  = w - 2 * paddingX;
    const usableHeight = h - 2 * paddingY;
    const lineHeightPx = leadingPx;
    const maxLines     = Math.floor(usableHeight / lineHeightPx);

    const ctx = drawingContext;
    ctx.font = `${fontSize}px ${visual.text.font}`;
    visual._wrappedLines = wrapTextInBox(
      ctx,
      visual.text.content,
      usableWidth,
      maxLines,
      lineHeightPx,
      /* hyphenate= */ true
    );

    // 11.c) Eliminar el <textarea> SOLO si sigue dentro de document.body:
    if (ta.parentNode === document.body) {
      document.body.removeChild(ta);
    }
    // 11.d) Limpiar la referencia global:
    if (currentTextarea === ta) {
      currentTextarea = null;
    }

    // 11.e) Forzar redraw si estamos en noLoop():
    redraw();
  });

  // 12) Ajustar inicialmente la altura para no mostrar scroll si el texto es corto:
  (function AjusteInicialAltura() {
    ta.style.height = "auto";
    const needed = ta.scrollHeight;
    ta.style.height = Math.min(needed, h) + "px";
    ta.scrollTop = 0;
  })();

  // 13) Finalmente, lo agregamos al DOM y damos foco:
  document.body.appendChild(ta);
  currentTextarea = ta;
  // Hacemos focus dentro de un setTimeout(0) para asegurarnos de que
  // el navegador ya haya renderizado el nodo antes de recibir el focus:
  setTimeout(() => { ta.focus(); }, 0);
}

/**
 * wrapTextInBox:
 *   - Divide el texto en párrafos usando saltos de línea manuales (“\n”).
 *   - Para cada párrafo, va cortando (word‐by‐word o char‐by‐char) de modo que
 *     cada línea tenga textWidth ≤ usableWidth.
 *   - Si una “palabra” (separada por espacios) es más ancha que usableWidth, 
 *     se aplica hyphenation (corte char‐by‐char) para ajustarla.
 *
 * /**
 * wrapTextInBox: divide y envuelve el texto en líneas que quepan en usableWidth.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {string} rawText       Texto original (puede tener "\n").
 * @param {number} usableWidth   Ancho en px para el texto (sin padding).
 * @param {number} maxLines      Máximo de líneas (int).
 * @param {number} lineHeightPx  Alto de cada línea (int).
 * @param {boolean} hyphenate    Si true, corta palabras largas char‐by‐char.
 * @returns {string[]}           Array con cada línea ajustada.
 */
function wrapTextInBox(ctx, rawText, usableWidth, maxLines, lineHeightPx, hyphenate = false) {
  const outputLines = [];
  const paragraphs = rawText.split("\n");

  for (let pi = 0; pi < paragraphs.length; pi++) {
    let paragraph = paragraphs[pi].trim();
    if (paragraph === "") {
      if (outputLines.length < maxLines) {
        outputLines.push("");
      }
      continue;
    }
    const words = paragraph.split(" ");
    let currentLine = "";

    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const testLine = currentLine === "" ? word : currentLine + " " + word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth <= usableWidth) {
        currentLine = testLine;
      } else {
        // Volcar currentLine si no está vacío
        if (currentLine !== "" && outputLines.length < maxLines) {
          outputLines.push(currentLine);
        }
        currentLine = "";

        const singleWordWidth = ctx.measureText(word).width;
        if (singleWordWidth <= usableWidth) {
          if (outputLines.length < maxLines) {
            outputLines.push(word);
          }
        } else {
          // Hyphenation: cortar palabra char-by-char
          let remaining = word;
          while (remaining.length > 0 && outputLines.length < maxLines) {
            let fit = "";
            let p = 0;
            while (p < remaining.length) {
              const testPart = remaining.substring(0, p + 1);
              if (ctx.measureText(testPart).width <= usableWidth) {
                fit = testPart;
                p++;
              } else {
                break;
              }
            }
            if (fit === "") {
              fit = remaining.charAt(0);
              p = 1;
            }
            if (outputLines.length < maxLines) {
              // Podrías agregar “-” si quieres indicar hyphenation: fit + "-"
              outputLines.push(fit);
            }
            remaining = remaining.substring(p);
          }
          currentLine = "";
        }
      }
      // Si ya llenamos maxLines, salimos de inmediato
      if (outputLines.length >= maxLines) {
        break;
      }
    }

    if (currentLine !== "" && outputLines.length < maxLines) {
      outputLines.push(currentLine);
    }

    // Si quedan párrafos, agregamos una línea vacía para separar
    if (pi < paragraphs.length - 1 && outputLines.length < maxLines) {
      outputLines.push("");
    }
    if (outputLines.length >= maxLines) {
      break;
    }
  }

  return outputLines;
}

/**
 * Dibuja un bloque de texto ya envuelto (“wrapped”) dentro del rectángulo.
 *
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x0             Coordenada X de la esquina superior izquierda del bloque (en px).
 * @param {number} y0             Coordenada Y de la esquina superior izquierda del bloque (en px).
 * @param {string[]} lines        Arreglo de líneas ya envueltas.
 * @param {number} paddingX       Padding horizontal en px desde borde del rectángulo.
 * @param {number} paddingY       Padding vertical en px desde borde del rectángulo.
 * @param {number} cellH          Alto de línea en px (igual al alto de módulo).
 * @param {string} font           Fuente a usar (e.g. "16px sans-serif").
 * @param {string} color          Color de texto (hex o rgb).
 */
/**
/**
 * paintWrappedText:
 *   - ctx:          contexto 2D del canvas (drawingContext).
 *   - x0, y0:       esquina superior izquierda del bloque de texto (en píxeles).
 *   - usableWidth:  ancho interior disponible para texto (en píxeles), es decir:
 *                   ancho total del bloque menos 2*paddingX.
 *   - totalHeight:  altura total del bloque (en píxeles), calculada como heightPx.
 *                   Se usa para el clip, de modo que cubra todo el rectángulo.
 *   - lines:        array de strings que contienen cada línea ya envuelta.
 *   - paddingX:     padding horizontal en px (espacio entre borde y texto).
 *   - paddingY:     padding vertical en px (espacio entre borde y texto).
 *   - cellH:        altura de cada “celda” en px (se usa para desplazar cada línea).
 *   - font:         string con la especificación de fuente (p. ej. "24px sans-serif").
 *   - color:        color de relleno (p. ej. "#000000").
 *
 * Esta versión ya no asume que “usableWidth” está en scope, sino que se lo pasamos.
 * Tampoco se basa únicamente en cellH * lines.length para la altura del clip, 
 * sino que usa totalHeight, que debería ser el heightPx completo del bloque.
 */
function paintWrappedText(
  ctx,
  x0,
  y0,
  usableWidth,
  totalHeight,
  lines,
  paddingX,
  paddingY,
  cellH,
  font,
  color
) {
  ctx.save();

  // 1) Clippeamos a TODO el bloque (anchura = usableWidth + 2*paddingX, altura = totalHeight)
  ctx.beginPath();
  ctx.rect(x0, y0, usableWidth + 2 * paddingX, totalHeight);
  ctx.clip();

  // 2) Configuramos estilo de texto
  ctx.font = font;        // ej. "24px sans-serif"
  ctx.fillStyle = color;  // ej. "#000000"
  ctx.textBaseline = "top";
  ctx.textAlign    = "left";

  // 3) Dibujamos cada línea desplazada por cellH en Y
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const drawX = x0 + paddingX;
    const drawY = y0 + paddingY + i * cellH;
    ctx.fillText(line, drawX, drawY);
  }

  ctx.restore();
}


///
/////
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

////
///
///
///
///
///
///
///
///
///
///
//
//
//
//
//
/**
 * Completely clears and redraws the canvas
 * based on the Firestore‐saved layers array.
 */
// ─── Load a saved seed composition (Harvest viewer) ───
/**
 * Replace the in‐memory grid & layers with the Firestore‐saved data,
 * then redraw the canvas exactly as the user created it.
 *
 /**
/**
 * Load a saved seed composition into the sketch.
 * @param {Object} data - The Firestore document data, containing:
 *   - data.layers: Array of layer objects
 *   - data.gridConfig: Object with rows and cols
 */
window.loadSeed = function(data) {
  // 1) Grid
  if (data.gridConfig) {
    if (MODE !== 'view' && sliders.rows && sliders.columns && typeof sliders.rows.value === 'function' && typeof sliders.columns.value === 'function') {
      sliders.rows.value(data.gridConfig.rows);
      sliders.columns.value(data.gridConfig.cols);
    }
    updateGridPositions();
  }

  // 2) Layers
  if (data.layers && Array.isArray(data.layers)) {
    window.layers = data.layers.map(layer => {
      if (!layer.visuals) layer.visuals = {};
      return layer;
    });
    window.activeLayer = window.layers[0] || null;
  } else {
    window.layers = [{
      id: generateLayerID(),
      name: "Layer 1",
      type: "gradient",
      color: randomColorFromNeonPalette(),
      visible: true,
      visuals: {}
    }];
    window.activeLayer = window.layers[0];
  }

  // 3) Update UI and canvas
  if (MODE !== 'view' && typeof renderLayersUI === 'function') renderLayersUI();
  if (typeof redraw === 'function') redraw();

  console.log(`✅ Seed ${seed} loaded from layers`, window.layers);
};

if (MODE === 'edit') {
  setupGrowthIntegration(seed)
}