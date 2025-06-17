// Firebase Setup
const DAY_IN_MINUTES = 1; // 1 day = 1 minute for debugging //
const firebaseConfig = {
    apiKey: "AIzaSyAN1_EbV_HesrVr2PUZEqwH5xkT23jNXko",
    authDomain: "root-online.firebaseapp.com",
    projectId: "root-online",
    storageBucket: "root-online.firebasestorage.app",
    messagingSenderId: "414106332565",
    appId: "1:414106332565:web:54bd602fe0657f25435a9c"
};


// Initialize Firebase
if (typeof firebase === 'undefined') {
    console.error('Firebase is not defined. Check script loading.');
} else {
    firebase.initializeApp(firebaseConfig);
    window.seedsCol = firebase.firestore().collection('seeds');
    console.log('Firebase initialized, seedsCol defined');
}

// Shared Utility Functions
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

// Moved from sketch.js: Simplified version for harvest
window.layers = [];
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
        if (!window.gridConfig) window.gridConfig = {};
        window.gridConfig.rows = data.gridConfig.rows || 2;
        window.gridConfig.cols = data.gridConfig.cols || 2;
        window.gridConfig.canvasWidth = data.gridConfig.canvasWidth || 800;
        window.gridConfig.canvasHeight = data.gridConfig.canvasHeight || 600;
    }
    if (data.layers && Array.isArray(data.layers)) {
        window.layers = data.layers.map(layer => {
            layer.visuals = Object.fromEntries(
                Object.entries(layer.visuals || {}).map(([key, visual]) => [
                    key,
                    {
                        ...visual,
                        bloom: visual.bloom || { sigma: 0, intensity: 0 },
                        shape: visual.shape || { extrudePct: 0, opacity: 0, subdivisions: 0, tint: null },
                        text: visual.text || { extrude: 0, branches: 0, hue: 0, content: "" },
                        speckles: visual.speckles || { pct: 0, radius: 0 }
                    }
                ])
            );
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
            visuals: {
                '0-0': {
                    type: "gradient",
                    colors: [randomColorFromNeonPalette(), randomColorFromNeonPalette(), randomColorFromNeonPalette()],
                    offset: 0,
                    bloom: { sigma: 0, intensity: 0 },
                    shape: { extrudePct: 0, opacity: 0, subdivisions: 0, tint: null },
                    text: { extrude: 0, branches: 0, hue: 0, content: "" },
                    speckles: { pct: 0, radius: 0 }
                }
            }
        }];
        window.activeLayer = window.layers[0];
    }
    console.log(`✅ Seed loaded from layers`, window.layers);
};

function applyVineCurl(p, visual, w, h) {
    if (visual.text.extrude) p.scale(1 + visual.text.extrude / 100);
    if (visual.text.branches) {
        // Simulate branching by duplicating text with offset
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
    if (visual.shape.extrudePct) p.scale(1 + visual.shape.extrudePct / 100);
    if (visual.shape.subdivisions) subdivideShape(p, visual.shape.subdivisions);
    if (visual.shape.tint) p.tint(visual.shape.tint);
}

function applyMossMirage(p, visual, w, h) {
    if (visual.speckles.pct) addSpeckles(p, w, h, visual.speckles.pct, visual.speckles.radius, visual.tint);
    if (visual.blur) p.filter(p.BLUR, visual.blur);
}

window.drawSeed = function(p) {
    console.log('Drawing seed, frameCount:', p.frameCount);
    p.clear();
    if (!window.layers || !Array.isArray(window.layers) || !window.gridConfig) {
        p.background(200);
        p.textAlign(p.CENTER, p.CENTER);
        p.text('No seed data or grid config', p.width / 2, p.height / 2);
        return;
    }

    const { rows, cols, canvasWidth, canvasHeight } = window.gridConfig;
    const cellWidth = p.width / cols;
    const cellHeight = p.height / rows;

    drawGrid(p, rows, cols, cellWidth, cellHeight);

    window.layers.forEach((layer, index) => {
        if (layer.visible) {
            window.activeLayer = layer;
            const visuals = layer.visuals || {};

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const key = `${r}-${c}`;
                    let visual = visuals[key] || {
                        type: "empty",
                        bloom: { sigma: 0, intensity: 0 },
                        shape: { extrudePct: 0, opacity: 0, subdivisions: 0, tint: null },
                        text: { extrude: 0, branches: 0, hue: 0, content: "" },
                        speckles: { pct: 0, radius: 0 }
                    };

                    const x = c * cellWidth;
                    const y = r * cellHeight;
                    const w = cellWidth;
                    const h = cellHeight;

                    p.push();
                    p.translate(x, y);

                    if (visual.type === "gradient" && visual.colors && visual.colors.length) {
                        p.noStroke();
                        drawAnimatedGradient(p, { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }, visual.colors, visual.offset || 0);
                        applyChlorophyllRadiance(p, visual);
                        if (visual.speckles.pct) addSpeckles(p, w, h, visual.speckles.pct, visual.speckles.radius, visual.tint);
                    } else if (visual.type === "text" && visual.text && visual.text.content) {
                        p.textSize(visual.text.size || 20);
                        p.fill(visual.text.color || 0);
                        p.textAlign(p.CENTER, p.CENTER);
                        p.text(visual.text.content, w / 2, h / 2);
                        applyVineCurl(p, visual, w, h);
                        if (visual.speckles.pct) addSpeckles(p, w, h, visual.speckles.pct, visual.speckles.radius, visual.tint);
                    } else if (visual.type === "image" && visual.img) {
                        p.loadImage(visual.img, (img) => {
                            p.image(img, 0, 0, w * (visual.scale || 1), h * (visual.scale || 1));
                            applyMossMirage(p, visual, w, h);
                        }, () => console.error('Image load failed for', visual.img));
                    } else if (visual.type === "shape" && visual.shape) {
                        drawShape(p, w, h, visual.shape.shapeType, visual.shape.fillColor, visual.shape.strokeColor, visual.shape.size || 1);
                        applyBloomExpansion(p, visual);
                        if (visual.speckles.pct) addSpeckles(p, w, h, visual.speckles.pct, visual.speckles.radius, visual.tint);
                    }

                    p.pop();
                }
            }
        }
    });
    window.activeLayer = window.layers[0] || null;
};

