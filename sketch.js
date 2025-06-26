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
// 
// 
// 
// 
// 
// 
// 
// 
// global variables
// Replace the global variables section (lines ~30-80)
const MODE = document.body.dataset.mode || 'edit';
const minGap = 10;
const handleRadius = 8;
const wrapper = document.getElementById('canvas-wrapper');
const fullscreenBtn = document.querySelector('.fullscreen-btn');
const palette = document.getElementById('palette');

window.layers = window.layers || [];
window.activeLayer = window.activeLayer || null;
window.activeTool = window.activeTool || "gradient";

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
let gridOpacity = 255;
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
let hasUnsavedChanges = false;

let textSettings = {
  font: "sans-serif",
  size: 20,
  color: "black",
  lineHeight: 24,
  letterSpacing: 0
};


// --- SEED LOGIC ---



/**
 * Genera un seed de 7 caracteres alfanuméricos (A–Z, a–z, 0–9)
 */
// Replace the SEED LOGIC section (lines ~100-170) with this:
function markChanges() {
  hasUnsavedChanges = true;
}

async function saveToFirestore() {
  if (MODE === 'view') return;

  try {
    const sanitizedLayers = window.layers.map(layer => ({
      id: layer.id || generateLayerID(),
      name: layer.name || `Layer ${window.layers.indexOf(layer) + 1}`,
      type: layer.type || 'gradient',
      color: layer.color || randomColorFromNeonPalette(),
      visible: typeof layer.visible === 'boolean' ? layer.visible : true,
      visuals: Object.keys(layer.visuals || {}).reduce((acc, key) => {
        const visual = { ...layer.visuals[key] };
        delete visual.pg; // Eliminar propiedades no serializables
        if (visual.colors) {
          visual.colors = visual.colors.map(c => typeof c === 'string' ? c : c.toString().replace(/ /g, ''));
        }
        if (visual.text && visual.text.color) {
          visual.text.color = typeof visual.text.color === 'string' ? visual.text.color : visual.text.color.toString().replace(/ /g, '');
        }
        if (visual.shape) {
          visual.shape = {
            shapeType: visual.shape.shapeType || 'circle',
            fillColor: typeof visual.shape.fillColor === 'string' ? visual.shape.fillColor : (visual.shape.fillColor ? visual.shape.fillColor.toString().replace(/ /g, '') : '#ffffff'),
            strokeColor: typeof visual.shape.strokeColor === 'string' ? visual.shape.strokeColor : (visual.shape.strokeColor ? visual.shape.strokeColor.toString().replace(/ /g, '') : '#000000'),
            size: visual.shape.size || 1,
            opacity: visual.shape.opacity || 1,
            extrudePct: visual.shape.extrudePct || 0,
            subdivisions: visual.shape.subdivisions || 0,
            tint: visual.shape.tint || null
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
      canvasHeight: height || 600
    };

    const data = {
      seedCode: seed,
      layers: sanitizedLayers,
      gridConfig,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    console.log('Saving data to Firestore:', JSON.stringify(data, null, 2));
    await seedsCol.doc(seed).set(data, { merge: true });

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
  if (MODE === 'edit') {
    let container = select('#canvas-wrapper')?.elt;
    if (!container) {
      console.error('Canvas wrapper not found in edit mode');
      return;
    }
    canvas = createCanvas(container.clientWidth, container.clientHeight);
    canvas.parent('canvas-wrapper');
    canvas.elt.setAttribute('tabindex', '0');
    canvas.style('display', 'block');
    canvas.style('width', '100%');
    canvas.style('height', '100%');
  } else {
    canvas = createCanvas(800, 600);
  }

  gradientBuffer = createGraphics(width, height);

  const initializeDefaultLayer = (rows = 2, cols = 2) => {
    const defaultLayer = {
      id: generateLayerID(),
      name: "gradient 1",
      type: "gradient",
      color: randomColorFromNeonPalette(),
      visible: true,
      visuals: {}
    };
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        defaultLayer.visuals[`${i}-${j}`] = {
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
    return defaultLayer;
  };

  updateGridPositions();

  // Fetch seed data using Promise
  seedsCol.doc(seed).get().then(doc => {
    let rows = 2, cols = 2;
    if (doc.exists) {
      const data = doc.data();
      if (data.layers && Array.isArray(data.layers)) {
        window.layers = data.layers;
        rows = data.gridConfig?.rows || 2;
        cols = data.gridConfig?.cols || 2;
      } else {
        window.layers = [initializeDefaultLayer(rows, cols)];
        seedsCol.doc(seed).set({
          seedCode: seed,
          layers: window.layers,
          gridConfig: { rows, cols, canvasWidth: width || 800, canvasHeight: height || 600 },
          plantedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(err => console.error('Error saving default seed:', err));
      }
      if (data.gridConfig) {
        rows = data.gridConfig.rows || rows;
        cols = data.gridConfig.cols || cols;
      }
      // Check locked state and disable editing
      if (data.locked) {
        disableEditingControls();
        if (window.growthManager) {
          window.growthManager.init(seed);
          window.growthManager.lockSeed();
        }
      }
    } else {
      window.layers = [initializeDefaultLayer(rows, cols)];
      seedsCol.doc(seed).set({
        seedCode: seed,
        layers: window.layers,
        gridConfig: { rows, cols, canvasWidth: width || 800, canvasHeight: height || 600 },
        plantedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(err => console.error('Error creating new seed:', err));
    }
    window.activeLayer = window.layers[0] || null;
    updateGridPositions();
    if (MODE === 'edit') renderLayersUI();
    redraw();
    console.log('Layers loaded on setup:', window.layers.map(l => l.name));
  }).catch(err => {
    console.error('Error loading from Firestore:', err);
    window.layers = [initializeDefaultLayer()];
    window.activeLayer = window.layers[0];
    updateGridPositions();
    if (MODE === 'edit') renderLayersUI();
    redraw();
  });

  if (MODE === 'edit') {
    const seedInput = select('input[name="seed"]');
    if (seedInput) seedInput.value(seed);

    const btn = document.getElementById('seed-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        window.open(`harvest.html?seed=${seed}`, '_blank', 'noopener');
      });
    }

    // Initialize sliders
    sliders.rows = select('input[name="rows"]') || { value: () => 2 };
    sliders.columns = select('input[name="columns"]') || { value: () => 2 };
    sliders.sun = select('input[name="sun"]') || { value: () => 0 };
    sliders.water = select('input[name="water"]') || { value: () => 0 };
    sliders.vitamins = select('input[name="vitamins"]') || { value: () => 0 };
    sliders.days = select('input[name="days"]') || { value: () => 1 };

    if (typeof sliders.rows.value !== 'function') sliders.rows.value = () => 2;
    if (typeof sliders.columns.value !== 'function') sliders.columns.value = () => 2;
    if (typeof sliders.sun.value !== 'function') sliders.sun.value = () => 0;
    if (typeof sliders.water.value !== 'function') sliders.water.value = () => 0;
    if (typeof sliders.vitamins.value !== 'function') sliders.vitamins.value = () => 0;
    if (typeof sliders.days.value !== 'function') sliders.days.value = () => 1;
  } else {
    sliders.rows = { value: () => 2 };
    sliders.columns = { value: () => 2 };
    sliders.sun = { value: () => 0 };
    sliders.water = { value: () => 0 };
    sliders.vitamins = { value: () => 0 };
    sliders.days = { value: () => 1 };
  }

  updateGridPositions();

  const gradientColor1 = document.getElementById("gradient-color-1");
  const gradientColor2 = document.getElementById("gradient-color-2");
  const gradientColor3 = document.getElementById("gradient-color-3");
  if (gradientColor1 && gradientColor2 && gradientColor3) {
    setupGradientColorInputs();
  }

  const infoPopup = document.getElementById('info-popup');
  if (infoPopup) {
    setupInfoPopup();
  }

  const imageFileInput = document.getElementById("image-file-input");
  if (imageFileInput) {
    setupImageUpload();
  }

  setupSliderFeedback('.grid-sliders label');
  setupToolLogic();
  setupUnifyButton();
  setupGridEditingLogic();
  setupResizerHandle();

  // Move growth integration to a separate function
  setupGrowthIntegration();

  activeBorderColor = color(0, 255, 0);

  function disableEditingControls() {
    // Disable tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    });
    // Disable sliders
    document.querySelectorAll('input[type="range"]').forEach(slider => {
      slider.disabled = true;
    });
    // Disable canvas interactions
    if (canvas) {
      canvas.elt.style.pointerEvents = 'none';
    }
    // Disable layer controls
    document.querySelectorAll('.layer-entry input, .layer-entry button').forEach(el => {
      el.disabled = true;
    });
    // Show locked message
    const palette = document.getElementById('palette');
    if (palette) {
      const lockedMsg = document.createElement('div');
      lockedMsg.id = 'locked-message';
      lockedMsg.style.color = 'red';
      lockedMsg.style.padding = '10px';
      lockedMsg.textContent = 'This seed is locked for growth. Duplicate it to edit.';
      palette.appendChild(lockedMsg);
    }
  }
}


function setupResizerHandle() {
  if (MODE !== 'edit') {
      console.log('this is is an editing function');
      return;
  }
  const wrapper = document.getElementById('canvas-wrapper');

  const fullscreenBtn = document.createElement('div');
  fullscreenBtn.innerHTML = 'O';
  fullscreenBtn.title = "Fullscreen";
  fullscreenBtn.classList.add('tool-btn', 'fullscreen-btn');
  wrapper.appendChild(fullscreenBtn);

  const resizer = document.createElement('div');
  resizer.classList.add('tool-btn', 'resizer', 'top-right');
  resizer.innerHTML = 'Z';
  wrapper.appendChild(resizer);

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
      fullscreenBtn.innerHTML = '±';
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
      fullscreenBtn.innerHTML = 'O';
  }

  fullscreenBtn.addEventListener('click', () => {
      isFullscreen ? exitFullscreen() : enterFullscreen();
  });

  window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isFullscreen) {
          exitFullscreen();
      }
  });

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
      }

      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResize);
  });

  
}

if (!window.layers || window.layers.length === 0) {
  createLayer();
}
if (!window.activeLayer && window.layers.length > 0) {
  window.activeLayer = window.layers[0];
}

// THIS IS THE GROWING OPTIONS PART-----> When the user clicks Apply:
// THIS IS THE GROWING OPTIONS PART-----> When the user clicks Apply:
// THIS IS THE GROWING OPTIONS PART-----> When the user clicks Apply:
// THIS IS THE GROWING OPTIONS PART-----> When the user clicks Apply:
// THIS IS THE GROWING OPTIONS PART-----> When the user clicks Apply:
// THIS IS THE GROWING OPTIONS PART-----> When the user clicks Apply:
// THIS IS THE GROWING OPTIONS PART-----> When the user clicks Apply:
// THIS IS THE GROWING OPTIONS PART-----> When the user clicks Apply:

if (MODE === 'edit') {
  if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
      // 1) Gather the form values
      const cfg = {
        sun:       +document.querySelector('input[name="sun"]').value,
        water:     +document.querySelector('input[name="water"]').value,
        vitamins:  +document.querySelector('input[name="vitamins"]').value,
        days:      +document.querySelector('input[name="days"]').value,
        startDate: new Date().toISOString()
      };

      try {
        // 2) Write (or merge) into Firestore under this seed
        await seedsCol.doc(seed).set(
          {
            plantedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            growthConfig: cfg,
            layers: window.layers,
            gridConfig: {
              rows: parseInt(sliders.rows.value(), 10),
              cols: parseInt(sliders.columns.value(), 10),
            }
          },
          { merge: true }
        );
        

        // 3) Feedback to user
        alert(`✅ Growth settings saved for seed ${seed}`);
      } catch (err) {
        console.error(err);
        alert(`❌ Error saving growth settings: ${err.message}`);
      }
    });
  }
}



