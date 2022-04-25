// Whistlegraph Player, 2022.4.19
// Made on occasion of Whistlegraph's Feral File exhibition.
// This player orchestrates the data for displaying 10 different whistlegraphs.

// ***Current***
// TODO: Make the box-shadow pixels relative to viewport size or a hardcoded margin size.
// TODO: Fix volume fade on iOS. See createMediaElementSource: https://www.youtube.com/watch?v=ETD26rd7h6c
// TODO: Make all the borders customizable again.

// TODO: Loading spinners... Should I allow cards to change, while things are
//       loading?
// TODO: Add cover images, and web-ready versions of videos.
// TODO: Background colors
// TODO: Use no / natural cursor?
// TODO: Transitions too fast on mobile.
// TODO: Fix iOS.

const whistlegraphs = {
  butterfly: {
    video: {
      border: 2,
      outerRadius: 0.25,
      innerRadius: 0,
      color: "rgb(200, 200, 50)",
      boxShadow: "4px 4px 12px rgba(0, 0, 255, 0.75)",
    },
    score: {
      border: 0,
      outerRadius: 0.25,
      innerRadius: 0,
      color: "pink",
      boxShadow: "4px 4px 12px rgba(255, 0, 0, 0.75)",
    },
    compilation: {
      border: 0.0,
      outerRadius: 0.25,
      innerRadius: 0,
      color: "grey",
      boxShadow: "4px 4px 12px rgba(0, 255, 0, 0.75)",
    },
  },
  iphone: {},
  "its-time-to-grow": {},
  "lately-when-i-fly": {},
  loner: {},
  "mommy-wow": {},
  "people-pleaser": {},
  puzzle: {},
  "slinky-dog": {},
  "whats-inside-your-heart": {},
};

