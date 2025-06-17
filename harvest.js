let seedCtrl;
let refreshTimer = null;

function initializeCanvas(data) {
    const scaleFactor = 0.5;

    const originalWidth = data?.gridConfig?.canvasWidth || 400;
    const originalHeight = data?.gridConfig?.canvasHeight || 300;
    const aspectRatio = originalWidth / originalHeight;
    const scaledWidth = originalWidth * scaleFactor;
    const scaledHeight = scaledWidth / aspectRatio;

    try {
        const canvasWrapper = document.getElementById('canvas-wrapper');
        const growingWrapper = document.getElementById('growing-wrapper');
        if (!canvasWrapper || !growingWrapper) {
            throw new Error('Canvas wrappers not found');
        }

        // Clear existing content to prevent duplication
        canvasWrapper.innerHTML = '';
        growingWrapper.innerHTML = '';

        seedCtrl = new p5(p => {
            p.setup = () => {
                p.createCanvas(scaledWidth, scaledHeight).parent(canvasWrapper);
                console.log('Seed canvas initialized with size:', scaledWidth, 'x', scaledHeight);
            };
            p.draw = () => {
                if (typeof drawSeed === 'function') drawSeed(p);
            };
        });

        // No growingCtrl p5 instance; use CSS for growing-container background
        const growingContainer = document.getElementById('growing-container');
        if (growingContainer) {
            growingContainer.classList.add('no-growth');
        }
    } catch (err) {
        console.error('Canvas initialization failed:', err);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing...');

    const lookupBtn = document.getElementById('lookupBtn');
    const seedIdInput = document.getElementById('seedId');
    if (lookupBtn && seedIdInput) {
        lookupBtn.addEventListener('click', onLookup);
        seedIdInput.addEventListener('keyup', e => e.key === 'Enter' && onLookup());
    } else {
        console.error('Lookup button or seed input not found');
    }

    const seedFullscreenBtn = document.getElementById('seedFullscreenBtn');
    if (seedFullscreenBtn) {
        seedFullscreenBtn.addEventListener('click', () => {
            const canvasWrapper = document.getElementById('canvas-wrapper');
            if (canvasWrapper) {
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(err => console.error('Exit fullscreen failed:', err));
                } else {
                    canvasWrapper.requestFullscreen().catch(err => console.error('Request fullscreen failed:', err));
                }
            } else {
                console.error('canvas-wrapper not found for fullscreen');
            }
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const urlSeed = urlParams.get('seed');
    if (urlSeed && /^[A-Za-z0-9]{7}$/.test(urlSeed)) {
        seedIdInput.value = urlSeed;
        onLookup();
    }
});

async function fetchAndRenderSeed(seedId) {
    try {
        console.log(`Fetching seed ${seedId}...`);
        const doc = await seedsCol.doc(seedId).get();
        if (!doc.exists) throw new Error('No such seed');
        const data = doc.data();
        console.log('Fetched seed data:', data);

        if (!seedCtrl) initializeCanvas(data);

        const plantedAt = data.plantedAt || firebase.firestore.Timestamp.now();
        const updatedAt = data.updatedAt || firebase.firestore.Timestamp.now();
        const dayIndex = typeof computeElapsedDays === 'function' ? Math.floor(computeElapsedDays(plantedAt)) : 0;
        console.log(`Computed day index: ${dayIndex}`);

        if (typeof loadSeed === 'function') loadSeed(data);
        if (window.growthManager) {
            window.growthManager.init(seedId);
            const growingContainer = document.getElementById('growing-container');
            if (growingContainer) {
                if (data.growthProgress > 0 && data.locked) {
                    window.growthManager.progress = data.growthProgress;
                    window.growthManager.applyGrowthEffects();
                    growingContainer.classList.remove('no-growth');
                    // Optionally reinitialize growing canvas if needed later
                    if (!growingCtrl) {
                        growingCtrl = new p5(p => {
                            p.setup = () => {
                                const scaleFactor = 0.5;
                                const originalWidth = data.gridConfig?.canvasWidth || 400;
                                const originalHeight = data.gridConfig?.canvasHeight || 300;
                                const aspectRatio = originalWidth / originalHeight;
                                const scaledWidth = originalWidth * scaleFactor;
                                const scaledHeight = scaledWidth / aspectRatio;
                                p.createCanvas(scaledWidth, scaledHeight).parent('growing-wrapper');
                            };
                            p.draw = () => {
                                if (typeof drawSeed === 'function') drawSeed(p);
                            };
                        });
                    }
                    if (growingCtrl) growingCtrl.redraw();
                } else {
                    growingContainer.classList.add('no-growth');
                }
            }
        }

        const summary = document.getElementById('harvest-summary');
        if (summary) summary.textContent = `Last update: ${updatedAt.toDate().toLocaleString()}`;

        const growingSummary = document.getElementById('growing-summary');
        if (growingSummary) {
            growingSummary.innerHTML = `Methods used:<br>Days elapsed: ${dayIndex}/21<br>Last update: ${new Date().toLocaleString()}`;
        }

        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(() => fetchAndRenderSeed(seedId), 3600e3); // 1-hour refresh
    } catch (err) {
        console.error('Error fetching seed:', err);
        const summary = document.getElementById('harvest-summary');
        if (summary) summary.textContent = `Error: ${err.message}`;
        const errorDiv = document.getElementById('seedError');
        if (errorDiv) errorDiv.textContent = err.message;
    }
}

function onLookup() {
    const seedIdInput = document.getElementById('seedId');
    const errDiv = document.getElementById('seedError');
    if (!seedIdInput || !errDiv) {
        console.error('Seed input or error div not found');
        return;
    }

    const seedId = seedIdInput.value.trim();
    if (!/^[A-Za-z0-9]{7}$/.test(seedId)) {
        errDiv.textContent = 'Seed ID must be exactly 7 alphanumeric characters.';
        return;
    }
    errDiv.textContent = '';

    const url = new URL(window.location);
    url.searchParams.set('seed', seedId);
    window.history.replaceState({}, '', url);
    console.log('Updated URL to:', url.toString());

    if (refreshTimer) clearInterval(refreshTimer);
    fetchAndRenderSeed(seedId);
}

window.addEventListener('unload', () => {
    if (refreshTimer) clearInterval(refreshTimer);
    if (seedCtrl) seedCtrl.remove();
    if (growingCtrl) growingCtrl.remove();
});