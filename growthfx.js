// ==========================
// FUNCIONES DE EFECTOS DE CRECIMIENTO
// Estas funciones aplican efectos visuales a los elementos del canvas 
// según los valores configurados de crecimiento (sun, water, vitamins).
// ==========================


 //======================GROWTH CURVE===================


/**
 * logisticEase(x, k)
 * – Curva logística centrada en 0.5, k controla la pendiente
 * – Devuelve 0 en x=0 y 1 en x=1
 */
function logisticEase(x, k = 12) {
  const L0 = 1 / (1 + Math.exp( k/2));
  const L1 = 1 / (1 + Math.exp(-k/2));
  const y  = 1 / (1 + Math.exp(-k*(x - 0.5)));
  return (y - L0) / (L1 - L0);
}

const normSun = logisticEase(constrain(growth.sunGrid[row][col] / 10, 0, 1));
// supongamos que vitamins va de 0 a 10 → normalizamos:
const normVit = constrain(growth.vitamins / 10, 0, 1);

// Saturación: del valor base hasta +50% según vit
s = constrain(s + map(normVit, 0, 1, 0, 50), 0, 100);

// Brillo: del valor base hasta +30% según vit
b = constrain(b + map(normVit, 0, 1, 0, 30), 0, 100);

//======================GROWTH CURVE===================

  //=======================G=======R======A======D======I=======E======N=====T=========S====================

  // ==========================
// EFECTOS DE CRECIMIENTO PARA ELEMENTO GRADIENT
// Cada función modifica visualmente el gradiente según los valores de growth:
// - SUN: cambia los colores para simular un "color quemado"
// - WATER: agrega glow usando blur
// - VITAMINS: aumenta la saturación de los colores
// ==========================

// =====applySunBurnEffect=====
// ==========================
// applySunBurnEffect (Opción 1)
// ==========================

/**
 * Aplica “efecto sol” devolviendo p5.Color en lugar de hex.
 * @param {string[]} colors       Array de hex, e.g. ['#3ab','#fa3','#4cf']
 * @param {number|number[]} intensities  Float 0–1 o array de floats 0–1
 * @returns {p5.Color[]}          Array de colores p5.Color
 */
// ==========================
// growthfx.js - Updated Effects
// ==========================

/**
 * Aplica “efecto sol” sin parpadeo:
 * - Hue, Saturation y Brightness varían según intensity de forma determinista.
 * @param {string[]} colors       Array de hex, e.g. ['#3ab','#fa3','#4cf']
 * @param {number|number[]} intensities Float 0–1 o array 0–1 del mismo largo que colors
 * @returns {p5.Color[]}          Array de p5.Color con efectos aplicados
 */
// ==========================
// growthfx.js - Rainbow Sunburn Effect
// ==========================

/**
 * Aplica un “efecto arcoíris” al sol:
 * - Cada color cambia de matiz según intensidad de sol.
 * - A mayor intensidad, cambio más abrupto en el espectro (0–360°).
 * @param {string[]} colors           Array de hex, e.g. ['#3ab','#fa3','#4cf']
 * @param {number|number[]} intensities Float 0–1 o array 0–1 (mismo largo que colors)
 * @returns {p5.Color[]}              Array de p5.Color con matices de arcoíris
 */
function applySunBurnEffect(colors, intensities) {
  // Pasamos a HSB para manipular hue directamente
  colorMode(HSB, 360, 100, 100, 1);
  
  const out = colors.map((hexStr, idx) => {
    // Determina intensidad para este canal
    const i = Array.isArray(intensities)
      ? constrain(intensities[idx], 0, 1)
      : constrain(intensities, 0, 1);

    // Convertir hex a color HSB
    const base = color(hexStr);
    let h = hue(base),
        s = saturation(base),
        b = brightness(base);

    // Mapeo de intensidad a desplazamiento de matiz 0→360°
    // A mayor sol, más recorrido completo de arcoíris
    const hueShift = map(i, 0, 1, 0, 180);
    h = (h + hueShift) % 360; 
    // Opcional: elevar saturación y brillo al máximo para colores vibrantes
    // Reconstruir y devolver p5.Color
    return color(h, s, b);
  });

  // Volver a RGB para resto del sketch
  colorMode(RGB, 255, 255, 255, 1);
  return out;
}

/**
 * Dibuja la grilla de crecimiento con degradados rainbow-sunburn
 */
function drawGrowthGrid(pg, visual, growth) {
  const filas = visual.colorsByCell.length;
  const cols  = visual.colorsByCell[0].length;
  const cellW = pg.width  / cols;
  const cellH = pg.height / filas;

  for (let row = 0; row < filas; row++) {
    for (let col = 0; col < cols; col++) {
      const base      = visual.colorsByCell[row][col];
      const sunValue  = growth.sunGrid[row][col];
      const intensArr = base.map(() => sunValue);

      // Genera colores arcoíris en función del sol
      const burntCols = applySunBurnEffect(base, base.map(() => normSun));

      const x = col * cellW;
      const y = row * cellH;

      pg.push();
        pg.translate(x, y);
        pg.noStroke();

        if (burntCols.length === 3) {
          // Superior e inferior
          pg.fillGradient(burntCols[0], burntCols[1], 0, 0,       cellW, cellH/2, pg.VERTICAL);
          pg.fillGradient(burntCols[1], burntCols[2], 0, cellH/2, cellW, cellH/2, pg.VERTICAL);
        } else {
          // Degradado simple
          pg.fillGradient(burntCols[0], burntCols[1] || color(0), 0, 0, cellW, cellH, pg.VERTICAL);
        }
      pg.pop();
    }
  }
}





