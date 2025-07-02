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
function applySunBurnEffect(p, colors, intensity = 1) {
  // 1) Clamp de intensidad [0,1]
  const i = Math.min(1, Math.max(0, intensity));

  // 2) Definimos los colores destino por canal
  //    Rojo → Naranja (#FFA500), Verde → Lima (#00FF00), Azul → Aguamarina (#00FFFF)
  p.colorMode(p.RGB, 255);
  const targetR = p.color('#FFA500');
  const targetG = p.color('#00FF00');
  const targetB = p.color('#00FFFF');
  const tr = p.red(targetR), tg = p.green(targetG), tb = p.blue(targetB);

  // 3) Procesamos cada color original
  return colors.map(hex => {
    const c = p.color(hex);
    const r0 = p.red(c), g0 = p.green(c), b0 = p.blue(c);

    // 4) Lerp independiente por canal hacia su destino
    const r1 = r0 + (tr - r0) * i;
    const g1 = g0 + (tg - g0) * i;
    const b1 = b0 + (tb - b0) * i;

    // 5) Opción: ligero “burn” adicional si quieres oscurecer un poco
    const burn = 0.1 * i;
    const r = r1 * (1 - burn);
    const g = g1 * (1 - burn);
    const b = b1 * (1 - burn);

    // 6) Clamp y devolver hex
    return p.color(
      Math.min(255, Math.max(0, r)),
      Math.min(255, Math.max(0, g)),
      Math.min(255, Math.max(0, b))
    ).toString('#rrggbb');
  });
}



// ===== applyWaterWobble =====
function applyWaterWobble(pg, intensity = 1, frameCount = 0) {
  const i = Math.max(0, Math.min(1, intensity));
  const img = pg.get();
  // Distorsión brutal: desplazamiento hasta 10px, frecuencia 1.0
  const amplitude = 10 * i;
  const frequency = 1.0 * i;
  const speed     = 0.5;
  pg.clear();
  for (let y = 0; y < img.height; y++) {
    const offsetX = Math.sin(y * frequency + frameCount * speed) * amplitude;
    pg.image(img, 0, y, img.width, 1, offsetX, y, img.width, 1);
  }
}

// ===== applySaturationBoost =====
function applySaturationBoost(p, colors, intensity = 1) {
  const i = Math.max(0, Math.min(1, intensity));
  // Pasamos a HSB para operar
  p.colorMode(p.HSB, 360, 100, 100);
  const boosted = colors.map(hex => {
    const c = p.color(hex);
    const h = p.hue(c);
    // Saturación al tope: hasta +80%
    const s = Math.min(100, p.saturation(c) + 80 * i);
    const b = p.brightness(c);
    return p.color(h, s, b).toString('#rrggbb');
  });
  // Restauramos RGB
  p.colorMode(p.RGB, 255, 255, 255, 255);
  return boosted;
}


  
 //=======================G=======R======A======D======I=======E======N=====T=========S====================


  // =====applyBloomExpansion=====
  // Aplica expansión visual a las formas mediante escalado, subdivisión y tintes especiales.
  function applyBloomExpansion(p, visual) {
    // Escala la forma según el porcentaje de extrusión
    if (visual.shape.extrudePct) {
      const scaleFactor = Math.max(0.1, Math.min(1 + visual.shape.extrudePct / 100, 5));
      console.log(`Applying bloom expansion: scale=${scaleFactor}`);
      p.scale(scaleFactor);
    }
  
    // Aumenta la complejidad visual subdividiendo la forma
    if (visual.shape.subdivisions)
      subdivideShape(p, visual.shape.subdivisions);
  
    // Aplica un tinte de color especial si está definido
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
  
  // =====applyMossMirage=====
  // Agrega un efecto tipo musgo o niebla: partículas moteadas (speckles) y desenfoque suave.
  function applyMossMirage(p, visual, w, h) {
    // Añade motas (speckles) en la superficie, ajustadas por porcentaje y radio
    if (visual.speckles.pct)
      addSpeckles(p, w, h, visual.speckles.pct, visual.speckles.radius, visual.tint);
  
    // Aplica un desenfoque global si está especificado
    if (visual.blur)
      p.filter(p.BLUR, visual.blur);
  }
  
  // (Opcional) Puedes añadir aquí funciones específicas como:
  // applySunEffect, applyWaterEffect, applyVitaminsEffect
  // según lo que quieras que cambie visualmente al crecer tu semilla.
  