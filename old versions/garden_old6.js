// ─── wait for Firebase seedsCol before doing anything ───────────────────────
function waitForSeedsCol(cb, attempts = 40, interval = 250) {
  if (window.seedsCol) { cb(); return; }
  if (attempts <= 0) {
    console.error('Timed out waiting for seedsCol');
    document.getElementById('loading-overlay').style.display = 'none';
    return;
  }
  setTimeout(() => waitForSeedsCol(cb, attempts - 1, interval), interval);
}

// ─── static preview: draw the first layer's visuals onto a small canvas ─────
function drawStaticPreview(canvas, data) {
  const gc = data.gridConfig || { rows: 2, cols: 2, canvasWidth: 400, canvasHeight: 300 };
  const layers = data.originalLayers || data.layers || [];
  if (!layers.length) return;

  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const scaleX = W / (gc.canvasWidth  || 400);
  const scaleY = H / (gc.canvasHeight || 300);

  const rows = gc.rows || 2;
  const cols = gc.cols || 2;
  const cellW = (gc.canvasWidth  || 400) / cols * scaleX;
  const cellH = (gc.canvasHeight || 300) / rows * scaleY;

  layers.forEach(layer => {
    if (!layer || layer.visible === false || !layer.visuals) return;
    Object.entries(layer.visuals).forEach(([key, visual]) => {
      if (!visual || visual.type === 'empty') return;
      const parts = key.split('-').map(Number);
      const r = parts[0], c = parts[1];
      if (isNaN(r) || isNaN(c)) return;
      const x = c * cellW;
      const y = r * cellH;

      if (visual.type === 'gradient' && Array.isArray(visual.colors) && visual.colors.length >= 2) {
        try {
          const grad = ctx.createLinearGradient(x, y, x, y + cellH);
          const colors = visual.colors;
          colors.forEach((col, i) => {
            try { grad.addColorStop(i / (colors.length - 1), col); } catch(e) {}
          });
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, cellW, cellH);
        } catch(e) {}

      } else if (visual.type === 'shape' && visual.shape) {
        const s = visual.shape;
        const cx = x + cellW / 2;
        const cy = y + cellH / 2;
        const size = (s.size <= 1 ? s.size * 100 : s.size) / 100;
        const radius = Math.min(cellW, cellH) * 0.45 * size;
        ctx.beginPath();
        const st = s.shapeType || 'circle';
        if (st === 'circle') {
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        } else if (st === 'square' || st === 'Square') {
          ctx.rect(cx - radius, cy - radius, radius * 2, radius * 2);
        } else if (st === 'star' || st === 'Star') {
          const spikes = s.spikes || 5;
          const outer = radius, inner = radius * 0.5;
          for (let i = 0; i < spikes * 2; i++) {
            const ang = (i * Math.PI) / spikes;
            const r2 = i % 2 === 0 ? outer : inner;
            const px = cx + Math.cos(ang) * r2;
            const py = cy + Math.sin(ang) * r2;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
        }
        try { ctx.fillStyle = s.fillColor || '#fff'; ctx.fill(); } catch(e) {}
        if (s.strokeColor) {
          try { ctx.strokeStyle = s.strokeColor; ctx.lineWidth = 1; ctx.stroke(); } catch(e) {}
        }

      } else if (visual.type === 'text' && visual.text?.content) {
        const size = Math.min(visual.text.size || 14, cellH * 0.5);
        ctx.font = `${size}px ${visual.text.font || 'monospace'}`;
        ctx.fillStyle = visual.text.color || '#313131';
        ctx.fillText(visual.text.content, x + 4, y + size + 4);
      }
    });
  });

  // grid lines
  ctx.strokeStyle = 'rgba(49,49,49,0.15)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= cols; i++) {
    ctx.beginPath(); ctx.moveTo(i * cellW, 0); ctx.lineTo(i * cellW, H); ctx.stroke();
  }
  for (let i = 0; i <= rows; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * cellH); ctx.lineTo(W, i * cellH); ctx.stroke();
  }
}

// ─── main ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // nav buttons
  document.getElementById('root-garden')?.addEventListener('click', () =>
    window.open('index.html', '_blank', 'noopener,noreferrer'));
  document.getElementById('harvest-garden')?.addEventListener('click', () =>
    window.open('harvest.html', '_blank', 'noopener,noreferrer'));

  // filter
  let activeFilter = 'all';
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      applyFilter();
    });
  });

  function applyFilter() {
    const items = document.querySelectorAll('.garden-item');
    let visible = 0;
    items.forEach(item => {
      const grown = item.dataset.grown === 'true';
      const show =
        activeFilter === 'all' ||
        (activeFilter === 'grown'  && grown) ||
        (activeFilter === 'nogrow' && !grown);
      item.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    updateCount(visible);
  }

  function updateCount(n) {
    const el = document.getElementById('seed-count');
    if (el) el.textContent = `${n} seed${n !== 1 ? 's' : ''}`;
  }

  waitForSeedsCol(init);
});

