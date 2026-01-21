/* ==================================================
   ECHO — Fragments of Light (Phase 1)
   FINAL: iOS/Android touch-safe + rotate-safe + import-safe
   ================================================== */

// ---- Three import (LOCAL first, then CDN) ----
// Put three.module.js next to main.js if you want OFFLINE.
// If you don't have it, it will try CDN.
let THREE;
try {
  THREE = await import("./three.module.js");
} catch {
  THREE = await import("https://unpkg.com/three@0.160.0/build/three.module.js");
}

// ---------------- DOM ----------------
const canvas = document.getElementById("c");
const hintEl = document.getElementById("hint");

const menuEl = document.getElementById("menu");
const endEl = document.getElementById("end");
const rotateEl = document.getElementById("rotate");

const btnPlay = document.getElementById("btnPlay");
const btnReplay = document.getElementById("btnReplay");
const btnRestart = document.getElementById("btnRestart");

const joy = document.getElementById("joy");
const joyDot = document.getElementById("joyDot");
const camZone = document.getElementById("camZone");
const btnInteract = document.getElementById("btnInteract");
const endTextEl = document.getElementById("endText");

// ---------------- Utils ----------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (c, t, l, dt) => c + (t - c) * (1 - Math.exp(-l * dt));
const v3 = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);

// ---------------- State ----------------
const GameState = { MENU: 0, PLAYING: 1, END: 2 };
let state = GameState.MENU;

let opened = false;
let canInteract = false;

// ---------------- Orientation (WARNING-ONLY; NEVER BLOCKS) ----------------
function orientationCheckSoft() {
  // tolerant check so iOS won’t get stuck
  const landscape = window.innerWidth >= window.innerHeight * 0.9;
  rotateEl.classList.toggle("hide", landscape);
}
window.addEventListener("resize", orientationCheckSoft, { passive: true });
window.addEventListener("orientationchange", orientationCheckSoft);

// ---------------- Renderer ----------------
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setClearColor(0x070a12, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

// ---------------- Scene / Camera ----------------
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x070a12, 8, 38);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 120);
const camPos = new THREE.Vector3();
const camTarget = new THREE.Vector3();

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize, { passive: true });
resize();

// ---------------- Lighting (cheap cinematic) ----------------
scene.add(new THREE.HemisphereLight(0x7aa7ff, 0x0b1022, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(6, 10, 4);
scene.add(sun);

// ---------------- Ground ----------------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: 0x0b1022, roughness: 1.0, metalness: 0.0 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// subtle “path”
const path = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 4),
  new THREE.MeshStandardMaterial({
    color: 0x0f1836,
    roughness: 1.0,
    emissive: 0x05060a,
    emissiveIntensity: 0.45,
  })
);
path.rotation.x = -Math.PI / 2;
path.position.set(10, 0.01, 0);
scene.add(path);

// ---------------- Particles (cheap points) ----------------
const starCount = 260;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  starPos[i * 3 + 0] = (Math.random() * 2 - 1) * 40;
  starPos[i * 3 + 1] = Math.random() * 10 + 1;
  starPos[i * 3 + 2] = (Math.random() * 2 - 1) * 40;
}
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.55 })
);
scene.add(stars);

// ---------------- Player ----------------
const player = new THREE.Group();
scene.add(player);

const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.28, 0.72, 6, 10),
  new THREE.MeshStandardMaterial({
    color: 0x1c2448,
    emissive: 0x050913,
    emissiveIntensity: 0.35,
    roughness: 0.6,
    metalness: 0.08,
  })
);
body.position.y = 0.72;
player.add(body);

const core = new THREE.Mesh(
  new THREE.SphereGeometry(0.12, 18, 18),
  new THREE.MeshStandardMaterial({
    color: 0x7aa7ff,
    emissive: 0x7aa7ff,
    emissiveIntensity: 1.1,
    roughness: 0.2,
    metalness: 0.1,
  })
);
core.position.set(0, 0.92, 0.22);
player.add(core);

player.position.set(-6, 0, 0);

// ---------------- Box + Paper ----------------
const boxGroup = new THREE.Group();
scene.add(boxGroup);
boxGroup.position.set(16, 0, 0);

const boxMat = new THREE.MeshStandardMaterial({
  color: 0x121831,
  roughness: 0.35,
  metalness: 0.12,
  emissive: 0x0a0f22,
  emissiveIntensity: 0.42,
});

const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.9), boxMat);
base.position.y = 0.275;
boxGroup.add(base);

const lidPivot = new THREE.Group();
lidPivot.position.set(0, 0.61, 0);
boxGroup.add(lidPivot);

const lid = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.12, 0.92), boxMat);
lid.position.set(0, 0, -0.46);
lidPivot.add(lid);

