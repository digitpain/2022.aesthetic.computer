// 3D (GPU)
// Render geometry and scenes on the GPU via Three.js.

// TODO: Keep the renderer / scene alive when returning to the prompt, but
//       destroy it if the user doesn't return?

// TODO: Make use of indexed geometry at some point...

import * as THREE from "../dep/three/three.module.js";
import { VRButton } from "../dep/three/VRButton.js";
import { radians, rgbToHex } from "./num.mjs";

let scene,
  renderer,
  bakes,
  camera,
  disposal = [],
  target;

// let pixels;
let jiggleForm;

let button, vrSession, controller1, controller2; // VR Specific.
export const penEvents = []; // VR pointer events. 

// const cursor = new THREE.Vector3();

export const status = { alive: false };

export function initialize(wrapper, loop) {
  renderer = new THREE.WebGLRenderer({
    alpha: false,
    preserveDrawingBuffer: true,
  });

  renderer.xr.enabled = true;
  renderer.xr.setFramebufferScaleFactor(0.5);
  renderer.sortObjects = false;
  renderer.domElement.dataset.type = "3d";

  scene = new THREE.Scene();
  // scene.fog = new THREE.Fog(0x111111, 0.5, 2); // More basic fog.
  scene.fog = new THREE.FogExp2(0x030303, 0.5);

  // Set up VR.
  button = VRButton.createButton(renderer, function start(session) {
    console.log("🕶️️ VR Session started.");

    // Setup VR controllers.
    function onSelectStart() {
      this.userData.isSelecting = true;
      penEvent("touch", this);
    }

    function onSelectEnd() {
      this.userData.isSelecting = false;
      penEvent("lift", this);
    }

    function onSqueezeStart() {
      this.userData.isSqueezing = true;
      this.userData.positionAtSqueezeStart = this.position.y;
      this.userData.scaleAtSqueezeStart = this.scale.x;
    }

    function onSqueezeEnd() { this.userData.isSqueezing = false; }

    controller1 = renderer.xr.getController(0);
    controller1.name = "controller-1";
    controller1.addEventListener('selectstart', onSelectStart);
    controller1.addEventListener('selectend', onSelectEnd);
    controller1.addEventListener('squeezestart', onSqueezeStart);
    controller1.addEventListener('squeezeend', onSqueezeEnd);
    //controller1.userData.painter = painter1;
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.name = "controller-2";
    controller2.addEventListener('selectstart', onSelectStart);
    controller2.addEventListener('selectend', onSelectEnd);
    controller2.addEventListener('squeezestart', onSqueezeStart);
    controller2.addEventListener('squeezeend', onSqueezeEnd);
    //controller2.userData.painter = painter2;
    scene.add(controller2);

    const wandLen = 0.2;
    const wandOffset = 0.075;

    // Create some geometry for each controller.
    const geometry = new THREE.CylinderGeometry(0.0025, 0.0025, 0.2, 32);
    geometry.rotateX(- Math.PI / 2);
    geometry.translate(0, 0, - (wandLen / 2) + wandOffset);
    const material = new THREE.MeshBasicMaterial({
      flatShading: true,
      color: new THREE.Color(0.5, 0.5, 0.5)
    });
    const mesh = new THREE.Mesh(geometry, material);

    const pivot = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0025, 5), material);

    pivot.name = 'pivot';
    pivot.position.z = - wandLen + wandOffset;

    //mesh.name = 'pivot';

    mesh.add(pivot);

    controller1.add(mesh.clone());
    controller2.add(mesh.clone());

    vrSession = session;

    // Why is loop sometimes undefined here when taking off and putting on my VR headset? 22.10.26.21.25
    renderer.setAnimationLoop((now) => loop(now, true));

  }, function end() {
    renderer.setAnimationLoop(null);
    console.log("🕶️ VR Session ended.");
    vrSession = null;
  }); // Will return `undefined` if VR is not supported.

  if (button) document.body.append(button);

  wrapper.append(renderer.domElement); // Add renderer to dom.
  status.alive = true;
}

