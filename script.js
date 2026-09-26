const canvas = document.getElementById("space");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  48,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.z = 18;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ------------------------------------------------------------
// Particle universe
// ------------------------------------------------------------

const PARTICLE_COUNT = window.innerWidth < 700 ? 15000 : 28000;
const rocketCount = Math.floor(PARTICLE_COUNT * 0.72);
const starCount = PARTICLE_COUNT - rocketCount;

const positions = new Float32Array(PARTICLE_COUNT * 3);
const targetPositions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);
const sizes = new Float32Array(PARTICLE_COUNT);

function randomUnit() {
  return Math.random() * 2 - 1;
}

function rocketPoint(i) {
  // Normalized vertical rocket shape: -3.4 nose to +3.4 engine.
  const t = Math.random();
  const y = 3.2 - t * 6.5;

  let radius;

  // Nose cone
  if (y > 1.65) {
    radius = (3.25 - y) * 0.52;
  }
  // Main body
  else if (y > -2.35) {
    radius = 0.72 + Math.random() * 0.13;
  }
  // Engine section
  else {
    radius = 0.65 + Math.random() * 0.2;
  }

  // Fins near the lower body
  let fin = 0;
  if (y < -1.55 && y > -3.0) {
    fin = Math.max(0, (y + 1.55) / -1.45);
  }

  let x = randomUnit() * radius;
  let z = randomUnit() * radius;
  const angle = Math.atan2(z, x);

  if (fin > 0 && Math.abs(x) > 0.42) {
    x += Math.sign(x) * fin * 0.75;
  }

  // Hollow engine ring
  if (y < -2.5 && Math.random() > 0.65) {
    x *= 1.35;
    z *= 1.35;
  }

  // Organic breakup at the surface.
  const breakup = Math.pow(Math.random(), 4) * 0.8;
  x += randomUnit() * breakup;
  z += randomUnit() * breakup;

  return [x * 1.35, y, z * 1.35];
}

// Build rocket particles
for (let i = 0; i < rocketCount; i++) {
  const [x, y, z] = rocketPoint(i);
  const idx = i * 3;

  targetPositions[idx] = x;
  targetPositions[idx + 1] = y;
  targetPositions[idx + 2] = z;

  // Start particles scattered around the rocket.
  positions[idx] = x * 1.6 + randomUnit() * 3;
  positions[idx + 1] = y * 1.6 + randomUnit() * 3;
  positions[idx + 2] = z * 1.6 + randomUnit() * 3;

  // Mostly white, with cool blue and warm launch-gold accents.
  const r = Math.random();
  if (r < 0.16) {
    colors[idx] = 0.22;
    colors[idx + 1] = 0.63;
    colors[idx + 2] = 1.0;
  } else if (r < 0.28) {
    colors[idx] = 1.0;
    colors[idx + 1] = 0.67;
    colors[idx + 2] = 0.18;
  } else {
    const c = 0.68 + Math.random() * 0.32;
    colors[idx] = c;
    colors[idx + 1] = c;
    colors[idx + 2] = c;
  }

  sizes[i] = 1.5 + Math.random() * 2.5;
}

// Deep-space particles
for (let i = rocketCount; i < PARTICLE_COUNT; i++) {
  const idx = i * 3;
  const radius = 20 + Math.random() * 45;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(randomUnit());

  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  positions[idx] = targetPositions[idx] = x;
  positions[idx + 1] = targetPositions[idx + 1] = y;
  positions[idx + 2] = targetPositions[idx + 2] = z;

  const blue = Math.random() < 0.22;
  colors[idx] = blue ? 0.15 : 0.55 + Math.random() * 0.35;
  colors[idx + 1] = blue ? 0.45 + Math.random() * 0.35 : 0.55 + Math.random() * 0.35;
  colors[idx + 2] = blue ? 1.0 : 0.55 + Math.random() * 0.35;

  sizes[i] = Math.random() < 0.025 ? 4.0 : 0.7 + Math.random() * 1.5;
}

const geometry = new THREE.BufferGeometry();

const positionAttribute = new THREE.BufferAttribute(positions, 3);
const targetAttribute = new THREE.BufferAttribute(targetPositions, 3);
const colorAttribute = new THREE.BufferAttribute(colors, 3);
const sizeAttribute = new THREE.BufferAttribute(sizes, 1);

geometry.setAttribute("position", positionAttribute);
geometry.setAttribute("aTarget", targetAttribute);
geometry.setAttribute("aColor", colorAttribute);
geometry.setAttribute("aSize", sizeAttribute);

