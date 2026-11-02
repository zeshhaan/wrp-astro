// Font faces for the self-hosted subsets in this folder, cut by
// scripts/fonts/subset-fonts.py (see manifest.json). Shared by astro.config.mjs, which
// registers them with Astro's local font provider, and FontPreload.astro, which
// preloads only each font's main file.
import manifest from './manifest.json' with { type: 'json' };

// One face per weight the site's CSS used with Google Fonts, so font matching and
// variable-axis values stay exactly as before (a single `400 700` face would draw
// `font-weight: 450` at 450 instead of 500).
const FAMILIES = {
  '--font-inter': { files: { 400: 'inter', 500: 'inter', 600: 'inter', 700: 'inter' }, style: 'normal' },
  '--font-oswald': { files: { 400: 'oswald', 500: 'oswald', 600: 'oswald', 700: 'oswald' }, style: 'normal' },
  '--font-montserrat': { files: { 900: 'montserrat-900-italic' }, style: 'italic' },
  '--font-ibm-plex-arabic': {
    files: { 400: 'wrp-sans-arabic-400', 500: 'wrp-sans-arabic-500', 600: 'wrp-sans-arabic-600', 700: 'wrp-sans-arabic-700' },
    style: 'normal',
  },
};

/**
 * Every face of a family, one per weight and script file: the main (Latin or Arabic)
 * faces first, then the ones loaded on demand (Cyrillic, Greek). Order matters: Astro
 * sizes the generated fallback face from the first file, and keeps one fallback face
 * per weight from the first face it sees.
 * @param {keyof typeof FAMILIES} cssVariable
 */
export function subsetFaces(cssVariable) {
  const { files, style } = FAMILIES[cssVariable];
  const fonts = Object.entries(files).map(([weight, id]) => ({ weight: Number(weight), parts: manifest.fonts[id] }));
  const scripts = Math.max(...fonts.map(({ parts }) => parts.length));
  return Array.from({ length: scripts }, (_, i) =>
    fonts.flatMap(({ weight, parts }) =>
      parts[i]
        ? [{ main: i === 0, weight, style, src: [`./src/assets/fonts/${parts[i].file}`], unicodeRange: parts[i].unicodeRange }]
        : [],
    ),
  ).flat();
}
