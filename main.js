window.tab = (t) => {
    document.querySelectorAll('.view, .nav button').forEach(el => el.classList.remove('active'));
    document.getElementById('v-'+t).classList.add('active');
    document.getElementById('b-'+t).classList.add('active');
    if(t === 'lab' && window.renderSymmetryMap) window.renderSymmetryMap();
    if(t === 'hyper' && window.renderHyper) window.renderHyper();
    if(t === 'bot' && window.renderHands) window.renderHands();
    if(t === 'zeta' && window.renderZeta) window.renderZeta();
    if(t === 'analyze' && window.renderAnalyze) window.renderAnalyze();
    if(t === 'reality' && window.renderIsoscelesReality) window.renderIsoscelesReality();
    if(t === 'museum' && window.renderMuseum) window.renderMuseum();
};

window.onload = () => {
    window.downloadData = () => {
        const exportData = { melli_nodes: s.recent, riemann_zeros: verifiedZeros, artifacts: museumArtifacts };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const dl = document.createElement('a'); dl.setAttribute("href", dataStr);
        dl.setAttribute("download", "inversion_v2_data.json");
        document.body.appendChild(dl); dl.click(); dl.remove();
    };

    window.injectVy = () => {
        let val = prompt("Enter specific Vy to test (e.g., 3.14159):");
        if(val && !isNaN(parseFloat(val))) {
            s.vy = parseFloat(val); s.vx = 5; s.x = 250; s.y = 250; s.bounces = 0; s.currentLoss = Infinity; s.shotsFired++; s.ghostPts = calcGhost(); 
        }
    };

    const cp = document.getElementById('c-phys'), ctxP = cp.getContext('2d');
    const cb = document.getElementById('c-brain'), ctxB = cb.getContext('2d');
    const ch = document.getElementById('c-hyper'), ctxH = ch.getContext('2d');
    const cHand = document.getElementById('c-hands'), ctxHand = cHand.getContext('2d');
    const cZeta = document.getElementById('c-zeta'), ctxZ = cZeta.getContext('2d');
    cp.width = cb.width = ch.width = cHand.width = cZeta.width = 500; cp.height = cb.height = ch.height = cHand.height = cZeta.height = 500; 
    const posEl = document.getElementById('pos-display');

    let bots = [
        { name: "Smith 1", type: "smith", range: [5, 6], score: 0, color: "#0f0", mem: null, bestLoss: Infinity, memB: 0, lastGrad: null },
        { name: "Smith 2", type: "smith", range: [6, 7], score: 0, color: "#0f0", mem: null, bestLoss: Infinity, memB: 0, lastGrad: null },
        { name: "Smith 3", type: "smith", range: [7, 8], score: 0, color: "#0f0", mem: null, bestLoss: Infinity, memB: 0, lastGrad: null },
        { name: "Smith 4", type: "smith", range: [8, 9], score: 0, color: "#0f0", mem: null, bestLoss: Infinity, memB: 0, lastGrad: null },
        { name: "Blade 1", type: "blade", range: [5, 9], score: 0, color: "#f0f", mem: null, bestLoss: Infinity, memB: 0, lastGrad: null },
        { name: "Blade 2", type: "blade", range: [5, 9], score: 0, color: "#f0f", mem: null, bestLoss: Infinity, memB: 0, lastGrad: null }
    ];

    let s = { x: 250, y: 250, vx: 5, vy: 7, bounces: 0, scanned: 0, found: 0, shotsFired: 0, recent: [], currentBot: 0, mapMode: 0, currentLoss: Infinity };
    let replay = { active: false, x: 250, y: 250, vx: 5, vy: 7, bounces: 0, targetBounces: 0, name: "", trail: [], node: null };
    let ripples = []; let gridPulse = { alpha: 0, color: '0, 255, 255', radius: 0, waveFactor: 0 };
    let topEfficiency = []; let topComplexity = []; let harmonics = new Array(1505).fill(0);
    
    let verifiedZeros = []; let zetaCache = []; let museumArtifacts = [];

    const CONSTANTS = [
        { name: "π", val: Math.PI }, { name: "e", val: Math.E }, { name: "φ", val: 1.618033988749 },
        { name: "√2", val: Math.SQRT2 }, { name: "√3", val: 1.732050807568 }, { name: "√5", val: 2.236067977499 },
        { name: "α", val: 4.669201609102 }, { name: "ζ(3)", val: 1.202056903159 }, { name: "G", val: 0.915965594177 }
    ];

    function updateLeaderboards() {
        let uniqueNodes = [...new Map(s.recent.map(item => [item.bounces + '-' + item.vy.toFixed(4), item])).values()];
        topEfficiency = uniqueNodes.filter(n => n.botType === 'smith').sort((a,b) => a.bounces - b.bounces).slice(0,10);
        topComplexity = uniqueNodes.filter(n => n.botType !== 'smith').sort((a,b) => b.bounces - a.bounces).slice(0,10);
    }

    function simulateLoss(testVy, botType) {
        let tx = 250, ty = 250, tvx = 5, tvy = testVy, bCount = 0, mLoss = Infinity;
        for(let i=0; i<30000; i++) {
            tx += tvx; ty += tvy;
            let hitX = (tx <= 0 || tx >= 500); let hitY = (ty <= 0 || ty >= 500);
            if(hitX) { tvx *= -1; tx = (tx <= 0) ? 0 : 500; bCount++; }
            if(hitY) { tvy *= -1; ty = (ty <= 0) ? 0 : 500; bCount++; }
            if(hitX || hitY) {
                let dx = Math.min(tx, 500-tx); let dy = Math.min(ty, 500-ty);
                let dist = Math.sqrt(dx*dx + dy*dy);
                if(dist < mLoss) mLoss = dist;
                if(hitX && hitY) { mLoss = 0; break; } 
            }
            if(bCount >= 1500) break;
        }
        return botType === 'smith' ? mLoss : mLoss - (bCount * 0.5); 
    }

    function calcGhost() {
        let gx = 250, gy = 250, gvx = s.vx, gvy = s.vy; let pts = [{x: gx, y: gy}];
        for(let k=0; k<10; k++) {
            let tx = gvx > 0 ? (500 - gx)/gvx : (0 - gx)/gvx; let ty = gvy > 0 ? (500 - gy)/gvy : (0 - gy)/gvy;
            let t = Math.min(tx, ty); gx += gvx * t; gy += gvy * t; pts.push({x: gx, y: gy});
            if(t === tx) gvx *= -1; if(t === ty) gvy *= -1;
        }
        return pts;
    }

    function reseed() {
        s.currentBot = (s.currentBot + 1) % bots.length; let b = bots[s.currentBot];
        s.vx = 5; s.shotsFired++; s.currentLoss = Infinity;

        // TASKFORCE NOVELTY SEARCH (Boredom Protocol)
        let isKnownArtifact = false;
        if(b.mem !== null) {
            isKnownArtifact = museumArtifacts.some(art => Math.abs(art.vy - b.mem) < 0.005);
        }

        if(b.mem !== null && Math.random() < 0.85) {
            if(isKnownArtifact && Math.random() < 0.75) {
                // The bot realizes it's tracing a known museum artifact. It gets bored and quantum jumps.
                b.mem = null; b.bestLoss = Infinity; b.lastGrad = null;
                s.vy = b.range[0] + Math.random() * (b.range[1] - b.range[0]);
            } else {
                let variance = (b.memB === 1500) ? 0.0000000001 : 0.001;
                let L1 = simulateLoss(b.mem, b.type); let L2 = simulateLoss(b.mem + variance, b.type);
                let gradient = (L2 - L1) / variance;
                let learningRate = b.type === 'smith' ? 0.001 : 0.005; 
                let maxStep = (b.memB === 1500) ? 0.0000001 : 0.05;
                let step = Math.max(-maxStep, Math.min(maxStep, gradient * learningRate)); 
                s.vy = b.mem - step; b.lastGrad = gradient; 
            }
        } else {
            s.vy = b.range[0] + Math.random() * (b.range[1] - b.range[0]); b.lastGrad = null;
        }
        s.x = 250; s.y = 250; s.bounces = 0; s.ghostPts = calcGhost();
    }

    function triggerRipple(x, y, bounces) {
        let rColor, rSpeed, maxR;
        if(bounces >= 1500) { rColor = '255, 140, 0'; rSpeed = 20; maxR = 800; } 
        else if(bounces > 100) { rColor = '220, 20, 60'; rSpeed = 2; maxR = 400; } 
        else if(bounces > 10)  { rColor = '50, 205, 50'; rSpeed = 8; maxR = 200; } 
        else { rColor = '0, 255, 255'; rSpeed = 15; maxR = 100; } 
        ripples.push({ x: x, y: y, r: 0, maxR: maxR, speed: rSpeed, color: rColor, alpha: 1 });
        gridPulse.color = rColor; gridPulse.alpha = 1.0; gridPulse.radius = 0; gridPulse.waveFactor = (bounces >= 1500) ? 15 : 5;
    }

    function getFrequencyColor(b) {
        if(b >= 1500) return '255, 140, 0'; if(b > 100) return '220, 20, 60';   
        if(b > 10) return '50, 205, 50'; return '0, 255, 255';                
    }

    function getTopology(vy, isVoid) {
        let topMatch = "None";
        for(let c of CONSTANTS) {
            for(let k = 1; k <= 10; k++) { 
                if(Math.abs(vy - (c.val * k)) < 0.005) { topMatch = `≈ ${k} * ${c.name}`; break; }
                if(Math.abs(vy - (c.val / k)) < 0.005) { topMatch = `≈ ${c.name} / ${k}`; break; }
            }
            if(topMatch !== "None") break;
        }
        if(topMatch === "None") topMatch = isVoid ? "Irrational Space (Chaos)" : "Rational Orbit (Closed Loop)";
        return topMatch;
    }

    // [ZETA BOT LOGIC REMOVED FOR BREVITY - ASSUME IT REMAINS INTACT HERE]
    for(let t=0; t<=100; t+=0.2) { zetaCache.push({t: t, mag: 0}); }
    let zetaBots = [];

    window.renderMuseum = () => {
        let mDiv = document.getElementById('v-museum');
        let html = `<h2 style="color:#d4af37; text-align:center;">[THE ARTIFACT MUSEUM]</h2>`;
        html += `<p style="text-align:center; color:#888; font-size:12px;">Unique topologies mapped by the Taskforce. Bots will actively avoid re-mapping these sectors (Novelty Search Active).</p>`;
        html += `<div style="display:flex; flex-wrap:wrap; justify-content:center; gap:15px; margin-top: 20px;">`;
        
        museumArtifacts.forEach((art, i) => {
            let color = art.botType === 'smith' ? '#0f0' : (art.botType === 'chaos' ? '#ff8c00' : '#f0f');
            html += `<div style="border: 1px solid ${color}; padding: 10px; width: 180px; background:#111; text-align:center;">
                <div style="font-size:10px; color:${color}; height:24px; overflow:hidden;">${art.topology}</div>
                <div style="font-size:12px; margin:5px 0;">Vy: ${art.vy.toFixed(5)}</div>
                <div style="font-size:10px; color:#aaa;">Bounces: ${art.bounces}</div>
                <canvas id="art-c-${i}" width="160" height="160" style="margin-top:10px; background:#000; border:1px solid #333;"></canvas>
            </div>`;
        });
        html += `</div>`;
        mDiv.innerHTML = html;

        // Draw the sigils
        museumArtifacts.forEach((art, i) => {
            let c = document.getElementById(`art-c-${i}`);
            if(c) {
                let ctx = c.getContext('2d');
                let tx = 80, ty = 80, tvx = 5, tvy = art.vy;
                ctx.strokeStyle = art.botType === 'smith' ? 'rgba(0,255,0,0.5)' : (art.botType === 'chaos' ? 'rgba(255,140,0,0.3)' : 'rgba(255,0,255,0.5)');
                ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx, ty);
                
                // Scale physics to the 160x160 mini canvas
                let scale = 160 / 500;
                for(let j=0; j<Math.min(art.bounces, 200); j++) {
                    let hitX = (tx + tvx <= 0 || tx + tvx >= 160);
                    let hitY = (ty + (tvy*scale) <= 0 || ty + (tvy*scale) >= 160);
                    if(hitX) tvx *= -1;
                    if(hitY) tvy *= -1;
                    tx += tvx; ty += (tvy*scale);
                    ctx.lineTo(tx, ty);
                }
                ctx.stroke();
            }
        });
    };

    function checkArtifact(node) {
        let isNovel = !museumArtifacts.some(a => Math.abs(a.vy - node.vy) < 0.005 && a.bounces === node.bounces);
        if(isNovel) museumArtifacts.push(node);
    }

    function engine() {
        for(let i = 0; i < 1000; i++) {
            s.x += s.vx; s.y += s.vy; s.scanned++;
            let hitX = (s.x <= 0 || s.x >= 500); let hitY = (s.y <= 0 || s.y >= 500);

            if(hitX) { s.vx *= -1; s.x = (s.x <= 0) ? 0 : 500; s.bounces++; }
            if(hitY) { s.vy *= -1; s.y = (s.y <= 0) ? 0 : 500; s.bounces++; }

            if(hitX || hitY) {
                let dx = Math.min(s.x, 500-s.x); let dy = Math.min(s.y, 500-s.y);
                let dist = Math.sqrt(dx*dx + dy*dy);
                if(dist < s.currentLoss) s.currentLoss = dist;
            }

            let activeBot = bots[s.currentBot];

            if(s.bounces > 1500) {
                if(s.currentLoss < activeBot.bestLoss) {
                    activeBot.bestLoss = s.currentLoss; activeBot.mem = Math.abs(s.vy); activeBot.memB = 1500;
                }
                if(activeBot.type === 'blade') {
                    let sig = `CHAOS VOID: Vy ${Math.abs(s.vy).toFixed(5)} | INFINITE`;
                    if(!s.recent.some(r => r.seq === sig)) {
                        s.found++; activeBot.score += 1500; 
                        let topMatch = getTopology(Math.abs(s.vy), true);
                        let node = { seq: sig, vx: 5, vy: Math.abs(s.vy), bounces: 1500, botType: 'chaos', topology: topMatch };
                        s.recent.push(node);
                        checkArtifact(node); // Log to Museum

                        harmonics[1500]++; triggerRipple(s.x, s.y, 1500); updateLeaderboards();
                        if(s.recent.length > 2000) s.recent.shift();
                        if(document.getElementById('v-museum').classList.contains('active')) window.renderMuseum();
                    }
                }
                reseed(); break;
            }

            if(hitX && hitY) { 
                s.currentLoss = 0;
                if(s.currentLoss <= activeBot.bestLoss) {
                    activeBot.bestLoss = 0; activeBot.mem = Math.abs(s.vy); activeBot.memB = s.bounces;
                }
                let sig = `${activeBot.name}: Vy ${Math.abs(s.vy).toFixed(4)} | Bounces: ${s.bounces}`;
                if(!s.recent.some(r => r.seq === sig)) {
                    s.found++;
                    if(activeBot.type === 'smith') activeBot.score += Math.max(10, 500 - s.bounces); 
                    if(activeBot.type === 'blade') activeBot.score += s.bounces; 

                    let topMatch = getTopology(Math.abs(s.vy), false);
                    let node = { seq: sig, vx: 5, vy: Math.abs(s.vy), bounces: s.bounces, botType: activeBot.type, topology: topMatch };
                    s.recent.push(node);
                    checkArtifact(node); // Log to Museum

                    harmonics[s.bounces]++; triggerRipple(s.x, s.y, s.bounces); updateLeaderboards();
                    if(s.recent.length > 2000) s.recent.shift();
                    if(document.getElementById('v-museum').classList.contains('active')) window.renderMuseum();
                }
                reseed(); break;
            }
        }

        ctxP.fillStyle = 'rgba(0,0,0,0.3)'; ctxP.fillRect(0,0,500,500);
        
        let aColor = getFrequencyColor(s.bounces);
        ctxP.shadowBlur = 15; ctxP.shadowColor = `rgb(${aColor})`;
        let activeBot = bots[s.currentBot]; ctxP.fillStyle = activeBot.color; ctxP.fillRect(s.x-2, s.y-2, 4, 4);
        ctxP.shadowBlur = 0;
        
        for(let i = ripples.length-1; i >= 0; i--) {
            let r = ripples[i]; r.r += r.speed; r.alpha = 1 - (r.r / r.maxR);
            ctxP.beginPath();
            ctxP.arc(r.x, r.y, r.r, 0, Math.PI*2);
            ctxP.strokeStyle = `rgba(${r.color}, ${r.alpha})`; ctxP.lineWidth = 2; ctxP.stroke();
            if(r.r >= r.maxR) ripples.splice(i, 1);
        }

        posEl.innerText = `SCANNED: ${s.scanned} | MELLI NODES & VOIDS: ${s.found}`;
        requestAnimationFrame(engine);
    }
    reseed(); engine();
};