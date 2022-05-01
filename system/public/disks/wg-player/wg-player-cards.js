import { randIntRange } from "../../computer/lib/num.js";
import { shuffleInPlace, choose } from "../../computer/lib/help.js";

const { min, random, floor } = Math;

const deck = document.querySelector(".card-deck");
const layerOrder = ["video", "score", "compilation"];

const audioSources = {};
const videoGains = {};
const audios = document.querySelectorAll("#content .card-deck .card audio");
const videos = document.querySelectorAll("#content .card-deck .card video");
const cardViews = deck.querySelectorAll(".card-deck .card-view");
const cards = deck.querySelectorAll(".card-deck .card-view .card");

const initialCardScale = 0.95;
const cardScale = 0.9;

let videosReady = 0;
let allVideosReady = false;
let multipleTouches = false;
let activated = false;
let deactivateTimeout;
let volumeOutInterval, volumeInInterval;

const iOS = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);

videos.forEach((video) => {
  video.load();
  video.addEventListener(
    "canplaythrough",
    () => {
      videosReady += 1;
      if (videosReady === videos.length - 1) {
        console.log("📹 All whistlegraph videos are ready to play!");
        allVideosReady = true;
        setTimeout(() => {
          deck.classList.remove("loading");
        }, 500);
      }
    },
    false
  );
});

// 1️⃣ Hover states for cards when using only a mouse, and active states
//    for mouse and touch.
deck.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
});

deck.addEventListener("pointermove", (e) => {
  if (!e.isPrimary || multipleTouches === true) return;
  // if (e.pointerType === "mouse") deck.classList.remove("no-cursor");
  const card = deck.querySelector(".card-view.active .card");
  if (document.elementFromPoint(e.clientX, e.clientY) === card) {
    if (e.pointerType === "mouse") card.classList.add("hover");
  } else if (card) {
    card.classList.remove("touch", "hover");
    activated = false;
  }
});

deck.addEventListener("pointerup", (e) => {
  const card = deck.querySelector(".card-view.active .card");
  card?.classList.remove("touch");
});

deck.addEventListener("touchstart", (e) => {
  if (e.touches.length > 1) {
    multipleTouches = true;
    const card = deck.querySelector(".card-view.active .card");
    clearTimeout(deactivateTimeout);
    deactivateTimeout = setTimeout(() => {
      activated = false;
      card.classList.remove("touch");
    }, 250);
  }
});

deck.addEventListener("touchend", (e) => {
  if (e.touches.length === 0) {
    multipleTouches = false;
    // number of touches?
    const card = deck.querySelector(".card-view.active .card");
    card.classList.remove("touch");
  }
});

deck.addEventListener("pointerdown", (e) => {
  if (!e.isPrimary) return;
  const card = deck.querySelector(".card-view.active .card");
  if (document.elementFromPoint(e.clientX, e.clientY) === card) {
    card.classList.add("touch");
    card.classList.remove("hover");
    activated = true;
    clearTimeout(deactivateTimeout);
    deactivateTimeout = setTimeout(() => {
      activated = false;
      card.classList.remove("touch");
    }, 500);
  }
});

