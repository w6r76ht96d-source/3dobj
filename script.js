/**********************
 * COSMIC HAND MORPH
 **********************/

const video = document.getElementById("video");
const statusEl = document.getElementById("status");
const setStatus = t => statusEl.textContent = t;

/* =====================
   THREE.JS SCENE
===================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera3D = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera3D.position.z = 6;

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("three"),
  alpha: true,
  antialias: true
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

window.addEventListener("resize", () => {
  camera3D.aspect = innerWidth / innerHeight;
  camera3D.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* Lights */
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(3, 4, 5);
scene.add(dir);

/* =====================
   PARTICLES (STARS)
===================== */
const COUNT = 1400;
const positions = new Float32Array(COUNT * 3);
const targets = new Float32Array(COUNT * 3);

for (let i = 0; i < COUNT; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 30;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
  
  targets.set(positions.slice(i * 3, i * 3 + 3), i * 3);
}

const geo = new THREE.BufferGeometry();
geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

const mat = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.045,
  transparent: true,
  opacity: 0.9
});

const stars = new THREE.Points(geo, mat);
scene.add(stars);

/* =====================
   SHAPE TARGETS
===================== */
function sphereTargets(r = 1.6) {
  for (let i = 0; i < COUNT; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    
    targets[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    targets[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    targets[i * 3 + 2] = r * Math.cos(phi);
  }
}

function cubeTargets(s = 2) {
  for (let i = 0; i < COUNT; i++) {
    targets[i * 3] = (Math.random() - 0.5) * s;
    targets[i * 3 + 1] = (Math.random() - 0.5) * s;
    targets[i * 3 + 2] = (Math.random() - 0.5) * s;
  }
}

function heartTargets(scale = 1.3) {
  for (let i = 0; i < COUNT; i++) {
    const t = Math.random() * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    targets[i * 3] = x * 0.02 * scale;
    targets[i * 3 + 1] = y * 0.02 * scale;
    targets[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
  }
}

function resetSpace() {
  for (let i = 0; i < COUNT; i++) {
    targets[i * 3] = (Math.random() - 0.5) * 30;
    targets[i * 3 + 1] = (Math.random() - 0.5) * 30;
    targets[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }
}

/* =====================
   ANIMATE MORPH
===================== */
function animate() {
  requestAnimationFrame(animate);
  
  const p = geo.attributes.position.array;
  for (let i = 0; i < p.length; i++) {
    p[i] += (targets[i] - p[i]) * 0.08; // smooth
  }
  geo.attributes.position.needsUpdate = true;
  
  stars.rotation.y += 0.0006;
  renderer.render(scene, camera3D);
}
animate();

/* =====================
   HAND TRACKING
===================== */
const hands = new Hands({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(res => {
  if (!res.multiHandLandmarks) return;
  const lm = res.multiHandLandmarks[0];
  
  const pinch = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
  
  const indexUp = lm[8].y < lm[6].y;
  const middleUp = lm[12].y < lm[10].y;
  const ringUp = lm[16].y < lm[14].y;
  const pinkyUp = lm[20].y < lm[18].y;
  const upCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;
  
  if (pinch < 0.05) {
    sphereTargets();
    setStatus("🤏 Sphere");
  } else if (upCount === 0) {
    resetSpace();
    setStatus("✊ Reset");
  } else if (indexUp && upCount === 1) {
    cubeTargets();
    setStatus("☝️ Cube");
  } else if (upCount === 4) {
    heartTargets();
    setStatus("✋ Heart");
  }
});

/* =====================
   iOS SAFE CAMERA
===================== */
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
    setStatus("Camera ready – show a gesture ✋");
    
    async function loop() {
      if (video.readyState >= 2) {
        await hands.send({ image: video });
      }
      requestAnimationFrame(loop);
    }
    loop();
  } catch (e) {
    setStatus("Camera blocked – check Safari settings");
  }
}
startCamera();
