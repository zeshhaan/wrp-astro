/**
 * Hero background video loader. The poster is the LCP image; the video must
 * never compete with it, so nothing is fetched until the page has loaded and
 * the browser is idle. Skipped entirely for reduced motion, Save-Data and 2G.
 */
type NetInfo = { saveData?: boolean; effectiveType?: string };

export function startHeroVideo() {
  const video = document.querySelector<HTMLVideoElement>('[data-hero-video]');
  const btn = document.querySelector<HTMLButtonElement>('[data-hero-pause]');
  if (!video || !btn) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const net = (navigator as Navigator & { connection?: NetInfo }).connection;
  if (reduced.matches || net?.saveData || /(^|-)2g$/.test(net?.effectiveType ?? '')) return;

  let userPaused = false;
  let visible = true;

  const pick = () => {
    const tall = matchMedia(video.dataset.tallMedia ?? '(max-width: 40rem)').matches;
    const av1 = video.canPlayType('video/mp4; codecs="av01.0.05M.08"') === 'probably';
    const key = `${tall ? 'tall' : 'wide'}${av1 ? 'Av1' : 'H264'}` as 'wideAv1' | 'wideH264' | 'tallAv1' | 'tallH264';
    return video.dataset[key]!;
  };

  const play = () => {
    if (userPaused || !visible || document.hidden) return;
    video.play().catch(() => {
      /* autoplay refused (e.g. Low Power Mode): the poster stays, which is fine */
    });
  };

  const load = () => {
    video.src = pick();
    video.preload = 'auto';
    video.addEventListener(
      'playing',
      () => {
        video.classList.add('is-playing');
        btn.hidden = false; // only offer pause once there is something moving
      },
      { once: true },
    );
    play();
  };

  // Pause off-screen and in background tabs: no decoding (or battery) spent on nothing.
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) play();
    else video.pause();
  }).observe(video);
  document.addEventListener('visibilitychange', () => (document.hidden ? video.pause() : play()));

  // A visible way to stop moving content (WCAG 2.2.2).
  btn.addEventListener('click', () => {
    userPaused = !userPaused;
    btn.setAttribute('aria-pressed', String(userPaused));
    btn.querySelector('[data-hero-pause-label]')!.textContent = userPaused ? 'Play background video' : 'Pause background video';
    if (userPaused) video.pause();
    else play();
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      userPaused = true;
      video.pause();
    }
  });

  const idle = (fn: () => void) =>
    'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 600);
  if (document.readyState === 'complete') idle(load);
  else addEventListener('load', () => idle(load), { once: true });
}