// THIS IS THE GROWING OPTIONS PART-----> When the user clicks Apply:
// THIS IS THE GROWING OPTIONS PART-----> When the user clicks Apply:
// THIS IS THE GROWING OPTIONS PART-----> When the user clicks Apply:
// THIS IS THE GROWING OPTIONS PART-----> When the user clicks Apply:
// THIS IS THE GROWING OPTIONS PART-----> When the user clicks Apply:
// THIS IS THE GROWING OPTIONS PART-----> When the user clicks Apply:
// THIS IS THE GROWING OPTIONS PART-----> When the user clicks Apply:

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
      drawGrid();
    }
  });

  // Restore active layer for editing
  window.activeLayer = window.layers.find(l => l.id === window.activeLayer?.id) || window.layers[0] || null;

  updateGlobalGradient(["#ff00ff", "#00ffff", "#ffffff"]);

  if (editingGrid) drawGridHandles();

  console.log(`✅ drawSeed() executed with ${window.layers.reduce((acc, layer) => acc + Object.keys(layer.visuals || {}).length, 0)} elements across ${window.layers.length} layers`);
}
// --- p5.js draw en bucle ---
function draw() {
  drawSeed();
  // Feedback de cursor cuadrado verde
  if (editingGrid || activeTool) {
    noFill();
    stroke(0, 255, 0);
    strokeWeight(1);
    rect(mouseX - 5, mouseY - 5, 10, 10);
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
  if (MODE === 'view') return;           // skip grid drawing in Harvest
  if (!Array.isArray(window.layers)) return;  // no layers array? bail
  noFill();
  // build a p5 Color from your hex + opacity
  const c = color(gridColor);
  c.setAlpha(gridOpacity);
  stroke(c);
  strokeWeight(1);

  // horizontals
  for (let r = 0; r < gridPoints.length; r++) {
    beginShape();
    for (let c = 0; c < gridPoints[r].length; c++) {
      vertex(gridPoints[r][c].x, gridPoints[r][c].y);
    }
    endShape();
  }
  // verticals
  for (let c = 0; c < gridPoints[0].length; c++) {
    beginShape();
    for (let r = 0; r < gridPoints.length; r++) {
      vertex(gridPoints[r][c].x, gridPoints[r][c].y);
    }
    endShape();
  }
}


// --- Dibujar los contenidos visuales por celda ---
// ——————— Helpers ———————

// Crea un gradiente vertical en un p5.Graphics (usado para performance)
function updateGradientBuffer(pg, colors, offset) {
  const steps = pg.height;
  pg.noStroke();
  pg.clear();

  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    let tt = (t + offset + frameCount * 0.01) % 1;

    const colr = (colors.length === 3)
      ? (tt < 0.5
          ? lerpColor(color(colors[0]), color(colors[1]), tt * 2)
          : lerpColor(color(colors[1]), color(colors[2]), (tt - 0.5) * 2))
      : lerpColor(color(colors[0]), color(colors[1] || "#000000"), tt);

    pg.stroke(colr);
    pg.line(0, i, pg.width, i);
  }
}

