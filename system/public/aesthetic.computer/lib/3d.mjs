// 3D (GPU)
// Render geometry and scenes on the GPU via Three.js.
// Also handles VR scenes.

// CTO Rapter Notes:
/*
*** Optimized Vertex Model for Dynamic Data ***
- Future line renderer...
- Each position is a Float32 right now.
- These need to be carved up to store more data.
- So `positions` should just become `vertices`.
- Of the 32 bits.
  - 24 bits per x, y or z 
  - 1 byte left over
    - 0-8 would be indexed color that pulls from a shader const
    - 0-8 for alpha
    - (1bit) flag properties
      blinking
    - oscillating / lerping
    - left for everything else
*/

import * as THREE from "../dep/three/three.module.js";
import { VRButton } from "../dep/three/VRButton.js";
import { GLTFExporter } from "../dep/three/GLTFExporter.js";
import { OBJExporter } from "../dep/three/OBJExporter.js";
import { radians, rgbToHex, timestamp } from "./num.mjs";
const debug = window.acDEBUG;
const { abs } = Math;

const NO_FOG = false;
const FOG_NEAR = 0.5;
const FOG_FAR = 0.95;

let scene,
  renderer,
  camera,
  disposal = [],
  //pixels,
  renderedOnce = false,
  target;

let send, download, upload;

let jiggleForm,
  needsSphere = false;

let button, vrSession, controller1, controller2; // VR Specific.

export const penEvents = []; // VR pointer events.
export const bakeQueue = [];
export const status = { alive: false };

export function initialize(
  wrapper,
  loop,
  receivedDownload,
  receivedUpload,
  sendToPiece
) {
  send = sendToPiece;
  download = receivedDownload;
  upload = receivedUpload;

  renderer = new THREE.WebGLRenderer({
    alpha: false,
    antialias: true,
    preserveDrawingBuffer: true,
  });

  renderer.debug.checkShaderErrors = false;

  renderer.sortObjects = false;
  renderer.xr.enabled = true;
  renderer.xr.setFramebufferScaleFactor(1);
  renderer.xr.setFoveation(0);
  renderer.preserveDrawingBuffer = true;

  renderer.domElement.dataset.type = "3d";

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  if (!NO_FOG) scene.fog = new THREE.Fog(0x000000, FOG_NEAR, FOG_FAR); // More basic fog.
  //scene.fog = new THREE.FogExp2(0x000000, FOG);
  //scene.fog = new THREE.FogExp2(0x030303, 0.5);

  scene.add(new THREE.HemisphereLight(0xff9900, 0xff0000));
  //   const ambientLight = new THREE.AmbientLight();
  //   const pointLight = new THREE.PointLight();
  //  pointLight.position.set(10, 10, 10);
  //  scene.add(ambientLight);
  // scene.add(pointLight);

  // Set up VR.
  button = VRButton.createButton(
    renderer,
    function start(session) {
      console.log("🕶️️ VR Session started.");

      // Setup VR controllers.
      function onSelectStart() {
        this.userData.isSelecting = true;
        this.userData.touchOrLift = "touch";
      }

      function onSelectEnd() {
        this.userData.isSelecting = false;
        this.userData.touchOrLift = "lift";
      }

      function onSqueezeStart() {
        this.userData.isSqueezing = true;
        this.userData.positionAtSqueezeStart = this.position.y;
        this.userData.scaleAtSqueezeStart = this.scale.x;
      }

      function onSqueezeEnd() {
        this.userData.isSqueezing = false;
      }

      controller1 = renderer.xr.getController(0);
      controller1.name = "controller-1";
      controller1.addEventListener("selectstart", onSelectStart);
      controller1.addEventListener("selectend", onSelectEnd);
      controller1.addEventListener("squeezestart", onSqueezeStart);
      controller1.addEventListener("squeezeend", onSqueezeEnd);
      scene.add(controller1);
      controller1.userData.lastPosition = { ...controller1.position };

      controller1.addEventListener("connected", (e) => {
        // console.log("Connected", e);
        controller1.handedness = e.data.handedness;
        controller1.gamepad = e.data.gamepad;
      });

      controller2 = renderer.xr.getController(1);
      controller2.name = "controller-2";
      controller2.addEventListener("selectstart", onSelectStart);
      controller2.addEventListener("selectend", onSelectEnd);
      controller2.addEventListener("squeezestart", onSqueezeStart);
      controller2.addEventListener("squeezeend", onSqueezeEnd);
      scene.add(controller2);
      controller2.userData.lastPosition = { ...controller2.position };

      controller2.addEventListener("connected", (e) => {
        controller2.handedness = e.data.handedness;
        controller2.gamepad = e.data.gamepad;
      });

      // Create some geometry for each controller.
      // const wandLen = 0.2;
      // const wandOffset = 0.075;
      // const geometry = new THREE.CylinderGeometry(0.0015, 0.0015, 0.2, 32);
      // geometry.rotateX(- Math.PI / 2);
      //geometry.translate(0, 0, - (wandLen / 2) + wandOffset);
      // const material = new THREE.MeshBasicMaterial({
      //   flatShading: true,
      //   color: new THREE.Color(1, 0.5, 1)
      // });

      // material.opacity = 0.5;
      // material.transparent = true;

      // const mesh = new THREE.Mesh(geometry, material);

      // const pivot = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0015, 2), material);

      //  pivot.name = 'pivot';
      //  pivot.position.z = - wandLen + wandOffset;
      //  mesh.add(pivot);

      //  controller1.add(mesh.clone());
      //  controller2.add(mesh.clone());

      vrSession = session;

      renderer.setAnimationLoop((now) => loop(now, true));
    },
    function end() {
      renderer.setAnimationLoop(null);
      console.log("🕶️ VR Session ended.");
      vrSession = null;
    }
  ); // Will return `undefined` if VR is not supported.

  if (button) document.body.append(button);

  //renderer.render(scene, camera); // Render once before adding the element to the dom.
  wrapper.append(renderer.domElement); // Add renderer to dom.
  status.alive = true;
}