// glow ring
const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.65, 0.78, 42),
  new THREE.MeshBasicMaterial({ color: 0x7cffb2, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
);
ring.rotation.x = -Math.PI / 2;
ring.position.set(0, 0.02, 0);
boxGroup.add(ring);

// Paper texture (premium-ish)
const paperCanvas = document.createElement("canvas");
paperCanvas.width = 512;
paperCanvas.height = 340;
const pctx = paperCanvas.getContext("2d");

function drawPaper(text) {
  pctx.clearRect(0, 0, 512, 340);
  pctx.fillStyle = "#f3f0e8";
  pctx.fillRect(0, 0, 512, 340);

  pctx.globalAlpha = 0.12;
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 340;
    const v = Math.random() * 18;
    pctx.fillStyle = `rgb(${220+v},${216+v},${206+v})`;
    pctx.fillRect(x, y, 1, 1);
  }
  pctx.globalAlpha = 1;

  pctx.fillStyle = "#1a1a1a";
  pctx.font = "62px 'Bradley Hand','Segoe Script','Comic Sans MS',cursive";
  pctx.textAlign = "center";
  pctx.textBaseline = "middle";
  pctx.fillText(text, 256, 170);

  pctx.strokeStyle = "rgba(26,26,26,.55)";
  pctx.lineWidth = 2;
  pctx.beginPath();
  pctx.moveTo(512 * 0.22, 340 * 0.63);
  pctx.quadraticCurveTo(512 * 0.5, 340 * 0.69, 512 * 0.78, 340 * 0.63);
  pctx.stroke();
}
drawPaper("Lee Bal Kwar");

const paperTex = new THREE.CanvasTexture(paperCanvas);
paperTex.needsUpdate = true;

const paper = new THREE.Mesh(
  new THREE.PlaneGeometry(0.72, 0.48),
  new THREE.MeshBasicMaterial({ map: paperTex, transparent: true, opacity: 0.0, side: THREE.DoubleSide })
);
paper.position.set(0, 0.72, 0.0);
paper.rotation.x = -Math.PI / 2 + 0.75;
boxGroup.add(paper);

// ---------------- Camera + Movement (smooth) ----------------
let yaw = 0;
let camDistance = 3.2;
let camHeight = 1.55;

const velocity = new THREE.Vector3();
const input = { x: 0, y: 0 };
const moveSpeed = 2.4;

function updateCamera(dt) {
  const behind = v3(Math.sin(yaw) * camDistance, camHeight, Math.cos(yaw) * camDistance);
  const desiredPos = player.position.clone().add(behind);
  const desiredTarget = player.position.clone().add(v3(0, 1.0, 0));

  camPos.x = damp(camPos.x, desiredPos.x, 14, dt);
  camPos.y = damp(camPos.y, desiredPos.y, 14, dt);
  camPos.z = damp(camPos.z, desiredPos.z, 14, dt);

  camTarget.x = damp(camTarget.x, desiredTarget.x, 18, dt);
  camTarget.y = damp(camTarget.y, desiredTarget.y, 18, dt);
  camTarget.z = damp(camTarget.z, desiredTarget.z, 18, dt);

  camera.position.copy(camPos);
  camera.lookAt(camTarget);
}

function updateMovement(dt, time) {
  const forward = v3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
  const right = v3(forward.z, 0, -forward.x).normalize();

  const desired = v3()
    .addScaledVector(right, input.x)
    .addScaledVector(forward, input.y);

  if (desired.lengthSq() > 1) desired.normalize();
  const targetVel = desired.multiplyScalar(moveSpeed);

  velocity.x = damp(velocity.x, targetVel.x, 18, dt);
  velocity.z = damp(velocity.z, targetVel.z, 18, dt);

  player.position.x += velocity.x * dt;
  player.position.z += velocity.z * dt;

  player.position.x = clamp(player.position.x, -20, 24);
  player.position.z = clamp(player.position.z, -18, 18);

  const dir2 = Math.hypot(velocity.x, velocity.z);
  if (dir2 > 0.08) {
    const targetRot = Math.atan2(velocity.x, velocity.z);
    player.rotation.y = damp(player.rotation.y, targetRot, 18, dt);
  }

  core.position.y = 0.92 + Math.sin(time * 2.2) * 0.03;
}

// ---------------- Interaction ----------------
function hint(t) { hintEl.textContent = t; }

function updateInteractHint() {
  const d = player.position.distanceTo(boxGroup.position);
  canInteract = d < 2.0 && !opened;
  if (state === GameState.PLAYING && !opened) {
    hint(canInteract ? "Tap INTERACT to open the box." : "Find the glowing box.");
  }
}

