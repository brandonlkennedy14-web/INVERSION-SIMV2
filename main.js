window.tab = (t) => {
    document.querySelectorAll('.view, .nav button').forEach(el => el.classList.remove('active'));
    document.getElementById('v-'+t).classList.add('active');
    document.getElementById('b-'+t).classList.add('active');
    if(t === 'lab' && window.renderSymmetryMap) window.renderSymmetryMap();
    if(t === 'hyper' && window.renderHyper) window.renderHyper();
    if(t === 'bot' && window.renderHands) window.renderHands();
    if(t === 'zeta' && window.renderZeta) window.renderZeta();
    if(t === 'analyze' && window.renderAnalyze) window.renderAnalyze();
};

window.onload = () => {
    window.downloadData = () => {
        const exportData = {
            melli_nodes: s.recent,
            riemann_zeros: verifiedZeros
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const dl = document.createElement('a'); dl.setAttribute("href", dataStr);
        dl.setAttribute("download", "inversion_v2_data.json");
        document.body.appendChild(dl); dl.click(); dl.remove();
    };

    window.injectVy = () => {
        let val = prompt("Enter specific Vy to test (e.g., 3.14159 or 1.618033):");
        if(val && !isNaN(parseFloat(val))) {
            s.vy = parseFloat(val); s.vx = 5; 
            s.x = 250; s.y = 250; s.bounces = 0; 
            s.currentLoss = Infinity; s.shotsFired++;
            s.ghostPts = calcGhost(); 
        }
    };

    const cp = document.getElementById('c-phys'), ctxP = cp.getContext('2d');
    const cb = document.getElementById('c-brain'), ctxB = cb.getContext('2d');
    const ch = document.getElementById('c-hyper'), ctxH = ch.getContext('2d');
    const cHand = document.getElementById('c-hands'), ctxHand = cHand.getContext('2d');
    const cZeta = document.getElementById('c-zeta'), ctxZ = cZeta.getContext('2d');
    
    // Converted to perfect 500x500 square for exact winding numbers
    cp.width = cb.width = ch.width = cHand.width = cZeta.width = 500; 
    cp.height = cb.height = ch.height = cHand.height = cZeta.height = 500; 
    const posEl = document.getElementById('pos-display');

    let bots = [
        { name: "Smith 1", type: "smith", range: [5, 6], score: 0, color: "#0f0", mem: null, bestLoss: Infinity, memB: 0, lastGrad: null },
        { name: "Smith 2", type: "smith", range: [6, 7], score: 0, color: "#0f0", mem: null, bestLoss: Infinity, memB: 0, lastGrad: null },
        { name: "Smith 3", type: "smith", range: [7, 8], score: 0, color: "#0f0", mem: null, bestLoss: Infinity, memB: 0, lastGrad: null },
        { name: "Smith 4", type: "smith", range: [8, 9], score: 0, color: "#0f0", mem: null, bestLoss: Infinity, memB: 0, lastGrad: null },
        { name: "Blade 1", type: "blade", range: [5, 9], score: 0, color: "#f0f", mem: null, bestLoss: Infinity, memB: 0, lastGrad: null },
        { name: "Blade 2", type: "blade", range: [5, 9], score: 0, color: "#f0f", mem: null, bestLoss: Infinity, memB: 0, lastGrad: null },
        { name: "Blade 3", type: "blade", range: [5, 9], score: 0, color: "#f0f", mem: null, bestLoss: Infinity, memB: 0, lastGrad: null }
    ];

    let s = { x: 250, y: 250, vx: 5, vy: 7, bounces: 0, scanned: 0, found: 0, shotsFired: 0, recent: [], currentBot: 0, mapMode: 0, currentLoss: Infinity };
    let replay = { active: false, x: 250, y: 250, vx: 5, vy: 7, bounces: 0, targetBounces: 0, name: "", trail: [] };
    let ripples = []; let gridPulse = { alpha: 0, color: '0, 255, 255', radius: 0, waveFactor: 0 };
    let topEfficiency = []; let topComplexity = []; let harmonics = new Array(1505).fill(0);

    const CONSTANTS = [
        { name: "π", val: Math.PI }, { name: "e", val: Math.E }, { name: "φ", val: 1.618033988749 },
        { name: "√2", val: Math.SQRT2 }, { name: "√3", val: 1.732050807568 }, { name: "√5", val: 2.236067977499 },
        { name: "α (Feigenbaum)", val: 4.669201609102 }, { name: "ζ(3) (Apéry)", val: 1.202056903159 },
        { name: "G (Catalan)", val: 0.915965594177 }
    ];

    if(localStorage.getItem('hyper_bots')) {
        bots = JSON.parse(localStorage.getItem('hyper_bots'));
        let savedS = JSON.parse(localStorage.getItem('hyper_env'));
        s.scanned = savedS.scanned; s.found = savedS.found; s.shotsFired = savedS.shotsFired; 
        s.recent = savedS.recent; s.currentBot = savedS.currentBot;
        s.recent.forEach(n => { harmonics[n.bounces]++; }); updateLeaderboards();
    }

    function updateLeaderboards() {
        let uniqueNodes = [...new Map(s.recent.map(item => [item.bounces + '-' + item.vy.toFixed(4), item])).values()];
        topEfficiency = uniqueNodes.filter(n => n.botType === 'smith').sort((a,b) => a.bounces - b.bounces).slice(0,10);
        topComplexity = uniqueNodes.filter(n => n.botType !== 'smith').sort((a,b) => b.bounces - a.bounces).slice(0,10);
    }

    cb.addEventListener('click', (e) => {
        let rect = cb.getBoundingClientRect();
        let clickX = (e.clientX - rect.left) * (cb.width / rect.width); let clickY = (e.clientY - rect.top) * (cb.height / rect.height);
        let clickedNode = null; let minDist = 15; 
        s.recent.forEach((item) => {
            let x = s.mapMode === 0 ? ((item.vy - 5) * 100) % 500 : (item.bounces * 5) % 500;
            let y = s.mapMode === 0 ? (item.bounces * 2) % 500 : (item.vy * 50) % 500;
            let dist = Math.sqrt((clickX - x)**2 + (clickY - y)**2);
            if(dist < minDist) { minDist = dist; clickedNode = item; }
        });
        if(clickedNode) {
            replay.active = true; replay.x = 250; replay.y = 250; replay.vx = clickedNode.vx; replay.vy = clickedNode.vy;
            replay.bounces = 0; replay.targetBounces = clickedNode.bounces; replay.name = clickedNode.seq; replay.trail = []; 
            window.tab('sim'); ctxP.fillStyle = '#000'; ctxP.fillRect(0,0,500,500); 
        } else { s.mapMode = (s.mapMode + 1) % 2; window.renderSymmetryMap(); }
    });

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
        if(b.mem !== null && Math.random() < 0.85) {
            let variance = (b.memB === 1500) ? 0.0000000001 : 0.001;
            let L1 = simulateLoss(b.mem, b.type); let L2 = simulateLoss(b.mem + variance, b.type);
            let gradient = (L2 - L1) / variance;
            let learningRate = b.type === 'smith' ? 0.001 : 0.005; 
            let maxStep = (b.memB === 1500) ? 0.0000001 : 0.05;
            let step = Math.max(-maxStep, Math.min(maxStep, gradient * learningRate)); 
            s.vy = b.mem - step; b.lastGrad = gradient; 
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

    function getTopology(vy) {
        let topMatch = "None";
        for(let c of CONSTANTS) {
            for(let k = 1; k <= 10; k++) { 
                if(Math.abs(vy - (c.val * k)) < 0.005) { topMatch = `≈ ${k} * ${c.name}`; break; }
                if(Math.abs(vy - (c.val / k)) < 0.005) { topMatch = `≈ ${c.name} / ${k}`; break; }
            }
            if(topMatch !== "None") break;
        }
        return topMatch;
    }

    // THE RIEMANN ZETA ENGINE
    let verifiedZeros = [];
    let zetaCache = []; 
    
    function calcZetaMagnitude(t) {
        let reEta = 0, imEta = 0; let terms = 150; 
        for(let n=1; n<=terms; n++) {
            let r = Math.pow(n, -0.5); let theta = -t * Math.log(n);
            let tRe = r * Math.cos(theta); let tIm = r * Math.sin(theta);
            if(n % 2 === 0) { tRe = -tRe; tIm = -tIm; }
            reEta += tRe; imEta += tIm;
        }
        let rDen = Math.sqrt(2); let thetaDen = -t * Math.log(2);
        let denRe = 1 - rDen * Math.cos(thetaDen); let denIm = - rDen * Math.sin(thetaDen);
        let magEta = Math.sqrt(reEta*reEta + imEta*imEta);
        let magDen = Math.sqrt(denRe*denRe + denIm*denIm);
        return magDen === 0 ? 0 : magEta / magDen;
    }

    for(let t=0; t<=100; t+=0.2) { zetaCache.push({t: t, mag: calcZetaMagnitude(t)}); }

    let zetaBots = [
        { name: "Zeta-1", t: 10 + Math.random()*2, color: "#0f0" },
        { name: "Zeta-2", t: 15 + Math.random()*2, color: "#f0f" },
        { name: "Zeta-3", t: 22 + Math.random()*2, color: "#ff8c00" },
        { name: "Zeta-4", t: 26 + Math.random()*2, color: "#0ff" },
        { name: "Zeta-5", t: 30 + Math.random()*2, color: "#ff0" }
    ];

    window.renderZeta = () => {
        ctxZ.fillStyle = 'rgba(0,0,0,0.5)'; ctxZ.fillRect(0,0,500,500);
        ctxZ.fillStyle = '#ff8c00'; ctxZ.font = '12px monospace';
        ctxZ.fillText("[VIEW: RIEMANN ZETA FRACTAL HUNT | Re(s) = 1/2]", 10, 20);
        
        ctxZ.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctxZ.lineWidth = 1.5; ctxZ.beginPath();
        zetaCache.forEach((pt, idx) => {
            let y = (pt.t / 100) * 500;
            let x = 250 + (pt.mag * 60); 
            if(idx === 0) ctxZ.moveTo(x, y); else ctxZ.lineTo(x, y);
        });
        ctxZ.stroke();
        
        ctxZ.strokeStyle = 'rgba(0, 255, 255, 0.2)'; ctxZ.beginPath(); ctxZ.moveTo(250, 0); ctxZ.lineTo(250, 500); ctxZ.stroke();

        verifiedZeros.forEach(z => {
            let y = (z / 100) * 500;
            ctxZ.strokeStyle = 'rgba(255, 215, 0, 0.5)'; ctxZ.lineWidth = 2;
            ctxZ.beginPath(); ctxZ.moveTo(220, y); ctxZ.lineTo(280, y); ctxZ.stroke();
            ctxZ.fillStyle = '#ffd700'; ctxZ.fillText(`LOCKED: ${z.toFixed(4)}`, 290, y+4);
        });

        zetaBots.forEach(b => {
            let L1 = calcZetaMagnitude(b.t); let L2 = calcZetaMagnitude(b.t + 0.001);
            let gradient = (L2 - L1) / 0.001;
            
            if(Math.abs(gradient) < 0.0005 && L1 < 0.05) {
                if(!verifiedZeros.some(z => Math.abs(z - b.t) < 0.5)) {
                    verifiedZeros.push(b.t);
                    b.t += 3.5 + Math.random(); 
                }
            } else {
                b.t = b.t - (gradient * 0.01); 
                if(b.t < 0) b.t = 0; if(b.t > 100) b.t = 100;
            }

            let y = (b.t / 100) * 500; let x = 250 + (calcZetaMagnitude(b.t) * 60);
            ctxZ.fillStyle = b.color; ctxZ.shadowBlur = 10; ctxZ.shadowColor = b.color;
            ctxZ.beginPath(); ctxZ.arc(x, y, 4, 0, Math.PI*2); ctxZ.fill(); ctxZ.shadowBlur = 0;
            ctxZ.fillText(`t ≈ ${b.t.toFixed(4)}`, x + 15, y + 4);
        });
    };

    function project3D(px, py, pz) {
        let time = Date.now() * 0.0005; let rotY = time * 0.7; let rotX = time * 0.4; 
        let x1 = px * Math.cos(rotY) - pz * Math.sin(rotY); let z1 = px * Math.sin(rotY) + pz * Math.cos(rotY);
        let y1 = py * Math.cos(rotX) - z1 * Math.sin(rotX); return { x: 250 + (x1 * 140), y: 250 + (y1 * 140) };
    }

    window.renderHyper = () => {
        ctxH.fillStyle = 'rgba(0,0,0,0.4)'; ctxH.fillRect(0,0,500,500); 
        let R = 1.2; let r = 0.5; 
        ctxH.strokeStyle = 'rgba(255, 0, 0, 0.4)'; ctxH.lineWidth = 1; ctxH.beginPath();
        for(let i=0; i<s.ghostPts.length; i++) {
            let u = (s.ghostPts[i].x / 500) * Math.PI * 2; let v = (s.ghostPts[i].y / 500) * Math.PI * 2; 
            let px = (R + r * Math.cos(v)) * Math.cos(u); let py = (R + r * Math.cos(v)) * Math.sin(u); let pz = r * Math.sin(v);
            let pt = project3D(px, py, pz);
            if(i === 0) ctxH.moveTo(pt.x, pt.y); else ctxH.lineTo(pt.x, pt.y);
        }
        ctxH.stroke();
        
        s.recent.forEach((item) => {
            let u = ((item.vy - 5) / 4) * Math.PI * 2; let v = (item.bounces / 201) * Math.PI * 2; 
            let px = (R + r * Math.cos(v)) * Math.cos(u); let py = (R + r * Math.cos(v)) * Math.sin(u); let pz = r * Math.sin(v);
            let pt = project3D(px, py, pz);
            ctxH.fillStyle = item.botType === 'smith' ? '#0f0' : (item.botType === 'chaos' ? '#ff8c00' : '#f0f'); 
            ctxH.beginPath(); ctxH.arc(pt.x, pt.y, item.botType === 'chaos' ? 3.5 : 2.5, 0, Math.PI * 2); ctxH.fill();
        });

        ctxH.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctxH.lineWidth = 2; ctxH.beginPath();
        zetaCache.forEach((pt, idx) => {
            let u = (pt.t / 100) * Math.PI * 4; 
            let v = 0; 
            let warpedR = R + (pt.mag * 0.6); 
            let px = (warpedR + r * Math.cos(v)) * Math.cos(u); let py = (warpedR + r * Math.cos(v)) * Math.sin(u); let pz = r * Math.sin(v);
            let proj = project3D(px, py, pz);
            if(idx===0) ctxH.moveTo(proj.x, proj.y); else ctxH.lineTo(proj.x, proj.y);
        });
        ctxH.stroke();

        let syncGlow = gridPulse.alpha > 0.1 ? gridPulse.alpha * 20 : 0;
        
        verifiedZeros.forEach(z => {
            let u = (z / 100) * Math.PI * 4;
            let px = (R + r) * Math.cos(u); let py = (R + r) * Math.sin(u); let pz = 0;
            let pt = project3D(px, py, pz);
            
            ctxH.shadowBlur = syncGlow; ctxH.shadowColor = '#ffd700';
            ctxH.strokeStyle = '#ffd700'; ctxH.beginPath(); ctxH.arc(pt.x, pt.y, 6, 0, Math.PI*2); ctxH.stroke();
            ctxH.shadowBlur = 0;
        });

        zetaBots.forEach(b => {
            let u = (b.t / 100) * Math.PI * 4; let mag = calcZetaMagnitude(b.t);
            let warpedR = R + (mag * 0.6); 
            let px = (warpedR + r) * Math.cos(u); let py = (warpedR + r) * Math.sin(u); let pz = 0;
            let pt = project3D(px, py, pz);
            ctxH.fillStyle = b.color; ctxH.shadowBlur = 10; ctxH.shadowColor = b.color;
            ctxH.beginPath(); ctxH.arc(pt.x, pt.y, 4, 0, Math.PI*2); ctxH.fill(); ctxH.shadowBlur = 0;
        });
    };

    window.renderHands = () => {
        ctxHand.fillStyle = '#000'; ctxHand.fillRect(0,0,500,500);
        ctxHand.fillStyle = '#fff'; ctxHand.font = '12px monospace';
        ctxHand.fillText("[VIEW: AI DIAGNOSTICS & HARMONIC SPECTRUM]", 10, 20);

        bots.forEach((b, i) => {
            ctxHand.fillStyle = b.color;
            let status = b.lastGrad !== null ? `[AI: ▽L=${b.lastGrad.toFixed(4)}]` : `[EXPLORING]`;
            let memVal = b.mem ? (b.memB === 1500 ? b.mem.toFixed(10) : b.mem.toFixed(4)) : 'NONE';
            ctxHand.fillText(`${b.name}: ${b.score} PTS | M:${memVal} | ${status}`, 10, 45 + (i * 18));
        });

        ctxHand.fillStyle = '#fff'; ctxHand.fillText("STRUCTURAL FREQUENCY (Bounces 1 -> 1500)", 10, 200);
        ctxHand.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctxHand.strokeRect(10, 210, 480, 280);
        
        let maxSpike = Math.max(...harmonics.slice(1), 1);
        ctxHand.beginPath();
        for(let i = 1; i <= 1500; i++) {
            if(harmonics[i] > 0) {
                let height = (harmonics[i] / maxSpike) * 270; let x = 10 + (i / 1500) * 480;
                ctxHand.fillStyle = `rgb(${getFrequencyColor(i)})`; ctxHand.fillRect(x, 490 - height, 2, height);
            }
        }
    };

    window.renderSymmetryMap = () => {
        ctxB.fillStyle = '#000'; ctxB.fillRect(0,0,500,500);
        
        ctxB.strokeStyle = 'rgba(255, 255, 255, 0.05)'; ctxB.lineWidth = 1;
        for(let i=0; i<=500; i+=50) { 
            ctxB.beginPath(); ctxB.moveTo(i, 0); ctxB.lineTo(i, 500); ctxB.stroke(); 
            ctxB.beginPath(); ctxB.moveTo(0, i); ctxB.lineTo(500, i); ctxB.stroke(); 
        }

        ctxB.strokeStyle = 'rgba(255, 255, 255, 0.08)'; ctxB.lineWidth = 0.5;
        let sorted = [...s.recent].sort((a,b) => a.vy - b.vy);
        ctxB.beginPath();
        for(let i=0; i<sorted.length-1; i++) {
            if(Math.abs(sorted[i].vy - sorted[i+1].vy) < 0.05) { 
                let x1 = s.mapMode === 0 ? ((sorted[i].vy - 5) * 100) % 500 : (sorted[i].bounces * 5) % 500;
                let y1 = s.mapMode === 0 ? (sorted[i].bounces * 2) % 500 : (sorted[i].vy * 50) % 500;
                let x2 = s.mapMode === 0 ? ((sorted[i+1].vy - 5) * 100) % 500 : (sorted[i+1].bounces * 5) % 500;
                let y2 = s.mapMode === 0 ? (sorted[i+1].bounces * 2) % 500 : (sorted[i+1].vy * 50) % 500;
                ctxB.moveTo(x1, y1); ctxB.lineTo(x2, y2);
            }
        }
        ctxB.stroke();

        s.recent.forEach((item) => {
            let x = s.mapMode === 0 ? ((item.vy - 5) * 100) % 500 : (item.bounces * 5) % 500;
            let y = s.mapMode === 0 ? (item.bounces * 2) % 500 : (item.vy * 50) % 500;
            ctxB.fillStyle = item.botType === 'smith' ? '#0f0' : (item.botType === 'chaos' ? '#ff8c00' : '#f0f'); 
            ctxB.beginPath(); ctxB.arc(x, y, item.botType === 'chaos' ? 4 : 2.5, 0, Math.PI * 2); ctxB.fill();
        });

        if(s.recent.length > 1) {
            ctxB.strokeStyle = 'rgba(0, 255, 255, 0.5)'; ctxB.lineWidth = 1.5; ctxB.beginPath();
            let startIdx = Math.max(0, s.recent.length - 15);
            for(let i = startIdx; i < s.recent.length; i++) {
                let n = s.recent[i];
                let x = s.mapMode === 0 ? ((n.vy - 5) * 100) % 500 : (n.bounces * 5) % 500;
                let y = s.mapMode === 0 ? (n.bounces * 2) % 500 : (n.vy * 50) % 500;
                if(i === startIdx) ctxB.moveTo(x, y); else ctxB.lineTo(x, y);
            }
            ctxB.stroke();
        }

        ctxB.fillStyle = 'rgba(0,0,0,0.7)'; ctxB.fillRect(0,0,500,30);
        ctxB.fillStyle = '#fff'; ctxB.font = '12px monospace';
        ctxB.fillText(s.mapMode === 0 ? "[VIEW: MELLI SPIRALS + RULIAD WEB]" : "[VIEW: FAREY SPREAD + RULIAD WEB]", 10, 20);

        if(replay.trail.length > 0) {
            ctxB.fillStyle = 'rgba(255, 255, 255, 0.8)';
            replay.trail.forEach(b => {
                let x = s.mapMode === 0 ? ((replay.vy - 5) * 100) % 500 : (b * 5) % 500;
                let y = s.mapMode === 0 ? (b * 2) % 500 : (replay.vy * 50) % 500;
                ctxB.beginPath(); ctxB.arc(x, y, 1.5, 0, Math.PI * 2); ctxB.fill();
            });
        }
    };

    window.renderAnalyze = () => {
        let aDiv = document.getElementById('v-analyze');
        let html = `<h2>[TOPOLOGICAL CONSTANT ANALYZER]</h2>`;
        html += `<p style="color:#ff8c00;">Scanning Memory Banks for 1500-bounce Chaos Voids...</p>`;
        
        let voids = [...new Map(s.recent.filter(n => n.bounces === 1500).map(item => [item.vy.toFixed(6), item])).values()];
        
        if(voids.length === 0) {
            html += `<p class="no-match">No Chaos Voids detected in recent memory yet. Let the Blades hunt.</p>`;
        } else {
            voids.forEach(v => {
                let rowClass = v.topology !== "None" ? "match-found" : "no-match";
                html += `<div class="match-row ${rowClass}">`;
                html += `<strong>VOID:</strong> Vy = ${v.vy.toFixed(10)} <br>`;
                html += `<strong>MATCH:</strong> ${v.topology}`;
                html += `</div>`;
            });
        }
        aDiv.innerHTML = html;
    };

    function engine() {
        if(replay.active) {
            for(let i=0; i<30; i++) { 
                replay.x += replay.vx; replay.y += replay.vy;
                let hitX = (replay.x <= 0 || replay.x >= 500); let hitY = (replay.y <= 0 || replay.y >= 500);
                if(hitX) { replay.vx *= -1; replay.x = replay.x <= 0 ? 0 : 500; replay.bounces++; replay.trail.push(replay.bounces); }
                if(hitY) { replay.vy *= -1; replay.y = replay.y <= 0 ? 0 : 500; replay.bounces++; replay.trail.push(replay.bounces); }
                if((hitX && hitY) || replay.bounces >= replay.targetBounces) {
                    replay.active = false; triggerRipple(replay.x, replay.y, replay.targetBounces); reseed(); break;
                }
            }
            ctxP.fillStyle = 'rgba(0,0,0,0.02)'; ctxP.fillRect(0,0,500,500);
            let aColor = getFrequencyColor(replay.bounces); ctxP.shadowBlur = 15; ctxP.shadowColor = `rgb(${aColor})`;
            ctxP.fillStyle = '#fff'; ctxP.fillRect(replay.x-2, replay.y-2, 4, 4); ctxP.shadowBlur = 0;
            if(document.getElementById('v-lab').classList.contains('active')) window.renderSymmetryMap();
        } else {
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
                            
                            let topMatch = getTopology(Math.abs(s.vy));
                            s.recent.push({ seq: sig, vx: 5, vy: Math.abs(s.vy), bounces: 1500, botType: 'chaos', topology: topMatch });
                            
                            harmonics[1500]++; triggerRipple(s.x, s.y, 1500); updateLeaderboards();
                            if(s.recent.length > 2000) s.recent.shift();
                            if(document.getElementById('v-lab').classList.contains('active')) window.renderSymmetryMap();
                            if(document.getElementById('v-bot').classList.contains('active')) window.renderHands();
                            if(document.getElementById('v-analyze').classList.contains('active')) window.renderAnalyze();
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
                        
                        s.recent.push({ seq: sig, vx: 5, vy: Math.abs(s.vy), bounces: s.bounces, botType: activeBot.type, topology: "None" });
                        harmonics[s.bounces]++; triggerRipple(s.x, s.y, s.bounces); updateLeaderboards();
                        if(s.recent.length > 2000) s.recent.shift();
                        
                        localStorage.setItem('hyper_bots', JSON.stringify(bots));
                        localStorage.setItem('hyper_env', JSON.stringify({
                            scanned: s.scanned, found: s.found, shotsFired: s.shotsFired, recent: s.recent, currentBot: s.currentBot
                        }));

                        if(document.getElementById('v-lab').classList.contains('active')) window.renderSymmetryMap();
                        if(document.getElementById('v-bot').classList.contains('active')) window.renderHands();
                    }
                    reseed(); break;
                }
            }

            ctxP.fillStyle = 'rgba(0,0,0,0.3)'; ctxP.fillRect(0,0,500,500);
            ctxP.strokeStyle = 'rgba(255, 255, 255, 0.15)'; ctxP.lineWidth = 1; ctxP.beginPath();
            for(let i=0; i<=500; i+=50) { 
                ctxP.moveTo(i, 0); ctxP.lineTo(i, 500); 
                ctxP.moveTo(0, i); ctxP.lineTo(500, i); 
            }
            ctxP.stroke();

            if(gridPulse.alpha > 0.01) {
                gridPulse.alpha *= 0.95; gridPulse.radius += 10;
                ctxP.strokeStyle = `rgba(${gridPulse.color}, ${gridPulse.alpha})`; ctxP.lineWidth = 1.5; ctxP.beginPath();
                for(let i=0; i<=500; i+=50) { 
                    for(let j=0; j<=500; j+=20) {
                        let dist = Math.sqrt(Math.pow(i-250, 2) + Math.pow(j-250, 2));
                        let warp = Math.sin((dist - gridPulse.radius) / 20) * gridPulse.waveFactor * gridPulse.alpha;
                        if(j===0) ctxP.moveTo(i + warp, j); else ctxP.lineTo(i + warp, j);
                    }
                }
                for(let j=0; j<=500; j+=50) { 
                    for(let i=0; i<=500; i+=20) {
                        let dist = Math.sqrt(Math.pow(i-250, 2) + Math.pow(j-250, 2));
                        let warp = Math.sin((dist - gridPulse.radius) / 20) * gridPulse.waveFactor * gridPulse.alpha;
                        if(i===0) ctxP.moveTo(i, j + warp); else ctxP.lineTo(i, j + warp);
                    }
                }
                ctxP.stroke();
            }

            ctxP.strokeStyle = 'rgba(255, 0, 0, 0.4)'; ctxP.lineWidth = 1.5; ctxP.setLineDash([5, 5]);
            ctxP.beginPath(); ctxP.moveTo(s.ghostPts[0].x, s.ghostPts[0].y);
            for(let i=1; i<s.ghostPts.length; i++) ctxP.lineTo(s.ghostPts[i].x, s.ghostPts[i].y);
            ctxP.stroke(); ctxP.setLineDash([]); 

            let aColor = getFrequencyColor(s.bounces);
            ctxP.shadowBlur = 15; ctxP.shadowColor = `rgb(${aColor})`;
            let activeBot = bots[s.currentBot]; ctxP.fillStyle = activeBot.color; ctxP.fillRect(s.x-2, s.y-2, 4, 4);
            ctxP.shadowBlur = 0;
            
            ctxP.fillStyle = 'rgba(0,0,0,0.75)'; ctxP.fillRect(0, 0, 500, 35);
            
            let chaos = s.shotsFired > 0 ? (((s.shotsFired - s.found) / s.shotsFired) * 100).toFixed(2) : 100.00;
            let smithTotal = bots.filter(b=>b.type==='smith').reduce((a,b)=>a+b.score, 0);
            let bladeTotal = bots.filter(b=>b.type==='blade').reduce((a,b)=>a+b.score, 0);
            
            ctxP.font = '11px monospace';
            ctxP.fillStyle = '#ff0'; ctxP.fillText(`CHAOS: ${chaos}%`, 10, 14);
            ctxP.fillStyle = '#0f0'; ctxP.fillText(`SMITHS: ${smithTotal.toLocaleString()}`, 130, 14);
            ctxP.fillStyle = '#f0f'; ctxP.fillText(`BLADES: ${bladeTotal.toLocaleString()}`, 280, 14);
            
            let tE = topEfficiency[0] ? topEfficiency[0].vy.toFixed(6) : 'N/A';
            let tC = topComplexity[0] ? topComplexity[0].vy.toFixed(6) : 'N/A';
            ctxP.fillStyle = '#fff'; ctxP.fillText(`TOP EFFICIENT: ${tE} | TOP COMPLEX: ${tC}`, 10, 28);
        }

        for(let i = ripples.length-1; i >= 0; i--) {
            let r = ripples[i]; r.r += r.speed; r.alpha = 1 - (r.r / r.maxR);
            ctxP.beginPath();
            if(r.speed === 20) ctxP.rect(r.x - r.r/2, r.y - r.r/2, r.r, r.r);
            else ctxP.arc(r.x, r.y, r.r, 0, Math.PI*2);
            ctxP.strokeStyle = `rgba(${r.color}, ${r.alpha})`; ctxP.lineWidth = r.speed === 20 ? 5 : 2; ctxP.stroke();
            if(r.r >= r.maxR) ripples.splice(i, 1);
        }

        if(document.getElementById('v-hyper').classList.contains('active')) window.renderHyper();
        if(document.getElementById('v-zeta').classList.contains('active')) window.renderZeta();
        
        posEl.innerText = `SCANNED: ${s.scanned} | MELLI NODES & VOIDS: ${s.found}`;
        requestAnimationFrame(engine);
    }
    reseed(); engine();
};