const material = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: {
    uPixelRatio: { value: renderer.getPixelRatio() },
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector3() },
    uMousePower: { value: 0 }
  },
  vertexShader: `
    uniform float uPixelRatio;
    uniform float uTime;
    uniform vec3 uMouse;
    uniform float uMousePower;

    attribute vec3 aTarget;
    attribute vec3 aColor;
    attribute float aSize;

    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vec3 p = position;

      // Return scattered particles to their designed form.
      p += (aTarget - p) * 0.022;

      // Slow organic breathing / noise-like movement.
      float wave = sin(aTarget.y * 1.4 + uTime * 0.55) * 0.025;
      p.x += wave;
      p.z += cos(aTarget.x * 1.2 + uTime * 0.42) * 0.025;

      // Mouse = local repulsion field.
      vec3 delta = p - uMouse;
      float dist = length(delta);
      float influence = smoothstep(4.5, 0.0, dist) * uMousePower;

      if (dist > 0.001) {
        p += normalize(delta) * influence * 1.25;
      }

      // Tiny curl around the mouse field.
      p.x += sin(dist * 2.4 - uTime * 2.0) * influence * 0.09;
      p.y += cos(dist * 2.0 - uTime * 1.5) * influence * 0.09;

      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);

      float perspective = 300.0 / max(1.0, -mvPosition.z);
      gl_PointSize = aSize * uPixelRatio * perspective;
      gl_Position = projectionMatrix * mvPosition;

      vColor = aColor;
      vAlpha = 0.72 + 0.28 * sin(uTime * 2.0 + aTarget.y * 3.0);
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);

      if (d > 0.5) discard;

      float glow = smoothstep(0.5, 0.0, d);
      float core = smoothstep(0.16, 0.0, d);

      gl_FragColor = vec4(vColor * (0.65 + core * 0.75), glow * vAlpha);
    }
  `
});

const particles = new THREE.Points(geometry, material);
particles.rotation.z = -0.28;
particles.rotation.x = 0.08;
particles.position.set(4.0, 0.0, 0);
particles.scale.set(1.15, 1.15, 1.15);
scene.add(particles);

// ------------------------------------------------------------
// Mouse physics
// ------------------------------------------------------------

const mouse = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  power: 0,
  targetPower: 0
};

const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();

window.addEventListener("pointermove", (event) => {
  mouse.targetX = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.targetY = -(event.clientY / window.innerHeight) * 2 + 1;

  mouse.targetPower = 1;

  document.querySelector(".cursor-glow").style.left = event.clientX + "px";
  document.querySelector(".cursor-glow").style.top = event.clientY + "px";
  document.querySelector(".cursor-dot").style.left = event.clientX + "px";
  document.querySelector(".cursor-dot").style.top = event.clientY + "px";
});

window.addEventListener("pointerleave", () => {
  mouse.targetPower = 0;
});

// ------------------------------------------------------------
// Animation
// ------------------------------------------------------------

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  mouse.x += (mouse.targetX - mouse.x) * 0.055;
  mouse.y += (mouse.targetY - mouse.y) * 0.055;
  mouse.power += (mouse.targetPower - mouse.power) * 0.06;

  mouseNDC.set(mouse.x, mouse.y);
  raycaster.setFromCamera(mouseNDC, camera);

  // Convert mouse to a point in front of the camera.
  const mouseWorld = new THREE.Vector3();
  raycaster.ray.at(14, mouseWorld);

  // Convert into the particle system's local coordinates.
  particles.worldToLocal(mouseWorld);

  material.uniforms.uMouse.value.lerp(mouseWorld, 0.12);
  material.uniforms.uMousePower.value = mouse.power;
  material.uniforms.uTime.value = elapsed;

  // Gentle autonomous movement.
  particles.rotation.y = Math.sin(elapsed * 0.18) * 0.08;
  particles.rotation.x = 0.08 + Math.cos(elapsed * 0.15) * 0.035;

  renderer.render(scene, camera);
}

animate();

// ------------------------------------------------------------
// UI
// ------------------------------------------------------------

setTimeout(() => {
  document.body.classList.add("loaded");
}, 1900);

const soundToggle = document.getElementById("soundToggle");
let interactionOn = true;

soundToggle.addEventListener("click", () => {
  interactionOn = !interactionOn;
  mouse.targetPower = interactionOn ? 1 : 0;
  soundToggle.innerHTML = `INTERACTION <span>${interactionOn ? "ON" : "OFF"}</span>`;
});

const menu = document.querySelector(".menu");
menu.addEventListener("click", () => {
  document.querySelector(".nav-links").classList.toggle("open");
});

// Scroll = subtle camera/parallax response.
let scrollY = 0;
window.addEventListener("scroll", () => {
  scrollY = window.scrollY;
});

function scrollAnimation() {
  camera.position.y += ((-scrollY * 0.0012) - camera.position.y) * 0.025;
  requestAnimationFrame(scrollAnimation);
}
scrollAnimation();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  material.uniforms.uPixelRatio.value = renderer.getPixelRatio();

  particles.position.x = window.innerWidth < 800 ? 2.0 : 4.0;
});
