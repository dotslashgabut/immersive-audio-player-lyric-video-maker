import * as THREE from 'three';
import { RenderConfig } from '../types';

// ─── Module-level state ───────────────────────────────────────────────────────
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let currentObjects: THREE.Object3D[] = [];
let prevSceneType: string | undefined;

// Reusable color object – avoids a `new THREE.Color()` allocation every frame.
const _color = new THREE.Color();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Recursively dispose geometries and materials so that GPU memory is freed
 * when we switch to a different scene type.
 */
function disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
        const mesh = child as THREE.Mesh | THREE.Points | THREE.Line | THREE.LineSegments;
        if (mesh.geometry) {
            mesh.geometry.dispose();
        }
        if ((mesh as THREE.Mesh).material) {
            const mat = (mesh as THREE.Mesh).material;
            if (Array.isArray(mat)) {
                mat.forEach(m => m.dispose());
            } else {
                (mat as THREE.Material).dispose();
            }
        }
    });
}

/**
 * Dispose all current scene objects and clear the tracking array.
 */
function disposeCurrentObjects(): void {
    currentObjects.forEach(obj => {
        disposeObject(obj);
        if (scene) scene.remove(obj);
    });
    currentObjects = [];
}

// ─── Scene initialisation ─────────────────────────────────────────────────────

