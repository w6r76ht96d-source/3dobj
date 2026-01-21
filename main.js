import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

/* =========================
   Phase 1 — Premium Skeleton
   Third-person + Mobile controls + Final box ending
   ========================= */

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
const tapUI = document.getElementById("tapUI");
const btnInteract = document.getElementById("btnInteract");
const endTextEl = document.getElementById("endText");

// ---------- Utilities ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));

// ---------- State ----------
const GameState = Object.freeze({ MENU: "MENU", PLAYING: "PLAYING", END: "END" });
let state = GameState.MENU;
let canInteract = false;

// Landscape lock (portrait overlay)
function isLandscape() {
  return window.innerWidth >= window.innerHeight;
}
function updateRotateOverlay() {
  const needsRotate = !isLandscape();
  rotateEl.classList.toggle("hide", !needsRotate);
  // If needs rotate, pause gameplay feel
  if (needsRotate && state === GameState.PLAYING) {
    hint("Rotate device to continue.");
  }
}
window.addEventListener("resize", updateRotateOverlay, { passive: true });
window.addEventListener("orientationchange", updateRotateOverlay);

// ---------- Renderer (mobile-friendly) ----------
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,          // cheaper on mobile
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setClearColor(0x070a12, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6)); // cap for performance

// ---------- Scene / Camera ----------
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x070a12, 8, 34);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 120);
camera.position.set(0, 2.2, 5.6);

// Resize
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();

// ---------- Lighting (cheap but cinematic) ----------
const hemi = new THREE.HemisphereLight(0x7aa7ff, 0x101528, 0.8);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(6, 10, 4);
scene.add(dir);

// ---------- Ground ----------
const groundGeo = new THREE.PlaneGeometry(120, 120, 1, 1);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x0b1022,
  metalness: 0.0,
  roughness: 1.0,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

// Subtle path stripe for “premium” guidance
const pathGeo = new THREE.PlaneGeometry(40, 4);
const pathMat = new THREE.MeshStandardMaterial({
  color: 0x0f1836,
  metalness: 0.0,
  roughness: 1.0,
  emissive: 0x05060a,
  emissiveIntensity: 0.35,
});
const path = new THREE.Mesh(pathGeo, pathMat);
path.rotation.x = -Math.PI / 2;
path.position.set(10, 0.01, 0);
scene.add(path);

// ---------- Atmosphere particles (GPU-cheap points) ----------
const starCount = 300;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  starPos[i * 3 + 0] = (Math.random() * 2 - 1) * 40;
  starPos[i * 3 + 1] = Math.random() * 10 + 1;
  starPos[i * 3 + 2] = (Math.random() * 2 - 1) * 40;
}
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.6 });
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

// ---------- Player (simple capsule-ish) ----------
const player = new THREE.Group();
scene.add(player);

const bodyGeo = new THREE.CapsuleGeometry(0.28, 0.72, 6, 10);
const bodyMat = new THREE.MeshStandardMaterial({
  color: 0x1c2448,
  roughness: 0.55,
  metalness: 0.08,
  emissive: 0x050913,
  emissiveIntensity: 0.25,
});
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.position.y = 0.72;
player.add(body);

// Glow core
const coreGeo = new THREE.SphereGeometry(0.12, 18, 18);
const coreMat = new THREE.MeshStandardMaterial({
  color: 0x7aa7ff,
  emissive: 0x7aa7ff,
  emissiveIntensity: 1.2,
  roughness: 0.2,
  metalness: 0.1,
});
const core = new THREE.Mesh(coreGeo, coreMat);
core.position.set(0, 0.92, 0.22);
player.add(core);

player.position.set(-6, 0, 0);

// Fake “blob shadow” (very cheap)
const blobGeo = new THREE.CircleGeometry(0.42, 24);
const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
const blob = new THREE.Mesh(blobGeo, blobMat);
blob.rotation.x = -Math.PI / 2;
blob.position.set(0, 0.01, 0);
player.add(blob);

// ---------- Final Box ----------
const boxGroup = new THREE.Group();
scene.add(boxGroup);
boxGroup.position.set(16, 0, 0);

const boxBaseGeo = new THREE.BoxGeometry(0.9, 0.55, 0.9);
const boxMat = new THREE.MeshStandardMaterial({
  color: 0x121831,
  roughness: 0.35,
  metalness: 0.15,
  emissive: 0x0a0f22,
  emissiveIntensity: 0.35,
});
const boxBase = new THREE.Mesh(boxBaseGeo, boxMat);
boxBase.position.y = 0.275;
boxGroup.add(boxBase);

