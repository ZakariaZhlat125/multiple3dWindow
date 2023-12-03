import WindowManager from "./WindowManager.js";

const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let balls = [];
let backgroundSphere;
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
    scene.background = new t.Color(0.0);
    scene.add(camera);

    renderer = new t.WebGLRenderer({ antialias: true, depthBuffer: true });
    renderer.setPixelRatio(pixR);

    world = new t.Object3D();
    scene.add(world);

    renderer.domElement.setAttribute("id", "scene");
    document.body.appendChild(renderer.domElement);
  }

  function setupWindowManager() {
    windowManager = new WindowManager();
    windowManager.setWinShapeChangeCallback(updateWindowShape);
    windowManager.setWinChangeCallback(windowsUpdated);

    // here you can add your custom metadata to each windows instance
    let metaData = { foo: "bar" };

    // this will init the windowmanager and add this window to the centralised pool of windows
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

	balls=[];
	for(let i =0 ; i< wins.length; i++){
		let win = wins[i];
		let c = new t.Color();
		c.setHSL(i * .1, 1.0, .5);
		let radius = 50 + i * 20; // Define radius for each ball
		let segments = 16;
		let geometry = new t.SphereGeometry(radius, segments, segments);
		let material = new t.MeshBasicMaterial({ color: c });
		let ball = new t.Mesh(geometry, material);
		
		ball.position.x = win.shape.x + (win.shape.w * .5);
		ball.position.y = win.shape.y + (win.shape.h * .5);
	
		world.add(ball);
		balls.push(ball);
	}


  }

  function updateWindowShape(easing = true) {
    // storing the actual offset in a proxy that we update against in the render function
    sceneOffsetTarget = { x: -window.screenX, y: -window.screenY };
    if (!easing) sceneOffset = sceneOffsetTarget;
  }

  function render() {
    let t = getTime();

    windowManager.update();

    // calculate the new position based on the delta between current offset and new offset times a falloff value (to create the nice smoothing effect)
    let falloff = 0.05;
    sceneOffset.x =
      sceneOffset.x + (sceneOffsetTarget.x - sceneOffset.x) * falloff;
    sceneOffset.y =
      sceneOffset.y + (sceneOffsetTarget.y - sceneOffset.y) * falloff;

    // set the world position to the offset
    world.position.x = sceneOffset.x;
    world.position.y = sceneOffset.y;

    let wins = windowManager.getWindows();

    for (let i = 0; i < balls.length; i++) {
      let ball = balls[i];
      let win = wins[i];
      let _t = t; // + i * .2;

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

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }
  function changeBallColors() {
	setInterval(() => {
	  cubes.forEach((ball) => {
		const randomColor = Math.random() * 0xffffff; // Generate a random color
		ball.material.color.setHex(randomColor); // Set the new color to the ball's material
	  });
	}, 2000); // Change color every 4 seconds
  }
  // resize the renderer to fit the window size
  function resize() {
    let width = window.innerWidth;
    let height = window.innerHeight;

    camera = new t.OrthographicCamera(0, width, 0, height, -10000, 10000);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
}
