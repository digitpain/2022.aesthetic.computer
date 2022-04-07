// DIGITPAIN, 2022.04.06.15.40
//

// TODO
// - Load and display the two painted images.
// - Should these projects be merged?

let img1, img2;

// 🥾 Boot (Runs once before first paint and sim)
async function boot({ net: { preload }, cursor, fps, resize }) {
  cursor("native");
  resize(1000, 1250); // 3x5
  //resize(2000, 2500); // 3x5
  preload("disks/digitpain/0/0.png").then((img) => {
    img1 = img;
  });

  preload("disks/digitpain/0/1.png").then((img) => {
    img2 = img;
  });
}

let thaumaTime = 0;
let thaumaMax = 10;

let needsFlip = false;
let flip = true;

// 🧮 Sim(ulate) (Runs once per logic frame (120fps locked)).
function sim({ help: { choose } }) {
  if (img1 && img2) {
    thaumaTime += 1;
    if (thaumaTime > thaumaMax) {
      thaumaTime = 0;
      thaumaMax = choose(5, 6, 7);
      needsFlip = true;
    }
  }
}

// 🎨 Paint (Executes ever display frame)

function paint({
  wipe,
  paste,
  grid,
  geo: { Grid },
  num: { randIntRange: r },
  help: { choose },
  screen,
  paintCount,
}) {
  if (needsFlip && img1 && img2) {
    if (flip) {
      paste(img1, 0, 0);
    } else {
      paste(img2, 0, 0);
    }
    flip = !flip;
    needsFlip = false;
  }
}

// ✒ Act (Runs once per user interaction)
function act({ event }) {}

// 💗 Beat (Runs once per bpm)
function beat($api) {
  // TODO: Play a sound here!
}

// 📚 Library (Useful classes & functions used throughout the piece)
// ...

export { boot, sim, paint, act, beat };
