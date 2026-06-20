/**
 * Static image dimension lookup for portfolio hero images.
 * Dimensions measured from actual files in public/portfolio/.
 * Used to set width/height attributes on ResponsiveImage for CLS prevention.
 *
 * Usage: getImageDimensions('/portfolio/porsche-boxster-spyder-gray.webp')
 */

const DIMENSIONS: Record<string, { width: number; height: number }> = {
  '/portfolio/burgundy-lotus-showroom-display.webp': { width: 2819, height: 3667 },
  '/portfolio/porsche-boxster-spyder-gray.webp': { width: 4284, height: 5712 },
  '/portfolio/lotus-toyota-supra-showroom-duo.webp': { width: 3024, height: 4032 },
  '/portfolio/blue-subaru-wrx-sti-showroom.webp': { width: 3024, height: 4032 },
  '/portfolio/green-porsche-911-showroom-event.webp': { width: 1179, height: 2091 },
  '/portfolio/team-washing-black-sports-car.webp': { width: 3024, height: 4032 },
  '/portfolio/white-corvette-showroom-balloons.webp': { width: 3024, height: 4032 },
  '/portfolio/black-lexus-lx-570-showroom.webp': { width: 3024, height: 3197 },
};

const DEFAULT = { width: 1200, height: 1600 }; // 3:4 portrait fallback

export function getImageDimensions(publicPath: string): { width: number; height: number } {
  return DIMENSIONS[publicPath] || DEFAULT;
}