// Tube, 22.11.05.00.30
// Designing some good triangulated geometry for wand marks.

// TODO
// - [] Add dolly with controls here.
// - [] Draw wireframe triangles, lines, and points.
// - [] Make a turtle that can move the tube forward.

let cam, dolly;
let W, S, A, D, UP, DOWN, LEFT, RIGHT;

function boot({ Camera, Dolly }) {
  cam = new Camera(80, { z: 1, y: -0.5, scale: [1, 1, 1] });
  dolly = new Dolly(cam); // moves the camera
}

let rot = 0;
let sides = 8;

function paint({ wipe, pen, wiggle, Form, num, QUAD, painting: p, form }) {
  wipe(0, 0);

  // Floor
  form(
    new Form(
      QUAD,
      { tex: p(2, 2, (g) => g.wipe(0, 0, 100)) },
      { rot: [-90, 0, 0] }
    ),
    cam,
    { cpu: true }
  );

  rot += 0.25;

  // Cursor
  const cDepth = 1;
  const cPos = cam.ray(pen.x, pen.y, cDepth, true);
  const cRot = cam.rotation.slice();
  //form(segment({ Form, num }, cPos, cRot, 0.1, 0.1, sides), cam, { cpu: true });

  // Segments
  const $ = { Form, num };

  // - [🔥] Pass a series of vertices through several segments?
  const vertices = [
    [0, 0, 0],
    [0, 0.1, 0],
    [0, 0.2, 0],
    [0, 0.3, 0],
    [0., 0.4, 0],
    [-0.1, 0.8, 0.1],
  ];

  let yw = wiggle(8);

  const angles = [
    [0, yw + rot, 0],
    [0, -yw + rot, 0],
    [0, yw + rot, 0],
    [0, -yw + rot, 0],
    [0, yw + rot, 0],
    [0, rot, 15],
  ];

  // Draw lines between them using connector segment.

  const path = [];
  vertices.forEach((vertex, i) => {
    path.push({ position: vertex, angle: angles[i], points: [] });
  });

  // Generate all the points in the "model"
  const shape = segmentShape($, 0.21, sides);

  // Copy each point in the shape and transform it by a path position and angle.
  // TODO: - [] Would switching to quaternions make this shorter? 22.11.05.23.34
  //            Should also be done in the `Camera` and `Form` class inside `graph.mjs`.
  const { vec4, mat4, radians } = num;
  path.forEach((p) => {
    shape.forEach((point) => {
      // ... by position
      const panned = mat4.fromTranslation(mat4.create(), p.position);

      // ... and around angle.
      const rotX = mat4.fromXRotation(mat4.create(), radians(p.angle[0]));
      const rotY = mat4.fromYRotation(mat4.create(), radians(p.angle[1]));
      const rotZ = mat4.fromZRotation(mat4.create(), radians(p.angle[2]));

      const rotatedX = mat4.mul(mat4.create(), panned, rotX);
      const rotatedY = mat4.mul(mat4.create(), rotatedX, rotY);
      const rotatedZ = mat4.mul(mat4.create(), rotatedY, rotZ);

      const matrix = rotatedZ;

      p.points.push(vec4.transformMat4(vec4.create(), [...point, 1], matrix));


    });
  });

  // -> Connector Segment
  const positions = [],
    colors = [];

  // Draw a line through the path for every side.
  for (let i = 0; i < sides + 1; i += 1) {
    // Order the positions as segments... [0, 1] -> [1, 2] -> [2, 3]
    for (let p = 1; p < path.length; p += 1) {
      positions.push(path[p - 1].points[i], path[p].points[i]);
      colors.push([255, 0, 0, 255], [255, 255, 255, 255]);
    }
  }

  // TODO: Add triangulation for sides.

  //console.log(positions);

  const seg = new Form(
    { type: "line", positions, colors },
    { color: [255, 255, 0, 255] },
    { scale: [1, 1, 1] }
  );

  // Transform a copy of them to end vertex and orientation B.

  form([seg], cam, { cpu: true });

  // ️-> Segment 1
  /*
  const seg1 = segment(
    $,
    [0, 0, 0],
    [-90, wiggle(30), rot],
    length,
    0.1,
    sides
  );
  */

  // -> Segment 2
  //const y = length + 0.4;
  //const seg2 = segment($, [0, y, 0], [-90, 20, rot], length, 0.1, sides);

  /*
  const rseg1 = new Form(
    { type: "line", positions: seg1.positions, colors: seg1.colors },
    { color: [255, 255, 0, 255] },
    { scale: [1, 1, 1] }
  );


  const rseg2 = new Form(
    { type: "line", positions: seg2.positions, colors: seg2.colors },
    { color: [255, 255, 0, 255] },
    { scale: [1, 1, 1] }
  );
  */

  // Rendering
  //form([rseg1, rseg2], cam, { cpu: true });
}

function sim() {
  // 🔫 FPS style camera movement.
  let forward = 0,
    strafe = 0;
  if (W) forward = -0.002;
  if (S) forward = 0.002;
  if (A) strafe = -0.002;
  if (D) strafe = 0.002;
  if (W || S || A || D) dolly.push({ x: strafe, z: forward });
  if (UP) cam.rotX += 1;
  if (DOWN) cam.rotX -= 1;
  if (LEFT) cam.rotY += 1;
  if (RIGHT) cam.rotY -= 1;
  dolly.sim();
}

function act({ event: e }) {
  // Increase complexity
  if (e.is("touch") && e.button === 0) {
    sides += 1;
  }

  // 👀 Look around if 2nd mouse button is held.
  if (e.is("draw") && e.button === 2) {
    cam.rotX -= e.delta.y / 3.5;
    cam.rotY -= e.delta.x / 3.5;
  }

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

  if (e.is("keyboard:down:k")) cursorSize += 0.1;
  if (e.is("keyboard:down:j")) cursorSize -= 0.1;
}

export { boot, paint, sim, act };

// 📑 Library

const { cos, sin } = Math;

// TODO: There should be an "inner" and "outer" triangulation option.
//       - [] Inner ONLY for complexity 1 and 2.
//       - [] Optional elsewhere.

// Takes a starting position, direction and length.
// Projects out a center core along with from there...
// Eventually produces a circle.
function segmentShape(
  { Form, num },
  //position,
  //direction,
  //length,
  radius,
  sides
) {
  const positions = [];

  // 🅰️ Define a core line for this segment shape, based around the z axis.
  positions.push([0, 0, 0, 1]);

  // 🅱️ Circumnavigate points around the center core..
  const PI2 = Math.PI * 2;
  for (var i = 0; i < sides; i += 1) {
    const angle = (i / sides) * PI2;
    positions.push([sin(angle) * radius, 0, cos(angle) * radius, 1]);
  }

  // 🔥 TODO: Add a flag for triangulation of end caps.

  return positions;
}
