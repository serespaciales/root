
///////=========================GROW USER INTERACTION============================////////////////
///////=========================GROW USER INTERACTION============================////////////////

function setupGrowthIntegration(seedId) {
  // Si no estamos en modo edición, sólo colorea el borde y vuelve.
  if (MODE !== 'edit') {
    activeBorderColor = color(0, 255, 0);
    return;
  }

  // Referencias al popup y controles
  const popup         = document.getElementById('growth-popup');
  const openBtn       = document.getElementById('growth-btn');           // botón para abrir el popup
  const closeBtn      = popup.querySelector('.popup-close');            // botón de cerrar dentro del popup
  const applyBtn      = document.getElementById('apply-growth');     // botón Apply Growth
  const bottomButtons = document.getElementById('bottom-buttons');      // contenedor padre para estilos “active”
  const fields        = ['sun','water','vitamins','days'];              // nombres de sliders
  const cfg           = window.growthConfig || {};                      // objeto donde guardamos valores


  
  // 1) POPUP UI: oculto por defecto, abrir/cerrar y draggable
  popup.style.display = 'none';
  openBtn.addEventListener('click', e => {
    e.stopImmediatePropagation();
    const isHidden = getComputedStyle(popup).display === 'none';
    popup.style.display = isHidden ? 'flex' : 'none';
    bottomButtons.classList.toggle('active', isHidden);
    popup.style.zIndex = ++topZIndex;
  });
  closeBtn.addEventListener('click', () => {
    popup.style.display = 'none';
    bottomButtons.classList.remove('active');
  });
  makePopupDraggable(popup);

  

  // 2) SLIDERS: valor inicial + listener para mantener cfg al día
  fields.forEach(name => {
    // tus sliders p5.js: ej. sliders.sun.value()
    const input   = sliders[name];
    const display = document.getElementById(`${name}-value`);
    // inicializar al valor actual
    if (cfg[name] != null) input.value(cfg[name]);
    if (display)           display.textContent = input.value();
    // al mover el slider...
    input.input(() => {
      cfg[name] = Number(input.value());
      if (display) display.textContent = cfg[name];
    });
  });

  // 3) APPLY: guarda en Firestore, refresca canvas y cierra popup
applyBtn.addEventListener('click', async () => {
  try {
    // Timestamp de inicio (solo si no existe ya)
    if (!cfg.startDate) {
      cfg.startDate = firebase.firestore.FieldValue.serverTimestamp();
    }

    // Construye el objeto a guardar
    const data = {
      growthConfig: cfg,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      locked: true,                // 👈 bloquea para siempre
      isBlockedForGrowth: true,    // opcional, solo como espejo semántico
      blockedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    console.log('Guardando growthConfig:', data);
    await seedsCol.doc(seedId).set({
      growthConfig: cfg, // tus sliders y startDate si ya existía
      locked: true,
      isBlockedForGrowth: true,
      blockedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Refresca el dibujo
    await fetchAndRenderGrowth(seedId);

    // Cierra el popup y restablece estilos
    popup.style.display = 'none';
    bottomButtons.classList.remove('active');

    // **NUEVO**: bloquea todos los tool-btn excepto clone-seed
    document.querySelectorAll('.tool-btn').forEach(btn => {
      if (btn.id !== 'clone-seed') {
        btn.disabled = true;
        btn.classList.add('disabled');      // opcional: añade estilo CSS .disabled { opacity: .3; cursor: not-allowed; }
      }
    });

    // **NUEVO**: muestra mensaje de bloqueo
    // Puedes usar un alert sencillo:
    alert('is blocked for growth');
    // O inyectarlo en el DOM, por ejemplo:
    const blockerMsg = document.createElement('div');
    blockerMsg.id = 'growth-blocker-msg';
    blockerMsg.textContent = 'is blocked for growth';
    blockerMsg.style = 'position:fixed;top:10px;right:10px;padding:8px 12px;background:#d0fc76;color:#333;border-radius:4px;z-index:2000;';
    document.body.appendChild(blockerMsg);

  } catch (err) {
    console.error('Error al guardar Growth:', err);
    alert(`❌ Error saving growth settings: ${err.message}. Check console for details.`);
  }
});
  // Finalmente, marcamos borde verde porque ya está listo
  activeBorderColor = color(0, 255, 0);
}
