const DAY_IN_MINUTES = 1; // 1 day = 1 minute for debugging
const firebaseConfig = {
  apiKey: "AIzaSyAN1_EbV_HesrVr2PUZEqwH5xkT23jNXko",
  authDomain: "root-online.firebaseapp.com",
  projectId: "root-online",
  storageBucket: "root-online.firebasestorage.app",
  messagingSenderId: "414106332565",
  appId: "1:414106332565:web:54bd602fe0657f25435a9c"
};

function initializeFirebase(retries = 3, delay = 1000) {
  if (typeof firebase === 'undefined') {
    console.warn(`Firebase SDK not loaded. Retrying ${retries} more time(s) in ${delay}ms...`);
    if (retries > 0) {
      setTimeout(() => initializeFirebase(retries - 1, delay * 2), delay);
      return;
    } else {
      console.error('Firebase failed to load after retries. Ensure Firebase SDK script is included before common.js and check network connectivity.');
      return;
    }
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      window.seedsCol = firebase.firestore().collection('seeds');
      console.log('Firebase initialized successfully, seedsCol defined');
    } else {
      window.seedsCol = firebase.firestore().collection('seeds');
      console.log('Firebase already initialized, seedsCol assigned');
    }
  } catch (err) {
    console.error('Firebase initialization failed:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializeFirebase();
});

function computeElapsedDays(ts) {
  const then = ts?.toDate ? ts.toDate() : new Date();
  const now = new Date();
  const diff = now - then;
  return Math.max(0, Math.min(21, diff / (1000 * 60 * 60 * 24)));
}

function generateSeed() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let seed = '';
  for (let i = 0; i < 7; i++) {
    seed += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return seed;
}

window.layers = [];
window.originalLayers = [];
window.activeLayer = null;

function generateLayerID() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
}

function randomColorFromNeonPalette() {
  const neonPalette = [
    [255, 255, 255], // blanco
    [55, 55, 55],    // gris
    [31, 96, 237],   // azul de la marca
    [116, 82, 91],   // café
    [116, 91, 216],  // morado
    [202, 109, 216], // rosado
    [208, 252, 118], // amarillo de la marca
    [255, 82, 91]    // rojo candente
  ];
  const arr = neonPalette[Math.floor(Math.random() * neonPalette.length)];
  return `rgb(${arr[0]}, ${arr[1]}, ${arr[2]})`;
}


window.loadSeed = function(data) {
  if (data.gridConfig) {
    window.gridConfig = window.gridConfig || {};
    window.gridConfig.rows         = data.gridConfig.rows         || 2;
    window.gridConfig.cols         = data.gridConfig.cols         || 2;
    window.gridConfig.canvasWidth  = data.gridConfig.canvasWidth  || 800;
    window.gridConfig.canvasHeight = data.gridConfig.canvasHeight || 600;
  }

  if (data.layers && Array.isArray(data.layers)) {
    window.layers = data.layers.map(rawLayer => {
      const layer = rawLayer instanceof Map ? Object.fromEntries(rawLayer) : { ...rawLayer };
      const visualsMap = layer.visuals instanceof Map ? Object.fromEntries(layer.visuals) : layer.visuals || {};

      layer.visuals = Object.fromEntries(
        Object.entries(visualsMap).map(([cellKey, rawVisual]) => {
          const visualObj = rawVisual instanceof Map ? Object.fromEntries(rawVisual) : { ...rawVisual };
          const gradient = visualObj.gradient || {};
          const colors     = Array.isArray(gradient.colors)    ? gradient.colors     : [];
          const offset     = typeof gradient.offset === 'number'     ? gradient.offset     : 0;
          const direction  = typeof gradient.direction === 'number'  ? gradient.direction  : 0;
          const scale      = typeof gradient.scale === 'number'      ? gradient.scale      : 1;
          const distortion = typeof gradient.distortion === 'number' ? gradient.distortion : 0;

          return [ cellKey, {
            type: visualObj.type || layer.type || 'empty',
            colors,
            offset,
            direction,
            scale,
            distortion,
            bloom: visualObj.bloom || { sigma: 0, intensity: 0 },
            shape: {
              shapeType:   visualObj.shape?.shapeType   || 'circle',
              fillColor:   visualObj.shape?.fillColor   || '#ffffff',
              strokeColor: visualObj.shape?.strokeColor || '#000000',
              size:        visualObj.shape?.size        || 1,
              opacity:     visualObj.shape?.opacity     || 1,
              extrudePct:  visualObj.shape?.extrudePct  || 0,
              subdivisions:visualObj.shape?.subdivisions|| 0,
              tint:        visualObj.shape?.tint        || null
            },
            text:     visualObj.text     || { extrude: 0, branches: 0, hue: 0, content: "" },
            speckles: visualObj.speckles || { pct: 0, radius: 0 }
          }];
        })
      );

      return layer;
    });

    window.activeLayer = window.layers[0] || null;
  } else {
    window.layers = [{
      id:      generateLayerID(),
      name:    "Layer 1",
      type:    "gradient",
      color:   randomColorFromNeonPalette(),
      visible: true,
      visuals: {
        '0-0': {
          type:     "gradient",
          colors:   [randomColorFromNeonPalette(), randomColorFromNeonPalette(), randomColorFromNeonPalette()],
          offset:     0,
          direction:  0,
          scale:      1,
          distortion: 0,
          bloom:   { sigma: 0, intensity: 0 },
          shape: {
            shapeType:   'circle',
            fillColor:   '#ffffff',
            strokeColor: '#000000',
            size:        1,
            opacity:     1,
            extrudePct:  0,
            subdivisions:0,
            tint:        null
          },
          text:     { extrude: 0, branches: 0, hue: 0, content: "" },
          speckles: { pct: 0, radius: 0 }
        }
      }
    }];
    window.activeLayer = window.layers[0];
  }
  console.log('✅ Seed loaded from layers', JSON.stringify(window.layers, null, 2));
};

