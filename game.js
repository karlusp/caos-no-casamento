"use strict";
/* ============================================================
   CAOS NO CASAMENTO  -  protótipo jogável (nível 1 + chefe)
   Carlos (videógrafo) e Francisco (fotógrafo) a recuperar o material.
   Resolução interna 384x224, filtro CRT opcional (tecla V).
   ============================================================ */

const W = 384, H = 224, GROUND = 190, WORLD = 2600;
// Largura visivel (VW): a altura e fixa e, em ecras mais largos, mostra-se mais cenario nas laterais (ate VWMAX).
// OX = pixeis extra de cada lado. Todo o desenho usa o 'palco' de 384 px centrado (translate OX); o jogo estende o cenario.
const VWMAX = 496, VHMAX = 288;
let VW = 384, VH = 224, OX = 0, OY = 0;   // OY = pixeis extra em cima (ecras mais altos que 16:9, ex. iPad)
const cv = document.getElementById("c");
cv.width = 768; cv.height = 448;      // resolução interna 2x
const ctx = cv.getContext("2d");
ctx.imageSmoothingEnabled = false;
// di(): desenha assets a 2x em coordenadas lógicas (origem em unidades 384x224)
function di(img, a, b, c, d, e, f, g, h) {
  if (arguments.length === 3) ctx.drawImage(img, 0, 0, img.width, img.height, a, b, img.width / 2, img.height / 2);
  else if (arguments.length === 5) ctx.drawImage(img, 0, 0, img.width, img.height, a, b, c, d);
  else ctx.drawImage(img, a * 2, b * 2, c * 2, d * 2, e, f, g, h);
}
const hp = v => Math.round(v * 2) / 2;   // alinha ao pixel do ecrã (a tela é 2x): movimento a 1.5 px/frame fica regular, sem tremido
const crtEl = document.getElementById("crt");

/* ---------------- carregamento de assets ---------------- */
const IMG = {}, SFX = {}, MUS = {};
const imgNames = ["francisco", "carlos", "armas", "chapeu", "bolo", "tufao", "tufao_flash", "itens", "convidados",
  "ceu", "colinas", "plano", "tiles", "plataformas", "font", "padre", "extras", "projeteis", "mapa", "casario",
  "carlos_pl", "francisco_pl", "padre_pl", "chef_pl", "bolo_pl", "francesinha_pl", "gaivota_pl", "chapeu_pl", "tufao_pl", "supertufao_pl", "tuna_pl", "dj_pl", "florista_pl", "planner_pl", "fundo_casamento_dia", "proj_pl", "noiva_pl", "noivo_pl", "conv_chapeu_pl", "mapa_pl", "estudante_pl", "pastel_pl", "caranguejo_pl", "cavaleiro_pl", "conv_fato_pl", "conv_fato2_pl", "conv_chapeu2_pl", "conv_verde_pl", "ceu_porto", "plano_porto", "tiles_porto", "plataformas_porto", "chef", "gaivota", "francesinha", "projeteis2", "fundo_guimaraes", "chao_guimaraes", "fundo_porto", "chao_porto", "fundo_coimbra", "chao_coimbra", "fundo_lisboa", "chao_lisboa", "fundo_algarve", "chao_algarve", "fundo_castelo", "chao_castelo"];
const sfxNames = ["pulo", "gimbal", "monope", "flash", "travelling", "acerto", "dano", "item", "bateria", "roupa", "selfie",
  "boss_hit", "boss_morre", "vento", "start", "blip", "gameover", "vitoria", "sino", "grito",
  "morre_chapeu", "morre_gaivota", "morre_bolo", "morre_francesinha", "morre_gen"];
const musNames = ["intro", "titulo", "mapa", "nivel1", "porto", "coimbra", "lisboa", "algarve", "castelo", "boss", "final"];
let loaded = 0;
const total = imgNames.length;
imgNames.forEach(n => { const i = new Image(); i.onload = () => loaded++; i.src = "assets/" + n + ".png"; IMG[n] = i; });
sfxNames.forEach(n => { const a = new Audio("assets/audio/" + n + ".wav"); a.preload = "auto"; SFX[n] = a; });
musNames.forEach(n => { const a = new Audio("assets/audio/" + n + ".ogg"); a.preload = "none"; a.loop = true; MUS[n] = a; });
let muted = false;
function sfx(n, vol = 0.6) {
  if (muted) return;
  const a = SFX[n]; if (!a) return;
  const c = a.cloneNode(); c.volume = vol; c.play().catch(() => {});
}
let curMus = null;
// Música com Web Audio: repete sem corte (o <audio loop> do browser deixa uma pequena pausa em cada volta).
// Se o Web Audio falhar, usa o <audio> normal como alternativa.
let AC = null, musGain = null, musSrc = null, musTok = 0;
const musBuf = {};
const LOOP_INI = { nivel1: 7.5, porto: 3.273, coimbra: 3.582, lisboa: 3.81, algarve: 4.138, castelo: 3.478, boss: 3.243, final: 3.077 };   // segundos: onde começa o ciclo (depois da introdução) em cada música
function acOK() {
  if (AC) return true;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    musGain = AC.createGain(); musGain.gain.value = muted ? 0 : 0.7; musGain.connect(AC.destination);
    return true;
  } catch (e) { AC = null; return false; }
}
function musBuffer(n) {
  if (!musBuf[n]) musBuf[n] = fetch("assets/audio/" + n + ".ogg").then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => AC.decodeAudioData(b, ok, no))).catch(() => null);
  return musBuf[n];
}
function musStop() {
  musTok++;
  if (musSrc) { try { musSrc.stop(); } catch (e) { /* já parou */ } musSrc = null; }
  Object.values(MUS).forEach(a => a.pause());
}
function music(n, from = 0) {
  if (curMus === n) return;
  musStop();
  curMus = n;
  if (!n) return;
  const tok = musTok;
  const alternativa = () => { const a = MUS[n]; if (!a || curMus !== n || tok !== musTok) return; a.currentTime = from; a.volume = muted ? 0 : 0.7; a.play().catch(() => {}); };
  if (!acOK()) { alternativa(); return; }
  if (AC.state === "suspended") AC.resume().catch(() => {});
  musBuffer(n).then(buf => {
    if (curMus !== n || tok !== musTok) return;
    if (!buf) { alternativa(); return; }
    const src = AC.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(musGain);
    if (LOOP_INI[n]) { src.loopStart = LOOP_INI[n]; src.loopEnd = buf.duration; }   // a introdução toca só a 1.ª vez
    src.start(0, from % buf.duration); musSrc = src;
  });
}
function musicSeek(n, t) { if (curMus !== n) music(n, t); else { const k = curMus; curMus = null; music(k, t); } }
// Quando a app vai para segundo plano (botão início, outra app, ecrã desligado): silenciar e pausar.
window.__pausar = function (fundo) {
  try {
    if (fundo) {
      if (AC && AC.state === "running") AC.suspend().catch(() => {});
      Object.values(MUS).forEach(a => a.pause());
      if (typeof phase !== "undefined" && phase === "play") paused = true;
    } else {
      if (AC && AC.state === "suspended") AC.resume().catch(() => {});
      if (curMus && !musSrc && MUS[curMus]) MUS[curMus].play().catch(() => {});
    }
  } catch (e) { /* ignora */ }
};
document.addEventListener("visibilitychange", () => window.__pausar(document.hidden));
addEventListener("pagehide", () => window.__pausar(true));
function setMuted(m) { muted = m; if (musGain) musGain.gain.value = m ? 0 : 0.7; Object.values(MUS).forEach(a => a.volume = m ? 0 : 0.7); }

const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };
/* ---------------- escala / CRT ---------------- */
let CRT_KK = 1;
let crtMode = lsGet("caos_crt", 1) === 0 ? 0 : 1;   // só há "sem linhas" e "linhas"
// area visivel real (no iPad/Safari o innerHeight engana quando as barras do browser mudam)
const vpW = () => Math.round((window.visualViewport && visualViewport.width) || innerWidth);
const vpH = () => Math.round((window.visualViewport && visualViewport.height) || innerHeight);
function resize() {
  const asp = vpW() > 0 && vpH() > 0 ? vpW() / vpH() : W / H;
  let vw = Math.round(Math.min(VWMAX, Math.max(W, H * asp)));
  vw -= vw % 2;
  let vh = asp < W / H ? Math.round(Math.min(VHMAX, Math.max(H, W / asp))) : H;
  vh -= vh % 2;
  if (vw !== VW || vh !== VH) { VW = vw; VH = vh; OX = (VW - W) / 2; OY = VH - H; cv.width = VW * 2; cv.height = VH * 2; ctx.imageSmoothingEnabled = false; }
  let k = Math.floor(Math.min(vpW() / VW, vpH() / VH));
  const s = Math.min(vpW() / VW, vpH() / VH);   // enche a janela (escala não inteira); k só serve para as linhas CRT
  cv.style.width = Math.round(VW * s) + "px"; cv.style.height = Math.round(VH * s) + "px";
  CRT_KK = Math.max(1, k);
  estiloCRT();
}
addEventListener("resize", resize); resize();
if (window.visualViewport) visualViewport.addEventListener("resize", resize);
addEventListener("orientationchange", () => setTimeout(resize, 250));
{ let uw = 0, uh = 0; setInterval(() => { if (vpW() !== uw || vpH() !== uh) { uw = vpW(); uh = vpH(); resize(); if (window.__fit) window.__fit(); } }, 400); }
function estiloCRT() {
  const kk = CRT_KK, vig = (a) => `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,${a}) 100%)`;
  if (crtMode === 1) crtEl.style.background = vig(.45) + `,repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,0) ${kk * 0.62}px, rgba(0,0,0,.32) ${kk * 0.62}px, rgba(0,0,0,.32) ${kk}px)`;
  else if (crtMode === 2) crtEl.style.background = vig(.5) +   // grelha de fósforo: listas verticais RGB + linhas finas
    `,repeating-linear-gradient(to right, rgba(255,60,60,.10) 0, rgba(255,60,60,.10) ${kk}px, rgba(60,255,60,.10) ${kk}px, rgba(60,255,60,.10) ${kk * 2}px, rgba(70,70,255,.10) ${kk * 2}px, rgba(70,70,255,.10) ${kk * 3}px)` +
    `,repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,0) ${kk * 1.5}px, rgba(0,0,0,.20) ${kk * 1.5}px, rgba(0,0,0,.20) ${kk * 2}px)`;
  else if (crtMode === 3) crtEl.style.background = vig(.30) +   // linhas suaves e finas, sem cortes secos
    `,repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,.24) ${kk}px, rgba(0,0,0,0) ${kk * 2}px)`;
}
function applyCRT() { crtEl.style.display = crtMode ? "block" : "none"; estiloCRT(); }
function mudaCRT() { crtMode = (crtMode + 1) % CRT_NOMES.length; lsSet("caos_crt", crtMode); applyCRT(); }
applyCRT();

/* ---------------- fonte bitmap ---------------- */
const fontCache = {};
function fontFor(color) {
  if (fontCache[color]) return fontCache[color];
  const f = IMG.font;
  if (!f.complete || !f.naturalWidth) return null;   // fonte ainda a carregar: não guardar uma versão vazia
  const c = document.createElement("canvas");
  c.width = f.width; c.height = f.height;
  const x = c.getContext("2d");
  x.drawImage(f, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return fontCache[color] = c;
}
function text(s, x, y, color = "#fff", sc = 1, align = "left", shadow = true) {
  s = String(s);
  if (window.TOQUE) s = s.replace("PRIME ENTER", "TOCA").replace("ENTER:", "TOCA:");
  const w = s.length * 7 * sc;
  if (align === "center") x -= w / 2; else if (align === "right") x -= w;
  x = Math.round(x); y = Math.round(y);
  const draw = (col, ox, oy) => {
    const f = fontFor(col);
    if (!f) return;
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i) - 32; if (code < 0 || code > 223) continue;
      ctx.drawImage(f, (code % 32) * 14, ((code / 32) | 0) * 24, 14, 24, x + i * 7 * sc + ox, y + oy, 7 * sc, 12 * sc);
    }
  };
  if (shadow) draw("#12081c", sc, sc);
  draw(color, 0, 0);
}

/* ---------------- entrada ---------------- */
const keys = {}, edge = {};
addEventListener("keydown", e => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  if (!keys[e.code]) edge[e.code] = true;
  keys[e.code] = true;
});
addEventListener("keyup", e => { keys[e.code] = false; });
const MAP = [
  { left: "ArrowLeft", right: "ArrowRight", jump: ["ArrowUp", "KeyZ"], attack: "KeyX", special: "KeyC" },
  { left: "KeyA", right: "KeyD", jump: ["KeyW"], attack: "KeyF", special: "KeyG" },
];
const padPrev = [{}, {}];
function padState(i) {
  const gp = (navigator.getGamepads && navigator.getGamepads()[i]) || null;
  const s = { left: false, right: false, jump: false, attack: false, special: false, start: false };
  if (!gp) return s;
  const ax = gp.axes[0] || 0;
  s.left = ax < -0.4 || (gp.buttons[14] && gp.buttons[14].pressed);
  s.right = ax > 0.4 || (gp.buttons[15] && gp.buttons[15].pressed);
  s.jump = !!(gp.buttons[0] && gp.buttons[0].pressed) || !!(gp.buttons[1] && gp.buttons[1].pressed);
  s.attack = !!(gp.buttons[2] && gp.buttons[2].pressed) || !!(gp.buttons[3] && gp.buttons[3].pressed);
  s.special = !!(gp.buttons[4] && gp.buttons[4].pressed) || !!(gp.buttons[5] && gp.buttons[5].pressed) || !!(gp.buttons[7] && gp.buttons[7].pressed);
  s.start = !!(gp.buttons[9] && gp.buttons[9].pressed);
  return s;
}
function getInput(i) {
  const m = MAP[i], p = padState(i), pp = padPrev[i];
  const held = k => (Array.isArray(k) ? k.some(x => keys[x]) : keys[k]);
  const pressed = k => (Array.isArray(k) ? k.some(x => edge[x]) : edge[k]);
  const inp = {
    left: held(m.left) || p.left, right: held(m.right) || p.right,
    jumpHeld: held(m.jump) || p.jump,
    jump: pressed(m.jump) || (p.jump && !pp.jump),
    attack: pressed(m.attack) || (p.attack && !pp.attack),
    special: pressed(m.special) || (p.special && !pp.special),
  };
  padPrev[i] = p;
  return inp;
}
function menuInput() {
  const p0 = padState(0), p1 = padState(1);
  const r = {
    ok: edge.Enter || edge.Space || edge.KeyX || edge.KeyF || (p0.start && !(padPrev.m0 || {}).start) || (p0.jump && !(padPrev.m0 || {}).jump),
    left: edge.ArrowLeft || edge.KeyA, right: edge.ArrowRight || edge.KeyD,
    up: edge.ArrowUp || edge.KeyW, down: edge.ArrowDown || edge.KeyS,
    back: edge.Escape,
  };
  padPrev.m0 = p0; padPrev.m1 = p1;
  return r;
}

/* ---------------- utilitários ---------------- */
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function spr(img, sx, sy, sw, sh, dx, dy, flip = false, alpha = 1, rot = 0, sc = 1) {
  ctx.save();
  if (alpha !== 1) ctx.globalAlpha = alpha;
  ctx.translate(hp(dx + sw * sc / 2), hp(dy + sh * sc / 2));
  if (rot) ctx.rotate(rot);
  ctx.scale(flip ? -sc : sc, sc);
  ctx.drawImage(img, sx * 2, sy * 2, sw * 2, sh * 2, -sw / 2, -sh / 2, sw, sh);
  ctx.restore();
}

/* ---------------- sombra no chão / casario ---------------- */
function shadow(x, y, rw, a = 0.48) {
  const cx = hp(x), yy = Math.round(y);
  ctx.fillStyle = `rgba(14,8,28,${a})`;
  ctx.fillRect(cx - rw, yy - 1, rw * 2, 3);
  ctx.fillRect(cx - rw + 2, yy - 2, rw * 2 - 4, 1);
  ctx.fillRect(cx - rw + 2, yy + 2, rw * 2 - 4, 1);
}
function floorBelow(x, y) {
  let f = GROUND;
  if (G && G.plats) for (const pl of G.plats) {
    const w = pl.type === "banco" ? 48 : 44;
    if (x + 4 > pl.x && x - 4 < pl.x + w && pl.y >= y - 2 && pl.y < f) f = pl.y;
  }
  return f;
}
const CEU_CACHE = new Map();
function ceuExtra(img, sx, sw, x, w) {   // prolonga o céu para cima (ecrãs altos): cor suave da linha de cima da imagem, escurecida para o topo
  if (OY <= 0) return;
  let c = CEU_CACHE.get(img);
  if (!c) {   // 24 amostras da faixa superior (média de 6 linhas), depois alargadas com suavização
    c = document.createElement("canvas"); c.width = 24; c.height = 1;
    const cx = c.getContext("2d"); cx.imageSmoothingEnabled = true; cx.drawImage(img, 0, 0, img.width, 12, 0, 0, 24, 1);
    CEU_CACHE.set(img, c);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, x, -OY, w, OY + 1);
  ctx.imageSmoothingEnabled = false;
  const g = ctx.createLinearGradient(0, -OY, 0, 0); g.addColorStop(0, "rgba(10,6,24,.5)"); g.addColorStop(1, "rgba(10,6,24,0)");
  ctx.fillStyle = g; ctx.fillRect(x, -OY, w, OY);
}
function fundoLargo(img, bx) {   // fundo largo repetido para cobrir -OX .. W+OX
  const L = img.width / 2; let x = bx;
  while (x > -OX) x -= L;
  for (; x < W + OX; x += L) { di(img, Math.round(x), 0); ceuExtra(img, 0, img.width / 2, Math.round(x), img.width / 2); }
}
function drawCasario(off) {
  let o = -((off) % 1024);
  while (o > -OX) o -= 1024;
  for (let x = o; x < W + OX; x += 1024) di(IMG.casario, Math.round(x), GROUND - 90);
}

/* ---------------- estado global ---------------- */
let ACEL = false, phase = "boot", phaseT = 0, frame = 0, paused = false, pauseSel = 0, pauseT = 0;
let numPlayers = 1, chosen = ["carlos", "francisco"];
let G = null;            // estado de jogo (nível)
let shake = 0, whiteFlash = 0;

/* ============================================================
   PERSONAGENS
   ============================================================ */
