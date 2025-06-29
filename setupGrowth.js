
///////=========================GROW USER INTERACTION============================////////////////
///////=========================GROW USER INTERACTION============================////////////////

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
  
    // Evitar listeners duplicados
    const newApplyBtn = applyBtn.cloneNode(true);
    applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
  
    newApplyBtn.addEventListener('click', async () => {
      try {
        const cfg = {
          sun: Number(sliders.sun?.value() ?? 0),
          water: Number(sliders.water?.value() ?? 0),
          vitamins: Number(sliders.vitamins?.value() ?? 0),
          days: Number(sliders.days?.value() ?? 0),
          startDate: firebase.firestore.FieldValue.serverTimestamp()
        };
  
        function sanitizeObject(obj, seen = new WeakSet()) {
          if (obj === null || typeof obj !== 'object') return obj;
          if (seen.has(obj)) return null;
          seen.add(obj);
          if (obj instanceof p5.Color) return obj.toString().replace(/ /g, '');
          if (obj instanceof p5.Graphics || obj instanceof p5.Image) return null;
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
          growthConfig: cfg,
          originalLayers: sanitizedLayers,
          layers: sanitizedLayers,
          gridConfig,
          growthProgress: 0,
          locked: true
        };
  
        console.log('Saving data to Firestore:', data);
        await seedsCol.doc(seed).set(data, { merge: true });
  
        alert(`✅ Growth settings and layers saved for seed ${seed}`);
        markChanges();
  
        if (window.growthManager) {
          window.growthManager.init(seed);
          window.growthManager.lockSeed?.(); // solo si existe
        } else {
          console.warn('🌱 window.growthManager no está disponible.');
        }
  
        // ✅ Ahora llamada global desde common.js
        if (typeof disableEditingControls === 'function') {
          disableEditingControls();
        } else {
          console.warn('⚠️ disableEditingControls no está definido.');
        }
  
      } catch (err) {
        console.error('Error saving growth settings:', err);
        alert(`❌ Error saving growth settings: ${err.message}`);
      }
    });
  
    activeBorderColor = color(0, 255, 0);
  }
  