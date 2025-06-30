// ==========================
// FUNCIONES DE EFECTOS DE CRECIMIENTO
// Estas funciones aplican efectos visuales a los elementos del canvas 
// según los valores configurados de crecimiento (sun, water, vitamins).
// ==========================



  //=======================G=======R======A======D======I=======E======N=====T=========S====================

  // ==========================
// EFECTOS DE CRECIMIENTO PARA ELEMENTO GRADIENT
// Cada función modifica visualmente el gradiente según los valores de growth:
// - SUN: cambia los colores para simular un "color quemado"
// - WATER: agrega glow usando blur
// - VITAMINS: aumenta la saturación de los colores
// ==========================

// =====applySunBurnEffect=====
// Simula el efecto de "color quemado" ajustando el brillo y tonalidad del gradiente.
function applySunBurnEffect(p, colors, intensity = 1) {
    console.log(`☀️ applySunBurnEffect - intensity: ${intensity}`);
    return colors.map(hex => {
      const c = p.color(hex);
      const r = c.levels[0] * (1 - 0.3 * intensity);
      const g = c.levels[1] * (1 - 0.2 * intensity);
      const b = c.levels[2] * (1 - 0.1 * intensity);
      const result = p.color(r, g, b).toString('#rrggbb');
      console.log(`   original: ${hex}, burned: ${result}`);
      return result;
    });
  }
  
  
  // =====applyWaterWobble=====
  // Simula agua aplicando un blur ligero sobre el gráfico del gradiente.
  function applyWaterWobble(pg, intensity = 1, frameCount = 0) {
    const img = pg.get(); // Copia el buffer actual
    const amplitude = 2 * intensity;    // Cuánta distorsión
    const frequency = 0.1 * intensity;  // Frecuencia de la onda
    const speed = 0.05;                 // Velocidad de animación
  
    pg.clear(); // Limpia el buffer
  
    for (let y = 0; y < img.height; y++) {
      const offsetX = Math.sin(y * frequency + frameCount * speed) * amplitude;
      // Dibuja una línea desplazada horizontalmente
      pg.image(img, 0, y, img.width, 1, offsetX, y, img.width, 1);
    }
  }
  
  
  // =====applySaturationBoost=====
  // Aumenta la saturación de los colores del gradiente, haciéndolos más vibrantes.
  function applySaturationBoost(p, colors, intensity = 1) {
    console.log(`🍊 applySaturationBoost - intensity: ${intensity}`);
    return colors.map(hex => {
      const c = p.color(hex);
      const h = p.hue(c);
      const s = Math.min(100, p.saturation(c) + 30 * intensity);
      const b = p.brightness(c);
      const result = p.color(`hsb(${h}, ${s}%, ${b}%)`).toString('#rrggbb');
      console.log(`   original: ${hex}, saturated: ${result}`);
      return result;
    });
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
  