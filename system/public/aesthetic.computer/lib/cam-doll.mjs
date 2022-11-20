export class CamDoll {
  cam;
  #dolly;

  #W;
  #S;
  #A;
  #D;
  #SPACE;
  #SHIFT;
  #UP;
  #DOWN;
  #LEFT;
  #RIGHT;

  constructor(Camera, Dolly, opts) {
    this.cam = new Camera(80, {
      z: opts.z || 0,
      y: opts.y * -1 || -0.5,
      scale: [1, 1, 1],
    });
    this.#dolly = new Dolly(this.cam); // moves the camera
  }

  sim() {
    // 🔫 FPS style camera movement.
    let forward = 0,
      updown = 0,
      strafe = 0;
    if (this.#W) forward = -0.0005;
    if (this.#S) forward = 0.0005;
    if (this.#A) strafe = -0.0005;
    if (this.#D) strafe = 0.0005;

    if (this.#SPACE) updown = 0.0005;
    if (this.#SHIFT) updown = -0.0005;

    if (
      this.#W ||
      this.#S ||
      this.#A ||
      this.#D ||
      this.#SPACE ||
      this.#SHIFT
    ) {
      this.#dolly.push({ x: strafe, y: updown, z: forward });
    }

    if (this.#UP) this.cam.rotX += 1;
    if (this.#DOWN) this.cam.rotX -= 1;
    if (this.#LEFT) this.cam.rotY += 1;
    if (this.#RIGHT) this.cam.rotY -= 1;
    this.#dolly.sim();
  }

  // TODO: Also add touch controls here.
  act(e) {
    // 💻️ Keyboard: WASD, SPACE and SHIFT for movement, ARROW KEYS for looking.
    if (e.is("keyboard:down:w")) this.#W = true;
    if (e.is("keyboard:down:s")) this.#S = true;
    if (e.is("keyboard:down:a")) this.#A = true;
    if (e.is("keyboard:down:d")) this.#D = true;

    if (e.is("keyboard:up:w")) this.#W = false;
    if (e.is("keyboard:up:s")) this.#S = false;
    if (e.is("keyboard:up:a")) this.#A = false;
    if (e.is("keyboard:up:d")) this.#D = false;

    if (e.is("keyboard:down:space")) this.#SPACE = true;
    if (e.is("keyboard:down:shift")) this.#SHIFT = true;
    if (e.is("keyboard:up:space")) this.#SPACE = false;
    if (e.is("keyboard:up:shift")) this.#SHIFT = false;

    if (e.is("keyboard:down:arrowup")) this.#UP = true;
    if (e.is("keyboard:down:arrowdown")) this.#DOWN = true;
    if (e.is("keyboard:down:arrowleft")) this.#LEFT = true;
    if (e.is("keyboard:down:arrowright")) this.#RIGHT = true;

    if (e.is("keyboard:up:arrowup")) this.#UP = false;
    if (e.is("keyboard:up:arrowdown")) this.#DOWN = false;
    if (e.is("keyboard:up:arrowleft")) this.#LEFT = false;
    if (e.is("keyboard:up:arrowright")) this.#RIGHT = false;

    // Note: Sometimes multiple mouse buttons can be held... in which case
    //       e.button only holds the original (duplicate events are not sent).
    if (e.is("draw")) {
      this.cam.rotX -= e.delta.y / 3.5;
      this.cam.rotY -= e.delta.x / 3.5;
    }
    // 🖖 Touch
    // Two fingers for move forward.
    if (e.is("touch:2")) this.#W = true;
    if (e.is("lift:2")) this.#W = false;

    // Three fingers for moving backward.
    if (e.is("touch:3")) this.#S = true;
    if (e.is("lift:3")) this.#S = false;
  }
}