export const initThreeScene = (width: number, height: number, config: RenderConfig): void => {
    if (!renderer) {
        renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true,
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); // cap at 2× for perf
        renderer.setClearColor(0x000000, 0);
    }
    renderer.setSize(width, height);

    if (!scene || prevSceneType !== config.threejsScene) {
        // -- Tear down previous scene to free GPU/CPU memory --
        if (scene) {
            disposeCurrentObjects();
        }

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.set(0, 0, 5);
        prevSceneType = config.threejsScene;

        const sceneType = config.threejsScene ?? 'stars';
        _color.set(config.threejsColor ?? '#a855f7');

        switch (sceneType) {
            // ── Cubes ────────────────────────────────────────────────────────
            case 'cubes': {
                const geo = new THREE.BoxGeometry();
                for (let i = 0; i < 20; i++) {
                    const material = new THREE.MeshBasicMaterial({ color: _color, wireframe: true });
                    const cube = new THREE.Mesh(geo, material);
                    cube.position.set(
                        (Math.random() - 0.5) * 10,
                        (Math.random() - 0.5) * 10,
                        (Math.random() - 0.5) * 10,
                    );
                    scene.add(cube);
                    currentObjects.push(cube);
                }
                // Share geometry; dispose only once via the group disposer
                break;
            }

            // ── Waves ────────────────────────────────────────────────────────
            case 'waves': {
                const planeGeo = new THREE.PlaneGeometry(20, 20, 32, 32);
                // Cache original X/Y so animation can reference them without drift
                const origPos = Float32Array.from(
                    planeGeo.attributes.position.array as Float32Array,
                );
                planeGeo.userData.origPos = origPos;
                const planeMat = new THREE.MeshBasicMaterial({ color: _color, wireframe: true });
                const plane = new THREE.Mesh(planeGeo, planeMat);
                plane.rotation.x = -Math.PI / 2;
                scene.add(plane);
                currentObjects.push(plane);
                break;
            }

            // ── Particles ────────────────────────────────────────────────────
            case 'particles': {
                const count = 5000;
                const posArray = new Float32Array(count * 3);
                for (let i = 0; i < count * 3; i++) posArray[i] = (Math.random() - 0.5) * 20;
                const geo = new THREE.BufferGeometry();
                geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
                const mat = new THREE.PointsMaterial({ size: 0.05, color: _color });
                const parts = new THREE.Points(geo, mat);
                scene.add(parts);
                currentObjects.push(parts);
                break;
            }

            // ── Galaxy ───────────────────────────────────────────────────────
            case 'galaxy': {
                const galaxyCount = 8000;
                const galaxyPos = new Float32Array(galaxyCount * 3);
                const arms = 4;
                for (let i = 0; i < galaxyCount; i++) {
                    const radius = Math.random() * 8;
                    const armAngle = ((i % arms) / arms) * Math.PI * 2;
                    const spinAngle = radius * 1.5;
                    const scatter = (1 - radius / 8) * 0.5 + 0.1;
                    galaxyPos[i * 3] = Math.cos(armAngle + spinAngle) * radius + (Math.random() - 0.5) * scatter * 2;
                    galaxyPos[i * 3 + 1] = (Math.random() - 0.5) * scatter * 0.5;
                    galaxyPos[i * 3 + 2] = Math.sin(armAngle + spinAngle) * radius + (Math.random() - 0.5) * scatter * 2;
                }
                const galaxyGeo = new THREE.BufferGeometry();
                galaxyGeo.setAttribute('position', new THREE.BufferAttribute(galaxyPos, 3));
                const galaxyMat = new THREE.PointsMaterial({ size: 0.04, color: _color, transparent: true, opacity: 0.8 });
                const galaxy = new THREE.Points(galaxyGeo, galaxyMat);
                scene.add(galaxy);
                currentObjects.push(galaxy);

                // Center core – keep white; tagged so color updater skips it
                const coreCount = 500;
                const corePos = new Float32Array(coreCount * 3);
                for (let i = 0; i < coreCount; i++) {
                    const r = Math.random() * 0.8;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.random() * Math.PI;
                    corePos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
                    corePos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.3;
                    corePos[i * 3 + 2] = r * Math.cos(phi);
                }
                const coreGeo = new THREE.BufferGeometry();
                coreGeo.setAttribute('position', new THREE.BufferAttribute(corePos, 3));
                const coreMat = new THREE.PointsMaterial({ size: 0.06, color: 0xffffff, transparent: true, opacity: 0.9 });
                const core = new THREE.Points(coreGeo, coreMat);
                core.userData.keepColor = true; // white core
                scene.add(core);
                currentObjects.push(core);

                camera.position.set(0, 6, 8);
                camera.lookAt(0, 0, 0);
                break;
            }

            // ── DNA Helix ────────────────────────────────────────────────────
            case 'dna': {
                const helixGroup = new THREE.Group();
                const strandPoints = 80;
                const helixRadius = 1.5;
                const helixHeight = 12;

                // Share a single geometry between both strand Lines
                for (let strand = 0; strand < 2; strand++) {
                    const positions: number[] = [];
                    const offset = strand * Math.PI;
                    for (let i = 0; i < strandPoints; i++) {
                        const t = i / strandPoints;
                        const angle = t * Math.PI * 6 + offset;
                        positions.push(
                            Math.cos(angle) * helixRadius,
                            (t - 0.5) * helixHeight,
                            Math.sin(angle) * helixRadius,
                        );
                    }
                    const strandGeo = new THREE.BufferGeometry();
                    strandGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                    const strandMat = new THREE.LineBasicMaterial({ color: _color });
                    helixGroup.add(new THREE.Line(strandGeo, strandMat));
                }

                // Rungs – share one material instance
                const rungMat = new THREE.LineBasicMaterial({ color: _color, transparent: true, opacity: 0.4 });
                for (let i = 0; i < strandPoints; i += 3) {
                    const t = i / strandPoints;
                    const angle1 = t * Math.PI * 6;
                    const angle2 = angle1 + Math.PI;
                    const y = (t - 0.5) * helixHeight;
                    const rungGeo = new THREE.BufferGeometry();
                    rungGeo.setAttribute('position', new THREE.Float32BufferAttribute([
                        Math.cos(angle1) * helixRadius, y, Math.sin(angle1) * helixRadius,
                        Math.cos(angle2) * helixRadius, y, Math.sin(angle2) * helixRadius,
                    ], 3));
                    helixGroup.add(new THREE.Line(rungGeo, rungMat));
                }

                // Node spheres – share one geometry + material
                const nodeGeo = new THREE.SphereGeometry(0.08, 6, 6); // reduced segments
                const nodeMat = new THREE.MeshBasicMaterial({ color: _color });
                for (let i = 0; i < strandPoints; i += 5) {
                    for (let strand = 0; strand < 2; strand++) {
                        const t = i / strandPoints;
                        const angle = t * Math.PI * 6 + strand * Math.PI;
                        const sphere = new THREE.Mesh(nodeGeo, nodeMat);
                        sphere.position.set(
                            Math.cos(angle) * helixRadius,
                            (t - 0.5) * helixHeight,
                            Math.sin(angle) * helixRadius,
                        );
                        helixGroup.add(sphere);
                    }
                }

                scene.add(helixGroup);
                currentObjects.push(helixGroup);
                camera.position.set(4, 0, 4);
                camera.lookAt(0, 0, 0);
                break;
            }

            // ── Aurora ───────────────────────────────────────────────────────
            case 'aurora': {
                const auroraGroup = new THREE.Group();
                const ribbonCount = 5;
                for (let r = 0; r < ribbonCount; r++) {
                    const ribbonGeo = new THREE.PlaneGeometry(16, 3, 60, 1);
                    // Cache original Y per vertex to prevent drift during animation
                    const origY = Float32Array.from(
                        (ribbonGeo.attributes.position.array as Float32Array).filter((_, idx) => idx % 3 === 1),
                    );
                    ribbonGeo.userData.origY = origY;
                    const ribbonMat = new THREE.MeshBasicMaterial({
                        color: _color,
                        transparent: true,
                        opacity: 0.15 + r * 0.05,
                        side: THREE.DoubleSide,
                    });
                    const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
                    ribbon.position.set(0, 2 + r * 0.6, -3 - r * 0.5);
                    ribbon.rotation.x = -0.3;
                    auroraGroup.add(ribbon);
                }
                scene.add(auroraGroup);
                currentObjects.push(auroraGroup);

                // Background stars
                const bgCount = 1000;
                const bgPos = new Float32Array(bgCount * 3);
                for (let i = 0; i < bgCount; i++) {
                    bgPos[i * 3] = (Math.random() - 0.5) * 30;
                    bgPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
                    bgPos[i * 3 + 2] = -10 - Math.random() * 10;
                }
                const bgGeo = new THREE.BufferGeometry();
                bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
                const bgMat = new THREE.PointsMaterial({ size: 0.02, color: 0xffffff, transparent: true, opacity: 0.5 });
                const bgStars = new THREE.Points(bgGeo, bgMat);
                bgStars.userData.keepColor = true;
                scene.add(bgStars);
                currentObjects.push(bgStars);

                camera.position.set(0, 0, 8);
                camera.lookAt(0, 2, -5);
                break;
            }

            // ── Matrix Rain ──────────────────────────────────────────────────
            // Use InstancedMesh instead of 600 individual Meshes for a massive
            // draw-call reduction (600 → 1 draw call).
            case 'matrix': {
                const columns = 30;
                const rowsPerCol = 20;
                const total = columns * rowsPerCol;

                const dotGeo = new THREE.PlaneGeometry(0.2, 0.2);
                const dotMat = new THREE.MeshBasicMaterial({
                    color: _color,
                    transparent: true,
                    side: THREE.DoubleSide,
                });
                const instanced = new THREE.InstancedMesh(dotGeo, dotMat, total);
                instanced.userData.instanceData = [] as Array<{
                    col: number; row: number; baseX: number; speed: number; phase: number;
                }>;

                const dummy = new THREE.Object3D();
                let idx = 0;
                for (let col = 0; col < columns; col++) {
                    const x = (col - columns / 2) * 0.5;
                    for (let row = 0; row < rowsPerCol; row++) {
                        dummy.position.set(x, 5 - row * 0.5, (Math.random() - 0.5) * 2);
                        dummy.updateMatrix();
                        instanced.setMatrixAt(idx, dummy.matrix);
                        instanced.userData.instanceData.push({
                            col, row,
                            baseX: x,
                            speed: 0.8 + Math.random() * 1.5,
                            phase: Math.random() * Math.PI * 2,
                        });
                        idx++;
                    }
                }
                instanced.instanceMatrix.needsUpdate = true;
                scene.add(instanced);
                currentObjects.push(instanced);
                camera.position.set(0, 0, 8);
                camera.lookAt(0, 0, 0);
                break;
            }

            // ── Nebula ───────────────────────────────────────────────────────
            case 'nebula': {
                const nebulaGroup = new THREE.Group();
                const cloudLayers = 4;
                for (let layer = 0; layer < cloudLayers; layer++) {
                    const cloudCount = 3000;
                    const cloudPos = new Float32Array(cloudCount * 3);
                    const spread = 6 + layer * 2;
                    for (let i = 0; i < cloudCount; i++) {
                        const r = Math.pow(Math.random(), 0.5) * spread;
                        const theta = Math.random() * Math.PI * 2;
                        const phi = (Math.random() - 0.5) * Math.PI * 0.6;
                        cloudPos[i * 3] = r * Math.cos(theta) * Math.cos(phi);
                        cloudPos[i * 3 + 1] = r * Math.sin(phi) * 0.6;
                        cloudPos[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);
                    }
                    const cloudGeo = new THREE.BufferGeometry();
                    cloudGeo.setAttribute('position', new THREE.BufferAttribute(cloudPos, 3));
                    const layerColor = _color.clone();
                    layerColor.offsetHSL(layer * 0.15, 0, (layer - 2) * 0.05);
                    const cloudMat = new THREE.PointsMaterial({
                        size: 0.04 + layer * 0.01,
                        color: layerColor,
                        transparent: true,
                        opacity: 0.4 - layer * 0.05,
                    });
                    nebulaGroup.add(new THREE.Points(cloudGeo, cloudMat));
                }

                // Bright core stars – kept white
                const brightCount = 200;
                const brightPos = new Float32Array(brightCount * 3);
                for (let i = 0; i < brightCount; i++) {
                    const r = Math.random() * 2;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = (Math.random() - 0.5) * Math.PI;
                    brightPos[i * 3] = r * Math.cos(theta) * Math.cos(phi);
                    brightPos[i * 3 + 1] = r * Math.sin(phi) * 0.4;
                    brightPos[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);
                }
                const brightGeo = new THREE.BufferGeometry();
                brightGeo.setAttribute('position', new THREE.BufferAttribute(brightPos, 3));
                const brightMat = new THREE.PointsMaterial({ size: 0.08, color: 0xffffff, transparent: true, opacity: 0.9 });
                const brightStars = new THREE.Points(brightGeo, brightMat);
                brightStars.userData.keepColor = true;
                nebulaGroup.add(brightStars);

                scene.add(nebulaGroup);
                currentObjects.push(nebulaGroup);
                camera.position.set(0, 0, 10);
                camera.lookAt(0, 0, 0);
                break;
            }

            // ── Rings ────────────────────────────────────────────────────────
            case 'rings': {
                const ringsGroup = new THREE.Group();
                const ringCount = 8;
                const sphereGeo = new THREE.SphereGeometry(0.6, 24, 24);
                const sphereMat = new THREE.MeshBasicMaterial({ color: _color, wireframe: true });
                ringsGroup.add(new THREE.Mesh(sphereGeo, sphereMat));

                for (let i = 0; i < ringCount; i++) {
                    const inner = 1.2 + i * 0.5;
                    const outer = inner + 0.15;
                    const ringGeo = new THREE.RingGeometry(inner, outer, 64);
                    const ringMat = new THREE.MeshBasicMaterial({
                        color: _color,
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: Math.max(0.05, 0.6 - i * 0.05),
                    });
                    const ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.rotation.x = Math.PI / 2 + (i % 2 === 0 ? 0.2 : -0.15) * (i * 0.3);
                    ring.rotation.y = (i * Math.PI) / ringCount;
                    ringsGroup.add(ring);
                }

                scene.add(ringsGroup);
                currentObjects.push(ringsGroup);
                camera.position.set(3, 3, 6);
                camera.lookAt(0, 0, 0);
                break;
            }

            // ── Tunnel ───────────────────────────────────────────────────────
            case 'tunnel': {
                const tunnelGroup = new THREE.Group();
                const segmentCount = 40;
                // Share one geometry (all rings same shape)
                const ringGeo = new THREE.RingGeometry(3, 3.2, 6);
                for (let i = 0; i < segmentCount; i++) {
                    const ringMat = new THREE.MeshBasicMaterial({
                        color: _color,
                        transparent: true,
                        opacity: (1 - i / segmentCount) * 0.8,
                        side: THREE.DoubleSide,
                    });
                    const ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.position.z = -i * 1.5;
                    ring.rotation.z = (i * Math.PI) / 6;
                    tunnelGroup.add(ring);
                }
                scene.add(tunnelGroup);
                currentObjects.push(tunnelGroup);
                camera.position.set(0, 0, 5);
                camera.lookAt(0, 0, -20);
                break;
            }

            // ── Warp ─────────────────────────────────────────────────────────
            case 'warp': {
                const warpCount = 1000;
                // Store base positions in userData for per-frame movement
                const baseZ = new Float32Array(warpCount);
                const baseX = new Float32Array(warpCount);
                const baseY = new Float32Array(warpCount);
                for (let i = 0; i < warpCount; i++) {
                    baseX[i] = (Math.random() - 0.5) * 40;
                    baseY[i] = (Math.random() - 0.5) * 40;
                    baseZ[i] = -Math.random() * 100;
                }

                // Build stretched line-pair buffer
                const stretchedPos = new Float32Array(warpCount * 6);
                const TAIL = 2;
                for (let i = 0; i < warpCount; i++) {
                    stretchedPos[i * 6] = baseX[i];
                    stretchedPos[i * 6 + 1] = baseY[i];
                    stretchedPos[i * 6 + 2] = baseZ[i];
                    stretchedPos[i * 6 + 3] = baseX[i];
                    stretchedPos[i * 6 + 4] = baseY[i];
                    stretchedPos[i * 6 + 5] = baseZ[i] + TAIL;
                }
                const linesGeo = new THREE.BufferGeometry();
                linesGeo.setAttribute('position', new THREE.BufferAttribute(stretchedPos, 3));
                const warpMat = new THREE.LineBasicMaterial({ color: _color, transparent: true, opacity: 0.8 });
                const warpLines = new THREE.LineSegments(linesGeo, warpMat);
                warpLines.userData = { baseX, baseY, baseZ, TAIL };
                scene.add(warpLines);
                currentObjects.push(warpLines);
                camera.position.set(0, 0, 5);
                camera.lookAt(0, 0, -50);
                break;
            }

            // ── CyberGrid ────────────────────────────────────────────────────
            case 'cybergrid': {
                const gridGroup = new THREE.Group();
                const size = 100;
                const divisions = 50;

                // Two floor tiles that alternate to fake infinite scroll
                for (let tile = 0; tile < 2; tile++) {
                    const floorGrid = new THREE.GridHelper(size, divisions, _color.getHex(), _color.getHex());
                    floorGrid.position.set(0, -3, -tile * size);
                    floorGrid.userData.tileIndex = tile;
                    gridGroup.add(floorGrid);
                }

                scene.add(gridGroup);
                currentObjects.push(gridGroup);
                camera.position.set(0, 0, 10);
                camera.lookAt(0, 0, 0);
                break;
            }

            // ── Vortex ───────────────────────────────────────────────────────
            case 'vortex': {
                const vortexCount = 6000;
                const vortexPos = new Float32Array(vortexCount * 3);
                // Store initial angle & radius so animation is stable (no float drift)
                const angles = new Float32Array(vortexCount);
                const radii = new Float32Array(vortexCount);
                const heights = new Float32Array(vortexCount);
                for (let i = 0; i < vortexCount; i++) {
                    angles[i] = Math.random() * Math.PI * 2;
                    radii[i] = 1 + Math.random() * 8;
                    heights[i] = (Math.random() - 0.5) * 20;
                    vortexPos[i * 3] = Math.cos(angles[i]) * radii[i];
                    vortexPos[i * 3 + 1] = heights[i];
                    vortexPos[i * 3 + 2] = Math.sin(angles[i]) * radii[i];
                }
                const vortexGeo = new THREE.BufferGeometry();
                vortexGeo.setAttribute('position', new THREE.BufferAttribute(vortexPos, 3));
                const vortexMat = new THREE.PointsMaterial({ size: 0.04, color: _color, transparent: true, opacity: 0.6 });
                const vortex = new THREE.Points(vortexGeo, vortexMat);
                vortex.userData = { angles, radii, heights };
                scene.add(vortex);
                currentObjects.push(vortex);
                camera.position.set(10, 5, 10);
                camera.lookAt(0, 0, 0);
                break;
            }

            // ── Crystals ─────────────────────────────────────────────────────
            case 'crystals': {
                const crystalGroup = new THREE.Group();
                // Pre-create one of each geometry type
                const geos = [
                    new THREE.IcosahedronGeometry(0.5, 0),
                    new THREE.OctahedronGeometry(0.5, 0),
                    new THREE.TetrahedronGeometry(0.5, 0),
                ];

                for (let i = 0; i < 15; i++) {
                    const geoIndex = i % 3;
                    const scale = Math.random() * 0.6 + 0.4;
                    const geo = geos[geoIndex];

                    const mat = new THREE.MeshBasicMaterial({ color: _color, transparent: true, opacity: 0.4 });
                    const wire = new THREE.MeshBasicMaterial({ color: _color, wireframe: true, transparent: true, opacity: 0.8 });
                    const crystal = new THREE.Mesh(geo, mat);
                    crystal.add(new THREE.Mesh(geo, wire));   // wireframe overlay (shared geo)
                    crystal.scale.setScalar(scale);
                    crystal.position.set(
                        (Math.random() - 0.5) * 12,
                        (Math.random() - 0.5) * 12,
                        (Math.random() - 0.5) * 12,
                    );
                    crystal.userData.rotSpeed = {
                        x: (Math.random() - 0.5) * 0.02,
                        y: (Math.random() - 0.5) * 0.02,
                        z: (Math.random() - 0.5) * 0.02,
                    };
                    crystalGroup.add(crystal);
                }
                scene.add(crystalGroup);
                currentObjects.push(crystalGroup);
                camera.position.set(0, 0, 10);
                camera.lookAt(0, 0, 0);
                break;
            }

            // ── Stars (default) ──────────────────────────────────────────────
            case 'stars':
            default: {
                const starsCount = 2000;
                const starPos = new Float32Array(starsCount * 3);
                for (let i = 0; i < starsCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 20;
                const starsGeo = new THREE.BufferGeometry();
                starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
                const starsMat = new THREE.PointsMaterial({ color: _color, size: 0.02 });
                const stars = new THREE.Points(starsGeo, starsMat);
                scene.add(stars);
                currentObjects.push(stars);
                break;
            }
        }
    } else if (camera) {
        // Same scene type – just update aspect ratio if canvas was resized
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
};

// ─── Reusable vectors (avoid per-frame allocations) ──────────────────────────
const _camTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

// ─── Camera helpers ───────────────────────────────────────────────────────────

/**
 * Restore each scene's intended static camera position when auto-movement is off.
 * Scenes that manage their own camera (tunnel, warp, etc.) are left untouched.
 */
function applyDefaultCamera(camera: THREE.PerspectiveCamera, sceneType: string): void {
    switch (sceneType) {
        case 'galaxy': camera.position.set(0, 6, 8); camera.lookAt(0, 0, 0); break;
        case 'dna': camera.position.set(4, 0, 4); camera.lookAt(0, 0, 0); break;
        case 'aurora': camera.position.set(0, 0, 8); camera.lookAt(0, 2, -5); break;
        case 'rings': camera.position.set(3, 3, 6); camera.lookAt(0, 0, 0); break;
        case 'tunnel': camera.position.set(0, 0, 5); camera.lookAt(0, 0, -20); break;
        case 'warp': camera.position.set(0, 0, 5); camera.lookAt(0, 0, -50); break;
        case 'vortex': camera.position.set(10, 5, 10); camera.lookAt(0, 0, 0); break;
        case 'cybergrid': camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0); break;
        case 'nebula': camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0); break;
        default: camera.position.set(0, 0, 5); camera.lookAt(0, 0, 0); break;
    }
}