function drawSeed(p, isGrown) {
  const { rows, cols } = window.gridConfig || { rows: 1, cols: 1 };
  const cellW = p.width / cols;
  const cellH = p.height / rows;

  if (!window.layers) return;

  for (let l = 0; l < window.layers.length; l++) {
    const layer = window.layers[l];
    if (!layer.visuals) continue;

    for (const [cellKey, visual] of Object.entries(layer.visuals)) {
      const [col, row] = cellKey.split(',').map(Number);
      const x = col * cellW;
      const y = row * cellH;

      p.push();
      p.translate(x + cellW / 2, y + cellH / 2);

      if (visual.type === 'gradient') {
        const colors = visual.colors || ['#000000', '#ffffff', '#000000'];
        const direction = visual.direction || 0;
        const gradientLength = Math.min(cellW, cellH);

        const c0 = p.color(colors[0]);
        const c1 = p.color(colors[1]);
        for (let i = 0; i < gradientLength; i++) {
          const inter = p.lerpColor(c0, c1, i / gradientLength);
          p.stroke(inter);
          if (direction === 0) p.line(-cellW / 2 + i, -cellH / 2, -cellW / 2 + i, cellH / 2); // horizontal
          else p.line(-cellW / 2, -cellH / 2 + i, cellW / 2, -cellH / 2 + i); // vertical
        }
      } else if (visual.type === 'shape') {
        const s = visual.shape || {};
        p.fill(s.fillColor || '#ffffff');
        p.stroke(s.strokeColor || '#000000');
        p.ellipse(0, 0, s.size * cellW || 20);
      }

      else if (visual.type === "shape" && visual.shape) {
        const s = visual.shape;
        console.log(`Rendering shape at ${key}:`, s);
        drawShape(
          p,
          w,
          h,
          s.shapeType || "circle",
          s.fillColor   || "#ffffff",
          s.strokeColor || "#000000",
          s.size        || 1,
          r, c,
          visuals
        );
        if (isGrowing && visual.bloom) applyBloomExpansion(p, visual); // usa esta para formas
      }
      
      p.pop();
    }
  }
}


function applyVineCurl(p, visual, w, h) {
  if (visual.text.extrude) p.scale(1 + visual.text.extrude / 100);
  if (visual.text.branches) {
    for (let i = 0; i < visual.text.branches; i++) {
      p.push();
      p.translate(Math.sin(i) * 10, Math.cos(i) * 10);
      p.text(visual.text.content, w / 2, h / 2);
      p.pop();
    }
  }
  if (visual.text.hue) p.tint(visual.text.hue, 255);
}