function updateGlobalGradient(colors, offset = 0) {
  const steps = gradientBuffer.height;

  gradientBuffer.noStroke();
  gradientBuffer.clear();

  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const tt = (t + offset + frameCount * 0.01) % 1;

    const colr = (colors.length === 3)
      ? (tt < 0.5
          ? lerpColor(color(colors[0]), color(colors[1]), tt * 2)
          : lerpColor(color(colors[1]), color(colors[2]), (tt - 0.5) * 2))
      : lerpColor(color(colors[0]), color(colors[1] || "#000000"), tt);

    gradientBuffer.stroke(colr);
    gradientBuffer.line(0, i, gradientBuffer.width, i);
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

      if (visual.type === "gradient" && visual.colors) {
        // Recreate p5.Graphics if not present or size changed
        if (!visual.pg || visual.pg.width !== w || visual.pg.height !== h) {
          visual.pg = createGraphics(w, h);
          visual.pg.pixelDensity(1);
        }
        updateGradientBuffer(visual.pg, visual.colors, visual.offset || 0);
        image(visual.pg, x, y, w, h);
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
      else if (visual.type === "shape" && visual.shape) {
        const wCells = visual.w || 1;
        const hCells = visual.h || 1;
        const p10 = gridPoints[r][c + wCells];
        const p01 = gridPoints[r + hCells][c];
        if (p10 && p01) {
          const x0 = A.x;
          const y0 = A.y;
          const w0 = p10.x - x0;
          const h0 = p01.y - y0;
          const s = visual.shape;
          push();
          translate(x0, y0);
          drawShape(w0, h0, s.shapeType, s.fillColor, s.strokeColor, s.size, r, c, activeLayer.visuals);
          pop();
          visual.w = wCells;
          visual.h = hCells;
        }
      }
    }
  }
}

// --- Gradiente animado ---
/**
 * Dibuja un degradado suave y relleno dentro del quad
 * definido por p00→p10→p11→p01 
 */