// Lid (hinge)
const lidGeo = new THREE.BoxGeometry(0.92, 0.12, 0.92);
const lid = new THREE.Mesh(lidGeo, boxMat);
lid.position.set(0, 0.61, -0.46);
boxGroup.add(lid);

const lidPivot = new THREE.Group();
lidPivot.position.set(0, 0.61, 0.0);   // hinge line (approx)
boxGroup.add(lidPivot);
lidPivot.add(lid);
lid.position.set(0, 0, -0.46);

// Glow ring to attract player
const ringGeo = new THREE.RingGeometry(0.65, 0.78, 42);
const ringMat = new THREE.MeshBasicMaterial({ color: 0x7cffb2, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = -Math.PI / 2;
ring.position.set(0, 0.02, 0);
boxGroup.add(ring);

// Paper (hidden until opened)
const paperGeo = new THREE.PlaneGeometry(0.72, 0.48);
const paperCanvas = document.createElement("canvas");
paperCanvas.width = 512;
paperCanvas.height = 340;
const pctx = paperCanvas.getContext("2d");

// draw premium paper once
function drawPaper(text) {
  pctx.clearRect(0, 0, paperCanvas.width, paperCanvas.height);

  // paper base
  pctx.fillStyle = "#f3f0e8";
  pctx.fillRect(0, 0, paperCanvas.width, paperCanvas.height);

  // subtle fiber noise
  pctx.globalAlpha = 0.12;
  for (let i = 0; i < 2200; i++) {
    const x = Math.random() * paperCanvas.width;
    const y = Math.random() * paperCanvas.height;
    const v = Math.random() * 20;
    pctx.fillStyle = `rgb(${220+v},${216+v},${206+v})`;
    pctx.fillRect(x, y, 1, 1);
  }
  pctx.globalAlpha = 1;

  // vignette
  const g = pctx.createRadialGradient(
    paperCanvas.width * 0.5, paperCanvas.height * 0.45, paperCanvas.width * 0.12,
    paperCanvas.width * 0.5, paperCanvas.height * 0.5, paperCanvas.width * 0.62
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.10)");
  pctx.fillStyle = g;
  pctx.fillRect(0, 0, paperCanvas.width, paperCanvas.height);

  // handwritten-ish text (safe fallback font stack)
  pctx.fillStyle = "#1a1a1a";
  pctx.font = "62px 'Bradley Hand', 'Segoe Script', 'Comic Sans MS', cursive";
  pctx.textAlign = "center";
  pctx.textBaseline = "middle";
  pctx.fillText(text, paperCanvas.width / 2, paperCanvas.height / 2);

  // slight underline stroke for premium feel
  pctx.strokeStyle = "rgba(26,26,26,.55)";
  pctx.lineWidth = 2;
  pctx.beginPath();
  pctx.moveTo(paperCanvas.width * 0.22, paperCanvas.height * 0.63);
  pctx.quadraticCurveTo(paperCanvas.width * 0.5, paperCanvas.height * 0.69, paperCanvas.width * 0.78, paperCanvas.height * 0.63);
  pctx.stroke();
}
drawPaper("Lee Bal Kwar");

const paperTex = new THREE.CanvasTexture(paperCanvas);
paperTex.anisotropy = 2;
paperTex.needsUpdate = true;

const paperMat = new THREE.MeshBasicMaterial({ map: paperTex, transparent: true, opacity: 0.0, side: THREE.DoubleSide });
const paper = new THREE.Mesh(paperGeo, paperMat);
paper.position.set(0, 0.72, 0.0);
paper.rotation.x = -Math.PI / 2 + 0.75;
boxGroup.add(paper);

// ---------- Interaction ----------
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2(0, 0);
let opened = false;
let lidAngle = 0; // 0 closed, 1 open

function hint(t) {
  hintEl.textContent = t;
}

// Tap/click detection for interact object
function onPointerTap(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
  pointerNDC.set(x, y);

  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects([boxBase, lid, ring], true);
  if (hits.length && canInteract && !opened) {
    openBox();
  }
}

canvas.addEventListener("pointerdown", (e) => {
  // Ignore when menu/end/rotate overlays are active
  if (state !== GameState.PLAYING) return;
  if (!rotateEl.classList.contains("hide")) return;
  onPointerTap(e.clientX, e.clientY);
});

// Also allow explicit Interact button
btnInteract.addEventListener("click", () => {
  if (canInteract && !opened) openBox();
});

// ---------- Smooth third-person camera ----------
let yaw = 0;              // camera orbit yaw
let pitch = 0.18;         // slight down tilt
let camDistance = 3.2;
let camHeight = 1.55;

const camPos = new THREE.Vector3();
const camTarget = new THREE.Vector3();

function updateCamera(dt) {
  // desired camera position in orbit behind player
  const behind = new THREE.Vector3(
    Math.sin(yaw) * camDistance,
    camHeight,
    Math.cos(yaw) * camDistance
  );

  const desiredPos = player.position.clone().add(behind);
  const desiredTarget = player.position.clone().add(new THREE.Vector3(0, 1.0, 0));

  // spring smoothing
  camPos.x = damp(camPos.x, desiredPos.x, 14, dt);
  camPos.y = damp(camPos.y, desiredPos.y, 14, dt);
  camPos.z = damp(camPos.z, desiredPos.z, 14, dt);

  camTarget.x = damp(camTarget.x, desiredTarget.x, 18, dt);
  camTarget.y = damp(camTarget.y, desiredTarget.y, 18, dt);
  camTarget.z = damp(camTarget.z, desiredTarget.z, 18, dt);

  camera.position.copy(camPos);
  camera.lookAt(camTarget);

  // mild pitch effect via target height (kept simple for performance)
}

// ---------- Movement (mobile-first) ----------
const input = {
  moveX: 0,
  moveY: 0,
  camDX: 0,
  camDY: 0,
  interacting: false,
};

let velocity = new THREE.Vector3(0, 0, 0);
const moveSpeed = 2.4;     // tuned for mobile feel
const accel = 18.0;
const friction = 18.0;

function updateMovement(dt) {
  // Convert joystick into world-space movement relative to camera yaw
  const ix = input.moveX;
  const iy = input.moveY;

  // camera-relative forward/right on ground plane
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
  const right = new THREE.Vector3(forward.z, 0, -forward.x).normalize();

  const desired = new THREE.Vector3()
    .addScaledVector(right, ix)
    .addScaledVector(forward, iy);

  if (desired.lengthSq() > 1) desired.normalize();

  const targetVel = desired.multiplyScalar(moveSpeed);

  // smooth acceleration + friction
  velocity.x = damp(velocity.x, targetVel.x, accel, dt);
  velocity.z = damp(velocity.z, targetVel.z, accel, dt);

  // extra friction when near-zero input
  if (Math.abs(ix) < 0.02 && Math.abs(iy) < 0.02) {
    velocity.x = damp(velocity.x, 0, friction, dt);
    velocity.z = damp(velocity.z, 0, friction, dt);
  }

  player.position.x += velocity.x * dt;
  player.position.z += velocity.z * dt;

  // keep player within bounds (simple)
  player.position.x = clamp(player.position.x, -20, 24);
  player.position.z = clamp(player.position.z, -18, 18);

  // face movement direction (premium feel)
  const dir2 = new THREE.Vector2(velocity.x, velocity.z);
  if (dir2.length() > 0.08) {
    const targetRot = Math.atan2(velocity.x, velocity.z);
    player.rotation.y = damp(player.rotation.y, targetRot, 18, dt);
  }

  // subtle bob
  core.position.y = 0.92 + Math.sin(perfTime * 2.1) * 0.03;
}

// ---------- Proximity logic ----------
function updateInteraction() {
  const dx = player.position.x - boxGroup.position.x;
  const dz = player.position.z - boxGroup.position.z;
  const d = Math.hypot(dx, dz);

  canInteract = d < 2.0 && !opened;
  if (state === GameState.PLAYING && !opened) {
    if (canInteract) hint("Tap INTERACT to open the box.");
    else hint("Find the glowing box.");
  }
}

// ---------- Box Opening + Ending ----------
function openBox() {
  opened = true;
  hint("Opening…");

  // cinematic: gently pull camera in
  camDistance = 2.4;
  camHeight = 1.75;

  // show paper & open lid over time in update loop
  setTimeout(() => {
    // after reveal, end
    endGame();
  }, 2200);
}

function endGame() {
  state = GameState.END;
  endTextEl.textContent = "You opened the box, and found the final note.";
  endEl.classList.remove("hide");
  hint("—");
}

// ---------- Touch: joystick ----------
const joyVec = { x: 0, y: 0, active: false };

function setJoy(dx, dy) {
  const max = 44;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len, ny = dy / len;
  const mag = clamp(len, 0, max);
  const x = nx * mag, y = ny * mag;
  joyDot.style.transform = `translate(${x}px, ${y}px)`;
  joyVec.x = x / max;
  joyVec.y = y / max;

  // Map to movement: up on joystick => forward (positive iy)
  input.moveX = joyVec.x;
  input.moveY = -joyVec.y;
}

function joyLocalPos(e) {
  const r = joy.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  return { x: e.clientX - cx, y: e.clientY - cy };
}

joy.addEventListener("pointerdown", (e) => {
  joy.setPointerCapture(e.pointerId);
  joyVec.active = true;
  const p = joyLocalPos(e);
  setJoy(p.x, p.y);
});
joy.addEventListener("pointermove", (e) => {
  if (!joyVec.active) return;
  const p = joyLocalPos(e);
  setJoy(p.x, p.y);
});
joy.addEventListener("pointerup", () => {
  joyVec.active = false;
  setJoy(0, 0);
});
joy.addEventListener("pointercancel", () => {
  joyVec.active = false;
  setJoy(0, 0);
});

// ---------- Touch: camera swipe zone ----------
let camDrag = false;
let lastX = 0, lastY = 0;

camZone.addEventListener("pointerdown", (e) => {
  if (state !== GameState.PLAYING) return;
  camZone.setPointerCapture(e.pointerId);
  camDrag = true;
  lastX = e.clientX;
  lastY = e.clientY;
});
camZone.addEventListener("pointermove", (e) => {
  if (!camDrag) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  // yaw update (smooth)
  yaw -= dx * 0.0042;
  // clamp pitch feel by adjusting camera height/distance subtly
  const pitchAdj = clamp(dy * 0.0022, -0.25, 0.25);
  camHeight = clamp(camHeight + pitchAdj, 1.2, 2.1);
});
camZone.addEventListener("pointerup", () => (camDrag = false));
camZone.addEventListener("pointercancel", () => (camDrag = false));

// ---------- UI Buttons ----------
btnPlay.addEventListener("click", () => {
  menuEl.classList.add("hide");
  endEl.classList.add("hide");
  state = GameState.PLAYING;
  hint("Find the glowing box.");
  updateRotateOverlay();
});

btnReplay.addEventListener("click", () => restartToMenu());
btnRestart.addEventListener("click", () => restartToMenu());

function restartToMenu() {
  // Reset everything cleanly (avoid memory leaks)
  state = GameState.MENU;
  opened = false;
  lidAngle = 0;
  paperMat.opacity = 0.0;

  camDistance = 3.2;
  camHeight = 1.55;

  player.position.set(-6, 0, 0);
  velocity.set(0, 0, 0);

  menuEl.classList.remove("hide");
  endEl.classList.add("hide");
  hint("Ready.");
}

// ---------- Main Loop (fixed-ish) ----------
let last = performance.now();
let perfTime = 0;

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  perfTime += dt;

  // keep overlays responsive
  if (state === GameState.MENU) {
    // idle “cinematic” camera drift
    yaw += dt * 0.08;
  }

  // star drift (cheap)
  stars.rotation.y += dt * 0.02;

  // rotate glow ring
  ring.rotation.z += dt * 0.6;
  ring.material.opacity = 0.25 + (Math.sin(perfTime * 2.2) + 1) * 0.08;

  // Update only if landscape and playing
  const blockedByRotate = !rotateEl.classList.contains("hide");
  if (state === GameState.PLAYING && !blockedByRotate) {
    updateMovement(dt);
    updateInteraction();

    // lid & paper animation if opening
    if (opened) {
      lidAngle = damp(lidAngle, 1, 6, dt);
      const a = lidAngle * 1.35;              // radians
      lidPivot.rotation.x = -a;

      // fade paper in and lift slightly
      paperMat.opacity = damp(paperMat.opacity, 1, 6, dt);
      paper.position.y = damp(paper.position.y, 0.88, 6, dt);
      paper.rotation.x = damp(paper.rotation.x, -Math.PI / 2 + 0.42, 6, dt);
    }
  }

  updateCamera(dt);

  renderer.render(scene, camera);
}

// ---------- Boot ----------
hint("Loading…");
updateRotateOverlay();
requestAnimationFrame(animate);
hint("Ready. Press PLAY.");