const CHAR = {
  carlos:    { speed: 2.0, jump: -6.5, w: 12, h: 52, name: "CARLOS",    dmg: 1.5, atkDur: 18, atkCd: 6,  reach: 40 },
  francisco: { speed: 1.5, jump: -6.1, w: 14, h: 58, name: "FRANCISCO", dmg: 2, atkDur: 22, atkCd: 12, reach: 46 },
};
// folhas laterais PixelLab (gerar com integrar_pixellab.py): células de 160x160 px = 80x80 lógicos,
// pés na linha 151, corpo centrado, a olhar para a direita; uma linha por estado de roupa
const CELLL = 80, FEET = 76;
const LAT = {
  carlos: { img: "carlos_pl", portrait: [31, 15], a: { idle: [0, 3], run: [4, 11], jump: [12, 20], attack: [21, 29], dash: [30, 35], hurt: [36, 40], impatient: [0, 3] } },
  francisco: { img: "francisco_pl", portrait: [31, 16], a: { idle: [0, 3], run: [4, 11], jump: [12, 20], attack: [21, 29], flash: [30, 36], hurt: [37, 41], selfie: [42, 50] } },
};
// animações de uma só passagem: t em "unidades antigas" (OLD) onde t/OLD vai de 0 a 1
const OLD = { attack: 6, jump: 1, hurt: 2, flash: 2, selfie: 4, dash: 1 };
function actor(ch, state, anim, t, x, y, flip, alpha = 1) {
  const L = LAT[ch];
  if (L) {
    const [a, b] = L.a[anim], n = b - a + 1;
    const idx = OLD[anim] ? a + clamp(Math.floor(clamp(t / OLD[anim], 0, 0.999) * n), 0, n - 1) : a + (((Math.floor(t) % n) + n) % n);
    spr(IMG[L.img], idx * CELLL, state * CELLL, CELLL, CELLL, x - CELLL / 2, y - FEET, flip, alpha);
    return;
  }
  const map = { idle: FR.idle, run: (Math.floor(t / 2) % 2) ? FR.walk1 : FR.walk2, jump: FR.jump, attack: FR.atk2, dash: FR.atk2, hurt: FR.hurt, impatient: FR.idle, pose: FR.pose };
  spr(IMG[ch], map[anim] * 40, state * 64, 40, 64, x - 20, y - 63, flip, alpha);
}
function playerAnim(p) {
  const c = CHAR[p.ch];
  if (p.hurtT > 0) return ["hurt", (18 - p.hurtT) / 18 * OLD.hurt];
  if (p.dash > 0) return ["dash", (18 - p.dash) / 18];
  if (p.flashT > 0) return ["flash", (14 - p.flashT) / 7];
  if (p.atk > 0) return ["attack", (c.atkDur - p.atk) / (c.atkDur / 6)];
  if (!p.onGround) return ["jump", p.vy < -2.2 ? 0.45 : p.vy < 1 ? 0.6 : 0.75];
  if (p.land > 0) return ["jump", 0.95];
  if (Math.abs(p.vx) > 0.25) return ["run", p.anim / 4.6];
  if (p.idle > 150 && p.ch === "carlos") return ["impatient", p.idle / 9];
  if (p.idle > 240 && p.ch === "francisco") return ["selfie", (p.idle - 240) / 10];
  return ["idle", p.idle / 11];
}
function dust(p, n) {
  for (let i = 0; i < n; i++) G.parts.push({ x: p.x + rnd(-8, 8), y: p.y - 1, vx: rnd(-.8, .8) - p.face * .3, vy: rnd(-.9, -.2), life: rnd(10, 18), col: "#d8cfc4", size: 2 + (Math.random() * 2 | 0) });
}
let hitStop = 0;

const FR = { idle: 0, walk1: 1, walk2: 2, jump: 3, atk1: 4, atk2: 5, hurt: 6, pose: 7 };

function newPlayer(i, ch) {
  return { i, ch, x: 40 + i * 30, y: GROUND, vx: 0, vy: 0, face: 1, onGround: true, state: 0, lives: 3, score: 0,
    charges: 3, atk: 0, cd: 0, atkId: 0, dash: 0, inv: 90, hurtT: 0, dead: false, deadT: 0, idle: 0, anim: 0, gameover: false,
    items: { lente: 0, cartao: 0 } };
}
const hb = p => ({ x: p.x - CHAR[p.ch].w / 2, y: p.y - CHAR[p.ch].h, w: CHAR[p.ch].w, h: CHAR[p.ch].h });

function platformAt(p, prevY) {
  for (const pl of G.plats) {
    const w = pl.type === "banco" ? 48 : 44;
    if (p.x + 5 > pl.x && p.x - 5 < pl.x + w && p.vy >= 0 && prevY <= pl.y + 1 && p.y >= pl.y) return pl;
  }
  return null;
}

function hurtPlayer(p, srcX) {
  if (p.dead || p.inv > 0 || p.dash > 0 || G.endT) return;
  const c = CHAR[p.ch];
  sfx("dano");
  p.hurtT = 18; p.inv = 100;
  p.vx = (p.x < srcX ? -1 : 1) * 2.2; p.vy = -3.4; p.onGround = false; p.atk = 0;
  if (p.state < 2) {
    p.state++;
    if (p.state === 2) sfx("grito", .85);   // ficou em cuecas: grito de desenho animado
    // peça de roupa a voar
    G.parts.push({ x: p.x, y: p.y - 40, vx: rnd(-2, 2), vy: -4, life: 70, icon: 6, rot: 0, vr: rnd(-.3, .3) });
    const q = p.ch === "francisco" ? ["NA RAÇA!", "NA BOA FÉ!", "É PARA TOMAR ISSO EM CONSIDERAÇÃO!", "VALE O QUE VALE!", "UPS!", "AI!"] : ["AI!", "ATENÇÃO!", "A MINHA ROUPA!", "GORDO!", "SEMPRE A P*** DA MESMA MERDA!"];
    say(p, q[(Math.random() * q.length) | 0]);
    if (G.players.length === 2) {
      const o = G.players[1 - p.i];
      if (!o.dead && o.ch === "carlos" && p.ch === "francisco") setTimeout(() => say(o, Math.random() < 0.5 ? "GORDO!!" : "FRANCISCO!!"), 350);
      if (!o.dead && o.ch === "francisco" && p.ch === "carlos") setTimeout(() => say(o, "CARLOS!?"), 350);
    }
  } else {
    p.dead = true; p.deadT = 100; p.lives--;
    say(p, p.ch === "carlos" ? "ISTO NÃO ESTAVA NO ORÇAMENTO!" : "UPS... PERDI A FOTO!");
    G.parts.push({ x: p.x, y: p.y - 30, vx: 0, vy: -6, life: 60, icon: 7, rot: 0, vr: .2 });
    if (p.lives < 0) p.gameover = true;
  }
}

function say(p, t) { G.bubbles.push({ x: p.x, y: p.y - CHAR[p.ch].h - 6, t: 90, text: t, p }); }

function updatePlayer(p, inp) {
  const c = CHAR[p.ch];
  if (p.dead) {
    p.deadT--;
    if (p.deadT <= 0 && !p.gameover) {
      p.dead = false; p.state = 0; p.charges = 3; p.inv = 150; p.x = G.cam + 50 + p.i * 20; p.y = -40; p.vy = 0; p.vx = 0;
    }
    return;
  }
  if (p.inv > 0) p.inv--;
  if (p.hurtT > 0) p.hurtT--;
  if (p.cd > 0) p.cd--;
  if (p.land > 0) p.land--;
  if (p.flashT > 0) p.flashT--;
  const wasGround = p.onGround, vy0 = p.vy;
  const prevY = p.y;
  const locked = p.hurtT > 8 || G.endT === 2;
  // movimento
  if (p.dash > 0) {
    p.dash--; p.vx = p.face * 4.4;
    if (frame % 3 === 0) G.parts.push({ x: p.x - p.face * 8, y: p.y - rnd(8, 40), vx: -p.face * 1.5, vy: 0, life: 14, col: "#fff", size: 2 });
  } else if (!locked) {
    let dx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (p.atk > 0 && p.ch === "francisco") dx *= 0.3;
    const tgt = dx * c.speed, acc = p.onGround ? (dx ? 0.34 : 0.5) : 0.16;
    if (dx && p.vx * dx < -0.6 && p.onGround) dust(p, 3);
    p.vx += clamp(tgt - p.vx, -acc, acc);
    if (p.ch === "carlos" && p.atk > 11) p.vx = p.face * 1.4;       // pequeno avanço ao golpear
    if (dx) p.face = dx;
    if (inp.jump && p.onGround) { p.vy = c.jump; p.onGround = false; sfx("pulo", .4); }
    if (!inp.jumpHeld && p.vy < -2.5) p.vy = -2.5;        // salto variável
    if (inp.attack && p.cd <= 0 && p.atk <= 0) { p.atk = c.atkDur; p.atkId = ++G.atkSeq; sfx(p.ch === "carlos" ? "gimbal" : "monope", .5); }
    if (inp.special && p.charges > 0 && p.dash <= 0 && p.atk <= 0) {
      p.charges--; p.atkId = ++G.atkSeq;
      if (p.ch === "carlos") { p.dash = 18; p.inv = Math.max(p.inv, 20); sfx("travelling", .6); say(p, "TRAVELLING!"); }
      else {
        sfx("flash", .7); whiteFlash = 10; shake = 8; p.inv = Math.max(p.inv, 18); p.flashT = 14;
        for (const e of G.enemies) {
          if (e.x > G.cam - OX - 10 && e.x < G.cam + W + OX + 10) { e.stun = e.boss ? 90 : 180; damageEnemy(e, e.boss ? 2 : 1, p, p.atkId + 0.5); }
        }
        G.projs.length = 0;
      }
    }
    if (p.vx === 0 && p.onGround && p.atk <= 0) p.idle++; else p.idle = 0;
  }
  if (p.hurtT > 0 && p.hurtT <= 8) p.vx *= 0.9;
  if (G.endT === 2 && p.dash <= 0) p.vx *= 0.8;
  if (p.atk > 0) p.atk--;
  if (p.atk === 0 && p.cd <= 0 && false) p.cd = c.atkCd;
  if (p.atk === 1) p.cd = c.atkCd;
  // física
  p.vy += 0.34; if (p.vy > 8) p.vy = 8;
  p.x += p.vx; p.y += p.vy;
  p.x = clamp(p.x, G.cam - OX + 12, G.cam + W + OX - 12);
  p.onGround = false;
  if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
  else { const pl = platformAt(p, prevY); if (pl) { p.y = pl.y; p.vy = 0; p.onGround = true; } }
  if (p.onGround && !wasGround && vy0 > 2.5) { p.land = 5; dust(p, 5); sfx("blip", .12); }
  if (p.onGround && Math.abs(p.vx) > 1.3 && frame % 7 === 0) dust(p, 1);
  if (p.ch === "carlos" && p.idle === 170) say(p, "A COÇAR A MICOSE...");
  // selfie do Francisco
  if (p.ch === "francisco" && p.idle > 240 && p.idle % 60 === 0) { sfx("selfie", .5); whiteFlash = Math.max(whiteFlash, 2); say(p, ["SELFIE!", "NA RAÇA!", "NA BOA FÉ!", "É PARA TOMAR ISSO EM CONSIDERAÇÃO!", "VALE O QUE VALE!"][(p.idle / 60 | 0) % 5]); }
  p.anim += Math.abs(p.vx) / c.speed;
  // ataque -> acerto
  const box = attackBox(p);
  if (box) {
    for (const e of G.enemies) {
      if (e.hitId !== p.atkId && overlap(box, ebox(e))) {
        e.hitId = p.atkId;
        damageEnemy(e, p.dash > 0 ? 1 : c.dmg, p, p.atkId);
      }
    }
    for (let k = G.projs.length - 1; k >= 0; k--) {
      const pr = G.projs[k];
      if (overlap(box, { x: pr.x - 6, y: pr.y - 6, w: 12, h: 12 })) { G.projs.splice(k, 1); p.score += 50; sfx("acerto", .3); burst(pr.x, pr.y, "#cfe0ff", 6); }
    }
  }
}

function attackBox(p) {
  const c = CHAR[p.ch];
  if (p.dash > 0) return { x: p.x - 14, y: p.y - 50, w: 28, h: 46 };
  if (p.atk <= 0) return null;
  const prog = c.atkDur - p.atk;           // 0..atkDur
  const x0 = p.face > 0 ? p.x + 4 : p.x - 4 - c.reach;
  if (p.ch === "carlos") { if (prog < 6 || prog > 13) return null; return { x: x0, y: p.y - 54, w: c.reach, h: 36 }; }
  if (prog < 8 || prog > 16) return null;
  return { x: x0, y: p.y - 46, w: c.reach, h: 28 };   // alcança também os inimigos baixos (pastel, caranguejo)
}

/* ============================================================
   INIMIGOS
   ============================================================ */
const ESPEC = {
  chapeu: { w: 22, h: 26, hp: 1, score: 100 },
  bolo: { w: 28, h: 38, hp: 2, score: 200 },
  tufao: { w: 50, h: 78, hp: 30, score: 5000 },
  padre: { w: 18, h: 58, hp: 24, score: 3000 },
  gaivota: { w: 21, h: 18, hp: 1, score: 100 },
  francesinha: { w: 30, h: 34, hp: 2, score: 200 },
  estudante: { w: 26, h: 60, hp: 2, score: 200 },
  pastel: { w: 28, h: 30, hp: 2, score: 200 },
  caranguejo: { w: 30, h: 26, hp: 2, score: 200 },
  cavaleiro: { w: 30, h: 58, hp: 3, score: 300 },
  chef: { w: 20, h: 60, hp: 26, score: 3500 },
  tuna: { w: 22, h: 58, hp: 26, score: 3500 },
  dj: { w: 20, h: 58, hp: 28, score: 4000 },
  florista: { w: 22, h: 56, hp: 28, score: 4000 },
  planner: { w: 20, h: 60, hp: 34, score: 6000 },
};
const isFlying = t => t === "chapeu" || t === "gaivota";
// inimigos que andam no chão: salta = tem animação de salto; st = altura das estrelas quando atordoado
const WALKERS = { bolo: { jump: true, st: 44 }, francesinha: { jump: false, st: 38 }, estudante: { jump: true, st: 66, sc: 1.6 }, pastel: { jump: true, st: 36 },
  caranguejo: { jump: true, st: 32 }, cavaleiro: { jump: true, st: 64, sc: 1.4 } };
const isWalker = t => !!WALKERS[t];
const BOSSES = ["tufao", "padre", "chef", "tuna", "dj", "florista", "planner"];
function spawnEnemy(type, x, y) {
  const s = ESPEC[type];
  const e = { type, x, y: y !== undefined ? y : (isFlying(type) ? rnd(70, 150) : GROUND), vx: 0, vy: 0, hp: s.hp, w: s.w, h: s.h,
    t: Math.random() * 100, stun: 0, flash: 0, hitId: -1, boss: BOSSES.includes(type), dir: -1, base: y };
  if (e.boss) { e.maxhp = s.hp; e.mode = "enter"; e.mt = 0; e.shots = 0; }
  G.enemies.push(e); return e;
}
const ebox = e => ({ x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h });
function nearest(e) {
  let best = null, bd = 1e9;
  for (const p of G.players) if (!p.dead) { const d = Math.abs(p.x - e.x); if (d < bd) { bd = d; best = p; } }
  return best;
}
function burst(x, y, col, n = 8) {
  for (let i = 0; i < n; i++) G.parts.push({ x, y, vx: rnd(-2.2, 2.2), vy: rnd(-3, 1), life: rnd(16, 30), col, size: 2 + (Math.random() * 2 | 0) });
}
function damageEnemy(e, d, p, id) {
  if (e.dying) return;
  e.hp -= d; e.flash = 6;
  burst(e.x, e.y - e.h / 2, e.boss ? "#fff" : "#ffe27a", e.boss ? 10 : 6);
  e.kb = (e.x > p.x ? 1 : -1) * (e.boss ? 0.5 : 3.4);
  hitStop = Math.max(hitStop, e.boss ? 3 : 2); shake = Math.max(shake, e.boss ? 3 : 2);
  if (e.boss) { sfx("boss_hit", .5); shake = 4; }
  else sfx("acerto", .45);
  if (e.hp <= 0) killEnemy(e, p);
}
function killEnemy(e, p) {
  e.dying = true; p.score += ESPEC[e.type].score;
  hitStop = e.boss ? 14 : 4;
  if (e.type === "planner" && !G.supDone) {
    G.supDone = true; e.morph = 0; sfx("boss_morre", .9); music(null); whiteFlash = 14; shake = 30;
    G.enemies.forEach(o => { if (o !== e) o.gone = true; });
    G.projs.length = 0;
    return;
  }
  if (e.boss) {
    sfx("boss_morre", .9); music(null); whiteFlash = 14; shake = 30;
    G.endT = 1; G.endTimer = 0;
    for (let i = 0; i < 50; i++) G.parts.push({ x: e.x + rnd(-14, 14), y: e.y - rnd(0, 60), vx: rnd(-3, 3), vy: rnd(-4, 1), life: rnd(30, 70), col: ["#fff", "#ffe27a", "#cfe0ff", "#ff9bb0"][i % 4], size: 3 });
    G.enemies.forEach(o => { if (o !== e) o.gone = true; });
    G.projs.length = 0;
    return;
  }
  const r = Math.random();
  if (r < 0.2) G.items.push({ type: "bateria", x: e.x, y: e.y - 10, vy: -3, t: 0 });
  else if (r < 0.34 && G.players.some(q => q.state > 0)) G.items.push({ type: "camisa", x: e.x, y: e.y - 10, vy: -3, t: 0 });
  else if (r < 0.55) G.items.push({ type: "cartao", x: e.x, y: e.y - 10, vy: -3, t: 0 });
  else if (r < 0.62) G.items.push({ type: "tripe", x: e.x, y: e.y - 10, vy: -3, t: 0 });
  burst(e.x, e.y - e.h / 2, "#fff", 10);
  sfx(SFX["morre_" + e.type] ? "morre_" + e.type : "morre_gen", .55);
  e.dt = 0;
}

function spawnSuper(x) {
  const e = spawnEnemy("tufao", Math.min(x, G.cam + W - 60), GROUND);
  e.sup = true; e.hp = e.maxhp = 50; e.w = 64; e.h = 112; e.mode = "idle"; e.mt = 0; e.dirf = -1; e.flash = 0;
  music("final"); whiteFlash = 16; shake = 24; sfx("vento", .9);
  G.msgT = 150; G.bossMsg = true; G.bossName = "SUPER TUFÃO"; G.bossArt = "O";
}

