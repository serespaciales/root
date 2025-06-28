// =====================
// growth.js 
// =====================

// Constants

class GrowthManager {
  constructor() {
    this.seedId = null;
    this.isGrowing = false;
    this.progress = 0;
    this.config = null;
    this.intervalId = null;
    // ensure render steps are sequential
    this._lastRender = Promise.resolve();
  }

  /**
   * Initialize GrowthManager for a specific seed.
   * Fetches existing state and draws initial canvases.
   */
  init(seedId) {
    if (!seedId) throw new Error('Missing seed ID');
    if (this.seedId === seedId) return;
    this.seedId = seedId;

    seedsCol.doc(seedId).get()
      .then(doc => {
        if (!doc.exists) throw new Error(`Seed ${seedId} not found`);
        const data = doc.data();
        this.isGrowing = !!data.locked;
        this.progress = data.growthProgress || 0;
        this.config = data.growthConfig || null;
        this._updateUI(data);
        // draw the original or last state
        return this._renderStep();
      })
      .then(() => {
        // if growth in progress, resume ticks
        if (this.isGrowing && this.config) this._startInterval();
      })
      .catch(console.error);
  }

  /**
   * Start a new growth cycle with parameters.
   * - backs up original layers
   * - writes config and resets progress
   * - disables editing UI and starts rendering
   */
  startGrowth({ sun, water, vitamins, days }) {
    if (this.isGrowing) return;
    const cfg = {
      sun: +sun,
      water: +water,
      vitamins: +vitamins,
      days: +days,
      startDate: firebase.firestore.FieldValue.serverTimestamp()
    };

    seedsCol.doc(this.seedId).get()
  .then(async doc => {
    if (!doc.exists) throw new Error('Seed not found');
    const data = doc.data();

    const seedDoc = {
      seed: this.seedId,
      gridConfig: data.gridConfig,
      originalLayers: data.originalLayers || data.layers || [],
      growthConfig: cfg, // asegúrate de tener cfg definido correctamente antes
      growthProgress: 0,
      locked: true,
      updatedAt: firebase.firestore.Timestamp.now()
    };

    await window.saveToFirestore(seedDoc);

    })
    .then(() => {
      this.config   = cfg;
      this.progress = 0;
      this.isGrowing= true;
      this._updateUI();
      this._lockUI();
      // render primero, luego intervalo
      return this._renderStep();
    })
    .then(() => this._startInterval())
    .catch(console.error);
  // =====================
}

  /**
   * Stop growth when complete, re-enable UI.
   */
  stopGrowth() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.isGrowing = false;

