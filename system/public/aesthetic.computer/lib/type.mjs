// Type, 22.12.10.14.06
// Abstraction for typography and text input.

/* #region 🏁 todo
 - [] Make history on message input optional?
 - [] Gracefully allow for multiple instances of TextInput in a single piece? 
 - [] Add tab auto-completion feature that can be side-loaded with contextual
      data based on where the text module is used.
#endregion */

import { font1 } from "../disks/common/fonts.mjs";

const { keys, entries } = Object;

// Preloads and holds the glyphs for a system typeface.
class Typeface {
  data;
  glyphs = {};

  constructor($preload, data, name = "font-1") {
    this.data = data;
    entries(data).forEach(([glyph, location]) => {
      $preload(
        `aesthetic.computer/disks/drawings/${name}/${location}.json`
      ).then((res) => {
        this.glyphs[glyph] = res;
      });
    });
  }
}

// An interactive text prompt object.
class TextInput {
  text; // text content

  blink; // block cursor blink timer
  showBlink = false;

  canType = false;
  typeface;

  pal;

  processCommand;

  historyDepth = 0;

  constructor($, text = "", palette, processCommand, font = font1) {
    this.typeface = new Typeface($.net.preload, font);
    this.text = text;
    this.startingInput = this.text;
    this.pal = palette || {
      fg: 255,
      bg: 0,
      block: 255,
      line: 255,
    };
    this.processCommand = processCommand;
    $.send({ type: "text-input-enabled" });
  }

  paint($) {
    // TODO: Does this need to be instantiated on each paint? 22.12.10.14.11
    const prompt = new Prompt(6, 6);

    // Print `text` to the prompt one letter at time.
    for (const char of this.text) {
      //ink(255, 255, 0, 20).box(prompt.pos); // Paint a highlight background.
      // And the letter if it is present.
      const pic = this.typeface.glyphs[char];
      if (pic)
        $.ink(this.pal.fg).draw(pic, prompt.pos.x, prompt.pos.y, prompt.scale);
      // Only move the cursor forward if we matched a character or typed a space.
      if (pic || char === " ") prompt.forward();
    }

    if (this.canType) {
      $.ink(this.pal.line).line(
        prompt.gutter,
        0,
        prompt.gutter,
        $.screen.height
      ); // Ruler
      $.ink(127).box(0, 0, $.screen.width, $.screen.height, "inline"); // Focus
      if (this.showBlink) $.ink(this.pal.block).box(prompt.pos); // Draw blinking cursor.
    }

    // Return false if we have loaded every glyph.
    // (Can be wired up to the return value of the parent's `paint`)
    // TODO: This causes some extra paints on startup.
    return !(
      keys(this.typeface.glyphs).length === keys(this.typeface.data).length
    );
  }

  sim({ seconds, needsPaint, gizmo: { Hourglass } }) {
    this.blink =
      this.blink ||
      new Hourglass(seconds(0.75), {
        flipped: (showBlinkOverride) => {
          if (showBlinkOverride !== undefined)
            this.showBlink = showBlinkOverride;
          else this.showBlink = !this.showBlink;
          needsPaint();
        },
        autoFlip: true,
      });

    if (this.canType) this.blink.step();
  }

  async act($) {
    const { event: e, slug, store, needsPaint } = $;

    // ✂️ Paste from user clipboard.
    if (e.is("pasted:text")) {
      this.text += e.text;
      this.blink?.flip(true);
    }

    // ⌨️ Add text via the keyboard.
    if (e.is("keyboard:down")) {
      if (this.canType === false) {
        this.canType = true;
        this.text = "";
      } else if (e.key.length === 1 && e.ctrl === false && e.key !== "`") {
        this.text += e.key; // Printable keys.
      } else {
        // Other keys.
        if (e.key === "Backspace") this.text = this.text.slice(0, -1);
        const key = `${slug}:history`;

        // Send a command or message.
        if (e.key === "Enter") {
          // Make a history stack if one doesn't exist already.
          store[key] = store[key] || [];

          // Push input to a history stack, avoiding repeats.
          if (store[key][0] !== this.text) store[key].unshift(this.text);

          // console.log("📚 Stored prompt history:", store[key]);
          store.persist(key); // Persist the history stack across tabs.

          // 🍎 Process commands for a given context, passing the text input.
          this.processCommand?.(this.text);
          this.text = "";
        }

        if (e.key === "Escape") this.text = "";

        // Move backwards through history stack.
        if (e.key === "ArrowUp") {
          const history = (await store.retrieve(key)) || [""];
          this.text = history[this.historyDepth];
          this.historyDepth = (this.historyDepth + 1) % history.length;
        }

        // ... and forwards.
        if (e.key === "ArrowDown") {
          const history = (await store.retrieve(key)) || [""];
          this.text = history[this.historyDepth];
          this.historyDepth -= 1;
          if (this.historyDepth < 0)
            this.historyDepth = history.length - 1;
        }
      }
      this.blink?.flip(true);
    }

    // Handle activation / focusing of the input
    // (including os-level software keyboard overlays)
    if (e.is("typing-input-ready")) {
      this.canType = true;
      this.text = "";
      this.blink?.flip(true);
    }

    if (e.is("keyboard:close")) {
      this.canType = false;
      needsPaint();
    }

    if (e.is("defocus")) {
      this.canType = false;
      this.text = this.startingInput;
      needsPaint();
    }
  }
}

// Manages the scale / wrapping of text and the interaction of a cursor.
// (Just for rendering of `Text`)
class Prompt {
  top = 0;
  left = 0;

  scale = 1;
  blockWidth = 6;
  blockHeight = 10;
  letterWidth = this.blockWidth * this.scale;
  letterHeight = this.blockHeight * this.scale;

  colWidth = 48; // Maximum width of each line before wrapping.

  cursor = { x: 0, y: 0 };

  gutter = (this.colWidth + 1) * this.blockWidth;

  constructor(top = 0, left = 0) {
    this.top = top;
    this.left = left;
  }

  get pos() {
    const x = this.top + this.cursor.x * this.letterWidth;
    const y = this.left + this.cursor.y * this.letterHeight;
    return { x, y, w: this.letterWidth, h: this.letterHeight };
  }

  forward() {
    this.cursor.x = (this.cursor.x + 1) % this.colWidth;
    if (this.cursor.x === 0) this.cursor.y += 1;
  }
}

export { Typeface, TextInput, Prompt };