function updateEnemy(e) {
  if (e.dying) {
    if (e.morph !== undefined) {
      e.morph++; shake = Math.max(shake, 2 + e.morph / 25);
      if (e.morph % 6 === 0) G.parts.push({ x: e.x + rnd(-30, 30), y: GROUND - rnd(0, 20), vx: rnd(-1, 1), vy: rnd(-4, -2), life: 40, col: ["#dfe6ff", "#9b8cff", "#fff"][e.morph % 3], size: 3 });
      if (e.morph === 30) sfx("vento", .9);
      if (e.morph === 95) { e.gone = true; spawnSuper(e.x); }
      return;
    }
    if (e.boss) { if (e.type === "tufao") { e.y += 0.2; e.flash = (frame >> 2) & 1 ? 6 : 0; } else e.flash = 0; if (G.endTimer > 100) e.gone = true; }
    else { e.dt = (e.dt || 0) + 1; if (isFlying(e.type)) e.y = Math.min(GROUND, e.y + e.dt * 0.25); if (e.dt > 22) e.gone = true; }
    return;
  }
  if (e.flash > 0) e.flash--;
  if (e.kb) { e.x += e.kb; e.kb *= 0.78; if (Math.abs(e.kb) < 0.2) e.kb = 0; }
  if (e.stun > 0) { e.stun--; if (!e.boss) { e.vy += 0.3; e.y = Math.min(GROUND, e.y + e.vy); return; } if (e.stun > 0) return; }
  e.t++;
  const p = nearest(e);
  if (isFlying(e.type)) {
    const dir = p ? Math.sign(p.x - e.x) : -1;
    e.vx += (dir * 0.9 - e.vx) * 0.04;
    e.x += e.vx - (e.fast ? 0.4 : 0.2);
    e.y = (e.base !== undefined && e.base ? e.base : 100) + Math.sin(e.t * 0.08) * 16;
    if (p && Math.abs(p.y - 30 - e.y) < 50 && e.t > 60 && Math.abs(p.x - e.x) < 70) e.base += Math.sign(p.y - 30 - e.y) * 0.8;
    if (e.base === undefined || !e.base) e.base = 100;
  } else if (isWalker(e.type)) {
    const dir = p ? Math.sign(p.x - e.x) : -1;
    e.dir = dir || -1;
    if (e.y >= GROUND) { e.y = GROUND; e.vy = 0; e.vx = dir * 0.55; if (e.t % 110 === 0) { e.vy = -4.6; e.vx = dir * 1.1; } }
    e.vy += 0.3; e.y = Math.min(GROUND, e.y + e.vy); e.x += e.vx;
  } else if (e.type === "tufao") bossAI(e, p);
  else if (e.type === "padre") padreAI(e, p);
  else if (e.type === "chef") chefAI(e, p);
  else if (BOSSCFG[e.type]) bossGenericAI(e, p);
  if (e.x < G.cam - OX - 80 && !e.boss) e.gone = true;
  if (e.x > G.cam + W + OX + 120 && !e.boss) e.gone = true;
  // contacto
  const eb = ebox(e);
  for (const q of G.players) if (!q.dead && overlap(hb(q), eb)) hurtPlayer(q, e.x);
}

function padreAI(e, p) {
  const left = G.cam + 30, right = G.cam + W - 30;
  e.mt++;
  if (p) e.dirf = Math.sign(p.x - e.x) || e.dirf || -1;
  const rage = e.hp < e.maxhp * 0.5;
  switch (e.mode) {
    case "enter":
      e.x -= 1.2; if (e.x <= right) { e.mode = "idle"; e.mt = 0; }
      break;
    case "idle":
      if (p) e.x += clamp(p.x - e.x, -0.55, 0.55);
      e.x = clamp(e.x, left, right);
      if (e.mt > (rage ? 55 : 85)) { e.mt = 0; e.mode = Math.random() < 0.55 ? "bell" : "incense"; }
      break;
    case "bell":
      if (e.mt === 26) {
        sfx("sino", .7); shake = 5;
        G.projs.push({ type: "onda", art: "onda_sino", x: e.x - 14, y: GROUND - 6, vx: -2.4 }, { type: "onda", art: "onda_sino", x: e.x + 14, y: GROUND - 6, vx: 2.4 });
      }
      if (rage && e.mt === 44) G.projs.push({ type: "onda", art: "onda_sino", x: e.x - 14, y: GROUND - 6, vx: -2.9 }, { type: "onda", art: "onda_sino", x: e.x + 14, y: GROUND - 6, vx: 2.9 });
      if (e.mt > 64) { e.mode = "idle"; e.mt = 0; }
      break;
    case "incense":
      if (e.mt === 18) G.projs.push({ type: "nuvem", art: "incenso", x: e.x + e.dirf * 12, y: e.y - 44, vx: e.dirf * 1.7, vy: -3.2, life: 0 });
      if (rage && e.mt === 34) G.projs.push({ type: "nuvem", art: "incenso", x: e.x + e.dirf * 12, y: e.y - 44, vx: e.dirf * 2.4, vy: -3.6, life: 0 });
      if (e.mt > 56) { e.mode = "idle"; e.mt = 0; }
      break;
  }
}

function chefAI(e, p) {
  const left = G.cam + 30, right = G.cam + W - 30;
  e.mt++;
  if (p) e.dirf = Math.sign(p.x - e.x) || e.dirf || -1;
  const rage = e.hp < e.maxhp * 0.5;
  switch (e.mode) {
    case "enter":
      e.x -= 1.2; if (e.x <= right) { e.mode = "idle"; e.mt = 0; }
      break;
    case "idle":
      if (p) e.x += clamp(p.x - e.x, -0.6, 0.6);
      e.x = clamp(e.x, left, right);
      if (e.mt > (rage ? 50 : 80)) { e.mt = 0; e.mode = Math.random() < 0.55 ? "pratos" : "molho"; }
      break;
    case "pratos": {
      const ys = [e.y - 18, e.y - 42, e.y - 30];
      [16, 32, 48].forEach((t, k) => {
        if (e.mt === t) { sfx("acerto", .4); G.projs.push({ type: "prato", art: "prato_fr", x: e.x + e.dirf * 14, y: ys[k], vx: e.dirf * (rage ? 3.0 : 2.4), rot: 0 }); }
      });
      if (e.mt > 66) { e.mode = "idle"; e.mt = 0; }
      break;
    }
    case "molho":
      if (e.mt === 18) { sfx("vento", .3); G.projs.push({ type: "molho", art: "molho", x: e.x + e.dirf * 12, y: e.y - 46, vx: e.dirf * 1.8, vy: -3.4, life: 0 }); }
      if (rage && e.mt === 34) G.projs.push({ type: "molho", art: "molho", x: e.x + e.dirf * 12, y: e.y - 46, vx: e.dirf * 2.5, vy: -3.8, life: 0 });
      if (e.mt > 56) { e.mode = "idle"; e.mt = 0; }
      break;
  }
}


// chefes dos mundos 3-6: dois ataques cada, usando os projéteis base com cor própria (tint)
const shootH = (e, y, vx, art) => G.projs.push({ type: "prato", art, x: e.x + e.dirf * 14, y, vx: e.dirf * vx, rot: 0 });
const waves = (e, v, art = "onda_som") => G.projs.push({ type: "onda", art, x: e.x - 14, y: GROUND - 6, vx: -v }, { type: "onda", art, x: e.x + 14, y: GROUND - 6, vx: v });
const arcCloud = (e, v, art) => G.projs.push({ type: "nuvem", art, x: e.x + e.dirf * 12, y: e.y - 44, vx: e.dirf * v, vy: -3.2, life: 0 });
const TINT = { nota: "nota", disco: "disco", petala: "petala", polen: "polen", prancheta: "prancheta" };   // nomes da arte em proj_pl.png
const BOSSCFG = {
  tuna: { sp: 0.6, cd: [80, 50], atk: {
    notas: { dur: 64, pk: 18, fire(e, r, mt) { [18, 30, 42].forEach((t, k) => { if (mt === t) { sfx("acerto", .4); shootH(e, [e.y - 20, e.y - 42, e.y - 30][k], r ? 3.0 : 2.4, TINT.nota); } }); } },
    ondas: { dur: 60, pk: 24, fire(e, r, mt) { if (mt === 24) { sfx("sino", .6); shake = 4; waves(e, 2.4); } if (r && mt === 42) waves(e, 2.9); } } } },
  dj: { sp: 0.5, cd: [85, 55], atk: {
    disco: { dur: 56, pk: 20, fire(e, r, mt) { if (mt === 20) { sfx("acerto", .4); shootH(e, e.y - 14, r ? 3.4 : 2.8, TINT.disco); } if (r && mt === 34) shootH(e, e.y - 34, 3.4, TINT.disco); } },
    graves: { dur: 64, pk: 26, fire(e, r, mt) { if (mt === 26) { sfx("sino", .6); shake = 5; waves(e, 3.0); } if (r && mt === 44) waves(e, 3.4); } } } },
  florista: { sp: 0.55, cd: [80, 50], atk: {
    espirro: { dur: 60, pk: 22, fire(e, r, mt) { if (mt === 22) { sfx("vento", .3); arcCloud(e, 1.7, TINT.polen); } if (r && mt === 38) arcCloud(e, 2.4, TINT.polen); } },
    petalas: { dur: 64, pk: 20, fire(e, r, mt) { [20, 32, 44].forEach((t, k) => { if (mt === t) shootH(e, [e.y - 18, e.y - 40, e.y - 28][k], r ? 3.0 : 2.4, TINT.petala); }); } } } },
  planner: { sp: 0.7, cd: [70, 45], atk: {
    prancheta: { dur: 56, pk: 22, fire(e, r, mt) { if (mt === 22) { sfx("acerto", .4); shootH(e, e.y - 30, r ? 3.6 : 3.0, TINT.prancheta); } if (r && mt === 34) shootH(e, e.y - 16, 3.6, TINT.prancheta); } },
    grito: { dur: 60, pk: 24, fire(e, r, mt) { if (mt === 24) { sfx("sino", .7); shake = 6; waves(e, 2.8); } if (r && mt === 42) waves(e, 3.2); } },
    equipa: { dur: 56, pk: 18, fire(e, r, mt) { if (mt === 18) { spawnEnemy("chapeu", e.x - 10, e.y - 60); if (r) spawnEnemy("chapeu", e.x + 10, e.y - 40); sfx("vento", .4); } } } } },
};
function bossGenericAI(e, p) {
  const c = BOSSCFG[e.type], left = G.cam + 30, right = G.cam + W - 30;
  e.mt++;
  if (p) e.dirf = Math.sign(p.x - e.x) || e.dirf || -1;
  const rage = e.hp < e.maxhp * 0.5;
  if (e.mode === "enter") { e.x -= 1.2; if (e.x <= right) { e.mode = "idle"; e.mt = 0; } return; }
  if (e.mode === "idle") {
    if (p) e.x += clamp(p.x - e.x, -c.sp, c.sp);
    e.x = clamp(e.x, left, right);
    if (e.mt > c.cd[rage ? 1 : 0]) { const ks = Object.keys(c.atk).filter(k => k !== "equipa" || e.hp < e.maxhp * 0.75); e.mt = 0; e.mode = ks[(Math.random() * ks.length) | 0]; }
    return;
  }
  const a = c.atk[e.mode];
  a.fire(e, rage, e.mt);
  if (e.mt > a.dur) { e.mode = "idle"; e.mt = 0; }
}

function bossAI(e, p) {
  const left = G.cam + 36, right = G.cam + W - 36;
  e.mt++;
  if (e.mode === "dash") e.dirf = e.dashDir; else if (p) e.dirf = Math.sign(p.x - e.x) || e.dirf || -1;
  switch (e.mode) {
    case "enter":
      e.x -= 1.3; if (e.x <= right) { e.mode = "idle"; e.mt = 0; }
      break;
    case "idle": {
      if (p) e.x += clamp(p.x - e.x, -0.8, 0.8);
      e.x = clamp(e.x, left, right);
      const ph = e.sup ? (e.hp > e.maxhp * 0.66 ? 1 : e.hp > e.maxhp * 0.33 ? 2 : 3) : 1;
      const speedUp = e.sup ? [0, 75, 58, 42][ph] : e.hp < e.maxhp * 0.5 ? 55 : 85;
      if (e.mt > speedUp) {
        const r = Math.random();
        e.mt = 0; e.shots = 0;
        if (e.sup) { const ks = [null, ["dashT", "wind", "wind", "summon"], ["dashT", "wind", "debris", "debris", "vortex", "summon"], ["dashT", "debris", "vortex", "wind", "debris"]][ph]; e.mode = ks[(r * ks.length) | 0]; }
        else e.mode = r < 0.4 ? "dashT" : r < 0.8 ? "wind" : "summon";
      }
      break;
    }
    case "dashT":
      if (e.mt === 1) { e.shake = true; sfx("vento", .5); }
      if (e.mt > 38) { e.mode = "dash"; e.mt = 0; e.dashDir = p ? Math.sign(p.x - e.x) || -1 : -1; }
      break;
    case "dash":
      e.x += e.dashDir * (e.sup ? 5.2 : 4.2); shake = Math.max(shake, 1);
      if (frame % 4 === 0) G.parts.push({ x: e.x - e.dashDir * 18, y: e.y - rnd(4, 56), vx: -e.dashDir * 2, vy: 0, life: 18, col: "#dfe6ff", size: 3 });
      if (e.x <= left - 6 || e.x >= right + 6) { e.x = clamp(e.x, left, right); e.mode = "idle"; e.mt = 0; }
      break;
    case "wind":
      if (e.mt % 22 === 10 && e.shots < (e.sup ? 5 : 3)) {
        e.shots++;
        const dir = p ? Math.sign(p.x - e.x) || -1 : -1;
        G.projs.push({ art: "vento", x: e.x + dir * 12, y: e.y - rnd(14, 46), vx: dir * 2.1, rot: 0 });
        sfx("vento", .35);
      }
      if (e.mt > (e.sup ? 120 : 80)) { e.mode = "idle"; e.mt = 0; }
      break;
    case "debris": {
      if (e.mt === 1) sfx("vento", .5);
      const ph3 = e.hp < e.maxhp * 0.33;
      if (e.mt > 8 && e.mt < 80 && e.mt % (ph3 ? 6 : 9) === 0) {
        const art = ["nota", "disco", "petala", "prancheta", "prato"][(Math.random() * 5) | 0];
        const tx = p && Math.random() < 0.5 ? p.x + rnd(-30, 30) : G.cam + rnd(24, W - 24);
        G.projs.push({ art, type: "queda", x: clamp(tx, G.cam + 12, G.cam + W - 12), y: -10, vx: 0, vy: 1, rot: 0 });
      }
      if (e.mt > 105) { e.mode = "idle"; e.mt = 0; }
      break;
    }
    case "vortex":
      if (e.mt === 1) sfx("vento", .7);
      if (e.mt > 20 && e.mt < 85) {
        shake = Math.max(shake, 1);
        for (const q of G.players) if (!q.dead && q.hurtT <= 0) q.x += Math.sign(e.x - q.x) * 0.8;
        if (frame % 3 === 0) G.parts.push({ x: e.x + (Math.random() < .5 ? -1 : 1) * rnd(70, 110), y: GROUND - rnd(4, 70), vx: 0, vy: 0, life: 14, col: "#dfe6ff", size: 2 });
      }
      if (e.mt > 100) { e.mode = "idle"; e.mt = 0; }
      break;
    case "summon":
      if (e.mt === 12) { spawnEnemy("chapeu", e.x - 10, e.y - 60); if (e.hp < e.maxhp * 0.6) spawnEnemy("chapeu", e.x + 10, e.y - 40); sfx("vento", .4); }
      if (e.mt > 60) { e.mode = "idle"; e.mt = 0; }
      break;
  }
}

/* ============================================================
   NÍVEL
   ============================================================ */
function newLevel(players, world = 0) {
  const g = {
    world, players, enemies: [], items: [], parts: [], projs: [], bubbles: [], plats: [], cam: 0, atkSeq: 0, spawnIdx: 0,
    spawns: [], bossSpawned: false, endT: 0, endTimer: 0, msgT: 200, wind: [], clear: false, time: 0,
  };
  // plataformas (bancos e mesas / caixotes e barris) e inimigos por mundo
  const wdef = WORLDS[world];
  (wdef.plats || [[330, 158, "banco"], [520, 140, "mesa"], [760, 156, "banco"], [900, 128, "mesa"], [1130, 158, "banco"], [1320, 138, "banco"],
    [1560, 156, "mesa"], [1700, 126, "banco"], [1950, 156, "banco"], [2150, 140, "mesa"], [2300, 158, "banco"]])
    .forEach(([x, y, type]) => g.plats.push({ x, y, type }));
  const fl = (wdef.foes || ["chapeu", "bolo"])[0], gr = (wdef.foes || ["chapeu", "bolo"])[1];
  let x = 260;
  const types = [fl, gr, fl, fl, gr, fl, gr, gr];
  let i = 0;
  while (x < WORLD - W - 150) {
    const t = types[i % types.length];
    g.spawns.push({ at: x, type: t, y: isFlying(t) ? 80 + (i * 37) % 70 : GROUND, side: i % 5 === 3 ? -1 : 1 });
    if (x > 900 && i % 3 === 0) g.spawns.push({ at: x + 30, type: fl, y: 110, side: 1 });
    x += 130 - Math.min(60, x / 40);
    i++;
  }
  // itens no cenário
  [[430, "bateria"], [680, "cartao"], [1010, "bateria"], [1240, "camisa"], [1450, "cartao"], [1880, "bateria"], [2060, "camisa"], [2240, "cartao"]]
    .forEach(([x, t]) => g.items.push({ type: t, x, y: GROUND - 14, vy: 0, t: 0, still: true }));
  // detritos do vento
  for (let k = 0; k < 46; k++) g.wind.push({ x: Math.random() * W, y: Math.random() * H, s: rnd(0.4, 1.6), c: ["#ff9bb0", "#fff", "#ffe27a", "#9be59b"][k % 4], ph: Math.random() * 6 });
  return g;
}

