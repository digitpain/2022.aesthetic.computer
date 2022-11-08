export class CamDoll {
  cam;
  #dolly;

  #W;
  #S;
  #A;
  #D;
  #UP;
  #DOWN;
  #LEFT;
  #RIGHT;

  constructor(Camera, Dolly, opts) {
    this.cam = new Camera(80, {
      z: opts.z || 0,
      y: opts.y * - 1 || -0.5,
      scale: [1, 1, 1],
    });
    this.#dolly = new Dolly(this.cam); // moves the camera
  }

  sim() {
    // 🔫 FPS style camera movement.
    let forward = 0,
      strafe = 0;
    if (this.#W) forward = -0.002;
    if (this.#S) forward = 0.002;
    if (this.#A) strafe = -0.002;
    if (this.#D) strafe = 0.002;

    if (this.#W || this.#S || this.#A || this.#D) {
      this.#dolly.push({ x: strafe, z: forward });
    }

    if (this.#UP) this.cam.rotX += 1;
    if (this.#DOWN) this.cam.rotX -= 1;
    if (this.#LEFT) this.cam.rotY += 1;
    if (this.#RIGHT) this.cam.rotY -= 1;
    this.#dolly.sim();
  }

  act(e) {
    // 💻️ Keyboard: WASD for movement, arrows for looking.
    if (e.is("keyboard:down:w")) this.#W = true;
    if (e.is("keyboard:down:s")) this.#S = true;
    if (e.is("keyboard:down:a")) this.#A = true;
    if (e.is("keyboard:down:d")) this.#D = true;

    if (e.is("keyboard:up:w")) this.#W = false;
    if (e.is("keyboard:up:s")) this.#S = false;
    if (e.is("keyboard:up:a")) this.#A = false;
    if (e.is("keyboard:up:d")) this.#D = false;

    if (e.is("keyboard:down:arrowup")) this.#UP = true;
    if (e.is("keyboard:down:arrowdown")) this.#DOWN = true;
    if (e.is("keyboard:down:arrowleft")) this.#LEFT = true;
    if (e.is("keyboard:down:arrowright")) this.#RIGHT = true;

    if (e.is("keyboard:up:arrowup")) this.#UP = false;
    if (e.is("keyboard:up:arrowdown")) this.#DOWN = false;
    if (e.is("keyboard:up:arrowleft")) this.#LEFT = false;
    if (e.is("keyboard:up:arrowright")) this.#RIGHT = false;

    // 👀 Look around if 2nd mouse button is held.
    // Note: Sometimes multiple mouse buttons can be held... in which case
    //       e.button only holds the original (duplicate events are not sent).
    if (e.is("draw") && e.buttons.includes(2)) {
      this.cam.rotX -= e.delta.y / 3.5;
      this.cam.rotY -= e.delta.x / 3.5;
    }
  }
}
