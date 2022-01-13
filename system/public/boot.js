import { boot } from "./computer/bios.js";

let host;

if (window.location.hostname === "aesthetic.computer") {
  host = "disks.aesthetic.computer"; // Production
} else {
  // Build a hostname (with a path if one exists) from the current location.
  // Hosts can also be remote domains. (HTTPS is assumed)
  host = window.location.hostname;
  if (window.location.pathname.length > 1) host += window.location.pathname;
}

const bpm = 120;
const debug = true;

// TODO: Finish FigJam Widget with iframe message based input & output.
// See also: https://www.figma.com/plugin-docs/working-with-images/
// iframe document code
function receive(event) {
  console.log("Received Figma Input:", event);

  // TODO: Build image with width and height.
  console.log("Bytes:", event.data.bytes.length);
}
window.addEventListener("message", receive);

// Decoding an image can be done by sticking it in an HTML
// canvas, as we can read individual pixels off the canvas.
async function decode(canvas, ctx, bytes) {
  const url = URL.createObjectURL(new Blob([bytes]));
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject();
    img.src = url;
  });
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  return imageData;
}

console.log("Secure:", window.isSecureContext, "Location:", window.location);

boot("disks/prompt", bpm, host, undefined, debug);