function drawAnimatedGradient(p00, p10, p11, p01, colors, offset) {
  const tOffset = useUnifiedOffset ? globalOffset : offset;
  // número de tiras basado en la longitud de los lados
  const leftLen  = dist(p00.x, p00.y, p01.x, p01.y);
  const rightLen = dist(p10.x, p10.y, p11.x, p11.y);
  const steps    = ceil(max(leftLen, rightLen));

  noStroke();
  for (let i = 0; i < steps; i++) {
    const t0 = i    / steps;
    const t1 = (i+1)/ steps;

    // cuatro esquinas de esta tira
    const A = { x: lerp(p00.x, p01.x, t0), y: lerp(p00.y, p01.y, t0) };
    const B = { x: lerp(p10.x, p11.x, t0), y: lerp(p10.y, p11.y, t0) };
    const C = { x: lerp(p10.x, p11.x, t1), y: lerp(p10.y, p11.y, t1) };
    const D = { x: lerp(p00.x, p01.x, t1), y: lerp(p00.y, p01.y, t1) };

    // color del degradado en t0
    let tt = (t0 + tOffset + frameCount * 0.01) % 1;
    let colr = (colors.length === 3)
      ? (tt < 0.5
          ? lerpColor(color(colors[0]), color(colors[1]), tt * 2)
          : lerpColor(color(colors[1]), color(colors[2]), (tt - 0.5) * 2))
      : lerpColor(color(colors[0]), color(colors[1] || "#000000"), tt);

    fill(colr);
    beginShape();
      vertex(A.x, A.y);
      vertex(B.x, B.y);
      vertex(C.x, C.y);
      vertex(D.x, D.y);
    endShape(CLOSE);
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
  // 0) Evitar clics sobre UI
  if (isMouseOverUI()) {
    console.log("🛑 Clic sobre UI, no se procesa");
    return;
  }

  // 1) Si NO estamos en modo edición de grid
  if (!editingGrid) {
    // 1.a) Herramienta text”

    if (activeTool === "text") {
      console.log(" → mousePressed con herramienta text");

      // 1.a.1) Determinar la celda clicada
      const col = getColFromX(mouseX);
      const row = getRowFromY(mouseY);
      if (col == null || row == null) {
        // Clic fuera de la cuadrícula
        return;
      }

      const key     = `${row}-${col}`;
      const visuals = window.activeLayer.visuals;

      // 1.a.2) Si ya existe un bloque de texto en esa celda → abrir textarea
      if (visuals[key] && visuals[key].type === "text") {
        const visual = visuals[key];
        const A      = gridPoints[row][col];
        if (!A) return;

        const wCells = visual.w || 1;
        const hCells = visual.h || 1;
        const P10 = gridPoints[row][col + wCells];
        const P01 = gridPoints[row + hCells][col];
        if (!P10 || !P01) return;

        const x0 = A.x;
        const y0 = A.y;
        const widthPx  = P10.x - x0;
        const heightPx = P01.y - y0;
        if (widthPx < 10 || heightPx < 10) return;

        // Entrar en edición con textarea
        activeTextEdit      = key;
        mouseDownOnText     = false;
        textSelectionStart  = -1;
        startTextEditing(key, x0, y0, widthPx, heightPx, visual);
        textStartCell = null;
        return;
      }

      // 1.a.3) Si NO existía texto, guardamos la celda “inicial” para crear uno al soltar
      textStartCell      = { row, col };
      textSelectionStart = -1;
      return;
    }

    // 1.b) Si ya estamos editando un bloque (sin textarea), detectar clic para posicionar cursor/selección
    if (activeTextEdit && !currentTextarea) {
      const visual = window.activeLayer.visuals[activeTextEdit];
      if (!visual || visual.type !== "text") return;

      // Obtener coordenadas del bloque
      const [r, c] = activeTextEdit.split("-").map(Number);
      const wCells = visual.w || 1;
      const hCells = visual.h || 1;
      const A   = gridPoints[r][c];
      const P10 = gridPoints[r][c + wCells];
      const P01 = gridPoints[r + hCells][c];
      if (!A || !P10 || !P01) return;

      const x0 = A.x;
      const y0 = A.y;
      const w0 = P10.x - x0;
      const h0 = P01.y - y0;

      // Verificar que el clic esté dentro del bloque
      if (
        mouseX < x0 || mouseX > x0 + w0 ||
        mouseY < y0 || mouseY > y0 + h0
      ) {
        return;
      }

      // Convertir a coordenadas dentro del área de texto
      const relX = mouseX - (x0 + visual._paddingX);
      const relY = mouseY - (y0 + visual._paddingY);

      // Determinar la línea en wrappedLines
      const lineHeight = visual._lineHeightPx;
      let lineIdx = Math.floor(relY / lineHeight);
      if (lineIdx < 0) lineIdx = 0;
      if (lineIdx >= visual._wrappedLines.length) {
        lineIdx = visual._wrappedLines.length - 1;
      }

      // Contar caracteres de líneas anteriores
      let charCount = 0;
      for (let i = 0; i < lineIdx; i++) {
        charCount += visual._wrappedLines[i].length;
      }

      // Dentro de la línea, medir posición de carácter
      const ctx = drawingContext;
      ctx.font = `${visual.text.size}px ${visual.text.font}`;
      let accWidth = 0;
      let foundIdx = 0;
      const lineStr = visual._wrappedLines[lineIdx] || "";
      for (let i = 0; i < lineStr.length; i++) {
        const cw = ctx.measureText(lineStr.charAt(i)).width;
        if (relX < accWidth + cw) {
          // Determine if cursor should be before or after character
          foundIdx = (relX < accWidth + cw/2) ? i : i+1;
          break;
        }
        accWidth += cw;
        foundIdx = i + 1;
      }

      textCursor = charCount + foundIdx;
      textSelectionStart = textCursor;
      isSelectingText = true; //REVISAR 
      redraw();
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

  // 3) Edición de grid: mover handle si se arrastra
  if (draggingHandle) {
    const { r, c } = draggingHandle;
    const xMin = c > 0 ? gridPoints[r][c - 1].x + minGap : 0;
    const xMax = c < gridPoints[r].length - 1 ? gridPoints[r][c + 1].x - minGap : width;
    const yMin = r > 0 ? gridPoints[r - 1][c].y + minGap : 0;
    const yMax = r < gridPoints.length - 1 ? gridPoints[r + 1][c].y - minGap : height;

    const newX = constrain(mouseX, xMin, xMax);
    const newY = constrain(mouseY, yMin, yMax);

    gridPoints[r][c].x = newX;
    gridPoints[r][c].y = newY;
    columnPositions[c] = newX;
    rowPositions[r]    = newY;
    return;
  }

  // 4) Edición de grid: mover línea (columna o fila)
  if (draggingLine !== null) {
    if (draggingType === "column") {
      columnPositions[draggingLine] = constrain(mouseX, 0, width);
    } else {
      rowPositions[draggingLine] = constrain(mouseY, 0, height);
    }
    computeGridPoints();
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

          } else if (activeTool === "texture") {
            // Usa los selects y ranges de texture
            visuals[key] = {
              type: "texture",
              texture: {
                type: document.getElementById("texture-type").value,
                density: parseInt(document.getElementById("texture-density").value)
              }
            };

          } else if (activeTool === "shape") {
            visuals[key] = {
              type: "shape",
              shape: {
                shapeType: document.getElementById("shape-type").value,
                fillColor: document.getElementById("shape-fill-color").value,
                strokeColor: document.getElementById("shape-stroke-color").value,
                size: parseInt(document.getElementById("shape-size").value)
              }
            };
            if (!lastShapeCells.includes(key)) lastShapeCells.push(key);

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

          } else if (activeTool === "erase") {
            delete visuals[key];
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
  const rows = parseInt(sliders.rows?.value() || 2, 10);
  const cols = parseInt(sliders.columns?.value() || 2, 10);
  const w = width;
  const h = height;

  columnPositions = [];
  rowPositions = [];
  gridPoints = [];

  for (let c = 0; c <= cols; c++) {
    columnPositions[c] = (c / cols) * w;
  }
  for (let r = 0; r <= rows; r++) {
    rowPositions[r] = (r / rows) * h;
  }

  for (let r = 0; r <= rows; r++) {
    gridPoints[r] = [];
    for (let c = 0; c <= cols; c++) {
      gridPoints[r][c] = { x: columnPositions[c], y: rowPositions[r] };
    }
  }

  markChanges();
  debounceSaveToFirestore();
}

function computeGridPoints() {
  gridPoints = rowPositions.map(y => columnPositions.map(x => ({ x, y })));
}



// --- Dibujar handles del grid ---
function drawGridHandles() {
  if (MODE === 'view') return;
  if (!editingGrid) return;      // solo en modo edición
  fill('#add8e6');               // azul claro
  stroke(0);                     // negro
  strokeWeight(0.5);

  // Un handle en cada intersección de gridPoints
  for (let r = 0; r < gridPoints.length; r++) {
    for (let c = 0; c < gridPoints[r].length; c++) {
      const { x, y } = gridPoints[r][c];
      circle(x, y, handleRadius * 2);
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
    gridOpacity = map(this.value, 0, 100, 0, 255);
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


//SHAPES

function drawShape(w, h, shapeType = "circle", fillColor = '#000000', strokeColor = '#ffffff', size = 100, r = 0, c = 0, visuals = {}) {
  if (MODE === 'view') return;
  const scale = constrain(size / 100, 0, 1);
  const baseR = min(w, h) * 0.5 * scale;
  const rotationRad = 0;

  const self = visuals[`${r}-${c}`]?.shape;
  if (!self) return;

  // Vecinos compatibles
  function isConnectedWith(r2, c2) {
    const neighbor = visuals[`${r2}-${c2}`]?.shape;
    return neighbor && neighbor.shapeType === shapeType;
  }

  const neighbors = {
    top:    isConnectedWith(r - 1, c),
    right:  isConnectedWith(r, c + 1),
    bottom: isConnectedWith(r + 1, c),
    left:   isConnectedWith(r, c - 1)
  };

  push();
  translate(w / 2, h / 2);
  rotate(rotationRad);


  if (shapeType === "circle") {
    drawCircleConnected(w, h, baseR, neighbors, fillColor, strokeColor);
  }

  else if (shapeType === "square") {
    drawSquareConnected(w, h, baseR, neighbors, fillColor, strokeColor);
  }

  else if (shapeType === "star") {
    drawStarConnected(w, h, baseR, neighbors, fillColor, strokeColor, 5); // o 6, etc.
  }
  
  else if (shapeType === "organic") {
    drawOrganicConnected(w, h, baseR, neighbors, fillColor, strokeColor);
  }
  
  
  pop();
}


//shapes: STAR

function drawStarConnected(w, h, r, neighbors, fillColor, strokeColor, points = 5) {
  if (MODE === 'view') return;
  fill(fillColor);
  stroke(strokeColor);
  strokeWeight(1);

  const angleStep = TWO_PI / (points * 2); // estrella = doble de puntos (pico + valle)
  const innerRadius = r * 0.45;
  const outerRadius = r;

  beginShape();
  for (let i = 0; i < points * 2; i++) {
    const angle = i * angleStep - HALF_PI;

    // Alternar entre pico y valle
    let radius = (i % 2 === 0) ? outerRadius : innerRadius;

    // Detectamos en qué zona está el ángulo para extender si hay conexión
    const deg = degrees((angle + TWO_PI) % TWO_PI);

    if (i % 2 === 0) { // solo extender puntas
      if (neighbors.top    && deg > 250 && deg < 290) radius = h / 2;
      if (neighbors.right  && (deg < 20 || deg > 340)) radius = w / 2;
      if (neighbors.bottom && deg > 70 && deg < 110)   radius = h / 2;
      if (neighbors.left   && deg > 160 && deg < 200)  radius = w / 2;
    }

    const x = cos(angle) * radius;
    const y = sin(angle) * radius;
    vertex(x, y);
  }
  endShape(CLOSE);
}


//shapes: ORGANIC

function smoothEdge(angle, targetDeg, width = 30) {
  const diff = abs(degrees(angle) - targetDeg);
  if (diff > width) return 0;
  return cos(map(diff, 0, width, 0, PI)) * 0.5 + 0.5;
}


function drawOrganicConnected(w, h, r, neighbors, fillColor, strokeColor) {
  if (MODE === 'view') return;
  fill(fillColor);
  stroke(strokeColor);
  strokeWeight(1);

  const steps = 100;
  const noiseFreq = 1.2;
  const noiseAmp = r * 0.6;
  const time = frameCount * 0.005;

  beginShape();
  for (let i = 0; i <= steps; i++) {
    const angle = map(i, 0, steps, 0, TWO_PI);

    const x0 = cos(angle);
    const y0 = sin(angle);

    // Perturbación base
    const n = noise(x0 * noiseFreq + 10, y0 * noiseFreq + 10, time);
    let base = r + (n - 0.5) * noiseAmp;

    // Suavizar conexiones con vecinos
    let connectAmount = 0;
    if (neighbors.top)    connectAmount += smoothEdge(angle, 270);
    if (neighbors.right)  connectAmount += smoothEdge(angle, 0);
    if (neighbors.bottom) connectAmount += smoothEdge(angle, 90);
    if (neighbors.left)   connectAmount += smoothEdge(angle, 180);

    base += connectAmount * r * 1.2; // cuánto se extiende la conexión

    const x = x0 * base;
    const y = y0 * base;
    vertex(x, y);
  }
  endShape(CLOSE);
}


//shapes: CIRCLE
function drawCircleConnected(w, h, r, neighbors, fillColor, strokeColor) {
  if (MODE === 'view') return;
  const steps = 80;
  fill(fillColor);
  stroke(strokeColor);
  strokeWeight(1);
  beginShape();

  for (let i = 0; i <= steps; i++) {
    const angle = map(i, 0, steps, 0, TWO_PI);
    let x = cos(angle) * r;
    let y = sin(angle) * r;

    // Detecta si ese punto toca un extremo
    if (neighbors.top    && y < -r * 0.95) y = -h / 2;
    if (neighbors.bottom && y >  r * 0.95) y =  h / 2;
    if (neighbors.left   && x < -r * 0.95) x = -w / 2;
    if (neighbors.right  && x >  r * 0.95) x =  w / 2;

    vertex(x, y);
  }

  endShape(CLOSE);
}


//SHAPES: SQUARE

function drawSquareConnected(w, h, r, neighbors, fillColor, strokeColor) {
  if (MODE === 'view') return;
  const stepsPerSide = 20;
  const steps = stepsPerSide * 4;
  fill(fillColor);
  stroke(strokeColor);
  strokeWeight(1);

  beginShape();

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    // Mueve el punto alrededor del contorno de un cuadrado
    let x, y;

    if (t <= 0.25) {
      // top edge: left → right
      x = lerp(-r, r, t * 4);
      y = -r;
      if (neighbors.top && abs(x) < r * 0.5) y = -h / 2;
    } else if (t <= 0.5) {
      // right edge: top → bottom
      x = r;
      y = lerp(-r, r, (t - 0.25) * 4);
      if (neighbors.right && abs(y) < r * 0.5) x = w / 2;
    } else if (t <= 0.75) {
      // bottom edge: right → left
      x = lerp(r, -r, (t - 0.5) * 4);
      y = r;
      if (neighbors.bottom && abs(x) < r * 0.5) y = h / 2;
    } else {
      // left edge: bottom → top
      x = -r;
      y = lerp(r, -r, (t - 0.75) * 4);
      if (neighbors.left && abs(y) < r * 0.5) x = -w / 2;
    }

    vertex(x, y);
  }

  endShape(CLOSE);
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
function setupSliderFeedback(selector = '.grid-sliders label') {
  if (MODE !== 'edit') {
    console.log('this is is an editing function');
    return;
  }
  const labels = document.querySelectorAll(selector);
  labels.forEach(label => {
    const slider = label.querySelector('input[type="range"]');
    if (!slider) return;
    if (label.querySelector('.value-bubble')) return;
    const bubble = document.createElement('div');
    bubble.classList.add('value-bubble');
    label.appendChild(bubble);
    let timeout;
    const updateBubble = () => {
      bubble.textContent = slider.value;
      const percent = (slider.value - slider.min) / (slider.max - slider.min);
      bubble.style.left = `${slider.offsetLeft + percent * slider.offsetWidth}px`;
      bubble.style.top = `${slider.offsetTop - 16}px`;
      bubble.classList.add('show');
      clearTimeout(timeout);
      timeout = setTimeout(()=>bubble.classList.remove('show'),1000);
    };
    slider.addEventListener('input', updateBubble);
    updateBubble();
  });
}
function setupToolLogic() {
  if (MODE !== 'edit') {
    console.log('this is is an editing function');
    return;
  }
  const buttons = document.querySelectorAll('.tool-btn');

  const toolNames = {
    gradient: "Gradient",
    shape: "Shape",
    text: "Text",
    image: "Image",
    texture: "Texture",
    grid: "Grid",
    growth: "Growth",
    layers: "Layers",
    erase: "Erase",
    color: "Color"
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', e => {
      const sel = btn.dataset.tool;
      if (!sel) return;

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
    }, 100);
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
    console.log('this is is an editing function');
    return;
  }
  const popup = document.getElementById('info-popup');
  const closeBtn = popup.querySelector('.popup-close');
  const infoBtn = document.getElementById('info-btn');

  // Mostrar al cargar
  popup.style.display = 'flex';
  popup.style.zIndex = ++topZIndex;

  closeBtn.addEventListener('click', () => {
    popup.style.display = 'none';
  });

  infoBtn.addEventListener('click', () => {
    popup.style.display = 'flex';
    popup.style.zIndex = ++topZIndex;
  });

  infoBtn.addEventListener('click', () => {
    // Si está oculto, lo mostramos:
    if (popup.style.display === 'none' || getComputedStyle(popup).display === 'none') {
      popup.style.display = 'flex';
    }
    // Siempre subimos el z-index para que quede al frente:
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

// ─────────────────────────────────────────────────────────────────────────────
// 3) keyPressed(): permitimos que el <textarea> reciba teclas mientras esté enfocado
// ─────────────────────────────────────────────────────────────────────────────
function keyPressed() {
  // Si hay un <textarea> abierto y tiene el foco, devolvemos true:
  if (currentTextarea && document.activeElement === currentTextarea) {
    return true;
  }

  // Si no hay bloque en edición, seguimos con p5 normal:
  if (!activeTextEdit) {
    return true;
  }

  // Resto de tu lógica de edición “canvas‐interno” (cursor, selección, borrar, etc.)
  const visual = window.activeLayer.visuals[activeTextEdit];
  if (!visual?.text) {
    return true;
  }

  const content = visual.text.content;
  const hasSelection = textSelectionStart >= 0 && textSelectionStart !== textCursor;
  const selStart = min(textSelectionStart, textCursor);
  const selEnd   = max(textSelectionStart, textCursor);
  // Tras cualquier cambio en visual.text.content:
const gm = getGridMetrics();
const cellW = gm.cellW;
const cellH = gm.cellH;
const paddingX   = cellW * 0.05;
const paddingY   = cellH * visual.text.lineHeight * 0.5; // ejemplo, 50% padding vertical
const usableWidth  = visual._widthPx  - 2 * paddingX;
const usableHeight = visual._heightPx - 2 * paddingY;
const lineHeightPx = cellH * visual.text.lineHeight;
const maxLines     = Math.floor(usableHeight / lineHeightPx);

const ctx = drawingContext;
ctx.font = `${visual.text.size}px ${visual.text.font}`;
visual._wrappedLines = wrapTextInBox(
  ctx,
  visual.text.content,
  usableWidth,
  maxLines,
  lineHeightPx,
  true
);
redraw();


  if (
    hasSelection &&
    (
      keyCode === BACKSPACE ||
      keyCode === DELETE ||
      (key.length === 1 && !keyIsDown(CONTROL) && !keyIsDown(91))
    )
  ) {
    visual.text.content = content.substring(0, selStart) + content.substring(selEnd);
    textCursor = selStart;
    textSelectionStart = -1;
    textCursorVisible = true;
    lastCursorBlink = millis();
    redraw();
    return false;
  }

  if (keyIsDown(CONTROL) || keyIsDown(91)) {
    return true;
  }

  switch (keyCode) {
    case BACKSPACE:
      if (textCursor > 0) {
        visual.text.content =
          content.substring(0, textCursor - 1) +
          content.substring(textCursor);
        textCursor--;
      }
      break;
    case DELETE:
      if (textCursor < content.length) {
        visual.text.content =
          content.substring(0, textCursor) +
          content.substring(textCursor + 1);
      }
      break;
    case LEFT_ARROW:
      textCursor = max(0, textCursor - 1);
      break;
    case RIGHT_ARROW:
      textCursor = min(content.length, textCursor + 1);
      break;
    case 36: // Home
      textCursor = 0;
      break;
    case 35: // End
      textCursor = content.length;
      break;
    case ENTER:
      visual.text.content =
        content.substring(0, textCursor) +
        '\n' +
        content.substring(textCursor);
      textCursor++;
      break;
    default:
      if (key.length === 1) {
        visual.text.content =
          content.substring(0, textCursor) +
          key +
          content.substring(textCursor);
        textCursor++;
      }
  }

  textCursorVisible = true;
  lastCursorBlink = millis();
  return false;
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

const imageScaleValue  = document.getElementById("image-scale-value");
imageScaleSlider.addEventListener("input", () => {
  const visuals = window.activeLayer.visuals; // <--- IMPORTANTE
  if (activeTool === "image" && activeImageEdit && visuals[activeImageEdit]) {
    visuals[activeImageEdit].scale = parseFloat(imageScaleSlider.value);
    saveVisuals(); // si quieres guardar el cambio
  }
});


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

///////GROW

function setupGrowthIntegration() {
  if (MODE !== 'edit') {
    activeBorderColor = color(0, 255, 0);
    return;
  }

  const applyBtn = document.getElementById('applyGrowthBtn');
  if (!applyBtn) {
    console.error('Apply Growth button not found');
    activeBorderColor = color(0, 255, 0);
    return;
  }

  // Remove existing listeners to prevent duplicates
  const newApplyBtn = applyBtn.cloneNode(true);
  applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);

  newApplyBtn.addEventListener('click', async () => {
    try {
      // Validate slider values
      const cfg = {
        sun: Number(sliders.sun?.value() ?? 0),
        water: Number(sliders.water?.value() ?? 0),
        vitamins: Number(sliders.vitamins?.value() ?? 0),
        days: Number(sliders.days?.value() ?? 0),
        startDate: firebase.firestore.FieldValue.serverTimestamp()
      };

      // Sanitization function
      function sanitizeObject(obj, seen = new WeakSet()) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (seen.has(obj)) return null;
        seen.add(obj);
        if (obj instanceof p5.Color) return obj.toString().replace(/ /g, '');
        if (obj instanceof p5.Graphics) return null;
        if (obj instanceof p5.Image) return null;
        if (obj instanceof p5.Vector) return { x: obj.x, y: obj.y, z: obj.z || 0 };
        if (obj instanceof firebase.firestore.Timestamp) return obj;
        if (obj instanceof Date) return obj.toISOString();
        if (typeof obj === 'function') return undefined;
        if (typeof obj.toString === 'function' && obj.toString !== Object.prototype.toString) {
          try { return obj.toString(); } catch { return null; }
        }
        const cleanObj = Array.isArray(obj) ? [] : {};
        for (const k in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, k)) {
            cleanObj[k] = sanitizeObject(obj[k], seen);
          }
        }
        return cleanObj;
      }

      // Sanitize layers
      const sanitizedLayers = window.layers.map(layer => ({
        id: layer.id || generateLayerID(),
        name: layer.name || `Layer ${window.layers.indexOf(layer) + 1}`,
        type: layer.type || 'gradient',
        color: typeof layer.color === 'string' ? layer.color : randomColorFromNeonPalette(),
        visible: typeof layer.visible === 'boolean' ? layer.visible : true,
        visuals: Object.keys(layer.visuals || {}).reduce((acc, key) => {
          let visual = { ...layer.visuals[key] };
          visual = sanitizeObject(visual);

          if (visual.colors) {
            visual.colors = Array.isArray(visual.colors)
              ? visual.colors.map(c => typeof c === 'string' ? c : c?.toString()?.replace(/ /g, '') ?? '#ffffff')
              : [];
          }
          if (visual.text) {
            visual.text = {
              content: String(visual.text?.content ?? ''),
              color: typeof visual.text?.color === 'string' ? visual.text.color : (visual.text?.color?.toString()?.replace(/ /g, '') ?? '#000000'),
              font: String(visual.text?.font ?? 'sans-serif'),
              size: Number(visual.text?.size ?? 20),
              lineHeight: Number(visual.text?.lineHeight ?? 24),
              kerning: Number(visual.text?.kerning ?? 0),
              align: String(visual.text?.align ?? 'left'),
              extrude: Number(visual.text?.extrude ?? 0),
              branches: Number(visual.text?.branches ?? 0),
              hue: Number(visual.text?.hue ?? 0)
            };
          }
          if (visual.shape) {
            visual.shape = {
              shapeType: String(visual.shape?.shapeType ?? 'circle'),
              fillColor: typeof visual.shape?.fillColor === 'string' ? visual.shape.fillColor : (visual.shape?.fillColor?.toString()?.replace(/ /g, '') ?? '#ffffff'),
              strokeColor: typeof visual.shape?.strokeColor === 'string' ? visual.shape.strokeColor : (visual.shape?.strokeColor?.toString()?.replace(/ /g, '') ?? '#ffffff'),
              size: Number(visual.shape?.size ?? 100),
              opacity: Number(visual.shape?.opacity ?? 1),
              extrudePct: Number(visual.shape?.extrudePct ?? 0),
              subdivisions: Number(visual.shape?.subdivisions ?? 0),
              tint: visual.shape?.tint ? String(visual.shape.tint) : null
            };
          }
          if (visual.bloom) {
            visual.bloom = {
              sigma: Number(visual.bloom?.sigma ?? 0),
              intensity: Number(visual.bloom?.intensity ?? 0)
            };
          }
          if (visual.speckles) {
            visual.speckles = {
              pct: Number(visual.speckles?.pct ?? 0),
              radius: Number(visual.speckles?.radius ?? 0)
            };
          }
          if (visual.img) {
            visual.img = typeof visual.img === 'string' ? visual.img : '';
          }
          acc[key] = visual;
          return acc;
        }, {})
      }));

      const gridConfig = {
        rows: parseInt(sliders.rows?.value() ?? 2, 10),
        cols: parseInt(sliders.columns?.value() ?? 2, 10),
        canvasWidth: Number(width ?? 800),
        canvasHeight: Number(height ?? 600)
      };

      const data = {
        seedCode: seed,
        plantedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        growthConfig: {
          sun: cfg.sun,
          water: cfg.water,
          vitamins: cfg.vitamins,
          days: cfg.days,
          startDate: cfg.startDate
        },
        originalLayers: sanitizedLayers,
        layers: sanitizedLayers,
        gridConfig,
        growthProgress: 0,
        locked: true
      };

      console.log('Saving data to Firestore:', data); // simplificado para evitar stack overflow
      await seedsCol.doc(seed).set(data, { merge: true });

      alert(`✅ Growth settings and layers saved for seed ${seed}`);
      markChanges();
      if (window.growthManager) {
        window.growthManager.init(seed);
        window.growthManager.applyGrowthConfig(cfg.sun, cfg.water, cfg.vitamins, cfg.days);
        disableEditingControls();
      } else {
        console.error('growthManager not available');
      }
    } catch (err) {
      console.error('Error saving growth settings:', err);
      alert(`❌ Error saving growth settings: ${err.message}`);
    }
  });

  activeBorderColor = color(0, 255, 0);
}