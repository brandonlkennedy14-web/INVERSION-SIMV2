// --- V3 WINDING ROOM (CINEMATIC BILLIARDS) ---
const canvasV3 = document.getElementById('simCanvasV3');
const ctxV3 = canvasV3.getContext('2d');
const windDisplay = document.getElementById('windingDisplay');

let v3 = {
    x: 250, y: 250, 
    vx: 4.5, vy: 6.2, // Arbitrary starting irrational vector
    size: 500,
    windingNumber: 0,
    lastAngle: 0,
    sparks: [],
    cornerFlash: 0
};

// Start from the exact center
function resetV3() {
    v3.x = 250;
    v3.y = 250;
    v3.windingNumber = 0;
}

function spawnSparks(x, y, color) {
    for(let i=0; i<10; i++) {
        v3.sparks.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1.0, color: color
        });
    }
}

function engineV3() {
    // 1. Fade the background slightly to create motion trails (Cinema mode)
    ctxV3.fillStyle = 'rgba(5, 5, 5, 0.15)'; 
    ctxV3.fillRect(0, 0, v3.size, v3.size);

    // Grid lines
    ctxV3.strokeStyle = 'rgba(0, 255, 204, 0.05)';
    ctxV3.lineWidth = 1;
    ctxV3.beginPath();
    ctxV3.moveTo(v3.size/2, 0); ctxV3.lineTo(v3.size/2, v3.size);
    ctxV3.moveTo(0, v3.size/2); ctxV3.lineTo(v3.size, v3.size/2);
    ctxV3.stroke();

    // 2. Physics Step
    for(let step=0; step<5; step++) { // Speed up simulation slightly
        v3.x += v3.vx;
        v3.y += v3.vy;

        let hitX = (v3.x <= 0 || v3.x >= v3.size);
        let hitY = (v3.y <= 0 || v3.y >= v3.size);

        if(hitX) { 
            v3.vx *= -1; 
            v3.x = v3.x <= 0 ? 0 : v3.size; 
            spawnSparks(v3.x, v3.y, '#00ffcc');
        }
        if(hitY) { 
            v3.vy *= -1; 
            v3.y = v3.y <= 0 ? 0 : v3.size; 
            spawnSparks(v3.x, v3.y, '#00ffcc');
        }

        // Corner Detection (The "Hit")
        if(hitX && hitY) {
            v3.windingNumber++;
            windDisplay.innerText = v3.windingNumber;
            v3.cornerFlash = 1.0; // Trigger screen flash
            spawnSparks(v3.x, v3.y, '#ff0055'); // Red sparks for corners
        }
    }

    // 3. Draw Sparks
    for(let i = v3.sparks.length-1; i >= 0; i--) {
        let s = v3.sparks[i];
        s.x += s.vx; s.y += s.vy; s.life -= 0.05;
        ctxV3.fillStyle = s.color;
        ctxV3.globalAlpha = s.life;
        ctxV3.fillRect(s.x, s.y, 2, 2);
        if(s.life <= 0) v3.sparks.splice(i, 1);
    }
    ctxV3.globalAlpha = 1.0;

    // 4. Draw the Runner (The particle)
    ctxV3.shadowBlur = 15;
    ctxV3.shadowColor = '#00ffcc';
    ctxV3.fillStyle = '#fff';
    ctxV3.beginPath();
    ctxV3.arc(v3.x, v3.y, 3, 0, Math.PI * 2);
    ctxV3.fill();
    ctxV3.shadowBlur = 0;

    // 5. Screen Flash on Corner Hit
    if(v3.cornerFlash > 0) {
        ctxV3.fillStyle = `rgba(255, 0, 85, ${v3.cornerFlash * 0.3})`;
        ctxV3.fillRect(0, 0, v3.size, v3.size);
        v3.cornerFlash -= 0.05;
    }

    // Only run if the tab is active
    if(document.getElementById('v-winding').classList.contains('active')) {
        requestAnimationFrame(engineV3);
    } else {
        // Pause and wait to be reactivated to save resources
        setTimeout(() => requestAnimationFrame(engineV3), 100);
    }
}

// Start V3
resetV3();
engineV3();