/**
 * Apply a unique cinematic camera path for each scene type.
 * The camera is smoothly lerped toward a computed target each frame so
 * there are never any sudden jumps when toggling auto-movement.
 *
 * @param t  Scaled time (time × speed) in seconds.
 */
function applyCinematicCamera(camera: THREE.PerspectiveCamera, sceneType: string, t: number): void {
    // Lerp factor: higher = snappier, lower = silkier.
    // We use 0.04 (~2.4% per frame at 60 fps) for very buttery motion.
    const LERP = 0.04;

    switch (sceneType) {

        // ── Stars: slow 3-D Lissajous orbit ──────────────────────────────────
        case 'stars':
        default: {
            // Frequencies are irrational-ish ratios to avoid perfectly repeating loops
            _camTarget.set(
                Math.sin(t * 0.13) * 4,
                Math.cos(t * 0.09) * 2.5,
                5 + Math.sin(t * 0.07) * 1.5,
            );
            _lookTarget.set(
                Math.sin(t * 0.05) * 0.5,
                Math.cos(t * 0.04) * 0.3,
                0,
            );
            camera.position.lerp(_camTarget, LERP);
            camera.lookAt(_lookTarget);
            break;
        }

        // ── Cubes: dramatic push-in / pull-out dolly with tilt ───────────────
        case 'cubes': {
            const dollyZ = 4 + Math.sin(t * 0.18) * 2.5; // breathes between 1.5 – 6.5
            const tiltX = Math.sin(t * 0.11) * 1.5;
            const tiltY = Math.cos(t * 0.09) * 1.5;
            _camTarget.set(tiltX, tiltY, dollyZ);
            _lookTarget.set(
                Math.sin(t * 0.06) * 0.8,
                Math.cos(t * 0.05) * 0.8,
                0,
            );
            camera.position.lerp(_camTarget, LERP);
            camera.lookAt(_lookTarget);
            break;
        }

        // ── Waves: low crane sweep – camera skims just above the surface ──────
        case 'waves': {
            const craneX = Math.sin(t * 0.12) * 7;
            const craneZ = 3 + Math.cos(t * 0.08) * 2;
            _camTarget.set(craneX, 2.5 + Math.sin(t * 0.15) * 1, craneZ);
            _lookTarget.set(Math.sin(t * 0.07) * 3, -0.5, Math.cos(t * 0.06) * 3);
            camera.position.lerp(_camTarget, LERP * 0.8);
            camera.lookAt(_lookTarget);
            break;
        }

        // ── Particles: gentle rolling orbit ──────────────────────────────────
        case 'particles': {
            _camTarget.set(
                Math.sin(t * 0.14) * 3,
                Math.sin(t * 0.10) * 2,
                5 + Math.cos(t * 0.11) * 1,
            );
            camera.position.lerp(_camTarget, LERP);
            camera.lookAt(0, 0, 0);
            break;
        }

        // ── Galaxy: slow top-down spiral reveal ──────────────────────────────
        // Starts overhead, spirals down to the equatorial plane, then back up
        case 'galaxy': {
            const r = 9 + Math.sin(t * 0.07) * 2;          // radius 7–11
            const phi = t * 0.08;                              // azimuth
            const elev = Math.PI * 0.15 + Math.sin(t * 0.05) * Math.PI * 0.15; // elevation 0–33°
            _camTarget.set(
                Math.cos(phi) * r * Math.cos(elev),
                r * Math.sin(elev) + 2,
                Math.sin(phi) * r * Math.cos(elev),
            );
            _lookTarget.set(Math.sin(t * 0.04) * 0.5, 0, Math.cos(t * 0.03) * 0.5);
            camera.position.lerp(_camTarget, LERP * 0.6);
            camera.lookAt(_lookTarget);
            break;
        }

        // ── DNA: rotating ring orbit at varying heights ───────────────────────
        case 'dna': {
            const orbitR = 5 + Math.sin(t * 0.12) * 1.5;
            const height = Math.sin(t * 0.09) * 3;
            _camTarget.set(
                Math.cos(t * 0.2) * orbitR,
                height,
                Math.sin(t * 0.2) * orbitR,
            );
            camera.position.lerp(_camTarget, LERP);
            camera.lookAt(0, height * 0.3, 0);
            break;
        }

        // ── Aurora: slow horizontal pan along the ribbon wall + gentle zoom ───
        case 'aurora': {
            const panX = Math.sin(t * 0.08) * 5;
            const riseY = Math.sin(t * 0.06) * 1.2;
            const pullZ = 8 + Math.sin(t * 0.12) * 2;
            _camTarget.set(panX, riseY, pullZ);
            _lookTarget.set(panX * 0.2, 2 + riseY * 0.5, -5);
            camera.position.lerp(_camTarget, LERP * 0.7);
            camera.lookAt(_lookTarget);
            break;
        }

        // ── Matrix: descending elevator with slight sway ──────────────────────
        case 'matrix': {
            const swayX = Math.sin(t * 0.11) * 1.5;
            const descY = 4 - (t * 0.5 % 10); // descends from +4 → -6, then snaps back
            _camTarget.set(swayX, descY, 8 + Math.sin(t * 0.07) * 1);
            _lookTarget.set(swayX * 0.3, descY - 3, 0);
            camera.position.lerp(_camTarget, LERP);
            camera.lookAt(_lookTarget);
            break;
        }

        // ── Nebula: slow inward spiral then back out ──────────────────────────
        case 'nebula': {
            const nR = 8 + Math.sin(t * 0.06) * 4;
            const nElev = Math.sin(t * 0.05) * 3;
            _camTarget.set(
                Math.cos(t * 0.09) * nR,
                nElev,
                Math.sin(t * 0.09) * nR,
            );
            _lookTarget.set(
                Math.cos(t * 0.04) * 0.5,
                nElev * 0.1,
                Math.sin(t * 0.03) * 0.5,
            );
            camera.position.lerp(_camTarget, LERP * 0.5);
            camera.lookAt(_lookTarget);
            break;
        }

        // ── Rings: elliptical inclined orbit ─────────────────────────────────
        case 'rings': {
            const phase = t * 0.15;
            _camTarget.set(
                Math.cos(phase) * 8,
                3 + Math.sin(t * 0.09) * 3,   // height oscillates
                Math.sin(phase) * 8,
            );
            camera.position.lerp(_camTarget, LERP);
            camera.lookAt(0, 0, 0);
            break;
        }

        // ── Tunnel: cockpit sway – slight yaw + pitch shake ───────────────────
        case 'tunnel': {
            _camTarget.set(
                Math.sin(t * 0.17) * 0.4,
                Math.cos(t * 0.13) * 0.3,
                5,
            );
            _lookTarget.set(
                Math.sin(t * 0.11) * 0.5,
                Math.cos(t * 0.09) * 0.3,
                -20,
            );
            camera.position.lerp(_camTarget, LERP * 2);
            camera.lookAt(_lookTarget);
            break;
        }

        // ── Warp: pitch-and-yaw micro-wobble ─────────────────────────────────
        case 'warp': {
            _camTarget.set(
                Math.sin(t * 0.19) * 0.8,
                Math.cos(t * 0.14) * 0.6,
                5,
            );
            _lookTarget.set(
                Math.sin(t * 0.08) * 1.5,
                Math.cos(t * 0.07) * 1,
                -50,
            );
            camera.position.lerp(_camTarget, LERP * 1.5);
            camera.lookAt(_lookTarget);
            break;
        }

        // ── CyberGrid: low-altitude forward rush with banking turns ───────────
        case 'cybergrid': {
            const bankX = Math.sin(t * 0.10) * 3;
            const pullZ = 10 + Math.sin(t * 0.14) * 3;
            _camTarget.set(bankX, -1 + Math.sin(t * 0.08) * 0.8, pullZ);
            _lookTarget.set(bankX * 0.5, -1.5, 0);
            camera.position.lerp(_camTarget, LERP);
            camera.lookAt(_lookTarget);
            break;
        }

        // ── Vortex: spiraling descent into the eye of the storm ──────────────
        case 'vortex': {
            const vR = 10 + Math.sin(t * 0.07) * 3;
            const vY = 5 + Math.sin(t * 0.05) * 4;
            _camTarget.set(
                Math.cos(t * 0.12) * vR,
                vY,
                Math.sin(t * 0.12) * vR,
            );
            // Look toward the vortex axis
            _lookTarget.set(0, vY * 0.2, 0);
            camera.position.lerp(_camTarget, LERP * 0.8);
            camera.lookAt(_lookTarget);
            break;
        }

        // ── Crystals: barrel-roll orbit ───────────────────────────────────────
        case 'crystals': {
            const cR = 10 + Math.sin(t * 0.11) * 2;
            const cUp = Math.sin(t * 0.08) * 4;
            _camTarget.set(
                Math.cos(t * 0.13) * cR,
                cUp,
                Math.sin(t * 0.13) * cR,
            );
            _lookTarget.set(
                Math.cos(t * 0.05) * 1.5,
                cUp * 0.2,
                Math.sin(t * 0.05) * 1.5,
            );
            camera.position.lerp(_camTarget, LERP);
            camera.lookAt(_lookTarget);
            break;
        }
    }
}

