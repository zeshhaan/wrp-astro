/**
 * three.js viewer for the build-time Manifold car models (public/models/cars/*.glb).
 * PLACEHOLDER: the real implementation is being built. Callers must import this
 * module dynamically and fall back to CarViewer2D if mount() rejects.
 */
import type { CarViewerHandle, CarViewerOptions } from '../panels';

export async function mount(_el: HTMLElement, _opts: CarViewerOptions): Promise<CarViewerHandle> {
  throw new Error('3D viewer not built yet');
}
