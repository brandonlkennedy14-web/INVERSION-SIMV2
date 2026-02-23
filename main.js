window.tab = (t) => {

    document.querySelectorAll('.view, .nav button').forEach(el => el.classList.remove('active'));

    document.getElementById('v-' + t).classList.add('active');

    document.getElementById('b-' + t).classList.add('active');

    

    // Immediate render trigger for complex views

    if (t === 'lab' && window.renderSymmetryMap) window.renderSymmetryMap();

    if (t === 'hyper' && window.renderHyper) window.renderHyper();

    if (t === 'bot' && window.renderHands) window.renderHands();

    if (t === 'zeta' && window.renderZeta) window.renderZeta();

    if (t === 'analyze' && window.renderAnalyze) window.renderAnalyze();

    if (t === 'reality' && window.renderIsoscelesReality) window.renderIsoscelesReality();

    if (t === 'museum' && window.renderMuseum) window.renderMuseum();

};



window.onload = () => {

    window.downloadData = () => {

        const exportData = { 

            melli_nodes: s.recent, 

            riemann_zeros: verifiedZeros, 

            artifacts: museumArtifacts 

        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));

        const dl = document.createElement('a'); dl.setAttribute("href", dataStr);

        dl.setAttribute("download", "inversion_v2_data.json");

        document.body.appendChild(dl); dl.click(); dl.remove();

    };



    window.injectVy = () => {

        let val = prompt("Enter specific Vy to test (e.g., 3.14159):");

        if(val && !isNaN(parseFloat(val))) {

            s.vy = parseFloat(val); s.vx = 5; s.x = 250; s.y = 250; s.bounces = 0; 

            s.currentLoss = Infinity; s.shotsFired++; s.ghostPts = calcGhost(); 

        }

    };



    const cp = document.getElementById('c-phys'), ctxP = cp.getContext('2d');

    const cb = document.getElementById('c-brain'), ctxB = cb.getContext('2d');

    const ch = document.getElementById('c-hyper'), ctxH = ch.getContext('2d');

    const cHand = document.getElementById('c-hands'), ctxHand = cHand.getContext('2d');

    const cZeta = document.getElementById('c-zeta'), ctxZ = cZeta.getContext('2d');

    

    cp.width = cb.width = ch.width = cHand.width = cZeta.width = 500; 

    cp.height = cb.height = ch.height = cHand.height = cZeta.height = 500; 

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

    let ripples = []; let gridPulse = { alpha: 0, color: '0, 255, 255', radius: 0, waveFactor: 0 };

    let topEfficiency = []; let topComplexity = []; let harmonics = new Array(1505).fill(0);

    let verifiedZeros = []; let zetaCache = []; let museumArtifacts = [];



    const CONSTANTS = [

        { name: "π", val: Math.PI }, { name: "e", val: Math.E }, { name: "φ", val: 1.618033988749 },

        { name: "√2", val: Math.SQRT2 }, { name: "√3", val: 1.732050807568 }, { name: "√5", val: 2.236067977499 },

        { name: "α", val: 4.669201609102 }, { name: "ζ(3)", val: 1.202056903159 }, { name: "G", val: 0.915965594177 }

    ];



    // --- UNIVERSAL SAVE SYSTEM ---

    window.saveProgress = () => {

        localStorage.setItem('hyper_bots', JSON.stringify(bots));

        localStorage.setItem('hyper_env', JSON.stringify({

            scanned: s.scanned, found: s.found, shotsFired: s.shotsFired, recent: s.recent, currentBot: s.currentBot

        }));

        localStorage.setItem('hyper_museum', JSON.stringify(museumArtifacts));

        localStorage.setItem('hyper_zeros', JSON.stringify(verifiedZeros));

    };



    // --- LOAD SAVED DATA ---

    if(localStorage.getItem('hyper_bots')) {

        bots = JSON.parse(localStorage.getItem('hyper_bots'));

        let savedS = JSON.parse(localStorage.getItem('hyper_env'));

        s.scanned = savedS.scanned; s.found = savedS.found; s.shotsFired = savedS.shotsFired; 

        s.recent = savedS.recent; s.currentBot = savedS.currentBot;

        s.recent.forEach(n => { harmonics[n.bounces]++; }); 

        

        if(localStorage.getItem('hyper_museum')) museumArtifacts = JSON.parse(localStorage.getItem('hyper_museum'));

        if(localStorage.getItem('hyper_zeros')) verifiedZeros = JSON.parse(localStorage.getItem('hyper_zeros'));

        

        updateLeaderboards();

    }



    function updateLeaderboards() {

        let uniqueNodes = [...new Map(s.recent.map(item => [item.bounces + '-' + item.vy.toFixed(4), item])).values()];

        topEfficiency = uniqueNodes.filter(n => n.botType === 'smith').sort((a,b) => a.bounces - b.bounces).slice(0,10);

        topComplexity = uniqueNodes.filter(n => n.botType !== 'smith').sort((a,b) => b.bounces - a.bounces).slice(0,10);

    }



    function simulateLoss(testVy, botType) {

        let tx = 250, ty = 250, tvx = 5, tvy = testVy, bCount = 0, mLoss = Infinity;

        for(let i=0; i<30000; i++) {

            tx += tvx; ty += tvy;

            if(tx <= 0 || tx >= 500) { tvx *= -1; tx = (tx <= 0) ? 0 : 500; bCount++; }

            if(ty <= 0 || ty >= 500) { tvy *= -1; ty = (ty <= 0) ? 0 : 500; bCount++; }

            let dx = Math.min(tx, 500-tx); let dy = Math.min(ty, 500-ty);

            let dist = Math.sqrt(dx*dx + dy*dy);

            if(dist < mLoss) mLoss = dist;

            if(bCount >= 1500) break;

        }

        return botType === 'smith' ? mLoss : mLoss - (bCount * 0.5); 

    }



    function calcGhost() {

        let gx = 250, gy = 250, gvx = s.vx, gvy = s.vy; let pts = [{x: gx, y: gy}];

        for(let k=0; k<10; k++) {

            let tx = gvx > 0 ? (500 - gx)/gvx : (0 - gx)/gvx; let ty = gvy > 0 ? (500 - gy)/gvy : (0 - gy)/gvy;

            let t = Math.min(tx, ty); gx += gvx * t; gy += gvy * t; pts.push({x: gx, y: gy});

            if(t === tx) gvx *= -1; else gvy *= -1;

        }

        return pts;

    }



    function reseed() {

        s.currentBot = (s.currentBot + 1) % bots.length; let b = bots[s.currentBot];

        s.vx = 5; s.shotsFired++; s.currentLoss = Infinity;



        // TASKFORCE BOREDOM PROTOCOL (Novelty Search)

        let isKnown = b.mem !== null && museumArtifacts.some(art => Math.abs(art.vy - b.mem) < 0.005);

        if(b.mem !== null && (isKnown || Math.random() > 0.85)) {

            // Jump to completely new range if bored or exploring

            b.mem = null; b.bestLoss = Infinity; b.lastGrad = null;

        }



        if(b.mem !== null) {

            let variance = (b.memB === 1500) ? 0.0000000001 : 0.001;

            let L1 = simulateLoss(b.mem, b.type), L2 = simulateLoss(b.mem + variance, b.type);

            let gradient = (L2 - L1) / variance;

            let step = Math.max(-0.05, Math.min(0.05, gradient * (b.type === 'smith' ? 0.001 : 0.005))); 

            s.vy = b.mem - step; b.lastGrad = gradient; 

        } else {

            s.vy = b.range[0] + Math.random() * (b.range[1] - b.range[0]);

            b.lastGrad = null;

        }

        s.x = 250; s.y = 250; s.bounces = 0; s.ghostPts = calcGhost();

    }

