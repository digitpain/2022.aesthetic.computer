💀 Jeffrey's `aesthetic.computer` Notebook 💀

❓ Here to contribute code? Scroll waaaaaaaaay down to SETUP for instructions.

️🧪 Editor Upgrades: Try AceJump, Use ThinkPad More Often
☁️ Big Thoughts   : Maybe aesthetic.computer is more of an interface project
                    or search engine or *branded* prompt than it is a creative
                    platform?


                            🌟 Work In Progress 🌟


⚠️ Regressions:
 - [🟢] Flicker / held frame while moving between pieces. Right now it's just bright green.

 ***Feral File Whistlegraph Player***
 - [] Research whether to add a DOM layer to disks and whether to overload
      prompt with other pages.
 - [] Start using Git LFS for bigger assets like the whistlegraph mp4s
      or digitpain assets.

💀 Regressions: Flicker / held frame while moving between pieces.

 ***Feral File Whistlegraph Player***
 - [🟢] Research whether to add a DOM layer to disks and whether to overload
        prompt with other pages. Maybe aesthetic.computer is more of an interface
        project or search engine or *branded* prompt than it is a
        creative platform?
 - [] Start using Git LFS for bigger assets like the whistlegraph mp4s
      or digitpain assets.

 ***Pre DIGITPAIN Launch***
 - [] Complete DIGITPAIN 0-5.
       * Replace `digitpain0.gif` with a new image.
       * Should I make a frame capture tool for generating gifs?
 - [] Mint the work and have the contract made.
 - [] Add the work to the JSON and release digitpain.com.

 ***Post DIGITPAIN Launch***
 - [] Automate DIGITPAIN (Teia) exports:
        1. Clone `public` directory.
        2. Remove any `.html` files that aren't `digitpain-ipfs-index.html`.
        3. Process `digitpain-ipfs-index.html`, inserting info for a new mint.
        4. Rename `digitpain-ipfs-index.html` to `index.html`.
        3. Remove all files other than `/digitpain` and `digitpain0.js` from `disks/`.
        4. Zip the contents so there is a zip file with one directory called `public`,
           and rename it to `DIGITPAIN #.zip`.

🌟 Next Up 🌟
 ***Multi-player Drawing / Core Drawing***
  - [] Abstract `line` and `spline` into `nail`. See also: `gesture`.
  - [] Add sound to `nail`.
  - [] Use https://wicg.github.io/video-rvfc/ for video frame updates.

 ***Whistlegraph***
  - [] Write and complete: `whistlegraph` / `thumb`.
  - [] Add `whistlegraph 16x9` ratio mode so it can be used by Alex & Camille.
  - [] Make whistlegraph recorder disk / nail?
  - [] Global recording of user actions (what about application actions) and audio+video into one file?
  - [] Chalkboard / material simulation.

 ❤️Side Missions❤️
  - [] Fix skippy scale rendering of pixels on non-retina displays.
  - [] Bake `wrap` and `pixel` into the api. 2022.02.01.02.46 (JAS) [via sage.js]
  - [] in `tracker.js`: Recenter boxes on line 174.
  - [] Multiplayer board reset in `spray` and `server`.

