import * as THREE from 'three';

const SHAKE_INTENSITY = {
  KEYBOARD: 1.2,
  BUTTON: 0.5
};

const CAMERA_CONTROLS = {
  ORBIT_SPEED_DEG: 5,
  FOV_SPEED_DEG: 2
};

const CameraState = {
  offset: { x: 0, y: 2.0 },
  distance: 12.0,
  orbitAngle: 0,
  shake: {
    active: false,
    intensity: 0,
    decay: 0.95
  }
};

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

const updateCameraPosition = () => {
  const x = Math.sin(CameraState.orbitAngle) * CameraState.distance + CameraState.offset.x;
  const z = Math.cos(CameraState.orbitAngle) * CameraState.distance;
  const y = CameraState.offset.y;
  
  if (!CameraState.shake.active) {
    uniforms.iCameraPos.value.set(x, y, z);
  }
};

const setupShader = (fragmentShader) => {
  uniforms = {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector3() },
    iMouse: { value: new THREE.Vector2(0.5, 0.5) },
    iWalkSpeed: { value: 1.5 },
    iArmSwing: { value: 0.75 },
    iCameraPos: { value: new THREE.Vector3(0, 2, 12) },
    iShakeIntensity: { value: 0.0 },
    iPerspective: { value: 1.0 },
    iFOV: { value: 75.0 },
    iLightIntensity: { value: 1.0 },
    iSphereHead: { value: 0.0 },
    iRoughness: { value: 0.5 },
    iMetallic: { value: 0.2 }
  };

  const material = new THREE.ShaderMaterial({
    fragmentShader,
    uniforms
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  window.addEventListener('mousemove', (e) => {
    uniforms.iMouse.value.x = e.clientX;
    uniforms.iMouse.value.y = renderer.domElement.height - e.clientY;
  });
  window.addEventListener('mousedown', () => (uniforms.iMouse.value.z = 1.0));
  window.addEventListener('mouseup', () => (uniforms.iMouse.value.z = 0.0));
}

const start = () => {
  const walkSpeed = document.getElementById('walkSpeed');
  const armSwing = document.getElementById('armSwing');
  const orthographicRadio = document.getElementById('orthographic');
  const perspectiveRadio = document.getElementById('perspective');
  const cameraFOVSlider = document.getElementById('cameraFOV');
  const lightIntensitySlider = document.getElementById('lightIntensity');
  const robotRotationSlider = document.getElementById('robotRotation');
  const shakeButton = document.getElementById('shakeButton');
  const boxHeadRadio = document.getElementById('boxHead');
  const sphereHeadRadio = document.getElementById('sphereHead');
  const roughnessSlider = document.getElementById('roughness');
  const metallicSlider = document.getElementById('metallic');

  const resetCameraOrbit = () => {
    CameraState.orbitAngle = 0;
    robotRotationSlider.value = 0;
    updateCameraPosition();
  };

  walkSpeed.addEventListener('input', (e) => {
    uniforms.iWalkSpeed.value = parseFloat(e.target.value);
  });

  armSwing.addEventListener('input', (e) => {
    uniforms.iArmSwing.value = parseFloat(e.target.value);
  });

  cameraFOVSlider.addEventListener('input', (e) => {
    uniforms.iFOV.value = parseFloat(e.target.value);
  });

  robotRotationSlider.addEventListener('input', (e) => {
    const degrees = parseFloat(e.target.value);
    CameraState.orbitAngle = degrees * Math.PI / 180.0;
    updateCameraPosition();
  });

  roughnessSlider.addEventListener('input', (e) => {
    uniforms.iRoughness.value = parseFloat(e.target.value);
  });

  metallicSlider.addEventListener('input', (e) => {
    uniforms.iMetallic.value = parseFloat(e.target.value);
  });

  lightIntensitySlider.addEventListener('input', (e) => {
    uniforms.iLightIntensity.value = parseFloat(e.target.value);
  });



  orthographicRadio.addEventListener('change', () => {
    uniforms.iPerspective.value = 0.0;
    cameraFOVSlider.disabled = true;
    resetCameraOrbit();
  });
  
  perspectiveRadio.addEventListener('change', () => {
    uniforms.iPerspective.value = 1.0;
    cameraFOVSlider.disabled = false;
    resetCameraOrbit();
  });
  
  cameraFOVSlider.disabled = false;
  
  boxHeadRadio.addEventListener('change', () => {
    uniforms.iSphereHead.value = 0.0;
  });
  
  sphereHeadRadio.addEventListener('change', () => {
    uniforms.iSphereHead.value = 1.0;
  });
  
  shakeButton.addEventListener('mousedown', () => {
    CameraState.shake.active = true;
    CameraState.shake.intensity = SHAKE_INTENSITY.BUTTON;
  });
  
  shakeButton.addEventListener('mouseup', () => {
    CameraState.shake.active = false;
    CameraState.shake.intensity = 0;
  });
  
  shakeButton.addEventListener('mouseleave', () => {
    CameraState.shake.active = false;
    CameraState.shake.intensity = 0;
  });

  shakeButton.addEventListener('touchstart', (e) => {
    e.preventDefault(); 
    CameraState.shake.active = true;
    CameraState.shake.intensity = SHAKE_INTENSITY.BUTTON;
  });
  
  shakeButton.addEventListener('touchend', (e) => {
    e.preventDefault();
    CameraState.shake.active = false;
    CameraState.shake.intensity = 0;
  });
  
  shakeButton.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    CameraState.shake.active = false;
    CameraState.shake.intensity = 0;
  });

  window.addEventListener('keydown', (e) => {
    switch(e.key) {
      case 'ArrowLeft':
        CameraState.orbitAngle -= CAMERA_CONTROLS.ORBIT_SPEED_DEG * Math.PI / 180;
        robotRotationSlider.value = CameraState.orbitAngle * 180 / Math.PI;
        break;
      case 'ArrowRight':
        CameraState.orbitAngle += CAMERA_CONTROLS.ORBIT_SPEED_DEG * Math.PI / 180;
        robotRotationSlider.value = CameraState.orbitAngle * 180 / Math.PI;
        break;
      case 'ArrowUp':
        uniforms.iFOV.value = Math.min(120, uniforms.iFOV.value + CAMERA_CONTROLS.FOV_SPEED_DEG);
        cameraFOVSlider.value = uniforms.iFOV.value;
        break;
      case 'ArrowDown':
        uniforms.iFOV.value = Math.max(20, uniforms.iFOV.value - CAMERA_CONTROLS.FOV_SPEED_DEG);
        cameraFOVSlider.value = uniforms.iFOV.value;
        break;
      case ' ':
        CameraState.shake.active = true;
        CameraState.shake.intensity = SHAKE_INTENSITY.KEYBOARD;
        break;
    }
    
    if (!CameraState.shake.active) {
      updateCameraPosition();
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

  if (CameraState.shake.active && CameraState.shake.intensity > 0.01) {
    const shakeX = (Math.random() - 0.5) * CameraState.shake.intensity;
    const shakeY = (Math.random() - 0.5) * CameraState.shake.intensity;
    const shakeZ = (Math.random() - 0.5) * CameraState.shake.intensity;
    
    const baseX = Math.sin(CameraState.orbitAngle) * CameraState.distance + CameraState.offset.x;
    const baseZ = Math.cos(CameraState.orbitAngle) * CameraState.distance;
    
    uniforms.iCameraPos.value.set(
      baseX + shakeX,
      CameraState.offset.y + shakeY,
      baseZ + shakeZ
    );
    
    uniforms.iShakeIntensity.value = CameraState.shake.intensity;
    CameraState.shake.intensity *= CameraState.shake.decay;
  } else {
    CameraState.shake.active = false;
    CameraState.shake.intensity = 0;
    updateCameraPosition();
    uniforms.iShakeIntensity.value = 0.0;
  }

  uniforms.iTime.value = time;
  renderer.render(scene, camera);
  requestAnimationFrame(render);
};

const resizeRendererToDisplaySize = (renderer) => {
  const canvas = renderer.domElement;
  const pixelRatio = window.devicePixelRatio;
  const width = canvas.clientWidth * pixelRatio | 0;
  const height = canvas.clientHeight * pixelRatio | 0;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) renderer.setSize(width, height, false);
  return needResize;
}