export function bake({ cam, forms, color }, { width, height }, size) {
  // Only instantiate some things once.
  if (!target || target.width !== width || target.height !== height) {
    target = new THREE.WebGLRenderTarget(width, height);
    renderer.setSize(size.width, size.height);
    //renderer.setPixelRatio(1 / 2.2);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    // renderer.setRenderTarget(target); // For rendering offsceen.
    // pixels = new Uint8Array(width * height * 4);
    const fov = cam.fov;
    const aspect = width / height;
    const near = cam.near;
    const far = cam.far;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  }

  // 🎥 Camera
  if (!vrSession) {
    camera.rotation.order = "YXZ"; // Set to match the software renderer.
    camera.rotation.set(radians(cam.rotation[0]), radians(cam.rotation[1]), 0);
    camera.scale.set(...cam.scale);
    camera.position.set(cam.position[0], -cam.position[1], cam.position[2]);
  }

  if (!Array.isArray(forms)) forms = [forms];

  // *** 📐 Geometry ***
  // Check f.type for adding new forms, or f.update for modifying added forms.
  forms.forEach((f) => {
    // *** 🔺 Triangle ***
    if (f.type === "triangle") {
      let material;
      let tex;

      if (f.texture) {
        // Add texture if one exists.
        tex = new THREE.DataTexture(
          f.texture.pixels,
          f.texture.width,
          f.texture.height,
          THREE.RGBAFormat
        );
        tex.needsUpdate = true;
        material = new THREE.MeshBasicMaterial({ map: tex });
      } else {
        if (f.vertices[0]?.color) {
          material = new THREE.MeshBasicMaterial();
        } else {
          material = new THREE.MeshBasicMaterial({
            color: rgbToHex(...(f.color || color)),
          });
        }
      }

      material.side = THREE.DoubleSide;
      material.transparent = true;
      material.opacity = f.alpha;
      material.depthWrite = true;
      material.depthTest = true;

      material.vertexColors = f.vertices[0].color ? true : false;
      material.vertexAlphas = f.vertices[0].color?.length === 4 ? true : false;

      const points = f.vertices.map((v) => new THREE.Vector3(...v.pos));
      const pointColors = f.vertices.map((v) => new THREE.Vector4(...v.color));

      let posLimitMax = points.length / 3;
      let posLimit = f.limiter % (posLimitMax + 1);

      points.length = points.length - posLimit * 3;
      pointColors.length = pointColors.length - posLimit * 3;

      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const colors = new Float32Array(points.length * 4);

      for (let i = 0; i < pointColors.length; i += 1) {
        const colStart = i * 4;
        colors[colStart] = pointColors[i].x / 255;
        colors[colStart + 1] = pointColors[i].y / 255;
        colors[colStart + 2] = pointColors[i].z / 255;
        colors[colStart + 3] = pointColors[i].w / 255;
      }

      geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(colors, 4, true)
      );

      if (tex) {
        geometry.setAttribute(
          "uv",
          new THREE.BufferAttribute(new Float32Array(f.uvs), 2)
        );
      }

      const tri = new THREE.Mesh(geometry, material);

      tri.translateX(f.position[0]);
      tri.translateY(f.position[1]);
      tri.translateZ(f.position[2]);
      tri.rotateX(radians(f.rotation[0]));
      tri.rotateY(radians(f.rotation[1]));
      tri.rotateZ(radians(f.rotation[2]));
      tri.scale.set(...f.scale);

      scene.add(tri);
      tri.userData.aestheticID = f.uid;

      disposal.push({
        keep: f.gpuKeep,
        form: tri,
        resources: [tex, material, geometry],
      });
    }

    if (f.type === "triangle:buffered") {
      let material;
      let tex;

      if (f.texture) {
        // Add texture if one exists.
        tex = new THREE.DataTexture(
          f.texture.pixels,
          f.texture.width,
          f.texture.height,
          THREE.RGBAFormat
        );
        tex.needsUpdate = true;
        material = new THREE.MeshBasicMaterial({ map: tex });
      } else {
        if (f.vertices[0]?.color) {
          material = new THREE.MeshBasicMaterial();
        } else {
          material = new THREE.MeshBasicMaterial({
            color: rgbToHex(...(f.color || color)),
          });
        }
      }

      // TODO: ❤️‍🔥 I should be able to set this per form...

      //material.side = THREE.DoubleSide; // Should this be true? It might disable
      //                                   some triangles in my models but is
      //                                   ultimately faster?

      material.side = THREE.FrontSide;

      material.transparent = false;
      material.opacity = f.alpha;
      material.depthWrite = true;
      material.depthTest = true;

      material.vertexColors = true;
      material.vertexAlphas = false;

      let points = [];
      let pointColors = [];

      // Generate points from vertices if there are any to load at the start.
      if (f.vertices.length > 0) {
        points = f.vertices.map((v) => new THREE.Vector3(...v.pos));
        pointColors = f.vertices.map((v) => new THREE.Vector4(...v.color));
      }

      const geometry = new THREE.BufferGeometry();
      const positionsArr = new Float32Array(f.MAX_POINTS * 3);
      const colorsArr = new Float32Array(f.MAX_POINTS * 4);

      for (let i = 0; i < points.length; i += 1) {
        const posStart = i * 3;
        positionsArr[posStart] = points[i].x;
        positionsArr[posStart + 1] = points[i].y;
        positionsArr[posStart + 2] = points[i].z;
      }

      for (let i = 0; i < pointColors.length; i += 1) {
        const colStart = i * 4;
        colorsArr[colStart] = pointColors[i].x / 255;
        colorsArr[colStart + 1] = pointColors[i].y / 255;
        colorsArr[colStart + 2] = pointColors[i].z / 255;
        colorsArr[colStart + 3] = pointColors[i].w / 255;
      }

      const positions = new THREE.BufferAttribute(positionsArr, 3);
      const colors = new THREE.BufferAttribute(colorsArr, 4, true);
      positions.usage = THREE.DynamicDrawUsage;
      colors.usage = THREE.DynamicDrawUsage;

      geometry.setAttribute("position", positions);
      geometry.setAttribute("color", colors);

      if (tex) {
        geometry.setAttribute(
          "uv",
          new THREE.BufferAttribute(new Float32Array(f.uvs), 2)
        );
      }

      //geometry.setPositions(positions);
      //geometry.setColors(colors);

      const tri = new THREE.Mesh(geometry, material);
      tri.frustumCulled = false;

      // Custom properties added from the aesthetic.computer runtime.
      // TODO: Bunch all these together on both sides of the worker. 22.10.30.16.32
      tri.userData.ac_length = points.length;
      tri.userData.ac_lastLength = tri.userData.ac_length;
      tri.userData.ac_MAX_POINTS = f.MAX_POINTS;

      tri.userData.aestheticID = f.uid;
      if (f.tag) tri.userData.tag = f.tag;

      tri.translateX(f.position[0]);
      tri.translateY(f.position[1]);
      tri.translateZ(f.position[2]);
      tri.rotateX(radians(f.rotation[0]));
      tri.rotateY(radians(f.rotation[1]));
      tri.rotateZ(radians(f.rotation[2]));
      tri.scale.set(...f.scale);

      scene.add(tri);

      geometry.setDrawRange(0, points.length);
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      //geometry.computeBoundingBox();
      //geometry.computeBoundingSphere();

      disposal.push({
        keep: f.gpuKeep,
        form: tri,
        resources: [material, geometry],
      });
    }

    // *** 🟥 Quad ***
    if (f.type === "quad") {
      let material;
      let tex;

      if (f.texture) {
        // Add texture if one exists.
        tex = new THREE.DataTexture(
          f.texture.pixels,
          f.texture.width,
          f.texture.height,
          THREE.RGBAFormat
        );
        tex.needsUpdate = true;
        material = new THREE.MeshBasicMaterial({ map: tex });
      } else {
        if (f.color === undefined && f.vertices[0].color) {
          material = new THREE.MeshBasicMaterial();
        } else {
          material = new THREE.MeshBasicMaterial({
            color: rgbToHex(...(f.color || color)),
          });
        }
      }

      material.side = THREE.DoubleSide;
      //material.transparent = true;
      material.opacity = f.alpha;
      material.alphaTest = 0.5;
      material.depthWrite = true;
      material.depthTest = true;

      const geometry = new THREE.PlaneGeometry(2, 2);
      const plane = new THREE.Mesh(geometry, material);

      // Could these inverted transforms be fixed on the matrix level?
      plane.translateX(f.position[0]);
      plane.translateY(f.position[1]);
      plane.translateZ(f.position[2]);
      plane.rotateX(radians(f.rotation[0]));
      plane.rotateY(radians(f.rotation[1]));
      plane.rotateZ(radians(f.rotation[2]));
      plane.scale.set(...f.scale);

      scene.add(plane);
      plane.userData.aestheticID = f.uid;

      disposal.push({
        keep: f.gpuKeep,
        form: plane,
        resources: [tex, material, geometry],
      });
    }

    // *** ✏️ Line ***
    if (f.type === "line") {
      // TODO: I'm not sure why these don't appear on live reload... 22.11.14.21.24

      let material;

      if (f.color === undefined && f.vertices[0].color) {
        // Only use a gloabl color if vertices don't have color.
        material = new THREE.LineBasicMaterial();
      } else {
        material = new THREE.LineBasicMaterial({
          color: rgbToHex(...(f.color || color)),
        });
      }

      material.transparent = true;
      material.opacity = f.alpha;
      material.depthWrite = true;
      material.depthTest = true;
      material.linewidth = 1;
      material.vertexColors = f.vertices[0].color ? true : false;
      material.vertexAlphas = f.vertices[0].color?.length === 4 ? true : false;

      const points = f.vertices.map((v) => new THREE.Vector3(...v.pos));
      const pointColors = f.vertices.map((v) => new THREE.Vector4(...v.color));

      let posLimitMax = points.length / 2;
      let posLimit = f.limiter % (posLimitMax + 1);

      points.length = points.length - posLimit * 2;
      pointColors.length = pointColors.length - posLimit * 2;

      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const colors = new Float32Array(points.length * 4);

      for (let i = 0; i < pointColors.length; i += 1) {
        const colStart = i * 4;
        colors[colStart] = pointColors[i].x / 255;
        colors[colStart + 1] = pointColors[i].y / 255;
        colors[colStart + 2] = pointColors[i].z / 255;
        colors[colStart + 3] = pointColors[i].w / 255;
      }

      geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(colors, 4, true)
      );

      const line = new THREE.LineSegments(geometry, material);

      line.translateX(f.position[0]);
      line.translateY(f.position[1]);
      line.translateZ(f.position[2]);
      line.rotateX(radians(f.rotation[0]));
      line.rotateY(radians(f.rotation[1]));
      line.rotateZ(radians(f.rotation[2]));
      line.scale.set(...f.scale);

      line.frustumCulled = false;

      scene.add(line);
      line.userData.aestheticID = f.uid;

      disposal.push({
        keep: f.gpuKeep,
        form: line,
        resources: [material, geometry],
      });
    }

    if (f.type === "line:buffered") {
      let material;

      // console.log(f.color, color);
      if (f.color) {
        // Only use a gloabl color if vertices don't have color.
        material = new THREE.LineBasicMaterial({
          color: rgbToHex(...(f.color || color)),
        });
      } else {
        material = new THREE.LineBasicMaterial();
      }

      material.side = THREE.DoubleSide;
      material.transparent = true;
      material.opacity = f.alpha;
      material.depthWrite = true;
      material.depthTest = true;
      material.linewidth = 1;
      material.vertexColors = true;
      material.vertexAlphas = true;

      let points = [];
      let pointColors = [];

      // Generate points from vertices if there are any to load at the start.
      if (f.vertices.length > 0) {
        points = f.vertices.map((v) => new THREE.Vector3(...v.pos));
        pointColors = f.vertices.map((v) => new THREE.Vector4(...v.color));
      }

      const geometry = new THREE.BufferGeometry();
      // const geometry = new LineGeometry();
      const positions = new Float32Array(f.MAX_POINTS * 3);
      const colors = new Float32Array(f.MAX_POINTS * 4);

      for (let i = 0; i < points.length; i += 1) {
        const posStart = i * 3;
        positions[posStart] = points[i].x;
        positions[posStart + 1] = points[i].y;
        positions[posStart + 2] = points[i].z;
      }

      for (let i = 0; i < pointColors.length; i += 1) {
        const colStart = i * 4;
        colors[colStart] = pointColors[i].x / 255;
        colors[colStart + 1] = pointColors[i].y / 255;
        colors[colStart + 2] = pointColors[i].z / 255;
        colors[colStart + 3] = pointColors[i].w / 255;
      }

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );

      geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(colors, 4, true)
      );

      //geometry.setPositions(positions);
      //geometry.setColors(colors);

      const lineb = new THREE.LineSegments(geometry, material);
      //const lineb = new Line2(geometry, material);

      lineb.frustumCulled = false;

      // Custom properties added from the aesthetic.computer runtime.
      // TODO: Bunch all these together on both sides of the worker. 22.10.30.16.32
      lineb.userData.ac_length = points.length;
      lineb.userData.ac_lastLength = lineb.userData.ac_length;
      lineb.userData.ac_MAX_POINTS = f.MAX_POINTS;

      lineb.userData.aestheticID = f.uid;
      if (f.tag) lineb.userData.tag = f.tag;

      lineb.translateX(f.position[0]);
      lineb.translateY(f.position[1]);
      lineb.translateZ(f.position[2]);
      lineb.rotateX(radians(f.rotation[0]));
      lineb.rotateY(radians(f.rotation[1]));
      lineb.rotateZ(radians(f.rotation[2]));
      lineb.scale.set(...f.scale);

      //lineb.computeLineDistances();

      scene.add(lineb);

      geometry.setDrawRange(0, points.length);
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      // geometry.computeBoundingBox();
      // geometry.computeBoundingSphere();

      disposal.push({
        keep: f.gpuKeep,
        form: lineb,
        resources: [material, geometry],
      });
    }

    if (f.update === "form:touch") {
      //const form = scene.getObjectByUserDataProperty("aestheticID", f.uid);
      //if (!form) return;
      //form.geometry.computeLineDistances?.();
    }

    if (f.update === "form:color") {
      const fu = f;
      const form = scene.getObjectByUserDataProperty("aestheticID", fu.uid);
      if (!form) return;
      form.material.color = new THREE.Color(...[...fu.color]);
    }

    if (f.update === "form:transform") {
      const fu = f; // formUpdate

      const form = scene.getObjectByUserDataProperty("aestheticID", fu.uid);

      if (!form) return;

      form.position.set(...fu.position);

      form.rotation.set(
        radians(fu.rotation[0]),
        radians(fu.rotation[1]),
        radians(fu.rotation[2])
      );

      form.scale.set(...fu.scale);

      /*
      line.translateX(f.position[0]);
      line.translateY(f.position[1]);
      line.translateZ(f.position[2]);
      line.rotateX(radians(f.rotation[0]));
      line.rotateY(radians(f.rotation[1]));
      line.rotateZ(radians(f.rotation[2]));
      */

      //console.log("form transform to:", fu.position, performance.now());
    }

    // Add vertices to geometry:buffered objects.
    if (f.update === "form:buffered:add-vertices") {
      const formUpdate = f;

      const form = scene.getObjectByUserDataProperty(
        "aestheticID",
        formUpdate.uid
      );
      if (!form) return;

      jiggleForm = form; // for jiggleForm

      // See: https://threejs.org/docs/#manual/en/introduction/How-to-update-things,
      //      https://jsfiddle.net/t4m85pLr/1

      if (form) {
        // Reset / flush vertex data if necessary.
        if (formUpdate.reset) {
          form.userData.ac_length = 0;
          form.userData.ac_lastLength = 0;
        }

        // Add points.
        const points = [];
        const pointColors = [];

        for (let i = 0; i < formUpdate.vertices.length; i += 1) {
          points.push(new THREE.Vector3(...formUpdate.vertices[i].pos));
          pointColors.push(new THREE.Vector4(...formUpdate.vertices[i].color));
        }

        // Set custom properties on the form to keep track of where we are
        // in the previously allocated vertex buffer.
        form.userData.ac_lastLength = form.userData.ac_length;
        form.userData.ac_length += points.length;

        // ⚠️ Reset the buffer if we were go over the max, by default.
        if (form.userData.ac_length > form.userData.ac_MAX_POINTS) {
          if (debug) console.warn("Max. cutoff in GPU form!", form);
          form.userData.ac_lastLength = 0;
          form.userData.ac_length = points.length;
        }

        // TODO: How to make the buffer circular?
        //       (When would I want this?) 22.10.30.17.14

        const positions = form.geometry.attributes.position.array;
        const colors = form.geometry.attributes.color.array;

        for (let i = 0; i < points.length; i += 1) {
          const posStart = (form.userData.ac_lastLength + i) * 3;
          positions[posStart] = points[i].x;
          positions[posStart + 1] = points[i].y;
          positions[posStart + 2] = points[i].z;
        }

        for (let i = 0; i < pointColors.length; i += 1) {
          const colStart = (form.userData.ac_lastLength + i) * 4;
          colors[colStart] = pointColors[i].x / 255;
          colors[colStart + 1] = pointColors[i].y / 255;
          colors[colStart + 2] = pointColors[i].z / 255;
          colors[colStart + 3] = pointColors[i].w / 255;
        }

        form.geometry.setDrawRange(0, form.userData.ac_length);
        form.geometry.attributes.position.needsUpdate = true;
        form.geometry.attributes.color.needsUpdate = true;

        //form.geometry.computeBoundingBox();
        //form.geometry.computeBoundingSphere();

        // form.geometry.computeBoundingBox();
        // form.geometry.computeBoundingSphere();

        //form.geometry.setPositions(positions);
        //form.geometry.setColors(colors);
        //form.computeLineDistances();

        needsSphere = true; // for jiggleForm
      }
    }
  });

  // In case we ever need to render off screen...
  //renderer.render(scene, camera);
  //renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
  //return pixels;

  return forms.map((f) => f.uid); // Return UIDs of every added or adjusted form.
}

