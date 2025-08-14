// Basic 3D character maker for Wanderer

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// lighting
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
light.position.set(0, 1, 0);
scene.add(light);

// materials and geometry
const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
const bodyGeometry = new THREE.BoxGeometry(1, 1.5, 0.5);
const body = new THREE.Mesh(bodyGeometry, material);
scene.add(body);

const headGeometry = new THREE.SphereGeometry(0.35, 32, 32);
const head = new THREE.Mesh(headGeometry, material);
head.position.y = 1.0;
scene.add(head);

camera.position.z = 3;

// parameters for GUI
const params = {
    bodyHeight: 1.5,
    bodyWidth: 1.0,
    bodyDepth: 0.5,
    color: '#808080'
};

const gui = new lil.GUI();
const bodyFolder = gui.addFolder('Body');
bodyFolder.add(params, 'bodyHeight', 0.5, 3).onChange((v) => {
    body.scale.y = v / 1.5;
});
bodyFolder.add(params, 'bodyWidth', 0.5, 3).onChange((v) => {
    body.scale.x = v / 1.0;
});
bodyFolder.add(params, 'bodyDepth', 0.5, 3).onChange((v) => {
    body.scale.z = v / 0.5;
});
bodyFolder.open();

gui.addColor(params, 'color').onChange((v) => {
    material.color.set(v);
    head.material.color.set(v);
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// export character configuration
const exportBtn = document.getElementById('export-btn');
exportBtn.addEventListener('click', () => {
    const data = {
        bodyHeight: params.bodyHeight,
        bodyWidth: params.bodyWidth,
        bodyDepth: params.bodyDepth,
        color: params.color
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
