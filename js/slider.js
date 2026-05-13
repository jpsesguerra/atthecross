/* Hero slider — auto-advance with dot nav + arrows */

(function () {
  const track = document.querySelector('.sliderTrack');
  if (!track) return;

  const slides = track.querySelectorAll('.sliderSlide');
  const dots = track.querySelectorAll('.sliderDot');
  let current = 0;
  let timer;

  function goTo(index) {
    slides[current].classList.remove('isActive');
    dots[current]?.classList.remove('isActive');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('isActive');
    dots[current]?.classList.add('isActive');
  }

  function start() {
    timer = setInterval(() => goTo(current + 1), 8000);
  }

  function reset() {
    clearInterval(timer);
    start();
  }

  track.querySelector('.sliderArrow--prev')?.addEventListener('click', () => { goTo(current - 1); reset(); });
  track.querySelector('.sliderArrow--next')?.addEventListener('click', () => { goTo(current + 1); reset(); });
  dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); reset(); }));

  goTo(0);
  start();
})();