export function checkForRemovedForms(formsBaked) {
  const currentFormIDs = scene.children
    .map((c) => c.userData.aestheticID)
    .filter(Boolean);

  const currentForms = {};
  scene.children.forEach((c) => {
    if (c.userData.aestheticID !== undefined)
      currentForms[c.userData.aestheticID] = c;
  });

  // console.log(formsBaked, currentFormIDs, scene.children);
  const formIDsToRemove = currentFormIDs.filter((f) => !formsBaked.includes(f));

  // Remove objects.
  formIDsToRemove.forEach((id) => removeObjectsWithChildren(currentForms[id]));
}

// Receives events from aesthetic.computer.
export function handleEvent(event) {
  if (event.type === "background-change" && scene) {
    scene.background = new THREE.Color(...event.content.map((ch) => ch / 255));
    if (!NO_FOG) scene.fog = new THREE.Fog(scene.background, FOG_NEAR, FOG_FAR);
    return;
  }

  if (event.type === "export-scene") {
    // Instantiate an exporter
    const exporter = new GLTFExporter();
    const slug = event.content.slug;
    const output = event.content.output;
    const handle = event.content.handle;
    const bucket = event.content.bucket;
    const sculptureHeight = event.content.sculptureHeight || 0;

    const sceneToExport = new THREE.Scene();
    const sculpture = scene
      .getObjectByUserDataProperty("tag", "sculpture")
      ?.clone();

    const sculptureLine = scene
      .getObjectByUserDataProperty("tag", "sculpture-line")
      ?.clone();

    if (sculptureLine) {
      const geo = new THREE.BufferGeometry();
      const maxPoints = sculptureLine.userData.ac_length;
      const positions = new Float32Array(maxPoints * 2);
      const colors = new Float32Array(maxPoints * 4);
      const points = sculptureLine.geometry.attributes.position.array;
      const pointColors = sculptureLine.geometry.attributes.color.array;

      // Offset sculpture height.
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] = points[i];
        positions[i + 1] = points[i + 1] - sculptureHeight;
        positions[i + 2] = points[i + 2];
      }

      // Convert to linear color space.
      for (let i = 0; i < colors.length; i += 4) {
        const color = new THREE.Color(
          pointColors[i],
          pointColors[i + 1],
          pointColors[i + 2]
        ).convertSRGBToLinear();

        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
        // Skip alpha.
      }

      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 4, true));
      sculptureLine.geometry = geo;
      sculptureLine.geometry.attributes.position.needsUpdate = true;
      sculptureLine.geometry.attributes.color.needsUpdate = true;

      sceneToExport.add(sculptureLine);
      // sculptureLine.translateY(-sculptureHeight); // Head / preview box height.
    }

    if (sculpture) {
      const geo = new THREE.BufferGeometry();
      const maxPoints = sculpture.userData.ac_length;
      const positions = new Float32Array(maxPoints * 3);
      const colors = new Float32Array(maxPoints * 4);
      const points = sculpture.geometry.attributes.position.array;
      const pointColors = sculpture.geometry.attributes.color.array;

      // Offset sculpture height.
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] = points[i];
        positions[i + 1] = points[i + 1] - sculptureHeight;
        positions[i + 2] = points[i + 2];
      }

      // Convert to linear color space.
      for (let i = 0; i < colors.length; i += 4) {
        const color = new THREE.Color(
          pointColors[i],
          pointColors[i + 1],
          pointColors[i + 2]
        ).convertSRGBToLinear();

        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
        // Skip alpha.
      }
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 4, true));
      sculpture.geometry = geo;
      sculpture.geometry.attributes.position.needsUpdate = true;
      sculpture.geometry.attributes.color.needsUpdate = true;

      sceneToExport.add(sculpture);
      // sculpture.translateY(-sculptureHeight); // Head / preview box height.
    }

    // Instantiate an OBJ exporter
    // Parse the input and generate the OBJ output
    // const exporterOBJ = new OBJExporter();
    // const data = exporterOBJ.parse(
    //   sceneToExport,
    //   function (done) {
    //     console.log(done);
    //   },
    //   function (err) {
    //     console.log(err);
    //   }
    // );
    //downloadFile(data);

    const options = {
      binary: true,
    }; // https://threejs.org/docs/#examples/en/exporters/GLTFExporter

    // Parse the input and generate the glTF output

    exporter.parse(
      sceneToExport,
      // called when the gltf has been generated
      function (glb) {
        // TODO: Add a flag to use the server here.

        if (output === "server") {
          upload(
            {
              filename: `${slug}.glb`,
              data: glb, //JSON.stringify(gltf),
              bucket, // This is hardcoded for now.
            },
            "gpu-response"
          );
        } else {
          // Assume "local".
          download({
            filename: `${slug}.glb`,
            data: glb,
          });
        }
      },
      // called when there is an error in the generation
      function (error) {
        console.log("An error happened");
      },
      options
    );

    removeObjectsWithChildren(sceneToExport);
    return;
  }

  // Otherwise assume a different kind of event...
  const form = scene.getObjectByUserDataProperty("aestheticID", event.uid);
  const painter = form.userData.ac_painter;
  painter.moveTo(new THREE.Vector3(...event.to));
  // console.log("move to", [...event.to]);
}

