/**
 * three.js viewer for the build-time Manifold car models (public/models/cars/*.glb).
 *
 * This module is deliberately tiny: it only feature-checks and starts the
 * model download. three.js, the GLB loader and the scene live in ./scene3d.ts,
 * which mount() imports on demand in parallel with fetching the model, so
 * nothing heavy is downloaded until the 3D view is actually shown.
 *
 * Callers import this module dynamically and fall back to CarViewer2D when
 * isSupported() is false or mount() rejects (no WebGL2, Save-Data, software
 * GL, or the model failed to load).
 */
import type { BodyType, CarViewerHandle, CarViewerOptions } from '../panels';

/** Bump when the GLBs are rebuilt so returning visitors get the new models. */
export const MODEL_VERSION = '1';

export function modelUrl(body: BodyType): string {
  return `/models/cars/${body}.glb?v=${MODEL_VERSION}`;
}

export async function fetchModel(body: BodyType): Promise<ArrayBuffer> {
  const res = await fetch(modelUrl(body));
  if (!res.ok) throw new Error(`car model ${body}: HTTP ${res.status}`);
  return res.arrayBuffer();
}

/** Cheap synchronous check, suitable for deciding whether to offer a 3D toggle. */
export function isSupported(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (!('WebGL2RenderingContext' in window)) return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return false;
  return true;
}

/**
 * Mount the 3D viewer into `el` (which should have a size; the canvas fills it).
 * Rejects when 3D is unsuitable so the caller can fall back to 2D.
 *
 * Set `data-allow-software-gl` on `el` to accept a software (SwiftShader)
 * WebGL context: useful for headless QA, too slow for real visitors.
 */
export async function mount(el: HTMLElement, opts: CarViewerOptions): Promise<CarViewerHandle> {
  if (!isSupported()) throw new Error('3D viewer unsupported: no WebGL2 or Save-Data is on');
  const first = fetchModel(opts.body);
  first.catch(() => {}); // surfaced through createViewer below
  const { createViewer } = await import('./scene3d');
  return createViewer(el, opts, {
    allowSoftwareGL: el.hasAttribute('data-allow-software-gl'),
    first,
    fetchModel,
  });
}
