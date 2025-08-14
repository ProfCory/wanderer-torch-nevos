// Enhanced 3D character maker for Wanderer

// scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(0.5); // retro look
renderer.domElement.style.imageRendering = 'pixelated';
document.body.appendChild(renderer.domElement);

// lighting
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
light.position.set(0, 1, 0);
scene.add(light);

// materials
const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, flatShading: true });
const headMaterial = new THREE.MeshStandardMaterial({ flatShading: true });
const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, flatShading: true });

// torso split for bust/waist controls
const torso = new THREE.Group();
scene.add(torso);

const bust = new THREE.Mesh(new THREE.BoxGeometry(1, 0.75, 0.5), bodyMaterial);
bust.position.y = 0.375;
torso.add(bust);

const waist = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.75, 0.45), bodyMaterial);
waist.position.y = -0.375;
torso.add(waist);

// neck and head
const neck = new THREE.Group();
neck.position.y = 0.85;
const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 8), bodyMaterial);
neckMesh.position.y = 0.1;
neck.add(neckMesh);
scene.add(neck);

const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 32), headMaterial);
head.position.y = 1.2;
scene.add(head);

// legs and feet
function createLeg(x) {
  const group = new THREE.Group();
  group.position.set(x, -0.75, 0);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8), bodyMaterial);
  leg.position.y = -0.4;
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.5), bodyMaterial);
  foot.position.set(0, -0.85, 0.25);
  group.add(leg);
  group.add(foot);
  return { group, leg, foot };
}

const leftLeg = createLeg(-0.25);
const rightLeg = createLeg(0.25);
scene.add(leftLeg.group);
scene.add(rightLeg.group);

// hair styles
const hairGroup = new THREE.Group();
scene.add(hairGroup);

const hairStyles = {
  'Bald': () => null,
  'Short Crop': () => new THREE.BoxGeometry(0.8, 0.3, 0.8),
  'Long Straight': () => new THREE.BoxGeometry(0.9, 0.9, 0.9),
  'Ponytail': () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.8)));
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 6));
    tail.position.set(0, -0.4, -0.3);
    g.add(tail);
    return g;
  },
  'Mohawk': () => new THREE.BoxGeometry(0.2, 0.6, 0.8),
  'Curly': () => new THREE.SphereGeometry(0.5, 8, 8),
  'Spiky': () => new THREE.ConeGeometry(0.5, 0.7, 5),
  'Braids': () => new THREE.CylinderGeometry(0.3, 0.3, 0.7, 6),
  'Bun': () => new THREE.SphereGeometry(0.3, 8, 8),
  // masc styles
  'Crew Cut': () => new THREE.BoxGeometry(0.9, 0.2, 0.9),
  'Undercut': () => new THREE.BoxGeometry(0.8, 0.4, 0.8),
  // fem styles
  'Bob': () => new THREE.BoxGeometry(0.9, 0.5, 0.9),
  'Wavy Long': () => new THREE.BoxGeometry(1.0, 1.0, 1.0)
};

function setHairStyle(name) {
  hairGroup.clear();
  const style = hairStyles[name];
  if (!style) return;
  const geom = style();
  if (!geom) return;
  let mesh;
  if (geom.isGeometry) {
    mesh = new THREE.Mesh(geom, hairMaterial);
    mesh.position.y = 1.4;
    hairGroup.add(mesh);
  } else if (geom instanceof THREE.Group) {
    geom.traverse((c) => { if (c.isMesh) c.material = hairMaterial; });
    geom.position.y = 1.4;
    hairGroup.add(geom);
  }
}