function handleController(controller) {
  // console.log(renderer.xr.getFrame()) // Note: Use in case I need more info!

  const userData = controller.userData;

  // TODO: Implement controller squeeze?
  //if (userData.isSqueezing === true) {
  //const delta = (controller.position.y - userData.positionAtSqueezeStart) * 5;
  //const scale = Math.max(0.1, userData.scaleAtSqueezeStart + delta);
  //pivot.scale.setScalar(scale);
  //painter.setSize(scale);

  const dir = new THREE.Vector3();
  controller.getWorldDirection(dir);
  const rot = new THREE.Quaternion();
  controller.getWorldQuaternion(rot);

  // Handle touch, lift, draw, and move events... only one per frame.
  if (userData.touchOrLift) {
    penEvent(userData.touchOrLift, controller);
    userData.touchOrLift = undefined;
  } else {
    penEvent(userData.isSelecting ? "draw" : "move", controller);
  }

  // For the sim pen3d object.
  return {
    pos: { ...controller.position },
    // TODO: Factor out rot?
    // rot: {
    //   _x: controller.rotation._x,
    //   _y: controller.rotation._y,
    //   _z: controller.rotation._z,
    // },
    lastPos: { ...userData.lastPosition },
    direction: dir,
    rotation: {
      _x: rot._x,
      _y: rot._y,
      _z: rot._z,
      _w: rot._w,
    },
  };
}

