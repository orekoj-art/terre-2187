(() => {
  const track = document.querySelector("#dayStoryTrack");
  if (!track) return;
  const slides = Array.from(track.querySelectorAll("[data-day-slide]"));
  const previous = document.querySelector("[data-day-prev]");
  const next = document.querySelector("[data-day-next]");
  const count = document.querySelector("#daySlideCount");
  const progress = document.querySelector("#dayStoryProgress");
  const fill = document.querySelector("#dayStoryProgressFill");
  if (!slides.length || !previous || !next || !count || !progress || !fill) return;

  let activeIndex = 0;
  let frame = 0;
  const twoDigits = (value) => String(value).padStart(2, "0");
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function update() {
    frame = 0;
    const trackLeft = track.getBoundingClientRect().left;
    activeIndex = slides.reduce((best, slide, index) => {
      const distance = Math.abs(slide.getBoundingClientRect().left - trackLeft);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Infinity }).index;
    const position = activeIndex + 1;
    count.textContent = `${twoDigits(position)} / ${twoDigits(slides.length)}`;
    previous.disabled = activeIndex === 0;
    next.disabled = activeIndex === slides.length - 1;
    progress.setAttribute("aria-valuenow", String(position));
    progress.setAttribute("aria-valuetext", `Moment ${position} sur ${slides.length}`);
    fill.style.width = `${(position / slides.length) * 100}%`;
  }

  function scheduleUpdate() {
    if (!frame) frame = window.requestAnimationFrame(update);
  }

  function move(direction) {
    const targetIndex = Math.max(0, Math.min(slides.length - 1, activeIndex + direction));
    const targetOffset = slides[targetIndex].getBoundingClientRect().left - track.getBoundingClientRect().left;
    track.scrollBy({ left: targetOffset, behavior: reducedMotion() ? "auto" : "smooth" });
  }

  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  track.addEventListener("scroll", scheduleUpdate, { passive: true });
  track.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
  });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  update();
})();
