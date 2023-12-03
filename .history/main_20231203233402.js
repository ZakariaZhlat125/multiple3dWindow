import WindowManager from "./WindowManager.js";

const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let balls = [];
let starsGroup;
let sceneOffsetTarget = { x: 0, y: 0 };
let sceneOffset = { x: 0, y: 0 };

let today = new Date();

today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
today = today.getTime();

let internalTime = getTime();
let windowManager;
let initialized = false;

// get time in seconds since beginning of the day (so that all windows use the same time)
function getTime() {
  return (new Date().getTime() - today) / 1000.0;
}

if (new URLSearchParams(window.location.search).get("clear")) {
  localStorage.clear();
} else {
  // this code is essential to circumvent that some browsers preload the content of some pages before you actually hit the url
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState != "hidden" && !initialized) {
      init();
    }
  });

  window.onload = () => {
    if (document.visibilityState != "hidden") {
      init();
    }
  };

  function init() {
    initialized = true;

    // add a short timeout because window.offsetX reports wrong values before a short period
    setTimeout(() => {
      setupScene();
      setupWindowManager();
      resize();
      updateWindowShape(false);
      render();
      window.addEventListener("resize", resize);
      changeBallColors();
      createStars();
      setInterval(updateStarsPosition, 4000); // Update stars' positions every 4 seconds
    }, 500);
  }

  function setupScene() {
    camera = new t.OrthographicCamera(
      0,
      0,
      window.innerWidth,
      window.innerHeight,
      -10000,
      10000
    );

    camera.position.z = 2.5;
    near = camera.position.z - 0.5;
    far = camera.position.z + 0.5;

    scene = new t.Scene();
    scene.background = new t.Color(0x222222);
    scene.add(camera);

    renderer = new t.WebGLRenderer({ antialias: true, depthBuffer: true });
    renderer.setPixelRatio(pixR);
    starsGroup = new t.Group();
    scene.add(starsGroup);
    world = new t.Object3D();
    scene.add(world);

    renderer.domElement.setAttribute("id", "scene");
    document.body.appendChild(renderer.domElement);
  }

  function setupWindowManager() {
    windowManager = new WindowManager();
    windowManager.setWinShapeChangeCallback(updateWindowShape);
    windowManager.setWinChangeCallback(windowsUpdated);

    let metaData = { foo: "bar" };

    windowManager.init(metaData);

    windowsUpdated();
  }

  function windowsUpdated() {
    updateBalls();
  }

  function updateBalls() {
    let wins = windowManager.getWindows();

    balls.forEach((c) => {
      world.remove(c);
    });

    balls = [];

    for (let i = 0; i < wins.length; i++) {
      let win = wins[i];
      let c;
      if (i == 0) {
        c = new t.Color("hsl(230, 80%, 75%)");
      } else if (i == 1) {
        c = new t.Color("hsl(350, 60%, 65%)");
      } else {
        let idBasedHueValue = (win.id % 10) / 10;
        let hue;
        if (idBasedHueValue < 0.5) {
          hue = 240 - idBasedHueValue * 2 * 60;
        } else {
          hue = 360 - (idBasedHueValue - 0.5) * 2 * 60;
        }
        c = new t.Color(`hsl(${hue}, 50%, 70%)`);
      }

      let s = 100 + i * 50;
      let radius = s / 2;
      let sphere = createComplexSphere(radius, c);
      sphere.position.x = win.shape.x + win.shape.w * 0.5;
      sphere.position.y = win.shape.y + win.shape.h * 0.5;

      world.add(ball);
      balls.push(ball);
    }
  }

  function createComplexSphere(radius, color) {
    let innerSize = radius * 0.9;
    let outerSize = radius;
    let innerColor = color;
    let outerColor = color;

    let complexSphere = new THREE.Group();

    let sphereWireframeInner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(innerSize, 2),
      new THREE.MeshLambertMaterial({
        color: innerColor,
        wireframe: true,
        transparent: true,
        shininess: 0,
      })
    );
    complexSphere.add(sphereWireframeInner);

    let sphereWireframeOuter = new THREE.Mesh(
      new THREE.IcosahedronGeometry(outerSize, 3),
      new THREE.MeshLambertMaterial({
        color: outerColor,
        wireframe: true,
        transparent: true,
        shininess: 0,
      })
    );
    complexSphere.add(sphereWireframeOuter);

    let sphereGlassInner = new THREE.Mesh(
      new THREE.SphereGeometry(innerSize, 32, 32),
      new THREE.MeshPhongMaterial({
        color: innerColor,
        transparent: true,
        shininess: 25,
        opacity: 0.3,
      })
    );
    complexSphere.add(sphereGlassInner);

    let sphereGlassOuter = new THREE.Mesh(
      new THREE.SphereGeometry(outerSize, 32, 32),
      new THREE.MeshPhongMaterial({
        color: outerColor,
        transparent: true,
        shininess: 25,
        opacity: 0.3,
      })
    );
    complexSphere.add(sphereGlassOuter);

    let particlesOuter = createParticles(outerSize, outerColor);
    complexSphere.add(particlesOuter);

    let particlesInner = createParticles(innerSize, innerColor);
    complexSphere.add(particlesInner);

    return complexSphere;
  }


  function updateWindowShape(easing = true) {
    sceneOffsetTarget = { x: -window.screenX, y: -window.screenY };
    if (!easing) sceneOffset = sceneOffsetTarget;
  }

  function render() {
    let t = getTime();

    windowManager.update();

    let falloff = 0.05;
    sceneOffset.x =
      sceneOffset.x + (sceneOffsetTarget.x - sceneOffset.x) * falloff;
    sceneOffset.y =
      sceneOffset.y + (sceneOffsetTarget.y - sceneOffset.y) * falloff;

    world.position.x = sceneOffset.x;
    world.position.y = sceneOffset.y;

    let wins = windowManager.getWindows();

    for (let i = 0; i < balls.length; i++) {
      let ball = balls[i];
      let win = wins[i];
      let _t = t;

      let posTarget = {
        x: win.shape.x + win.shape.w * 0.5,
        y: win.shape.y + win.shape.h * 0.5,
      };

      ball.position.x =
        ball.position.x + (posTarget.x - ball.position.x) * falloff;
      ball.position.y =
        ball.position.y + (posTarget.y - ball.position.y) * falloff;
      ball.rotation.x = _t * 0.5;
      ball.rotation.y = _t * 0.3;
    }
    starsGroup.rotation.x -= 0.0005;
    starsGroup.rotation.y -= 0.0008;
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  function changeBallColors() {
    setInterval(() => {
      balls.forEach((ball) => {
        const randomColor = Math.random() * 0xffffff;
        ball.material.color.setHex(randomColor);
      });
    }, 2000);
  }

  function createStars() {
    const sphere = new Float32Array(10000);
    const { radius } = { radius: 1500 };

    for (let i = 0; i < sphere.length; i += 3) {
      const [x, y, z] = randomInSphere(radius);
      sphere[i] = x;
      sphere[i + 1] = y;
      sphere[i + 2] = z;
    }

    const geometry = new t.BufferGeometry();
    geometry.setAttribute("position", new t.BufferAttribute(sphere, 3));

    const material = new t.PointsMaterial({
      transparent: true,
      color: 0xf272c8,
      size: 1.6,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const points = new t.Points(geometry, material);
    starsGroup.add(points);
  }

  function randomInSphere(radius) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    return [x, y, z];
  }

  function resize() {
    let width = window.innerWidth;
    let height = window.innerHeight;

    camera = new t.OrthographicCamera(0, width, 0, height, -10000, 10000);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function updateStarsPosition() {
    starsGroup.remove(starsGroup.children[0]); // Remove the previous stars from starsGroup
    createStars();
  }
}