function updateLevel() {
  const L = G;
  L.time++;
  if (L.msgT > 0) L.msgT--;
  const alive = L.players.filter(p => !p.dead);
  // câmara
  if (!L.bossSpawned) {
    const ref = alive.length ? Math.max(...alive.map(p => p.x)) : L.cam + W / 2;
    const target = clamp(ref - 170, L.cam, WORLD - W);
    L.cam += clamp(target - L.cam, 0, 3);
    if (L.cam >= WORLD - W - 1) {
      L.cam = WORLD - W; L.bossSpawned = true;
      L.enemies.forEach(e => { if (!e.boss) e.gone = true; });
      spawnEnemy(WORLDS[L.world].boss, L.cam + W + OX + 70, GROUND);
      music("boss"); L.msgT = 140; L.bossMsg = true; L.bossName = WORLDS[L.world].bossName; L.bossArt = WORLDS[L.world].art; sfx("vento", .7); shake = 12;
    }
  }
  // spawns
  while (L.spawnIdx < L.spawns.length && L.cam + W >= L.spawns[L.spawnIdx].at && !L.bossSpawned) {
    const s = L.spawns[L.spawnIdx++];
    const e = spawnEnemy(s.type, s.side > 0 ? L.cam + W + OX + 20 : L.cam - OX - 20, s.y);
    if (isFlying(s.type)) e.base = s.y;
    if (s.side < 0) e.vx = 1;
  }
  // jogadores
  L.players.forEach((p, i) => updatePlayer(p, getInput(p.i)));
  // inimigos
  L.enemies.forEach(updateEnemy);
  L.enemies = L.enemies.filter(e => !e.gone);
  // projéteis do chefe
  for (let k = L.projs.length - 1; k >= 0; k--) {
    const pr = L.projs[k]; pr.x += pr.vx; pr.rot = (pr.rot || 0) + 0.3;
    if (pr.type === "nuvem" || pr.type === "molho") {
      pr.vy += 0.12; pr.y += pr.vy;
      if (pr.y >= GROUND - 8) { pr.y = GROUND - 8; pr.vy = 0; pr.vx = 0; pr.life++; if (pr.life > 120) { L.projs.splice(k, 1); continue; } }
    }
    if (pr.type === "queda") {
      pr.vy += 0.07; pr.y += pr.vy;
      if (pr.y >= GROUND - 4) { burst(pr.x, GROUND - 4, "#fff", 4); L.projs.splice(k, 1); continue; }
    }
    if (pr.x < L.cam - OX - 20 || pr.x > L.cam + W + OX + 20) { L.projs.splice(k, 1); continue; }
    const pb = pr.type === "onda" ? { x: pr.x - 10, y: pr.y - 5, w: 20, h: 10 } : (pr.type === "nuvem" || pr.type === "molho") ? { x: pr.x - 8, y: pr.y - 8, w: 16, h: 16 } : { x: pr.x - 6, y: pr.y - 6, w: 12, h: 12 };
    for (const q of L.players) if (!q.dead && overlap(hb(q), pb)) { hurtPlayer(q, pr.x); if (pr.type !== "nuvem" && pr.type !== "molho") L.projs.splice(k, 1); break; }
  }
  // itens
  for (let k = L.items.length - 1; k >= 0; k--) {
    const it = L.items[k]; it.t++;
    if (!it.still) { it.vy += 0.25; it.y += it.vy; if (it.y > GROUND - 8) { it.y = GROUND - 8; it.vy = 0; it.still = true; } }
    if (it.life && --it.life <= 0) { L.items.splice(k, 1); continue; }
    for (const q of L.players) {
      if (q.dead) continue;
      if (Math.abs(q.x - it.x) < 14 && q.y - it.y < 50 && q.y - it.y > -6) {
        collect(q, it); L.items.splice(k, 1); break;
      }
    }
  }
  // partículas
  for (let k = L.parts.length - 1; k >= 0; k--) {
    const a = L.parts[k]; a.x += a.vx; a.y += a.vy; if (a.icon !== undefined) { a.vy += 0.2; a.rot += a.vr; } a.life--;
    if (a.life <= 0) L.parts.splice(k, 1);
  }
  for (let k = L.bubbles.length - 1; k >= 0; k--) { const b = L.bubbles[k]; b.t--; b.x = b.p.x; b.y = b.p.y - CHAR[b.p.ch].h - 8; if (b.t <= 0) L.bubbles.splice(k, 1); }
  // fim do chefe
  if (L.endT) {
    L.endTimer++;
    if (L.endTimer === 110) L.items.push({ type: WORLDS[L.world].pieceType || "lente", x: L.cam + W - 90, y: 60, vy: 0, t: 0, big: true });
  }
  if (L.clear && ++L.clearT === 150) startSelfie();
  // game over?
  if (L.players.every(p => p.gameover) && !L.over) { L.over = true; music(null); sfx("gameover", .8); setPhase("gameover"); }
}

function collect(q, it) {
  const c = ({ bateria: 1, cartao: 500, camisa: 0, tripe: 300, lente: 1000, camara: 800 })[it.type];
  if (it.type === "bateria" && !it.big) { q.charges = Math.min(5, q.charges + 1); sfx("bateria", .6); }
  else if (it.type === "camisa") {
    if (q.state > 0) {
      const antes = q.state; q.state--; sfx("roupa", .6);
      const pool = ["MAIS DECENTE, AGORA!", "ESTAVA COM FRIO!", "JÁ ME SINTO MELHOR!"];
      if (q.ch === "carlos") { pool.push("AGORA SIM!"); if (antes === 2) pool.push("JÁ NÃO ESTOU EM CUECAS!", "JÁ NÃO ESTOU EM CUECAS!"); }
      else pool.push("ISTO AJUDA!", "NA RAÇA, JÁ VOU ARRANJADO!");
      say(q, pool[(Math.random() * pool.length) | 0]);
    } else { q.score += 200; sfx("item", .6); }
  } else if (it.big) {
    q.score += 1000; q.items.lente++; sfx("vitoria", .9); G.clear = true; G.clearT = 0; G.endT = 2; G.pieceMsg = 170;
    say(q, "RECUPERADO!");
  } else { q.score += c; sfx("item", .6); }
  if (it.type === "cartao" && !it.big) {
    q.items.cartao++;
    if (q.items.cartao % 5 === 0) { q.lives = Math.min(9, q.lives + 1); sfx("vitoria", .8); say(q, "VIDA EXTRA!"); whiteFlash = Math.max(whiteFlash, 3); }
  }
  burst(it.x, it.y, "#fff3a0", 6);
}

/* ---------------- desenho do nível ---------------- */
function drawBackground() {
  const wd_ = WORLDS[G.world];
  if (wd_.bg) {
    // fundo PixelLab: scroll lento, espelhado para repetir sem emenda; chão a velocidade total
    const bg = IMG[wd_.bg], L = bg.width / 2;
    let bx = -((G.cam * 0.12) % L);
    while (bx > -OX) bx -= L;
    for (let x = bx; x < W + OX; x += L) { di(bg, hp(x), 0); ceuExtra(bg, 0, L, hp(x), L); }
    drawGround(wd_, G.cam);
    return;
  }
  di(IMG[wd_.sky || "ceu"], 0, 0);
  const cx = G.cam;
  let hx = -((cx * 0.2) % 512);
  while (hx > -OX) hx -= 512;
  for (let x = hx; x < W + OX; x += 512) di(IMG.colinas, x, GROUND - 100 - 40);
  if (wd_.casario !== false) drawCasario(cx * 0.35);
  const px = -(cx * 0.5);
  const pl_ = IMG[wd_.plano || "plano"];
  di(pl_, Math.round(px), GROUND - 150 + 2);
  if (px + 1400 < W + OX) di(pl_, Math.round(px + 1400), GROUND - 148);
  // chão
  for (let x = -((cx) % 16) - 16 * Math.ceil(OX / 16); x < W + OX; x += 16) {
    di(IMG[wd_.tiles || "tiles"], 0, 0, 16, 16, Math.round(x), GROUND, 16, 16);
    for (let y = GROUND + 16; y < H; y += 16) di(IMG[wd_.tiles || "tiles"], y === GROUND + 16 ? 16 : 32, 0, 16, 16, Math.round(x), y, 16, 16);
  }
}
// chão PixelLab: tileset 4x4 de 32 px (16 lógicos); topo plano em (linha 0, col 3) com a superfície a meio, enchimento em (1, 2).
// Lisboa usa uma tira de calçada (33 lógicos de altura).
function drawGround(wd_, cam) {
  const g = IMG[wd_.ground];
  if (wd_.strip) {
    const L = g.width / 2;
    let x0 = -(cam % L);
    while (x0 > -OX) x0 -= L;
    for (let x = x0; x < W + OX; x += L) di(g, hp(x), GROUND);
    return;
  }
  for (let x = -(cam % 16) - 16 * Math.ceil(OX / 16); x < W + OX; x += 16) {
    const xr = hp(x);
    di(g, 48, 0, 16, 16, xr, GROUND - 8, 16, 16);
    for (let y = GROUND + 8; y < H; y += 16) di(g, 32, 16, 16, 16, xr, y, 16, 16);
  }
}
// plataforma PixelLab: laje de 16 lógicos (metade de baixo do topo plano + fiada de enchimento)
function drawPlatformPL(wd_, pl) {
  const g = IMG[wd_.ground], w = pl.type === "banco" ? 48 : 44;
  if (wd_.strip) { ctx.fillStyle = "#141a30"; ctx.fillRect(pl.x, pl.y, w, 2); ctx.fillStyle = "#f2e7cf"; ctx.fillRect(pl.x, pl.y + 2, w, 8); ctx.fillStyle = "#1a2142"; ctx.fillRect(pl.x, pl.y + 10, w, 2); return; }
  for (let x = 0; x < w; x += 16) {
    const cw = Math.min(16, w - x);
    di(g, 48, 8, cw, 8, pl.x + x, pl.y, cw, 8);
    di(g, 32, 0, cw, 8, pl.x + x, pl.y + 8, cw, 8);
  }
  ctx.fillStyle = "rgba(10,6,20,.55)"; ctx.fillRect(pl.x, pl.y + 16, w, 1);
}

function drawPlayers() {
  const order = [...G.players].sort((a, b) => a.y - b.y);
  for (const p of order) {
    if (p.dead) continue;
    if (p.inv > 0 && p.hurtT <= 0 && (frame >> 2) & 1 && p.dash <= 0) continue;
    const img = IMG[p.ch];
    const fl = floorBelow(p.x, p.y), hgt = Math.max(0, fl - p.y);
    shadow(p.x, fl, Math.max(6, CHAR[p.ch].w * 0.9 - hgt * 0.04), 0.5 * clamp(1 - hgt / 90, 0.35, 1));
    if (LAT[p.ch]) {
      const [an, tt] = playerAnim(p);
      actor(p.ch, p.state, an, tt, p.x, p.y, p.face < 0);
      continue;
    }
    let f = FR.idle;
    if (p.hurtT > 0) f = FR.hurt;
    else if (p.dash > 0) f = FR.atk2;
    else if (p.atk > 0) f = (CHAR[p.ch].atkDur - p.atk) < CHAR[p.ch].atkDur / 2 ? FR.atk1 : FR.atk2;
    else if (!p.onGround) f = FR.jump;
    else if (Math.abs(p.vx) > 0.1) f = ((p.anim >> 3) & 1) ? FR.walk1 : FR.walk2;
    else if (p.ch === "francisco" && p.idle > 240) f = FR.pose;
    const flip = p.face < 0;
    const bob = (f === FR.walk1 || f === FR.walk2) && ((p.anim >> 2) & 1) ? 1 : 0;
    spr(img, f * 40, p.state * 64, 40, 64, p.x - 20, p.y - 63 - bob, flip);
    // armas
    const hx = p.x + p.face * 15, hy = p.y - (p.ch === "carlos" ? 28 : 34);
    if (p.dash > 0) { /* sem arma */ }
    else if (p.atk > 0) {
      const prog = (CHAR[p.ch].atkDur - p.atk) / CHAR[p.ch].atkDur;
      if (p.ch === "carlos") {
        const a = (-1.2 + prog * 2.8) * p.face;
        spr(IMG.armas, 0, 0, 16, 16, hx + p.face * 6 - 8, hy - 8, p.face < 0, 1, a, 1.3);
      } else {
        const ext = Math.sin(Math.min(1, prog * 1.15) * Math.PI) * 26;
        const wx = p.face > 0 ? p.x + 12 + ext - 36 : p.x - 12 - ext - 2;
        ctx.save(); ctx.translate(Math.round(wx + 19), Math.round(p.y - 33 + 8)); ctx.scale(p.face, 1);
        di(IMG.armas, 16, 0, 38, 16, -19, -8, 38, 16); ctx.restore();
      }
    }
  }
}

const EN = {"padre": {"cell": 160, "a": {"idle": [0, 4], "walk": [5, 12], "attack": [13, 21], "hurt": [22, 28], "defeat": [29, 37]}}, "chef": {"cell": 160, "a": {"idle": [0, 4], "walk": [5, 12], "attack": [13, 21], "hurt": [22, 28], "defeat": [29, 37]}}, "bolo": {"cell": 128, "a": {"walk": [0, 7], "jump": [8, 14], "death": [15, 21]}}, "francesinha": {"cell": 128, "a": {"walk": [0, 7], "death": [8, 14]}}, "gaivota": {"cell": 128, "a": {"fly": [0, 8], "death": [9, 15]}}, "chapeu": {"cell": 96, "a": {"fly": [0, 8], "death": [9, 15]}}, "tufao": {"cell": 256, "a": {"idle": [0, 8], "attack": [9, 17], "hurt": [18, 24]}}, "supertufao": {"cell": 256, "a": {"idle": [0, 8], "attack": [9, 17], "hurt": [18, 24]}}, "estudante": {"cell": 128, "a": {"walk": [0, 7], "jump": [8, 14], "death": [15, 21]}}, "pastel": {"cell": 128, "a": {"walk": [0, 7], "jump": [8, 14], "death": [15, 21]}}, "caranguejo": {"cell": 128, "a": {"walk": [0, 7], "jump": [8, 14], "death": [15, 21]}}, "cavaleiro": {"cell": 128, "a": {"walk": [0, 7], "jump": [8, 14], "death": [15, 21]}}, "tuna": {"cell": 160, "a": {"idle": [0, 4], "walk": [5, 12], "attack": [13, 21], "hurt": [22, 28], "defeat": [29, 37]}}, "dj": {"cell": 160, "a": {"idle": [0, 4], "walk": [5, 12], "attack": [13, 21], "hurt": [22, 28], "defeat": [29, 37], "botao": [38, 46]}}, "florista": {"cell": 160, "a": {"idle": [0, 4], "walk": [5, 12], "attack": [13, 21], "hurt": [22, 28], "defeat": [29, 37]}}, "planner": {"cell": 160, "a": {"idle": [0, 4], "walk": [5, 12], "attack": [13, 21], "hurt": [22, 28], "defeat": [29, 37]}}, "noiva": {"cell": 160, "a": {"idle": [0, 4], "blown": [5, 11]}}, "noivo": {"cell": 160, "a": {"idle": [0, 4], "blown": [5, 11]}}, "conv_chapeu": {"cell": 160, "a": {"idle": [0, 4], "blown": [5, 11]}}, "conv_fato": {"cell": 160, "a": {"idle": [0, 4], "blown": [5, 11]}}, "conv_verde": {"cell": 160, "a": {"idle": [0, 4], "blown": [5, 11]}}};
EN.conv_fato2 = EN.conv_fato; EN.conv_chapeu2 = EN.conv_chapeu;   // variantes de cor (variar_convidados.py)
// folhas PixelLab dos inimigos (gerar com integrar_inimigos.py): uma linha, todas a olhar para a esquerda, pés na linha cell-8
const EN_LOOP = { idle: 1, walk: 1, fly: 1 };
function enemySpr(e, anim, t, flip, sc = 1, alpha = 1, rot = 0) {
  const D = EN[e.type], L = D.cell / 2, [a, b] = D.a[anim], n = b - a + 1;
  let idx = a + (EN_LOOP[anim] ? ((Math.floor(t) % n) + n) % n : clamp(Math.floor(t), 0, n - 1));
  if (anim === "idle" && D.cell === 160 && n > 2) { const m = n - 1, k = (((Math.floor(t) % (2 * m)) + 2 * m) % (2 * m)); idx = a + (k <= m ? k : 2 * m - k); }   // vai-e-vem: o último frame não salta para o primeiro
  const F = (D.cell - 7) / 2;
  spr(IMG[e.type + "_pl"], idx * L, 0, L, L, e.x - L * sc / 2, e.y - F * sc, flip, alpha, rot, sc);
}
// t do ataque com o pico (frame 6 de 9) no instante do projétil
const peakT = (mt, pk, total) => mt <= pk ? mt * 6 / pk : 6 + (mt - pk) * 3 / (total - pk);

function drawPlannerTop(e) {
  const sway = Math.sin(frame * .08) * 3;
  enemySpr({ type: "planner", x: e.x + sway, y: e.y - 108 }, "attack", 3 + ((frame >> 3) % 4), false, .55);
}
function drawMorph(e) {
  const m = e.morph, k = clamp((m - 20) / 70, 0, 1);
  enemySpr({ type: "planner", x: e.x + Math.sin(m * 1.7) * 2, y: e.y - Math.min(m, 70) * 0.5 }, "attack", 3 + ((m >> 3) % 4), false, 1, 1 - k);
  if (k > 0) { enemySpr({ type: "supertufao", x: e.x, y: e.y }, "idle", m / 6, false, 1.5 * k, k); }
  if (m > 5 && m < 85) { text("O PERFEITO É O", e.x, 40, "#ff9bb0", 1, "center"); text("ÚNICO QUE EXISTE!", e.x, 52, "#ff9bb0", 1, "center"); }
}
function drawEnemies() {
  for (const e of G.enemies) {
    const flashing = e.flash > 0;
    if (!e.dying) { const eh = Math.max(0, GROUND - e.y); shadow(e.x, GROUND, e.boss ? 17 : isWalker(e.type) ? 9 : 7, 0.32 * clamp(1 - eh / 140, 0.25, 1)); }
    const stars = (dy, n = 1) => { if (e.stun > 0) { ctx.fillStyle = "#ffe27a"; for (let k = 0; k < (n > 1 ? 3 : 1); k++) ctx.fillRect(Math.round(e.x - (n > 1 ? 12 : 4) + k * 10 + Math.sin(frame * .3 + k) * (n > 1 ? 3 : 6)), Math.round(e.y - dy), 3, 3); } };
    if (e.morph !== undefined) { drawMorph(e); continue; }
    if (e.dying && !e.boss) {
      const dt = e.dt || 0;
      if (e.type === "chapeu" || e.type === "gaivota") enemySpr(e, "death", dt / 3.2, e.vx > 0.2, e.type === "gaivota" ? 0.7 : 1, clamp(1 - (dt - 14) / 8, 0, 1));
      else enemySpr(e, "death", dt / 3.2, e.dir > 0, (WALKERS[e.type] && WALKERS[e.type].sc) || 1, clamp(1 - (dt - 16) / 6, 0, 1));
      continue;
    }
    if (e.type === "chapeu" || e.type === "gaivota") {
      enemySpr(e, "fly", frame / 4, e.vx > 0.2, e.type === "gaivota" ? 0.7 : 1);
      stars(e.type === "gaivota" ? 26 : 30);
    } else if (isWalker(e.type)) {
      const air = e.y < GROUND - 1, W_ = WALKERS[e.type];
      if (air && W_.jump) enemySpr(e, "jump", e.vy < -1.5 ? 3 : e.vy < 1 ? 4 : 5, e.dir > 0, W_.sc || 1);
      else enemySpr(e, "walk", air ? 0 : e.t / 6, e.dir > 0, W_.sc || 1);
      stars(W_.st);
    } else if (e.type === "chef" || e.type === "padre" || BOSSCFG[e.type]) {
      const left = (e.dirf || -1) > 0;
      let an, t;
      if (e.dying) { an = "defeat"; t = G.endTimer * 9 / 60; }
      else if (e.flash > 0) { an = "hurt"; t = 2 + (6 - e.flash) / 2; }
      else if (e.mode === "enter") { an = "walk"; t = frame / 5; }
      else if (e.mode === "idle") { an = "idle"; t = frame / 10; }
      else if (BOSSCFG[e.type]) { const ca = BOSSCFG[e.type].atk[e.mode]; an = "attack"; t = peakT(e.mt, ca.pk, ca.dur); }
      else if (e.type === "padre") { an = "attack"; t = peakT(e.mt, e.mode === "bell" ? 26 : 18, e.mode === "bell" ? 64 : 56); }
      else { an = "attack"; t = e.mode === "pratos" ? e.mt * 9 / 66 : peakT(e.mt, 18, 56); }
      enemySpr(e, an, t, left);
      stars(e.type === "padre" ? 70 : 78, 3);
    } else if (e.type === "tufao") {
      if (e.dying && (frame >> 1) & 1 && e.endFlash) continue;
      const left = (e.dirf || -1) > 0;
      let an, t;
      if (e.dying || e.flash > 0) { an = "hurt"; t = e.dying ? 4 + ((frame >> 3) & 1) : 2 + (6 - e.flash) / 2; }
      else if (e.mode === "dashT") { an = "attack"; t = e.mt * 4 / 38; }
      else if (e.mode === "dash") { an = "attack"; t = 6 + ((frame >> 2) % 3); }
      else if (e.mode === "wind") { an = "attack"; t = (e.mt % 22) * 9 / 22; }
      else if (e.mode === "summon") { an = "attack"; t = e.mt * 9 / 60; }
      else if (e.mode === "debris" || e.mode === "vortex") { an = "attack"; t = (e.mt % 30) * 9 / 30; }
      else { an = "idle"; t = frame / 6; }
      const ox = e.mode === "dashT" ? Math.sin(frame * 2) * 2 : 0;
      e.x += ox;
      if (e.sup) enemySpr({ type: "supertufao", x: e.x, y: e.y }, an, t, false, 1.5);
      else enemySpr(e, an, t, left);
      e.x -= ox;
      stars(e.sup ? 130 : 94, 3);
    }
  }
}

