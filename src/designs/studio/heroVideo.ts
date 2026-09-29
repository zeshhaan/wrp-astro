/**
 * Homepage hero video: files in public/video/hero/, made by scripts/hero-video.sh
 * (re-run it with a new master to replace the clip, then paste the printed
 * placeholders below). Wide = 16:9 for tablets and desktops; tall = 9:16 crop for phones.
 */
const dir = '/video/hero';

export const heroVideo = {
  /** Phones get the 9:16 files. Keep in sync with the placeholder media query in Hero.astro. */
  tallMedia: '(max-width: 40rem)',
  /** ~24px first frames, inlined as data URLs so something paints with the HTML (no request). */
  placeholder: {
    wide: 'data:image/webp;base64,UklGRqQAAABXRUJQVlA4IJgAAADwAwCdASoYAA4APu1iqU2ppaOiMAgBMB2JZQC7ABaGPLDIUgNWuu5QAP7sKb/EO0o2/6mps1Q6Lmw9dDFO6EbuIMoI6wcNZDErr/YwiN9b1Rv1yiCX0Pd/oQCcsFXj/hJBaQa3+ZrwtUqhml3T+/Y0Fbgbuqvd24utO9g2a+iaYa/NdFYYXUjLeyKnZoAhupWI2hkZBOMAAA==',
    tall: 'data:image/webp;base64,UklGRkIBAABXRUJQVlA4IDYBAAAQBwCdASoYACoAPu1oqk+ppaOiKqoBMB2JYwC07AwFvIacOXm9Yrgl2t7pCVYymq7nZkLG+T4hlixNUhUAohnpOAD+uCDd9Tfoii8zbgW+4cnPssBIaMm508qGALazQShnEBG+B60tTPlrShNhxnxi+f7cYBmBrr23ORONLcBF4kOw6CIqnPj/eVB5w8uoBVxyGgqh8PWO/InzsfGqtlNiDwevALaVcWHVLdCzpUU8IyWYN/mmIq0aJu7wVVxHL62keocRbVMfJpULQpNp8Nb0tJsDOQJZzZyiYSyPmu3+HZlHrmvmicanLr2Cbkmn0ywKDckTCKSoiS0nHbbj360bD8Jc2wCnYJDTuj9bq6Q3fPIME2xM7dwWeUmHkRjdtAbu6fGsvADvdxpdTwtZe4RxtM14owAA',
  },
  poster: {
    wide: { avif: `${dir}/poster-1080.avif`, webp: `${dir}/poster-1080.webp`, jpg: `${dir}/poster-1080.jpg` },
    tall: { avif: `${dir}/poster-720x1280.avif`, webp: `${dir}/poster-720x1280.webp`, jpg: `${dir}/poster-720x1280.jpg` },
  },
  /** Played through src/pages/media/hero-video/[name].ts, which answers Range requests (Safari needs 206). */
  video: {
    wide: { av1: '/media/hero-video/hero-1080.av1/', h264: '/media/hero-video/hero-1080.h264/' },
    tall: { av1: '/media/hero-video/hero-720x1280.av1/', h264: '/media/hero-video/hero-720x1280.h264/' },
  },
};
