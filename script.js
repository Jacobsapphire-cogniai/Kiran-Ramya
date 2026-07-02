/* ============================================================
   Kiran & Ramya — Wedding site interactions
   ============================================================ */

/* ---------- helpers ---------- */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- preloader ---------- */
window.addEventListener("load", () => {
  setTimeout(() => $("#preloader").classList.add("done"), 900);
});

/* ---------- nav: scroll state + mobile toggle ---------- */
const nav = $("#nav");
const navToggle = $("#navToggle");
const navLinks = $("#navLinks");
addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 60), { passive: true });
navToggle.addEventListener("click", () => {
  const open = navToggle.classList.toggle("open");
  navLinks.classList.toggle("open", open);
  navToggle.setAttribute("aria-expanded", String(open));
});
$$(".nav__links a").forEach(a => a.addEventListener("click", () => {
  navToggle.classList.remove("open");
  navLinks.classList.remove("open");
  navToggle.setAttribute("aria-expanded", "false");
}));

/* ---------- smooth anchor scroll ---------- */
$$("[data-scroll]").forEach(a => {
  a.addEventListener("click", e => {
    const target = $(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
  });
});

/* ---------- scroll progress bar ---------- */
const progress = $("#scrollProgress");
addEventListener("scroll", () => {
  const h = document.documentElement;
  const pct = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
  progress.style.width = pct + "%";
}, { passive: true });

/* ---------- reveal on scroll ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  });
}, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
$$(".reveal-section").forEach((el, i) => { el.style.setProperty("--i", i % 6); io.observe(el); });

/* ---------- parallax ---------- */
const parallaxEls = $$("[data-parallax]");
if (!prefersReduced) {
  addEventListener("scroll", () => {
    parallaxEls.forEach(el => {
      const rect = el.parentElement.getBoundingClientRect();
      const speed = 0.18;
      const offset = (rect.top + rect.height / 2 - innerHeight / 2) * -speed;
      el.style.transform = `translateY(${offset}px)`;
    });
  }, { passive: true });
}

/* ---------- gallery lightbox ---------- */
const items = $$(".gallery__item");
const lb = $("#lightbox");
const lbImg = $("#lbImg");
const lbCaption = $("#lbCaption");
const lbCounter = $("#lbCounter");
let current = 0;
function openLb(i) {
  current = (i + items.length) % items.length;
  const item = items[current];
  lbImg.src = item.dataset.full;
  const cap = item.querySelector("figcaption");
  const img = item.querySelector("img");
  if (lbCaption) lbCaption.textContent = cap ? cap.textContent : (img ? img.alt : "");
  if (lbImg) lbImg.alt = img ? img.alt : "";
  if (lbCounter) lbCounter.textContent = (current + 1) + " / " + items.length;
  lb.classList.add("open");
  lb.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  // warm the cache for the neighbours so arrows feel instant
  [current - 1, current + 1].forEach(n => {
    const nb = items[(n + items.length) % items.length];
    new Image().src = nb.dataset.full;
  });
}
function closeLb() {
  lb.classList.remove("open");
  lb.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
items.forEach((it, i) => it.addEventListener("click", () => openLb(i)));
$("#lbClose").addEventListener("click", closeLb);
$("#lbPrev").addEventListener("click", () => openLb(current - 1));
$("#lbNext").addEventListener("click", () => openLb(current + 1));
lb.addEventListener("click", e => { if (e.target === lb) closeLb(); });
addEventListener("keydown", e => {
  if (!lb.classList.contains("open")) return;
  if (e.key === "Escape") closeLb();
  if (e.key === "ArrowLeft") openLb(current - 1);
  if (e.key === "ArrowRight") openLb(current + 1);
});

/* ---------- background music ---------- */
(function music(){
  const audio = $("#bgm");
  const btn = $("#musicBtn");
  if (!audio || !btn) return;
  audio.volume = 0.55;
  let playing = false;
  btn.classList.add("idle");

  function setPlaying(on){
    playing = on;
    btn.classList.toggle("playing", on);
    if (on) btn.classList.remove("idle");
    btn.setAttribute("aria-label", on ? "Pause music" : "Play music");
  }
  function play(){ return audio.play().then(() => setPlaying(true)).catch(() => {}); }
  function pause(){ audio.pause(); setPlaying(false); }

  btn.addEventListener("click", e => { e.preventDefault(); playing ? pause() : play(); });

  // Try immediately on open (usually blocked on a cold first visit — the fallback below covers it)
  play();
  addEventListener("DOMContentLoaded", play);
  window.addEventListener("load", play);
  audio.addEventListener("canplaythrough", () => { if (!playing) play(); }, { once: true });

  // Start on the FIRST genuine interaction — the wheel / pointer / touch / key that drives a scroll.
  // (A bare "scroll" event isn't a valid autoplay gesture, so we watch the inputs that cause it.)
  // Crucially, we only stop listening once playback ACTUALLY succeeds — a blocked attempt never
  // disables future tries, so scrolling first can't leave the button as the only thing that works.
  const GESTURES = ["pointerdown", "mousedown", "touchstart", "touchend", "wheel", "keydown", "scroll", "click"];
  function tryStart(e){
    if (playing) return;
    if (e && btn.contains(e.target)) return; // let the button's own handler manage its clicks
    audio.play().then(() => {
      setPlaying(true);
      GESTURES.forEach(ev => removeEventListener(ev, tryStart));
    }).catch(() => { /* not a qualifying gesture yet — keep listening */ });
  }
  GESTURES.forEach(ev => addEventListener(ev, tryStart, { passive: true }));

  // Pause when the tab is hidden, resume when it returns (if it was playing)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && playing) audio.pause();
    else if (!document.hidden && playing) audio.play().catch(() => {});
  });

  // ----- welcome veil: first scroll / tap / click / key dissolves it
  //       and that same gesture is what unlocks the music -----
  const veil = $("#enterOverlay");
  if (veil) {
    let dismissed = false;
    function enter() {
      if (dismissed) return;
      dismissed = true;
      play(); // touchend / click / keydown gestures unlock audio here
      veil.classList.add("done");
      GESTS.forEach(ev => removeEventListener(ev, enter));
      setTimeout(() => veil.remove(), 1200);
    }
    // NOTE: no bare "scroll" here — browsers can fire it on load (scroll
    // restoration) which would dismiss the veil without a real gesture.
    const GESTS = ["wheel", "touchend", "pointerdown", "keydown"];
    GESTS.forEach(ev => addEventListener(ev, enter, { passive: true }));
  }
})();