function drawItems() {
  const idx = { lente: 0, bateria: 1, cartao: 2, flash: 3, tripe: 4, camara: 5, camisa: 6, estrela: 7, ssd: 8 };
  for (const it of G.items) {
    const bob = Math.sin(it.t * 0.1) * 2;
    if (it.life && it.life < 90 && (frame >> 2) & 1) continue;
    const sc = it.big ? 2 : 1;
    if (!it.big) shadow(it.x, GROUND - 1, 5, .22);
    spr(IMG.itens, idx[it.type] * 16, 0, 16, 16, it.x - 8 * sc, it.y - 14 * sc + bob, false, 1, 0, sc);
  }
}

// projéteis com arte PixelLab (proj_pl.png, células de 16 lógicos)
const PRJ = { nota: 0, disco: 1, petala: 2, polen: 3, prancheta: 4, prato: 5, molho: 6, incenso: 7, onda_sino: 8, onda_som: 9, vento: 10, prato_fr: 11 };
function drawProj(pr) {
  const art = pr.art, sx = PRJ[art] * 16;
  let sc = 1.2, flip = false, rot = 0, alpha = 1, dy = 0;
  if (art === "onda_sino" || art === "onda_som") { sc = 1.3; flip = pr.vx < 0; }
  else if (art === "disco" || art === "prato" || art === "prancheta") rot = pr.rot;
  else if (art === "prato_fr") { sc = 1.1; flip = pr.vx > 0; dy = Math.sin(frame * .25 + pr.x * .1) * 1.5; }
  else if (art === "petala") rot = pr.rot * 0.5;
  else if (art === "nota") dy = Math.sin(frame * .3 + pr.x * .1) * 2;
  else if (art === "vento") rot = -pr.rot * 0.7;
  else if (pr.type === "nuvem" || pr.type === "molho") { dy = Math.sin(frame * .2) * 1.2; alpha = pr.life > 90 && (frame >> 2) & 1 ? .4 : 1; if (art === "incenso" && pr.vy !== 0) rot = pr.rot * 0.6; }
  spr(IMG.proj_pl, sx, 0, 16, 16, pr.x - G.cam - 8, pr.y - 8 + dy, flip, alpha, rot, sc);
}

function drawParts() {
  const idx = [0, 1, 2, 3, 4, 5, 6, 7];
  for (const a of G.parts) {
    if (a.icon !== undefined) spr(IMG.itens, a.icon * 16, 0, 16, 16, a.x - G.cam - 8, a.y - 8, false, Math.min(1, a.life / 20), a.rot);
    else { ctx.fillStyle = a.col; ctx.fillRect(Math.round(a.x - G.cam), Math.round(a.y), a.size, a.size); }
  }
  for (const pr of G.projs) {
    if (pr.art) { drawProj(pr); continue; }
    if (pr.type === "onda") spr(IMG.projeteis, 0, 0, 24, 16, pr.x - G.cam - 12, pr.y - 8, pr.vx < 0);
    else if (pr.type === "prato") spr(IMG.projeteis2, 0, 0, 16, 16, pr.x - G.cam - 8, pr.y - 8, false, 1, pr.rot);
    else if (pr.type === "molho") spr(IMG.projeteis2, 16, 0, 16, 16, pr.x - G.cam - 8, pr.y - 12 + Math.sin(frame * .2) * 1.0, false, pr.life > 90 && (frame >> 2) & 1 ? .4 : 1);
    else if (pr.type === "nuvem") spr(IMG.projeteis, 24, 0, 16, 16, pr.x - G.cam - 8, pr.y - 8 + Math.sin(frame * .2) * 1.2, false, pr.life > 90 && (frame >> 2) & 1 ? .4 : 1);
    else spr(IMG.armas, 80, 0, 16, 16, pr.x - G.cam - 8, pr.y - 8, false, 1, pr.rot);
  }
}

function drawWind() {
  for (const w of G.wind) {
    w.x -= 1.6 * w.s + 0.5; w.y += Math.sin(frame * 0.05 + w.ph) * 0.4 * w.s;
    if (w.x < -4 - OX) { w.x = W + 4 + OX; w.y = Math.random() * GROUND; }
    ctx.fillStyle = w.c; ctx.fillRect(Math.round(w.x), Math.round(w.y), 2, 2);
    if (w.s > 1.2) ctx.fillRect(Math.round(w.x + 2), Math.round(w.y), 3, 1);
  }
}

/* ---------------- balões de banda desenhada ---------------- */
function balaoMede(txt) {
  const ls = []; let cur = "";
  for (const w of String(txt).split(" ")) {
    if (cur && (cur + " " + w).length > 22) { ls.push(cur); cur = w; } else cur = cur ? cur + " " + w : w;
  }
  if (cur) ls.push(cur);
  return { ls, w: Math.max(...ls.map(l => l.length)) * 7 + 8, h: ls.length * 12 + 4 };
}
const balaoKind = t => /!\s*$/.test(t) ? "grito" : /\.\.\.\s*$/.test(t) ? "pensa" : "fala";
function balaoCaixa(x, y, w, h, fill, line, square) {
  const c = square ? 0 : 1;
  ctx.fillStyle = line; ctx.fillRect(x - 1, y - 1 + c, w + 2, h + 2 - 2 * c); ctx.fillRect(x - 1 + c, y - 1, w + 2 - 2 * c, h + 2);
  ctx.fillStyle = fill; ctx.fillRect(x, y + c, w, h - 2 * c); ctx.fillRect(x + c, y, w - 2 * c, h);
}
// (x,y) = canto superior esquerdo; tx = x do bico (aponta para baixo)
function balao(txt, x, y, tx, o = {}) {
  const m = balaoMede(txt), w = m.w, h = m.h, kind = o.kind || balaoKind(String(txt)), line = o.line || "#12081c";
  const fill = kind === "grito" ? "#fff2a8" : kind === "narra" ? "#ffe9a0" : "#fff";
  const tcol = kind === "grito" ? "#8a1228" : "#12081c";
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  if (o.pop !== undefined && o.pop < 1) { ctx.translate(tx, y + h + 6); ctx.scale(o.pop, o.pop); ctx.translate(-tx, -(y + h + 6)); }
  if (kind === "grito") {
    for (let sx = x + 7; sx < x + w - 6; sx += 11) {
      const lo = Math.abs(sx - tx) > 10;
      for (let k = 0; k < 4; k++) { ctx.fillStyle = line; ctx.fillRect(sx - 4 + k, y - 2 - k, 9 - 2 * k, 1); if (lo) ctx.fillRect(sx - 4 + k, y + h + 1 + k, 9 - 2 * k, 1); }
      for (let k = 0; k < 3; k++) { ctx.fillStyle = fill; ctx.fillRect(sx - 3 + k, y - 1 - k, 7 - 2 * k, 1); if (lo) ctx.fillRect(sx - 3 + k, y + h + k, 7 - 2 * k, 1); }
    }
  }
  balaoCaixa(x, y, w, h, fill, kind === "narra" ? "#5a3a10" : line, kind === "narra");
  if (kind === "pensa") {
    const bx = clamp(tx, x + 8, x + w - 8);
    [[4, 2], [3, 6], [2, 9]].forEach(([s, d], i) => { const px = Math.round(bx + (tx - bx) * (i + 1) / 3); ctx.fillStyle = line; ctx.fillRect(px - 1, y + h + d - 1, s + 2, s + 2); ctx.fillStyle = fill; ctx.fillRect(px, y + h + d, s, s); });
  } else if (kind !== "narra") {
    const bx = clamp(Math.round(tx), x + 7, x + w - 8);
    for (let k = 0; k < 8; k++) {
      const cx = Math.round(bx + (tx - bx) * k / 7), hw = 4 - (k >> 1);
      ctx.fillStyle = line; ctx.fillRect(cx - hw - 1, y + h + k, 2 * hw + 2, 1);
    }
    for (let k = 0; k < 8; k++) {
      const cx = Math.round(bx + (tx - bx) * k / 7), hw = 4 - (k >> 1);
      ctx.fillStyle = fill; ctx.fillRect(cx - hw, y + h + k - (k === 0 ? 1 : 0), 2 * hw, 1);
    }
  }
  let left = o.reveal === undefined ? 1e9 : o.reveal;
  m.ls.forEach((l, i) => { const part = l.slice(0, Math.max(0, left)); left -= l.length + 1; if (part) text(part, x + Math.round((w - l.length * 7) / 2), y + 2 + i * 12, tcol, 1, "left", false); });
  ctx.restore();
}
function drawBubbles() {
  const placed = [];
  for (const b of G.bubbles) {
    const m = balaoMede(b.text);
    let x = Math.round(b.x - G.cam - m.w / 2), y = Math.round(b.y) - m.h;
    x = clamp(x, 4, W - 4 - m.w);
    for (let tries = 0; tries < 4; tries++) {
      if (placed.some(r => x < r.x + r.w && x + m.w > r.x && y < r.y + r.h + 4 && y + m.h + 4 > r.y)) y -= m.h + 6; else break;
    }
    placed.push({ x, y, w: m.w, h: m.h });
    const age = 90 - b.t;
    balao(b.text, x, y, Math.round(b.x - G.cam), { line: b.p && b.p.ch === "carlos" ? "#243a8c" : b.p && b.p.ch === "francisco" ? "#6a3a10" : "#12081c",
      pop: age < 5 ? 0.5 + age * 0.1 : age < 8 ? 1.1 : 1, alpha: b.t < 10 ? b.t / 10 : 1 });
  }
}

function drawHUD() {
  const hi = Math.max(melhorPontuacao(), ...G.players.map(p => p.score));
  ctx.save(); ctx.translate(0, -OY);   // HUD no topo do ecrã
  text("HI-SCORE", W / 2, 2, "#ff9bb0", 1, "center");
  text(pad6(hi), W / 2, 14, "#fff", 1, "center");
  G.players.forEach((p, k) => {
    const left = k === 0, bx = left ? 2 - OX : W - 128 + OX, tx = bx + 22;
    ctx.fillStyle = "rgba(10,6,24,.6)"; ctx.fillRect(bx, 2, 126, 41);
    if (LAT[p.ch]) spr(IMG[LAT[p.ch].img], LAT[p.ch].portrait[0], p.state * CELLL + LAT[p.ch].portrait[1], 18, 18, bx + 2, 5); else spr(IMG[p.ch], 12, p.state * 64 + 3, 16, 16, bx + 3, 6);
    text(CHAR[p.ch].name, tx, 3, "#ffe27a");
    text("x" + Math.max(0, p.lives), tx, 14, "#fff");
    text(String(p.score).padStart(6, "0"), tx + 28, 14, "#9be59b");
    for (let b = 0; b < p.charges; b++) spr(IMG.itens, 16, 0, 16, 16, tx - 2 + b * 10, 28, false, 1, 0, 0.75);
    spr(IMG.itens, 32, 0, 16, 16, tx + 52, 28, false, 1, 0, 0.75); text((p.items.cartao % 5) + "/5", tx + 66, 30, "#ffe27a", 1, "left");
  });
  ctx.restore();
  if (G.msgT > 0 && !G.bossMsg) {
    const a = Math.min(1, G.msgT / 40);
    ctx.globalAlpha = a; text(WORLDS[G.world].name, W / 2, 50, "#ffe27a", 2, "center"); text(WORLDS[G.world].sub, W / 2, 72, "#fff", 1, "center"); ctx.globalAlpha = 1;
  }
  if (G.bossMsg && G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT / 40); text((G.bossArt || "O") + " " + G.bossName + "!", W / 2, 50, "#ff9bb0", 2, "center"); ctx.globalAlpha = 1;
  }
  if (muted) text(window.TOQUE ? "SOM DESLIGADO" : "SOM DESLIGADO (M)", W + OX - 6, H - 12, "#ff9bb0", 1, "right");
  if (G.pieceMsg > 0) {
    G.pieceMsg--;
    const age = 170 - G.pieceMsg, a = Math.min(1, G.pieceMsg / 20), pop = age < 8 ? 0.6 + age * 0.05 : 1;
    const nome = PIECE_GET[G.world] + "!", w = Math.max(nome.length * 14, 11 * 7) + 28, h = 108, x = Math.round((W - w) / 2), y = 36;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, y + h / 2); ctx.scale(pop, pop); ctx.translate(-W / 2, -(y + h / 2));
    balaoCaixa(x, y, w, h, "#fff2a8", "#12081c");
    spr(IMG.itens, PIECES[G.world] * 16, 0, 16, 16, W / 2 - 24, y + 6 + Math.sin(frame * 0.12) * 2, false, 1, 0, 3);
    text("RECUPERASTE", W / 2, y + 60, "#6a3a10", 1, "center", false);
    text(nome, W / 2, y + 74, "#8a1228", 2, "center", false);
    ctx.restore();
  }
  const boss = G.enemies.find(e => e.boss);
  if (boss) {
    const wbar = 160, x = (W - wbar) / 2, y = H - 14;
    ctx.fillStyle = "#12081c"; ctx.fillRect(x - 2, y - 2, wbar + 4, 9);
    ctx.fillStyle = "#6a2a40"; ctx.fillRect(x, y, wbar, 5);
    ctx.fillStyle = "#ff6a8a"; ctx.fillRect(x, y, Math.max(0, wbar * boss.hp / boss.maxhp), 5);
    text(G.bossName, W / 2, y - 14, "#fff", 1, "center");
  }
  if (G.clear) {
    text("NÍVEL COMPLETO", W / 2, 150, "#fff", 1, "center");   // o letreiro "RECUPERASTE ..." (pieceMsg) diz qual é a peça
  }
}

/* ============================================================
   FASES: boot / intro (cena) / título / seleção / jogo / fim
   ============================================================ */
function setPhase(p) { phase = p; phaseT = 0; }
const COLS = ["#fff", "#ffe27a", "#9be59b", "#ff9bb0", "#8cf"];

/* ---- cena de abertura ---- */
const CUT = {
  guests: [[40, "conv_verde"], [66, "conv_chapeu"], [96, "conv_fato"], [268, "conv_fato2"], [298, "conv_chapeu2"]],
  gear: [[2, 0], [1, 1], [2, 5], [4, 7], [1, 3], [3, 4]],
};
let cutGear = null;
let windSfx = false;
function cutStart() { cutGear = null; windSfx = false; setPhase("intro"); music("intro", 0); }