// Should all bakes be batched together, messages combined?
// (Maybe not yet... unless there becomes tons of calls in a piece.)
export function bake({ cam, forms, color }, { width, height }, size) {
  // Clear leftovers that was marked as deletable from the last round of bakes.

  // Only instantiate some things once.
  if (!target || target.width !== width || target.height !== height) {
    target = new THREE.WebGLRenderTarget(width, height);
    renderer.setSize(size.width, size.height);
    renderer.setPixelRatio(1 / 2.2);
    // renderer.setRenderTarget(target); // For rendering offsceen.
    // pixels = new Uint8Array(width * height * 4);
    const fov = 80;
    const aspect = width / height;
    const near = 0.1;
    const far = 1000;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  }

  // 🎥 Camera
  camera.rotation.order = "YXZ"; // Set to match the software renderer.
  camera.rotation.set(radians(cam.rotation[0]), radians(cam.rotation[1]), 0);
  camera.position.set(...cam.position);

  if (!Array.isArray(forms)) forms = [forms];

  // *** 📐 Geometry ***
  // Check f.type for adding new forms, or f.update for modifying added forms.
  forms.forEach((f) => {
    // *** 🔺 Triangle ***
    if (f.type === "triangle") {
      // Add texture.
      const tex = new THREE.DataTexture(
        f.texture.pixels,
        f.texture.width,
        f.texture.height,
        THREE.RGBAFormat
      );

      tex.needsUpdate = true;

      const material = new THREE.MeshBasicMaterial({ map: tex });
      material.side = THREE.DoubleSide;
      material.transparent = true;
      material.opacity = f.alpha;
      material.depthWrite = true;
      material.depthTest = true;

      const points = f.vertices.map((v) => new THREE.Vector3(...v.pos));
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      geometry.setAttribute(
        "uv",
        new THREE.BufferAttribute(new Float32Array(f.uvs), 2)
      );

      const tri = new THREE.Mesh(geometry, material);

      tri.translateX(f.position[0]);
      tri.translateY(f.position[1]);
      tri.translateZ(f.position[2]);
      tri.rotateX(radians(f.rotation[0]));
      tri.rotateY(radians(f.rotation[1]));
      tri.rotateZ(radians(f.rotation[2]));
      tri.scale.set(...f.scale);

      scene.add(tri);
      tri.aestheticID = f.uid;

      disposal.push(tex, material, geometry);
    }

    // *** 🟥 Quad ***
    if (f.type === "quad") {
      // Add texture.
      const tex = new THREE.DataTexture(
        f.texture.pixels,
        f.texture.width,
        f.texture.height,
        THREE.RGBAFormat
      );
      tex.needsUpdate = true;

      const material = new THREE.MeshBasicMaterial({ map: tex });
      material.side = THREE.DoubleSide;
      //material.transparent = true;
      material.opacity = f.alpha;
      material.alphaTest = 0.5;
      material.depthWrite = false;
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
      plane.aestheticID = f.uid;

      disposal.push({
        keep: f.gpuKeep,
        form: plane,
        resources: [tex, material, geometry],
      });
    }

    // *** ✏️ Line ***
    if (f.type === "line") {
      const material = new THREE.LineBasicMaterial({
        color: rgbToHex(...(f.color || color)),
      });
      material.transparent = true;
      material.opacity = f.alpha;
      material.depthWrite = true;
      material.depthTest = true;
      material.linewidth = 1;

      const points = f.vertices.map((v) => new THREE.Vector3(...v.pos));
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);

      line.translateX(f.position[0]);
      line.translateY(f.position[1]);
      line.translateZ(f.position[2]);
      line.rotateX(radians(f.rotation[0]));
      line.rotateY(radians(f.rotation[1]));
      line.rotateZ(radians(f.rotation[2]));
      line.scale.set(...f.scale);

      scene.add(line);
      line.aestheticID = f.uid;

      disposal.push({
        keep: f.gpuKeep,
        form: line,
        resources: [material, geometry],
      });
    }

    if (f.type === "line:buffered") {
      const material = new THREE.LineBasicMaterial({
        color: rgbToHex(...(f.color || color)),
      });
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

      // Generate a curve for points if there are any at the start.
      if (f.vertices.length > 0) {
        points = f.vertices.map((v) => new THREE.Vector3(...v.pos));
        pointColors = f.vertices.map((v) => new THREE.Vector4(...v.color));
      }

      const geometry = new THREE.BufferGeometry();

      // attributes
      const positions = new Float32Array(f.MAX_POINTS * 3);
      const colors = new Float32Array(f.MAX_POINTS * 4);

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

          -  left for everything else

      */

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

      const lineb = new THREE.LineSegments(geometry, material);

      lineb.ac_length = points.length;
      lineb.ac_lastLength = lineb.ac_length;
      //lineb.ac_vertsToAdd = [];

      lineb.translateX(f.position[0]);
      lineb.translateY(f.position[1]);
      lineb.translateZ(f.position[2]);
      lineb.rotateX(radians(f.rotation[0]));
      lineb.rotateY(radians(f.rotation[1]));
      lineb.rotateZ(radians(f.rotation[2]));
      lineb.scale.set(...f.scale);

      scene.add(lineb);
      lineb.aestheticID = f.uid;

      geometry.setDrawRange(0, points.length);
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      geometry.computeBoundingBox();
      //geometry.computeBoundingSphere();

      disposal.push({
        keep: f.gpuKeep,
        form: lineb,
        resources: [material, geometry],
      });
    }

    if (f.update === "form:transform") {
      const fu = f; // formUpdate
      const form = scene.getObjectByProperty("aestheticID", fu.uid);
      if (!form) return;

      form.position.set(...fu.position);

      form.rotation.set(
        radians(fu.rotation[0]),
        radians(fu.rotation[1]),
        radians(fu.rotation[2])
      );

      form.scale.set(...fu.scale);
    }

    // Add vertices to geometry:buffered objects.
    if (f.update === "form:buffered:add-vertices") {
      const formUpdate = f;

      // TODO: Make this generic / hold onto
      //       IDs for each form.
      //       Should I maintain my own IDs or
      //       actually send the ones
      //       back from Three JS?
      //
      //       Actually I can just use a
      //       dictionary here... 22.10.12.15.30

      const form = scene.getObjectByProperty("aestheticID", formUpdate.uid);
      if (!form) return;

      jiggleForm = form;

      // See: https://threejs.org/docs/#manual/en/introduction/How-to-update-things,
      //      https://jsfiddle.net/t4m85pLr/1
      if (form) {
        // 0. Flush the vertsToAdd cache if necessary.
        //if (formUpdate.flush) form.ac_vertsToAdd.length = 0;

        if (formUpdate.reset) {
          form.ac_length = 0;
          form.ac_lastLength = 0;
        }

        const points = [];
        const pointColors = [];

        for (let i = 0; i < formUpdate.vertices.length; i += 1) {
          points.push(new THREE.Vector3(...formUpdate.vertices[i].pos));
          pointColors.push(new THREE.Vector4(...formUpdate.vertices[i].color));
        }

        //form.ac_vertsToAdd.length = 0; // Ingest added points.

        // Set custom properties on the form to keep track of where we are
        // in the previously allocated vertex buffer.
        form.ac_lastLength = form.ac_length;
        form.ac_length += points.length;

        const positions = form.geometry.attributes.position.array;
        const colors = form.geometry.attributes.color.array;

        for (let i = 0; i < points.length; i += 1) {
          const posStart = (form.ac_lastLength + i) * 3;
          positions[posStart] = points[i].x;
          positions[posStart + 1] = points[i].y;
          positions[posStart + 2] = points[i].z;
        }

        for (let i = 0; i < pointColors.length; i += 1) {
          const colStart = (form.ac_lastLength + i) * 4;
          colors[colStart] = pointColors[i].x / 255;
          colors[colStart + 1] = pointColors[i].y / 255;
          colors[colStart + 2] = pointColors[i].z / 255;
          colors[colStart + 3] = pointColors[i].w / 255;
        }

        form.geometry.setDrawRange(0, form.ac_length);
        form.geometry.attributes.position.needsUpdate = true;
        form.geometry.attributes.color.needsUpdate = true;

        form.geometry.computeBoundingBox();
        form.geometry.computeBoundingSphere();
      }
    }
  });

  // In case we need to render off screen.
  //renderer.render(scene, camera);
  //renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
  //return pixels;
}


