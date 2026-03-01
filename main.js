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
    if(t === 'winding' && window.resizeV3) window.resizeV3();
    resizeAllCanvases();
};

// [FIX 2] RESPONSIVE CANVAS SYSTEM
// All canvases keep 500x500 logical coords. CSS scales them to fill the view.
function resizeAllCanvases() {
    ['c-phys','c-brain','c-hyper','c-hands','c-zeta'].forEach(id => {
        const canvas = document.getElementById(id);
        if(!canvas) return;
        const parent = canvas.parentElement;
        const availW = parent.clientWidth;
        const availH = parent.clientHeight;
        const scale = Math.min(availW / 500, availH / 500);
        canvas.style.position = 'absolute';
        canvas.style.left = ((availW - 500 * scale) / 2) + 'px';
        canvas.style.top  = ((availH - 500 * scale) / 2) + 'px';
        canvas.style.width  = (500 * scale) + 'px';
        canvas.style.height = (500 * scale) + 'px';
        canvas.style.imageRendering = 'pixelated';
    });
}
window.addEventListener('resize', resizeAllCanvases);

window.onload = () => {

    window.downloadData = () => {
        const exportData = { melli_nodes: s.recent, riemann_zeros: verifiedZeros, artifacts: museumArtifacts };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const dl = document.createElement('a');
        dl.setAttribute("href", dataStr);
        dl.setAttribute("download", "inversion_v2_data.json");
        document.body.appendChild(dl); dl.click(); dl.remove();
        showToast('DATA EXPORTED ✓');
    };

    // [FIX 4] INLINE INJECT UI — no more blocking prompt()
    const injectOverlay = document.createElement('div');
    injectOverlay.id = 'inject-overlay';
    injectOverlay.style.cssText = `
        display:none; position:fixed; inset:0; background:rgba(0,0,0,0.88);
        z-index:1000; align-items:center; justify-content:center;
    `;
    injectOverlay.innerHTML = `
        <div style="background:#0a0a0a; border:1px solid #0ff; padding:22px; width:290px; font-family:monospace;">
            <div style="color:#0ff; margin-bottom:10px; font-size:13px; letter-spacing:1px;">⌁ INJECT Vy VALUE</div>
            <div style="color:#555; font-size:11px; margin-bottom:10px;">
                Rational (e.g. 6.25) → closed orbit<br>
                Irrational (e.g. 3.14159) → chaos void
            </div>
            <input id="inject-input" type="number" step="any" placeholder="e.g. 3.14159"
                style="width:100%; background:#000; border:1px solid #0ff; color:#0ff; outline:none;
                       font-family:monospace; font-size:15px; padding:8px; box-sizing:border-box; margin-bottom:14px;" />
            <div style="display:flex; gap:8px;">
                <button onclick="window.confirmInject()"
                    style="flex:1; background:#0ff; color:#000; border:none; padding:9px;
                           font-family:monospace; font-weight:bold; font-size:12px; cursor:pointer; letter-spacing:1px;">
                    INJECT
                </button>
                <button onclick="window.closeInject()"
                    style="flex:1; background:transparent; color:#666; border:1px solid #333;
                           padding:9px; font-family:monospace; font-size:12px; cursor:pointer;">
                    CANCEL
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(injectOverlay);

    window.injectVy = () => {
        injectOverlay.style.display = 'flex';
        setTimeout(() => document.getElementById('inject-input').focus(), 60);
    };
    window.closeInject = () => {
        injectOverlay.style.display = 'none';
        document.getElementById('inject-input').value = '';
    };
    window.confirmInject = () => {
        const raw = document.getElementById('inject-input').value;
        const val = parseFloat(raw);
        if(raw && !isNaN(val)) {
            s.vy = val; s.vx = 5; s.x = 250; s.y = 250;
            s.bounces = 0; s.currentLoss = Infinity; s.shotsFired++;
            s.ghostPts = calcGhost();
            showToast(`INJECTED Vy = ${val.toFixed(5)}`);
        }
        window.closeInject();
    };
    document.addEventListener('keydown', e => {
        if(e.key === 'Escape') window.closeInject();
        if(e.key === 'Enter' && injectOverlay.style.display === 'flex') window.confirmInject();
    });

    // TOAST SYSTEM
    const toastEl = document.createElement('div');
    toastEl.id = 'bb-toast';
    toastEl.style.cssText = `
        position:fixed; bottom:62px; left:50%; transform:translateX(-50%);
        background:#0a0a0a; border:1px solid #0ff; color:#0ff; padding:6px 18px;
        font-family:monospace; font-size:11px; z-index:2000; letter-spacing:1px;
        opacity:0; transition:opacity 0.25s; pointer-events:none; white-space:nowrap;
    `;
    document.body.appendChild(toastEl);
    window.showToast = (msg, duration = 2200) => {
        toastEl.innerText = msg; toastEl.style.opacity = '1';
        clearTimeout(toastEl._t);
        toastEl._t = setTimeout(() => { toastEl.style.opacity = '0'; }, duration);
    };

    const cp    = document.getElementById('c-phys'),  ctxP    = cp.getContext('2d');
    const cb    = document.getElementById('c-brain'), ctxB    = cb.getContext('2d');
    const ch    = document.getElementById('c-hyper'), ctxH    = ch.getContext('2d');
    const cHand = document.getElementById('c-hands'), ctxHand = cHand.getContext('2d');
    const cZeta = document.getElementById('c-zeta'),  ctxZ    = cZeta.getContext('2d');

    // Logical resolution stays 500×500 — resizeAllCanvases() scales via CSS
    cp.width = cb.width = ch.width = cHand.width = cZeta.width  = 500;
    cp.height= cb.height= ch.height= cHand.height= cZeta.height = 500;

    const posEl = document.getElementById('pos-display');

    let bots = [
        { name:"Smith 1", type:"smith", range:[5,6], score:0, color:"#0f0", mem:null, bestLoss:Infinity, memB:0, lastGrad:null },
        { name:"Smith 2", type:"smith", range:[6,7], score:0, color:"#0f0", mem:null, bestLoss:Infinity, memB:0, lastGrad:null },
        { name:"Smith 3", type:"smith", range:[7,8], score:0, color:"#0f0", mem:null, bestLoss:Infinity, memB:0, lastGrad:null },
        { name:"Smith 4", type:"smith", range:[8,9], score:0, color:"#0f0", mem:null, bestLoss:Infinity, memB:0, lastGrad:null },
        { name:"Blade 1", type:"blade", range:[5,9], score:0, color:"#f0f", mem:null, bestLoss:Infinity, memB:0, lastGrad:null },
        { name:"Blade 2", type:"blade", range:[5,9], score:0, color:"#f0f", mem:null, bestLoss:Infinity, memB:0, lastGrad:null }
    ];

    let s = { x:250, y:250, vx:5, vy:7, bounces:0, scanned:0, found:0, shotsFired:0, recent:[], currentBot:0, mapMode:0, currentLoss:Infinity };
    let replay = { active:false, x:250, y:250, vx:5, vy:7, bounces:0, targetBounces:0, name:"", trail:[], node:null };
    let ripples = [];
    let gridPulse = { alpha:0, color:'0, 255, 255', radius:0, waveFactor:0 };
    let topEfficiency = [], topComplexity = [];
    let harmonics = new Array(1505).fill(0);
    let verifiedZeros = [], zetaCache = [], museumArtifacts = [];

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

    // [FIX 1] SHARED STATE BRIDGE — windingRoom.js talks to main engine via window.BB
    window.BB = {
        // Called on every V3 corner hit (winding++)
        onV3CornerHit(windingNumber, vy) {
            harmonics[Math.min(Math.floor(windingNumber), 1504)]++;
            triggerRipple(250, 250, Math.min(windingNumber * 8, 1500));
            if(document.getElementById('v-bot').classList.contains('active')) window.renderHands();
        },
        // V3 publishes its state here every frame for HANDS view to read
        publishState(state) {
            window.v3State = state;
        },
        // Called when V3 accumulates enough winding to count as a discovery
        onV3Discovery(node) {
            const isDupe = s.recent.some(r => r.source === 'v3' && Math.abs(r.vy - node.vy) < 0.0001);
            if(!isDupe) {
                s.recent.push(node);
                s.found++;
                checkArtifact(node);
                updateLeaderboards();
                if(s.recent.length > 2000) s.recent.shift();
                showToast(`◈ V3 DISCOVERY: Vy ${node.vy.toFixed(5)} | W# ${node.bounces}`);
                window.saveProgress();
                if(document.getElementById('v-lab').classList.contains('active'))    window.renderSymmetryMap();
                if(document.getElementById('v-museum').classList.contains('active')) window.renderMuseum();
            }
        }
    };

    // --- SAVE / LOAD ---
    window.saveProgress = () => {
        localStorage.setItem('hyper_bots',    JSON.stringify(bots));
        localStorage.setItem('hyper_env',     JSON.stringify({ scanned:s.scanned, found:s.found, shotsFired:s.shotsFired, recent:s.recent, currentBot:s.currentBot }));
        localStorage.setItem('hyper_museum',  JSON.stringify(museumArtifacts));
        localStorage.setItem('hyper_zeros',   JSON.stringify(verifiedZeros));
    };

    if(localStorage.getItem('hyper_bots')) {
        bots = JSON.parse(localStorage.getItem('hyper_bots'));
        const savedS = JSON.parse(localStorage.getItem('hyper_env'));
        s.scanned = savedS.scanned; s.found = savedS.found; s.shotsFired = savedS.shotsFired;
        s.recent = savedS.recent;   s.currentBot = savedS.currentBot;
        s.recent.forEach(n => { harmonics[Math.min(n.bounces, 1504)]++; });
        if(localStorage.getItem('hyper_museum')) museumArtifacts = JSON.parse(localStorage.getItem('hyper_museum'));
        if(localStorage.getItem('hyper_zeros'))  verifiedZeros   = JSON.parse(localStorage.getItem('hyper_zeros'));
        updateLeaderboards();
    }

    function updateLeaderboards() {
        const unique = [...new Map(s.recent.map(item => [item.bounces+'-'+item.vy.toFixed(4), item])).values()];
        topEfficiency = unique.filter(n => n.botType === 'smith').sort((a,b) => a.bounces - b.bounces).slice(0,10);
        topComplexity = unique.filter(n => n.botType !== 'smith').sort((a,b) => b.bounces - a.bounces).slice(0,10);
    }

    cb.addEventListener('click', e => {
        const rect = cb.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (cb.width / rect.width);
        const clickY = (e.clientY - rect.top)  * (cb.height / rect.height);
        let clickedNode = null, minDist = 15;
        s.recent.forEach(item => {
            const x = s.mapMode === 0 ? ((item.vy - 5) * 100) % 500 : (item.bounces * 5) % 500;
            const y = s.mapMode === 0 ? (item.bounces * 2) % 500   : (item.vy * 50) % 500;
            const dist = Math.sqrt((clickX-x)**2 + (clickY-y)**2);
            if(dist < minDist) { minDist = dist; clickedNode = item; }
        });
        if(clickedNode) {
            replay.active = true; replay.x = 250; replay.y = 250;
            replay.vx = clickedNode.vx; replay.vy = clickedNode.vy;
            replay.bounces = 0; replay.targetBounces = clickedNode.bounces;
            replay.name = clickedNode.seq; replay.trail = []; replay.node = clickedNode;
        } else { s.mapMode = (s.mapMode + 1) % 2; window.renderSymmetryMap(); }
    });

    function simulateLoss(testVy, botType) {
        let tx = 250, ty = 250, tvx = 5, tvy = testVy, bCount = 0, mLoss = Infinity;
        for(let i = 0; i < 30000; i++) {
            tx += tvx; ty += tvy;
            const hitX = tx <= 0 || tx >= 500;
            const hitY = ty <= 0 || ty >= 500;
            if(hitX) { tvx *= -1; tx = tx <= 0 ? 0 : 500; bCount++; }
            if(hitY) { tvy *= -1; ty = ty <= 0 ? 0 : 500; bCount++; }
            if(hitX || hitY) {
                const dx = Math.min(tx, 500-tx), dy = Math.min(ty, 500-ty);
                const d = Math.sqrt(dx*dx + dy*dy);
                if(d < mLoss) mLoss = d;
                if(hitX && hitY) { mLoss = 0; break; }
            }
            if(bCount >= 1500) break;
        }
        return botType === 'smith' ? mLoss : mLoss - (bCount * 0.5);
    }

    function calcGhost() {
        let gx = 250, gy = 250, gvx = s.vx, gvy = s.vy;
        const pts = [{x:gx, y:gy}];
        for(let k = 0; k < 10; k++) {
            const tx = gvx > 0 ? (500-gx)/gvx : -gx/gvx;
            const ty = gvy > 0 ? (500-gy)/gvy : -gy/gvy;
            const t = Math.min(tx, ty);
            gx += gvx*t; gy += gvy*t; pts.push({x:gx, y:gy});
            if(t === tx) gvx *= -1; if(t === ty) gvy *= -1;
        }
        return pts;
    }

    function reseed() {
        s.currentBot = (s.currentBot + 1) % bots.length;
        const b = bots[s.currentBot];
        s.vx = 5; s.shotsFired++; s.currentLoss = Infinity;

        const isKnownArtifact = b.mem !== null && museumArtifacts.some(art => Math.abs(art.vy - b.mem) < 0.005);

        if(b.mem !== null && Math.random() < 0.85) {
            if(isKnownArtifact && Math.random() < 0.75) {
                b.mem = null; b.bestLoss = Infinity; b.lastGrad = null;
                s.vy = b.range[0] + Math.random() * (b.range[1] - b.range[0]);
            } else {
                const variance = b.memB === 1500 ? 0.0000000001 : 0.001;
                const L1 = simulateLoss(b.mem, b.type);
                const L2 = simulateLoss(b.mem + variance, b.type);
                const gradient = (L2 - L1) / variance;
                const lr = b.type === 'smith' ? 0.001 : 0.005;
                const maxStep = b.memB === 1500 ? 0.0000001 : 0.05;
                const step = Math.max(-maxStep, Math.min(maxStep, gradient * lr));
                s.vy = b.mem - step; b.lastGrad = gradient;
            }
        } else {
            s.vy = b.range[0] + Math.random() * (b.range[1] - b.range[0]);
            b.lastGrad = null;
        }
        s.x = 250; s.y = 250; s.bounces = 0; s.ghostPts = calcGhost();
    }

    function triggerRipple(x, y, bounces) {
        let rColor, rSpeed, maxR;
        if(bounces >= 1500)      { rColor = '255, 140, 0';  rSpeed = 20; maxR = 800; }
        else if(bounces > 100)   { rColor = '220, 20, 60';  rSpeed = 2;  maxR = 400; }
        else if(bounces > 10)    { rColor = '50, 205, 50';  rSpeed = 8;  maxR = 200; }
        else                     { rColor = '0, 255, 255';  rSpeed = 15; maxR = 100; }
        ripples.push({ x, y, r:0, maxR, speed:rSpeed, color:rColor, alpha:1 });
        gridPulse.color = rColor; gridPulse.alpha = 1.0; gridPulse.radius = 0;
        gridPulse.waveFactor = bounces >= 1500 ? 15 : 5;
    }

    function getFrequencyColor(b) {
        if(b >= 1500) return '255, 140, 0';
        if(b > 100)   return '220, 20, 60';
        if(b > 10)    return '50, 205, 50';
        return '0, 255, 255';
    }

    function getTopology(vy, isVoid) {
        let topMatch = "None";
        for(const c of CONSTANTS) {
            for(let k = 1; k <= 10; k++) {
                if(Math.abs(vy - c.val * k) < 0.005) { topMatch = `≈ ${k} * ${c.name}`; break; }
                if(Math.abs(vy - c.val / k) < 0.005) { topMatch = `≈ ${c.name} / ${k}`; break; }
            }
            if(topMatch !== "None") break;
        }
        if(topMatch === "None") topMatch = isVoid ? "Irrational Space (Chaos)" : "Rational Orbit (Closed Loop)";
        return topMatch;
    }

    // --- ZETA BOTS ---
    function calcZetaMagnitude(t) {
        let reEta = 0, imEta = 0;
        for(let n = 1; n <= 150; n++) {
            let r = Math.pow(n, -0.5), theta = -t * Math.log(n);
            let tRe = r * Math.cos(theta), tIm = r * Math.sin(theta);
            if(n % 2 === 0) { tRe = -tRe; tIm = -tIm; }
            reEta += tRe; imEta += tIm;
        }
        const rDen = Math.sqrt(2), thetaDen = -t * Math.log(2);
        const denRe = 1 - rDen * Math.cos(thetaDen);
        const denIm = -rDen * Math.sin(thetaDen);
        const magEta = Math.sqrt(reEta*reEta + imEta*imEta);
        const magDen = Math.sqrt(denRe*denRe + denIm*denIm);
        return magDen === 0 ? 0 : magEta / magDen;
    }

    for(let t = 0; t <= 100; t += 0.2) zetaCache.push({ t, mag: calcZetaMagnitude(t) });

    let zetaBots = [
        { name:"Zeta-1", t:10 + Math.random()*2, color:"#0f0" },
        { name:"Zeta-2", t:15 + Math.random()*2, color:"#f0f" },
        { name:"Zeta-3", t:22 + Math.random()*2, color:"#ff8c00" },
        { name:"Zeta-4", t:26 + Math.random()*2, color:"#0ff" },
        { name:"Zeta-5", t:30 + Math.random()*2, color:"#ff0" }
    ];

    function updateZetaBots() {
        zetaBots.forEach(b => {
            const L1 = calcZetaMagnitude(b.t);
            const L2 = calcZetaMagnitude(b.t + 0.001);
            const gradient = (L2 - L1) / 0.001;
            if(Math.abs(gradient) < 0.0005 && L1 < 0.05) {
                if(!verifiedZeros.some(z => Math.abs(z - b.t) < 0.5)) {
                    verifiedZeros.push(b.t);
                    window.saveProgress();
                    showToast(`ZETA ZERO LOCKED: t ≈ ${b.t.toFixed(4)}`);
                }
                b.t = 10 + Math.random() * 85;
            } else {
                b.t -= gradient * 0.01;
                if(b.t > 100) b.t = 10 + Math.random() * 5;
                if(b.t < 0)   b.t = 10;
            }
        });
    }

    window.renderZeta = () => {
        ctxZ.fillStyle = 'rgba(0,0,0,0.5)'; ctxZ.fillRect(0,0,500,500);
        ctxZ.fillStyle = '#ff8c00'; ctxZ.font = '12px monospace';
        ctxZ.fillText("[VIEW: RIEMANN ZETA FRACTAL Hunt | Re(s) = 1/2]", 10, 20);

        ctxZ.strokeStyle = 'rgba(255,255,255,0.4)'; ctxZ.lineWidth = 1.5; ctxZ.beginPath();
        zetaCache.forEach((pt, idx) => {
            const x = 250 + pt.mag * 60, y = (pt.t / 100) * 500;
            if(idx === 0) ctxZ.moveTo(x,y); else ctxZ.lineTo(x,y);
        });
        ctxZ.stroke();

        ctxZ.strokeStyle = 'rgba(0,255,255,0.2)'; ctxZ.beginPath(); ctxZ.moveTo(250,0); ctxZ.lineTo(250,500); ctxZ.stroke();

        verifiedZeros.forEach(z => {
            const y = (z / 100) * 500;
            ctxZ.strokeStyle = 'rgba(255,215,0,0.5)'; ctxZ.lineWidth = 2;
            ctxZ.beginPath(); ctxZ.moveTo(220,y); ctxZ.lineTo(280,y); ctxZ.stroke();
            ctxZ.fillStyle = '#ffd700'; ctxZ.fillText(`LOCKED: ${z.toFixed(4)}`, 290, y+4);
        });

        zetaBots.forEach(b => {
            const y = (b.t / 100) * 500, x = 250 + calcZetaMagnitude(b.t) * 60;
            ctxZ.fillStyle = b.color; ctxZ.shadowBlur = 10; ctxZ.shadowColor = b.color;
            ctxZ.beginPath(); ctxZ.arc(x, y, 4, 0, Math.PI*2); ctxZ.fill(); ctxZ.shadowBlur = 0;
            ctxZ.fillText(`t ≈ ${b.t.toFixed(4)}`, x+15, y+4);
        });
    };

    function project3D(px, py, pz) {
        const time = Date.now() * 0.0005;
        const rotY = time * 0.7, rotX = time * 0.4;
        const x1 = px * Math.cos(rotY) - pz * Math.sin(rotY);
        const z1 = px * Math.sin(rotY) + pz * Math.cos(rotY);
        const y1 = py * Math.cos(rotX) - z1 * Math.sin(rotX);
        return { x: 250 + x1 * 140, y: 250 + y1 * 140 };
    }

    window.renderHyper = () => {
        ctxH.fillStyle = 'rgba(0,0,0,0.4)'; ctxH.fillRect(0,0,500,500);
        const R = 1.2, r = 0.5;

        // Ghost path on torus
        ctxH.strokeStyle = 'rgba(255,0,0,0.4)'; ctxH.lineWidth = 1; ctxH.beginPath();
        s.ghostPts.forEach((pt, i) => {
            const u = (pt.x/500)*Math.PI*2, v = (pt.y/500)*Math.PI*2;
            const px = (R + r*Math.cos(v))*Math.cos(u), py = (R + r*Math.cos(v))*Math.sin(u), pz = r*Math.sin(v);
            const p = project3D(px,py,pz);
            if(i===0) ctxH.moveTo(p.x,p.y); else ctxH.lineTo(p.x,p.y);
        });
        ctxH.stroke();

        // All discovered nodes — V3 shown as teal
        s.recent.forEach(item => {
            const u = ((item.vy-5)/4)*Math.PI*2, v = (item.bounces/201)*Math.PI*2;
            const px = (R + r*Math.cos(v))*Math.cos(u), py = (R + r*Math.cos(v))*Math.sin(u), pz = r*Math.sin(v);
            const pt = project3D(px,py,pz);
            ctxH.fillStyle = item.source === 'v3' ? '#00ffcc'
                           : item.botType === 'smith' ? '#0f0'
                           : item.botType === 'chaos' ? '#ff8c00' : '#f0f';
            ctxH.beginPath(); ctxH.arc(pt.x, pt.y, item.botType === 'chaos' ? 3.5 : 2.5, 0, Math.PI*2); ctxH.fill();
        });

        // Zeta warp curve
        ctxH.strokeStyle = 'rgba(255,255,255,0.8)'; ctxH.lineWidth = 2; ctxH.beginPath();
        zetaCache.forEach((pt, idx) => {
            const u = (pt.t/100)*Math.PI*4, warpedR = R + pt.mag*0.6;
            const px = (warpedR + r)*Math.cos(u), py = (warpedR + r)*Math.sin(u), pz = 0;
            const proj = project3D(px,py,pz);
            if(idx===0) ctxH.moveTo(proj.x,proj.y); else ctxH.lineTo(proj.x,proj.y);
        });
        ctxH.stroke();

        // Gold rings at verified zeros
        const syncGlow = gridPulse.alpha > 0.1 ? gridPulse.alpha * 20 : 0;
        verifiedZeros.forEach(z => {
            const u = (z/100)*Math.PI*4;
            const px = (R+r)*Math.cos(u), py = (R+r)*Math.sin(u);
            const pt = project3D(px,py,0);
            ctxH.shadowBlur = syncGlow; ctxH.shadowColor = '#ffd700';
            ctxH.strokeStyle = '#ffd700'; ctxH.beginPath(); ctxH.arc(pt.x,pt.y,6,0,Math.PI*2); ctxH.stroke();
            ctxH.shadowBlur = 0;
        });

        zetaBots.forEach(b => {
            const u = (b.t/100)*Math.PI*4, mag = calcZetaMagnitude(b.t), warpedR = R + mag*0.6;
            const px = (warpedR+r)*Math.cos(u), py = (warpedR+r)*Math.sin(u);
            const pt = project3D(px,py,0);
            ctxH.fillStyle = b.color; ctxH.shadowBlur = 10; ctxH.shadowColor = b.color;
            ctxH.beginPath(); ctxH.arc(pt.x,pt.y,4,0,Math.PI*2); ctxH.fill(); ctxH.shadowBlur = 0;
        });
    };

    window.renderHands = () => {
        ctxHand.fillStyle = '#000'; ctxHand.fillRect(0,0,500,500);
        ctxHand.fillStyle = '#fff'; ctxHand.font = '12px monospace';
        ctxHand.fillText("[VIEW: AI DIAGNOSTICS & HARMONIC SPECTRUM]", 10, 20);

        bots.forEach((b, i) => {
            ctxHand.fillStyle = b.color;
            const status  = b.lastGrad !== null ? `[AI: ▽L=${b.lastGrad.toFixed(4)}]` : `[EXPLORING]`;
            const memVal  = b.mem ? (b.memB === 1500 ? b.mem.toFixed(10) : b.mem.toFixed(4)) : 'NONE';
            ctxHand.fillText(`${b.name}: ${b.score} PTS | M:${memVal} | ${status}`, 10, 45 + i*18);
        });

        // [FIX 1] V3 live readout on HANDS view
        if(window.v3State) {
            ctxHand.fillStyle = '#00ffcc';
            ctxHand.fillText(`◈ V3 ENGINE | Vy: ${window.v3State.vy.toFixed(5)} | WINDING#: ${window.v3State.windingNumber}`, 10, 158);
        }

        ctxHand.fillStyle = '#555'; ctxHand.fillRect(0, 168, 500, 1);
        ctxHand.fillStyle = '#fff'; ctxHand.fillText("STRUCTURAL FREQUENCY (Bounces 1 → 1500)", 10, 185);
        ctxHand.strokeStyle = 'rgba(255,255,255,0.15)'; ctxHand.strokeRect(10, 195, 480, 295);

        const maxSpike = Math.max(...harmonics.slice(1), 1);
        for(let i = 1; i <= 1500; i++) {
            if(harmonics[i] > 0) {
                const h = (harmonics[i] / maxSpike) * 285;
                const x = 10 + (i / 1500) * 480;
                ctxHand.fillStyle = `rgb(${getFrequencyColor(i)})`;
                ctxHand.fillRect(x, 490 - h, 2, h);
            }
        }
    };

    window.renderSymmetryMap = () => {
        ctxB.fillStyle = '#000'; ctxB.fillRect(0,0,500,500);

        ctxB.strokeStyle = 'rgba(255,255,255,0.05)'; ctxB.lineWidth = 1;
        for(let i = 0; i <= 500; i += 50) {
            ctxB.beginPath(); ctxB.moveTo(i,0); ctxB.lineTo(i,500); ctxB.stroke();
            ctxB.beginPath(); ctxB.moveTo(0,i); ctxB.lineTo(500,i); ctxB.stroke();
        }

        // Web threads
        ctxB.strokeStyle = 'rgba(255,255,255,0.08)'; ctxB.lineWidth = 0.5;
        const sorted = [...s.recent].sort((a,b) => a.vy - b.vy);
        ctxB.beginPath();
        for(let i = 0; i < sorted.length-1; i++) {
            if(Math.abs(sorted[i].vy - sorted[i+1].vy) < 0.05) {
                const x1 = s.mapMode===0 ? ((sorted[i].vy-5)*100)%500   : (sorted[i].bounces*5)%500;
                const y1 = s.mapMode===0 ? (sorted[i].bounces*2)%500     : (sorted[i].vy*50)%500;
                const x2 = s.mapMode===0 ? ((sorted[i+1].vy-5)*100)%500 : (sorted[i+1].bounces*5)%500;
                const y2 = s.mapMode===0 ? (sorted[i+1].bounces*2)%500   : (sorted[i+1].vy*50)%500;
                ctxB.moveTo(x1,y1); ctxB.lineTo(x2,y2);
            }
        }
        ctxB.stroke();

        // Nodes — V3 as teal diamonds
        s.recent.forEach(item => {
            const x = s.mapMode===0 ? ((item.vy-5)*100)%500 : (item.bounces*5)%500;
            const y = s.mapMode===0 ? (item.bounces*2)%500  : (item.vy*50)%500;
            if(item.source === 'v3') {
                ctxB.fillStyle = '#00ffcc';
                ctxB.save(); ctxB.translate(x,y); ctxB.rotate(Math.PI/4);
                ctxB.fillRect(-3,-3,6,6); ctxB.restore();
            } else {
                ctxB.fillStyle = item.botType==='smith' ? '#0f0' : (item.botType==='chaos' ? '#ff8c00' : '#f0f');
                ctxB.beginPath(); ctxB.arc(x,y, item.botType==='chaos'?4:2.5, 0, Math.PI*2); ctxB.fill();
            }
        });

        // Cyan Ruliad thread (last 15 discoveries)
        if(s.recent.length > 1) {
            ctxB.strokeStyle = 'rgba(0,255,255,0.5)'; ctxB.lineWidth = 1.5; ctxB.beginPath();
            const startIdx = Math.max(0, s.recent.length - 15);
            for(let i = startIdx; i < s.recent.length; i++) {
                const n = s.recent[i];
                const x = s.mapMode===0 ? ((n.vy-5)*100)%500 : (n.bounces*5)%500;
                const y = s.mapMode===0 ? (n.bounces*2)%500  : (n.vy*50)%500;
                if(i===startIdx) ctxB.moveTo(x,y); else ctxB.lineTo(x,y);
            }
            ctxB.stroke();
        }

        // Replay trail dots
        if(replay.trail.length > 0) {
            ctxB.fillStyle = 'rgba(255,255,255,0.8)';
            replay.trail.forEach(b => {
                const x = s.mapMode===0 ? ((replay.vy-5)*100)%500 : (b*5)%500;
                const y = s.mapMode===0 ? (b*2)%500 : (replay.vy*50)%500;
                ctxB.beginPath(); ctxB.arc(x,y,1.5,0,Math.PI*2); ctxB.fill();
            });
        }

        // Header
        ctxB.fillStyle = 'rgba(0,0,0,0.75)'; ctxB.fillRect(0,0,500,30);
        ctxB.fillStyle = '#fff'; ctxB.font = '12px monospace';
        ctxB.fillText(s.mapMode===0 ? "[VIEW: MELLI SPIRALS + RULIAD WEB]" : "[VIEW: FAREY SPREAD + RULIAD WEB]", 10, 20);

        // PiP replay window
        if(replay.active && replay.node) {
            const nx = s.mapMode===0 ? ((replay.node.vy-5)*100)%500 : (replay.node.bounces*5)%500;
            const ny = s.mapMode===0 ? (replay.node.bounces*2)%500  : (replay.node.vy*50)%500;
            const pulse = Math.abs(Math.sin(Date.now()*0.005)) * 8;
            ctxB.strokeStyle = '#fff'; ctxB.lineWidth = 1;
            ctxB.beginPath(); ctxB.arc(nx,ny,6+pulse,0,Math.PI*2); ctxB.stroke();

            const pipSize=130, pipX=500-pipSize-10, pipY=40;
            ctxB.fillStyle = 'rgba(0,0,0,0.85)'; ctxB.fillRect(pipX,pipY,pipSize,pipSize);
            ctxB.strokeStyle = 'rgba(0,255,255,0.5)'; ctxB.strokeRect(pipX,pipY,pipSize,pipSize);

            if(replay.trail.length > 1) {
                ctxB.strokeStyle = 'rgba(0,255,204,0.4)'; ctxB.lineWidth = 1; ctxB.beginPath();
                let simX=250, simY=250, sVx=replay.node.vx, sVy=replay.node.vy;
                const history = [{x:simX,y:simY}];
                for(let i=0; i<replay.bounces; i++) {
                    const tX = sVx>0?(500-simX)/sVx:(0-simX)/sVx;
                    const tY = sVy>0?(500-simY)/sVy:(0-simY)/sVy;
                    const t = Math.min(tX,tY);
                    simX += sVx*t; simY += sVy*t; history.push({x:simX,y:simY});
                    if(t===tX) sVx*=-1; if(t===tY) sVy*=-1;
                }
                ctxB.moveTo(pipX + (history[0].x/500)*pipSize, pipY + (history[0].y/500)*pipSize);
                history.forEach(pt => ctxB.lineTo(pipX + (pt.x/500)*pipSize, pipY + (pt.y/500)*pipSize));
                ctxB.stroke();
            }

            const dotX = pipX + (replay.x/500)*pipSize, dotY = pipY + (replay.y/500)*pipSize;
            const aColor = getFrequencyColor(replay.bounces);
            ctxB.fillStyle = `rgb(${aColor})`; ctxB.shadowBlur = 10; ctxB.shadowColor = `rgb(${aColor})`;
            ctxB.beginPath(); ctxB.arc(dotX,dotY,2.5,0,Math.PI*2); ctxB.fill(); ctxB.shadowBlur = 0;
            ctxB.fillStyle = '#fff'; ctxB.font = '10px monospace';
            ctxB.fillText('REPLAY RUN', pipX+5, pipY+12);
            ctxB.fillText(`B: ${replay.bounces}/${replay.targetBounces}`, pipX+5, pipY+24);
        }
    };

    window.renderAnalyze = () => {
        const aDiv = document.getElementById('v-analyze');
        const voids  = [...new Map(s.recent.filter(n => n.bounces===1500).map(item => [item.vy.toFixed(6), item])).values()];
        const orbits = [...new Map(s.recent.filter(n => n.bounces<1500 && n.bounces>0 && n.source!=='v3').map(item => [item.vy.toFixed(6), item])).values()].slice(0,15);
        const v3s    = s.recent.filter(n => n.source === 'v3');

        let html = `<h2>[TOPOLOGICAL CONSTANT ANALYZER]</h2>`;

        html += `<h3 style="color:#ff8c00;">[IRRATIONAL CHAOS VOIDS — 1500b]</h3>`;
        if(!voids.length) html += `<p class="no-match">No Chaos Voids detected yet.</p>`;
        else voids.forEach(v => {
            const cls = v.topology.includes("None")||v.topology.includes("Rational") ? "no-match" : "match-found";
            html += `<div class="match-row ${cls}"><strong>VOID:</strong> Vy = ${v.vy.toFixed(6)} | <strong>MATCH:</strong> ${v.topology}</div>`;
        });

        html += `<br><h3 style="color:#0ff;">[RATIONAL ORBITS — CLOSED LOOPS]</h3>`;
        if(!orbits.length) html += `<p class="no-match">No stable orbits verified yet.</p>`;
        else orbits.forEach(o => {
            html += `<div class="match-row" style="color:#0ff;"><strong>ORBIT:</strong> Vy=${o.vy.toFixed(6)} | B:${o.bounces} | ${o.topology}</div>`;
        });

        // [FIX 1] V3 section in ANALYZE
        html += `<br><h3 style="color:#00ffcc;">[◈ V3 WINDING DISCOVERIES]</h3>`;
        if(!v3s.length) html += `<p class="no-match">Switch to V3 tab to generate winding data.</p>`;
        else v3s.forEach(n => {
            html += `<div class="match-row" style="color:#00ffcc;">◈ Vy=${n.vy.toFixed(6)} | W#:${n.bounces} | ${n.topology}</div>`;
        });

        aDiv.innerHTML = html;
    };

    window.renderIsoscelesReality = () => {
        const vReality = document.getElementById('v-reality');
        if(!vReality) return;
        let canvasR = document.getElementById('c-reality');
        if(!canvasR) {
            canvasR = document.createElement('canvas');
            canvasR.id='c-reality'; canvasR.width=500; canvasR.height=500;
            vReality.appendChild(canvasR);
        }
        const ctxR = canvasR.getContext('2d');
        ctxR.fillStyle='#000'; ctxR.fillRect(0,0,500,500);
        ctxR.fillStyle='#00ff55'; ctxR.font='12px monospace';
        ctxR.fillText("[VIEW: ISOSCELES REALITY MAPPING]", 10, 20);

        const apexX=250, apexY=60, baseY=460, baseWidth=420;
        ctxR.strokeStyle='rgba(0,255,255,0.4)'; ctxR.lineWidth=2;
        ctxR.beginPath(); ctxR.moveTo(apexX,apexY);
        ctxR.lineTo(apexX-baseWidth/2,baseY); ctxR.lineTo(apexX+baseWidth/2,baseY);
        ctxR.closePath(); ctxR.stroke();

        s.recent.forEach(item => {
            const nY  = item.bounces / 1500, nX = (item.vy-5) / 4;
            const yPos = apexY + nY*(baseY-apexY);
            const xPos = apexX + (nX-0.5)*(nY*baseWidth);
            ctxR.fillStyle = item.source==='v3' ? '#00ffcc'
                           : item.botType==='smith' ? '#0f0'
                           : item.botType==='chaos' ? '#ff8c00' : '#f0f';
            ctxR.beginPath(); ctxR.arc(xPos, yPos, item.botType==='chaos'?3:2, 0, Math.PI*2); ctxR.fill();
        });
    };

    // [FIX 3] MUSEUM SIGIL RENDERER — ray-cast approach, fills box correctly
    function drawSigil(ctx, art, W, H) {
        const speed = Math.sqrt(25 + art.vy*art.vy);
        let nx = 5/speed * (W/4), ny = art.vy/speed * (H/4);
        let x = W/2, y = H/2;
        ctx.beginPath(); ctx.moveTo(x, y);
        const totalBounces = Math.min(art.bounces > 0 ? art.bounces : 200, 400);
        let bounces = 0;
        for(let step = 0; step < 20000 && bounces < totalBounces; step++) {
            const tX = nx > 0 ? (W-x)/nx : nx < 0 ? (0-x)/nx : Infinity;
            const tY = ny > 0 ? (H-y)/ny : ny < 0 ? (0-y)/ny : Infinity;
            const t  = Math.min(tX, tY);
            if(!isFinite(t) || t <= 1e-9) break;
            x += nx*t; y += ny*t;
            if(x <= 0)  { x=0;  nx=Math.abs(nx);  bounces++; }
            if(x >= W)  { x=W;  nx=-Math.abs(nx); bounces++; }
            if(y <= 0)  { y=0;  ny=Math.abs(ny);  bounces++; }
            if(y >= H)  { y=H;  ny=-Math.abs(ny); bounces++; }
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    window.renderMuseum = () => {
        const mDiv = document.getElementById('v-museum');
        let html = `<h2 style="color:#d4af37;text-align:center;">[THE ARTIFACT MUSEUM]</h2>`;
        html += `<p style="text-align:center;color:#888;font-size:12px;">Unique topologies mapped by the Taskforce. Novelty Search Active.</p>`;
        html += `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:15px;margin-top:20px;">`;

        museumArtifacts.forEach((art, i) => {
            const color = art.source==='v3' ? '#00ffcc'
                        : art.botType==='smith' ? '#0f0'
                        : art.botType==='chaos' ? '#ff8c00' : '#f0f';
            const badge = art.source==='v3' ? `<div style="font-size:9px;color:#00ffcc;margin-bottom:3px;">◈ V3</div>` : '';
            html += `<div style="border:1px solid ${color};padding:10px;width:180px;background:#111;text-align:center;">
                ${badge}
                <div style="font-size:10px;color:${color};height:24px;overflow:hidden;">${art.topology}</div>
                <div style="font-size:12px;margin:5px 0;">Vy: ${art.vy.toFixed(5)}</div>
                <div style="font-size:10px;color:#aaa;">Bounces: ${art.bounces}</div>
                <canvas id="art-c-${i}" width="160" height="160" style="margin:8px auto 0;background:#000;border:1px solid #222;display:block;"></canvas>
            </div>`;
        });
        html += `</div>`;
        mDiv.innerHTML = html;

        museumArtifacts.forEach((art, i) => {
            const c = document.getElementById(`art-c-${i}`);
            if(!c) return;
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#000'; ctx.fillRect(0,0,160,160);
            ctx.strokeStyle = art.source==='v3'       ? 'rgba(0,255,204,0.7)'
                            : art.botType==='smith'    ? 'rgba(0,255,0,0.6)'
                            : art.botType==='chaos'    ? 'rgba(255,140,0,0.45)'
                                                       : 'rgba(255,0,255,0.6)';
            ctx.lineWidth = 1;
            drawSigil(ctx, art, 160, 160);
        });
    };

    function checkArtifact(node) {
        const isNovel = !museumArtifacts.some(a => Math.abs(a.vy - node.vy) < 0.005 && a.bounces === node.bounces);
        if(isNovel) museumArtifacts.push(node);
    }

    // --- MAIN ENGINE LOOP ---
    function engine() {
        updateZetaBots();

        if(replay.active) {
            for(let i = 0; i < 30; i++) {
                replay.x += replay.vx; replay.y += replay.vy;
                const hitX = replay.x<=0||replay.x>=500, hitY = replay.y<=0||replay.y>=500;
                if(hitX) { replay.vx*=-1; replay.x=replay.x<=0?0:500; replay.bounces++; replay.trail.push(replay.bounces); }
                if(hitY) { replay.vy*=-1; replay.y=replay.y<=0?0:500; replay.bounces++; replay.trail.push(replay.bounces); }
                if((hitX&&hitY) || replay.bounces>=replay.targetBounces) {
                    replay.active=false; triggerRipple(replay.x,replay.y,replay.targetBounces); reseed(); break;
                }
            }
            ctxP.fillStyle='rgba(0,0,0,0.02)'; ctxP.fillRect(0,0,500,500);
            const aColor = getFrequencyColor(replay.bounces);
            ctxP.shadowBlur=15; ctxP.shadowColor=`rgb(${aColor})`;
            ctxP.fillStyle='#fff'; ctxP.fillRect(replay.x-2,replay.y-2,4,4); ctxP.shadowBlur=0;
            if(document.getElementById('v-lab').classList.contains('active')) window.renderSymmetryMap();

        } else {
            for(let i = 0; i < 1000; i++) {
                s.x += s.vx; s.y += s.vy; s.scanned++;
                const hitX = s.x<=0||s.x>=500, hitY = s.y<=0||s.y>=500;
                if(hitX) { s.vx*=-1; s.x=s.x<=0?0:500; s.bounces++; }
                if(hitY) { s.vy*=-1; s.y=s.y<=0?0:500; s.bounces++; }

                if(hitX||hitY) {
                    const dx=Math.min(s.x,500-s.x), dy=Math.min(s.y,500-s.y);
                    const d=Math.sqrt(dx*dx+dy*dy);
                    if(d<s.currentLoss) s.currentLoss=d;
                }

                const activeBot = bots[s.currentBot];

                if(s.bounces > 1500) {
                    if(s.currentLoss < activeBot.bestLoss) {
                        activeBot.bestLoss=s.currentLoss; activeBot.mem=Math.abs(s.vy); activeBot.memB=1500;
                    }
                    if(activeBot.type==='blade') {
                        const sig = `CHAOS VOID: Vy ${Math.abs(s.vy).toFixed(5)} | INFINITE`;
                        if(!s.recent.some(r => r.seq===sig)) {
                            s.found++; activeBot.score+=1500;
                            const node = { seq:sig, vx:5, vy:Math.abs(s.vy), bounces:1500, botType:'chaos', topology:getTopology(Math.abs(s.vy),true) };
                            s.recent.push(node); checkArtifact(node); window.saveProgress();
                            harmonics[1500]++; triggerRipple(s.x,s.y,1500); updateLeaderboards();
                            if(s.recent.length>2000) s.recent.shift();
                            if(document.getElementById('v-lab').classList.contains('active'))     window.renderSymmetryMap();
                            if(document.getElementById('v-bot').classList.contains('active'))     window.renderHands();
                            if(document.getElementById('v-analyze').classList.contains('active')) window.renderAnalyze();
                            if(document.getElementById('v-museum').classList.contains('active'))  window.renderMuseum();
                        }
                    }
                    reseed(); break;
                }

                if(hitX&&hitY) {
                    s.currentLoss=0;
                    if(0 <= activeBot.bestLoss) { activeBot.bestLoss=0; activeBot.mem=Math.abs(s.vy); activeBot.memB=s.bounces; }
                    const sig = `${activeBot.name}: Vy ${Math.abs(s.vy).toFixed(4)} | Bounces: ${s.bounces}`;
                    if(!s.recent.some(r => r.seq===sig)) {
                        s.found++;
                        if(activeBot.type==='smith') activeBot.score += Math.max(10, 500-s.bounces);
                        if(activeBot.type==='blade') activeBot.score += s.bounces;
                        const node = { seq:sig, vx:5, vy:Math.abs(s.vy), bounces:s.bounces, botType:activeBot.type, topology:getTopology(Math.abs(s.vy),false) };
                        s.recent.push(node); checkArtifact(node); window.saveProgress();
                        harmonics[s.bounces]++; triggerRipple(s.x,s.y,s.bounces); updateLeaderboards();
                        if(s.recent.length>2000) s.recent.shift();
                        if(document.getElementById('v-lab').classList.contains('active'))    window.renderSymmetryMap();
                        if(document.getElementById('v-bot').classList.contains('active'))    window.renderHands();
                        if(document.getElementById('v-museum').classList.contains('active')) window.renderMuseum();
                    }
                    reseed(); break;
                }
            }

            // Draw physics view
            ctxP.fillStyle='rgba(0,0,0,0.3)'; ctxP.fillRect(0,0,500,500);
            ctxP.strokeStyle='rgba(255,255,255,0.15)'; ctxP.lineWidth=1; ctxP.beginPath();
            for(let i=0; i<=500; i+=50) { ctxP.moveTo(i,0); ctxP.lineTo(i,500); ctxP.moveTo(0,i); ctxP.lineTo(500,i); }
            ctxP.stroke();

            if(gridPulse.alpha > 0.01) {
                gridPulse.alpha*=0.95; gridPulse.radius+=10;
                ctxP.strokeStyle=`rgba(${gridPulse.color},${gridPulse.alpha})`; ctxP.lineWidth=1.5; ctxP.beginPath();
                for(let i=0; i<=500; i+=50) for(let j=0; j<=500; j+=20) {
                    const dist=Math.sqrt((i-250)**2+(j-250)**2);
                    const warp=Math.sin((dist-gridPulse.radius)/20)*gridPulse.waveFactor*gridPulse.alpha;
                    if(j===0) ctxP.moveTo(i+warp,j); else ctxP.lineTo(i+warp,j);
                }
                for(let j=0; j<=500; j+=50) for(let i=0; i<=500; i+=20) {
                    const dist=Math.sqrt((i-250)**2+(j-250)**2);
                    const warp=Math.sin((dist-gridPulse.radius)/20)*gridPulse.waveFactor*gridPulse.alpha;
                    if(i===0) ctxP.moveTo(i,j+warp); else ctxP.lineTo(i,j+warp);
                }
                ctxP.stroke();
            }

            ctxP.strokeStyle='rgba(255,0,0,0.4)'; ctxP.lineWidth=1.5; ctxP.setLineDash([5,5]);
            ctxP.beginPath(); ctxP.moveTo(s.ghostPts[0].x,s.ghostPts[0].y);
            for(let i=1;i<s.ghostPts.length;i++) ctxP.lineTo(s.ghostPts[i].x,s.ghostPts[i].y);
            ctxP.stroke(); ctxP.setLineDash([]);

            const aColor = getFrequencyColor(s.bounces);
            ctxP.shadowBlur=15; ctxP.shadowColor=`rgb(${aColor})`;
            ctxP.fillStyle=bots[s.currentBot].color; ctxP.fillRect(s.x-2,s.y-2,4,4); ctxP.shadowBlur=0;

            ctxP.fillStyle='rgba(0,0,0,0.75)'; ctxP.fillRect(0,0,500,35);
            const chaos = s.shotsFired>0 ? (((s.shotsFired-s.found)/s.shotsFired)*100).toFixed(2) : '100.00';
            const smithTotal = bots.filter(b=>b.type==='smith').reduce((a,b)=>a+b.score,0);
            const bladeTotal = bots.filter(b=>b.type==='blade').reduce((a,b)=>a+b.score,0);
            ctxP.font='11px monospace';
            ctxP.fillStyle='#ff0'; ctxP.fillText(`CHAOS: ${chaos}%`, 10, 14);
            ctxP.fillStyle='#0f0'; ctxP.fillText(`SMITHS: ${smithTotal.toLocaleString()}`, 130, 14);
            ctxP.fillStyle='#f0f'; ctxP.fillText(`BLADES: ${bladeTotal.toLocaleString()}`, 280, 14);
            const tE = topEfficiency[0]?.vy.toFixed(6) ?? 'N/A';
            const tC = topComplexity[0]?.vy.toFixed(6) ?? 'N/A';
            ctxP.fillStyle='#fff'; ctxP.fillText(`TOP EFFICIENT: ${tE} | TOP COMPLEX: ${tC}`, 10, 28);
        }

        // Ripples
        for(let i=ripples.length-1; i>=0; i--) {
            const rp=ripples[i]; rp.r+=rp.speed; rp.alpha=1-(rp.r/rp.maxR);
            ctxP.beginPath();
            if(rp.speed===20) ctxP.rect(rp.x-rp.r/2, rp.y-rp.r/2, rp.r, rp.r);
            else ctxP.arc(rp.x, rp.y, rp.r, 0, Math.PI*2);
            ctxP.strokeStyle=`rgba(${rp.color},${rp.alpha})`; ctxP.lineWidth=rp.speed===20?5:2; ctxP.stroke();
            if(rp.r>=rp.maxR) ripples.splice(i,1);
        }

        if(document.getElementById('v-hyper').classList.contains('active'))   window.renderHyper();
        if(document.getElementById('v-zeta').classList.contains('active'))    window.renderZeta();
        if(document.getElementById('v-reality').classList.contains('active')) window.renderIsoscelesReality();

        posEl.innerText = `SCANNED: ${s.scanned} | MELLI NODES & VOIDS: ${s.found}`;
        requestAnimationFrame(engine);
    }

    resizeAllCanvases();
    reseed();
    engine();
};
