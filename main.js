/**********************
 * COSMIC MORPH (Premium)
 * - additive glow particles
 * - depth fade + subtle drift
 * - swirl-in morph (organic)
 * - easing + overshoot settle
 **********************/

const video = document.getElementById("video");
const statusEl = document.getElementById("status");
const setStatus = (t) => (statusEl.textContent = t);

/* =====================
   THREE.JS SCENE
===================== */
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000006, 0.06);

const camera3D = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
camera3D.position.set(0, 0, 7);

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("three"),
  alpha: true,
  antialias: true,
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0); // transparent over video

window.addEventListener("resize", () => {
  camera3D.aspect = innerWidth / innerHeight;
  camera3D.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* Subtle lighting (mostly particle glow) */
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const key = new THREE.DirectionalLight(0xffffff, 0.45);
key.position.set(3, 4, 5);
scene.add(key);

/* =====================
   PARTICLES
===================== */
const COUNT = 2200;

// base positions (current)
const pos = new Float32Array(COUNT * 3);
// targets (where to morph to)
const tgt = new Float32Array(COUNT * 3);
// per-particle phase
const phase = new Float32Array(COUNT);
// per-particle depth factor
const depth = new Float32Array(COUNT);

// initial space distribution
function randomSpace(i, spread = 34) {
  pos[i * 3] = (Math.random() - 0.5) * spread;
  pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
  pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
}

for (let i = 0; i < COUNT; i++) {
  randomSpace(i);
  tgt[i * 3] = pos[i * 3];
  tgt[i * 3 + 1] = pos[i * 3 + 1];
  tgt[i * 3 + 2] = pos[i * 3 + 2];
  phase[i] = Math.random() * Math.PI * 2;
  depth[i] = 0.4 + Math.random() * 0.6;
}

const geo = new THREE.BufferGeometry();
geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

/* Additive glow material = premium look */
const mat = new THREE.PointsMaterial({
  color: 0x9fd3ff,
  size: 0.055,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const particles = new THREE.Points(geo, mat);
scene.add(particles);

/* A second faint layer for depth richness */
const geo2 = geo.clone();
const mat2 = new THREE.PointsMaterial({
  color: 0xff7ad9,
  size: 0.03,
  transparent: true,
  opacity: 0.28,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const particles2 = new THREE.Points(geo2, mat2);
scene.add(particles2);

/* =====================
   MORPH ENGINE
===================== */
let morph = {
  active: false,
  t: 0, // 0..1
  speed: 0.02,
  swirl: 0.9,     // swirl strength
  overshoot: 0.12 // settle overshoot
};

// smoothstep easing
function easeInOut(t) {
  return t * t * (3 - 2 * t);
}

// set target helper
function setTargetXYZ(i, x, y, z) {
  tgt[i * 3] = x;
  tgt[i * 3 + 1] = y;
  tgt[i * 3 + 2] = z;
}

function beginMorph(label) {
  morph.active = true;
  morph.t = 0;
  setStatus(label);
}

/* =====================
   SHAPE TARGETS (premium)
===================== */

// Sphere (volume, not surface) -> richer look
function targetsSphere(r = 1.7) {
  for (let i = 0; i < COUNT; i++) {
    // random point inside sphere (use cubic root)
    const u = Math.random();
    const v = Math.random();
    const w = Math.random();

    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const rad = r * Math.cbrt(w);

    const x = rad * Math.sin(phi) * Math.cos(theta);
    const y = rad * Math.sin(phi) * Math.sin(theta);
    const z = rad * Math.cos(phi);

    setTargetXYZ(i, x, y, z);
  }
  beginMorph("🤏 Sphere (cosmic sculpture)");
}

// Cube volume (with denser edges)
function targetsCube(size = 2.0) {
  for (let i = 0; i < COUNT; i++) {
    // bias toward edges by mixing uniform + edge snap
    let x = (Math.random() - 0.5) * size;
    let y = (Math.random() - 0.5) * size;
    let z = (Math.random() - 0.5) * size;

    if (Math.random() < 0.35) {
      const pick = Math.floor(Math.random() * 3);
      const side = (Math.random() < 0.5 ? -1 : 1) * (size / 2);
      if (pick === 0) x = side;
      if (pick === 1) y = side;
      if (pick === 2) z = side;
    }

    setTargetXYZ(i, x, y, z);
  }
  beginMorph("☝️ Cube (edge-biased)");
}

// Heart (3D volume) using classic heart curve + thickness + jitter
function targetsHeart(scale = 0.16) {
  for (let i = 0; i < COUNT; i++) {
    const t = Math.random() * Math.PI * 2;
    const x2 = 16 * Math.pow(Math.sin(t), 3);
    const y2 = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

    // thickness volume (z) with slight bias
    const z = (Math.random() - 0.5) * 1.2 + (Math.random() - 0.5) * 0.3;

    // add micro jitter so it looks like nebula, not flat outline
    const jitter = 0.06;
    const x = x2 * scale + (Math.random() - 0.5) * jitter;
    const y = y2 * scale + (Math.random() - 0.5) * jitter;

    setTargetXYZ(i, x, y, z);
  }
  beginMorph("✋ Heart (nebula volume)");
}

// Reset to space (wide, cinematic)
function targetsSpace() {
  for (let i = 0; i < COUNT; i++) {
    // more depth range for cinematic feel
    setTargetXYZ(
      i,
      (Math.random() - 0.5) * 34,
      (Math.random() - 0.5) * 34,
      (Math.random() - 0.5) * 44
    );
  }
  beginMorph("✊ Reset (space)");
}

/* =====================
   ANIMATION LOOP
===================== */
let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 0.016;

  // slow cosmic drift (always alive)
  particles.rotation.y += 0.00045;
  particles.rotation.x += 0.00010;
  particles2.rotation.y -= 0.00025;
  particles2.rotation.x += 0.00006;

  // camera subtle breathe
  camera3D.position.z = 7 + Math.sin(time * 0.35) * 0.08;

  const p = geo.attributes.position.array;

  // morphing
  if (morph.active) {
    morph.t = Math.min(1, morph.t + morph.speed);
    const e = easeInOut(morph.t);

    // overshoot curve near end (premium settle)
    const settle = morph.t < 0.92
      ? 1
      : 1 + (Math.sin((morph.t - 0.92) * Math.PI * 10) * (1 - morph.t) * morph.overshoot);

    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      const x = p[ix], y = p[ix + 1], z = p[ix + 2];

      // swirl-in: rotate around z-axis while moving inward
      const angle = (1 - e) * morph.swirl + phase[i] * 0.02;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const tx = tgt[ix];
      const ty = tgt[ix + 1];
      const tz = tgt[ix + 2];

      // move toward target
      const nx = x + (tx - x) * (0.07 + 0.06 * e) * settle;
      const ny = y + (ty - y) * (0.07 + 0.06 * e) * settle;
      const nz = z + (tz - z) * (0.07 + 0.06 * e) * settle;

      // apply subtle swirl (cheap look killer)
      p[ix]     = nx * cosA - ny * sinA;
      p[ix + 1] = nx * sinA + ny * cosA;
      p[ix + 2] = nz;
    }

    if (morph.t >= 1) morph.active = false;
    geo.attributes.position.needsUpdate = true;
    geo2.attributes.position.needsUpdate = true;
  } else {
    // idle shimmer: tiny noise so it never looks static/cheap
    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      p[ix]     += Math.sin(time * 0.9 + phase[i]) * 0.00035 * depth[i];
      p[ix + 1] += Math.cos(time * 0.8 + phase[i]) * 0.00035 * depth[i];
    }
    geo.attributes.position.needsUpdate = true;
    geo2.attributes.position.needsUpdate = true;
  }

  renderer.render(scene, camera3D);
}
animate();

/* =====================
   HAND TRACKING (MediaPipe)
===================== */
function fingerStates(lm) {
  const indexUp = lm[8].y < lm[6].y;
  const middleUp = lm[12].y < lm[10].y;
  const ringUp = lm[16].y < lm[14].y;
  const pinkyUp = lm[20].y < lm[18].y;
  return { indexUp, middleUp, ringUp, pinkyUp };
}

function dist2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function classify(lm) {
  const { indexUp, middleUp, ringUp, pinkyUp } = fingerStates(lm);
  const upCount = [