function drawIntro() {
  const t = phaseT / 60;   // segundos
  const w = clamp((t - 21.9) / 0.8, 0, 1);      // intensidade do vento (depois do botão do DJ)
  const blown = t >= 22.7, bt = Math.max(0, t - 22.7);
  if (t > 21.9 && !windSfx) { windSfx = true; sfx("vento", .7); }
  // fundo: dia -> tempestade (mesmo enquadramento, crossfade com a intensidade do vento)
  const bx = -18;
  fundoLargo(IMG.fundo_casamento_dia, bx);
  if (w > 0) { ctx.globalAlpha = w; fundoLargo(IMG.fundo_guimaraes, bx); ctx.globalAlpha = 1; }
  drawGround(WORLDS[0], 0);
  if (w > 0) { ctx.fillStyle = `rgba(40,20,70,${w * 0.22})`; ctx.fillRect(-OX, -OY, VW, VH); }

  const sway = (i) => w * (blown ? 0 : Math.sin(t * 9 + i) * 3);
  // personagens do casamento (as folhas olham para a direita; flip = olhar para a esquerda)
  const castFig = (type, x, i, flip) => {
    let ox = x + sway(i), oy = GROUND, rot = 0, an = "idle", tt2 = t * 5 + i * 3;
    if (blown) {
      const dly = (i % 4) * 0.12, tt = Math.max(0, bt - dly);
      ox = x + tt * (60 + i * 8) + tt * tt * 24; oy = GROUND - tt * (30 + i * 5) - Math.sin(tt * 3) * 12; rot = tt * (2 + i * 0.3);
      an = "blown"; tt2 = tt * 8;
      if (ox > W + 60) return;
    } else shadow(ox, GROUND, 10, 0.4);
    enemySpr({ type, x: ox, y: oy }, an, tt2, flip, 1, 1, flip ? -rot : rot);
  };
  const shk = t >= 22.2 ? Math.sin(t * 60) * 1.5 : 0;
  CUT.guests.forEach(([x, k], i) => castFig(k, x, i, x > 197));
  castFig("noiva", 186, 20, false); castFig("noivo", 210, 21, true);
  // DJ (fica sempre): carrega no botão às 19.8 s
  shadow(330, GROUND, 12, 0.4);
  const djAn = t < 19.8 ? "idle" : "botao";
  enemySpr({ type: "dj", x: 330 + shk, y: GROUND }, djAn, djAn === "idle" ? t * 5 : (t - 19.8) / 2 * 9, false);
  // Wedding Planner (também fica: aproveita o vento)
  const pl = 0;   // a Planner fica firme no chão (não paira no ar quando chega o tufão)
  const plCmd = (t >= 9.5 && t < 13.5) || (t >= 27.6 && t < 31);
  shadow(128, GROUND, 11, 0.4);
  enemySpr({ type: "planner", x: 128 + (blown ? Math.sin(t * 9) * 0.6 : sway(40)), y: GROUND + pl }, plCmd ? "attack" : "idle", plCmd ? 3 + ((phaseT >> 3) % 4) : t * 5, false);
  // tufão
  if (blown && bt < 7) {
    const tx = W + 80 - bt * 85;
    spr(IMG.tufao_pl, ((phaseT >> 2) % 9) * 128, 0, 128, 128, tx - 96, GROUND - 176, false, 1, 0, 1.5);
  }
  // heróis
  const hy = GROUND;
  shadow(160, GROUND, 14); shadow(236, GROUND, 14);
  const cShift = blown ? Math.sin(t * 20) * 2 * Math.max(0, 1 - bt / 3) : sway(30);
  const hurt = blown && bt < 3.6;
  const cFrame = hurt ? FR.hurt : (t > 10 && t < 20 && ((t * 1.5) | 0) % 2 === 0 ? FR.atk1 : FR.idle);
  actor("carlos", 0, hurt ? "hurt" : "idle", hurt ? 0 : t * 5, 160 + cShift, hy, false);
  const fFrame = hurt ? FR.hurt : ((t > 5 && t < 20 && ((t * 2) | 0) % 3 === 0) ? FR.pose : FR.idle);
  actor("francisco", 0, hurt ? "hurt" : (fFrame === FR.pose ? "selfie" : "idle"), hurt ? 0 : (fFrame === FR.pose ? 2 : t * 5), 236 + cShift, hy, true);
  if (!blown) {
    if (((t * 2) | 0) % 2 === 0) { ctx.fillStyle = "#e33"; ctx.fillRect(171, hy - 51, 3, 3); }   // luz REC na câmara do Carlos
    if (fFrame === FR.pose && ((phaseT >> 3) & 1)) { ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillRect(208, hy - 62, 8, 8); }
  } else {
    if (!cutGear) {
      cutGear = CUT.gear.map(([ow, ic], k) => ({ x: ow === 2 || ow === 4 ? 236 : 160, y: hy - 40, vx: rnd(1.5, 4.5) * (k % 2 ? 1 : 0.7), vy: rnd(-5, -2.5), icon: ic, rot: 0, vr: rnd(-.4, .4) }));
      shake = 22;
    }
    cutGear.forEach(gf => {
      gf.x += gf.vx + bt * 1.4; gf.y += gf.vy; gf.vy += 0.07; gf.rot += gf.vr;
      if (gf.x < W + 20) spr(IMG.itens, gf.icon * 16, 0, 16, 16, gf.x - 8, gf.y - 8, false, 1, gf.rot, 1.3);
    });
  }
  for (let k = 0; k < 40 * w; k++) {
    const sp = 2 + (k % 5), x = (W + 20 - ((t * 120 * sp / 3 + k * 97) % (W + 40)));
    ctx.fillStyle = COLS[k % 5]; ctx.fillRect(Math.round(x), Math.round((k * 53) % GROUND), 2, 2);
  }
  // legendas
  const cap = (s, y = 12, col = "#fff") => { const tw = s.length * 7 + 12; ctx.fillStyle = "rgba(10,6,24,.75)"; ctx.fillRect(W / 2 - tw / 2, y - 3, tw, 17); text(s, W / 2, y, col, 1, "center"); };
  // descrições em cima; falas em balões junto de quem fala
  if (t < 4.5) cap("SÁBADO. 15:00. GUIMARÃES.");
  else if (t >= 5 && t < 9) cap("CARLOS E FRANCISCO: A DUPLA DE SEMPRE.");
  else if (t >= 21.8 && t < 23) cap("OOPS.", 12, "#ff6a8a");
  else if (t >= 24 && t < 27.4) cap("O MATERIAL ESPALHOU-SE POR PORTUGAL!");
  else if (t >= 31.4 && t < 36) cap("SEM AS FOTOS, O CASAMENTO NUNCA EXISTIU!");
  const FALAS = [[9.5, 13.5, 128, "TUDO TEM DE SER PERFEITO!", "#12081c"], [13.8, 17, 160, "FOCA NOS NOIVOS!", "#243a8c"],
    [17.2, 19.5, 236, "SÓ MAIS UMA SELFIE...", "#6a3a10"], [19.8, 21.8, 330, "ESTE BOTÃO FAZ O QUÊ?", "#12081c"],
    [27.6, 31, 128, "EU TOMO CONTA DISTO!", "#12081c"]];
  for (const [a, b, sx, fala, cor] of FALAS) if (t >= a && t < b) {
    const mm = balaoMede(fala), bx = clamp(Math.round(sx - mm.w / 2), 4, W - 4 - mm.w), k = (t - a) * 60;
    balao(fala, bx, GROUND - 92 - mm.h, sx, { line: cor, pop: k < 6 ? 0.6 + k * 0.07 : 1 });
  }
  if (t > 36 && ((phaseT >> 4) & 1)) text("PRIME ENTER", W / 2, 150, "#ffe27a", 1, "center");
  if (ACEL) text(">> 3X", W + OX - 8, 12, "#ffe27a", 1, "right");
  else if (t > 0.3 && t < 36) {
    if (window.TOQUE) { text("SEGURA O ECRA: ACELERAR", 8 - OX, H - 12, "#9a8ac8", 1, "left"); text("SALTAR >>", W + OX - 8, H - 12, "#ffe27a", 1, "right"); }
    else text("SEGURA ENTER: ACELERAR   ESC: SALTAR", W / 2, H - 12, "#9a8ac8", 1, "center");
  }
  if (t >= 38.5) { music("titulo"); depoisDaCutscene(); }
  if (blown && Math.random() < 0.02) shake = Math.max(shake, 3);
}

/* ---- título ---- */
let menuSel = 0;
const CRT_NOMES = ["NAO", "LINHAS"];
const MENU = ["1 JOGADOR", "2 JOGADORES", "PONTUAÇÕES", "COMO JOGAR", "CRT", "SOM"];
/* ============================================================
   MELHORES PONTUAÇÕES (como nas arcades dos anos 80)
   ============================================================ */
const HISC_PADRAO = [["CAR", 20000], ["FRA", 15000], ["GUI", 10000], ["POR", 7000], ["LIS", 5000], ["ALG", 3500], ["TUF", 2500], ["NOI", 1500], ["PLA", 1000], ["BOL", 500]];
let HISC = lsGet("caos_pontuacoes", null) || HISC_PADRAO.map(([n, s]) => ({ n, s }));
const melhorPontuacao = () => (HISC.length ? HISC[0].s : 0);
const qualifica = s => s > 0 && (HISC.length < 10 || s > HISC[HISC.length - 1].s);
function guardaRecorde(n, s) {
  HISC.push({ n, s }); HISC.sort((a, b) => b.s - a.s); HISC.length = Math.min(10, HISC.length);
  lsSet("caos_pontuacoes", HISC);
}
const pad6 = n => String(n).padStart(6, "0");
const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ.-";
let INI = null, PLACAR = { novos: [] };

// fim da partida (game over ou final): pede as iniciais a quem bateu um recorde e mostra a tabela
function fimDePartida() {
  const fila = G.players.map(p => ({ ch: p.ch, s: p.score })).filter(e => qualifica(e.s)).sort((a, b) => b.s - a.s);
  music("titulo");
  PLACAR = { novos: [] };
  if (!fila.length) { setPhase("placar"); return; }
  INI = { fila, i: 0, l: [0, 0, 0], pos: 0 };
  setPhase("iniciais");
}
function drawFundoTitulo() {
  fundoLargo(IMG.fundo_guimaraes, -18 - (Math.sin(phaseT * 0.004) + 1) * 12);
  drawGround(WORLDS[0], phaseT * 0.15);
  ctx.fillStyle = "rgba(10,6,24,.78)"; ctx.fillRect(-OX, -OY, VW, VH);
}
function drawIniciais() {
  const m = menuInput(), t = phaseT, e = INI.fila[INI.i];
  drawFundoTitulo();
  text("NOVO RECORDE!", W / 2, 14, "#ffe27a", 3, "center");
  text(CHAR[e.ch].name + "   " + pad6(e.s), W / 2, 58, "#fff", 1, "center");
  text("ESCOLHE AS TUAS INICIAIS", W / 2, 80, "#c9c0e8", 1, "center");
  for (let k = 0; k < 3; k++) {
    const x = W / 2 - 54 + k * 40, sel = k === INI.pos;
    ctx.fillStyle = sel ? "#4a3a8a" : "#2a2058"; ctx.fillRect(x, 100, 32, 40);
    ctx.strokeStyle = sel ? "#ffe27a" : "#4a3a8a"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, 100.5, 31, 39);
    text(LETRAS[INI.l[k]], x + 16, 108, sel ? "#ffe27a" : "#fff", 3, "center");
    if (sel && ((t >> 4) & 1)) { ctx.fillStyle = "#ffe27a"; ctx.fillRect(x + 4, 136, 24, 2); }
  }
  text(window.TOQUE ? "SETAS MUDAM A LETRA. OK CONFIRMA." : "ESCREVE AS INICIAIS. ENTER: OK", W / 2, 160, "#c9c0e8", 1, "center");
  if (!window.TOQUE) text("(SETAS E APAGAR TAMBEM FUNCIONAM)", W / 2, 174, "#6a5a9a", 1, "center");
  // no PC: escreve-se com o teclado (as letras não podem servir de menu, por isso só contam setas e Enter)
  const pc = !window.TOQUE;
  const up = pc ? edge.ArrowUp : m.up, down = pc ? edge.ArrowDown : m.down, left = pc ? edge.ArrowLeft : m.left, right = pc ? edge.ArrowRight : m.right;
  const ok = pc ? (edge.Enter || edge.NumpadEnter) : m.ok;
  if (pc) {
    for (const k in edge) {
      let ch = null;
      if (/^Key[A-Z]$/.test(k)) ch = k[3]; else if (k === "Period" || k === "NumpadDecimal") ch = "."; else if (k === "Minus" || k === "NumpadSubtract") ch = "-";
      if (ch && t > 10) { INI.l[INI.pos] = LETRAS.indexOf(ch); sfx("blip", .4); if (INI.pos < 2) INI.pos++; }
    }
    if (edge.Backspace && t > 10) { if (INI.l[INI.pos] === 0 && INI.pos > 0) INI.pos--; INI.l[INI.pos] = 0; sfx("blip", .3); }
  }
  if (up) { INI.l[INI.pos] = (INI.l[INI.pos] + 1) % LETRAS.length; sfx("blip", .4); }
  if (down) { INI.l[INI.pos] = (INI.l[INI.pos] + LETRAS.length - 1) % LETRAS.length; sfx("blip", .4); }
  if (left) { INI.pos = Math.max(0, INI.pos - 1); sfx("blip", .3); }
  if (right) { INI.pos = Math.min(2, INI.pos + 1); sfx("blip", .3); }
  if (ok && t > 20) {
    if (INI.pos < 2 && !pc) { INI.pos++; sfx("blip", .5); }
    else {
      const nome = INI.l.map(i => LETRAS[i]).join("");
      guardaRecorde(nome, e.s); PLACAR.novos.push({ n: nome, s: e.s }); sfx("vitoria", .6);
      INI.i++; INI.l = [0, 0, 0]; INI.pos = 0;
      if (INI.i >= INI.fila.length) setPhase("placar");
    }
  }
}
function drawPlacar() {
  const m = menuInput(), t = phaseT;
  drawFundoTitulo();
  text("MELHORES PONTUAÇÕES", W / 2, 10, "#ffe27a", 2, "center");
  HISC.forEach((e, i) => {
    const novo = PLACAR.novos.some(q => q.n === e.n && q.s === e.s), y = 36 + i * 14;
    const cor = novo && ((t >> 3) & 1) ? "#ffffff" : (i === 0 ? "#ffe27a" : novo ? "#ff9bb0" : "#c9c0e8");
    text(String(i + 1).padStart(2, " ") + ".", W / 2 - 80, y, cor, 1, "left");
    text(e.n, W / 2 - 44, y, cor, 1, "left");
    text(pad6(e.s), W / 2 + 20, y, cor, 1, "left");
  });
  if ((t >> 5) & 1) text("PRIME ENTER", W / 2, 200, "#ffe27a", 1, "center");
  if (m.ok && t > 30) { music("titulo"); setPhase("title"); }
}

function drawTitle() {
  const m = menuInput();
  fundoLargo(IMG.fundo_guimaraes, -18 - (Math.sin(phaseT * 0.004) + 1) * 12);
  drawGround(WORLDS[0], phaseT * 0.15);
  ctx.fillStyle = "rgba(10,6,24,.3)"; ctx.fillRect(-OX, -OY, VW, 100 + OY);
  shadow(62, GROUND, 14); shadow(322, GROUND, 14);
  actor("carlos", 0, "idle", phaseT / 12, 62, GROUND, false);
  actor("francisco", 0, "idle", phaseT / 12, 322, GROUND, true);
  // logótipo
  const b = Math.sin(phaseT * 0.05) * 2;
  text("CAOS NO", W / 2, 20 + b, "#ffe27a", 4, "center");
  text("CASAMENTO", W / 2, 54 + b, "#ff9bb0", 4, "center");
  text("CARLOS & FRANCISCO", W / 2, 92, "#fff", 1, "center");
  // no telemóvel só há 1 jogador (não há 2 pessoas no mesmo ecrã táctil)
  const itens = [{ id: "1p", t: "1 JOGADOR" }, ...(window.TOQUE ? [] : [{ id: "2p", t: "2 JOGADORES" }]),
    { id: "placar", t: "PONTUAÇÕES" }, { id: "regras", t: "COMO JOGAR" }, { id: "crt", t: "CRT: " + CRT_NOMES[crtMode] }, { id: "som", t: "SOM: " + (muted ? "NÃO" : "SIM") }];
  menuSel = Math.min(menuSel, itens.length - 1);
  ctx.fillStyle = "rgba(10,6,24,.72)"; ctx.fillRect(W / 2 - 80, 104, 160, 14 * itens.length + 8);
  itens.forEach((it, i) => {
    const y = 109 + i * 14;
    text(it.t, W / 2, y, i === menuSel ? "#ffe27a" : "#c9c0e8", 1, "center");
    if (i === menuSel) { text(">", W / 2 - it.t.length * 3.5 - 12, y, "#ffe27a"); }
  });
  ctx.fillStyle = "rgba(10,6,24,.8)"; ctx.fillRect(-OX, H - 18, VW, 18);
  text(window.TOQUE ? "ESCOLHE COM OS BOTOES E OK" : "SETAS+ENTER  |  V = CRT  |  M = SOM", W / 2, H - 13, "#c9c0e8", 1, "center");
  if (m.up) { menuSel = (menuSel + itens.length - 1) % itens.length; sfx("blip", .4); }
  if (m.down) { menuSel = (menuSel + 1) % itens.length; sfx("blip", .4); }
  if (m.ok) {
    sfx("blip", .5);
    const id = itens[menuSel].id;
    if (id === "1p") { numPlayers = 1; selIdx = 0; setPhase("select"); }
    else if (id === "2p") { numPlayers = 2; selIdx = 0; setPhase("select"); }
    else if (id === "placar") { PLACAR = { novos: [] }; setPhase("placar"); }
    else if (id === "regras") startRegras(false);
    else if (id === "crt") mudaCRT();
    else if (id === "som") setMuted(!muted);
  }
}

/* ---- seleção ---- */
let selIdx = 0;
function drawSelect() {
  const m = menuInput();
  fundoLargo(IMG.fundo_guimaraes, -18 - (Math.sin(phaseT * 0.004) + 1) * 12);
  drawGround(WORLDS[0], phaseT * 0.15);
  ctx.fillStyle = "rgba(10,6,24,.72)"; ctx.fillRect(-OX, -OY, VW, VH);
  text(numPlayers === 1 ? "ESCOLHE A PERSONAGEM" : "JOGADOR 1: ESCOLHE A PERSONAGEM", W / 2, 8, "#ffe27a", 1, "center");
  ["carlos", "francisco"].forEach((ch, i) => {
    const x = 66 + i * 160, sel = selIdx === i;
    ctx.fillStyle = sel ? "#4a3a8a" : "#2a2058"; ctx.fillRect(x, 24, 112, 148);
    ctx.strokeStyle = sel ? "#ffe27a" : "#4a3a8a"; ctx.lineWidth = 2; ctx.strokeRect(x + 1, 25, 110, 146);
    if (LAT[ch]) spr(IMG[LAT[ch].img], (sel ? 4 + ((phaseT >> 3) % 8) : 0) * CELLL, 0, CELLL, CELLL, x + 56 - 64, 36, false, 1, 0, 1.6);
    else spr(IMG[ch], sel ? ((phaseT >> 4) & 1) * 40 : 0, 0, 40, 64, x + 56 - 40, 40, false, 1, 0, 2);
    text(CHAR[ch].name, x + 56, 28, sel ? "#ffe27a" : "#c9c0e8", 1, "center");
  });
  const d = selIdx === 0
    ? ["CARLOS - O VIDEÓGRAFO", "RÁPIDO E ÁGIL. GIMBAL EM ARCO.", "ESPECIAL: TRAVELLING (INVENCÍVEL)"]
    : ["FRANCISCO - O FOTÓGRAFO", "ALCANCE LONGO (CÂMARA). DANO ALTO.", "ESPECIAL: FLASH (ATORDOA TUDO)"];
  ctx.fillStyle = "#12081c"; ctx.fillRect(-OX, 178, VW, 46);
  text(d[0], W / 2, 181, "#fff", 1, "center", false);
  text(d[1], W / 2, 193, "#c9c0e8", 1, "center", false);
  text(numPlayers === 2 ? "JOGADOR 2 FICA COM " + CHAR[selIdx === 0 ? "francisco" : "carlos"].name : d[2], W / 2, 206, numPlayers === 2 ? "#8cf" : "#9be59b", 1, "center", false);
  if (m.left || m.right) { selIdx = 1 - selIdx; sfx("blip", .4); }
  if (m.back) setPhase("title");
  if (m.ok) {
    chosen = selIdx === 0 ? ["carlos", "francisco"] : ["francisco", "carlos"];
    sfx("start", .6); startGame(Math.max(0, Math.min(IMPLEMENTED - 1, (parseInt(new URLSearchParams(location.search).get("nivel")) || 1) - 1)));
  }
}

function startGame(world = 0) {
  const ps = [newPlayer(0, chosen[0])];
  if (numPlayers === 2) ps.push(newPlayer(1, chosen[1]));
  // a pontuação e os cartões passam de nível em nível (vindo do mapa entre níveis)
  if (typeof phase !== "undefined" && phase === "interlude" && typeof G !== "undefined" && G && G.players) {
    ps.forEach((p, i) => { const q = G.players[i]; if (q) { p.score = q.score; p.items.cartao = q.items.cartao; } });
  }
  G = newLevel(ps, world);
  music(WORLDS[world].music || "nivel1", 0);
  setPhase("play");
}

