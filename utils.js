// === BLOQUEO PERSISTENTE (helpers UI) ===
function disableAllToolButtons() {
  document.querySelectorAll('.tool-btn').forEach(btn => {
    // deja habilitado solo lo que quieras (ej. clone)
    if (btn.id !== 'clone-seed') {
      btn.disabled = true;
      btn.classList.add('disabled');
    }
  });
}

function showBlockedBanner() {
  if (document.getElementById('growth-blocker-msg')) return;
  const blockerMsg = document.createElement('div');
  blockerMsg.id = 'growth-blocker-msg';
  blockerMsg.textContent = 'is blocked for growth';
  blockerMsg.style = 'position:fixed;top:10px;right:10px;padding:8px 12px;background:#d0fc76;color:#333;border-radius:4px;z-index:2000;';
  document.body.appendChild(blockerMsg);
}

function applyLocalLockUI() {
  disableAllToolButtons();
  showBlockedBanner();
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
  
  
  function map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2-start2)*((value-start1)/(stop1-start1));
  }
  
  //TOOL PALETTE HELPER 

  // ── Control de paleta colapsable (módulo utils.js) ──
  document.addEventListener('DOMContentLoaded', () => {
    const PALETTE   = document.getElementById('palette');
    const TOOL_BTNS = document.querySelectorAll('.tool-btn');
    const PANELS    = document.querySelectorAll('.tool-options');
    let collapseTimer;
  
    // Arranca colapsado
    if (PALETTE) PALETTE.classList.add('panels-collapsed');
  


function resetCollapseTimer() {
  clearTimeout(collapseTimer);
  collapseTimer = setTimeout(() => {
    // Check if any input within #palette is focused or hovered
    const focusedElement = document.activeElement;
    const isInputFocused = focusedElement && PALETTE.contains(focusedElement) && 
                          (focusedElement.tagName === 'INPUT' || focusedElement.tagName === 'SELECT');
    
    // Check if cursor is over any input or select within palette
    const hoveredElement = document.elementFromPoint(mouseX + window.scrollX, mouseY + window.scrollY);
    const isInputHovered = hoveredElement && PALETTE.contains(hoveredElement) && 
                          (hoveredElement.tagName === 'INPUT' || hoveredElement.tagName === 'SELECT');

    if (!isInputFocused && !isInputHovered) {
      console.log('Collapsing palette: no input focused or hovered');
      PALETTE.classList.add('panels-collapsed');
      TOOL_BTNS.forEach(b => b.classList.remove('active'));
      const defaultPanel = document.getElementById('options-default');
      if (defaultPanel) defaultPanel.style.display = 'block';
    } else {
      console.log('Palette collapse prevented: input is focused or hovered');
    }
  }, 5000);
}
  
    function showPanel(tool) {
      TOOL_BTNS.forEach(b => b.classList.remove('active'));
      PANELS.forEach(p => p.style.display = 'none');
    
      const btn   = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
      const panel = document.getElementById(`options-${tool}`);
    
      if (btn) btn.classList.add('active');
      if (panel) {
        panel.style.display = 'flex';
        PALETTE.classList.remove('panels-collapsed');
      }
    }
  
    TOOL_BTNS.forEach(btn =>
      btn.addEventListener('click', () => showPanel(btn.dataset.tool))
    );
  
    if (PALETTE) {
      // Al entrar, detenemos cualquier timer pendiente
      PALETTE.addEventListener('mouseenter', () => clearTimeout(collapseTimer));
      // Al salir, iniciamos el timer
      PALETTE.addEventListener('mouseleave', resetCollapseTimer);
    }
  
    // Mostrar panel default al inicio
    const defaultPanel = document.getElementById('options-default');
    if (defaultPanel) defaultPanel.style.display = 'block';
  });
  
  //TOOL PALETTE HELPER 



  function setupPauseButton() {
    const pauseBtn = document.getElementById('pause-btn');
    const bottomButtons = document.getElementById('bottom-buttons'); // Get parent container
    if (!pauseBtn) {
      console.warn('❌ pause-btn not found');
      return;
    }
  
    // Tooltip inicial
    const tooltip = tippy(pauseBtn, {
      content: "Pause plant",
      theme: 'modulariem',
    });
  
    pauseBtn.addEventListener('click', () => {
      animationsPaused = !animationsPaused;
      console.log('animationsPaused:', animationsPaused);
  
      if (animationsPaused) {
        pausedFrameCount = frameCount;
        pausedMillis = millis(); // Save current millis for pause
        pauseBtn.querySelector('img').src = 'tool-icons/R_playanim.svg';
        pauseBtn.title = "Resume animations";
        tooltip.setContent("Resume plant");
        pauseBtn.classList.add('active'); // Add active class to button
        if (bottomButtons) bottomButtons.classList.add('active'); // Add to parent for opacity fix
      } else {
        pauseBtn.querySelector('img').src = 'tool-icons/R_stopanim.svg';
        pauseBtn.title = "Pause animations";
        tooltip.setContent("Pause plant");
        pauseBtn.classList.remove('active'); // Remove active class
        if (bottomButtons) bottomButtons.classList.remove('active'); // Remove from parent
      }
    });
  }


