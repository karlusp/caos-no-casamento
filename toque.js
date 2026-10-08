/* Controlos tácteis para telemóvel/tablet (Android). Liga-se ao sistema de teclas do jogo: `keys` e `edge` (game.js).
   Só aparece em ecrãs tácteis (ou com ?toque=1). Tocar no ecrã avança cutscenes e textos; nos menus usa-se ▲▼◄► e OK. */
(function () {
  const forcar = /[?&]toque=1/.test(location.search);
  const touch = forcar || (window.matchMedia && matchMedia("(pointer: coarse)").matches) || "ontouchstart" in window;
  window.TOQUE = !!touch;
  const wrap = document.getElementById("wrap"), cv = document.getElementById("c");
  if (!touch) return;   // no PC quem trata do tamanho da janela é o game.js (resize)
  // ---- escala: ocupa o ecrã todo (mantém a proporção 768x448) ----
  function fit() {
    const vw = typeof VW !== "undefined" ? VW : 384;   // largura visivel do jogo (game.js): estende-se em ecras mais largos
    const vh = typeof VH !== "undefined" ? VH : 224;
    let s = Math.min(vpW() / vw, vpH() / vh);
    cv.style.width = Math.floor(vw * s) + "px"; cv.style.height = Math.floor(vh * s) + "px";
    document.getElementById("crt").style.width = cv.style.width; document.getElementById("crt").style.height = cv.style.height;
  }
  window.__fit = fit; if (window.visualViewport) visualViewport.addEventListener("resize", fit);
  addEventListener("resize", fit); addEventListener("orientationchange", () => setTimeout(fit, 200)); fit();
  if (!touch) return;
  // ---- barras laterais (ecrãs mais largos que 16:9): em vez de preto, um reflexo desfocado do jogo ----
  const bgc = document.createElement("canvas"); bgc.width = 64; bgc.height = 32;
  bgc.style.cssText = "position:fixed;left:-5vw;top:-5vh;width:110vw;height:110vh;z-index:0;filter:blur(14px) brightness(.5) saturate(1.2);pointer-events:none";
  document.body.insertBefore(bgc, document.body.firstChild);
  wrap.style.zIndex = "1";
  const bctx = bgc.getContext("2d");
  // o reflexo desfocado só é preciso (e só se desenha) quando sobram faixas à volta do jogo; senão pesa muito no iPad
  setInterval(() => {
    const r = cv.getBoundingClientRect(), sobra = innerWidth - r.width > 24 || innerHeight - r.height > 24;
    bgc.style.display = sobra ? "block" : "none";
    if (!sobra) return;
    try { bctx.drawImage(cv, 0, 0, 64, 32); } catch (e) { /* ignora */ }
  }, 120);
  document.addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("gesturestart", e => e.preventDefault());
  // iPad/iPhone (Safari ignora user-scalable=no): sem zoom por toque duplo, pinça ou arrastar
  ["gesturechange", "gestureend"].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));
  document.addEventListener("touchstart", e => { if (e.touches.length > 1 || !(e.target.closest && e.target.closest(".b"))) e.preventDefault(); }, { passive: false });
  document.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
  let ultimoToque = 0;
  document.addEventListener("touchend", e => { const t = Date.now(); if (t - ultimoToque < 400) e.preventDefault(); ultimoToque = t; }, { passive: false });
  document.addEventListener("dblclick", e => e.preventDefault());
  // ---- ecrã inteiro + horizontal no primeiro toque ----
  let fs = false;
  function ecraInteiro() {
    if (fs) return; fs = true;
    try { const el = document.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el); } catch (e) { /* ignora */ }
    try { screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape").catch(() => {}); } catch (e) { /* ignora */ }
    setTimeout(fit, 300);
  }
  // ---- botões ----
  const css = document.createElement("style");
  css.textContent = `
  #tq{position:fixed;inset:0;pointer-events:none;z-index:50;font-family:monospace;-webkit-user-select:none;user-select:none;touch-action:none}
  #tq .b{position:absolute;pointer-events:auto;touch-action:none;display:flex;align-items:center;justify-content:center;border-radius:50%;
    background:rgba(255,255,255,.16);border:3px solid rgba(255,255,255,.55);color:#fff;font-weight:bold;text-shadow:0 1px 3px #000;opacity:.3;transition:opacity .08s}
  #tq .b.on{background:rgba(255,226,122,.55);border-color:#ffe27a;opacity:.7}
  #tq .b small{font-size:.42em;position:absolute;bottom:-1.4em;white-space:nowrap;opacity:.9}
  #tq .m{display:none}`;
  document.head.appendChild(css);
  const root = document.createElement("div"); root.id = "tq"; document.body.appendChild(root);
  const U = Math.max(56, Math.min(96, Math.round(Math.min(innerWidth, innerHeight) * 0.2)));   // tamanho base
  const SVG_PAUSA = '<svg viewBox="0 0 24 24" width="52%" height="52%"><rect x="6" y="4" width="4.5" height="16" rx="1" fill="#fff"/><rect x="13.5" y="4" width="4.5" height="16" rx="1" fill="#fff"/></svg>';
  const ALT = '<path d="M3 9v6h4l5 4V5L7 9H3z" fill="#fff"/>';
  const SVG_SOM = '<svg viewBox="0 0 24 24" width="58%" height="58%">' + ALT + '<path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  const SVG_MUDO = '<svg viewBox="0 0 24 24" width="58%" height="58%">' + ALT + '<path d="M16 9l5 6M21 9l-5 6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>';
  const defs = [
    // id, rótulo, tecla, modo (j = jogo, m = menus), posição css
    ["esq", "◄", "ArrowLeft", "jm", { left: "3vw", bottom: "10vh" }, 1.0],
    ["dir", "►", "ArrowRight", "jm", { left: "calc(3vw + " + (U * 1.25) + "px)", bottom: "10vh" }, 1.0],
    ["cima", "▲", "ArrowUp", "m", { left: "calc(3vw + " + (U * 0.62) + "px)", bottom: "calc(10vh + " + (U * 1.2) + "px)" }, 1.0],
    ["baixo", "▼", "ArrowDown", "m", { left: "calc(3vw + " + (U * 0.62) + "px)", bottom: "calc(10vh - " + (U * 0.05) + "px)", display: "none" }, 1.0],
    ["ok", "OK", "Enter", "m", { right: "4vw", bottom: "12vh" }, 1.35],
    ["pulo", "A", "KeyZ", "j", { right: "calc(4vw + " + (U * 2.2) + "px)", bottom: "9vh" }, 1.0, "SALTO"],
    ["golpe", "B", "KeyX", "j", { right: "calc(4vw + " + (U * 1.1) + "px)", bottom: "calc(9vh + " + (U * 0.9) + "px)" }, 1.15, "GOLPE"],
    ["esp", "C", "KeyC", "j", { right: "4vw", bottom: "9vh" }, 1.0, "ESPECIAL"],
    ["pausa", SVG_PAUSA, "KeyP", "j", { right: "3vw", top: "3vh" }, 0.46],
    ["som", SVG_SOM, "KeyM", "j", { right: "calc(3vw + " + (U * 0.46 * 1.3) + "px)", top: "3vh" }, 0.46],
  ];
  const btns = [];
  defs.forEach(([id, lab, code, modo, pos, sc, sub]) => {
    const d = document.createElement("div"); d.className = "b " + (modo === "m" ? "m" : ""); d.dataset.modo = modo; d.id = "tq_" + id;
    const sz = Math.round(U * sc); d.style.width = d.style.height = sz + "px"; d.style.fontSize = Math.round(sz * 0.42) + "px";
    Object.assign(d.style, pos); d.innerHTML = lab + (sub ? "<small>" + sub + "</small>" : "");
    const ativos = new Set();
    const down = e => { e.preventDefault(); ecraInteiro(); try { d.setPointerCapture(e.pointerId); } catch (x) { /* ponteiro simulado */ } ativos.add(e.pointerId);
      if (!keys[code]) edge[code] = true; keys[code] = true; d.classList.add("on"); };
    const up = e => { ativos.delete(e.pointerId); if (!ativos.size) { keys[code] = false; d.classList.remove("on"); } };
    d.addEventListener("pointerdown", down); d.addEventListener("pointerup", up); d.addEventListener("pointercancel", up); d.addEventListener("lostpointercapture", up);
    root.appendChild(d); btns.push(d);
  });
  // baixo fica logo ao lado da seta de cima no mesmo bloco em cruz
  const baixo = document.getElementById("tq_baixo"); baixo.style.display = ""; baixo.style.bottom = "calc(10vh - " + Math.round(U * 0.0) + "px)";
  baixo.style.left = "calc(3vw + " + Math.round(U * 2.5) + "px)";
  // ---- mostrar os botões certos consoante a fase do jogo ----
  function modo() {
    const p = typeof phase !== "undefined" ? phase : "";
    if (p === "play" && typeof paused !== "undefined" && paused) {   // pausa: o toque escolhe uma opção do menu
      const r = cv.getBoundingClientRect();
      window.__tapP = { x: (e.clientX - r.left) / r.width * VW - OX, y: (e.clientY - r.top) / r.height * VH - OY };
      return;
    }
    const jogo = p === "play", menu = p === "title" || p === "select" || p === "gameover" || p === "iniciais";
    btns.forEach(b => {
      const m = b.dataset.modo; b.style.display = (m.includes("j") && jogo) || (m.includes("m") && menu) ? "flex" : "none";
    });
  }
  let ultimoMudo = null;
  function iconeSom() {
    const m = typeof muted !== "undefined" && muted;
    if (m === ultimoMudo) return; ultimoMudo = m;
    const b = document.getElementById("tq_som"); if (b) b.innerHTML = m ? SVG_MUDO : SVG_SOM;
  }
  setInterval(() => { modo(); iconeSom(); }, 120); modo();
  // ---- tocar em qualquer sítio avança (menos nos menus de escolha, onde se usa OK) ----
  document.addEventListener("pointerdown", e => {
    ecraInteiro();
    if (e.target.closest && e.target.closest(".b")) return;
    const p = typeof phase !== "undefined" ? phase : "";
    if (p === "play" || p === "title" || p === "select" || p === "gameover" || p === "iniciais") return;
    if (p === "intro") {   // cutscene: segurar acelera 3x; o canto inferior direito salta
      if (e.clientX > innerWidth * 0.78 && e.clientY > innerHeight * 0.8) window.__saltar = true; else window.__seg = true;
      return;
    }
    if (!keys.Enter) edge.Enter = true;
    keys.Enter = true; setTimeout(() => { keys.Enter = false; }, 90);
  });
  const soltar = () => { window.__seg = false; };
  document.addEventListener("pointerup", soltar); document.addEventListener("pointercancel", soltar);
})();