// 🥾 Boot (Runs once before first paint and sim)
function boot({ cursor, wipe, content, query }) {
  wipe(200, 150, 150);

  cursor("native");

  // TODO: Read this info as a command line parameter.
  const whistlegraph = whistlegraphs[query[0] || "butterfly"];

  const deck = content.add(`
    <div class="card-deck">
      <div class="card-view" data-type="compilation" style="z-index: 0">
        <div class="card" data-type="compilation" data-ratio="720x1280">
          <video class="card-content" width="100%" height="100%" preload="metadata" playsinline loop muted src="/disks/wg-player/wg-player-test-tt.mp4#t=0.001"></video>
        </div>
      </div>
    
      <div class="card-view" data-type="score" style="z-index: 1">
        <div class="card" data-type="score" data-ratio="8.5x11">
          <img class="card-content" width="100%" height="100%" src="/disks/wg-player/wg-player-test.svg">
        </div>
      </div>
      
      <div class="card-view active" data-type="video" style="z-index: 2">
        <div class="card" data-type="video" data-ratio="4x5">
          <video class="card-content" width="100%" height="100%" preload="metadata" playsinline loop muted src="/disks/wg-player/wg-player-test.mp4#t=0.001"></video>
        </div>
      </div>
    </div>
    <script src="/disks/wg-player/wg-player-cards.js" type="module" defer></script>
    <style>  
    #content .card-deck {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      user-select: none;
      -webkit-user-select: none;
      font-size: 32px;
      display: flex;
    }
    
    #content .card-view {
      /*--margin: 5em;*/
      /*height: calc(100% - var(--margin));*/
      /*width: calc(100% - var(--margin));*/
      /*top: calc(var(--margin) / 2);*/
      /*left: calc(var(--margin) / 2);*/
      /*display: flex;*/
      width: 100%;
      height: 100%:
      box-sizing: border-box;
      position: absolute;
      pointer-events: none;
    }
    
    .card-deck.no-cursor { cursor: none; }
    .card-deck.no-cursor .card-view.active .card { cursor: none; }
    
    .card-view.active .card { cursor: pointer; }
    
    .card {
      box-sizing: border-box;
      border-radius: 1em;
      /*overflow: hidden;*/
      position: relative;
      box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.75);
      pointer-events: all;
    }
    
    .card-view.active.pressed {
      transform: scale(0.99);
      animation: bounce 0.15s ease-out;
      animation-fill-mode: forwards;
    }
    
    .card-view.active.pressed .card {
      box-shadow: 0px 0px 48px rgba(0, 0, 0, 0.35),
                  0px 0px 24px rgba(0, 0, 0, 0.35),
                  0px 0px 12px rgba(0, 0, 0, 0.35) !important;
    } 
    
    .card.touch {
      /* background-color: lime !important; */
      box-shadow: 0px 0px 48px rgba(0, 0, 0, 0.5),
                  0px 0px 48px rgba(0, 0, 0, 0.5) !important;
                  
      /* transform: scale(0.99); */
    }
    
    .card.hover {
      /*outline: 6px solid rgba(0, 0, 0, 0.25);*/
      box-shadow: 0px 0px 24px rgba(0, 0, 0, 0.75) !important;
      /* background-color: yellowgreen !important; */
      /* transform: scale(0.99); */
    }
   
    .card.touch::after {
      content: "";
      box-sizing: border-box;
      position: absolute;
      top: -3px;
      left: -3px;
      width: calc(100% + 6px);
      height: calc(100% + 6px);
      border: 3px solid rgba(0, 0, 0, 0.5);
      border-radius: 12px; 
    }
    
    .card.running {
     box-shadow: 0px 0px 24px rgba(0, 0, 0, 0.75) !important;
     /*background-color: orange !important;*/
    }
  
    @keyframes bounce {
      0% { transform: scale(0.99); }
      50% { transform: scale(0.96); }
      100% { transform: scale(0.99); }
    } 
    
    .card-view .card-content {
      position: absolute;
    }
    
    /* Card types */ 
    .card-view[data-type=video] .card video,
    .card-view[data-type=compilation] .card video {
      box-sizing: border-box;
      object-fit: cover;
      pointer-events: none;
    }
    
    /*.card-view .card video[muted] {*/
    /*  filter: saturate(0);*/
    /*}*/
    
    .card-view[data-type=video] .card {
      background: ${whistlegraph.video.color};
      /*border: ${whistlegraph.video.border}em solid ${whistlegraph.video.color};*/
      /*top: -${whistlegraph.video.border}em;*/
      border-radius: ${whistlegraph.video.outerRadius}em;
      box-shadow: ${whistlegraph.video.boxShadow}; 
    }
    
    .card-view[data-type=score] .card {
      background: ${whistlegraph.score.color};
      /*border: ${whistlegraph.score.border}em solid ${whistlegraph.score.color};*/
      /*top: -${whistlegraph.score.border}em;*/
      border-radius: ${whistlegraph.score.outerRadius}em;
      box-shadow: ${whistlegraph.score.boxShadow}; 
    }
    
    .card-view[data-type=compilation] .card {
      background: ${whistlegraph.compilation.color};
      /*border: ${whistlegraph.compilation.border}em solid ${whistlegraph.compilation.color};*/
      /*top: -${whistlegraph.compilation.border}em;*/
      border-radius: ${whistlegraph.compilation.outerRadius}em;
      box-shadow: ${whistlegraph.compilation.boxShadow}; 
    }
    
    /* Contents inside each card */
    .card-view[data-type=video] .card video {
      border-radius: ${whistlegraph.video.innerRadius}em;
    }
    
    .card-view[data-type=score] .card img {
      box-sizing: border-box;
      border-radius: 0.25em;
      object-fit: cover;
      margin: auto;
      pointer-events: none;
    } 
    
    .card-view[data-type=compilation] .card video {
      border-radius: ${whistlegraph.compilation.innerRadius}em;
    }
    </style>
  `);
}

// 🎨 Paint (Executes every display frame)
function paint({ ink, pen }) {
  ink(200, 180, 180).plot(pen);
}

export { boot, paint };

// 📚 Library (Useful classes & functions used throughout the piece)
// ...

/*
// 🧮 Sim(ulate) (Runs once per logic frame (120fps locked)).
function sim($api) {}

// 💗 Beat (Runs once per bpm)
function beat($api) {}

// ✒ Act (Runs once per user interaction)
// function act({ event }) { }
*/