function openBox() {
  opened = true;
  hint("Opening…");
  camDistance = 2.35;
  camHeight = 1.85;

  // end after reveal
  setTimeout(() => {
    state = GameState.END;
    endTextEl.textContent = "Lee Bal Kwar";
    endEl.classList.remove("hide");
    hint("—");
  }, 2200);
}

btnInteract.addEventListener("click", () => {
  if (state === GameState.PLAYING && canInteract && !opened) openBox();
});

// ---------------- Touch Controls (ROBUST) ----------------
// Joystick: pointer capture + deadzone
const joyState = { active: false, pid: null };
function joyPoint(e) {
  const r = joy.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  return { x: e.clientX - cx, y: e.clientY - cy };
}
function setJoy(dx, dy) {
  const max = 44;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len, ny = dy / len;
  const mag = clamp(len, 0, max);
  const x = nx * mag, y = ny * mag;
  joyDot.style.transform = `translate(${x}px, ${y}px)`;

  const dead = 6;
  const eff = mag < dead ? 0 : (mag - dead) / (max - dead);
  input.x = (x / max) * eff;
  input.y = (-y / max) * eff;
}

joy.addEventListener("pointerdown", (e) => {
  joy.setPointerCapture(e.pointerId);
  joyState.active = true;
  joyState.pid = e.pointerId;
  const p = joyPoint(e);
  setJoy(p.x, p.y);
});
joy.addEventListener("pointermove", (e) => {
  if (!joyState.active || joyState.pid !== e.pointerId) return;
  const p = joyPoint(e);
  setJoy(p.x, p.y);
});
joy.addEventListener("pointerup", (e) => {
  if (joyState.pid !== e.pointerId) return;
  joyState.active = false;
  joyState.pid = null;
  setJoy(0, 0);
});
joy.addEventListener("pointercancel", () => {
  joyState.active = false;
  joyState.pid = null;
  setJoy(0, 0);
});

// Camera swipe: DO NOT use movementX (iOS bug) — track manually
const camState = { active: false, pid: null, lastX: 0, lastY: 0 };
camZone.addEventListener("pointerdown", (e) => {
  if (state !== GameState.PLAYING) return;
  camZone.setPointerCapture(e.pointerId);
  camState.active = true;
  camState.pid = e.pointerId;
  camState.lastX = e.clientX;
  camState.lastY = e.clientY;
});
camZone.addEventListener("pointermove", (e) => {
  if (!camState.active || camState.pid !== e.pointerId) return;
  const dx = e.clientX - camState.lastX;
  camState.lastX = e.clientX;

  // yaw
  yaw -= dx * 0.0042;
});
camZone.addEventListener("pointerup", (e) => {
  if (camState.pid !== e.pointerId) return;
  camState.active = false;
  camState.pid = null;
});
camZone.addEventListener("pointercancel", () => {
  camState.active = false;
  camState.pid = null;
});

// Tap on canvas to open box (optional)
canvas.addEventListener("pointerdown", (e) => {
  if (state !== GameState.PLAYING) return;
  if (canInteract && !opened) {
    // quick tap anywhere if near the box
    openBox();
  }
});

// ---------------- UI ----------------
btnPlay.addEventListener("click", () => {
  menuEl.classList.add("hide");
  endEl.classList.add("hide");
  state = GameState.PLAYING;
  opened = false;
  paper.material.opacity = 0.0;
  lidPivot.rotation.x = 0;

  hint("Find the glowing box.");
  orientationCheckSoft();
});

btnReplay.addEventListener("click", () => location.reload());
btnRestart.addEventListener("click", () => location.reload());

// ---------------- Loop (60fps-safe) ----------------
let last = performance.now();
let time = 0;
const ringMat = ring.material;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  time += dt;

  // idle cinematic drift in menu
  if (state === GameState.MENU) {
    yaw += dt * 0.08;
    hint("Ready. Press PLAY.");
  }

  // ambient
  stars.rotation.y += dt * 0.02;
  ring.rotation.z += dt * 0.6;
  ringMat.opacity = 0.25 + (Math.sin(time * 2.2) + 1) * 0.08;

  if (state === GameState.PLAYING) {
    updateMovement(dt, time);
    updateInteractHint();

    if (opened) {
      // lid open + paper reveal
      lidPivot.rotation.x = damp(lidPivot.rotation.x, -1.35, 6, dt);
      paper.material.opacity = damp(paper.material.opacity, 1.0, 6, dt);
      paper.position.y = damp(paper.position.y, 0.88, 6, dt);
      paper.rotation.x = damp(paper.rotation.x, -Math.PI / 2 + 0.42, 6, dt);
    }
  }

  updateCamera(dt);
  renderer.render(scene, camera);
}

// Boot
orientationCheckSoft();
requestAnimationFrame(frame);