// Get controller data to send to a piece.
export function pollControllers() {
  if (vrSession) {
    const c1 = handleController(controller1);
    const c2 = handleController(controller2);
    const pen = controller1.handedness === "right" ? c1 : c2;

    // Cache the button states in the userData of the controller object.
    [controller1, controller2].forEach((controller) => {
      const gamepad = controller.gamepad;
      if (!controller.userData.buttons) controller.userData.buttons = [];
      if (!controller.userData.axes)
        controller.userData.axes = [{}, {}, {}, {}]; // There are only 4 axis right now. 22.11.17.00.21
      const h = controller.handedness === "right" ? "r" : "l";
      const cachedButts = controller.userData.buttons;
      if (!gamepad) return;

      // console.log(gamepad.hapticActuators); // TODO: Add rumble support.
      // using `playEfect` or `pulse`.

      // Meta Quest 2: Gamepad Axes Mapping

      // console.log(gamepad.axes)
      // [blank, blank, x, y] -1 -> 1
      //      0      1  2  3
      // r-hand-axis-x, r-hand-axis-y, r-hand-axis-x-left / right / up / down
      // l-hand-axis-x, l-hand-axis-y
      [2, 3].forEach((axisIndex) => {
        // Assign proper left and right hand controller button labels.
        let xy = axisIndex === 2 ? "x" : "y";

        const value = gamepad.axes[axisIndex];

        // Regular axis event.
        penEvents.push({ name: `${h}hand-axis-${xy}`, value });

        // Simplified Selection events.
        const key = `held:${xy}`;
        const held = controller.userData.axes[axisIndex][key];

        if (!held && abs(value) > 0.5) {
          if (value < 0) {
            const dir = xy === "x" ? "left" : "up";
            penEvents.push({ name: `${h}hand-axis-${xy}-${dir}` });
          } else if (value > 0) {
            const dir = xy === "x" ? "right" : "down";
            penEvents.push({ name: `${h}hand-axis-${xy}-${dir}` });
          }

          controller.userData.axes[axisIndex][key] = true;
        } else if (held && abs(value) < 0.1) {
          controller.userData.axes[axisIndex][key] = false;
        }
      });

      // ...
      gamepad.buttons.forEach((button, n) => {
        if (cachedButts[n] === undefined) cachedButts[n] = {};
        if (cachedButts[n].held === undefined) cachedButts[n].held = false;

        if (button.pressed) {
          // Meta Quest 2: Controller Button Mapping

          //           Trigger = 0 (value is pressure)
          //       Backtrigger = 1 (value is pressure)
          //  (Oculus button?) = 2
          // Thumbstick button = 3
          //                 A/X = 4
          //                 B/Y = 5
          const value = button.value;
          // Note: Eventually parse these with a colon? 22.11.15.10.57 ❓
          if (n === 0 && cachedButts[0].held === false) {
            penEvents.push({ name: h + "hand-trigger-down", value });
            cachedButts[0].held = true;
          }
          if (n === 1 && cachedButts[1].held === false) {
            penEvents.push({ name: h + "hand-trigger-secondary-down", value });
            cachedButts[1].held = true;
          }
          if (n === 3 && cachedButts[3].held === false) {
            penEvents.push({ name: h + "hand-button-thumb-down", value });
            cachedButts[3].held = true;
          }
          if (n === 4 && cachedButts[4].held === false) {
            penEvents.push({
              name: h + "hand-button-" + (h === "r" ? "a" : "x") + "-down",
              value,
            });
            cachedButts[4].held = true;
          }
          if (n === 5 && cachedButts[5].held === false) {
            penEvents.push({
              name: h + "hand-button-" + (h === "r" ? "b" : "y") + "-down",
              value,
            });
            cachedButts[5].held = true;
          }
          // console.log(`🥽 Button ${n} was pressed:`, value);
        } else {
          const value = button.value;
          // Note: Eventually parse these with a colon? 22.11.15.10.57 ❓
          if (n === 0) {
            penEvents.push({ name: h + "hand-trigger-up", value });
            cachedButts[0].held = false;
          }
          if (n === 1) {
            penEvents.push({ name: h + "hand-trigger-secondary-up", value });
            cachedButts[1].held = false;
          }
          if (n === 3) {
            penEvents.push({ name: h + "hand-button-thumb-up", value });
            cachedButts[3].held = false;
          }
          if (n === 4) {
            penEvents.push({
              name: h + "hand-button-" + (h === "r" ? "a" : "x") + "-up",
              value,
            });
            cachedButts[4].held = false;
          }
          if (n === 5) {
            penEvents.push({
              name: h + "hand-button-" + (h === "r" ? "b" : "y") + "-up",
              value,
            });
            cachedButts[5].held = false;
          }
          // console.log(`🥽 Button ${n} was released:`, value);
        }
      });
    });

    return { events: penEvents, pen };
  }
}

