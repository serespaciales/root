document.addEventListener('DOMContentLoaded', async () => {
  const overlay = document.getElementById('loading-overlay');
  overlay.style.display = 'flex';

  if (!window.seedsCol) {
    console.error('Seeds collection not initialized');
    setTimeout(() => overlay.style.display = 'none', 1500);
    return;
  }

  const PAGE_SIZE = 20;
  let lastDoc = null;
  const grid = document.getElementById('garden-grid');

  function renderSeeds(docs) {
    docs.forEach(doc => {
      const data = doc.data();
      const item = document.createElement('div');
      item.className = 'garden-item';

      // ① Pasa tamaños ORIGINALES y ratio como CSS vars (¡clave!)
      const cw = Number(data.gridConfig?.canvasWidth  || 800);
      const ch = Number(data.gridConfig?.canvasHeight || 600);
      item.style.setProperty('--orig-w', `${cw}px`);
      item.style.setProperty('--orig-h', `${ch}px`);
      const ratio = (cw > 0 && ch > 0) ? `${cw} / ${ch}` : '1 / 1';
      item.style.setProperty('--ar', ratio);
      item.style.aspectRatio = ratio; // cinturón y tirantes

      // ② Placeholder + botón
      const thumb = data.thumbUrl || '';
      item.innerHTML = `
        <div class="label">Seed ${doc.id}</div>
        <div class="iframe-placeholder" role="button" aria-label="Play ${doc.id}">
          ${thumb ? `<img class="thumb" src="${thumb}" alt="preview ${doc.id}">`
                  : `<div class="no-thumb">preview coming soon</div>`}
          <button class="ph-cta">▶ play</button>
        </div>
      `;

      // ③ Toggle play/pause (el overlay se queda para capturar el 2º click)
      const ph = item.querySelector('.iframe-placeholder');
      ph.addEventListener('click', () => {
        const playing = item.classList.contains('playing');
        const existingIframe = item.querySelector('iframe');

        if (playing) {
          if (existingIframe) existingIframe.remove(); // PAUSE
          item.classList.remove('playing');
        } else {
          if (!existingIframe) {
            const iframe = document.createElement('iframe');
            iframe.loading = 'lazy';
            iframe.referrerPolicy = 'no-referrer';
            iframe.src = `harvest.html?seed=${encodeURIComponent(doc.id)}`;
            iframe.style.position = 'absolute';
            iframe.style.inset = '0';
            iframe.style.border = 'none';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            item.appendChild(iframe);
          }
          item.classList.add('playing'); // PLAY
        }
      });

      grid.appendChild(item);
    });
  }

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
  } catch (err) {
    console.error('Error fetching seeds:', err);
  } finally {
    overlay.style.display = 'none';
  }

  // Infinite scroll (con handler nombrado)
  const onScroll = async () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
      const more = await loadPage();
      if (!more) window.removeEventListener('scroll', onScroll);
    }
  };
  window.addEventListener('scroll', onScroll);
});

/* Botón para abrir el editor */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('root-garden');
  if (btn) {
    btn.addEventListener('click', () => {
      window.open('index.html', '_blank', 'noopener,noreferrer');
    });
  }
});
