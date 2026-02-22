cat <<EOF > main.js
const canvas = document.getElementById('z-canvas');
const ctx = canvas.getContext('2d');
const size = Math.min(window.innerWidth, window.innerHeight) * 0.8;
canvas.width = size; canvas.height = size;

let bots = [];
const CORNER_THRESHOLD = 15; // Precision zone for "Corner Hits"

class CornerBot {
    constructor(vy) {
        this.x = size/2; this.y = size/2;
        this.vx = 5; this.vy = vy;
        this.history = [];
        this.hBounces = 0; this.vBounces = 0;
        this.cornerHits = 0;
    }

    update() {
        this.x += this.vx; this.y += this.vy;

        // Square Boundary Detection
        if (this.x <= 0 || this.x >= size) { this.vx *= -1; this.hBounces++; }
        if (this.y <= 0 || this.y >= size) { this.vy *= -1; this.vBounces++; }

        // Corner Hit & Precision Detection
        const corners = [
            {x:0, y:0}, {x:size, y:0}, 
            {x:0, y:size}, {x:size, y:size}
        ];

        corners.forEach(c => {
            let dist = Math.sqrt((this.x - c.x)**2 + (this.y - c.y)**2);
            if (dist < CORNER_THRESHOLD) {
                this.cornerHits++;
                // Precision is 1.0 at exact corner, 0 at edge of threshold
                let precision = (1 - (dist / CORNER_THRESHOLD)).toFixed(6);
                document.getElementById('prec').innerText = precision;
            }
        });

        // Winding Number Calculation
        // Based on your idea: Ratio of horizontal to vertical bounces
        let windingNum = (this.hBounces / (this.vBounces || 1)).toFixed(6);
        document.getElementById('ratio').innerText = windingNum;

        this.history.push({x: this.x, y: this.y});
        if (this.history.length > 300) this.history.shift();
    }

    draw() {
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        this.history.forEach((p, i) => {
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        
        // Draw Bot
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - 3, this.y - 3, 6, 6);
    }
}

window.launchBot = () => {
    const vy = parseFloat(document.getElementById('vy-in').value);
    bots.push(new CornerBot(vy));
};

function loop() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, size, size);
    bots.forEach(b => { b.update(); b.draw(); });
    requestAnimationFrame(loop);
}
loop();
EOF