function handleController(controller) {
  const userData = controller.userData;
  //const painter = userData.painter;
  const pivot = controller.getObjectByName('pivot');

  // TODO: Implement controller squeeze?
  //if (userData.isSqueezing === true) {
    //const delta = (controller.position.y - userData.positionAtSqueezeStart) * 5;
    //const scale = Math.max(0.1, userData.scaleAtSqueezeStart + delta);
    //pivot.scale.setScalar(scale);
    //painter.setSize(scale);
  //}

  // cursor.setFromMatrixPosition(pivot.matrixWorld);
  const position = new THREE.Vector3();
  position.setFromMatrixPosition(pivot.matrixWorld);

  if (controller.userData.lastPosition) {
    const delta = controller.position.distanceTo(controller.userData.lastPosition);
    // Add a small deadzone to controller movements.
    if (delta > 0.0001) { penEvent(userData.isSelecting ? "draw" : "move", controller); }
  }

  controller.userData.lastPosition = { ...position };
}

function penEvent(name, controller) {
  const pivot = controller.getObjectByName('pivot');
  const position = new THREE.Vector3();
  position.setFromMatrixPosition(pivot.matrixWorld);

  penEvents.push({
    name,
    pointer: parseInt(controller.name.split("-")[1]),
    position: { ...position },
    lastPosition: { ...controller.userData.lastPosition }
  });
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
    */

    // Garbage is collected in `bios` under `BIOS:RENDER`
    renderer.render(scene, camera);
  }
}

export function pasteTo(ctx) {
  ctx.drawImage(renderer.domElement, 0, 0);
}

export function pollControllers() {
  if (vrSession) {
    handleController(controller1);
    handleController(controller2);
  }
}

export function clear() {
  renderer.clear();
}

export function penPosition() {
  if (controller2) {
    const pivot = controller2.getObjectByName('pivot');
    const position = new THREE.Vector3();
    position.setFromMatrixPosition(pivot.matrixWorld);
    return position; 
  }
}

export function collectGarbage() {
  // ♻️ De-allocation.
  // Note: This should do the trick, but I should still
  //       check for leaks. 22.10.14.02.21
  disposal.forEach((d, i) => {
    if (d.keep === false) {
      d.resources.forEach((r) => r.dispose());
      d.form.removeFromParent();
    }
    disposal[i] = undefined;
  }); // Free memory from forms if it's been marked as `keep === false`.
  disposal = disposal.filter(Boolean);
}

export const bakeQueue = [];

export function kill() {
  renderer.domElement.remove();
  button?.remove();
  renderer.dispose();
  scene = undefined;
  target = undefined;
  status.alive = false;
}