function drawGameOver() {
  const m = menuInput(), t = phaseT;
  fundoLargo(IMG.fundo_guimaraes, -18 - (Math.sin(t * 0.004) + 1) * 12);
  drawGround(WORLDS[0], t * 0.15);
  ctx.fillStyle = "rgba(10,6,24,.72)"; ctx.fillRect(-OX, -OY, VW, VH);
  // raios
  if (((t >> 4) % 5) === 0) { ctx.fillStyle = "rgba(220,230,255,.18)"; ctx.fillRect(-OX, -OY, VW, VH); }
  // o tufão vencedor, à direita
  shadow(310, GROUND, 18, 0.4);
  enemySpr({ type: "supertufao", x: 310, y: GROUND }, "idle", t / 8, false, 1.15);
  // os heróis, derrotados (de cuecas), à esquerda
  const hs = G.players.map(p => p.ch);
  hs.forEach((ch, i) => {
    const x = hs.length === 1 ? 110 : 80 + i * 56;
    shadow(x, GROUND, 14);
    actor(ch, 2, "hurt", 99, x, GROUND, false);
  });
  // título e fala
  const b = Math.sin(t * 0.06) * 2;
  text("GAME OVER", W / 2, 20 + b, "#ff6a8a", 4, "center");
  const lead = hs.includes("francisco") ? "francisco" : "carlos";
  const fala = lead === "francisco" ? "UPS... PERDI A FOTO!" : "ISTO NÃO ESTAVA NO ORÇAMENTO!";
  if (t > 40 && t < 400) bubbleAt(fala, hs.length === 1 ? 110 : 108, GROUND - 84);
  ctx.fillStyle = "rgba(10,6,24,.75)"; ctx.fillRect(-OX, 56, VW, 14 * G.players.length + 8);
  G.players.forEach((p, i) => text(CHAR[p.ch].name + "  " + String(p.score).padStart(6, "0") + "   CARTÕES: " + p.items.cartao, W / 2, 60 + i * 14, "#c9c0e8", 1, "center"));
  if ((t >> 5) & 1) text("PRIME ENTER", W / 2, 208, "#ffe27a", 1, "center");
  if (m.ok && t > 60) fimDePartida();
}

function drawClear() {
  const m = menuInput();
  ctx.fillStyle = "#12081c"; ctx.fillRect(-OX, -OY, VW, VH);
  for (let y = -8 * Math.ceil(OY / 8); y < H; y += 8) { ctx.fillStyle = (y / 8) % 2 ? "#1c1238" : "#161030"; ctx.fillRect(-OX, y, VW, 8); }
  text("PROTÓTIPO COMPLETO!", W / 2, 24, "#ffe27a", 2, "center");
  text("RECUPERASTE AS PEÇAS ATÉ AQUI.", W / 2, 54, "#fff", 1, "center");
  text("FALTA O RESTO DO MATERIAL...", W / 2, 68, "#c9c0e8", 1, "center");
  spr(IMG.itens, 0, 0, 16, 16, W / 2 - 24, 86, false, 1, Math.sin(phaseT * 0.05) * .3, 3);
  G.players.forEach((p, i) => {
    text(CHAR[p.ch].name + "  " + String(p.score).padStart(6, "0") + "   CARTÕES: " + p.items.cartao, W / 2, 150 + i * 14, "#9be59b", 1, "center");
  });
  if ((phaseT >> 5) & 1) text("PRIME ENTER", W / 2, 195, "#ffe27a", 1, "center");
  if (m.ok && phaseT > 40) { music("titulo"); setPhase("title"); }
}

/* ============================================================
   MUNDOS, SELFIE DO FINAL DE NÍVEL E CENA ENTRE MUNDOS
   ============================================================ */
const PIECES = [0, 1, 4, 3, 5, 8];     // índices em itens.png: lente, baterias, tripé, flash, câmara, cartão
const PIECE_GET = ["A LENTE", "AS BATERIAS", "O TRIPÉ", "OS FLASHES", "A CÂMARA", "O DISCO SSD"];
const PIECE_NAMES = ["LENTE", "BATERIAS", "TRIPÉ", "FLASHES", "CÂMARA", "DISCO SSD"];
const WORLDS = [
  { name: "NÍVEL 1", sub: "GUIMARÃES: LARGO DA OLIVEIRA", music: "nivel1", boss: "padre", bossName: "PADRE", apology: "PERDÃO! FUI APANHADO PELO VENTO!", bg: "fundo_guimaraes", ground: "chao_guimaraes", city: "GUIMARÃES", lat: 41.44, lon: -8.30,
    sky: "ceu", plano: "plano", tiles: "tiles", platImg: "plataformas", casario: true, foes: ["chapeu", "bolo"], pieceType: "lente" },
  { name: "NÍVEL 2", sub: "PORTO", music: "porto", boss: "chef", bossName: "CHEF", apology: "FOI SEM QUERER! DESCULPEM!", bg: "fundo_porto", ground: "chao_porto", city: "PORTO", lat: 41.15, lon: -8.61,
    sky: "ceu_porto", plano: "plano_porto", tiles: "tiles_porto", platImg: "plataformas_porto", casario: false, foes: ["gaivota", "francesinha"], pieceType: "bateria",
    plats: [[300, 160, "banco"], [470, 138, "mesa"], [690, 158, "banco"], [860, 126, "mesa"], [1090, 156, "banco"], [1290, 136, "mesa"],
      [1500, 158, "banco"], [1680, 124, "banco"], [1900, 156, "mesa"], [2120, 138, "banco"], [2290, 158, "mesa"]] },
  { name: "NÍVEL 3", sub: "COIMBRA", music: "coimbra", boss: "tuna", bossName: "TUNA", art: "A", apology: "FOMOS ARRASTADOS PELO VENTO!", foes: ["chapeu", "estudante"], pieceType: "tripe", bg: "fundo_coimbra", ground: "chao_coimbra", city: "COIMBRA", lat: 40.21, lon: -8.43 },
  { name: "NÍVEL 4", sub: "LISBOA", music: "lisboa", boss: "dj", bossName: "DJ", apology: "O BOTÃO ERA ESTE... ERA!", foes: ["gaivota", "pastel"], pieceType: "flash", bg: "fundo_lisboa", ground: "chao_lisboa", strip: true, city: "LISBOA", lat: 38.72, lon: -9.14 },
  { name: "NÍVEL 5", sub: "ALGARVE", music: "algarve", boss: "florista", bossName: "FLORISTA", art: "A", apology: "ATCHIM... DESCULPEM!", foes: ["gaivota", "caranguejo"], pieceType: "camara", bg: "fundo_algarve", ground: "chao_algarve", city: "ALGARVE", lat: 37.10, lon: -8.67 },
  { name: "NÍVEL 6", sub: "GUIMARÃES: CASTELO", music: "castelo", boss: "planner", bossName: "WEDDING PLANNER", art: "A", apology: "SÓ QUERIA QUE FOSSE PERFEITO...", foes: ["chapeu", "cavaleiro"], pieceType: "ssd", bg: "fundo_castelo", ground: "chao_castelo", city: "CASTELO", lat: 41.44, lon: -8.30 },
];
const IMPLEMENTED = 6;      // mundos jogáveis por agora
const INTERLUDE = [
  [["NOIVA", "O VENTO LEVOU TUDO PARA SUL!"], ["CARLOS", "CALMA. VAMOS ATRÁS DELE."], ["FRANCISCO", "NA BOA FÉ! NA RAÇA!"]],
  [["NOIVO", "JÁ TEMOS A LENTE E AS BATERIAS?"], ["CARLOS", "FALTA O RESTO. NÃO TE DISTRAIAS."], ["FRANCISCO", "SÓ UMA SELFIE NA PONTE..."]],
  [["NOIVA", "OS CONVIDADOS JÁ ESTÃO COM FRIO!"], ["CARLOS", "SEMPRE A P*** DA MESMA MERDA!"], ["FRANCISCO", "NA RAÇA, ELES ENTENDEM."]],
  [["NOIVO", "E SE NÃO HOUVER FOTOS?"], ["CARLOS", "HÁ DE HAVER. TENHO ISTO CONTROLADO."], ["FRANCISCO", "NA BOA FÉ... TAMBÉM EU."]],
  [["NOIVA", "O VENTO ESTÁ A VOLTAR PARA O CASTELO!"], ["CARLOS", "ENTÃO É LÁ QUE ACABA."], ["FRANCISCO", "VAMOS PARA CASA. NA RAÇA!"]],
];
const SPEAKER_COL = { NOIVA: "#ff9bb0", NOIVO: "#8cf", CARLOS: "#ffe27a", FRANCISCO: "#9be59b" };
const mapXY = (lon, lat) => [(lon + 9.6) * 27 + 6, (42.25 - lat) * 34 + 6];

function bubbleAt(txt, cx, y) {
  const m = balaoMede(txt), x = clamp(Math.round(cx - m.w / 2), 4, W - 4 - m.w);
  balao(txt, x, y - (m.h - 16) - 4, Math.round(cx));
}

let SF = null, IL = null;
function startSelfie() { music(null); SF = { photo: 0 }; setPhase("selfie"); }

function drawSelfie() {
  const m = menuInput(), t = phaseT, wd = WORLDS[G.world];
  drawBackground();
  const two = G.players.length === 2, mine = G.players[0].ch;
  const cX = 140, fX = 222;
  let cx = cX, fx = fX, cFace = 1, fFace = -1, cWalk = false, fWalk = false;
  const k = Math.min(1, t / 110);
  if (!two && mine === "carlos") { fx = -30 + (fX + 30) * k; fWalk = k < 1; fFace = k < 1 ? 1 : -1; }
  if (!two && mine === "francisco") { cx = W + 30 + (cX - W - 30) * k; cWalk = k < 1; cFace = k < 1 ? -1 : 1; }
  const stOf = ch => { const p = G.players.find(q => q.ch === ch); return p ? p.state : 0; };
  const cf = cWalk ? ((t >> 3) & 1 ? FR.walk1 : FR.walk2) : (t > 190 ? FR.atk1 : FR.idle);
  const ff = fWalk ? ((t >> 3) & 1 ? FR.walk1 : FR.walk2) : (t > 112 ? FR.pose : FR.idle);
  shadow(cx, GROUND, 14); shadow(fx, GROUND, 14);
  if (EN[wd.boss]) { shadow(306, GROUND, 16); enemySpr({ type: wd.boss, x: 306, y: GROUND }, "idle", phaseT / 10, false); }
  actor("carlos", stOf("carlos"), cWalk ? "run" : (t > 190 ? "impatient" : "idle"), cWalk ? t / 4.6 : t / 9, cx, GROUND, cFace < 0);
  actor("francisco", stOf("francisco"), fWalk ? "run" : (t > 112 ? "selfie" : "idle"), fWalk ? t / 4.6 : (t - 112) / 10, fx, GROUND, fFace < 0);
  // peça recuperada
  const pi = PIECES[G.world];
  spr(IMG.itens, pi * 16, 0, 16, 16, W / 2 - 16, 8 + Math.sin(t * 0.08) * 2, false, 1, Math.sin(t * 0.05) * .15, 2);
  text("RECUPERASTE " + PIECE_GET[G.world] + "!", W / 2, 46, "#ffe27a", 1, "center");
  // falas
  if (t > 20 && t < 150) bubbleAt(wd.bossName + ": " + wd.apology, 306, GROUND - 90);
  if (t === 140) { whiteFlash = 12; sfx("selfie", .8); SF.photo = 70; }
  if (t > 150 && t < 250) bubbleAt("NA RAÇA!", fx, GROUND - 82);
  if (t > 190 && t < 290) bubbleAt(two || mine === "carlos" ? "FRANCISCO!!" : "ATENÇÃO!", cx, GROUND - 82);
  if (SF.photo > 0) {
    SF.photo--; ctx.fillStyle = "#fff";
    ctx.fillRect(-OX, -OY, VW, 6); ctx.fillRect(-OX, -OY, 6, VH); ctx.fillRect(W + OX - 6, -OY, 6, VH); ctx.fillRect(-OX, H - 22, VW, 22);
  }
  if (t > 280 && ((t >> 5) & 1)) text("PRIME ENTER", W / 2, 100, "#ffe27a", 1, "center");
  if (m.ok && t > 200) { if (G.world >= IMPLEMENTED - 1) startFinal(); else startInterlude(); }
}


/* ============================================================
   ECRÃ "COMO JOGAR" (3 páginas): aparece uma vez, depois da cutscene, e fica no menu
   ============================================================ */
let REG = null;
const regrasVistas = () => { try { return localStorage.getItem("caos_regras_vistas") === "1"; } catch (e) { return false; } };
function depoisDaCutscene() { if (regrasVistas()) setPhase("title"); else startRegras(true); }
function startRegras(auto) { REG = { page: 0, auto }; setPhase("regras"); }
function fimRegras() {
  try { localStorage.setItem("caos_regras_vistas", "1"); } catch (e) { /* sem armazenamento: aparece de novo na próxima vez */ }
  setPhase("title");
}
function keycap(x, y, label) {
  const w = label.length * 7 + 6;
  ctx.fillStyle = "#12081c"; ctx.fillRect(x, y, w, 15);
  ctx.fillStyle = "#c9c0e8"; ctx.fillRect(x + 1, y + 1, w - 2, 12);
  ctx.fillStyle = "#6a5a9a"; ctx.fillRect(x + 1, y + 12, w - 2, 2);
  text(label, x + 3, y + 1, "#12081c", 1, "left", false);
  return w;
}
function drawRegras() {
  const m = menuInput(), t = phaseT;
  ctx.fillStyle = "#12081c"; ctx.fillRect(-OX, -OY, VW, VH);
  for (let y = -8 * Math.ceil(OY / 8); y < H; y += 8) { ctx.fillStyle = (y / 8) % 2 ? "#1c1238" : "#161030"; ctx.fillRect(-OX, y, VW, 8); }
  const titles = ["OBJECTIVO E COMANDOS", "ITENS E VIDAS", "OS GOLPES"];
  text(titles[REG.page], W / 2, 8, "#ffe27a", 2, "center");
  const ICON_K = { 0: 0.8 };   // a lente enche o quadrado todo e parece maior que os outros: encolhe-a um pouco só neste ecrã
  const ic = (idx, x, y, sc = 2) => { const s2 = sc * (ICON_K[idx] || 1); spr(IMG.itens, idx * 16, 0, 16, 16, x + 8 * (sc - s2), y + 8 * (sc - s2), false, 1, 0, s2); };
  if (REG.page === 0) {
    text("O TUFÃO ESPALHOU O MATERIAL DO CASAMENTO!", W / 2, 34, "#fff", 1, "center");
    text("DERROTA O CHEFE DE CADA NÍVEL E RECUPERA", W / 2, 48, "#c9c0e8", 1, "center");
    text("AS 6 PEÇAS DO EQUIPAMENTO.", W / 2, 60, "#c9c0e8", 1, "center");
    PIECES.forEach((pi, k) => ic(pi, W / 2 - 108 + k * 36 + 6, 78 + Math.sin(t * 0.08 + k) * 2, 1.5));
    const col = (x, title, rows, c) => {
      text(title, x, 116, c, 1, "left");
      rows.forEach(([keys, what], k) => { let cx = x; keys.forEach(kk => { cx += keycap(cx, 130 + k * 17, kk) + 3; }); text(what, x + 84, 131 + k * 17, "#fff", 1, "left"); });
    };
if (window.TOQUE) {
      text("CONTROLOS NO ECRÃ", W / 2, 112, "#ffe27a", 1, "center");
      const bot = (cx, cy, lab) => {   // botão redondo como os do ecrã tátil
        ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 7); ctx.fillStyle = "rgba(255,255,255,.16)"; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.stroke();
        ctx.fillStyle = "#fff";
        if (lab === "<") { ctx.beginPath(); ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 3, cy - 4.5); ctx.lineTo(cx + 3, cy + 4.5); ctx.fill(); }
        else if (lab === ">") { ctx.beginPath(); ctx.moveTo(cx + 4, cy); ctx.lineTo(cx - 3, cy - 4.5); ctx.lineTo(cx - 3, cy + 4.5); ctx.fill(); }
        else text(lab, cx, cy - 5.5, "#fff", 1, "center", false);   // letra centrada no círculo (sem sombra)
      };
      const x0 = W / 2 - 120;
      bot(x0, 132, "<"); bot(x0 + 22, 132, ">"); text("ANDAR (BOTÕES À ESQUERDA)", x0 + 44, 128, "#fff", 1, "left");
      [["A", "SALTAR"], ["B", "GOLPE"], ["C", "ESPECIAL (GASTA UMA BATERIA)"]].forEach(([k, w], n) => { const cy = 153 + n * 20; bot(x0 + 11, cy, k); text(w, x0 + 44, cy - 4, "#fff", 1, "left"); });
    } else {
        col(14, "JOGADOR 1", [[["<", ">"], "MOVER"], [["Z"], "SALTAR"], [["X"], "GOLPE"], [["C"], "ESPECIAL"]], "#ffe27a");
      col(206, "JOGADOR 2", [[["A", "D"], "MOVER"], [["W"], "SALTAR"], [["F"], "GOLPE"], [["G"], "ESPECIAL"]], "#9be59b");
    }
  } else if (REG.page === 1) {
    const rows = [[1, "BATERIA", "DÁ ENERGIA PARA O GOLPE ESPECIAL (MÁX. 5)"], [2, "CARTÃO", "500 PONTOS. 5 CARTÕES = 1 VIDA EXTRA"], [6, "CAMISA", "VOLTAS A VESTIR UMA PEÇA DE ROUPA"],
      [4, "TRIPÉ", "300 PONTOS"], [0, "PEÇA DO CHEFE", "1000 PONTOS. APANHA-A PARA PASSAR DE NÍVEL"]];
    rows.forEach(([idx, nome, desc], k) => {
      const y = 34 + k * 24;
      ic(nome === "PEÇA DO CHEFE" ? PIECES[(t >> 5) % PIECES.length] : idx, 22, y - 4, 1.5);   // a peça do chefe muda: são as 6 peças
      text(nome, 54, y - 2, "#ffe27a", 1, "left"); text(desc, 54, y + 9, "#fff", 1, "left");
    });
    ctx.fillStyle = "rgba(10,6,24,.8)"; ctx.fillRect(10, 156, W - 20, 44);
    text("CADA GOLPE QUE LEVAS TIRA-TE UMA PEÇA DE ROUPA.", W / 2, 162, "#ff9bb0", 1, "center");
    text("EM CUECAS, O GOLPE SEGUINTE TIRA-TE UMA VIDA.", W / 2, 175, "#ff9bb0", 1, "center");
    text("SEM VIDAS, O JOGO ACABA. APANHA CAMISAS!", W / 2, 188, "#c9c0e8", 1, "center");
  } else {
    const cyc = (t >> 5) & 1;
    [["carlos", 96, "#ffe27a", "GOLPE: GIMBAL RÁPIDO", "ESPECIAL: TRAVELLING", "CORRIDA INVULNERÁVEL", cyc ? "dash" : "attack", false],
     ["francisco", 288, "#9be59b", "GOLPE: CÂMARA, ALCANCE", "ESPECIAL: FLASH", "ATORDOA TUDO NO ECRÃ", cyc ? "selfie" : "attack", true]].forEach(([ch, x, col, a, b, c, an, fl]) => {
      text(CHAR[ch].name, x, 36, col, 2, "center");
      shadow(x, 128, 14);
      actor(ch, 0, an, t / 6, x, 128, fl);
      text(a, x, 138, "#fff", 1, "center"); text(b, x, 152, col, 1, "center"); text(c, x, 166, "#c9c0e8", 1, "center");
    });
    text("CADA GOLPE ESPECIAL GASTA UMA BATERIA.", W / 2, 190, "#ff9bb0", 1, "center");
  }
  for (let p = 0; p < 3; p++) { ctx.fillStyle = p === REG.page ? "#ffe27a" : "#4a3a7a"; ctx.fillRect(W / 2 - 14 + p * 12, 210, 8, 4); }
  if ((t >> 5) & 1) text(REG.page < 2 ? "ENTER: SEGUINTE" : "ENTER: JOGAR", W - 10, H - 14, "#ffe27a", 1, "right");
  const next = () => { sfx("blip", .4); if (REG.page < 2) { REG.page++; phaseT = 0; } else fimRegras(); };
  if (m.ok && t > 15) next();
  else if (m.back) fimRegras();
  else if (REG.auto && t > 900) next();
}

