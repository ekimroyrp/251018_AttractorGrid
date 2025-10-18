import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';

const app = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  200,
);
camera.position.set(12, 12, 12);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.495;
controls.target.set(0, 0.5, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
dirLight.position.set(8, 12, 6);
scene.add(ambientLight, dirLight);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0,
    roughness: 1,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const gridHelper = new THREE.GridHelper(200, 40, 0x334155, 0x1e293b);
gridHelper.position.y = 0.001;
scene.add(gridHelper);

const handleHeight = 0.2;
const handle = new THREE.Mesh(
  new THREE.SphereGeometry(0.25, 32, 32),
  new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0x3a1d0b,
    roughness: 0.3,
    metalness: 0.1,
  }),
);
handle.position.set(0, handleHeight, 0);
scene.add(handle);

const baseGeometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
const basePositions = baseGeometry.attributes.position;
const pyramidPositions = new Float32Array(basePositions.count * 3);

for (let i = 0; i < basePositions.count; i += 1) {
  const x = basePositions.getX(i);
  const y = basePositions.getY(i);
  const z = basePositions.getZ(i);

  pyramidPositions[i * 3 + 1] = y;

  if (y > 0) {
    pyramidPositions[i * 3] = 0;
    pyramidPositions[i * 3 + 2] = 0;
  } else {
    pyramidPositions[i * 3] = x;
    pyramidPositions[i * 3 + 2] = z;
  }
}

baseGeometry.morphTargetsRelative = false;
baseGeometry.morphAttributes.position = [
  new THREE.Float32BufferAttribute(pyramidPositions, 3),
];
baseGeometry.computeVertexNormals();

const baseMaterial = new THREE.MeshStandardMaterial({
  flatShading: true,
  roughness: 0.5,
  metalness: 0.25,
});

const gridCells = [];
const params = {
  minSize: 0.4,
  maxSize: 2.4,
  spacing: 1.8,
  countX: 12,
  countY: 12,
};

let gridNeedsUpdate = true;

const handlePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const planePoint = new THREE.Vector3();

function triggerGridUpdate() {
  gridNeedsUpdate = true;
}

function rebuildGrid() {
  for (const cell of gridCells) {
    scene.remove(cell.mesh);
    cell.mesh.material.dispose();
  }
  gridCells.length = 0;

  const originX = -((params.countX - 1) * params.spacing) / 2;
  const originZ = -((params.countY - 1) * params.spacing) / 2;

  for (let ix = 0; ix < params.countX; ix += 1) {
    for (let iz = 0; iz < params.countY; iz += 1) {
      const mesh = new THREE.Mesh(baseGeometry, baseMaterial.clone());
      mesh.updateMorphTargets();

      const x = originX + ix * params.spacing;
      const z = originZ + iz * params.spacing;
      mesh.position.set(x, 0.5, z);

      scene.add(mesh);
      gridCells.push({
        mesh,
        position: new THREE.Vector3(x, 0, z),
        distance: 0,
      });
    }
  }

  triggerGridUpdate();
}

rebuildGrid();

function updatePointer(event) {
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x =
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y =
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
}

function projectToGround(event) {
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.ray.intersectPlane(handlePlane, planePoint);
  if (!hit) {
    return null;
  }
  return planePoint;
}

let dragging = false;

function onPointerDown(event) {
  const planeHit = projectToGround(event);
  if (planeHit) {
    handle.position.set(planeHit.x, handleHeight, planeHit.z);
    triggerGridUpdate();
  }

  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObject(handle, false);
  if (intersections.length > 0) {
    dragging = true;
    controls.enabled = false;
    renderer.domElement.setPointerCapture(event.pointerId);
  }
}

function onPointerMove(event) {
  if (!dragging) {
    return;
  }
  const planeHit = projectToGround(event);
  if (planeHit) {
    handle.position.set(planeHit.x, handleHeight, planeHit.z);
    triggerGridUpdate();
  }
}

function onPointerUp(event) {
  if (dragging) {
    renderer.domElement.releasePointerCapture(event.pointerId);
  }
  dragging = false;
  controls.enabled = true;
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('pointermove', onPointerMove);
renderer.domElement.addEventListener('pointerup', onPointerUp);
renderer.domElement.addEventListener('pointerleave', onPointerUp);

const gui = new GUI();
gui.title('Grid Controls');
gui
  .add(params, 'minSize', 0.2, 3, 0.05)
  .name('Min Size')
  .onChange(triggerGridUpdate);
gui
  .add(params, 'maxSize', 0.4, 4, 0.05)
  .name('Max Size')
  .onChange(triggerGridUpdate);
gui
  .add(params, 'spacing', 0.8, 4, 0.1)
  .name('Spacing')
  .onFinishChange(rebuildGrid);
gui
  .add(params, 'countX', 1, 40, 1)
  .name('Count X')
  .onFinishChange(rebuildGrid);
gui
  .add(params, 'countY', 1, 40, 1)
  .name('Count Y')
  .onFinishChange(rebuildGrid);

const tempHandlePosition = new THREE.Vector3();

function updateGridVisuals() {
  if (!gridNeedsUpdate || gridCells.length === 0) {
    return;
  }
  gridNeedsUpdate = false;

  const minSize = Math.min(params.minSize, params.maxSize);
  const maxSize = Math.max(params.minSize, params.maxSize);
  const sizeRange = maxSize - minSize;

  tempHandlePosition.copy(handle.position);
  tempHandlePosition.y = 0;

  let maxDistance = 0;
  for (const cell of gridCells) {
    cell.distance = tempHandlePosition.distanceTo(cell.position);
    if (cell.distance > maxDistance) {
      maxDistance = cell.distance;
    }
  }

  if (maxDistance < 1e-4) {
    maxDistance = 1;
  }

  for (const cell of gridCells) {
    const t = THREE.MathUtils.clamp(cell.distance / maxDistance, 0, 1);
    const scale = minSize + sizeRange * t;

    cell.mesh.scale.setScalar(scale);
    cell.mesh.position.y = scale * 0.5;

    cell.mesh.morphTargetInfluences[0] = t;

    const hue = THREE.MathUtils.lerp(0.08, 0.58, t);
    const lightness = THREE.MathUtils.lerp(0.45, 0.7, t);
    cell.mesh.material.color.setHSL(hue, 0.65, lightness);
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onResize);

renderer.setAnimationLoop(() => {
  updateGridVisuals();
  controls.update();
  renderer.render(scene, camera);
});