// ==========================================

    // 6. CINEMATIC RENDERERS (TORUS & THE EYE)

    // ==========================================

    function project3D(px, py, pz) {

        let time = Date.now() * 0.0006;

        let x1 = px * Math.cos(time * 0.7) - pz * Math.sin(time * 0.7);

        let z1 = px * Math.sin(time * 0.7) + pz * Math.cos(time * 0.7);

        let y1 = py * Math.cos(time * 0.4) - z1 * Math.sin(time * 0.4);

        let sz = ch.width;

        return { x: sz / 2 + (x1 * sz * 0.28), y: sz / 2 + (y1 * sz * 0.28) };

    }



    window.renderHyper = () => {

        ctxH.fillStyle = 'rgba(0,0,0,0.4)'; ctxH.fillRect(0, 0, ch.width, ch.width);

        let R = 1.3, r = 0.55;

        

        // Render Red-Dashed Ghost on Torus

        ctxH.strokeStyle = 'rgba(255,0,0,0.35)'; ctxH.lineWidth = 1; ctxH.beginPath();

        s.ghostPts.forEach((p, i) => {

            let u = (p.x / 500) * Math.PI * 2, v = (p.y / 500) * Math.PI * 2;

            let px = (R + r * Math.cos(v)) * Math.cos(u), py = (R + r * Math.cos(v)) * Math.sin(u), pz = r * Math.sin(v);

            let pt = project3D(px, py, pz);

            if (i === 0) ctxH.moveTo(pt.x, pt.y); else ctxH.lineTo(pt.x, pt.y);

        });

        ctxH.stroke();



        // Render Recent Artifacts on Torus

        s.recent.slice(-100).forEach(n => {

            let u = ((n.vy - 5) / 4) * Math.PI * 2, v = (n.bounces / 1500) * Math.PI * 2;

            let px = (R + r * Math.cos(v)) * Math.cos(u), py = (R + r * Math.cos(v)) * Math.sin(u), pz = r * Math.sin(v);

            let pt = project3D(px, py, pz);

            ctxH.fillStyle = n.botType === 'smith' ? '#0f0' : (n.botType === 'chaos' ? '#ff8c00' : '#f0f');

            ctxH.beginPath(); ctxH.arc(pt.x, pt.y, 2, 0, Math.PI * 2); ctxH.fill();

        });

    };



    window.renderIsoscelesReality = () => {

        const vR = document.getElementById('v-reality');

        let cR = document.getElementById('c-reality');

        if (!cR) { cR = document.createElement('canvas'); cR.id = 'c-reality'; vR.appendChild(cR); }

        cR.width = cR.height = cp.width;

        const ctx = cR.getContext('2d'); const sz = cR.width;



        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, sz, sz);

        ctx.fillStyle = '#0f5'; ctx.font = '10px monospace'; ctx.fillText("[VIEW: REALITY EYE]", 10, 20);

        

        const ax = sz / 2, ay = sz * 0.12, by = sz * 0.88, bw = sz * 0.75;

        ctx.strokeStyle = 'rgba(0,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - bw / 2, by); ctx.lineTo(ax + bw / 2, by); ctx.closePath(); ctx.stroke();



        s.recent.forEach(n => {

            let nY = n.bounces / 1500, nX = (n.vy - 5) / 4;

            let yP = ay + (nY * (by - ay)), xP = ax + (nX - 0.5) * (nY * bw);

            ctx.fillStyle = n.botType === 'smith' ? '#0f0' : (n.botType === 'chaos' ? '#ff8c00' : '#f0f');

            ctx.beginPath(); ctx.arc(xP, yP, 2, 0, Math.PI * 2); ctx.fill();

        });

    };



    window.renderHands = () => {

        ctxHand.fillStyle = '#000'; ctxHand.fillRect(0, 0, cHand.width, cHand.width);

        ctxHand.fillStyle = '#fff'; ctxHand.font = '10px monospace';

        ctxHand.fillText("[AI DIAGNOSTICS & SPECTRUM]", 10, 20);

        bots.forEach((b, i) => {

            ctxHand.fillStyle = b.color;

            let status = b.lastGrad !== null ? `[▽L=${b.lastGrad.toFixed(4)}]` : `[EXP]`;

            ctxHand.fillText(`${b.name}: ${b.score} PTS | M:${b.mem?.toFixed(5) || 'VOID'} | ${status}`, 10, 45 + (i * 18));

        });

        let maxS = Math.max(...harmonics, 1);

        for (let i = 1; i <= 1500; i++) {

            if (harmonics[i] > 0) {

                let h = (harmonics[i] / maxS) * 200, x = (i / 1500) * cHand.width;

                ctxHand.fillStyle = i >= 1500 ? '#ff8c00' : '#00ffff';

                ctxHand.fillRect(x, cHand.width - h, 2, h);

            }

        }

    };



    window.renderMuseum = () => {

        const mDiv = document.getElementById('v-museum');

        let html = `<h2 style="color:#d4af37; text-align:center;">[MUSEUM OF TOPOLOGY]</h2><div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:center;">`;

        museumArtifacts.slice(-12).forEach((art, i) => {

            html += `<div style="border:1px solid #333; background:#111; width:110px; padding:5px; text-align:center;">

                <canvas id="m-canv-${i}" width="100" height="100"></canvas>

                <div style="font-size:7px; color:#aaa; margin-top:3px;">${art.topology}</div>

                <div style="font-size:6px; color:#555;">Vy: ${art.vy.toFixed(4)}</div>

            </div>`;

        });

        mDiv.innerHTML = html + `</div>`;

        museumArtifacts.slice(-12).forEach((art, i) => {

            const ctx = document.getElementById(`m-canv-${i}`)?.getContext('2d');

            if (!ctx) return; ctx.strokeStyle = art.botType === 'smith' ? '#0f0' : '#f0f'; ctx.lineWidth = 1; ctx.beginPath();

            let tx = 50, ty = 50, tvx = 2, tvy = art.vy / 3;

            for (let j = 0; j < 60; j++) { tx += tvx; ty += tvy; if (tx <= 0 || tx >= 100) tvx *= -1; if (ty <= 0 || ty >= 100) tvy *= -1; ctx.lineTo(tx, ty); }

            ctx.stroke();

        });

    };



    window.renderSymmetryMap = () => {

        ctxB.fillStyle = '#000'; ctxB.fillRect(0, 0, cb.width, cb.width);

        ctxB.strokeStyle = 'rgba(255,255,255,0.05)';

        for (let i = 0; i < cb.width; i += 50) { ctxB.beginPath(); ctxB.moveTo(i, 0); ctxB.lineTo(i, cb.width); ctxB.stroke(); ctxB.beginPath(); ctxB.moveTo(0, i); ctxB.lineTo(cb.width, i); ctxB.stroke(); }

        s.recent.slice(-300).forEach(n => {

            let x = ((n.vy - 5) * 100) % cb.width, y = (n.bounces * 2) % cb.width;

            ctxB.fillStyle = n.botType === 'smith' ? '#0f0' : '#f0f'; ctxB.beginPath(); ctxB.arc(x, y, 2.5, 0, Math.PI * 2); ctxB.fill();

        });

    };



    window.renderZeta = () => {

        ctxZ.fillStyle = 'rgba(0,0,0,0.2)'; ctxZ.fillRect(0, 0, cZeta.width, cZeta.width);

        ctxZ.strokeStyle = '#333'; ctxZ.beginPath();

        zetaCache.forEach((p, i) => {

            let x = (cZeta.width / 2) + (p.mag * (cZeta.width / 6)), y = (p.t / 100) * cZeta.width;

            if (i === 0) ctxZ.moveTo(x, y); else ctxZ.lineTo(x, y);

        });

        ctxZ.stroke();

        verifiedZeros.forEach(z => { ctxZ.fillStyle = '#ffd700'; ctxZ.fillRect(cZeta.width / 2 - 25, (z / 100) * cZeta.width, 50, 1.5); });

    };



    // ==========================================

    // 7. CORE ENGINE LOOP (HEARTBEAT)

    // ==========================================

    function engine() {

        // Update Zeta Taskforce

        zetaBots.forEach(b => {

            let m1 = calcZetaMagnitude(b.t), m2 = calcZetaMagnitude(b.t + 0.001);

            let grad = (m2 - m1) / 0.001;

            if (Math.abs(grad) < 0.0005 && m1 < 0.05) {

                if (!verifiedZeros.some(z => Math.abs(z - b.t) < 0.1)) { verifiedZeros.push(b.t); window.saveProgress(); }

                b.t = Math.random() * 90 + 10;

            } else { b.t -= grad * 0.02; }

        });



        // Main Simulation Step

        for (let i = 0; i < 1000; i++) {

            s.x += s.vx; s.y += s.vy; s.scanned++;

            let hX = (s.x <= 0 || s.x >= 500), hY = (s.y <= 0 || s.y >= 500);

            if (hX) { s.vx *= -1; s.x = s.x <= 0 ? 0 : 500; s.bounces++; }

            if (hY) { s.vy *= -1; s.y = s.y <= 0 ? 0 : 500; s.bounces++; }



            if (s.bounces >= 1500 || (hX && hY)) {

                let isVoid = s.bounces >= 1500; let bot = bots[s.currentBot];

                let node = { vy: Math.abs(s.vy), bounces: isVoid ? 1500 : s.bounces, botType: isVoid ? 'chaos' : bot.type, topology: getTopology(Math.abs(s.vy), isVoid) };

                s.recent.push(node); s.found++; bot.mem = node.vy; bot.memB = node.bounces;

                if (!museumArtifacts.some(a => Math.abs(a.vy - node.vy) < 0.004)) museumArtifacts.push(node);

                window.saveProgress(); reseed(); break;

            }

        }



        // Render Principal Simulation ("EYES")

        const sz = cp.width, sc = sz / 500;

        ctxP.fillStyle = 'rgba(0,0,0,0.1)'; ctxP.fillRect(0, 0, sz, sz);

        ctxP.strokeStyle = 'rgba(255,0,0,0.4)'; ctxP.setLineDash([5, 5]); ctxP.beginPath();

        s.ghostPts.forEach((p, i) => { if (i === 0) ctxP.moveTo(p.x * sc, p.y * sc); else ctxP.lineTo(p.x * sc, p.y * sc); });

        ctxP.stroke(); ctxP.setLineDash([]);

        ctxP.fillStyle = bots[s.currentBot].color; ctxP.shadowBlur = 12; ctxP.shadowColor = ctxP.fillStyle;

        ctxP.fillRect(s.x * sc - 2, s.y * sc - 2, 4, 4); ctxP.shadowBlur = 0;



        posEl.innerText = `SCANNED: ${s.scanned.toLocaleString()} | ARTIFACTS: ${s.found}`;



        // Tab-Specific Logic

        if (document.getElementById('v-hyper').classList.contains('active')) window.renderHyper();

        if (document.getElementById('v-bot').classList.contains('active')) window.renderHands();

        if (document.getElementById('v-reality').classList.contains('active')) window.renderIsoscelesReality();

        if (document.getElementById('v-zeta').classList.contains('active')) window.renderZeta();



        requestAnimationFrame(engine);

    }



    reseed();

    engine();

};