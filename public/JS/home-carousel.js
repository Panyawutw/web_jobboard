(() => {
  const element = document.getElementById('freelancehub-job-banner');
  const toggle = document.getElementById('banner-pause');
  if (!element || !toggle || !window.bootstrap) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const carousel = new window.bootstrap.Carousel(element, {
    interval: reduceMotion ? false : 6000,
    pause: 'hover',
    ride: reduceMotion ? false : 'carousel',
    touch: true
  });

  let paused = reduceMotion;
  if (paused) toggle.textContent = 'เล่นสไลด์';
  toggle.setAttribute('aria-pressed', String(paused));
  toggle.addEventListener('click', () => {
    paused = !paused;
    if (paused) carousel.pause();
    else carousel.cycle();
    toggle.textContent = paused ? 'เล่นสไลด์' : 'หยุดสไลด์';
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'เล่นสไลด์แบนเนอร์' : 'หยุดสไลด์แบนเนอร์');
  });
})();
