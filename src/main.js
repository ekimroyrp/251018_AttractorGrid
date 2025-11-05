import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';

const app = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 2;
dirLight.shadow.camera.far = 50;
dirLight.shadow.camera.left = -25;
dirLight.shadow.camera.right = 25;
dirLight.shadow.camera.top = 25;
dirLight.shadow.camera.bottom = -25;
dirLight.shadow.bias = -0.0015;
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

const defaultCloseColor = new THREE.Color('#e170cc');
const defaultFarColor = new THREE.Color('#2afa00');

const gridCells = [];
const params = {
  minSize: 0.4,
  maxSize: 2.4,
  spacing: 1.8,
  countX: 12,
  countY: 12,
  closeColor: `#${defaultCloseColor.getHexString()}`,
  farColor: `#${defaultFarColor.getHexString()}`,
  minRotation: 0,
  maxRotation: 180,
  shadows: true,
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
      mesh.castShadow = params.shadows;
      mesh.receiveShadow = params.shadows;

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
  applyShadowSettings();
}

rebuildGrid();

function applyShadowSettings() {
  renderer.shadowMap.enabled = params.shadows;
  dirLight.castShadow = params.shadows;
  handle.castShadow = params.shadows;
  handle.receiveShadow = params.shadows;
  ground.receiveShadow = params.shadows;
  for (const cell of gridCells) {
    cell.mesh.castShadow = params.shadows;
    cell.mesh.receiveShadow = params.shadows;
  }
}

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
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObject(handle, false);
  if (intersections.length === 0) {
    return;
  }

  dragging = true;
  controls.enabled = false;
  renderer.domElement.setPointerCapture(event.pointerId);

  const planeHit = projectToGround(event);
  if (planeHit) {
    handle.position.set(planeHit.x, handleHeight, planeHit.z);
    triggerGridUpdate();
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
gui
  .add(params, 'shadows')
  .name('Shadows')
  .onChange(applyShadowSettings);
gui
  .addColor(params, 'closeColor')
  .name('Close Color')
  .onChange(triggerGridUpdate);
gui
  .addColor(params, 'farColor')
  .name('Far Color')
  .onChange(triggerGridUpdate);
gui
  .add(params, 'minRotation', -360, 360, 1)
  .name('Min Rotation')
  .onChange(triggerGridUpdate);
gui
  .add(params, 'maxRotation', -360, 360, 1)
  .name('Max Rotation')
  .onChange(triggerGridUpdate);

const exportActions = {
  exportMesh: exportGridAsOBJ,
};
gui.add(exportActions, 'exportMesh').name('Export Mesh');

const tempHandlePosition = new THREE.Vector3();
const closeColor = new THREE.Color();
const farColor = new THREE.Color();
const closeHSL = { h: 0, s: 0, l: 0 };
const farHSL = { h: 0, s: 0, l: 0 };
const exportBasePosition = new THREE.Vector3();
const exportMorphedPosition = new THREE.Vector3();
const exportTargetPosition = new THREE.Vector3();

function updateGridVisuals() {
  if (!gridNeedsUpdate || gridCells.length === 0) {
    return;
  }
  gridNeedsUpdate = false;

  const minSize = Math.min(params.minSize, params.maxSize);
  const maxSize = Math.max(params.minSize, params.maxSize);
  const sizeRange = maxSize - minSize;

  const minRotationDeg = params.minRotation;
  const maxRotationDeg = params.maxRotation;

  closeColor.set(params.closeColor);
  closeColor.getHSL(closeHSL);
  farColor.set(params.farColor);
  farColor.getHSL(farHSL);

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

    const rotationDeg = THREE.MathUtils.lerp(
      minRotationDeg,
      maxRotationDeg,
      t,
    );
    cell.mesh.rotation.y = THREE.MathUtils.degToRad(rotationDeg);

    const hue = THREE.MathUtils.lerp(closeHSL.h, farHSL.h, t);
    const saturation = THREE.MathUtils.lerp(closeHSL.s, farHSL.s, t);
    const lightness = THREE.MathUtils.lerp(closeHSL.l, farHSL.l, t);
    cell.mesh.material.color.setHSL(hue, saturation, lightness);
  }
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return '0';
  }
  const stringValue = value.toString();
  if (stringValue === '-0') {
    return '0';
  }
  return stringValue;
}

