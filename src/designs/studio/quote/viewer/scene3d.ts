/**
 * The three.js side of CarViewer3D. Imported on demand by CarViewer3D.mount().
 *
 * Phone-first choices:
 *  - renders on demand only (after input, a tween, or a state change), never
 *    in a free-running loop; paused while offscreen or the tab is hidden;
 *  - device pixel ratio capped at 2 (1.5 on devices reporting ≤ 4 GB);
 *  - one small PMREM environment, no shadow maps (a baked contact shadow);
 *  - `touch-action: pan-y` so vertical swipes still scroll the page; only
 *    horizontal drags orbit the car; taps (short, still) toggle panels.
 */
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  Box3,
  BoxGeometry,
  type BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { bodyTypes, panels, type BodyType, type CarViewerHandle, type CarViewerOptions, type GlassId, type PanelId, type ViewerMode } from '../panels';

const BRASS = '#c9a45c';
const DEFAULT_PAINT = '#7d8288';
const FACTORY_VLT = 70;
const PANEL_IDS = new Set<string>(panels.map((p) => p.id));
const GLASS_IDS = new Set<string>(['windscreen', 'side-glass-l', 'side-glass-r', 'rear-glass']);
const panelLabel = new Map(panels.map((p) => [p.id, p.label]));

interface Env {
  allowSoftwareGL: boolean;
  first: Promise<ArrayBuffer>;
  fetchModel: (body: BodyType) => Promise<ArrayBuffer>;
}

interface Model {
  body: BodyType;
  root: Object3D;
  panels: Map<PanelId, Mesh>;
  glass: Map<GlassId, Mesh>;
  overlays: Map<PanelId, { mesh: Mesh; mat: ShaderMaterial; amount: number; target: number; flash: number }>;
  size: Vector3;
  centre: Vector3;
}

interface View {
  yaw: number;
  pitch: number;
  zoom: number;
}

const deg = Math.PI / 180;
/** Camera presets per mode. yaw 0 looks at the nose; negative yaw = the car's left (driver) side. */
const PRESETS: Record<ViewerMode, View> = {
  ppf: { yaw: -38 * deg, pitch: 13 * deg, zoom: 1 },
  look: { yaw: -32 * deg, pitch: 10 * deg, zoom: 1 },
  tint: { yaw: -90 * deg, pitch: 6 * deg, zoom: 1 },
  wrap: { yaw: -52 * deg, pitch: 38 * deg, zoom: 1.02 },
};
const PITCH_MIN = 2 * deg;
const PITCH_MAX = 62 * deg;
const ZOOM_MIN = 0.62;
const ZOOM_MAX = 1.5;

const TAP_MOVE = 8;
const TAP_TIME = 300;

