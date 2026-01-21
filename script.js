/***********************
 * COSMIC TEXT MORPH
 * ☝️ I LOVE YOU
 * ✊ ThawThaw
 ***********************/

const video = document.getElementById("video");
const statusEl = document.getElementById("status");
const setStatus = t => statusEl.textContent = t;

/* =====================
   THREE SETUP
===================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera3D = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 100);
camera3D.position.set(0, 0, 8);

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("three"),
  alpha: true,
  antialias: true
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

/* Lights */
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(4, 6, 8);
scene.add(key);

/* =====================
   PARTICLES
===================== */
const COUNT = 2000;
const positions = new Float32Array(COUNT * 3);
const targets = new Float32Array(COUNT * 3);

for (let i = 0; i < COUNT; i++) {
  positions[i*3]   = (Math.random()-0.5)*30;
  positions[i*3+1] = (Math.random()-0.5)*30;
  positions[i*3+2] = (Math.random()-0.5)*30;
  targets.set(positions.slice(i*3,i*3+3), i*3);
}

const geo = new THREE.BufferGeometry();
geo.setAttribute("position", new THREE.BufferAttribute(positions,3));

const mat = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.05,
  transparent: true,
  opacity: 0.9
});

const particles = new THREE.Points(geo, mat);
scene.add(particles);

/* =====================
   FONT → TEXT TARGETS
===================== */
const loader = new THREE.FontLoader();
let font;

loader.load(
  "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
  f => { font = f; setStatus("Camera ready – show gesture"); }
);

function textTargets(text, size=1.2) {
  if (!font) return;

  const textGeo = new THREE.TextGeometry(text, {
    font,
    size,
    height: 0.2,
    curveSegments: 12
  });

  textGeo.center();
  const verts = textGeo.attributes.position.array;

  for (let i = 0; i < COUNT; i++) {
    const id = (i % (verts.length/3)) * 3;
    targets[i*3]   = verts[id];
    targets[i*3+1] = verts[id+1];
    targets[i*3+2] = verts[id+2];
  }
}

/* =====================
   ANIMATION LOOP
===================== */
function animate() {
  requestAnimationFrame(animate);

  const p = geo.attributes.position.array;
  for (let i = 0; i < p.length; i++) {
    p[i] += (targets[i] - p[i]) * 0.06;
  }
  geo.attributes.position.needsUpdate = true;

  particles.rotation.y += 0.0015; // slow orbit
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
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(res => {
  if (!res.multiHandLandmarks) return;
  const lm = res.multiHandLandmarks[0];

  const pinch = Math.hypot(lm[4].x-lm[8].x, lm[4].y-lm[8].y);
  const indexUp = lm[8].y < lm[6].y;
  const middleUp = lm[12].y < lm[10].y;
  const ringUp = lm[16].y < lm[14].y;
  const pinkyUp = lm[20].y < lm[18].y;
  const upCount = [indexUp,middleUp,ringUp,pinkyUp].filter(Boolean).length;

  // ☝️ I LOVE YOU
  if (indexUp && upCount === 1) {
    textTargets("I LOVE YOU", 1.3);
    setStatus("☝️ I LOVE YOU");
  }

  // ✊ ThawThaw
  if (upCount === 0) {
    textTargets("ThawThaw", 1.4);
    setStatus("✊ ThawThaw");
  }
});

/* =====================
   iOS CAMERA
===================== */
async function startCamera(){
  const stream = await navigator.mediaDevices.getUserMedia({
    video:{ facingMode:"user" }, audio:false
  });
  video.srcObject = stream;
  await video.play();

  async function loop(){
    if(video.readyState >= 2){
      await hands.send({ image: video });
    }
    requestAnimationFrame(loop);
  }
  loop();
}
startCamera();
