/** Local content and geometry for the Mezzanine concept. */
import { whatsappLink } from '../data';

/**
 * The hero photo: Tariq Murad's shot of the glass-walled mezzanine above the bays.
 * In the 1200×900 original the black mezzanine beam runs from y=473 to y=528,
 * the glass wall starts at y≈207. The hero slices the photo along that beam.
 */
export const heroPhoto = {
  base: '/review-images/tariq_murad_2',
  alt: 'The WRP studio: a glass-walled lounge on the mezzanine, directly above the car bays',
  beamTop: 473,
  beamBottom: 528,
};

export const floors = [
  { code: '1', id: 'first-floor', name: 'Lounge', full: 'First floor' },
  { code: 'G', id: 'ground-floor', name: 'Bays', full: 'Ground floor' },
  { code: 'S', id: 'street', name: 'Street', full: 'Street' },
] as const;

/** Header links, in the order you meet them on the page. */
export const navLinks = [
  { label: 'Services', href: '#services' },
  { label: 'Work', href: '#work' },
  { label: 'Lounge', href: '#lounge' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'Visit', href: '#visit' },
];

export const whatsappHello = whatsappLink('Hi WRP, I’d like a quote for my car.');
