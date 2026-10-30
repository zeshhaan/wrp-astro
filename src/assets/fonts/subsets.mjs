// Font faces for the self-hosted subsets in this folder, cut by
// scripts/fonts/subset-fonts.py (see manifest.json). Shared by astro.config.mjs, which
// registers them with Astro's local font provider, and FontPreload.astro, which
// preloads only the core files.
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
 * Every face of a family: all core faces first, then the extended ones. Order matters:
 * Astro sizes the generated fallback face from the first file, and keeps one fallback
 * face per weight from the first face it sees.
 * @param {keyof typeof FAMILIES} cssVariable
 */
export function subsetFaces(cssVariable) {
  const { files, style } = FAMILIES[cssVariable];
  return ['core', 'ext'].flatMap((kind) =>
    Object.entries(files).map(([weight, id]) => {
      const part = manifest.fonts[id][kind];
      return {
        kind,
        weight: Number(weight),
        style,
        src: [`./src/assets/fonts/${part.file}`],
        unicodeRange: part.unicodeRange,
      };
    }),
  );
}
