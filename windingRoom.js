// ==========================================
// INVERSION SIM V3 - WINDING ROOM ENGINE
// ==========================================

const canvasV3 = document.getElementById('simCanvasV3');
const ctxV3 = canvasV3.getContext('2d');
const LV3 = canvasV3.width;

// Topology Map Setup
const ruliadBox = document.getElementById('ruliadBox');
const ruliadCanvas = document.getElementById('ruliadCanvas');
const rCtx = ruliadCanvas.getContext('2d');
const mapScale = ruliadCanvas.width / LV3;

// UI Elements
const windingDisplay = document.getElementById('windingDisplay');
const precisionDisplay = document.getElementById('precisionDisplay');
const toggleMapBtn = document.getElementById('toggleMapBtn');

// Particle State
let particleV3 = { x: LV3 / 2, y: LV3 / 2, vx: 0, vy: 0, radius: 4 };

// Slingshot Aiming State
let isAimingV3 = false;
let dragStartX = 0, dragStartY = 0;
let mouseX = 0, mouseY = 0;

// Artifact Tracking for Topology
let bounceArtifacts = [];
let showMap = false;

// Toggle the Ruliad Popup
toggleMapBtn.addEventListener('click', () => {
    showMap = !showMap;
    ruliadBox.style.display = showMap ? 'block' : 'none';
});

// Supabase Logging Function (Moved outside to the main level)
async function logDoubleBounceData(windingNum, precision) {
    try {
        const { data, error } = await supabase
            .from('inversion_v3_logs') 
            .insert([
                { 
                    winding_number: windingNum, 
                    precision_delta: parseFloat(precision.toFixed(5))
                }
            ]);

        if (error) throw error;
        console.log(`Database Log Success | Winding: ${windingNum}, Precision: ${precision.toFixed(5)}`);
    } catch (err) {
        console.error("Supabase logging failed. Check table name and permissions:", err.message);
    }
}

class WindingSquare {
    constructor(size) {
        this.L = size;
        this.windingNumber = 0;
    }

    updateState(p) {
        if (p.vx === 0 && p.vy === 0) return; // Wait for launch

        let hitX = false;
        let hitY = false;

        p.x += p.vx;
        p.y += p.vy;

        // X-axis boundaries
        if (p.x - p.radius <= 0 || p.x + p.radius >= this.L) {
            hitX = true;
            p.vx *= -1; 
            p.x = p.x - p.radius <= 0 ? p.radius : this.L - p.radius; 
        }

        // Y-axis boundaries
        if (p.y - p.radius <= 0 || p.y + p.radius >= this.L) {
            hitY = true;
            p.vy *= -1;
            p.y = p.y - p.radius <= 0 ? p.radius : this.L - p.radius;
        }

        // Record Artifact for the Topology Map
        if (hitX || hitY) {
            bounceArtifacts.push({ x: p.x, y: p.y });
            if (bounceArtifacts.length > 500) bounceArtifacts.shift(); // Memory cap
            this.drawTopologyMap();
        }

        // The "Double Bounce" (Corner Hit)
        if (hitX && hitY) {
            this.registerDoubleBounce(p);
        }
    }

    registerDoubleBounce(p) {
        this.windingNumber++;

        // Calculate theoretical absolute vertex
        const targetX = (p.x < this.L / 2) ? 0 : this.L;
        const targetY = (p.y < this.L / 2) ? 0 : this.L;

        const errorX = Math.abs(p.x - targetX);
        const errorY = Math.abs(p.y - targetY);
        const precisionDelta = Math.sqrt(errorX * errorX + errorY * errorY);

        // Update UI
        windingDisplay.innerText = this.windingNumber;
        precisionDisplay.innerText = precisionDelta.toFixed(3);

        // Visual flash
        ctxV3.fillStyle = 'rgba(255, 0, 85, 0.5)';
        ctxV3.fillRect(0, 0, this.L, this.L);

        // ---> NEW: Actually call the logging function here <---
        logDoubleBounceData(this.windingNumber, precisionDelta);
    }

    drawTopologyMap() {
        if (!showMap || bounceArtifacts.length < 2) return;

        // Clear map
        rCtx.fillStyle = '#111';
        rCtx.fillRect(0, 0, ruliadCanvas.width, ruliadCanvas.height);

        rCtx.beginPath();
        rCtx.moveTo(bounceArtifacts[0].x * mapScale, bounceArtifacts[0].y * mapScale);

        // Draw the ruliad lines
        for (let i = 1; i < bounceArtifacts.length; i++) {
            rCtx.lineTo(bounceArtifacts[i].x * mapScale, bounceArtifacts[i].y * mapScale);
        }

        rCtx.strokeStyle = '#00ffcc';
        rCtx.lineWidth = 1;
        rCtx.stroke();
        rCtx.closePath();
    }
}

const engineV3 = new WindingSquare(LV3);

// --- Mouse Controls ---
canvasV3.addEventListener('mousedown', (e) => {
    const rect = canvasV3.getBoundingClientRect();
    particleV3.x = e.clientX - rect.left;
    particleV3.y = e.clientY - rect.top;
    particleV3.vx = 0; 
    particleV3.vy = 0;

    isAimingV3 = true;
    dragStartX = particleV3.x;
    dragStartY = particleV3.y;

    // Reset data on new launch
    bounceArtifacts = [];
    rCtx.clearRect(0, 0, ruliadCanvas.width, ruliadCanvas.height);
});

canvasV3.addEventListener('mousemove', (e) => {
    if (isAimingV3) {
        const rect = canvasV3.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    }
});

canvasV3.addEventListener('mouseup', () => {
    if (isAimingV3) {
        isAimingV3 = false;
        particleV3.vx = (dragStartX - mouseX) * 0.15;
        particleV3.vy = (dragStartY - mouseY) * 0.15;
    }
});

// --- Render Loop ---
function drawV3() {
    // Fade effect for trails
    ctxV3.fillStyle = 'rgba(26, 26, 26, 0.2)';
    ctxV3.fillRect(0, 0, LV3, LV3);

    if (isAimingV3) {
        // Draw aiming slingshot line
        ctxV3.beginPath();
        ctxV3.moveTo(particleV3.x, particleV3.y);
        ctxV3.lineTo(particleV3.x + (dragStartX - mouseX), particleV3.y + (dragStartY - mouseY));
        ctxV3.strokeStyle = '#ff0055';
        ctxV3.lineWidth = 2;
        ctxV3.stroke();
        ctxV3.closePath();
    } else {
        // Run physics
        engineV3.updateState(particleV3);
    }

    // Draw particle
    ctxV3.beginPath();
    ctxV3.arc(particleV3.x, particleV3.y, particleV3.radius, 0, Math.PI * 2);
    ctxV3.fillStyle = '#00ffcc';
    ctxV3.fill();
    ctxV3.closePath();

    requestAnimationFrame(drawV3);
}

// Start the V3 loop
drawV3();