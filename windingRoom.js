// ==========================================
// INVERSION SIM V3 - AUTONOMOUS ENGINE
// ==========================================

const canvasV3 = document.getElementById('simCanvasV3');
const ctxV3 = canvasV3.getContext('2d');
const LV3 = canvasV3.width;

const ruliadBox = document.getElementById('ruliadBox');
const ruliadCanvas = document.getElementById('ruliadCanvas');
const rCtx = ruliadCanvas.getContext('2d');
const mapScale = ruliadCanvas.width / LV3;

const windingDisplay = document.getElementById('windingDisplay');
const precisionDisplay = document.getElementById('precisionDisplay');
const smithAngleDisplay = document.getElementById('smithAngle');
const bladeBouncesDisplay = document.getElementById('bladeBounces');
const toggleMapBtn = document.getElementById('toggleMapBtn');

let particleV3 = { x: LV3 / 2, y: LV3 / 2, vx: 0, vy: 0, radius: 4 };

// Autonomous State Variables
let smithAngle = 0.1; // Starting angle in radians
let activeBounces = 0;
const MAX_BOUNCES_PER_RUN = 50; // Blade dies and resets after this many bounces
const LAUNCH_SPEED = 12; // Speed of the autonomous runs

let bounceArtifacts = [];
let showMap = false;

toggleMapBtn.addEventListener('click', () => {
    showMap = !showMap;
    ruliadBox.style.display = showMap ? 'block' : 'none';
});

async function logDoubleBounceData(windingNum, precision) {
    try {
        if (typeof supabase !== 'undefined') {
            const { data, error } = await supabase
                .from('inversion_v3_logs') 
                .insert([{ winding_number: windingNum, precision_delta: parseFloat(precision.toFixed(5)) }]);
            if (error) throw error;
            console.log(`Database Log Success | Winding: ${windingNum}, Precision: ${precision.toFixed(5)}`);
        }
    } catch (err) {
        // Fail silently if table doesn't exist yet so it doesn't break the UI
    }
}

// Logic to automatically deploy a new run
function deployNextBlade() {
    smithAngle += 0.005; // Smith increments the search angle systematically
    if (smithAngleDisplay) smithAngleDisplay.innerText = smithAngle.toFixed(3) + ' rad';
    
    particleV3.x = LV3 / 2;
    particleV3.y = LV3 / 2;
    particleV3.vx = Math.cos(smithAngle) * LAUNCH_SPEED;
    particleV3.vy = Math.sin(smithAngle) * LAUNCH_SPEED;
    
    activeBounces = 0;
    bounceArtifacts = [];
    rCtx.clearRect(0, 0, ruliadCanvas.width, ruliadCanvas.height);
}

class WindingSquare {
    constructor(size) {
        this.L = size;
        this.windingNumber = 0;
    }

    updateState(p) {
        if (p.vx === 0 && p.vy === 0) return;

        let hitX = false;
        let hitY = false;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x - p.radius <= 0 || p.x + p.radius >= this.L) {
            hitX = true;
            p.vx *= -1; 
            p.x = p.x - p.radius <= 0 ? p.radius : this.L - p.radius; 
        }

        if (p.y - p.radius <= 0 || p.y + p.radius >= this.L) {
            hitY = true;
            p.vy *= -1;
            p.y = p.y - p.radius <= 0 ? p.radius : this.L - p.radius;
        }

        if (hitX || hitY) {
            activeBounces++;
            if (bladeBouncesDisplay) bladeBouncesDisplay.innerText = activeBounces;
            bounceArtifacts.push({ x: p.x, y: p.y });
            this.drawTopologyMap();

            // Auto-reset if the Blade reaches max bounces without a hit
            if (activeBounces >= MAX_BOUNCES_PER_RUN) {
                deployNextBlade();
                return;
            }
        }

        // DOUBLE BOUNCE (Corner Hit)
        if (hitX && hitY) {
            this.registerDoubleBounce(p);
            deployNextBlade(); // Immediately launch next run after a successful hit
        }
    }

    registerDoubleBounce(p) {
        this.windingNumber++;
        const targetX = (p.x < this.L / 2) ? 0 : this.L;
        const targetY = (p.y < this.L / 2) ? 0 : this.L;
        const errorX = Math.abs(p.x - targetX);
        const errorY = Math.abs(p.y - targetY);
        const precisionDelta = Math.sqrt(errorX * errorX + errorY * errorY);

        if (windingDisplay) windingDisplay.innerText = this.windingNumber;
        if (precisionDisplay) precisionDisplay.innerText = precisionDelta.toFixed(3);
        
        ctxV3.fillStyle = 'rgba(255, 0, 85, 0.5)';
        ctxV3.fillRect(0, 0, this.L, this.L);
        logDoubleBounceData(this.windingNumber, precisionDelta);
    }

    drawTopologyMap() {
        if (!showMap || bounceArtifacts.length < 2) return;
        rCtx.fillStyle = '#111';
        rCtx.fillRect(0, 0, ruliadCanvas.width, ruliadCanvas.height);
        rCtx.beginPath();
        rCtx.moveTo(bounceArtifacts[0].x * mapScale, bounceArtifacts[0].y * mapScale);
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

function drawV3() {
    ctxV3.fillStyle = 'rgba(26, 26, 26, 0.2)';
    ctxV3.fillRect(0, 0, LV3, LV3);

    engineV3.updateState(particleV3);

    ctxV3.beginPath();
    ctxV3.arc(particleV3.x, particleV3.y, particleV3.radius, 0, Math.PI * 2);
    ctxV3.fillStyle = '#00ffcc';
    ctxV3.fill();
    ctxV3.closePath();

    requestAnimationFrame(drawV3);
}

// Kick off the first autonomous run
deployNextBlade();
drawV3();