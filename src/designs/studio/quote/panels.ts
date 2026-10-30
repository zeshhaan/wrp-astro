/**
 * Shared contract for the Studio quote flow and its car viewers.
 *
 * Panel ids are the single vocabulary used by:
 *  - the car models (each panel is a separately named mesh node in
 *    public/models/cars/<body>.glb, see scripts/cars/import-pack.ts),
 *  - the three.js viewer (tap a mesh → toggle that panel id),
 *  - the 2D top-down fallback (one SVG path per panel id),
 *  - the quote state and the WhatsApp/enquiry message.
 * Keep ids stable: they are stored in saved drafts.
 */

export type BodyType = 'sedan' | 'coupe' | 'suv' | 'pickup';

export const bodyTypes: { id: BodyType; label: string; hint: string; priceClass: 'sedan' | 'suv' }[] = [
  { id: 'sedan', label: 'Sedan or hatch', hint: 'Camry, Altima, Model 3, BMW 5 Series', priceClass: 'sedan' },
  { id: 'coupe', label: 'Coupe or sports car', hint: 'Porsche 911, Supra, Corvette, Mustang', priceClass: 'sedan' },
  { id: 'suv', label: 'SUV or 4x4', hint: 'Land Cruiser, Range Rover, Patrol, Model Y', priceClass: 'suv' },
  { id: 'pickup', label: 'Pickup or large SUV', hint: 'Hilux, F-150, Escalade, G-Class', priceClass: 'suv' },
];

export type PanelId =
  | 'front-bumper'
  | 'bonnet'
  | 'headlights'
  | 'fender-l'
  | 'fender-r'
  | 'mirror-l'
  | 'mirror-r'
  | 'a-pillar-l'
  | 'a-pillar-r'
  | 'roof'
  | 'door-fl'
  | 'door-fr'
  | 'door-rl'
  | 'door-rr'
  | 'rocker-l'
  | 'rocker-r'
  | 'quarter-l'
  | 'quarter-r'
  | 'rear-bumper'
  | 'boot'
  | 'spoiler';

/** Glass is not a paint panel but the tint step highlights it. */
export type GlassId = 'windscreen' | 'side-glass-l' | 'side-glass-r' | 'rear-glass';

export const panels: { id: PanelId; label: string; group: 'front' | 'side' | 'top' | 'rear' }[] = [
  { id: 'front-bumper', label: 'Front bumper', group: 'front' },
  { id: 'bonnet', label: 'Bonnet', group: 'front' },
  { id: 'headlights', label: 'Headlights', group: 'front' },
  { id: 'fender-l', label: 'Left front fender', group: 'front' },
  { id: 'fender-r', label: 'Right front fender', group: 'front' },
  { id: 'mirror-l', label: 'Left mirror', group: 'side' },
  { id: 'mirror-r', label: 'Right mirror', group: 'side' },
  { id: 'a-pillar-l', label: 'Left A-pillar', group: 'top' },
  { id: 'a-pillar-r', label: 'Right A-pillar', group: 'top' },
  { id: 'roof', label: 'Roof', group: 'top' },
  { id: 'door-fl', label: 'Front left door', group: 'side' },
  { id: 'door-fr', label: 'Front right door', group: 'side' },
  { id: 'door-rl', label: 'Rear left door', group: 'side' },
  { id: 'door-rr', label: 'Rear right door', group: 'side' },
  { id: 'rocker-l', label: 'Left rocker panel', group: 'side' },
  { id: 'rocker-r', label: 'Right rocker panel', group: 'side' },
  { id: 'quarter-l', label: 'Left rear quarter', group: 'rear' },
  { id: 'quarter-r', label: 'Right rear quarter', group: 'rear' },
  { id: 'rear-bumper', label: 'Rear bumper', group: 'rear' },
  { id: 'boot', label: 'Boot / tailgate', group: 'rear' },
  { id: 'spoiler', label: 'Spoiler', group: 'rear' },
];

/**
 * PPF coverage presets, from src/content/services/paint-protection-film.mdx.
 * "Door edges & handles" in Track are partial-panel work; we show the doors as
 * partly covered rather than claiming full doors.
 */
export const ppfPresets: { id: string; name: string; panels: PanelId[]; partial?: PanelId[]; note: string }[] = [
  {
    id: 'front-end',
    name: 'Front End Protection',
    panels: ['front-bumper', 'bonnet', 'fender-l', 'fender-r', 'mirror-l', 'mirror-r', 'headlights'],
    note: 'The parts that take the stone chips.',
  },
  {
    id: 'track',
    name: 'Track Package',
    panels: [
      'front-bumper', 'bonnet', 'fender-l', 'fender-r', 'mirror-l', 'mirror-r', 'headlights',
      'rocker-l', 'rocker-r', 'rear-bumper', 'quarter-l', 'quarter-r', 'a-pillar-l', 'a-pillar-r',
    ],
    partial: ['door-fl', 'door-fr', 'door-rl', 'door-rr'],
    note: 'Front End plus rockers, rear bumper and fenders, A-pillars, door edges and handles.',
  },
  {
    id: 'full-body',
    name: 'Full Body Protection',
    panels: panels.map((p) => p.id).filter((id) => id !== 'spoiler') as PanelId[],
    note: 'Every painted panel, roof and boot included, door jambs too.',
  },
];

/** Wrap & styling parts customers ask for (a recent review: matte black bonnet + spoiler). */
export const wrapParts: PanelId[] = ['bonnet', 'roof', 'mirror-l', 'mirror-r', 'spoiler', 'boot', 'a-pillar-l', 'a-pillar-r'];

/**
 * Window film options, from src/content/services/window-film.mdx.
 * `vlt` = visible light transmission used by the tint preview (higher = lighter).
 */
export const tintOptions: { id: string; name: string; vlt: number; heat: string; note: string }[] = [
  { id: 'classic', name: 'Classic Ceramic', vlt: 50, heat: '60% heat rejection', note: '50% VLT, UAE compliant. All side and rear windows.' },
  { id: 'premium', name: 'Premium Ceramic', vlt: 35, heat: '75% heat rejection', note: 'Multiple shade options. We confirm the shade with you.' },
  { id: 'ultimate', name: 'Ultimate Ceramic', vlt: 30, heat: '85% heat rejection', note: 'Darkest legal shade. Windshield film included.' },
];

/**
 * Viewer API implemented by src/designs/studio/quote/viewer/CarViewer3D.ts
 * (three.js + GLB car models) and by the 2D SVG fallback.
 */
export type ViewerMode = 'ppf' | 'wrap' | 'tint' | 'look';

export interface CarViewerOptions {
  body: BodyType;
  mode: ViewerMode;
  selected: ReadonlySet<PanelId>;
  partial?: ReadonlySet<PanelId>;
  /** 0–100, visible light transmission of the glass, for mode 'tint'. */
  tintVlt?: number;
  /** Paint colour as a CSS hex, to match the customer's car. */
  paint?: string;
  onToggle?: (id: PanelId) => void;
  /**
   * Additive (quote flow): which glass carries film in mode 'tint'.
   * Default: side and rear glass, not the windscreen.
   */
  tintGlass?: ReadonlySet<GlassId>;
  /** Additive (quote flow): colour of wrapped parts in mode 'wrap'. Default matte black. */
  wrapColor?: string;
}

export interface CarViewerHandle {
  update(next: Partial<CarViewerOptions>): void;
  destroy(): void;
}
