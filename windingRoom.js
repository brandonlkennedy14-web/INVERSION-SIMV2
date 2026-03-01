// --- V3 WINDING ROOM (CINEMATIC BILLIARDS) ---
// Connects to main engine via window.BB bridge defined in main.js

const canvasV3  = document.getElementById('simCanvasV3');
const ctxV3     = canvasV3.getContext('2d');
const windDisplay = document.getElementById('windingDisplay');
const precisionDisplay = document.getElementById('precisionDisplay');

// [FIX 2] RESPONSIVE CANVAS — fills the view container
window.resizeV3 = () => {
    const parent = canvasV3.parentElement;
    const availW = parent ? parent.clientWidth  : window.innerWidth;
    const availH = parent ? parent.clientHeight : window.innerHeight - 50;
    const scale  = Math.min(availW / 500, availH / 500);
    canvasV3.style.width  = (500 * scale) + 'px';
    canvasV3.style.height = (500 * scale) + 'px';
    // Center it
    canvasV3.style.display = 'block';
    canvasV3.style.margin  = `${Math.max(0,(availH-500*scale)/2)}px auto 0`;
};
window.addEventListener('resize', window.resizeV3);
window.resizeV3();

let v3 = {
    x:  250, y:  250,
    vx: 4.5, vy: 6.2,   // Default irrational starting vector
    size: 500,
    windingNumber: 0,
    sparks: [],
    cornerFlash: 0,
    // Precision tracking: distance from nearest wall at each bounce
    minWallDist: Infinity,
    totalBounces: 0,
    // Discovery threshold: report to main engine when winding hits this
    discoveryEvery: 25,
    lastReportedWinding: 0
};

// [FIX 1] Pull the current injected Vy from V3's own inject call if user sets it
// V3 also respects the main inject button — if user injects on EYES it won't
// affect V3 (separate system), but V3 has its own tap-to-inject on the canvas.
canvasV3.addEventListener('click', () => {
    const val = prompt('V3: Enter Vy to inject (e.g. 3.14159 for chaos, 6.25 for orbit):');
    if(val && !isNaN(parseFloat(val))) {
        resetV3(parseFloat(val));
    }
});

function resetV3(newVy) {
    v3.x = 250; v3.y = 250;
    v3.vx = 4.5;
    v3.vy = newVy !== undefined ? newVy : 6.2;
    v3.windingNumber = 0;
    v3.minWallDist   = Infinity;
    v3.totalBounces  = 0;
    v3.lastReportedWinding = 0;
    v3.sparks = [];
    v3.cornerFlash = 0;
    if(precisionDisplay) precisionDisplay.innerText = '0.000';
    if(windDisplay)      windDisplay.innerText = '0';
}

function spawnSparks(x, y, color, count) {
    count = count || 10;
    for(let i = 0; i < count; i++) {
        v3.sparks.push({
            x, y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1.0,
            color
        });
    }
}

// [FIX 1] Called every time winding milestone is reached — reports to main engine
function reportDiscovery() {
    if(!window.BB) return;
    const vy = Math.abs(v3.vy);
    const topology = getV3Topology(vy);
    const node = {
        seq:     `V3: Vy ${vy.toFixed(5)} | W# ${v3.windingNumber}`,
        vx:      4.5,
        vy:      vy,
        bounces: v3.windingNumber,
        botType: 'v3',
        source:  'v3',
        topology
    };
    window.BB.onV3Discovery(node);
}

// Simple topology check matching main.js CONSTANTS
function getV3Topology(vy) {
    const CONSTANTS = [
        { name:"π",    val:Math.PI },
        { name:"e",    val:Math.E },
        { name:"φ",    val:1.618033988749 },
        { name:"√2",   val:Math.SQRT2 },
        { name:"√3",   val:1.732050807568 },
        { name:"√5",   val:2.236067977499 },
        { name:"α",    val:4.669201609102 },
        { name:"ζ(3)", val:1.202056903159 },
        { name:"G",    val:0.915965594177 }
    ];
    for(const c of CONSTANTS) {
        for(let k = 1; k <= 10; k++) {
            if(Math.abs(vy - c.val*k) < 0.005) return `≈ ${k} * ${c.name}`;
            if(Math.abs(vy - c.val/k) < 0.005) return `≈ ${c.name} / ${k}`;
        }
    }
    return "Irrational Void (Chaos)";
}

