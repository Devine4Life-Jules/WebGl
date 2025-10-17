import * as THREE from 'three';

const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({ canvas });
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const loadingElem = document.querySelector('#loading');
const progressBarElem = loadingElem.querySelector('.progressbar');
const loadManager = new THREE.LoadingManager();

loadManager.onLoad = () => {
  loadingElem.style.display = 'none';
  start();
};
loadManager.onProgress = (url, loaded, total) => {
  progressBarElem.style.transform = `scaleX(${loaded / total})`;
};

const loader = new THREE.FileLoader(loadManager);
loader.load('shader.frag', (fragmentShader) => {
  setupShader(fragmentShader);
});

let uniforms, mesh;
let cameraOffset = { x: 0, y: 2.0 };
let cameraDistance = 12.0;
let isShaking = false;
let shakeIntensity = 0;
let shakeDecay = 0.95;

const setupShader = (fragmentShader) => {
  uniforms = {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector3() },
    iMouse: { value: new THREE.Vector4() },
    iWalkSpeed: { value: 1.5 },
    iArmSwing: { value: 0.75 },
    iCameraPos: { value: new THREE.Vector3(0.0, 2.0, 12.0) },
    iShakeIntensity: { value: 0.0 },
    iPerspective: { value: 0.0 },
    iFOV: { value: 75.0 },
    iLightIntensity: { value: 1.0 }
  };

  const material = new THREE.ShaderMaterial({
    fragmentShader,
    uniforms
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Track mouse
  window.addEventListener('mousemove', (e) => {
    uniforms.iMouse.value.x = e.clientX;
    uniforms.iMouse.value.y = renderer.domElement.height - e.clientY;
  });
  window.addEventListener('mousedown', () => (uniforms.iMouse.value.z = 1.0));
  window.addEventListener('mouseup', () => (uniforms.iMouse.value.z = 0.0));
}

function start() {
  // Setup slider event listeners
  const walkSpeed = document.getElementById('walkSpeed');
  const armSwing = document.getElementById('armSwing');
  const cameraToggle = document.getElementById('cameraToggle');
  const cameraFOVSlider = document.getElementById('cameraFOV');
  const lightIntensitySlider = document.getElementById('lightIntensity');

  walkSpeed.addEventListener('input', (e) => {
    uniforms.iWalkSpeed.value = parseFloat(e.target.value);
  });

  armSwing.addEventListener('input', (e) => {
    uniforms.iArmSwing.value = parseFloat(e.target.value);
  });

  // FOV slider
  cameraFOVSlider.addEventListener('input', (e) => {
    uniforms.iFOV.value = parseFloat(e.target.value);
  });

  // Light intensity slider
  lightIntensitySlider.addEventListener('input', (e) => {
    uniforms.iLightIntensity.value = parseFloat(e.target.value);
  });

  // Camera toggle button
  let isPerspective = false;
  cameraToggle.addEventListener('click', () => {
    isPerspective = !isPerspective;
    uniforms.iPerspective.value = isPerspective ? 1.0 : 0.0;
    cameraToggle.textContent = isPerspective ? 'Perspective' : 'Orthographic';
  });

  // Keyboard controls for camera
  window.addEventListener('keydown', (e) => {
    const panSpeed = 0.5;
    const zoomSpeed = 0.5;
    
    switch(e.key) {
      case 'ArrowLeft':
        cameraOffset.x -= panSpeed;
        break;
      case 'ArrowRight':
        cameraOffset.x += panSpeed;
        break;
      case 'ArrowUp':
        cameraDistance = Math.max(3.0, cameraDistance - zoomSpeed);
        break;
      case 'ArrowDown':
        cameraDistance = Math.min(25.0, cameraDistance + zoomSpeed);
        break;
      case ' ':
      case 'Spacebar':
        // Trigger 3D camera shake
        isShaking = true;
        shakeIntensity = 0.5; // Adjust for stronger/weaker shake
        break;
    }
    
    // Only update if not shaking (shake will handle updates in render loop)
    if (!isShaking) {
      uniforms.iCameraPos.value.set(cameraOffset.x, cameraOffset.y, cameraDistance);
    }
  });

  requestAnimationFrame(render);
}

const render = (time) => {
  time *= 0.001;
  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    uniforms.iResolution.value.set(canvas.width, canvas.height, 1.0);
  }

  // Apply 3D camera shake - moves actual camera position in scene
  if (isShaking && shakeIntensity > 0.01) {
    const shakeX = (Math.random() - 0.5) * shakeIntensity;
    const shakeY = (Math.random() - 0.5) * shakeIntensity;
    const shakeZ = (Math.random() - 0.5) * shakeIntensity;
    
    // Update camera position with shake offset
    uniforms.iCameraPos.value.set(
      cameraOffset.x + shakeX,
      cameraOffset.y + shakeY,
      cameraDistance + shakeZ
    );
    
    // Pass shake intensity to shader for geometry morphing
    uniforms.iShakeIntensity.value = shakeIntensity;
    
    shakeIntensity *= shakeDecay; // Gradually reduce shake
  } else {
    // Reset to base position when shake ends
    isShaking = false;
    shakeIntensity = 0;
    uniforms.iCameraPos.value.set(cameraOffset.x, cameraOffset.y, cameraDistance);
    uniforms.iShakeIntensity.value = 0.0;
  }

  uniforms.iTime.value = time;
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

const resizeRendererToDisplaySize = (renderer) => {
  const canvas = renderer.domElement;
  const pixelRatio = window.devicePixelRatio;
  const width = canvas.clientWidth * pixelRatio | 0;
  const height = canvas.clientHeight * pixelRatio | 0;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) renderer.setSize(width, height, false);
  return needResize;
}
