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
function applySunBurnEffect(colors, intensity = 1) {
  const i = constrain(intensity, 0, 1);

  const targetR = color('#FFA500'); // naranja
  const targetG = color('#00FF00'); // lima
  const targetB = color('#00FFFF'); // aguamarina

  const tr = red(targetR), tg = green(targetG), tb = blue(targetB);

  return colors.map(hex => {
    const c = color(hex);
    const r0 = red(c), g0 = green(c), b0 = blue(c);

    const r1 = r0 + (tr - r0) * i;
    const g1 = g0 + (tg - g0) * i;
    const b1 = b0 + (tb - b0) * i;

    const burn = 0.1 * i;
    const r = r1 * (1 - burn);
    const g = g1 * (1 - burn);
    const b = b1 * (1 - burn);

    return color(constrain(r, 0, 255), constrain(g, 0, 255), constrain(b, 0, 255)).toString('#rrggbb');
  });
}


// ===== applyWaterWobble =====
function applyWaterWobble(pg, intensity = 1, frameCount = 0) {
  if (!pg || typeof pg.get !== 'function') {
    console.warn("applyWaterWobble: parámetro inválido. Debe ser un p5.Graphics.");
    return;
  }

  const i = Math.max(0, Math.min(1, intensity));
  const offset = Math.sin(frameCount * 0.05) * 5 * i; // Desplazamiento suave

  const img = pg.get();
  pg.clear();
  pg.image(img, offset, 0);
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
  