function engineV3() {
    // Trail fade — cinematic mode
    ctxV3.fillStyle = 'rgba(5,5,5,0.15)';
    ctxV3.fillRect(0, 0, v3.size, v3.size);

    // Grid lines
    ctxV3.strokeStyle = 'rgba(0,255,204,0.05)';
    ctxV3.lineWidth = 1; ctxV3.beginPath();
    ctxV3.moveTo(v3.size/2, 0); ctxV3.lineTo(v3.size/2, v3.size);
    ctxV3.moveTo(0, v3.size/2); ctxV3.lineTo(v3.size, v3.size/2);
    ctxV3.stroke();

    // Physics steps per frame
    for(let step = 0; step < 5; step++) {
        v3.x += v3.vx;
        v3.y += v3.vy;

        const hitX = v3.x <= 0 || v3.x >= v3.size;
        const hitY = v3.y <= 0 || v3.y >= v3.size;

        if(hitX) {
            v3.vx *= -1;
            v3.x = v3.x <= 0 ? 0 : v3.size;
            v3.totalBounces++;
            spawnSparks(v3.x, v3.y, '#00ffcc', 6);

            // [FIX] Precision: how close to a corner on this wall hit?
            const wallDist = Math.min(v3.y, v3.size - v3.y);
            if(wallDist < v3.minWallDist) v3.minWallDist = wallDist;
            if(precisionDisplay) precisionDisplay.innerText = wallDist.toFixed(3);
        }

        if(hitY) {
            v3.vy *= -1;
            v3.y = v3.y <= 0 ? 0 : v3.size;
            v3.totalBounces++;
            spawnSparks(v3.x, v3.y, '#00ffcc', 6);

            const wallDist = Math.min(v3.x, v3.size - v3.x);
            if(wallDist < v3.minWallDist) v3.minWallDist = wallDist;
            if(precisionDisplay) precisionDisplay.innerText = wallDist.toFixed(3);
        }

        // Corner hit — winding number increment
        if(hitX && hitY) {
            v3.windingNumber++;
            if(windDisplay) windDisplay.innerText = v3.windingNumber;
            v3.cornerFlash = 1.0;
            spawnSparks(v3.x, v3.y, '#ff0055', 18);

            // [FIX 1] Feed corner hit to main engine harmonics + ripple
            if(window.BB) window.BB.onV3CornerHit(v3.windingNumber, Math.abs(v3.vy));

            // Report a discovery every N windings
            if(v3.windingNumber - v3.lastReportedWinding >= v3.discoveryEvery) {
                v3.lastReportedWinding = v3.windingNumber;
                reportDiscovery();
            }
        }
    }

    // [FIX 1] Publish state to main engine every frame (for HANDS view readout)
    if(window.BB) {
        window.BB.publishState({
            windingNumber: v3.windingNumber,
            vy: v3.vy,
            vx: v3.vx,
            totalBounces: v3.totalBounces,
            minWallDist: v3.minWallDist
        });
    }

    // Draw sparks
    for(let i = v3.sparks.length-1; i >= 0; i--) {
        const sp = v3.sparks[i];
        sp.x += sp.vx; sp.y += sp.vy; sp.life -= 0.05;
        ctxV3.fillStyle = sp.color;
        ctxV3.globalAlpha = Math.max(0, sp.life);
        ctxV3.fillRect(sp.x, sp.y, 2, 2);
        if(sp.life <= 0) v3.sparks.splice(i, 1);
    }
    ctxV3.globalAlpha = 1.0;

    // Winding number halo — grows with each corner hit
    if(v3.windingNumber > 0) {
        const haloR = 8 + (v3.windingNumber % 20) * 1.5;
        const haloAlpha = 0.08 + (v3.windingNumber % 10) * 0.01;
        ctxV3.strokeStyle = `rgba(0,255,204,${haloAlpha})`;
        ctxV3.lineWidth = 1;
        ctxV3.beginPath();
        ctxV3.arc(v3.x, v3.y, haloR, 0, Math.PI*2);
        ctxV3.stroke();
    }

    // Draw the runner
    ctxV3.shadowBlur = 15;
    ctxV3.shadowColor = '#00ffcc';
    ctxV3.fillStyle = '#fff';
    ctxV3.beginPath();
    ctxV3.arc(v3.x, v3.y, 3, 0, Math.PI*2);
    ctxV3.fill();
    ctxV3.shadowBlur = 0;

    // Corner flash overlay
    if(v3.cornerFlash > 0) {
        ctxV3.fillStyle = `rgba(255,0,85,${v3.cornerFlash * 0.3})`;
        ctxV3.fillRect(0, 0, v3.size, v3.size);
        v3.cornerFlash -= 0.05;
    }

    // HUD overlay (top of V3 canvas)
    ctxV3.fillStyle = 'rgba(0,0,0,0.6)';
    ctxV3.fillRect(0, 0, v3.size, 28);
    ctxV3.fillStyle = '#00ffcc';
    ctxV3.font = '11px monospace';
    ctxV3.fillText(`◈ V3 | Vy: ${v3.vy.toFixed(5)} | W#: ${v3.windingNumber} | Δ: ${v3.minWallDist === Infinity ? '---' : v3.minWallDist.toFixed(3)}`, 8, 18);

    // Tap hint (fades after first corner hit)
    if(v3.windingNumber === 0) {
        ctxV3.fillStyle = 'rgba(255,255,255,0.2)';
        ctxV3.font = '10px monospace';
        ctxV3.fillText('TAP TO INJECT Vy', v3.size/2 - 55, v3.size - 12);
    }

    // Only run animation when V3 tab is visible; pause otherwise to save CPU
    if(document.getElementById('v-winding').classList.contains('active')) {
        requestAnimationFrame(engineV3);
    } else {
        setTimeout(() => requestAnimationFrame(engineV3), 200);
    }
}

// Boot V3
resetV3();
engineV3();
