const canvasV3 = document.getElementById('simCanvasV3');
const ctxV3 = canvasV3.getContext('2d');
const LV3 = canvasV3.width;

let smithAngle = 0.1; 
let activeBounces = 0;
const MAX_BOUNCES_PER_RUN = 50; 
const LAUNCH_SPEED = 12; 
let bounceArtifacts = [];
let particleV3 = { x: LV3 / 2, y: LV3 / 2, vx: 0, vy: 0, radius: 4 };

function deployNextBlade() {
    smithAngle += 0.005; 
    const smithDisplay = document.getElementById('smithAngle');
    if (smithDisplay) smithDisplay.innerText = smithAngle.toFixed(3) + ' rad';

    particleV3.x = LV3 / 2;
    particleV3.y = LV3 / 2;
    particleV3.vx = Math.cos(smithAngle) * LAUNCH_SPEED;
    particleV3.vy = Math.sin(smithAngle) * LAUNCH_SPEED;

    activeBounces = 0;
    bounceArtifacts = [];
}

class WindingSquare {
    constructor(size) {
        this.L = size;
        this.windingNumber = 0;
    }

    updateState(p) {
        p.x += p.vx;
        p.y += p.vy;

        let hitX = (p.x - p.radius <= 0 || p.x + p.radius >= this.L);
        let hitY = (p.y - p.radius <= 0 || p.y + p.radius >= this.L);

        if (hitX) { 
            p.vx *= -1; 
            p.x = p.x <= p.radius ? p.radius : this.L - p.radius; 
            activeBounces++;
        }
        if (hitY) { 
            p.vy *= -1; 
            p.y = p.y <= p.radius ? p.radius : this.L - p.radius; 
            activeBounces++;
        }

        const bDisplay = document.getElementById('bladeBounces');
        if (bDisplay) bDisplay.innerText = activeBounces;

        if (activeBounces >= MAX_BOUNCES_PER_RUN || (hitX && hitY)) {
            if (hitX && hitY) this.windingNumber++;
            const wDisplay = document.getElementById('windingDisplay');
            if (wDisplay) wDisplay.innerText = this.windingNumber;
            deployNextBlade();
        }
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
    requestAnimationFrame(drawV3);
}

deployNextBlade();
drawV3();