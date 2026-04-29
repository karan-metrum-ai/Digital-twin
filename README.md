# Data Center 3D Digital Twin

A React + TypeScript + Three.js (via React Three Fiber) visualization of a data center floor with two rows of server racks, network cabling, ceiling lighting, and clickable servers — inspired by the reference images.

## Features

- **Two rows of 5 server racks each** (Row A facing front, Row B facing back) — matches the aisle layout from the reference images.
- **Each rack holds up to 20U of devices** with Dell EMC-style honeycomb grill bezels at the top.
- **Realistic network infrastructure** — overhead cable trays, color-coded fiber/ethernet/power cables with catenary sag, vertical drops to each rack.
- **Cinematic lighting rig** — bluish ambient + warm key light + cool rim light that mimics the look of the reference images.
- **Interactive** — drag to orbit, scroll to zoom, click any server to open a detailed info panel. Click a rack to highlight it and reveal hostname labels.
- **Live HUD** showing total devices, health distribution, total power draw, and selection count.
- **Mock data generator** produces 100+ devices across 10 racks with varied health states.

## Tech stack

- **React 18** + **TypeScript**
- **Vite** for blazing-fast dev server / bundling
- **Three.js** + **@react-three/fiber** for the 3D scene
- **@react-three/drei** for camera controls, environment maps, and HTML overlays
- **lucide-react** for icons

## Getting started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Project structure

```
src/
├── App.tsx
├── main.tsx
├── index.css
├── components/
│   └── DigitalTwin/
│       ├── DigitalTwinView.tsx       — Top-level 3D scene wrapper
│       ├── DataCenterEnvironment.tsx — Floor / walls / ceiling / lighting
│       ├── DataCenterFloor.tsx       — Multi-floor variant (vertical stacking)
│       ├── ServerRack.tsx            — Server rack with devices & LEDs
│       ├── DellGrill.tsx             — Dell EMC honeycomb bezel
│       ├── NetworkCables.tsx         — Cable trays + catenary cables
│       ├── RackInfoCard.tsx          — Device details side panel
│       ├── mockData.ts               — Realistic Rack3D / Device3D fixtures
│       └── types.ts                  — Shared TypeScript interfaces
└── styles/
    └── DigitalTwin/
        ├── RackInfoCard.css
        └── DigitalTwinStates.module.css
```

## Customization

- **Add more racks**: edit `mockData.ts` → `generateRacks()`. Adjust `position` arrays and the row loop.
- **Different lighting**: tweak the lights in `DigitalTwinView.tsx` (the `<ambientLight>`, `<directionalLight>`, etc. blocks).
- **Different aesthetic** (e.g. the bright white look of reference image 3): change the wall/ceiling materials in `DataCenterEnvironment.tsx` and the lighting colors in `DigitalTwinView.tsx`.
- **Real backend data**: replace the call to `generateRacks()` in `DigitalTwinView.tsx` with an API fetch returning the same `Rack3D[]` shape.

## Build for production

```bash
npm run build
npm run preview
```
