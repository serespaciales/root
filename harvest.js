// ─── 1) FIREBASE SETUP ───
const firebaseConfig = {
  apiKey:            "AIzaSyAN1_EbV_HesrVr2PUZEqwH5xkT23jNXko",
  authDomain:        "root-online.firebaseapp.com",
  projectId:         "root-online",
  storageBucket:     "root-online.appspot.com",
  messagingSenderId: "414106332565",
  appId:             "1:414106332565:web:54bd602fe0657f25435a9c"
};
firebase.initializeApp(firebaseConfig);
const db       = firebase.firestore();
const seedsCol = db.collection('seeds');

// Controllers for the two canvases
let seedCtrl, growCtrl;
let refreshTimer = null;

// ─── 2) WHEN DOM IS READY ───
window.addEventListener('DOMContentLoaded', () => {
  // 2.1) Initialize Modulariem on both canvases
  seedCtrl = root.init(document.getElementById('modularCanvas'));
  growCtrl = root.init(document.getElementById('harvestCanvas'));

  // 2.2) Wire up Lookup button + Enter key
  const lookupBtn = document.getElementById('lookupBtn');
  const seedInput = document.getElementById('seedId');
  if (lookupBtn) lookupBtn.addEventListener('click', onLookup);
  if (seedInput) {
    seedInput.addEventListener('keyup', e => {
      if (e.key === 'Enter') onLookup();
    });
  }

  // 2.3) Wire up Full-screen for the original canvas
  const fullBtn = document.getElementById('seedFullscreenBtn');
  if (fullBtn) {
    fullBtn.addEventListener('click', () => {
      const c = document.getElementById('modularCanvas');
      if (document.fullscreenElement) document.exitFullscreen();
      else c.requestFullscreen?.();
    });
  }
});

// ─── 3) SEED VALIDATION & KICKOFF ───
function onLookup() {
  const seedId = document.getElementById('seedId').value.trim();
  const errDiv = document.getElementById('seedError');

  if (!/^[A-Za-z0-9]{7}$/.test(seedId)) {
    errDiv.textContent = 'Seed ID must be exactly 7 alphanumeric characters.';
    return;
  }
  errDiv.textContent = '';
  if (refreshTimer) clearInterval(refreshTimer);
  fetchAndRenderSeed(seedId);
}

// ─── 4) HELPER: elapsed days [0–21] ───
function computeElapsedDays(ts) {
  const then = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - then.getTime();
  return Math.max(0, Math.min(21, diff/(1000*60*60*24)));
}

// ─── 5) FETCH + RENDER LOOP ───
async function fetchAndRenderSeed(seedId) {
  try {
    // 5.1) Load Firestore doc
    const doc = await seedsCol.doc(seedId).get();
    if (!doc.exists) throw new Error('No such seed');
    const data = doc.data();
    if (!data.plantedAt) throw new Error('Missing plantedAt');

    // 5.2) Clear + replay original on left canvas
    seedCtrl.clear();
    seedCtrl.drawSeed();

    // 5.3) Compute day index and pull params
    const day = Math.floor(computeElapsedDays(data.plantedAt));
    const vine = VINE_PARAMS[day],
          chl  = CHLORO_PARAMS[day],
          blo  = BLOOM_PARAMS[day],
          mos  = MOSS_PARAMS[day];

    // 5.4) Clear + overlay growth on right canvas
    growCtrl.clear();
    growCtrl
      .drawSeed()
      .vineCurl(vine.A, vine.Ca, vine.K)
      .chlorophyllRadiance(
         chl.hueShift,
         chl.satShift !== null ? chl.satShift : chl.satOscillate,
         chl.bloomSigma,
         chl.bloomIntensityScale,
         chl.palette
      )
      .bloomExpansion(
         blo.clusterDetection,
         blo.mode,
         blo.extrusionPct,
         blo.materialOpacity,
         blo.tint || blo.petalGradient,
         blo.fractal,
         blo.subdivisions,
         blo.displacementMethod,
         blo.noise,
         blo.pbrSettings
      )
      .mossMirage(
         mos.segmentation,
         mos.mode,
         mos.specklesPct,
         mos.speckleRadiusPx,
         mos.tintColors,
         mos.blurSigma,
         mos.patchGrouping,
         mos.perlin,
         mos.brightnessAnim
      )
      .render();

    // 5.5) Update the Day X/21 summary
    document.getElementById('harvest-summary').innerHTML = `
      <b>Day ${day+1} / 21</b>
      <em>Vine Curl: ${(vine.A.extrudePct*100).toFixed(0)}% extrude</em>
      <em>Chlorophyll: ${chl.hueShift}° shift</em>
      <em>Bloom Expansion: ${blo.mode}</em>
      <em>Moss Mirage: ${mos.mode}</em>
    `;

    // 5.6) Schedule hourly refresh until Day 21
    refreshTimer = setInterval(() => fetchAndRenderSeed(seedId), 3600_000);

  } catch (err) {
    document.getElementById('harvest-summary').textContent =
      'Error: ' + err.message;
  }
}