// 2️⃣ Switching from one card to another, animating them, and triggering the media
//   for each.
deck.addEventListener("pointerup", (e) => {
  if (!e.isPrimary) return;

  const activeView = deck.querySelector(".card-view.active");
  if (!activeView) return; // Cancel if there are no 'active' cards.

  // Cancel if we didn't click on the actual card.
  const activeCard = activeView.querySelector(".card");
  const target = document.elementFromPoint(e.clientX, e.clientY);
  if (target !== activeCard) return;

  // Make sure the card is still active based on the pointer events.
  if (activated === false) return;
  activated = false;

  // Make sure we are not in the middle of a transition.
  if (activeView.classList.contains("pressed")) {
    return;
  }

  // 1. Collect all card elements via layerOrder.
  const layers = {};
  layerOrder.forEach((layer) => {
    layers[layer] = document.querySelector(`.card-view[data-type=${layer}]`);
  });

  // Play the push down animation...
  activeView.classList.add("pressed");
  activeCard.classList.add("running");

  if (e.pointerType === "mouse") deck.classList.add("no-cursor");

  activeView.addEventListener(
    "animationend",
    () => {
      activeView.classList.remove("pressed");
    },
    { once: true }
  );

  // Unmute the first video if it hasn't woken up yet...
  const video = activeCard.querySelector("video");
  if (video && video.paused && activeCard.dataset.type === "video") {
    // First click.
    activeView.style.transform = "none";
    document.querySelector("#card-play").classList.add("played");
    video.play();
    video.addEventListener("ended", function end() {
      if (activeView.classList.contains("active")) {
        video.play();
      } else {
        video.removeEventListener("ended", end);
      }
    });
    return;
  } else if (video) {
    // Fade volume out.
    console.log("Fading out volume on:", video);
    if (iOS) {
      video.muted = true;
    } else {
      clearInterval(volumeOutInterval);
      volumeOutInterval = setInterval(() => {
        video.volume *= 0.96;
        if (video.volume < 0.001) {
          video.volume = 0;
          clearInterval(volumeOutInterval);
        }
      }, 8);
    }
  }

  // Fade in audio if it's necessary for the next layer.
  const nextLayer = layers[layerOrder[1]];
  const nextVideo = nextLayer.querySelector(".card video");
  if (nextVideo) {
    const nextCard = nextVideo.closest(".card");
    const nextActiveCardType = nextCard.dataset.type;
    if (nextVideo.paused) {
      nextVideo.play();
      nextCard.classList.add("running");
      nextVideo.muted = false;
      nextVideo.volume = 1;

      nextVideo.addEventListener("ended", function end() {
        if (nextVideo.closest(".card-view").classList.contains("active")) {
          nextVideo.play();
        } else {
          nextVideo.removeEventListener("ended", end);
        }
      });
    } else {
      // Bring volume back.
      console.log("Bringing back volume on:", nextVideo);
      nextCard.classList.add("running");
      if (iOS) {
        nextVideo.muted = false;
      } else {
        nextVideo.volume = 0.0;
        clearInterval(volumeInInterval);
        volumeInInterval = setInterval(() => {
          nextVideo.volume = min(1, nextVideo.volume + 0.01);
          if (nextVideo.volume >= 1) {
            nextVideo.volume = 1;
            clearInterval(volumeInInterval);
          }
        }, 8);
      }
    }
  }

  // 2. Animate the top one off the screen, after the press animation ends.
  activeView.addEventListener(
    "animationend",
    (e) => {
      const cardView = layers[layerOrder[0]];
      const card = cardView.querySelector(".card");
      layerOrder.push(layerOrder.shift()); // Move the 1st element to the end...

      // By calculating the proper distance it can move to based on what else
      // is left in the deck and its own size.
      let rX = 0,
        rY = 0;
      let maxTranslateHeight = 0,
        maxTranslateWidth = 0;
      const cardRect = card.getBoundingClientRect();

      [...deck.querySelectorAll(".card-view:not(.active) .card")]
        .map((card) => {
          return card.getBoundingClientRect();
        })
        .forEach((rect) => {
          if (rect.width > maxTranslateWidth) maxTranslateWidth = rect.width;
          if (rect.height > maxTranslateHeight)
            maxTranslateHeight = rect.height;
        });

      maxTranslateWidth -= (maxTranslateWidth - cardRect.width) / 2;
      maxTranslateHeight -= (maxTranslateHeight - cardRect.height) / 2;

      // Pad each by a bit.
      maxTranslateWidth *= 1.025;
      maxTranslateHeight *= 1.025;

      if (random() > 0.5) {
        rX += maxTranslateWidth;
        rY += random() * maxTranslateHeight;
      } else {
        rY += maxTranslateHeight;
        rX += random() * maxTranslateWidth;
      }

      if (random() > 0.5) rX *= -1;
      if (random() > 0.5) rY *= -1;

      // 3. Trigger the first transition, where the card moves off the top.
      card.style.transition = "0.25s ease-out transform";

      const rotation = choose(randIntRange(6, 15), randIntRange(-6, -15));

      card.dataset.rotation = rotation;

      card.style.transform = `rotate(${rotation}deg) translate(${rX}px, ${rY}px)`;

      // 3a. Turn the card.

      // 3b.
      // Remove the transform from the next cardView.
      const nextCardView = layers[layerOrder[0]];
      const nextCard = nextCardView.querySelector(".card");
      nextCard.style.transition = "0.3s ease-out transform";
      nextCard.style.transform = "none";

      cardView.classList.remove("active");
      card.classList.remove("running");
      card.classList.remove("hover");

      card.addEventListener("transitionend", function end(e) {
        card.removeEventListener("transitionend", end);

        // and re-sort them on the z-axis.
        layerOrder.forEach((layer, index) => {
          const zIndex = layerOrder.length - 1 - index;
          const el = layers[layer];
          el.style.zIndex = zIndex;
          if (zIndex === 2) el.classList.add("active");
        });

        // 5. Animate the top (now bottom) one back into the stack of cards.
        card.style.transition = "0.5s ease-in transform";
        //card.style.transform = "none";
        card.style.transform = `scale(${cardScale}) rotate(${card.dataset.rotation}deg)`;
      });
    },
    { once: true }
  );
});

