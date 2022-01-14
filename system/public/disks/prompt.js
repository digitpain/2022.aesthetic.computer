// Prompt, 2021.11.28.03.13
// This is for working on font rendering and making a global disk chooser.

// TODO: Make a basic prompt.
//       *CURRENT*
//       1. Add the ability to load any disk by name.
//       2. Add a global ability to quit any disk with the ESC key...?
//          or maybe add a prompt overlay or ":ex" commands a la vim?

import { font1 } from "./common/fonts.js";
const { entries } = Object;

let glyphs = {};
let writeLetter;
// let text = "aesthetic.computer";
let text = "";

// 🥾 Boot (Runs once before first paint and sim)
function boot({ net: { preload } }) {
  // Preload all glyphs.
  entries(font1).forEach(([glyph, location]) => {
    preload(`disks/drawings/font-1/${location}.json`).then((res) => {
      glyphs[glyph] = res;
    });
  });
}

// 🎨 Paint (Runs once per display refresh rate)
function paint({ wipe, screen, ink, num: { multiply } }) {
  const cursor = { x: 0, y: 0 };
  const blockWidth = 6;
  const blockHeight = 10;
  const colWidth = 24;

  const gutter = (colWidth + 1) * blockWidth;

  wipe(70, 50, 100).ink(0, 0, 255, 64).line(gutter, 0, gutter, screen.height);

  writeLetter = (letter) => {
    // TODO: Write an X character if letter is not present rather than returning.

    // Silently pass through if letter is not present.
    // TODO: Should this still print a section or not?
    if (letter === undefined) return;

    const top = 6;
    const left = 6;
    const scale = 1;
    const letterWidth = blockWidth * scale;
    const letterHeight = blockHeight * scale;
    const x = top + cursor.x * letterWidth;
    const y = left + cursor.y * letterHeight;

    //ink(255, 255, 0, 20).box(x, y, ...letter.resolution.map((n) => n * scale));
    // TODO: How to write...
    ink(255, 255, 0, 20).box(x, y, ...multiply(letter.resolution, scale));
    ink(255, 100).draw(letter, x, y, scale);

    cursor.x = (cursor.x + 1) % colWidth;
    if (cursor.x === 0) cursor.y += 1;
  };

  for (const char of text) writeLetter(glyphs[char]); // Add space to glyphs?

  // Return false if we are yet to load every glyph.
  return !(Object.keys(glyphs).length === Object.keys(font1).length);
}

// ✒ Act (Runs once per user interaction)
function act({ event: e, needsPaint }) {
  if (e.is("keyboard:down")) {
    if (e.key.length === 1) text += e.key;
    // Print a key.
    else {
      console.log("Key:", e.key);
    }
    needsPaint();
  }
}

// 📚 Library (Useful functions used throughout the program)
// ...

export { boot, paint, act };
