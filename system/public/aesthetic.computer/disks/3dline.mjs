// 3D Line, 22.10.05.11.01
// A test for developing software (and hardware) rasterized 3D lines
// and other geometry.

let cam, dolly; // Camera system.
let floor, cross, tri, lines; // Geometry.

// 🥾 Boot (Runs once before first paint and sim)
function boot({ painting: p, Camera, Dolly, Form, QUAD, TRI, LINE }) {
  cam = new Camera(80, { z: 4 }); // camera with fov
  dolly = new Dolly(cam); // moves the camera

  floor = new Form(
    QUAD,
    { tex: p(2, 2, (g) => g.wipe(0, 0, 100)) },
    { pos: [0, -1, 1], rot: [-90, 0, 0], scale: [3, 3, 3] }
  );

  cross = new Form(
    QUAD,
    { tex: p(16, 16, (g) => g.i(255, 0, 0).l(0, 0, 16, 16).l(16, 0, 0, 16)) },
    { pos: [0, -0.99, 1], rot: [-90, 0, 0] }
  );

  tri = new Form(
    TRI,
    { tex: p(1, 8, (g) => g.noise16DIGITPAIN()), alpha: 0.75 },
    { pos: [0, 0, 1] }
  );

  lines = new Form(LINE, { pos: [0, 1, 1] });
}

// 🎨 Paint (Executes every display frame)
function paint({ wipe, ink, form, screen }) {
  ink(0, 0, 255).form([floor, cross, tri, lines], cam); // Renders on GPU layer.

  // TODO: Do a dirty box wipe here / use this to test the new compositor? 🤔
  wipe(10, 0).ink(255, 255, 255, 127).box(...screen.center, 7, "fill*center");

  ink(0, 255, 0).form(lines, cam, { cpu: true }); // Render on CPU layer.
}

let W, S, A, D;
let UP, DOWN, LEFT, RIGHT;

// 🧮 Sim(ulate) (Runs once per logic frame (120fps locked)).
function sim($api) {
  // First person camera controls.
  let forward = 0,
    strafe = 0;

  if (W) forward = -0.004;
  if (S) forward = 0.004;
  if (A) strafe = -0.004;
  if (D) strafe = 0.004;

  if (W || S || A || D) dolly.push({ x: strafe, z: forward });

  if (UP) cam.rotX += 1;
  if (DOWN) cam.rotX -= 1;
  if (LEFT) cam.rotY += 1;
  if (RIGHT) cam.rotY -= 1;

  dolly.sim();

  // Object rotation.
  tri.turn({ y: -0.25 });
  lines.turn({ x: -0.5, y: 0.5, z: 0.2 });
}

// ✒ Act (Runs once per user interaction)
function act({ event: e }) {
  // 🖖 Touch
  // Two fingers for move forward.
  if (e.is("touch:2")) W = true;
  if (e.is("lift:2")) W = false;

  // Three fingers for moving backward.
  if (e.is("touch:3")) S = true;
  if (e.is("lift:3")) S = false;

  // 💻️ Keyboard: WASD for movement, arrows for looking.
  if (e.is("keyboard:down:w")) W = true;
  if (e.is("keyboard:down:s")) S = true;
  if (e.is("keyboard:down:a")) A = true;
  if (e.is("keyboard:down:d")) D = true;

  if (e.is("keyboard:up:w")) W = false;
  if (e.is("keyboard:up:s")) S = false;
  if (e.is("keyboard:up:a")) A = false;
  if (e.is("keyboard:up:d")) D = false;

  if (e.is("keyboard:down:arrowup")) UP = true;
  if (e.is("keyboard:down:arrowdown")) DOWN = true;
  if (e.is("keyboard:down:arrowleft")) LEFT = true;
  if (e.is("keyboard:down:arrowright")) RIGHT = true;

  if (e.is("keyboard:up:arrowup")) UP = false;
  if (e.is("keyboard:up:arrowdown")) DOWN = false;
  if (e.is("keyboard:up:arrowleft")) LEFT = false;
  if (e.is("keyboard:up:arrowright")) RIGHT = false;

  // 🖱️ Mouse: Look around while dragging.
  if (e.is("draw")) {
    cam.rotY -= e.delta.x / 3.5;
    cam.rotX -= e.delta.y / 3.5;
  }
}

// 💗 Beat (Runs once per bpm, starting when the audio engine is activated.)
function beat($api) {
  // Make sound here.
}

// 👋 Leave (Runs once before the piece is unloaded)
function leave($api) {
  // Pass data to the next piece here.
}

export { boot, sim, paint, act, beat, leave };

// 📚 Library (Useful functions used throughout the piece)
