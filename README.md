# 251018_AttractorGrid

251018_AttractorGrid is an interactive spatial exploration tool built on Three.js and lil-gui. It renders a configurable grid of morphing boxes that respond to a draggable attractor handle, letting you study distance falloff, color interpolation, rotation, and height modulation in real time.

## Features
- Multiparameter grid generator with adjustable cell counts, spacing, and base dimensions.
- Dynamic morph target blending that shifts boxes between cube and pyramid shapes based on distance from the attractor.
- Distance-driven scaling, rotation, and color gradients that update every frame.
- Intuitive GUI for tweaking min/max size, rotation ranges, color endpoints, counts, spacing, and shadow toggles.
- Responsive orbit-controlled camera with ambient and directional lighting for clean presentation renders.

## Getting Started
1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev` (Vite serves at http://localhost:5173 by default)
3. Build for production: `npm run build`
4. Preview the production build locally: `npm run preview`

## Controls
- **Attractor handle:** Drag the orange sphere in the scene to reposition the influence point; cells react instantly.
- **Grid Controls panel:** Adjust min/max size, spacing, grid counts, and color gradient endpoints.
- **Rotation sliders:** Set minimum and maximum rotation angles that interpolate across the grid.
- **Shadows toggle:** Enable or disable shadow casting for performance testing or crisp screenshots.
- **Camera:** Orbit, pan, and zoom with standard mouse controls provided by OrbitControls.