export async function createViewer(el: HTMLElement, initial: CarViewerOptions, env: Env): Promise<CarViewerHandle> {
  const opts: CarViewerOptions = { ...initial };
  let destroyed = false;
  let selected = new Set<PanelId>(initial.selected);
  let partial = new Set<PanelId>(initial.partial ?? []);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const dprCap = memory !== undefined && memory <= 4 ? 1.5 : 2;

  // ── Renderer ────────────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.tabIndex = 0;
  Object.assign(canvas.style, {
    display: 'block',
    width: '100%',
    height: '100%',
    touchAction: 'pan-y',
    userSelect: 'none',
    webkitUserSelect: 'none',
    webkitTapHighlightColor: 'transparent',
    cursor: 'grab',
  } satisfies Partial<CSSStyleDeclaration> & Record<string, string>);

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: !env.allowSoftwareGL,
    });
  } catch (err) {
    throw new Error('3D viewer: WebGL2 context unavailable (' + (err as Error).message + ')');
  }
  if (!renderer.capabilities.isWebGL2) {
    renderer.dispose();
    throw new Error('3D viewer: WebGL2 required');
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(28, 1, 0.1, 80);

  const pmrem = new PMREMGenerator(renderer);
  const studio = makeStudioEnvironment();
  const envTex: Texture = pmrem.fromScene(studio.scene, 0.02).texture;
  studio.dispose();
  scene.environment = envTex;
  scene.environmentIntensity = 1;

  const hemi = new HemisphereLight(0xffffff, 0x202226, 0.5);
  const key = new DirectionalLight(0xffffff, 1.1);
  key.position.set(2, 8, 3);
  const rim = new DirectionalLight(new Color(BRASS), 0.8);
  rim.position.set(-6, 2.5, -4);
  scene.add(hemi, key, rim);

  // Contact shadow: a baked radial gradient on a plane under the car.
  const shadowTex = makeShadowTexture();
  const shadow = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  shadow.renderOrder = -1;
  scene.add(shadow);

  // ── Materials (shared across bodies) ────────────────────────────────
  const paint = new MeshPhysicalMaterial({
    color: new Color(opts.paint ?? DEFAULT_PAINT),
    metalness: 0.3,
    roughness: 0.38,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1,
  });
  const satin = new MeshPhysicalMaterial({ color: 0x121314, metalness: 0.2, roughness: 0.52, clearcoat: 0.15, clearcoatRoughness: 0.5 });
  const glassSide = new MeshPhysicalMaterial({
    color: 0x0c1014,
    metalness: 0,
    roughness: 0.04,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    envMapIntensity: 1.6,
    side: 2,
  });
  const glassFront = glassSide.clone();
  const black = new MeshStandardMaterial({ color: 0x0b0c0d, roughness: 0.7, metalness: 0.1 });
  const core = new MeshBasicMaterial({ color: 0x060607 });
  const interior = new MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.95 });
  const seats = new MeshStandardMaterial({ color: 0x3b3d42, roughness: 0.85 });
  const lamp = new MeshPhysicalMaterial({ color: 0xb9c0c8, metalness: 0.3, roughness: 0.15, clearcoat: 1, emissive: new Color(0xf2f5ff), emissiveIntensity: 0.28 });
  const lampSmoked = new MeshPhysicalMaterial({ color: 0x2a2d31, metalness: 0.7, roughness: 0.15, clearcoat: 1 });
  const tail = new MeshPhysicalMaterial({ color: 0x4a0a0e, roughness: 0.2, clearcoat: 1, emissive: new Color(0xb3121b), emissiveIntensity: 0.45 });
  const tyre = new MeshStandardMaterial({ color: 0x141517, roughness: 0.92 });
  const rimMat = new MeshPhysicalMaterial({ color: 0xa3a9b0, metalness: 0.75, roughness: 0.28, clearcoat: 0.6 });
  const sharedMaterials: Material[] = [paint, satin, glassSide, glassFront, black, core, interior, seats, lamp, lampSmoked, tail, tyre, rimMat];

  const staticMaterial: Record<string, Material> = {
    grille: black,
    underbody: black,
    'arch-liners': black,
    trim: black,
  cladding: black,
    'bed-liner': black,
    core,
    interior,
    'interior-floor': interior,
    seats,
    taillights: tail,
    tyre,
    rim: rimMat,
  };

  // ── Loading ─────────────────────────────────────────────────────────
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const cache = new Map<BodyType, Promise<Model>>();
  const load = (body: BodyType, data?: Promise<ArrayBuffer>): Promise<Model> => {
    let p = cache.get(body);
    if (!p) {
      p = (data ?? env.fetchModel(body))
        .then((buf) => loader.parseAsync(buf, ''))
        .then((gltf) => prepare(body, gltf.scene));
      p.catch(() => cache.delete(body));
      cache.set(body, p);
    }
    return p;
  };

  const prepare = (body: BodyType, root: Object3D): Model => {
    const model: Model = { body, root, panels: new Map(), glass: new Map(), overlays: new Map(), size: new Vector3(), centre: new Vector3() };
    root.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const part = String(mesh.userData.part ?? mesh.name);
      mesh.userData.part = part;
      if (PANEL_IDS.has(part)) {
        model.panels.set(part as PanelId, mesh);
        mesh.material = part === 'headlights' ? lamp : paint;
      } else if (GLASS_IDS.has(part)) {
        model.glass.set(part as GlassId, mesh);
        mesh.material = part === 'windscreen' ? glassFront : glassSide;
        mesh.renderOrder = 2;
      } else {
        mesh.material = staticMaterial[part] ?? black;
        if (part === 'core') mesh.renderOrder = -0.5;
      }
    });
    const box = new Box3().setFromObject(root);
    box.getSize(model.size);
    box.getCenter(model.centre);
    return model;
  };

  let model: Model;
  try {
    model = await load(initial.body, env.first);
  } catch (err) {
    disposeAll();
    throw new Error('3D viewer: model failed to load (' + (err as Error).message + ')');
  }
  scene.add(model.root);
  fitShadow();

  // ── Camera state & tweens ───────────────────────────────────────────
  const view: View = { ...PRESETS[opts.mode] };
  let fitDist = 8;
  const target = new Vector3();
  type Tween = { from: View; to: View; t0: number; dur: number };
  let camTween: Tween | null = null;
  let turntable = !reducedMotion;
  // The intro turntable's clock starts on the first frame actually shown, so a
  // viewer mounted in a background tab or below the fold still gets its intro.
  let turntableUntil = 0;

  /**
   * Distance at which the whole car fits the viewport for the current mode's
   * preset angle (closed form over the 8 bounding-box corners). User zoom and
   * orbit are relative to this, so turning the car never auto-zooms.
   */
  const computeFit = () => {
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    camera.aspect = w / h;
    const { size, centre } = model;
    target.set(centre.x, size.y * 0.42, centre.z);
    const v = PRESETS[opts.mode];
    const dir = new Vector3(Math.cos(v.pitch) * Math.cos(v.yaw), Math.sin(v.pitch), Math.cos(v.pitch) * Math.sin(v.yaw));
    const right = new Vector3().crossVectors(new Vector3(0, 1, 0), dir).normalize();
    const up = new Vector3().crossVectors(dir, right);
    const tv = Math.tan((camera.fov * deg) / 2) * 0.86;
    const th = tv * camera.aspect * (camera.aspect < 1 ? 0.94 : 0.9);
    let need = 0;
    const rel = new Vector3();
    for (let i = 0; i < 8; i++) {
      rel.set(centre.x + (i & 1 ? 0.5 : -0.5) * size.x, i & 2 ? size.y : 0, centre.z + (i & 4 ? 0.5 : -0.5) * size.z).sub(target);
      const along = rel.dot(dir);
      need = Math.max(need, Math.abs(rel.dot(right)) / th + along, Math.abs(rel.dot(up)) / tv + along);
    }
    fitDist = need;
    camera.near = Math.max(0.05, fitDist / 40);
    camera.far = fitDist * 6;
    camera.updateProjectionMatrix();
  };

  /** Recompute the fit but keep the camera where it is, so a following tween starts from here. */
  const refit = () => {
    const before = fitDist * view.zoom;
    computeFit();
    view.zoom = before / fitDist;
  };

  const applyView = () => {
    const d = fitDist * view.zoom;
    const cp = Math.cos(view.pitch);
    camera.position.set(target.x + d * cp * Math.cos(view.yaw), target.y + d * Math.sin(view.pitch), target.z + d * cp * Math.sin(view.yaw));
    camera.lookAt(target);
  };

  const tweenTo = (to: View, dur = 650) => {
    stopTurntable();
    if (reducedMotion) {
      Object.assign(view, to);
      camTween = null;
      invalidate();
      return;
    }
    // Take the short way round.
    const from = { ...view };
    let dy = to.yaw - from.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    camTween = { from, to: { ...to, yaw: from.yaw + dy }, t0: performance.now(), dur };
    invalidate();
  };

  function stopTurntable() {
    turntable = false;
  }

  // ── Visual state ────────────────────────────────────────────────────
  const overlayFor = (m: Model, id: PanelId) => {
    let o = m.overlays.get(id);
    if (!o) {
      const src = m.panels.get(id);
      if (!src) return undefined;
      const mat = makeFilmMaterial();
      const mesh = new Mesh(src.geometry, mat);
      mesh.renderOrder = 1;
      mesh.raycast = () => {};
      src.add(mesh);
      o = { mesh, mat, amount: 0, target: 0, flash: 0 };
      m.overlays.set(id, o);
    }
    return o;
  };

  const applyState = (animate: boolean) => {
    const mode = opts.mode;
    for (const [id, mesh] of model.panels) {
      const isSel = selected.has(id);
      const isPart = !isSel && partial.has(id);
      if (mode === 'wrap' && isSel) mesh.material = id === 'headlights' ? lampSmoked : satin;
      else mesh.material = id === 'headlights' ? lamp : paint;
      const film = mode === 'ppf' ? (isSel ? 1 : isPart ? 0.55 : 0) : 0;
      const o = film > 0 || model.overlays.has(id) ? overlayFor(model, id) : undefined;
      if (o) {
        o.target = film;
        o.mat.uniforms.striped.value = isPart ? 1 : 0;
        if (!animate || reducedMotion) o.amount = film;
      }
    }
    const vlt = mode === 'tint' ? clamp(opts.tintVlt ?? FACTORY_VLT, 0, 100) : FACTORY_VLT;
    setGlass(glassSide, vlt);
    setGlass(glassFront, mode === 'tint' ? Math.max(vlt, FACTORY_VLT) : FACTORY_VLT);
    updateLabel();
    invalidate();
  };

  const updateLabel = () => {
    const body = bodyTypes.find((b) => b.id === model.body)?.label.toLowerCase() ?? model.body;
    const names = (ids: Iterable<PanelId>) => [...ids].filter((id) => model.panels.has(id)).map((id) => panelLabel.get(id) ?? id);
    let text = `3D model of a ${body}.`;
    if (opts.mode === 'ppf') {
      const s = names(selected);
      const p = names([...partial].filter((id) => !selected.has(id)));
      text += s.length ? ` Paint protection film on: ${s.join(', ')}.` : ' No panels selected for paint protection film.';
      if (p.length) text += ` Partly covered: ${p.join(', ')}.`;
    } else if (opts.mode === 'wrap') {
      const s = names(selected);
      text += s.length ? ` Wrapped in satin black: ${s.join(', ')}.` : ' No panels selected for wrapping.';
    } else if (opts.mode === 'tint') {
      text += ` Side and rear windows shown at ${Math.round(opts.tintVlt ?? FACTORY_VLT)}% visible light transmission.`;
    }
    text += ' Drag sideways to turn the car; double-tap to reset the view.';
    canvas.setAttribute('aria-label', text);
  };

  // ── Render loop (on demand) ─────────────────────────────────────────
  let raf = 0;
  let inView = true;
  let lastFrame = performance.now();
  const active = () => inView && document.visibilityState === 'visible';

  function invalidate() {
    if (!raf && active() && !destroyed) raf = requestAnimationFrame(frame);
  }

  function frame(now: number) {
    raf = 0;
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    let more = false;

    if (camTween) {
      const t = clamp((now - camTween.t0) / camTween.dur, 0, 1);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      view.yaw = lerp(camTween.from.yaw, camTween.to.yaw, e);
      view.pitch = lerp(camTween.from.pitch, camTween.to.pitch, e);
      view.zoom = lerp(camTween.from.zoom, camTween.to.zoom, e);
      if (t >= 1) camTween = null;
      else more = true;
    } else if (turntable) {
      if (!turntableUntil) turntableUntil = now + 12000;
      if (now > turntableUntil) turntable = false;
      else {
        view.yaw -= dt * 0.16;
        more = true;
      }
    }

    for (const o of model.overlays.values()) {
      if (o.amount !== o.target) {
        const step = dt * 5;
        o.amount = Math.abs(o.target - o.amount) <= step ? o.target : o.amount + Math.sign(o.target - o.amount) * step;
        more = true;
      }
      if (o.flash > 0) {
        o.flash = Math.max(0, o.flash - dt * 4.5);
        more = true;
      }
      o.mat.uniforms.amount.value = o.amount;
      o.mat.uniforms.flash.value = o.flash;
      o.mesh.visible = o.amount > 0.001 || o.flash > 0.001;
    }

    applyView();
    renderer.render(scene, camera);
    if (more) invalidate();
  }

  // ── Sizing & visibility ─────────────────────────────────────────────
  const resize = () => {
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    computeFit();
    invalidate();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  const io = new IntersectionObserver((entries) => {
    inView = entries.some((e) => e.isIntersecting);
    if (inView) invalidate();
    else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  });
  io.observe(el);
  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      lastFrame = performance.now();
      invalidate();
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  // ── Input ───────────────────────────────────────────────────────────
  const pointers = new Map<number, { x: number; y: number }>();
  let gesture: { id: number; x0: number; y0: number; t0: number; moved: number; dragging: boolean; yaw0: number; pitch0: number; type: string } | null = null;
  let pinch: { d0: number; zoom0: number } | null = null;
  let lastTap = { t: 0, x: 0, y: 0 };
  const raycaster = new Raycaster();
  const ndc = new Vector2();

  const pick = (clientX: number, clientY: number): { id: string; mesh: Mesh } | null => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(model.root, true);
    for (const h of hits) {
      const part = String(h.object.userData.part ?? '');
      if (part === 'core' || part === 'interior' || part === 'interior-floor' || part === 'seats') continue;
      // Glass lets the tap through to what is behind it only in paint modes.
      if (GLASS_IDS.has(part) && opts.mode !== 'tint') continue;
      return { id: part, mesh: h.object as Mesh };
    }
    return null;
  };

  const selectable = (id: string): id is PanelId => (opts.mode === 'ppf' || opts.mode === 'wrap') && PANEL_IDS.has(id) && model.panels.has(id as PanelId);

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stopTurntable();
    camTween = null;
    if (pointers.size === 1) {
      gesture = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: 0, dragging: false, yaw0: view.yaw, pitch0: view.pitch, type: e.pointerType };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom0: view.zoom };
      if (gesture) gesture.dragging = true; // a pinch is never a tap
      try {
        for (const id of pointers.keys()) canvas.setPointerCapture(id);
      } catch {}
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId);
    if (!p) {
      if (e.pointerType === 'mouse') hover(e);
      return;
    }
    p.x = e.clientX;
    p.y = e.clientY;
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      view.zoom = clamp(pinch.zoom0 * (pinch.d0 / d), ZOOM_MIN, ZOOM_MAX);
      invalidate();
      return;
    }
    if (!gesture || gesture.id !== e.pointerId) return;
    const dx = e.clientX - gesture.x0;
    const dy = e.clientY - gesture.y0;
    gesture.moved = Math.max(gesture.moved, Math.hypot(dx, dy));
    if (!gesture.dragging) {
      // Touch: only a mostly-horizontal move starts an orbit; vertical is page scroll.
      const horizontal = Math.abs(dx) > TAP_MOVE && Math.abs(dx) > Math.abs(dy) * 1.2;
      const mouseDrag = gesture.type === 'mouse' && gesture.moved > TAP_MOVE;
      if (horizontal || mouseDrag) {
        gesture.dragging = true;
        canvas.style.cursor = 'grabbing';
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {}
      } else return;
    }
    const w = Math.max(el.clientWidth, 280);
    view.yaw = gesture.yaw0 + (dx / w) * Math.PI * 1.25;
    view.pitch = clamp(gesture.pitch0 + (dy / w) * Math.PI * 0.6, PITCH_MIN, PITCH_MAX);
    invalidate();
  };

  const onPointerUp = (e: PointerEvent) => {
    const had = pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!had || !gesture || gesture.id !== e.pointerId) {
      if (pointers.size === 0) gesture = null;
      return;
    }
    const g = gesture;
    gesture = null;
    canvas.style.cursor = 'grab';
    if (e.type === 'pointercancel' || g.dragging) return;
    const dt = performance.now() - g.t0;
    if (g.moved >= TAP_MOVE || dt >= TAP_TIME) return;
    onTap(e.clientX, e.clientY);
  };

  const onTap = (x: number, y: number) => {
    const now = performance.now();
    const isDouble = now - lastTap.t < 320 && Math.hypot(x - lastTap.x, y - lastTap.y) < 30;
    lastTap = isDouble ? { t: 0, x: 0, y: 0 } : { t: now, x, y };
    const hit = pick(x, y);
    if (hit && selectable(hit.id)) toggle(hit.id);
    if (isDouble) tweenTo(PRESETS[opts.mode]);
  };

  const toggle = (id: PanelId) => {
    // Optimistic: reflect the tap straight away; the flow's update() is the source of truth.
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    applyState(true);
    const o = overlayFor(model, id);
    if (o) o.flash = 1;
    invalidate();
    opts.onToggle?.(id);
  };

  let hoverRaf = 0;
  const hover = (e: PointerEvent) => {
    if (hoverRaf) return;
    hoverRaf = requestAnimationFrame(() => {
      hoverRaf = 0;
      const hit = pick(e.clientX, e.clientY);
      canvas.style.cursor = hit && selectable(hit.id) ? 'pointer' : 'grab';
    });
  };

  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 45 * deg : 15 * deg;
    let handled = true;
    switch (e.key) {
      case 'ArrowLeft':
        tweenTo({ ...view, yaw: view.yaw + step }, 260);
        break;
      case 'ArrowRight':
        tweenTo({ ...view, yaw: view.yaw - step }, 260);
        break;
      case 'ArrowUp':
        tweenTo({ ...view, pitch: clamp(view.pitch + 8 * deg, PITCH_MIN, PITCH_MAX) }, 220);
        break;
      case 'ArrowDown':
        tweenTo({ ...view, pitch: clamp(view.pitch - 8 * deg, PITCH_MIN, PITCH_MAX) }, 220);
        break;
      case '+':
      case '=':
        tweenTo({ ...view, zoom: clamp(view.zoom * 0.88, ZOOM_MIN, ZOOM_MAX) }, 200);
        break;
      case '-':
      case '_':
        tweenTo({ ...view, zoom: clamp(view.zoom / 0.88, ZOOM_MIN, ZOOM_MAX) }, 200);
        break;
      case 'Home':
      case '0':
        tweenTo(PRESETS[opts.mode]);
        break;
      default:
        handled = false;
    }
    if (handled) e.preventDefault();
  };

  // Trackpad pinch arrives as ctrl+wheel; plain wheel is left to scroll the page.
  const onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    stopTurntable();
    view.zoom = clamp(view.zoom * Math.exp(e.deltaY * 0.01), ZOOM_MIN, ZOOM_MAX);
    invalidate();
  };
  const onDblClick = (e: MouseEvent) => e.preventDefault();

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('keydown', onKey);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('dblclick', onDblClick);
  canvas.addEventListener('contextmenu', onDblClick);

  el.appendChild(canvas);
  computeFit();
  resize();
  applyState(false);

  // ── Body switching ──────────────────────────────────────────────────
  let bodyRequest = 0;
  const switchBody = async (body: BodyType) => {
    const req = ++bodyRequest;
    let next: Model;
    try {
      next = await load(body);
    } catch (err) {
      console.warn('[CarViewer3D] could not load', body, err);
      return;
    }
    if (destroyed || req !== bodyRequest || next === model) return;
    scene.remove(model.root);
    model = next;
    scene.add(model.root);
    fitShadow();
    // Ease the framing from the old car's distance to the new one's.
    refit();
    if (reducedMotion) view.zoom = PRESETS[opts.mode].zoom;
    else tweenTo({ ...(camTween ? camTween.to : view), zoom: PRESETS[opts.mode].zoom }, camTween ? 650 : 450);
    applyState(false);
  };

  function fitShadow() {
    shadow.scale.set(model.size.x * 1.35, model.size.z * 1.6, 1);
    shadow.position.x = model.centre.x;
    shadow.position.z = model.centre.z;
  }

  // ── Handle ──────────────────────────────────────────────────────────
  function disposeAll() {
    for (const p of cache.values()) {
      p.then((m) => {
        m.root.traverse((o) => {
          const mesh = o as Mesh;
          if (mesh.isMesh) mesh.geometry.dispose();
        });
        for (const o of m.overlays.values()) o.mat.dispose();
      }).catch(() => {});
    }
    for (const m of sharedMaterials) m.dispose();
    shadow.geometry.dispose();
    (shadow.material as Material).dispose();
    shadowTex.dispose();
    envTex.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return {
    update(next: Partial<CarViewerOptions>) {
      if (destroyed) return;
      const modeChanged = next.mode !== undefined && next.mode !== opts.mode;
      Object.assign(opts, next);
      if (next.selected) selected = new Set(next.selected);
      if (next.partial) partial = new Set(next.partial);
      else if (modeChanged && next.selected) partial = new Set();
      if (next.paint !== undefined) paint.color.set(next.paint || DEFAULT_PAINT);
      if (next.body && next.body !== model.body) void switchBody(next.body);
      if (modeChanged) {
        refit();
        tweenTo(PRESETS[opts.mode]);
      }
      applyState(!modeChanged);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      if (hoverRaf) cancelAnimationFrame(hoverRaf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('keydown', onKey);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('dblclick', onDblClick);
      canvas.removeEventListener('contextmenu', onDblClick);
      disposeAll();
      canvas.remove();
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────

function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Map visible light transmission to how dark the glass reads. */
function setGlass(mat: MeshPhysicalMaterial, vlt: number) {
  const dark = 1 - vlt / 100;
  mat.opacity = 0.12 + 0.8 * Math.pow(dark, 1.1);
  mat.color.setRGB(0.05 + 0.06 * (1 - dark), 0.06 + 0.07 * (1 - dark), 0.075 + 0.08 * (1 - dark));
}

/**
 * The PPF "film": additive brass sheen, strongest at grazing angles (like a
 * film edge catching light) plus a faint face tint, so the paint colour still
 * reads through. Partial coverage is striped. `flash` is the tap feedback.
 */
function makeFilmMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      color: { value: new Color(BRASS) },
      amount: { value: 0 },
      flash: { value: 0 },
      striped: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float amount;
      uniform float flash;
      uniform float striped;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float ndv = abs(dot(normalize(vN), normalize(vV)));
        float rim = pow(1.0 - ndv, 3.0);
        float face = 0.09 + 0.5 * rim;
        float stripe = mix(1.0, step(0.5, fract((gl_FragCoord.x + gl_FragCoord.y) / 9.0)), striped);
        float a = amount * face * stripe + flash * 0.45;
        gl_FragColor = vec4(color * a, 1.0);
      }
    `,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
    toneMapped: false,
  });
}

/**
 * A dark photo studio as the reflection environment: charcoal walls, a large
 * overhead softbox, two tall strip lights and a low brass kicker. Paint and
 * glass pick up long clean highlight lines instead of a bright room.
 */
function makeStudioEnvironment() {
  const scene = new Scene();
  const geos: BufferGeometry[] = [];
  const mats: Material[] = [];
  const box = new BoxGeometry(30, 14, 30);
  geos.push(box);
  const wallMat = new MeshBasicMaterial({ color: 0x1a1b1e, side: 1 });
  mats.push(wallMat);
  const room = new Mesh(box, wallMat);
  room.position.y = 5;
  scene.add(room);
  const panel = (w: number, h: number, color: number, intensity: number) => {
    const g = new PlaneGeometry(w, h);
    const m = new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity), side: 2 });
    geos.push(g);
    mats.push(m);
    const mesh = new Mesh(g, m);
    scene.add(mesh);
    return mesh;
  };
  const top = panel(9, 5, 0xffffff, 5);
  top.position.set(0, 11.5, 0);
  top.rotation.x = Math.PI / 2;
  const left = panel(1.2, 7, 0xffffff, 4);
  left.position.set(1, 4.5, -13);
  const right = panel(1.2, 7, 0xffffff, 3);
  right.position.set(-2, 4.5, 13);
  right.rotation.y = Math.PI;
  const front = panel(8, 1.2, 0xf2f4f8, 2.2);
  front.position.set(13, 6, 0);
  front.rotation.y = -Math.PI / 2;
  const kick = panel(10, 0.8, 0xc9a45c, 2.5);
  kick.position.set(-13, 1.6, 0);
  kick.rotation.y = Math.PI / 2;
  const floor = panel(30, 30, 0x0c0d0f, 1);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.9;
  return {
    scene,
    dispose() {
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}

function makeShadowTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,0.62)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.38)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