// Bake a grid cell into world-space geometry with morph targets applied.
function bakeGridCell(mesh) {
  mesh.updateMatrixWorld(true);

  const sourceGeometry = mesh.geometry;
  const bakedGeometry = sourceGeometry.clone();
  const basePositions = sourceGeometry.attributes.position;
  const positionAttr = bakedGeometry.attributes.position;
  const morphAttrs = sourceGeometry.morphAttributes.position || [];
  const influences = mesh.morphTargetInfluences || [];

  if (morphAttrs.length > 0 && influences.length > 0) {
    for (let i = 0; i < positionAttr.count; i += 1) {
      exportBasePosition.fromBufferAttribute(basePositions, i);
      exportMorphedPosition.copy(exportBasePosition);

      for (let m = 0; m < morphAttrs.length; m += 1) {
        const influence = influences[m];
        if (!influence) {
          continue;
        }
        exportTargetPosition.fromBufferAttribute(morphAttrs[m], i);
        if (sourceGeometry.morphTargetsRelative) {
          exportMorphedPosition.addScaledVector(exportTargetPosition, influence);
        } else {
          exportTargetPosition.sub(exportBasePosition).multiplyScalar(influence);
          exportMorphedPosition.add(exportTargetPosition);
        }
      }

      positionAttr.setXYZ(
        i,
        exportMorphedPosition.x,
        exportMorphedPosition.y,
        exportMorphedPosition.z,
      );
    }
  }

  const vertexCount = positionAttr.count;
  const materialColor =
    mesh.material && mesh.material.color ? mesh.material.color : null;
  const r = materialColor ? materialColor.r : 1;
  const g = materialColor ? materialColor.g : 1;
  const b = materialColor ? materialColor.b : 1;
  const colorArray = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i += 1) {
    const offset = i * 3;
    colorArray[offset] = r;
    colorArray[offset + 1] = g;
    colorArray[offset + 2] = b;
  }
  bakedGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

  bakedGeometry.applyMatrix4(mesh.matrixWorld);
  bakedGeometry.computeVertexNormals();

  return bakedGeometry;
}

// Serialise the current grid into an OBJ download with per-vertex colors.
function exportGridAsOBJ() {
  if (gridCells.length === 0) {
    return;
  }

  scene.updateMatrixWorld(true);

  const now = new Date();
  const timestamp = now.toISOString();
  const lines = [
    '# Attractor Grid export',
    `# ${timestamp}`,
    'o AttractorGrid',
  ];

  let vertexOffset = 1;
  let normalOffset = 1;

  for (const cell of gridCells) {
    const baked = bakeGridCell(cell.mesh);
    const positions = baked.attributes.position;
    let normals = baked.attributes.normal;
    if (!normals) {
      baked.computeVertexNormals();
      normals = baked.attributes.normal;
    }
    const colors = baked.attributes.color;
    const vertexCount = positions.count;
    const normalCount = normals.count;

    for (let i = 0; i < vertexCount; i += 1) {
      lines.push(
        `v ${formatNumber(positions.getX(i))} ${formatNumber(
          positions.getY(i),
        )} ${formatNumber(positions.getZ(i))} ${formatNumber(
          colors.getX(i),
        )} ${formatNumber(colors.getY(i))} ${formatNumber(colors.getZ(i))}`,
      );
    }

    for (let i = 0; i < normalCount; i += 1) {
      lines.push(
        `vn ${formatNumber(normals.getX(i))} ${formatNumber(
          normals.getY(i),
        )} ${formatNumber(normals.getZ(i))}`,
      );
    }

    const indexAttr = baked.getIndex();
    if (indexAttr) {
      const indexArray = indexAttr.array;
      for (let i = 0; i < indexArray.length; i += 3) {
        const a = indexArray[i] + vertexOffset;
        const b = indexArray[i + 1] + vertexOffset;
        const c = indexArray[i + 2] + vertexOffset;
        const na = indexArray[i] + normalOffset;
        const nb = indexArray[i + 1] + normalOffset;
        const nc = indexArray[i + 2] + normalOffset;
        lines.push(`f ${a}//${na} ${b}//${nb} ${c}//${nc}`);
      }
    } else {
      for (let i = 0; i < vertexCount; i += 3) {
        const a = vertexOffset + i;
        const b = vertexOffset + i + 1;
        const c = vertexOffset + i + 2;
        const na = normalOffset + i;
        const nb = normalOffset + i + 1;
        const nc = normalOffset + i + 2;
        lines.push(`f ${a}//${na} ${b}//${nb} ${c}//${nc}`);
      }
    }

    vertexOffset += vertexCount;
    normalOffset += normalCount;
    baked.dispose();
  }

  const objContent = lines.join('\n');
  const blob = new Blob([objContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const fileName = `grid-export-${timestamp.replace(/[:.]/g, '-')}.obj`;
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
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