function frame() {
  cardViews.forEach((cardView) => {
    const card = cardView.querySelector(".card");
    const cardContent = card.querySelector(".card-content");

    const longestSide = min(deck.clientWidth, deck.clientHeight);
    const margin = floor(longestSide * 0.17); // Of the page.
    const borderSetting = cardView.dataset.borderSetting;
    const innerRadiusSetting = cardView.dataset.innerRadius;
    const outerRadiusSetting = cardView.dataset.outerRadius;

    card.style.borderRadius = margin * outerRadiusSetting + "px";
    cardContent.style.borderRadius = margin * innerRadiusSetting + "px";

    const border = floor(margin * borderSetting);

    const width = deck.clientWidth - margin;
    const height = deck.clientHeight - margin;

    const displayRatio = deck.clientWidth / deck.clientHeight;
    const contentRatioValues = card.dataset.ratio
      .split("x")
      .map((n) => parseFloat(n));
    const contentRatio = contentRatioValues[0] / contentRatioValues[1];

    let widthOffset = 0,
      heightOffset = 0;

    // TODO: Fix compilation display card ratio stuff.
    if (card.dataset.type === "compilation") {
      // console.log(displayRatio, contentRatio);
      if (displayRatio < 1) {
        let difference = (1 - displayRatio) * (contentRatio / 1);
        //if (displayRatio < 0.5) {
        //  difference = (1 - displayRatio) / 3;
        //}
        widthOffset = floor(width * difference);
        heightOffset = floor(height * difference);
      } else {
        //let difference = (displayRatio - 1) * (contentRatio / 2);
        //widthOffset = -floor(width * difference);
        //heightOffset = -floor(height * difference);
      }
      console.log("Compilation offset:", widthOffset, heightOffset);
    }

    if (contentRatio < displayRatio) {
      cardContent.style.width =
        floor(height * contentRatio) - widthOffset + "px";
      cardContent.style.height = height - heightOffset + "px";
    } else {
      cardContent.style.height =
        floor(width / contentRatio) - heightOffset + "px";
      cardContent.style.width = width - widthOffset + "px";
    }

    card.style.width = parseFloat(cardContent.style.width) + border + "px";
    card.style.height = parseFloat(cardContent.style.height) + border + "px";

    cardContent.style.left = border / 2 + "px";
    cardContent.style.top = border / 2 + "px";

    card.style.top = (deck.clientHeight - card.clientHeight) / 2 + "px";
    card.style.left = (deck.clientWidth - card.clientWidth) / 2 + "px";

    const cardCover = card.querySelector(".card-cover");

    if (cardCover) {
      cardCover.style.top = cardContent.style.top;
      cardCover.style.left = cardContent.style.left;
      cardCover.style.width = cardContent.style.width;
      cardCover.style.height = cardContent.style.height;
      cardCover.style.borderRadius = cardContent.style.borderRadius;
    }

    const cardOutline = card.querySelector(".card-outline");
    if (cardOutline) cardOutline.style.borderRadius = card.style.borderRadius;
  });
}

// Randomly rotate the back two cards on initialization.
{
  // Assuming that there are two card views.
  const tiltBag = [randIntRange(6, 10), randIntRange(-10, -6)];
  shuffleInPlace(tiltBag);

  // TODO: Pull items out of shuffle bag... eventually make a class?
  cards.forEach((card, i) => {
    if (i === cardViews.length - 1) return;
    card.style.transform = `scale(${initialCardScale}) rotate(${tiltBag.pop()}deg)`;
  });
}

const resizer = new ResizeObserver((entries) => {
  for (let entry of entries) {
    if (entry.target === deck) {
      frame();
    }
  }
});

resizer.observe(deck);
