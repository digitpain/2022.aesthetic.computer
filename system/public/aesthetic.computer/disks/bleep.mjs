// Bleep, 22.07.15.19.21  
// A configurable interface of colored boxes that can be pushed to make tones.

// 🥾 Boot (Runs once before first paint and sim)
function boot({ resize }) {
  // TODO: Runs only once!
  // resize(50, 20);
}

// 🧮 Sim(ulate) (Runs once per logic frame (120fps locked)).
function sim($api) {
  // TODO: Move a ball here!
  //console.log($api);
}

// 🎨 Paint (Executes every display frame)
function paint({ wipe }) {
  wipe(0); // Draw a black background
  return false; // Only once.
}

// ✒ Act (Runs once per user interaction)
function act({ event }) {}

// 💗 Beat (Runs once per bpm, starting when the audio engine is activated.)
function beat($api) {
  // TODO: Play a sound here!
}

// 📚 Library (Useful classes & functions used throughout the piece)
// ...

export { boot, sim, paint, act, beat };