// Create a pen event.
function penEvent(name, controller) {
  const userData = controller.userData;

  const dir = new THREE.Vector3();
  controller.getWorldDirection(dir);
  const rot = new THREE.Quaternion();
  controller.getWorldQuaternion(rot);

  const delta = controller.position.distanceTo(userData.lastPosition);

  // Skip any draw and move events that did not update the lastPosition
  if (name === "draw" || (name === "move" && delta === 0)) return;

  // For any 3d:`pen` events within act.
  penEvents.push({
    name,
    pointer: parseInt(controller.name.split("-")[1]),
    pos: { ...controller.position },
    // rot: {
    //   _x: controller.rotation._x,
    //   _y: controller.rotation._y,
    //   _z: controller.rotation._z,
    // },
    direction: dir,
    rotation: {
      _x: rot._x,
      _y: rot._y,
      _z: rot._z,
      _w: rot._w,
    },
    lastPosition: { ...userData.lastPosition },
  });

  if (delta > 0.01) userData.lastPosition = { ...controller.position };
}

// Hooks into the requestAnimationFrame in the main system, and
// setAnimationLoop for VR.
export function render(now) {
  //console.log(test);
  //console.log(scene, now)
  // TODO: If keeping the renderer alive between pieces, then make sure to
  //       top rendering! 22.10.14.13.05
  if (scene && camera) {
    // CTO Rapter's line jiggling request:

    /*
    if (jiggleForm) {
      const positions = jiggleForm.geometry.attributes.position.array;

      const jiggleLevel = 0.001;

      for (let i = 0; i < positions.length; i += 6) {
      const randomJiggle1 = jiggleLevel / 2 - Math.random() * jiggleLevel;
      const randomJiggle2 = jiggleLevel / 2 - Math.random() * jiggleLevel;
      const randomJiggle3 = jiggleLevel / 2 - Math.random() * jiggleLevel;
        positions[i] += randomJiggle1;
        positions[i + 1] += randomJiggle2;
        positions[i + 2] += randomJiggle3;
        positions[i + 3] += randomJiggle1;
        positions[i + 4] += randomJiggle2;
        positions[i + 5] += randomJiggle3;
      }

      jiggleForm.geometry.setDrawRange(0, jiggleForm.ac_length);
      jiggleForm.geometry.attributes.position.needsUpdate = true;
    }

    if (jiggleForm && needsSphere) jiggleForm.geometry.computeBoundingSphere();
    needsSphere = false;
    */

    // console.log("position at render:", controller2?.position, performance.now());

    // Garbage is collected in `bios` under `BIOS:RENDER`
    renderer.render(scene, camera);

    if (renderedOnce === false) {
      renderer.domElement.classList.add("visible");
      send({ type: "gpu-rendered-once" });
      renderedOnce = true;
    }
  }
}