⏳ Later On ⏳
  |
  |
  (Careful, it's messy!)

There seems to be a bug in Safari on my MacBook (while wearing AirPods) that slows
down the audio?

Surface with simulated chalk that can have multiple users, sound synthesis,
the ability to clear (slide up / down / left / right), record and playback.

UI - Make system UI icons resize along with the main screen... or hide them during a resize.
- (This is kinda ugly rn.)

- Adjust pixel density to be a bit better for iPhones / retina devices.
  - Cross-reference on my Thinkpad and also my laptop.

function act({ event: e }) { // Remove drawing api.

resize(64, 64); // Check if resizing to the same resolution just cancels it out silently.

Natural window zooming no longer works with the high resolution canvas buffer...
(Should I just implement / hijack and zoom on my own?)

Stop sending duplicate event data for "draw" and "touch" in `pen`.
  - e.is("draw") && e.is("touch") should not send duplicate event {x, y} data

Explore: removing: send({ type: "update", content: { didntRender: true, loading } });
From the bottom of `disk.js`.

- Find and fix out of memory error.
  - bios.js:307 Uncaught DOMException: Failed to execute 'postMessage' on 'Worker': Data cannot be cloned, out of memory.
        at Worker.postMessage (<anonymous>)
        at send (https://192.168.1.3/computer/bios.js:307:28)
        at Object.requestFrame (https://192.168.1.3/computer/bios.js:470:5)
        at https://192.168.1.3/computer/bios.js:416:40
        at loop (https://192.168.1.3/computer/lib/loop.js:43:3)
  - Could not reproduce...
  * Try and reproduce?

- Rewrite my old Python `Diary` program.
  - Mint diary entries.

- Add blockchain integration for identity: https://docs.moralis.io/introduction/readme

- Add loading spinner that works outside of debug mode.
  - Make an arc / circle function and draw a pie spinner.

Put this in a budget / progress bar system, related to the current refresh rate.
  - via `bios.js`

Re-work the depth buffer before making a simple 3D environment.

- Improve documentation.
  - In console when the whole thing opens.
  - Have a global keyboard shortcut to spit documentation to console... for each
    function!
  - Get jsDocs working: https://jsdoc.app/about-configuring-jsdoc.html

Make a camera-based chalk drawing pad tool.
  - Use a naive approach similar to my old software from the Oberlin lecture.
  - Also research ML based object tracking with latency.

Add tool for drawing on lucia's face during our dates.

Make Shrub.

Add "load URL" command to the prompt so any disk can be loaded from any URL.
    Then disk development can begin. (Once prompt actually generates docs.)
        - Would the best way to produce a scripting language be by making a fully
          curry-able system or some domain specific languages using `` then
          combining them?
    Could an editing session or new disk be started from the prompt? Maybe it
    could load a GitHub codespace?
    - How to make use of xterm.js? Could it be used for this project or not...

Implement drawing / gesture based disk launchers from the prompt.

Take over right click so no context menu shows up.

Pass 'diskTime' global into the api.

Add scriptProcessorNode fallback so audio can run within insecure contexts. (FigJam)

Stop tracks in all mediaStreams: https://stackoverflow.com/a/12436772
(Video and Microphone)

Add recording: https://stackoverflow.com/questions/19235286/convert-html5-canvas-sequence-to-a-video-file

Add pixels via: https://codepen.io/oceangermanique/pen/LqaPgO.

Adjust pixel scaling / `frame` algorithm so that pixels are always the same size
at different scale levels.

Add $api.sound.beatCount counter to `beat`.

Refactor (screen.width -> screen.w & screen.height -> screen.h) across the board?
  - To be more consistent with `graph.box`.

📩 Future

📅 End of January
  - Shader situation. `const fragmentEffect = video('webgl', screen.width, screen.height)`
  - Research software shaders.

What would a build script for releasing a single disk or
stack of disks look like?

  1. Make a new directory D for the build.
  2. Copy a subset of /disks/public to D/disks
  3. Copy index.html, style.css, boot.js and /computer to D.
  4. Modify boot.js to start loading from the first listed disk.
  5. Generate metadata.json for the work.
  6. Zip and upload to fxHash or put whole directory into Pinata.
  7. Test to make sure everything works.
  8. Mint on a contract (or Cancel and remove files from IPFS).

What would a full system / suite release look like?

1. Using the build script with a set of chosen disks where the main
  disk is a shell interface.

TODO: Document the API by generating the commands inside a disk and print
      them to the console using keyboard shortcuts.

      - Generate full API docs in the prompt disk.

TODO: Make my first generative disk / piece and mint it.
      - Test it in Chrome / Safari / and Firefox.
      - In larger multi-disk IPFS exports, a new root path must be defined other
        than `prompt`. See disk.js `load` function.

TODO: Make a quick fullscreen button (make a new keyboard input module).

TODO: Fix Firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=1247687

TODO: Add a new deployment scheme that actually allows my websocket server to
      function... this might mean leaving behind Vercel or configuring it
      for different directories in my repository, running separate server code
      for sockets.

TODO: Add syntax notification of some kind for disk files, using a comment at
      the top. This would eventually allow me to completely
      change from JavaScript.

TODO: Add stochastic syntax / DSL for basic drawing?
      Example: wipe.ink.line.line.line.ink("red").box;

TODO: What cryptocurrency / web3.js lib would I hook an editor up to
      for minting, uploading edition data, etc?

TODO: Make a video-recording app that generates 3 letter codes? - to augment
      my hand-written notes and pages.

TODO: Add ability to define the logical / simulation framerate.

TODO: Give myself the ability to automate testing of system using "robot".

TODO: Write a simple note taking program with saving and loading of drawings
 and also recording and playback?

TODO: Ink types? ... can they be procedural using a buffer?


                                   🎃 SETUP 💾


`aesthetic.computer` is virtual computer environment / interface designed for
 creative exploration. development requires nodejs, an up-to-date web browser,
 and knowledge of javascript. if you're interested in learning how to do any of
 this, visit https://discord.gg/digitpain and i'll help you out - jeffrey 2022.04.24.05.05

Clone, and then get set up for development:
  0. Check `ssl-dev/readme.txt` to generate SSL certificates before running locally.
  1. `cd` into `server` and run `npm install` and `npm run dev` to start the socket server
  2. `cd` into `system` and run `npm install` and `npm run dev` to start the web server

📖 This project originally began as two separate repositories with their own
commit history: `digitpain0/system` and `digitpain0/disks`.