// Este script debe cargarse tras p5.js y sketch.js en tu HTML
window.addEventListener('DOMContentLoaded', () => {
  // 1) Oculta todas las opciones salvo la default
  document.querySelectorAll('.tool-options').forEach(el => el.style.display = 'none');
  document.getElementById('options-default').style.display = 'block';

  // 2) Export button: muestra panel y sección export
  document.querySelector('.tool-btn#export-btn')?.addEventListener('click', () => {
    document.getElementById('palette-properties').style.display = 'block';
    document.querySelectorAll('.tool-options').forEach(el => el.style.display = 'none');
    document.getElementById('options-export').style.display = 'block';
    window.activeTool = 'export';
  });

  // 3) Download button: PNG/JPEG instantáneo y vídeo WebM
  document.getElementById('download-button')?.addEventListener('click', () => {
    const downloadBtn = document.getElementById('download-button');
    downloadBtn.disabled = true;
    const originalText = downloadBtn.textContent;
    const fmt = document.getElementById('export-format').value;
  
    const seed = (() => {
      const params = new URLSearchParams(location.search);
      let s = params.get('seed');
      if (!s || s.length !== 7) {
        s = Math.random().toString(36).substring(2, 9);
        params.set('seed', s);
        history.replaceState(null, '', '?' + params);
      }
      return s;
    })();
  
    const baseName = `ROOT_${seed}`;
    downloadBtn.textContent = `Preparando ${fmt.toUpperCase()}…`;
  
    if (fmt === 'png' || fmt === 'jpeg') {
      const wasEditing = editingGrid;
      editingGrid = false;
      noLoop();
  
      // 👇 Forzamos todos los buffers y módulos antes de renderizar
      computeGridPoints(); // asegúrate que los puntos estén correctos
      drawSeed();          // redibuja la base
      draw();              // fuerza todo el draw completo
  
      setTimeout(() => {
        saveCanvas(window.canvas || canvas, baseName, fmt);
        editingGrid = wasEditing;
        loop();
        redraw();
  
        downloadBtn.textContent = '¡Listo!';
        setTimeout(() => {
          downloadBtn.disabled = false;
          downloadBtn.textContent = originalText;
        }, 1000);
      }, 150); // pequeño delay para permitir dibujado real
      return;
    }
    // Vídeo WebM 10s a 60fps
    const DURATION_MS = 10 * 1000;
    const FPS = 60;
    const canvasEl = document.querySelector('#canvas-wrapper canvas') || document.querySelector('canvas');
    if (!canvasEl?.captureStream) {
      alert('captureStream() no disponible. Sólo PNG/JPEG.');
      downloadBtn.disabled = false;
      downloadBtn.textContent = originalText;
      return;
    }

    const stream = canvasEl.captureStream(FPS);
    const mime = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
      ? 'video/webm; codecs=vp9'
      : 'video/webm';
    let recorder;
    let chunks = [];
    try {
      recorder = new MediaRecorder(stream, { mimeType: mime });
    } catch (err) {
      alert('MediaRecorder no soporta este MIME. Sólo PNG/JPEG.');
      downloadBtn.disabled = false;
      downloadBtn.textContent = originalText;
      return;
    }

    recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // WebM es lo único fiable en cliente
      a.download = `${baseName}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      downloadBtn.textContent = '100%';
      setTimeout(() => {
        downloadBtn.disabled = false;
        downloadBtn.textContent = originalText;
      }, 1000);
    };

    recorder.start();
    let elapsed = 0;
    const tick = 200;
    const interval = setInterval(() => {
      elapsed += tick;
      const pct = Math.min(100, Math.floor((elapsed / DURATION_MS) * 100));
      downloadBtn.textContent = `Descargando… ${pct}%`;
      if (elapsed >= DURATION_MS) {
        clearInterval(interval);
        recorder.stop();
      }
    }, tick);
  });
});


//CLONE SEED  //CLONE SEED //CLONE SEED //CLONE SEED //CLONE SEED //CLONE SEED //CLONE SEED //CLONE SEED

// Clone Seed functionality
async function cloneSeed() {
  try {
    // Fetch the current seed's data
    const currentDoc = await seedsCol.doc(seed).get();
    if (!currentDoc.exists) {
      console.error('Current seed not found');
      alert('Error: Current seed not found in database.');
      return;
    }
    const data = currentDoc.data();

    // Generate a new 7-character seed
    const newSeed = generateSeed();

    // Prepare the cloned data, using originalLayers
    const now = firebase.firestore.Timestamp.now();
    const clonedData = {
      seed: newSeed,
      name: newSeed,
      gridConfig: data.gridConfig, // Copy grid configuration
      layers: data.originalLayers, // Use originalLayers, not growth-modified layers
      originalLayers: data.originalLayers, // Preserve originalLayers for future cloning
      plantedAt: now, // New timestamp
      updatedAt: now,
      lastUpdate: now,
      growthProgress: 0, // Reset growth progress
      growthConfig: {
        sun: 0,
        water: 0,
        vitamins: 0,
        days: 21, // Default growth days
        startDate: now,
        lastGrowthDay: 0,
        hasFullyGrown: false,
        growthFinishedAt: null
      },
      locked: false // New seed is not locked
    };

    // Save the cloned data to Firestore
    await seedsCol.doc(newSeed).set(clonedData);
    console.log(`✅ Cloned seed ${seed} to new seed ${newSeed}`);

    // Open the new seed in a new tab
    window.open(`index.html?seed=${newSeed}`, '_blank', 'noopener');
  } catch (err) {
    console.error('Error cloning seed:', err);
    alert(`Failed to clone seed: ${err.message}`);
  }
}

// Attach cloneSeed to the Clone Seed button
document.addEventListener('DOMContentLoaded', () => {
  const cloneSeedBtn = document.getElementById('clone-seed');
  if (cloneSeedBtn) {
    cloneSeedBtn.addEventListener('click', cloneSeed);
  } else {
    console.warn('Clone Seed button not found');
  }
});


//CLONE SEED  //CLONE SEED //CLONE SEED //CLONE SEED //CLONE SEED //CLONE SEED //CLONE SEED //CLONE SEED




//GRID UTILITIES //GRID UTILITIES //GRID UTILITIES //GRID UTILITIES //GRID UTILITIES


function setupGridColorControls() {
  const colorInput = document.getElementById("gridColor");
  const opacityInput = document.getElementById("gridOpacity");

  if (colorInput) {
    colorInput.addEventListener("input", (e) => {
      gridColor = e.target.value;
      redraw();
      saveGridConfig();  // ← Asegúrate de incluir esto
    });
  }

  if (opacityInput) {
    opacityInput.addEventListener("input", (e) => {
      gridOpacity = parseInt(e.target.value, 10);
      redraw();
      saveGridConfig();  // ← Y aquí también
    });
  }
}

//GRID UTILITIES //GRID UTILITIES //GRID UTILITIES //GRID UTILITIES //GRID UTILITIES


//SLIDER UTILITIES //SLIDER UTILITIES  //SLIDER UTILITIES  //SLIDER UTILITIES  //SLIDER UTILITIES  

window.addEventListener('DOMContentLoaded', () => {
  const gridColorInput = document.querySelector('input[name="grid-color"]');
  if (gridColorInput) {
    gridColorInput.addEventListener('input', () => {
      window.gridColor = gridColorInput.value;
      if (typeof window.markChanges === 'function') window.markChanges();
      if (typeof window.debounceSaveToFirestore === 'function') window.debounceSaveToFirestore();
      if (typeof window.redraw === 'function') window.redraw();
      console.log(`Grid color input event fired! Updated to: ${window.gridColor}`);

      setupGridColorControls();
    });
  } else {
    console.warn('grid-color input not found');
  }

  const gridOpacityInput = document.querySelector('input[name="opacity"]');
  if (gridOpacityInput) {
    gridOpacityInput.addEventListener('input', () => {
      window.gridOpacity = parseInt(gridOpacityInput.value, 10);
      if (typeof window.markChanges === 'function') window.markChanges();
      if (typeof window.debounceSaveToFirestore === 'function') window.debounceSaveToFirestore();
      if (typeof window.redraw === 'function') window.redraw();
      console.log(`Grid opacity input event fired! Updated to: ${window.gridOpacity}`);

      setupGridColorControls();
    });
  } else {
    console.warn('opacity input not found');
  }

  const confirmGridBtn = document.getElementById('confirm-grid');
  if (confirmGridBtn) {
    confirmGridBtn.addEventListener('click', () => {
      const rows = parseInt(window.sliders.rows?.value?.() || 6, 10);
      const cols = parseInt(window.sliders.columns?.value?.() || 6, 10);
      window.columnPositions = Array.from({ length: cols + 1 }, (_, i) => (i * window.width) / cols);
      window.rowPositions = Array.from({ length: rows + 1 }, (_, i) => (i * window.height) / rows);
      if (typeof window.computeGridPoints === 'function') window.computeGridPoints();
      if (typeof window.markChanges === 'function') window.markChanges();
      if (typeof window.debounceSaveToFirestore === 'function') window.debounceSaveToFirestore();
      if (typeof window.redraw === 'function') window.redraw();
      console.log(`Confirm Grid clicked: ${rows} rows, ${cols} cols, color: ${window.gridColor}, opacity: ${window.gridOpacity}`);

      setupGridColorControls();
    });
  } else {
    console.warn('confirm-grid button not found');
  }
});



//SLIDER UTILITIES //SLIDER UTILITIES  //SLIDER UTILITIES  //SLIDER UTILITIES  //SLIDER UTILITIES  


//GO TO HARVEST BUTTON  //GO TO HARVEST BUTTON  //GO TO HARVEST BUTTON  //GO TO HARVEST BUTTON  
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('harvestgo-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      window.open('harvest.html', '_blank', 'noopener,noreferrer');
    });
  }
});

//GO TO HARVEST BUTTON  //GO TO HARVEST BUTTON  //GO TO HARVEST BUTTON  //GO TO HARVEST BUTTON  
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('gardengo-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      window.open('garden.html', '_blank', 'noopener,noreferrer');
    });
  }
});

//GO TO HARVEST BUTTON  //GO TO HARVEST BUTTON  //GO TO HARVEST BUTTON  //GO TO HARVEST BUTTON 