    seedsCol.doc(this.seedId)
      .update({ locked: false, growthProgress: 100 })
      .then(() => this._updateUI())
      .catch(console.error);
  }

  /**
   * Internal: start the minute-by-minute tick.
   */
  _startInterval() {
    clearInterval(this.intervalId);
    this.intervalId = setInterval(() => this._tick(), 60000);
  }

  /**
   * Internal tick: update progress based on elapsed time.
   */
  _tick() {
    if (!this.isGrowing || !this.config || !this.config.startDate) return;
    const startMs = this.config.startDate.toMillis?.() || this.config.startDate;
    const elapsed = (Date.now() - startMs) / 60000;
    const total = this.config.days * DAY_IN_MINUTES;
    const pct = Math.min(100, (elapsed / total) * 100);

    if (pct > this.progress) {
      this.progress = pct;
      seedsCol.doc(this.seedId)
        .update({ growthProgress: this.progress, updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
        .then(() => {
          this._updateUI();
          return this._renderStep();
        })
        .then(() => {
          if (this.progress >= 100) this.stopGrowth();
        })
        .catch(console.error);
    }
  }

  /**
   * Internal: fetch layers, apply growth effect, draw canvas, and commit visuals.
   * Ensures only one batch write at a time by chaining onto _lastRender.
   */
  _renderStep() {
    this._lastRender = this._lastRender.then(() => {
      return seedsCol.doc(this.seedId).get().then(async doc => {
        if (!doc.exists) throw new Error('Seed not found');
        const data = doc.data();
  
        // 1) Clona la capa base y aplica tu efecto a `layers`
        const base   = data.originalLayers || data.layers || [];
        const layers = structuredClone(base);
        const prog   = this.progress / 100;
        const randOffset = Math.random() * 0.1;
        const randVar    = Math.random() * 0.2 - 0.1;
        const syncFactor = 0.3;
        // … código que muta `layers` con _applyEffect …
  
        // 2) Genera timestamps y arma el seedDoc completo
        const now = firebase.firestore.Timestamp.now();
        const seedDoc = {
          seed:           this.seedId,
          name:           this.seedId,
          gridConfig:     data.gridConfig,
          originalLayers: data.originalLayers || [],
          layers,                     // tus layers ya mutados
          plantedAt:      data.plantedAt || now,
          updatedAt:      now,
          lastUpdate:     now,
          growthConfig:   data.growthConfig,
          growthProgress: this.progress,
          locked:         this.isGrowing
        };
  
        // 3) Guarda TODO el documento de una vez
        await window.saveToFirestore(seedDoc);
  
        // 4) Retorna para encadenar correctamente
        return;
      });
    }).catch(console.error);
  
    return this._lastRender;
  }
  
  /**
   * Internal: apply per-visual growth logic based on type.
   */
  _applyEffect(visual, progress, cfg, randOffset, randVar, distFactor) {
    const factor = v => Math.min(10, Math.max(0, v)) / 10;
    const sun = factor(cfg.sun);
    const water = factor(cfg.water);
    const vitamins = factor(cfg.vitamins);
    const off = randOffset * (1 - distFactor);
    const varn = randVar * (1 - distFactor);
    const tintMap = {
      cerulean: 'rgb(0,123,255)',
      'rose-gold': 'rgb(183,110,121)',
      'neon-lavender': 'rgb(230,230,250)',
      'neon-azure': 'rgb(0,255,255)'
    };
  
    visual.bloom = visual.bloom || { sigma: 0, intensity: 0 };
    visual.shape = visual.shape || { extrudePct: 0, opacity: 1, subdivisions: 0, tint: null };
    visual.text = visual.text || { extrude: 0, branches: 0, hue: 0, content: '' };
    visual.speckles = visual.speckles || { pct: 0, radius: 0 };
  
    console.log(`Applying effect to visual type ${visual.type}:`, { progress, sun, water, vitamins }); // Debug
  
    switch (visual.type) {
      case 'gradient': {
        const hueShift = map(progress, 0, 1, 0, 30 * sun) + (Math.random() * 10 - 5) * off;
        const satShift = map(progress, 0, 1, 0, 30 * water) + (Math.random() * 10 - 5) * off;
        visual.colors = visual.colors.map(col => {
          let [r, g, b] = col.match(/\d+/g)?.map(Number) || [255, 255, 255];
          let [h, s, l] = rgbToHsl(r, g, b);
          h = (h + hueShift / 360) % 1;
          s = Math.min(1, Math.max(0, s + satShift / 100 + varn * 0.1));
          if (Math.random() < 0.1) h = Math.random();
          const [nr, ng, nb] = hslToRgb(h, s, l);
          return `rgb(${Math.round(nr)}, ${Math.round(ng)}, ${Math.round(nb)})`;
        });
        visual.bloom.sigma = Math.max(0, map(progress, 0, 1, 4, 20) * sun + varn);
        visual.bloom.intensity = Math.max(0, map(progress, 0, 1, 0, 1.5) * vitamins + varn);
        break;
      }
      case 'shape': {
        visual.shape.extrudePct = Math.max(0, map(progress, 0, 1, 0, 80 * vitamins) + (Math.random() * 20 - 10) * off);
        visual.shape.opacity = Math.min(1, Math.max(0, map(progress, 0, 1, 0, 1 * sun) + (Math.random() * 0.2 - 0.1) * off));
        visual.shape.subdivisions = Math.floor(Math.max(0, map(progress, 0, 1, 0, 6 * water) + (Math.random() * 2 - 1) * off));
        if (Math.random() < 0.1) visual.shape.tint = Object.keys(tintMap)[Math.floor(Math.random() * 4)];
        break;
      }
      case 'text': {
        visual.text.extrude = Math.max(0, map(progress, 0, 1, 0, 100 * water) + (Math.random() * 30 - 15) * off);
        visual.text.branches = Math.floor(Math.max(0, map(progress, 0, 1, 0, 6 * sun) + (Math.random() * 2 - 1) * off));
        visual.text.hue = (map(progress, 0, 1, 0, 360) + (Math.random() * 180 - 90) * off) % 360;
        if (Math.random() < 0.1) visual.text.content += String.fromCharCode(65 + Math.floor(Math.random() * 26));
        break;
      }
      case 'image': {
        visual.speckles.pct = Math.max(0, map(progress, 0, 1, 0, 100 * vitamins) + (Math.random() * 40 - 20) * off);
        visual.speckles.radius = Math.max(0, map(progress, 0, 1, 0, 5 * water) + (Math.random() * 2 - 1) * off);
        visual.blur = Math.max(0, map(progress, 0, 1, 0, 8 * sun) + (Math.random() * 2 - 1) * off);
        if (Math.random() < 0.1) visual.tint = Object.keys(tintMap)[Math.floor(Math.random() * 4)];
        break;
      }
    }
  }

  // Update summary UI and buttons
  _updateUI(data = {}) {
    const cfg = this.config || {};
    const sumEl = document.getElementById('growing-summary');
    if (sumEl) {
      sumEl.innerHTML = `Sun: ${cfg.sun||0}<br>Water: ${cfg.water||0}<br>Vitamins: ${cfg.vitamins||0}<br>Progress: ${Math.floor(this.progress)}%`;
    }
    const cloneBtn = document.getElementById('cloneSeedBtn');
    if (cloneBtn) cloneBtn.style.display = this.isGrowing||this.progress>=100 ? 'block':'none';
  }

  // Disable editing UI
  _lockUI() {
    ['seed-container','growing-container','palette'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.pointerEvents = 'none';
    });
  }

  /**
   * Clone seed, carrying over serializable data only.
   */
  cloneSeed() {
    seedsCol.doc(this.seedId).get()
      .then(async doc => {
        if (!doc.exists) throw new Error('Seed not found');
        const data = doc.data();
  
        // Clona originalLayers o layers
        const original = structuredClone(data.originalLayers || data.layers);
        const newId    = generateSeed();
  
        // Genera timestamps
        const now = firebase.firestore.Timestamp.now();
  
        // Construye el seedDoc completo
        const seedDoc = {
          seed:           newId,
          name:           newId,
          gridConfig:     data.gridConfig,
          originalLayers: original,
          layers:         original,   // parte sin crecimiento
          plantedAt:      now,
          updatedAt:      now,
          growthConfig:   null,
          growthProgress: 0,
          locked:         false
        };
  
        // Guarda con la plantilla completa
        await window.saveToFirestore(seedDoc);
  
        return newId;
      })
      .then(id => {
        // Redirige a la nueva seed
        window.location.search = `?seed=${id}`;
      })
      .catch(console.error);
  }
}  
// Export singleton
const growthManager = new GrowthManager();
window.growthManager = growthManager;
// Helper functions
function rgbToHsl(r, g, b) {
  r/=255; g/=255; b/=255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h=0, s=0, l=(max+min)/2;
  if (max!==min) {
    const d = max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max) {
      case r: h = ((g-b)/d + (g<b?6:0)); break;
      case g: h = ((b-r)/d + 2); break;
      case b: h = ((r-g)/d + 4); break;
    }
    h /= 6;
  }
  return [h,s,l];
}

function hslToRgb(h, s, l) {
  let r,g,b;
  if (!s) { r=g=b=l; }
  else {
    const hue2rgb = (p,q,t) => {
      if (t<0) t+=1;
      if (t>1) t-=1;
      if (t<1/6) return p+(q-p)*6*t;
      if (t<1/2) return q;
      if (t<2/3) return p+(q-p)*(2/3-t)*6;
      return p;
    };
    const q = l<0.5 ? l*(1+s) : l+s-l*s;
    const p = 2*l-q;
    r = hue2rgb(p,q,h+1/3);
    g = hue2rgb(p,q,h);
    b = hue2rgb(p,q,h-1/3);
  }
  return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
}

function map(value, start1, stop1, start2, stop2) {
  return start2 + (stop2-start2)*((value-start1)/(stop1-start1));
}

function generateSeed() {
  const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({length:7}, ()=>chars.charAt(Math.floor(Math.random()*chars.length))).join('');
}
