


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
        PALETTE.classList.add('panels-collapsed');
        TOOL_BTNS.forEach(b => b.classList.remove('active'));
        const defaultPanel = document.getElementById('options-default');
        if (defaultPanel) defaultPanel.style.display = 'block';
      }, 3000);
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
  //========================0STOP ANIMATION LOGIC ========================
  //========================0STOP ANIMATION LOGIC ========================


  //========================DOWNLOAD IMAGE ========================
// utils.js
// utils.js

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

    // Generar o recuperar seed de 7 caracteres
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

    // PNG/JPEG instantáneo
    if (fmt === 'png' || fmt === 'jpeg') {
      // Asegúrate de exponer window.canvas en sketch.js: window.canvas = canvas;
      saveCanvas(window.canvas || canvas, baseName, fmt);
      downloadBtn.textContent = '¡Listo!';
      setTimeout(() => {
        downloadBtn.disabled = false;
        downloadBtn.textContent = originalText;
      }, 1000);
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
