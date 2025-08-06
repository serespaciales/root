document.addEventListener('DOMContentLoaded', async () => {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'flex';
  
    if (!window.seedsCol) {
      console.error('Seeds collection not initialized');
      setTimeout(() => overlay.style.display = 'none', 5000);
      return;
    }
  
    const PAGE_SIZE = 20;
    let lastDoc = null;
    const grid = document.getElementById('garden-grid');
  
    function renderSeeds(docs) {
      docs.forEach(doc => {
        const data = doc.data();
        // Aquí ya no es necesario volver a filtrar por startDate, 
        // porque la consulta sólo nos trajo los que tienen startDate > 0.
        const item = document.createElement('div');
        item.className = 'garden-item';
        if (data.gridConfig) {
          const { canvasWidth, canvasHeight } = data.gridConfig;
          item.style.aspectRatio = `${canvasWidth} / ${canvasHeight}`;
        }
        item.innerHTML = `
          <div class="label">Seed ${doc.id}</div>
          <iframe 
            src="harvest.html?seed=${encodeURIComponent(doc.id)}" 
            loading="lazy">
          </iframe>
        `;
        grid.appendChild(item);
      });
    }
  
    async function loadPage() {
      // Creamos un Timestamp “mínimo” para filtrar > 0
      const zeroTS = new firebase.firestore.Timestamp(0, 0);
      let q = window.seedsCol
        .where('growthConfig.startDate', '>', zeroTS)
        .orderBy('growthConfig.startDate', 'desc')
        .limit(PAGE_SIZE);
  
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
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 5000);
    }
  
    // (Opcional) Infinite scroll para cargar más growth-seeds
    window.addEventListener('scroll', async () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
        const more = await loadPage();
        if (!more) window.removeEventListener('scroll', this);
      }
    });
  });
  

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('root-garden');
    if (btn) {
      btn.addEventListener('click', () => {
        window.open('index.html', '_blank', 'noopener,noreferrer');
      });
    }
  });
  
  