// ─── Per-frame render ─────────────────────────────────────────────────────────

export const renderThreeFrame = (
    time: number,
    width: number,
    height: number,
    config: RenderConfig,
): HTMLCanvasElement | null => {
    initThreeScene(width, height, config);
    if (!renderer || !scene || !camera) return null;


    const speed = config.threejsSpeed ?? 1;
    const t = time * speed;
    const sceneType = config.threejsScene ?? 'stars';

    // ── Update accent color on scene objects ──────────────────────────────────
    // Only traverse objects that are NOT tagged keepColor.
    // We reuse the module-level _color to avoid per-frame allocations.
    _color.set(config.threejsColor ?? '#a855f7');

    currentObjects.forEach(obj => {
        if (obj.userData.keepColor) return;
        obj.traverse((child) => {
            if (child.userData.keepColor) return;
            const mesh = child as THREE.Mesh | THREE.Points | THREE.Line;
            if (!mesh.material) return;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m: THREE.Material) => {
                if ((m as THREE.MeshBasicMaterial).color) {
                    (m as THREE.MeshBasicMaterial).color.copy(_color);
                }
            });
        });
    });

    // ── Scene-specific animation ──────────────────────────────────────────────
    switch (sceneType) {

        case 'cubes':
            currentObjects.forEach((cube, i) => {
                cube.rotation.x = t * 0.5 + i;
                cube.rotation.y = t * 0.5 + i;
            });
            break;

        case 'waves': {
            const plane = currentObjects[0] as THREE.Mesh;
            const posAttr = plane.geometry.attributes.position as THREE.BufferAttribute;
            const arr = posAttr.array as Float32Array;
            const origPos = plane.geometry.userData.origPos as Float32Array;
            // PlaneGeometry vertex layout: x, y, z packed in flat array
            const count = posAttr.count;
            for (let i = 0; i < count; i++) {
                const ox = origPos[i * 3];
                const oy = origPos[i * 3 + 1];
                arr[i * 3 + 2] = Math.sin(ox * 2 + t * 2) * 0.5 + Math.cos(oy * 2 + t * 2) * 0.5;
            }
            posAttr.needsUpdate = true;
            break;
        }

        case 'particles': {
            const points = currentObjects[0] as THREE.Points;
            points.rotation.y = t * 0.2;
            points.rotation.x = t * 0.1;
            break;
        }

        case 'galaxy': {
            currentObjects[0].rotation.y = t * 0.08;
            if (currentObjects[1]) currentObjects[1].rotation.y = t * 0.12;
            break;
        }

        case 'dna': {
            const helixGroup = currentObjects[0];
            helixGroup.rotation.y = t * 0.3;
            helixGroup.position.y = Math.sin(t * 0.5) * 0.3;
            break;
        }

        case 'aurora': {
            const auroraGroup = currentObjects[0];
            auroraGroup.children.forEach((child, idx) => {
                if (!(child instanceof THREE.Mesh)) return;
                const posAttr = child.geometry.attributes.position as THREE.BufferAttribute;
                const arr = posAttr.array as Float32Array;
                // origY cached at init to prevent Y-drift. X never changes so read directly.
                const origY = child.geometry.userData.origY as Float32Array;
                const waveOff = idx * 0.7;
                const count = posAttr.count;
                for (let i = 0; i < count; i++) {
                    const x = arr[i * 3];   // X stays constant; safe to read
                    arr[i * 3 + 1] = origY[i] + Math.sin(x * 0.8 + t * 0.6 + waveOff) * 0.3;
                    arr[i * 3 + 2] = Math.sin(x * 0.5 + t * 0.8 + waveOff) * 1.5
                        + Math.cos(x * 0.3 + t * 0.4 + waveOff) * 0.8;
                }
                posAttr.needsUpdate = true;
                const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
                if (mat) {
                    mat.opacity = Math.max(0.05, 0.15 + idx * 0.05 + Math.sin(t * 0.3 + idx) * 0.05);
                }
            });
            if (currentObjects[1]) {
                currentObjects[1].rotation.z = t * 0.01;
            }
            break;
        }

        case 'matrix': {
            // InstancedMesh approach – update matrices in bulk
            const instanced = currentObjects[0] as THREE.InstancedMesh;
            const data = instanced.userData.instanceData as Array<{
                col: number; row: number; baseX: number; speed: number; phase: number;
            }>;
            const dummy = new THREE.Object3D();
            const total = data.length;
            for (let i = 0; i < total; i++) {
                const { baseX, speed: dotSpeed, phase, row } = data[i];
                const cycle = (t * dotSpeed + phase) % 10;
                const y = 5 - cycle;
                dummy.position.set(baseX, y, 0);
                dummy.updateMatrix();
                instanced.setMatrixAt(i, dummy.matrix);
                // Vary opacity via instance color (r = g = b = opacity value)
                const normY = (y + 5) / 10;
                const op = Math.max(0, normY * 0.7) * (1 - row / 20);
                instanced.setColorAt(i, _color.clone().multiplyScalar(op));
            }
            instanced.instanceMatrix.needsUpdate = true;
            if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
            break;
        }

        case 'nebula': {
            const nebulaGroup = currentObjects[0];
            nebulaGroup.children.forEach((child, idx) => {
                child.rotation.y = t * (0.03 + idx * 0.015);
                child.rotation.x = Math.sin(t * 0.1 + idx) * 0.1;
            });
            break;
        }

        case 'rings': {
            const ringsGroup = currentObjects[0];
            if (ringsGroup.children[0]) {
                ringsGroup.children[0].rotation.y = t * 0.3;
                ringsGroup.children[0].rotation.x = t * 0.1;
            }
            for (let i = 1; i < ringsGroup.children.length; i++) {
                ringsGroup.children[i].rotation.z = t * (0.1 + i * 0.05) * (i % 2 === 0 ? 1 : -1);
            }
            break;
        }

        case 'tunnel': {
            const tunnel = currentObjects[0];
            const tunnelSpeed = 5;
            const maxZ = tunnel.children.length * 1.5;
            tunnel.children.forEach((ring, i) => {
                const offset = (t * tunnelSpeed + i * 1.5) % maxZ;
                ring.position.z = 5 - offset;
                const opacity = Math.max(0, (1 - offset / (maxZ * 0.9)) * 0.8);
                ((ring as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = opacity;
            });
            break;
        }

        case 'warp': {
            const warpLines = currentObjects[0] as THREE.LineSegments;
            const posAttr = warpLines.geometry.attributes.position as THREE.BufferAttribute;
            const arr = posAttr.array as Float32Array;
            const { TAIL } = warpLines.userData as { TAIL: number };
            const count = posAttr.count / 2; // pairs
            const warpSpeed = 3 * speed;          // units/second; speed-scaled
            for (let i = 0; i < count; i++) {
                let z = arr[i * 6 + 2] + warpSpeed * 0.016; // ~60 fps delta
                if (z > 5) z -= 100;
                arr[i * 6 + 2] = z;
                arr[i * 6 + 5] = z + TAIL;
            }
            posAttr.needsUpdate = true;
            break;
        }

        case 'cybergrid': {
            // True infinite scroll: two tiles leapfrog each other
            const gridGroup = currentObjects[0];
            const scrollZ = (t * 5) % 100; // scroll 5 units/sec, wraps at 100
            gridGroup.children.forEach((grid) => {
                const tile = grid.userData.tileIndex as number;
                grid.position.z = -tile * 100 + scrollZ;
            });
            break;
        }

        case 'vortex': {
            const vortex = currentObjects[0] as THREE.Points;
            const posAttr = vortex.geometry.attributes.position as THREE.BufferAttribute;
            const arr = posAttr.array as Float32Array;
            const { angles, radii, heights } = vortex.userData as {
                angles: Float32Array; radii: Float32Array; heights: Float32Array;
            };
            const spin = (10 / 5) * 0.01 * speed; // angular velocity per frame (~60fps)
            const rise = 0.05 * speed;
            const count = posAttr.count;
            for (let i = 0; i < count; i++) {
                angles[i] += spin / (radii[i]); // inner particles spin faster
                heights[i] += rise;
                if (heights[i] > 10) heights[i] -= 20;
                arr[i * 3] = Math.cos(angles[i]) * radii[i];
                arr[i * 3 + 1] = heights[i];
                arr[i * 3 + 2] = Math.sin(angles[i]) * radii[i];
            }
            posAttr.needsUpdate = true;
            break;
        }

        case 'crystals': {
            const group = currentObjects[0];
            group.children.forEach((crystal) => {
                const { rotSpeed } = crystal.userData as {
                    rotSpeed: { x: number; y: number; z: number };
                };
                crystal.rotation.x += rotSpeed.x * speed;
                crystal.rotation.y += rotSpeed.y * speed;
                crystal.rotation.z += rotSpeed.z * speed;
                // Float: sine based on crystal's own starting x-position (stable)
                crystal.position.y += Math.sin(t + crystal.position.x) * 0.005;
            });
            break;
        }

        case 'stars':
        default: {
            const stars = currentObjects[0] as THREE.Points;
            if (stars) {
                stars.rotation.x = t * 0.05;
                stars.rotation.y = t * 0.05;
                stars.rotation.z = t * 0.01;
            }
            break;
        }
    }

    // ── Background clear colour ───────────────────────────────────────────────
    if (config.threejsBgColor) {
        renderer.setClearColor(new THREE.Color(config.threejsBgColor), 1);
    } else {
        renderer.setClearColor(0x000000, 0);
    }

    // ── Camera movement ───────────────────────────────────────────────────────
    if (config.threejsCameraMovement) {
        applyCinematicCamera(camera, sceneType, t);
    } else {
        applyDefaultCamera(camera, sceneType);
    }

    renderer.render(scene, camera);
    return renderer.domElement;
};

// ─── Public cleanup ───────────────────────────────────────────────────────────

/**
 * Call this when the Three.js background is no longer needed (e.g. user
 * switches away from threejs source) to free GPU memory and the WebGL context.
 */
export const disposeThreeScene = (): void => {
    disposeCurrentObjects();
    if (renderer) {
        renderer.dispose();
        renderer = null;
    }
    scene = null;
    camera = null;
    prevSceneType = undefined;
};
