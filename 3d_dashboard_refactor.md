# Project Plan: Digital Twin Dashboard with Spatial Data Overlays

## 1. Project Goal
We are building a Digital Twin interface for a building management system. 
- **Input:** Live data from Niagara Workbench (simulated for now).
- **Visualization:** A 3D Blender model of the building (`.glb` format).
- **UI:** HTML Data Cards overlaying the 3D model, anchored to specific equipment positions.
- **Interaction:** Users can click equipment to "Zoom" the camera. Data cards can be toggled on/off.

## 2. Technical Stack
- **Engine:** Three.js (Standard WebGL renderer).
- **Overlay System:** `CSS2DRenderer` (To map HTML elements to 3D coordinates).
- **Format:** glTF 2.0 (`.glb`).
- **Animation:** GSAP (GreenSock) for smooth camera zooming.
- **Styling:** CSS3 (Glassmorphism style).

## 3. The "Anchor" Protocol (Blender to JS)
The 3D model contains invisible "Empty" nodes to mark where data cards should appear.
- **Naming Convention:** `ANCHOR_<ID>` (e.g., `ANCHOR_AHU-1`, `ANCHOR_VAV-102`).
- **Logic:** The code must traverse the GLTF scene graph, find nodes starting with `ANCHOR_`, and instantiate a `CSS2DObject` at that position.

## 4. Architecture: Decoupled State
We must not store data inside the 3D objects.
1. **State Manager:** A central object holds the live data: `{ 'AHU-1': { temp: 72, status: 'On' } }`.
2. **DOM Update Loop:** The HTML cards subscribe to this state.
3. **3D Update Loop:** The 3D meshes (colors/animations) subscribe to this state.

## 5. Implementation Tasks for Cursor

### Phase 1: Scene Setup & CSS2DRenderer
Create a standard Three.js boilerplate, but include the `CSS2DRenderer`.
- The `CSS2DRenderer` DOM element must be `position: absolute; top: 0; pointer-events: none;`.
- *Note:* We need to allow pointer events on the *child* elements (the cards) but not the container, so clicks pass through to the 3D canvas.

### Phase 2: The Card Factory
Create a function `createDataCard(id)` that returns an HTML string or Element.
- **Style:** Glassmorphism (Background blur, semi-transparent white, thin border).
- **Structure:**
  ```html
  <div class="data-card" id="card-${id}">
     <h4>${id}</h4>
     <div class="value">--</div>
  </div>