// Funciones auxiliares (deben estar definidas)
function addSpeckles(p, w, h, pct, radius, tint) {
    const count = (w * h * pct) / 10000;
    for (let i = 0; i < count; i++) {
        p.fill(tint || randomColorFromNeonPalette());
        p.ellipse(p.random(w), p.random(h), radius * 2);
    }
}

function subdivideShape(p, subdivisions) {
    p.scale(1 + subdivisions * 0.1); // Implementación básica
}
// Helper function for animated gradient (from sketch.js)
function drawAnimatedGradient(p, p00, p10, p11, p01, colors, offset) {
    const steps = Math.max(p.dist(p00.x, p00.y, p01.x, p01.y), p.dist(p10.x, p10.y, p11.x, p11.y));
    for (let i = 0; i < steps; i++) {
        const t0 = i / steps;
        const t1 = (i + 1) / steps;

        const A = { x: p.lerp(p00.x, p01.x, t0), y: p.lerp(p00.y, p01.y, t0) };
        const B = { x: p.lerp(p10.x, p11.x, t0), y: p.lerp(p10.y, p11.y, t0) };
        const C = { x: p.lerp(p10.x, p11.x, t1), y: p.lerp(p10.y, p11.y, t1) };
        const D = { x: p.lerp(p00.x, p01.x, t1), y: p.lerp(p00.y, p01.y, t1) };

        let tt = (t0 + offset + p.frameCount * 0.01) % 1; // Animation via frameCount
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

// Helper function for shape rendering (simplified from sketch.js)
function drawShape(p, w, h, shapeType, fillColor, strokeColor, size) {
    p.noStroke();
    p.fill(fillColor || 0);
    if (strokeColor) {
        p.stroke(strokeColor);
        p.strokeWeight(1);
    }
    const centerX = w / 2;
    const centerY = h / 2;
    const scaledSize = size * Math.min(w, h);

    if (shapeType === "circle") {
        p.ellipse(centerX, centerY, scaledSize, scaledSize);
    } else if (shapeType === "square") {
        p.rectMode(p.CENTER);
        p.rect(centerX, centerY, scaledSize, scaledSize);
    } else if (shapeType === "triangle") {
        p.triangle(
            centerX, centerY - scaledSize / 2,
            centerX - scaledSize / 2, centerY + scaledSize / 2,
            centerX + scaledSize / 2, centerY + scaledSize / 2
        );
    }
}

// Helper function for drawing grid (adapted from sketch.js)
function drawGrid(p, rows, cols, cellWidth, cellHeight) {
    p.noFill();
    p.stroke(0); // Default grid color, adjust if Firestore provides gridColor
    p.strokeWeight(1);

    // Draw vertical lines
    for (let c = 0; c <= cols; c++) {
        const x = c * cellWidth;
        p.line(x, 0, x, p.height);
    }

    // Draw horizontal lines
    for (let r = 0; r <= rows; r++) {
        const y = r * cellHeight;
        p.line(0, y, p.width, y);
    }
}