/* ---------- cursor butterflies ---------- */
(function butterflies(){
  if (prefersReduced) return;
  if (matchMedia("(pointer: coarse)").matches) return; // skip touch devices

  const PALETTE = [
    { light: "#FCE6EB", deep: "#E7A9B6", edge: "#C56E7E" }, // blush
    { light: "#DCEBF6", deep: "#9CC6DE", edge: "#5E96B4" }, // sky
    { light: "#F3E7C4", deep: "#D9BB6B", edge: "#B08A2E" }, // gold
  ];
  const BODY = "#4A3A3F";

  // a detailed butterfly: gradient fore/hind wings, spots, segmented body, antennae
  function butterflySVG(i, p) {
    const g = "bfg" + i;
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="${g}" cx="50%" cy="42%" r="62%">
          <stop offset="0%" stop-color="${p.light}"/>
          <stop offset="100%" stop-color="${p.deep}"/>
        </radialGradient>
      </defs>
      <g class="w-l">
        <path d="M49,45 C40,27 17,13 8,22 C3,31 14,44 30,46 C40,47 46,47 48,48 Z" fill="url(#${g})" stroke="${p.edge}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M48,50 C32,52 15,58 18,69 C21,81 37,82 43,72 C47,65 49,58 48,50 Z" fill="url(#${g})" stroke="${p.edge}" stroke-width="1.4" stroke-linejoin="round"/>
        <circle cx="21" cy="28" r="2.7" fill="${p.edge}" opacity=".55"/>
        <circle cx="30" cy="66" r="3.1" fill="${p.light}" opacity=".85"/>
      </g>
      <g class="w-r">
        <path d="M51,45 C60,27 83,13 92,22 C97,31 86,44 70,46 C60,47 54,47 52,48 Z" fill="url(#${g})" stroke="${p.edge}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M52,50 C68,52 85,58 82,69 C79,81 63,82 57,72 C53,65 51,58 52,50 Z" fill="url(#${g})" stroke="${p.edge}" stroke-width="1.4" stroke-linejoin="round"/>
        <circle cx="79" cy="28" r="2.7" fill="${p.edge}" opacity=".55"/>
        <circle cx="70" cy="66" r="3.1" fill="${p.light}" opacity=".85"/>
      </g>
      <ellipse cx="50" cy="50" rx="2.7" ry="9" fill="${BODY}"/>
      <ellipse cx="50" cy="63" rx="1.9" ry="11" fill="${BODY}"/>
      <circle cx="50" cy="34" r="3" fill="${BODY}"/>
      <path d="M49,32 C45,24 43,19 40,14" stroke="${BODY}" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <path d="M51,32 C55,24 57,19 60,14" stroke="${BODY}" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <circle cx="40" cy="13.5" r="1.7" fill="${BODY}"/>
      <circle cx="60" cy="13.5" r="1.7" fill="${BODY}"/>
    </svg>`;
  }

  const COUNT = 3;
  let mx = innerWidth / 2, my = innerHeight / 2;
  addEventListener("mousemove", e => { mx = e.clientX; my = e.clientY; }, { passive: true });

  const flock = [];
  for (let i = 0; i < COUNT; i++) {
    const el = document.createElement("div");
    el.className = "bf";
    el.innerHTML = butterflySVG(i, PALETTE[i % PALETTE.length]);
    // slightly different wing rhythm per butterfly so they don't beat in unison
    el.querySelectorAll(".w-l, .w-r").forEach(w =>
      w.style.animationDuration = (0.16 + i * 0.03) + "s");
    document.body.appendChild(el);
    flock.push({ el, x: mx, y: my, ease: 0.16 - i * 0.035, angle: 0, scale: 1 - i * 0.16 });
  }

  function loop(t) {
    let tx = mx, ty = my;
    flock.forEach((b, i) => {
      // gentle sideways drift so they never sit perfectly still
      const bob = Math.sin(t / 380 + i * 1.7) * (14 + i * 6);
      const targetX = tx + Math.cos(t / 900 + i) * 6;
      const targetY = ty + bob * 0.35;
      b.x += (targetX - b.x) * b.ease;
      b.y += (targetY - b.y) * b.ease;

      const dx = targetX - b.x, dy = targetY - b.y;
      const speed = Math.hypot(dx, dy);
      if (speed > 0.6) {
        const want = Math.atan2(dy, dx) * 180 / Math.PI + 90;
        // smooth the heading
        let diff = want - b.angle;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        b.angle += diff * 0.15;
      }
      b.el.style.transform =
        `translate(${b.x}px, ${b.y}px) translate(-50%,-50%) rotate(${b.angle}deg) scale(${b.scale})`;

      // each butterfly trails the one before it → a little flutter chain
      tx = b.x; ty = b.y;
    });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/* ---------- floating petals ---------- */
(function petals(){
  if (prefersReduced) return;
  const canvas = $("#petals");
  const ctx = canvas.getContext("2d");
  let w, h, petalArr = [];
  const COLORS = ["#F7DEE3", "#E9B9C2", "#F3EAE0", "#E3CE9B"];
  const COUNT = window.innerWidth < 700 ? 14 : 26;

  function resize(){
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels, render at device resolution
  }
  resize(); addEventListener("resize", resize);

  function rnd(a, b){ return a + Math.random() * (b - a); }

  class Petal {
    constructor(){ this.reset(true); }
    reset(initial){
      this.x = rnd(0, w);
      this.y = initial ? rnd(0, h) : rnd(-40, -10);
      this.size = rnd(6, 13);
      this.speedY = rnd(0.4, 1.2);
      this.speedX = rnd(-0.5, 0.5);
      this.spin = rnd(-0.02, 0.02);
      this.angle = rnd(0, Math.PI * 2);
      this.sway = rnd(0.5, 1.5);
      this.color = COLORS[Math.floor(Math.random()*COLORS.length)];
      this.opacity = rnd(0.35, 0.8);
    }
    update(t){
      this.y += this.speedY;
      this.x += this.speedX + Math.sin(t / 1000 + this.angle) * this.sway * 0.3;
      this.angle += this.spin;
      if (this.y > h + 20) this.reset(false);
    }
    draw(){
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      // simple petal shape
      ctx.ellipse(0, 0, this.size * 0.55, this.size, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  for (let i = 0; i < COUNT; i++) petalArr.push(new Petal());

  function loop(t){
    ctx.clearRect(0, 0, w, h);
    petalArr.forEach(p => { p.update(t); p.draw(); });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
