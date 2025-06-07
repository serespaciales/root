// harvest.js

// — Status & timer elements
const _statusBar = document.getElementById('status-bar');
if (_statusBar) _statusBar.textContent = 'status: harvest.js loaded';
const _timerEl = document.getElementById('growth-timer');

let visuals, columnPositions = [], rowPositions = [], gridPoints = [];
let viewMode = 'original';

// — Build gridPoints from columnPositions + rowPositions
function computeGridPoints() {
  gridPoints = rowPositions.map(y => columnPositions.map(x => ({ x, y })));
}

// — Load growth settings (defaults if missing)
function loadGrowthConfig() {
  const seed = new URLSearchParams(location.search).get('seed');
  return JSON.parse(
    localStorage.getItem(`modulariem-${seed}-growth`)
  ) || {
    sun:       5,      // [0–10]
    water:     5,      // [0–10]
    vitamins:  5,      // [0–10]
    days:      2,      // test‐span in minutes
    startDate: new Date().toISOString()
  };
}

// — Draw the ORIGINAL visuals (your old code)
function drawOriginalVisuals() {
  const R = rowPositions.length - 1;
  const C = columnPositions.length - 1;
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const key = `${r}-${c}`, v = visuals[key];
      if (!v) continue;
      const A = gridPoints[r][c],
            B = gridPoints[r][c+1],
            C1= gridPoints[r+1][c+1],
            D = gridPoints[r+1][c];
      if (v.type === 'gradient') {
        drawAnimatedGradient(A, B, C1, D, v.colors, v.offset);
      }
      else if (v.img) {
        image(v.img, A.x, A.y, B.x-A.x, D.y-A.y);
      }
      else if (v.texture) {
        push(); translate(A.x, A.y);
          drawTexture(B.x-A.x, D.y-A.y, v.texture);
        pop();
      }
      else if (v.shape) {
        const s = v.shape;
        push(); translate(A.x, A.y);
          drawShape(B.x-A.x, D.y-A.y,
                    s.vertices, s.fillColor, s.strokeColor,
                    s.size, s.rotation);
        pop();
      }
      else if (v.type === 'text') {
        push(); translate(A.x, A.y);
          textFont(v.font);
          textSize(v.size);
          fill(v.color);
          textAlign(v.align.toUpperCase(), CENTER);
          text(v.content, (B.x-A.x)/2, (D.y-A.y)/2);
        pop();
      }
    }
  }
}

// — Draw the GROWING visuals with hue‐shift, speed & bounded jitter
function drawGrowingVisuals() {
  const { sun, water, vitamins, days, startDate } = loadGrowthConfig();

  // 0→1 over `days` minutes
  const elapsedMs = Date.now() - new Date(startDate).getTime();
  const t = constrain(elapsedMs / (days * 60 * 1000), 0, 1);

  const R = rowPositions.length - 1;
  const C = columnPositions.length - 1;
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const key = `${r}-${c}`, v = visuals[key];
      if (!v || v.type !== 'gradient') continue;

      const A  = gridPoints[r][c],
            B  = gridPoints[r][c+1],
            C1 = gridPoints[r+1][c+1],
            D  = gridPoints[r+1][c];

      // inside drawGrowingVisuals(), after you compute A, B, C1, D…

// 1) Compute cell dimensions & max jitter (10% of cell)
const cellW    = B.x - A.x;
const cellH    = D.y - A.y;
const maxJ     = map(vitamins, 0, 10, 0, min(cellW, cellH) * 0.1);

// 2) Define a smooth, per-corner oscillator
const freq    = 0.01;             // slow wobble
const phases  = [0, PI/2, PI, 3*PI/2]; 
const jitterPt = (pt, idx) => ({
  x: pt.x + sin(frameCount * freq + phases[idx]) * maxJ,
  y: pt.y + cos(frameCount * freq + phases[idx]) * maxJ
});

// 3) Generate your four perturbed corners
const p00 = jitterPt(A, 0);
const p10 = jitterPt(B, 1);
const p11 = jitterPt(C1,2);
const p01 = jitterPt(D, 3);


      // 2) hue‐shift via HSB (Sun)
      colorMode(HSB,360,100,100);
      const pctSun = sun/10;
      const warped = v.colors.map(hx => {
        const cc = color(hx),
              h  = hue(cc), s = saturation(cc), b = brightness(cc);
        return color(
          lerp(240,h,pctSun),
          lerp(s*0.3,s,pctSun),
          b
        ).toString();
      });
      colorMode(RGB,255,255,255);

      // 3) speed (Water)
      const speedF = map(water, 0, 10, 0.1, 2);
      const offset = v.offset + frameCount*0.01*speedF;

      // 4) draw shifted gradient
      drawAnimatedGradient(p00, p10, p11, p01, warped, offset);
    }
  }

  // mark completion
  if (t>=1 && _statusBar) _statusBar.textContent = '✅ Growth complete';
}