/* ============================================================
   FINAL DO JOGO: depois do Super Tufão
   ============================================================ */
let FIN = null;
const FIN_LINES = [
  { n: "O TUFÃO DESFEZ-SE NO AR. O VENTO ACALMOU." },
  { w: "planner", t: "SÓ QUERIA QUE FOSSE PERFEITO... DESCULPEM." },
  { w: "carlos", t: "O PERFEITO NÃO EXISTE, WEDDING PLANNER." },
  { w: "francisco", t: "VALE O QUE VALE!" },
  { w: "carlos", t: "E FICA LINDO NA MESMA." },
  { w: "planner", t: "OBRIGADA! O CASAMENTO FAZ-SE JÁ!" },
  { n: "OS NOIVOS E OS CONVIDADOS VOLTARAM AO LARGO." },
  { w: "noiva", t: "O CASAMENTO PODE COMEÇAR!" },
  { w: "noivo", t: "E HÁ FOTOS! GRAÇAS A VOCÊS!" },
  { n: "UMA ÚLTIMA FOTO!" },
  { w: "francisco", t: "NA RAÇA!", foto: true },
];
function startFinal() { FIN = { line: 0, lt: 0, photo: 0, credits: 0 }; music("nivel1"); setPhase("final"); }

function drawFinal() {
  const m = menuInput(), t = phaseT;
  const wasW = G.world, wasC = G.cam; G.world = 0; G.cam = 120; drawBackground(); G.world = wasW; G.cam = wasC;
  ctx.fillStyle = "rgba(255,170,90,.10)"; ctx.fillRect(-OX, -OY, VW, VH);
  const done = FIN.line >= FIN_LINES.length;
  if (!done) {
    FIN.lt++;
    const ln = FIN_LINES[FIN.line];
    if (m.ok || FIN.lt > 230) { FIN.line++; FIN.lt = 0; sfx("blip", .4); if (ln.foto) { FIN.photo = 70; sfx("selfie", .8); whiteFlash = 12; } }
  } else if (FIN.credits === 0) FIN.credits = 1;
  const li = Math.min(FIN.line, FIN_LINES.length - 1), ln = FIN_LINES[li];
  const group = li >= 6 || done;
  // posições: grupo final vs. cena inicial
  const pos = group
    ? { conv_chapeu: [58, false], conv_verde: [92, false], carlos: [140, false], francisco: [176, true], noiva: [216, true], noivo: [242, true], planner: [286, false], conv_fato: [332, true] }
    : { carlos: [120, false], francisco: [164, false], planner: [292, false] };
  const flipOf = (k, fl) => k === "planner" ? fl : fl;
  shadow(pos.carlos[0], GROUND, 14);
  Object.keys(pos).forEach(k => {
    const [x, fl] = pos[k];
    if (k === "carlos" || k === "francisco") {
      const sel = k === "francisco" && ln.foto;
      actor(k, 0, sel ? "selfie" : "idle", sel ? (FIN.lt / 10) : t / 9, x, GROUND, fl);
    } else {
      shadow(x, GROUND, 12);
      if (k === "planner") enemySpr({ type: "planner", x, y: GROUND }, group ? "idle" : "hurt", group ? t / 10 : Math.min(6, t / 12), false);
      else enemySpr({ type: k, x, y: GROUND }, "idle", t / 16 + x, fl);
    }
  });
  if (!done) {
    if (ln.n) balao(ln.n, Math.round((W - balaoMede(ln.n).w) / 2), 24, W / 2, { kind: "narra" });
    else {
      const sx = pos[ln.w] ? pos[ln.w][0] : W / 2, mm = balaoMede(ln.t), bx = clamp(Math.round(sx - mm.w / 2), 4, W - 4 - mm.w);
      balao(ln.t, bx, GROUND - 92 - mm.h, sx, { line: ln.w === "carlos" ? "#243a8c" : ln.w === "francisco" ? "#6a3a10" : "#12081c", pop: FIN.lt < 6 ? 0.6 + FIN.lt * 0.07 : 1 });
    }
    if ((t >> 5) & 1) text("PRIME ENTER", W - 8, H - 12, "#ffe27a", 1, "right", true);
  }
  if (FIN.photo > 0) {
    FIN.photo--; ctx.fillStyle = "#fff";
    ctx.fillRect(-OX, -OY, VW, 8); ctx.fillRect(-OX, -OY, 8, VH); ctx.fillRect(W + OX - 8, -OY, 8, VH); ctx.fillRect(-OX, H - 26, VW, 26);
  }
  if (done) {
    FIN.credits++;
    const a = Math.min(1, FIN.credits / 90);
    ctx.fillStyle = "rgba(18,8,28," + (0.82 * a) + ")"; ctx.fillRect(-OX, -OY, VW, VH);
    ctx.globalAlpha = a;
    text("FIM", W / 2, 22, "#ffe27a", 4, "center");
    text("CAOS NO CASAMENTO", W / 2, 66, "#fff", 2, "center");
    PIECES.forEach((pi, k) => spr(IMG.itens, pi * 16, 0, 16, 16, W / 2 - 66 + k * 22, 90 + Math.sin(FIN.credits * 0.08 + k) * 2));
    text("TODO O MATERIAL RECUPERADO!", W / 2, 118, "#9be59b", 1, "center");
    G.players.forEach((p, i) => text(CHAR[p.ch].name + "  " + String(p.score).padStart(6, "0") + "   CARTÕES: " + p.items.cartao, W / 2, 140 + i * 14, "#c9c0e8", 1, "center"));
    text("OBRIGADO POR JOGARES!", W / 2, 178, "#ffe27a", 1, "center");
    if ((FIN.credits >> 5) & 1) text("PRIME ENTER", W / 2, 200, "#fff", 1, "center");
    ctx.globalAlpha = 1;
    if (m.ok && FIN.credits > 120) fimDePartida();
  }
}

function startInterlude() { IL = { i: G.world, line: 0, ch: 0 }; music("mapa"); setPhase("interlude"); }

const mapXY2 = (lon, lat) => [(115 + (lon + 9.5) * 41) * 0.558, (40 + (42.15 - lat) * 59) * 0.583];
function drawInterlude() {
  const m = menuInput(), t = phaseT, i = IL.i;
  if (OX > 0) {   // mapa so tem 384 px: laterais espelhadas e escurecidas
    ctx.save(); ctx.scale(-1, 1); di(IMG.mapa_pl, 0, 0); ctx.restore();
    ctx.save(); ctx.translate(2 * W, 0); ctx.scale(-1, 1); di(IMG.mapa_pl, 0, 0); ctx.restore();
    ctx.fillStyle = "rgba(10,6,24,.5)"; ctx.fillRect(-OX, 0, OX, H); ctx.fillRect(W, 0, OX, H);
  }
  if (OY > 0) { ctx.save(); ctx.scale(1, -1); di(IMG.mapa_pl, 0, 0); ctx.restore(); ctx.fillStyle = "rgba(10,6,24,.5)"; ctx.fillRect(-OX, -OY, VW, OY); }
  di(IMG.mapa_pl, 0, 0);
  const pts = WORLDS.map((w, k) => { const [px, py] = mapXY2(w.lon, w.lat); return [Math.round(px + (k === 5 ? 5 : 0)), Math.round(py + (k === 5 ? 4 : 0))]; });
  // percurso (pontos)
  for (let k = 0; k <= Math.min(i, 4); k++) {
    const a = pts[k], b = pts[k + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(d / 4);
    for (let j = 1; j < n; j++) { ctx.fillStyle = k < i ? "#8a1228" : ((t >> 3) & 1 ? "#e03060" : "#8a1228"); ctx.fillRect(Math.round(a[0] + (b[0] - a[0]) * j / n), Math.round(a[1] + (b[1] - a[1]) * j / n), 2, 2); }
  }
  pts.forEach((p, k) => {
    if (k > i + 1) return;
    const done = k <= i, nxt = k === i + 1;
    ctx.fillStyle = "#12081c"; ctx.fillRect(p[0] - 4, p[1] - 4, 8, 8);
    ctx.fillStyle = done ? "#ffe27a" : ((t >> 3) & 1 ? "#ff6a8a" : "#ffffff"); ctx.fillRect(p[0] - 3, p[1] - 3, 6, 6);
    if (k < 5 || nxt) text(WORLDS[k].city, p[0] + 8, p[1] - 6 + (k === 1 ? 9 : 0), nxt ? "#ffd0dc" : "#fff", 1, "left");
  });
  // peças
  text("NÍVEL " + (i + 1) + " COMPLETO", 190, 8, "#fff");
  PIECES.forEach((pi, k) => {
    ctx.save(); ctx.globalAlpha = k <= i ? 1 : 0.28;
    spr(IMG.itens, pi * 16, 0, 16, 16, 190 + k * 22, 24); ctx.restore();
  });
  // os noivos e os heróis, virados para o mapa
  const L = INTERLUDE[i] || [];
  const cur = IL.line < L.length ? L[IL.line] : null;
  const figs = [["noiva", 190], ["noivo", 232], ["carlos", 284], ["francisco", 332]];
  figs.forEach(([k, x], n) => {
    const bob = 0, y = 176;
    shadow(x, y, 12, 0.4);
    if (k === "noiva" || k === "noivo") {
      enemySpr({ type: k, x, y }, "idle", t / 45 + n * 2, true);
      for (let d = 0; d < 2; d++) { const dy = ((t * 0.5 + d * 11 + n * 7) % 24); ctx.fillStyle = "#4aa0ff"; ctx.fillRect(Math.round(x - 14 + d * 24), Math.round(y - 66 + dy), 2, 3); }
    } else actor(k, 0, "idle", t / 9 + n, x, y + bob, true);
  });
  // fala em balão por cima de quem fala
  if (cur) {
    const who = cur[0], line = cur[1], px = (figs.find(f => f[0] === who.toLowerCase()) || [0, 260])[1];
    const mm = balaoMede(line), bx = clamp(Math.round(px - mm.w / 2), 150, W - 6 - mm.w);
    balao(line, bx, 96 - mm.h, px, { reveal: Math.max(0, IL.ch - (who.length + 2)), line: who === "CARLOS" ? "#243a8c" : who === "FRANCISCO" ? "#6a3a10" : "#12081c" });
    if (t % 2 === 0) IL.ch++;
    const full = who.length + 2 + line.length;
    if (m.ok) { if (IL.ch < full) IL.ch = full; else { IL.line++; IL.ch = 0; sfx("blip", .4); } }
  } else {
    if ((t >> 5) & 1) text("PRIME ENTER", W - 12, 208, "#ffe27a", 1, "right");
    if (m.ok) {
      if (i + 1 < IMPLEMENTED) { sfx("start", .6); startGame(i + 1); } else { setPhase("clear"); }
    }
  }
}

/* ============================================================
   LOOP PRINCIPAL
   ============================================================ */
function drawBoot() {
  ctx.fillStyle = "#12081c"; ctx.fillRect(-OX, -OY, VW, VH);
  for (let y = -8 * Math.ceil(OY / 8); y < H; y += 8) { ctx.fillStyle = (y / 8) % 2 ? "#1c1238" : "#161030"; ctx.fillRect(-OX, y, VW, 8); }
  const b = Math.sin(phaseT * 0.05) * 2;
  text("CAOS NO", W / 2, 44 + b, "#ffe27a", 4, "center");
  text("CASAMENTO", W / 2, 78 + b, "#ff9bb0", 4, "center");
  if (loaded < total) {
    const w = 160, x = (W - w) / 2, y = 150;
    ctx.fillStyle = "#12081c"; ctx.fillRect(x - 2, y - 2, w + 4, 12); ctx.fillStyle = "#2a2058"; ctx.fillRect(x, y, w, 8);
    ctx.fillStyle = "#ffe27a"; ctx.fillRect(x, y, Math.round(w * loaded / total), 8);
    text("A CARREGAR...", W / 2, 166, "#c9c0e8", 1, "center");
    return;
  }
  text("CARLOS & FRANCISCO", W / 2, 124, "#fff", 1, "center");
  text("BETA " + (window.VERSAO || "dev"), W - 6, H - 12, "#6a5a9a", 1, "right");
  if ((phaseT >> 5) & 1) text("PRIME ENTER PARA COMEÇAR", W / 2, 160, "#ffe27a", 1, "center");
  if (edge.Enter || edge.Space || padState(0).start) {
    sfx("start", .5);
    // atalhos de teste: ?ecra=regras | mapa | selfie | final  (+ &nivel=N)
    const q = new URLSearchParams(location.search), ecra = q.get("ecra"), nv = Math.max(1, Math.min(IMPLEMENTED, parseInt(q.get("nivel")) || 1)) - 1;
    numPlayers = 2; chosen = ["carlos", "francisco"];
    if (ecra === "regras") startRegras(false);
    else if (ecra === "mapa") { startGame(nv); startInterlude(); }
    else if (ecra === "selfie") { startGame(nv); startSelfie(); }
    else if (ecra === "final") { startGame(IMPLEMENTED - 1); startFinal(); }
    else cutStart();
  }
}

function render() {
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(OX, OY);
  if (shake > 0) { ctx.translate(Math.round(rnd(-1, 1) * Math.min(shake, 6)), Math.round(rnd(-1, 1) * Math.min(shake, 6))); shake--; }
  switch (phase) {
    case "boot": drawBoot(); break;
    case "intro": drawIntro();
      if (phaseT > 20 && (edge.Escape || window.__saltar || (edge.Enter && phaseT > 36 * 60))) { window.__saltar = false; music("titulo"); depoisDaCutscene(); }
      break;
    case "title": drawTitle(); break;
    case "select": drawSelect(); break;
    case "play": {
      if (!paused) { if (hitStop > 0) hitStop--; else updateLevel(); }
      ctx.save(); ctx.translate(-hp(G.cam), 0);
      ctx.restore();
      drawBackground();
      ctx.save(); ctx.translate(-hp(G.cam), 0);
      for (const pl of G.plats) { const wdp = WORLDS[G.world]; if (wdp.ground) drawPlatformPL(wdp, pl); else spr(IMG[wdp.platImg || "plataformas"], pl.type === "banco" ? 0 : 50, 0, pl.type === "banco" ? 48 : 44, 16, pl.x, pl.y - 4); }
      drawItems(); drawEnemies(); drawPlayers();
      ctx.restore();
      drawParts(); drawWind();
      drawBubbles();
      drawHUD();
      if (paused) {
        const pm = menuInput(); pauseT++;
        const opcoes = ["CONTINUAR", window.TOQUE && pauseSel === 1 ? "TOCA DE NOVO: SAIR" : "SAIR DO JOGO"];
        const sair = () => { paused = false; pauseSel = 0; music("titulo"); setPhase("title"); };
        if (pm.up || pm.down) { pauseSel = (pauseSel + (pm.down ? 1 : opcoes.length - 1)) % opcoes.length; sfx("blip", .3); }
        ctx.fillStyle = "rgba(10,6,24,.62)"; ctx.fillRect(-OX, -OY, VW, VH);
        ctx.fillStyle = "rgba(10,6,24,.85)"; ctx.fillRect(W / 2 - 100, 62, 200, 100); ctx.strokeStyle = "#ffe27a"; ctx.lineWidth = 1; ctx.strokeRect(W / 2 - 99.5, 62.5, 199, 99);
        text("PAUSA", W / 2, 70, "#ffe27a", 3, "center");
        opcoes.forEach((o, k) => {
          const y = 104 + k * 24, sel = k === pauseSel;
          if (window.TOQUE) { ctx.fillStyle = sel ? "#4a3a8a" : "#2a2058"; ctx.fillRect(W / 2 - 84, y - 5, 168, 20); ctx.strokeStyle = sel ? "#ffe27a" : "#4a3a8a"; ctx.strokeRect(W / 2 - 83.5, y - 4.5, 167, 19); }
          text((!window.TOQUE && sel ? "> " : "") + o, W / 2, y, sel ? "#ffe27a" : "#c9c0e8", 1, "center");
        });
        if (!window.TOQUE) text("ESC: CONTINUAR", W / 2, 150, "#6a5a9a", 1, "center");
        const tp = window.__tapP; window.__tapP = null;
        if (tp && pauseT > 8) {   // toque: toca numa opção
          const k = tp.y >= 99 && tp.y < 123 ? 0 : tp.y >= 123 && tp.y < 147 ? 1 : -1;
          if (k === 0) { paused = false; pauseSel = 0; }
          else if (k === 1) { if (pauseSel === 1) sair(); else { pauseSel = 1; sfx("blip", .3); } }
        }
        if (!window.TOQUE && pm.ok && pauseT > 8) { if (pauseSel === 0) paused = false; else sair(); }
        if (pm.back && !window.TOQUE && pauseT > 8) { paused = false; pauseSel = 0; }
      }
      break;
    }
    case "gameover": drawGameOver(); break;
    case "selfie": drawSelfie(); break;
    case "interlude": drawInterlude(); break;
    case "clear": drawClear(); break;
    case "final": drawFinal(); break;
    case "regras": drawRegras(); break;
    case "iniciais": drawIniciais(); break;
    case "placar": drawPlacar(); break;
  }
  ctx.restore();
  if (whiteFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, whiteFlash / 10)})`; ctx.fillRect(0, 0, VW, VH); whiteFlash--; }
}

let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) {
    acc -= 1000 / 60;
    frame++; phaseT++;
    // cutscene: segurar Enter/Espaço/seta (ou o dedo no ecrã) acelera 3x
    ACEL = phase === "intro" && phaseT > 20 && !!(keys.Enter || keys.Space || keys.ArrowRight || window.__seg);
    if (ACEL) phaseT += 2;
    if (edge.KeyV) mudaCRT();
    if (edge.KeyM) setMuted(!muted);
    if ((edge.KeyP || (edge.Escape && !paused)) && phase === "play") { paused = !paused; pauseSel = 0; pauseT = 0; }
    render();
    for (const k in edge) delete edge[k];
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// (o tema do título tem o seu próprio ficheiro em ciclo: titulo.ogg)