function applyChlorophyllRadiance(p, visual) {
  if (visual.bloom.sigma) p.filter(p.BLUR, visual.bloom.sigma * (visual.bloom.intensity || 1));
}

function applyBloomExpansion(p, visual) {
  if (visual.shape.extrudePct) {
    const scaleFactor = Math.max(0.1, Math.min(1 + visual.shape.extrudePct / 100, 5));
    console.log(`Applying bloom expansion: scale=${scaleFactor}`);
    p.scale(scaleFactor);
  }
  if (visual.shape.subdivisions) subdivideShape(p, visual.shape.subdivisions);
  if (visual.shape.tint) {
    const validTints = {
      'cerulean': 'rgb(0, 123, 255)',
      'rose-gold': 'rgb(183, 110, 121)',
      'neon-lavender': 'rgb(230, 230, 250)',
      'neon-azure': 'rgb(0, 255, 255)'
    };
    const tintColor = validTints[visual.shape.tint] || '#ffffff';
    p.tint(tintColor);
  }
}

function applyMossMirage(p, visual, w, h) {
  if (visual.speckles.pct) addSpeckles(p, w, h, visual.speckles.pct, visual.speckles.radius, visual.tint);
  if (visual.blur) p.filter(p.BLUR, visual.blur);
}
window.drawSeed = function(p, isGrowing = false) {
  console.log('Drawing seed, frameCount:', p.frameCount, 'isGrowing:', isGrowing, 'layers:', window.layers);
  p.clear();
  p.background(255, 255, 255, 0); // Transparent background

  // Validate data
  if (!window.layers || !Array.isArray(window.layers) || !window.gridConfig) {
    console.warn('No seed data or grid config');
    p.background(200);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('No seed data or grid config', p.width / 2, p.height / 2);
    return;
  }

  const { rows, cols } = window.gridConfig;
  const cellWidth  = p.width  / cols;
  const cellHeight = p.height / rows;

  // Draw grid
  drawGrid(p, rows, cols, cellWidth, cellHeight);

  // Render each layer (skip only when visible === false)
  window.layers.forEach((layer, index) => {
    if (!layer || layer.visible === false) {
      console.log(`Skipping layer ${index}: ${layer ? 'hidden' : 'undefined'}`);
      return;
    }
    console.log(`Rendering layer ${index}: ${layer.name}`);
    window.activeLayer = layer;
    const visuals = layer.visuals || {};

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r}-${c}`;
        let visual = visuals[key] || {
          type: 'empty',
          colors: [],
          offset: 0,
          direction: 0,
          scale: 1,
          distortion: 0,
          bloom: { sigma: 0, intensity: 0 },
          shape: {
            shapeType: 'circle',
            fillColor: '#ffffff',
            strokeColor: '#000000',
            size: 1,
            opacity: 1,
            extrudePct: 0,
            subdivisions: 0,
            tint: null
          },
          text: { extrude: 0, branches: 0, hue: 0, content: "" },
          speckles: { pct: 0, radius: 0 }
        };
        console.log(`Processing visual at ${key}:`, visual);

        const x = c * cellWidth;
        const y = r * cellHeight;
        const w = cellWidth;
        const h = cellHeight;

        p.push();
        p.translate(x, y);
        try {
          if (visual.type === "gradient" && visual.colors.length) {
            p.noStroke();
            drawAnimatedGradient(p,
              { x: 0, y: 0 },
              { x: w, y: 0 },
              { x: 0, y: h },
              visual.colors,
              visual.offset || 0
            );
            if (isGrowing) applyChlorophyllRadiance(p, visual);
            if (isGrowing && visual.speckles.pct) applyMossMirage(p, visual, w, h);
          }
          else if (visual.type === "shape" && visual.shape) {
            console.log(`Rendering shape at ${key}:`, visual.shape);
            const s = visual.shape;
            p.push();
              p.noFill();
              p.stroke(s.strokeColor);
              p.strokeWeight(s.size);
              p.ellipse(w/2, h/2, s.size * Math.min(w, h));
            p.pop();
            if (isGrowing && visual.bloom) applyBloom(p, visual.bloom);
          }
          else if (visual.type === "text" && visual.text.content) {
            // implement text rendering...
          }
          else {
            console.log(`Skipping visual at ${key}: invalid or empty type`);
          }
        } catch (err) {
          console.error(`Error rendering visual at ${key}:`, err);
        }
        p.pop();
      }
    }
  });

  // Reset activeLayer to first
  window.activeLayer = window.layers[0] || null;
};


function addSpeckles(p, w, h, pct, radius, tint) {
  const count = (w * h * pct) / 10000;
  for (let i = 0; i < count; i++) {
    p.fill(tint || randomColorFromNeonPalette());
    p.ellipse(p.random(w), p.random(h), radius * 2);
  }
}

function subdivideShape(p, subdivisions) {
  p.scale(1 + subdivisions * 0.1); // Basic implementation
}

function drawAnimatedGradient(p, p00, p10, p11, p01, colors, offset) {
  const steps = Math.max(p.dist(p00.x, p00.y, p01.x, p01.y), p.dist(p10.x, p10.y, p11.x, p11.y));
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;

    const A = { x: p.lerp(p00.x, p01.x, t0), y: p.lerp(p00.y, p01.y, t0) };
    const B = { x: p.lerp(p10.x, p11.x, t0), y: p.lerp(p10.y, p11.y, t0) };
    const C = { x: p.lerp(p10.x, p11.x, t1), y: p.lerp(p10.y, p11.y, t1) };
    const D = { x: p.lerp(p00.x, p01.x, t1), y: p.lerp(p00.y, p01.y, t1) };

    let tt = (t0 + offset + p.frameCount * 0.01) % 1;
    let col = (colors.length === 3)
      ? (tt < 0.5
        ? p.lerpColor(p.color(colors[0]), p.color(colors[1]), tt * 2)
        : p.lerpColor(p.color(colors[1]), p.color(colors[2]), (tt - 0.5) * 2))
      : p.lerpColor(p.color(colors[0]), p.color(colors[1] || colors[0]), tt);
    p.fill(col);
    p.beginShape();
    p.vertex(A.x, A.y);
    p.vertex(B.x, B.y);
    p.vertex(C.x, C.y);
    p.vertex(D.x, D.y);
    p.endShape(p.CLOSE);
  }
}

function drawShape(p, w, h, shapeType = "circle", fillColor = '#ffffff', strokeColor = '#ffffff', size = 100, r = 0, c = 0, visuals = {}) {
  const scale = p.constrain(size / 100, 0, 1);
  const baseR = p.min(w, h) * 0.5 * scale;
  const rotationRad = 0;

  const self = visuals[`${r}-${c}`]?.shape;
  if (!self) {
    console.warn(`No shape data at ${r}-${c}`);
    return;
  }

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

  p.push();
  p.translate(w / 2, h / 2);
  p.rotate(rotationRad);

  if (shapeType === "circle") {
    drawCircleConnected(p, w, h, baseR, neighbors, fillColor, strokeColor);
  } else if (shapeType === "square") {
    drawSquareConnected(p, w, h, baseR, neighbors, fillColor, strokeColor);
  } else if (shapeType === "star") {
    drawStarConnected(p, w, h, baseR, neighbors, fillColor, strokeColor, 5);
  } else if (shapeType === "organic") {
    drawOrganicConnected(p, w, h, baseR, neighbors, fillColor, strokeColor);
  } else {
    console.warn(`Invalid shapeType: ${shapeType}`);
  }

  p.pop();
}

function drawCircleConnected(p, w, h, r, neighbors, fillColor, strokeColor) {
  const steps = 80;
  p.fill(fillColor);
  p.stroke(strokeColor);
  p.strokeWeight(1);
  p.beginShape();

  for (let i = 0; i <= steps; i++) {
    const angle = p.map(i, 0, steps, 0, p.TWO_PI);
    let x = p.cos(angle) * r;
    let y = p.sin(angle) * r;

    if (neighbors.top && y < -r * 0.95) y = -h / 2;
    if (neighbors.bottom && y > r * 0.95) y = h / 2;
    if (neighbors.left && x < -r * 0.95) x = -w / 2;
    if (neighbors.right && x > r * 0.95) x = w / 2;

    p.vertex(x, y);
  }

  p.endShape(p.CLOSE);
}

function smoothEdge(p, angle, targetDeg, width = 30) {
  const diff = p.abs(p.degrees(angle) - targetDeg);
  if (diff > width) return 0;
  return p.cos(p.map(diff, 0, width, 0, p.PI)) * 0.5 + 0.5;
}

function drawOrganicConnected(p, w, h, r, neighbors, fillColor, strokeColor) {
  p.fill(fillColor);
  p.stroke(strokeColor);
  p.strokeWeight(1);

  const steps = 100;
  const noiseFreq = 1.2;
  const noiseAmp = r * 0.6;
  const time = p.frameCount * 0.005;

  p.beginShape();
  for (let i = 0; i <= steps; i++) {
    const angle = p.map(i, 0, steps, 0, p.TWO_PI);
    const x0 = p.cos(angle);
    const y0 = p.sin(angle);
    const n = p.noise(x0 * noiseFreq + 10, y0 * noiseFreq + 10, time);
    let base = r + (n - 0.5) * noiseAmp;

    let connectAmount = 0;
    if (neighbors.top) connectAmount += smoothEdge(p, angle, 270);
    if (neighbors.right) connectAmount += smoothEdge(p, angle, 0);
    if (neighbors.bottom) connectAmount += smoothEdge(p, angle, 90);
    if (neighbors.left) connectAmount += smoothEdge(p, angle, 180);

    base += connectAmount * r * 1.2;

    const x = x0 * base;
    const y = y0 * base;
    p.vertex(x, y);
  }
  p.endShape(p.CLOSE);
}

function drawSquareConnected(p, w, h, r, neighbors, fillColor, strokeColor) {
  const stepsPerSide = 20;
  const steps = stepsPerSide * 4;
  p.fill(fillColor);
  p.stroke(strokeColor);
  p.strokeWeight(1);
  p.beginShape();

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let x, y;

    if (t <= 0.25) {
      x = p.lerp(-r, r, t * 4);
      y = -r;
      if (neighbors.top && p.abs(x) < r * 0.5) y = -h / 2;
    } else if (t <= 0.5) {
      x = r;
      y = p.lerp(-r, r, (t - 0.25) * 4);
      if (neighbors.right && p.abs(y) < r * 0.5) x = w / 2;
    } else if (t <= 0.75) {
      x = p.lerp(r, -r, (t - 0.5) * 4);
      y = r;
      if (neighbors.bottom && p.abs(x) < r * 0.5) y = h / 2;
    } else {
      x = -r;
      y = p.lerp(r, -r, (t - 0.75) * 4);
      if (neighbors.left && p.abs(y) < r * 0.5) x = -w / 2;
    }

    p.vertex(x, y);
  }

  p.endShape(p.CLOSE);
}

function drawGrid(p, rows, cols, cellWidth, cellHeight) {
  p.noFill();
  p.stroke(0);
  p.strokeWeight(1);

  for (let c = 0; c <= cols; c++) {
    const x = c * cellWidth;
    p.line(x, 0, x, p.height);
  }

  for (let r = 0; r <= rows; r++) {
    const y = r * cellHeight;
    p.line(0, y, p.width, y);
  }
}

function drawGradient(p, gradient) {
  const { colors, direction = 0, scale = 1, distortion = 0, offset = 0 } = gradient;
  const w = p.width;
  const h = p.height;

  p.push();
  p.translate(w / 2, h / 2 + offset);
  p.rotate(p.radians(direction));
  p.scale(scale);

  const grad = p.drawingContext.createLinearGradient(-w / 2, 0, w / 2, 0);
  const step = 1 / (colors.length - 1);
  colors.forEach((color, i) => {
    grad.addColorStop(i * step, color);
  });

  p.drawingContext.fillStyle = grad;
  const dx = distortion * 10;
  const dy = distortion * 10;
  p.rect(-w / 2 + dx, -h / 2 + dy, w - 2 * dx, h - 2 * dy);
  p.pop();
}