async function init() {
  const overlay  = document.getElementById('loading-overlay');
  const grid     = document.getElementById('garden-grid');
  const PAGE_SIZE = 20;
  let lastDoc    = null;
  let totalShown = 0;

  function isDefaultSeed(data) {
    if (!data.layers || data.layers.length === 0) return true;
    return !data.layers.some(layer =>
      layer.visuals && Object.values(layer.visuals).some(v => v.type && v.type !== 'empty')
    );
  }

  function hasGrowth(data) {
    const gc = data.growthConfig;
    return !!(gc && ((gc.sun || 0) + (gc.water || 0) + (gc.vitamins || 0) > 0));
  }

  function renderSeeds(docs) {
    docs.forEach(doc => {
      const data = doc.data();
      if (isDefaultSeed(data)) return;

      const grown = hasGrowth(data);
      const cw = Number(data.gridConfig?.canvasWidth  || 400);
      const ch = Number(data.gridConfig?.canvasHeight || 300);

      const item = document.createElement('div');
      item.className = 'garden-item';
      item.dataset.grown = grown ? 'true' : 'false';
      item.style.setProperty('--orig-w', `${cw}px`);
      item.style.setProperty('--orig-h', `${ch}px`);
      item.style.aspectRatio = `${cw} / ${ch}`;

      // growth badge
      const badge = grown
        ? `<div class="growth-badge grown">growing</div>`
        : `<div class="growth-badge nogrow">no growth</div>`;

      // static preview canvas (always shown as placeholder)
      item.innerHTML = `
        ${badge}
        <div class="label">${doc.id}</div>
        <div class="iframe-placeholder" role="button" aria-label="play ${doc.id}">
          <canvas class="preview-canvas" width="${Math.round(cw * 0.5)}" height="${Math.round(ch * 0.5)}"></canvas>
          <div class="ph-overlay">
            <button class="ph-cta">▶ play</button>
          </div>
        </div>
      `;

      // draw static preview
      const previewCanvas = item.querySelector('.preview-canvas');
      try { drawStaticPreview(previewCanvas, data); } catch(e) { console.warn('preview error', e); }

      // if thumbUrl exists, overlay it on top of the canvas
      if (data.thumbUrl) {
        const img = document.createElement('img');
        img.className = 'thumb';
        img.src = data.thumbUrl;
        img.alt = `preview ${doc.id}`;
        item.querySelector('.iframe-placeholder').insertBefore(img, item.querySelector('.ph-overlay'));
      }

      // play / pause toggle
      item.querySelector('.iframe-placeholder').addEventListener('click', () => {
        const playing = item.classList.contains('playing');
        const existing = item.querySelector('iframe');
        if (playing) {
          existing?.remove();
          item.classList.remove('playing');
        } else {
          if (!existing) {
            const iframe = document.createElement('iframe');
            iframe.loading = 'lazy';
            iframe.src = `harvest.html?seed=${encodeURIComponent(doc.id)}`;
            iframe.style.cssText = 'position:absolute;top:0;left:0;border:none;width:100%;height:100%;';
            item.appendChild(iframe);
          }
          item.classList.add('playing');
        }
      });

      grid.appendChild(item);
      totalShown++;
    });

    document.getElementById('seed-count').textContent =
      `${totalShown} seed${totalShown !== 1 ? 's' : ''}`;

    // re-apply current filter after new items added
    const event = new CustomEvent('refilter');
    document.dispatchEvent(event);
  }

  // re-apply filter when new items appended
  document.addEventListener('refilter', () => {
    const filterBtn = document.querySelector('.filter-btn.active');
    if (filterBtn) filterBtn.click();
  });

  async function loadPage() {
    let q = window.seedsCol.orderBy('updatedAt', 'desc').limit(PAGE_SIZE);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (!snap.empty) {
      lastDoc = snap.docs[snap.docs.length - 1];
      renderSeeds(snap.docs);
      return true;
    }
    return false;
  }

  try {
    await loadPage();
  } catch(err) {
    console.error('Error fetching seeds:', err);
  } finally {
    overlay.style.display = 'none';
  }

  // infinite scroll
  const onScroll = async () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
      const more = await loadPage();
      if (!more) window.removeEventListener('scroll', onScroll);
    }
  };
  window.addEventListener('scroll', onScroll);
}
