class GrowthManager {
    constructor() {
        this.isGrowing = false;
        this.progress = 0;
        this.intervalId = null;
        this.seedId = null;
        this.startTime = null;
        this.totalDays = 0;
        this.growthConfig = null;
        this.lastUpdate = 0;
    }

    init(seedId) {
        this.seedId = seedId;
        this.loadGrowthState();
    }

    loadGrowthState() {
        seedsCol.doc(this.seedId).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                this.progress = data.growthProgress || 0;
                this.isGrowing = data.locked || false;
                this.growthConfig = data.growthConfig || { sun: 1, water: 1, vitamins: 1, days: 1, startDate: null };
                this.totalDays = this.growthConfig.days || 1;
                this.startTime = this.growthConfig.startDate ? new Date(this.growthConfig.startDate).getTime() : null;
                this.updateUI();
                this.applyGrowthEffects(); // Initial render
            }
        }).catch(err => console.error('Error loading growth state:', err));
    }

    applyGrowthConfig(sun, water, vitamins, days) {
        if (this.isGrowing) return;

        this.growthConfig = { sun, water, vitamins, days, startDate: firebase.firestore.FieldValue.serverTimestamp() };
        this.totalDays = days;
        this.startTime = Date.now();
        this.progress = 0;
        this.isGrowing = true;
        this.lastUpdate = 0;

        seedsCol.doc(this.seedId).set({
            growthConfig: this.growthConfig,
            growthProgress: this.progress,
            locked: this.isGrowing,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(() => {
            console.log(`Growth applied for seed ${this.seedId}`);
            this.startGrowthInterval();
            this.updateUI();
            this.lockSeed();
        }).catch(err => console.error('Error applying growth:', err));
    }

    startGrowthInterval() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(() => this.updateGrowth(), 60000); // Update every minute
    }

    updateGrowth() {
        if (!this.isGrowing || !this.startTime) return;

        const elapsedMinutes = (Date.now() - this.startTime) / 60000;
        const totalMinutes = this.totalDays * DAY_IN_MINUTES;
        const newProgress = Math.min(100, (elapsedMinutes / totalMinutes) * 100);

        if (newProgress > this.progress + 5 || newProgress >= 100) {
            this.progress = newProgress;
            this.applyGrowthEffects();
            this.lastUpdate = Date.now();

            seedsCol.doc(this.seedId).update({
                growthProgress: this.progress,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                console.log(`Growth progress updated to ${this.progress}% for seed ${this.seedId}`);
                this.updateUI();
                if (this.progress >= 100) this.stopGrowth();
            }).catch(err => console.error('Error updating growth:', err));
        }
    }

    stopGrowth() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.isGrowing = false;
            seedsCol.doc(this.seedId).update({
                locked: true,
                growthProgress: 100
            }).then(() => {
                console.log(`Growth completed for seed ${this.seedId}`);
                this.updateUI();
            }).catch(err => console.error('Error stopping growth:', err));
        }
    }

    applyGrowthEffects() {
        seedsCol.doc(this.seedId).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                const layers = data.layers || [];
                const progress = this.progress / 100;
                const randomOffset = Math.random() * 0.1;
                const randomVariation = Math.random() * 0.2 - 0.1;
                const syncFactor = 0.3;

                const batch = firebase.firestore().batch();
                layers.forEach((layer, layerIndex) => {
                    const visuals = layer.visuals || {};
                    Object.keys(visuals).forEach(key => {
                        const visual = { ...visuals[key] };
                        this.applyGrowthEffect(visual, progress, this.growthConfig, randomOffset, randomVariation, syncFactor);
                        batch.update(seedsCol.doc(this.seedId), {
                            [`layers.${layerIndex}.visuals.${key}`]: visual
                        }, { merge: true });
                    });
                });

                batch.commit().catch(err => console.error('Error applying batch growth effects:', err));
            }
        });
    }

    applyGrowthEffect(visual, progress, config, randomOffset, randomVariation, distanceFactor) {
        const factor = (val) => Math.min(10, val) / 10; // Normalize 1-10 to 0-1
        const sun = factor(config.sun);
        const water = factor(config.water);
        const vitamins = factor(config.vitamins);

        // Initialize properties
        visual.bloom = visual.bloom || { sigma: 0, intensity: 0 };
        visual.shape = visual.shape || { extrudePct: 0, opacity: 0, subdivisions: 0, tint: null };
        visual.text = visual.text || { extrude: 0, branches: 0, hue: 0, content: "" };
        visual.speckles = visual.speckles || { pct: 0, radius: 0 };

        const adjustedRandomOffset = randomOffset * (1 - distanceFactor);
        const adjustedRandomVariation = randomVariation * (1 - distanceFactor);

        switch (visual.type) {
            case 'gradient':
                // Chlorophyll Radiance
                const hueShift = map(progress, 0, 1, 0, 15 * sun) + (Math.random() * 5 - 2.5) * adjustedRandomOffset;
                const satShift = map(progress, 0, 1, 0, 15 * water) + (Math.random() * 5 - 2.5) * adjustedRandomOffset;
                visual.colors = visual.colors.map(color => {
                    const [r, g, b] = color.match(/\d+/g).map(Number);
                    let [h, s, l] = rgbToHsl(r, g, b);
                    h = (h + hueShift / 360) % 1;
                    s = Math.min(1, s + satShift / 100 + (Math.random() * 0.05 - 0.025) + adjustedRandomVariation * 0.05);
                    if (Math.random() < 0.05) h = Math.random(); // 5% chance new hue
                    [r, g, b] = hslToRgb(h, s, l);
                    return `rgb(${r}, ${g}, ${b})`;
                });
                visual.bloom.sigma = map(progress, 0, 1, 4, 16) * sun + (Math.random() * 0.2 - 0.1) + adjustedRandomVariation;
                visual.bloom.intensity = map(progress, 0, 1, 0, hueShift / 15) * vitamins + (Math.random() * 0.2 - 0.1) + adjustedRandomVariation;
                break;

            case 'shape':
                // Bloom Expansion
                visual.shape.extrudePct = map(progress, 0, 1, 0, 40 * vitamins) + (Math.random() * 10 - 5) * adjustedRandomOffset;
                visual.shape.opacity = map(progress, 0, 1, 0, 40 * sun) + (Math.random() * 10 - 5) * adjustedRandomOffset;
                visual.shape.subdivisions = Math.floor(map(progress, 0, 1, 0, 4 * water) + (Math.random() * 1 - 0.5) * adjustedRandomOffset);
                if (Math.random() < 0.05) visual.shape.tint = Math.random() < 0.5 ? 'cerulean' : 'rose-gold';
                break;

            case 'text':
                // Vine Curl
                visual.text.extrude = map(progress, 0, 1, 0, 60 * water) + (Math.random() * 15 - 7.5) * adjustedRandomOffset;
                visual.text.branches = Math.floor(map(progress, 0, 1, 0, 4 * sun) + (Math.random() * 1 - 0.5) * adjustedRandomOffset);
                visual.text.hue = (map(progress, 0, 1, 0, 360) + (Math.random() * 90 - 45) * adjustedRandomOffset) % 360;
                if (Math.random() < 0.05) visual.text.content += String.fromCharCode(65 + Math.floor(Math.random() * 26));
                break;

            case 'image':
                // Moss Mirage
                visual.speckles.pct = map(progress, 0, 1, 0, 80 * vitamins) + (Math.random() * 20 - 10) * adjustedRandomOffset;
                visual.speckles.radius = map(progress, 0, 1, 0, 3 * water) + (Math.random() * 1 - 0.5) * adjustedRandomOffset;
                visual.blur = map(progress, 0, 1, 0, 5 * sun) + (Math.random() * 1 - 0.5) * adjustedRandomOffset;
                if (Math.random() < 0.05) visual.tint = Math.random() < 0.5 ? 'neon-lavender' : 'neon-azure';
                break;
        }
    }

    updateUI() {
        const growingSummary = document.getElementById('growing-summary');
        if (growingSummary) {
            growingSummary.innerHTML = `Methods used:<br>Days elapsed: ${Math.floor(this.progress * this.totalDays / 100)}/21<br>Last update: ${new Date(this.lastUpdate).toLocaleString()}`;
        }
        const cloneBtn = document.getElementById('cloneSeedBtn');
        if (cloneBtn) {
            cloneBtn.style.display = this.isGrowing && this.progress >= 100 ? 'block' : 'none';
        }
    }

    lockSeed() {
        const seedContainer = document.getElementById('seed-container');
        const growingContainer = document.getElementById('growing-container');
        if (seedContainer && growingContainer) {
            seedContainer.style.pointerEvents = 'none';
            growingContainer.style.pointerEvents = 'none';
        }
    }

    cloneSeed() {
        const newSeed = generateSeed();
        seedsCol.doc(newSeed).set({
            layers: window.layers,
            gridConfig: window.gridConfig,
            plantedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            window.location.href = `?seed=${newSeed}`;
            console.log(`Cloned seed ${this.seedId} to ${newSeed}`);
        }).catch(err => console.error('Error cloning seed:', err));
    }
}

const growthManager = new GrowthManager();

document.addEventListener('DOMContentLoaded', () => {
    const applyGrowthBtn = document.getElementById('applyGrowthBtn');
    const cloneSeedBtn = document.getElementById('cloneSeedBtn');
    const seedIdInput = document.getElementById('seedId');

    if (applyGrowthBtn && seedIdInput) {
        applyGrowthBtn.addEventListener('click', () => {
            const sun = parseInt(document.getElementById('sun-slider').value);
            const water = parseInt(document.getElementById('water-slider').value);
            const vitamins = parseInt(document.getElementById('vitamins-slider').value);
            const days = parseInt(document.getElementById('days-slider').value);
            growthManager.init(seedIdInput.value);
            growthManager.applyGrowthConfig(sun, water, vitamins, days);
        });
    }

    if (cloneSeedBtn && seedIdInput) {
        cloneSeedBtn.addEventListener('click', () => {
            growthManager.cloneSeed();
        });
    }
});

// Helper functions
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}

function generateSeed() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let seed = '';
    for (let i = 0; i < 7; i++) {
        seed += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return seed;
}