// ===== applyWaterWobble =====
/**
 * Desplaza suavemente el buffer y aplica variaciones de color aleatorias
 * @param {p5.Graphics} pg       — El graphics a procesar (p5.Graphics)
 * @param {number} intensity     — 0..1, controla la fuerza del efecto de color
 * @param {number} frameCount    — El contador de frames (para el offset suave)
 */
function applyWaterWobble(pg, intensity = 1, frameCount = 0) {
  if (!pg || typeof pg.get !== 'function') {
    console.warn("applyWaterWobble: parámetro inválido. Debe ser un p5.Graphics.");
    return;
  }

  // 1) Desplazamiento suave
  const i      = constrain(intensity, 0, 1);
  const offset = Math.sin(frameCount * 0.05) * 5 * i;

  // 2) Captura la imagen actual
  const img = pg.get();

  // 3) Prepara para pixel–manipulación
  pg.clear();
  pg.image(img, offset, 0);  // primero el desplazamiento

  // 4) Carga los píxeles para modificarlos
  pg.loadPixels();
  // asegúrate de que el canvas está en RGB
  colorMode(RGB, 255);

  for (let y = 0; y < pg.height; y++) {
    for (let x = 0; x < pg.width; x++) {
      const idx = 4 * (y * pg.width + x);
      // lee los canales
      let r = pg.pixels[idx + 0];
      let g = pg.pixels[idx + 1];
      let b = pg.pixels[idx + 2];
      let a = pg.pixels[idx + 3];

      // convierte a HSB para modificar matiz/sat/bright
      colorMode(HSB, 360, 100, 100, 255);
      const c  = color(r, g, b, a);
      let h     = hue(c);
      let s     = saturation(c);
      let br    = brightness(c);

      // aplica offsets aleatorios proporcionales a intensity
      h  = (h + random(-30, 30) * i + 360) % 360;       // +/-30° hue
      s  = constrain(s + random(-20, 20) * i, 0, 100);  // +/-20 sat
      br = constrain(br + random(-20, 20) * i, 0, 100); // +/-20 bright

      // vuelve a RGB
      colorMode(RGB, 255, 255, 255, 255);
      const nc = color(h, s, br, alpha(c));

      // escribe de vuelta
      pg.pixels[idx + 0] = red(nc);
      pg.pixels[idx + 1] = green(nc);
      pg.pixels[idx + 2] = blue(nc);
      // pg.pixels[idx+3] = alpha(nc); // si quieres alterar alpha, descomenta
    }
  }

  pg.updatePixels();
}


// ===== applySaturationBoost =====
function applySaturationBoost(colors, intensity = 1) {
  const i = constrain(intensity, 0, 1);
  colorMode(HSB, 360, 100, 100);

  const boosted = colors.map(hex => {
    const c = color(hex);
    const h = hue(c);
    const s = min(100, saturation(c) + 80 * i);
    const b = brightness(c);
    return color(h, s, b).toString('#rrggbb');
  });

  colorMode(RGB, 255, 255, 255, 255);
  return boosted;
}



  
 //=======================G=======R======A======D======I=======E======N=====T=========S====================


  // =====applyBloomExpansion=====
  // Aplica expansión visual a las formas mediante escalado, subdivisión y tintes especiales.
  function applyBloomExpansion(visual) {
    if (visual.shape.extrudePct) {
      const scaleFactor = constrain(1 + visual.shape.extrudePct / 100, 0.1, 5);
      scale(scaleFactor);
    }
  
    if (visual.shape.subdivisions) {
      subdivideShape(visual.shape.subdivisions); // asegúrate que esta función también esté en modo global
    }
  
    if (visual.shape.tint) {
      const tints = {
        'cerulean': color(0, 123, 255),
        'rose-gold': color(183, 110, 121),
        'neon-lavender': color(230, 230, 250),
        'neon-azure': color(0, 255, 255)
      };
      const tintColor = tints[visual.shape.tint] || color('#ffffff');
      tint(tintColor);
    }
  }
  
  // =====applyMossMirage=====
  // Agrega un efecto tipo musgo o niebla: partículas moteadas (speckles) y desenfoque suave.
  function applyMossMirage(visual, w, h) {
    if (visual.speckles?.pct) {
      addSpeckles(w, h, visual.speckles.pct, visual.speckles.radius, visual.tint); // asegúrate que esta función también sea global
    }
  
    if (visual.blur) {
      filter(BLUR, visual.blur);
    }
  }
  
  // (Opcional) Puedes añadir aquí funciones específicas como:
  // applySunEffect, applyWaterEffect, applyVitaminsEffect
  // según lo que quieras que cambie visualmente al crecer tu semilla.
  