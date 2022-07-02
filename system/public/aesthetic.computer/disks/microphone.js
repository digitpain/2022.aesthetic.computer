// Microphone, 2022.1.11.0.26
// A simple audio + video feedback monitor test.

// Note: Multiple clips can be string together with keyboard shortcuts.
//       How can I use this to do cut or continuous recording?

const { floor } = Math;

let mic,
  btn,
  rec = false;

function boot({ ui, screen, cursor }) {
  // cursor("native");
  btn = new ui.Button(screen.width / 2 - 4, screen.height - 24, 12, 12);
  btn.disabled = true;
}

function paint({ wipe, ink, screen: { width, height } }) {
  wipe(15, 20, 0); // Dark green background.

  // Waveform & Amplitude Line
  if (mic?.waveform.length > 0 && mic?.amplitude !== undefined) {
    const xStep = width / mic.waveform.length + 1;
    const yMid = height / 2,
      yMax = yMid;
    ink(255, 0, 0, 128).poly(
      mic.waveform.map((v, i) => [i * xStep, yMid + v * yMax])
    );
    const y = height - mic.amplitude * height;
    ink(255, 16).line(0, y, width, y); // Horiz. line for amplitude.
  }

  ink(0, 255, 0, 16).line(0, height / 2, width, height / 2); // Center line.

  // Record Button
  btn.paint((btn) => {
    ink(rec ? [255, 0, 0] : [80, 80, 80]).box(btn.box, btn.down ? "in" : "out");
  });
}

function sim() {
  mic?.poll(); // Query for updated amplitude and waveform data.
  btn.enableIf(mic?.waveform.length > 0);
}

function beat({ sound: { time, microphone } }) {
  if (!mic) mic = microphone.connect();
}

function act({ event: e, rec: { rolling, cut, print } }) {
  if (!mic) return; // Disable all events until the microphone is working.

  // Keyboard Events
  if (e.is("keyboard:down") && e.repeat === false) {
    if (e.key === "Enter") {
      if (rec === false) {
        rolling("video");
        rec = true;
      } else {
        cut();
        rec = false;
      }
    }
    if (e.key == " ") print();
  }

  // Record Button
  btn.act(e, () => {
    if (rec === false) {
      rolling("video");
      rec = true;
    } else {
      cut();
      print();
      rec = false;
    }
  });
}

export { boot, sim, paint, beat, act };