// — gradient helper (unchanged) —
function drawAnimatedGradient(p00,p10,p11,p01,cols,ofs) {
  const left = dist(p00.x,p00.y,p01.x,p01.y),
        right= dist(p10.x,p10.y,p11.x,p11.y),
        steps= ceil(max(left,right));
  noStroke();
  for (let i=0; i<steps; i++){
    const t0 = i/steps, t1=(i+1)/steps;
    const A={x:lerp(p00.x,p01.x,t0),y:lerp(p00.y,p01.y,t0)},
          B={x:lerp(p10.x,p11.x,t0),y:lerp(p10.y,p11.y,t0)},
          C={x:lerp(p10.x,p11.x,t1),y:lerp(p10.y,p11.y,t1)},
          D={x:lerp(p00.x,p01.x,t1),y:lerp(p00.y,p01.y,t1)};
    let tt=(t0+ofs+frameCount*0.01)%1;
    let col=(cols.length===3)
      ? (tt<0.5
          ? lerpColor(color(cols[0]),color(cols[1]),tt*2)
          : lerpColor(color(cols[1]),color(cols[2]),(tt-0.5)*2))
      : lerpColor(color(cols[0]),color(cols[1]||"#000"),tt);
    fill(col);
    beginShape();
      vertex(A.x,A.y); vertex(B.x,B.y);
      vertex(C.x,C.y); vertex(D.x,D.y);
    endShape(CLOSE);
  }
}

// — preload & setup — 
function preload() {
  const seed = new URLSearchParams(location.search).get('seed');
  const raw  = JSON.parse(localStorage.getItem(`modulariem-${seed}`))||{};
  visuals = {};
  Object.entries(raw).forEach(([k,v])=>{
    if (v.img) v.img = loadImage(v.img);
    visuals[k] = v;
  });
  window._harvestConfig = JSON.parse(
    localStorage.getItem(`modulariem-${seed}-config`)
  )||{rows:5,cols:8,margin:20};
}

function setup() {
  if (_statusBar) _statusBar.textContent='status: setup fired';

  const c = createCanvas(
    select('#main-canvas').elt.clientWidth,
    select('#main-canvas').elt.clientHeight
  ).parent('main-canvas');
  noLoop();  // start paused

  // build grid
  const {rows,cols,margin} = window._harvestConfig;
  const cw=(width-2*margin)/cols, ch=(height-2*margin)/rows;
  columnPositions = Array.from({length:cols+1},(_,i)=>margin+i*cw);
  rowPositions    = Array.from({length:rows+1},(_,i)=>margin+i*ch);
  computeGridPoints();

  // mode toggle: always loop so original animates too
  document.querySelectorAll('input[name="viewMode"]').forEach(radio=>{
    radio.addEventListener('change',e=>{
      viewMode = e.target.value;
      console.log('viewMode →',viewMode);
      loop();
    });
  });

  if (_statusBar) _statusBar.textContent='status: setup done';
}

// — main draw loop — 
function draw() {
  background(245);
  if (_statusBar) _statusBar.textContent=`mode:${viewMode}|frame:${frameCount}`;

  // timer
  if (viewMode==='growing' && _timerEl) {
    const {days,startDate} = loadGrowthConfig();
    const ms = Date.now() - new Date(startDate).getTime();
    const s  = min(floor(ms/1000), days*60),
          tot= days*60;
    const fmt = x=>`${floor(x/60)}:${String(x%60).padStart(2,'0')}`;
    _timerEl.textContent = `Growth: ${fmt(s)}/${fmt(tot)}`;
  }

  // grid
  stroke(0); strokeWeight(1); noFill();
  gridPoints.forEach(row=>{beginShape();row.forEach(p=>vertex(p.x,p.y));endShape();});
  for (let i=0;i<gridPoints[0].length;i++){
    beginShape();gridPoints.forEach(r=>vertex(r[i].x,r[i].y));endShape();
  }

  // pick your visuals routine
  if (viewMode === 'original') {
    drawOriginalVisuals();
  } else {
    drawGrowingVisuals();
  }
}


// ———————  
// Don’t forget to copy over these from your sketch.js:
// • drawGradientInQuad  
// • drawShape  
// • drawTexture  
// etc.  
// ———————

// --- Copia drawGradientInQuad, drawShape, drawTexture, etc. desde tu sketch.js ---