export function pasteTo(ctx) {
  ctx.drawImage(renderer.domElement, 0, 0);
}

export function clear() {
  renderer.clear();
}

export function kill() {
  renderer.domElement.remove();
  button?.remove();
  renderer.dispose();
  renderedOnce = false;
  scene = undefined;
  target = undefined;
  status.alive = false;
}

export function collectGarbage() {
  // ♻️ De-allocation.
  // Note: This should do the trick, but I should still
  //       check for leaks. 22.10.14.02.21
  const removedFormIDs = [];

  disposal.forEach((d, i) => {
    //console.log(d);
    if (d.keep === false) {
      d.resources.filter(Boolean).forEach((r) => r.dispose());
      removedFormIDs.push(d.form.userData.aestheticID);
      d.form.removeFromParent();
    }
    disposal[i] = undefined;
  });
  // Free memory from forms if they have been marked as `keep === false`.
  // (Or only drawn one time.)
  disposal = disposal.filter(Boolean);

  // Send a list of removed forms back to the running peace, so `formsSent` can
  // be updated and not grow for ♾️.
  if (removedFormIDs.length > 0) {
    send({ type: "gpu-forms-removed", content: removedFormIDs });
  }
}

// 📚 Library

// Completely dispose of an object and all its children.
// TODO: Eventually replace disposal's "resources" with this. 22.10.31.17.44
// Via: https://stackoverflow.com/a/73827012/8146077
function removeObjectsWithChildren(obj) {
  if (obj.children.length > 0) {
    for (var x = obj.children.length - 1; x >= 0; x--) {
      removeObjectsWithChildren(obj.children[x]);
    }
  }

  if (obj.geometry) {
    obj.geometry.dispose();
  }

  if (obj.material) {
    if (obj.material.length) {
      for (let i = 0; i < obj.material.length; ++i) {
        if (obj.material[i].map) obj.material[i].map.dispose();
        if (obj.material[i].lightMap) obj.material[i].lightMap.dispose();
        if (obj.material[i].bumpMap) obj.material[i].bumpMap.dispose();
        if (obj.material[i].normalMap) obj.material[i].normalMap.dispose();
        if (obj.material[i].specularMap) obj.material[i].specularMap.dispose();
        if (obj.material[i].envMap) obj.material[i].envMap.dispose();

        obj.material[i].dispose();
      }
    } else {
      if (obj.material.map) obj.material.map.dispose();
      if (obj.material.lightMap) obj.material.lightMap.dispose();
      if (obj.material.bumpMap) obj.material.bumpMap.dispose();
      if (obj.material.normalMap) obj.material.normalMap.dispose();
      if (obj.material.specularMap) obj.material.specularMap.dispose();
      if (obj.material.envMap) obj.material.envMap.dispose();

      obj.material.dispose();
    }
  }

  obj.removeFromParent();

  return true;
}

// See also: https://discourse.threejs.org/t/getobject-by-any-custom-property-present-in-userdata-of-object/3378/2
THREE.Object3D.prototype.getObjectByUserDataProperty = function (name, value) {
  if (this.userData[name] === value) return this;

  for (let i = 0, l = this.children.length; i < l; i += 1) {
    const child = this.children[i];
    const object = child.getObjectByUserDataProperty(name, value);
    if (object !== undefined) return object;
  }

  return undefined;
};