// simple pixel faces
function createFaceTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffcc99';
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = '#000';
  ctx.fillRect(8, 10, 4, 4); // left eye
  ctx.fillRect(20, 10, 4, 4); // right eye
  if (type === 'Smile') {
    ctx.fillRect(12, 20, 8, 2);
    ctx.fillRect(12, 20, 2, 4);
    ctx.fillRect(18, 20, 2, 4);
  } else if (type === 'Frown') {
    ctx.fillRect(12, 22, 8, 2);
    ctx.fillRect(12, 20, 2, 4);
    ctx.fillRect(18, 20, 2, 4);
  } else if (type === 'Surprised') {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(16, 22, 4, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillRect(12, 22, 8, 2); // neutral
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

headMaterial.map = createFaceTexture('Neutral');

function mapRange(v, inMin, inMax, outMin, outMax) {
  return (v - inMin) / (inMax - inMin) * (outMax - outMin) + outMin;
}

const params = {
  hairStyle: 'Bald',
  hairColor: '#333333',
  waist: 5,
  neck: 5,
  bust: 5,
  inseam: 5,
  foot: 5,
  face: 'Neutral',
  clothes: 'Commoner'
};

const stats = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
  ac: 10,
  melee: 0,
  ranged: 0
};

const gui = new lil.GUI();

const bodyFolder = gui.addFolder('Body');
bodyFolder.add(params, 'bust', 1, 9, 1).name('Bust').onChange((v) => {
  const s = mapRange(v, 1, 9, 0.5, 1.5);
  bust.scale.x = s;
});
bodyFolder.add(params, 'waist', 1, 9, 1).name('Waist').onChange((v) => {
  const s = mapRange(v, 1, 9, 0.5, 1.5);
  waist.scale.x = s;
});
bodyFolder.add(params, 'neck', 1, 9, 1).name('Neck').onChange((v) => {
  const s = mapRange(v, 1, 9, 0.5, 1.5);
  neckMesh.scale.set(s, s, 1);
});
bodyFolder.add(params, 'inseam', 1, 9, 1).name('Inseam').onChange((v) => {
  const s = mapRange(v, 1, 9, 0.5, 1.5);
  leftLeg.leg.scale.y = rightLeg.leg.scale.y = s;
  leftLeg.foot.position.y = rightLeg.foot.position.y = -0.85 * s;
});
bodyFolder.add(params, 'foot', 1, 9, 1).name('Feet').onChange((v) => {
  const s = mapRange(v, 1, 9, 0.5, 1.5);
  leftLeg.foot.scale.set(s, 1, s);
  rightLeg.foot.scale.set(s, 1, s);
});
bodyFolder.open();

const hairFolder = gui.addFolder('Hair');
hairFolder.add(params, 'hairStyle', Object.keys(hairStyles)).onChange(setHairStyle);
hairFolder.addColor(params, 'hairColor').onChange((v) => hairMaterial.color.set(v));
hairFolder.open();

const faceFolder = gui.addFolder('Face');
faceFolder.add(params, 'face', ['Neutral', 'Smile', 'Frown', 'Surprised']).onChange((v) => {
  headMaterial.map = createFaceTexture(v);
  headMaterial.needsUpdate = true;
});
faceFolder.open();

const clothesColors = {
  Noble: '#bfa2db',
  Traveler: '#8b5a2b',
  Costume: '#ff69b4',
  Commoner: '#777777',
  Soldier: '#556b2f',
  Criminal: '#2f4f4f',
  Musician: '#1e90ff'
};

const clothesFolder = gui.addFolder('Clothes');
clothesFolder.add(params, 'clothes', Object.keys(clothesColors)).onChange((v) => {
  bodyMaterial.color.set(clothesColors[v]);
});
clothesFolder.open();

const statsFolder = gui.addFolder('Stats');
['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach((s) => {
  statsFolder.add(stats, s, 1, 20, 1).name(s.toUpperCase());
});
statsFolder.add(stats, 'ac', 1, 30, 1).name('AC');
statsFolder.add(stats, 'melee', -10, 10, 1).name('Melee');
statsFolder.add(stats, 'ranged', -10, 10, 1).name('Ranged');
statsFolder.open();

camera.position.z = 3;
setHairStyle(params.hairStyle);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// export character configuration
document.getElementById('export-btn').addEventListener('click', () => {
  const data = {
    hair: { style: params.hairStyle, color: params.hairColor },
    measurements: {
      waist: params.waist,
      neck: params.neck,
      bust: params.bust,
      inseam: params.inseam,
      foot: params.foot
    },
    face: params.face,
    clothes: params.clothes,
    stats: { ...stats }
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wanderer-character.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

