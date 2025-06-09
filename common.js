/**
 * Replay the user’s base layers on a given controller.
 * @param {*} ctrl   - the controller returned by sketch.init()
 * @param {Array} layers - the Firestore 'layers' array
 */
function renderLayers(ctrl, layers) {
    // clear before drawing
    ctrl.clear();
    for (const layer of layers) {
      if (!layer.visible) continue;
      const p = layer.params;
      if (p.gradient) {
        // assume sketch.js exposes drawGradientLayer
        ctrl.drawGradientLayer(p.gradient);
      }
      if (p.shape) {
        ctrl.drawShapeLayer(p.shape);
      }
      if (p.text) {
        ctrl.drawTextLayer(p.text);
      }
      if (p.image) {
        ctrl.drawImageLayer(p.image);
      }
    }
  }
  
  /**
   * Draw the full "seed" composition from Firestore data.
   * @param {*} ctrl - the controller on which to draw
   * @param {Object} data - Firestore document data containing .layers
   */
  function drawSeedFromData(ctrl, data) {
    renderLayers(ctrl, data.layers);
    ctrl.render();
  }
  
  /**
   * Compute the number of days elapsed since plantedAt, clamped to [0, 21].
   * @param {firebase.firestore.Timestamp|Date|string} plantedAt
   * @returns {number} days elapsed (float)
   */
  function computeElapsedDays(plantedAt) {
    // convert to JS Date
    const start = plantedAt.toDate ? plantedAt.toDate() : new Date(plantedAt);
    const msDiff = Date.now() - start.getTime();
    const days = msDiff / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.min(21, days));
  }
  
  // Expose globally
  window.renderLayers = renderLayers;
  window.drawSeedFromData = drawSeedFromData;
  window.computeElapsedDays = computeElapsedDays;
  