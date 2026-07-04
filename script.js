const downloadButtons = document.querySelectorAll('a[download]');

downloadButtons.forEach((button) => {
  button.addEventListener('click', () => {
    button.classList.add('is-downloading');
    window.setTimeout(() => button.classList.remove('is-downloading'), 1200);
  });
});

const snapSections = Array.from(
  document.querySelectorAll(
    '.hero-section, .section-block, .customize-section, .workflow-section, .form-section, .security-section, .updates-section, .download-section'
  )
);

let currentSectionIndex = 0;
let isSectionScrolling = false;
let touchStartY = 0;
let touchStartedInCarousel = false;

function headerOffset() {
  return document.querySelector('.site-header')?.offsetHeight ?? 0;
}

function isCompactViewport() {
  return window.matchMedia('(max-width: 1100px), (max-height: 780px) and (pointer: coarse)').matches;
}

function nearestSectionIndex() {
  const header = headerOffset();
  const currentSlideTop = window.scrollY + header;
  let nearest = 0;
  let nearestDistance = Infinity;

  snapSections.forEach((section, index) => {
    const distance = Math.abs(section.offsetTop - currentSlideTop);
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  });

  return nearest;
}

function setActiveSection(index) {
  currentSectionIndex = Math.max(0, Math.min(snapSections.length - 1, index));
}

function slideToSection(index) {
  if (!snapSections[index]) return;
  setActiveSection(index);
  isSectionScrolling = true;
  const section = snapSections[index];
  const header = headerOffset();
  const targetTop = Math.max(0, section.offsetTop - header);
  window.scrollTo({ top: targetTop, left: 0, behavior: 'smooth' });
  window.setTimeout(() => {
    isSectionScrolling = false;
  }, 760);
}

function stepSection(direction) {
  if (isCompactViewport()) return;
  if (isSectionScrolling) return;
  setActiveSection(nearestSectionIndex());
  slideToSection(currentSectionIndex + direction);
}

window.addEventListener(
  'wheel',
  (event) => {
    if (isCompactViewport()) return;
    if (event.target.closest('.updates-carousel')) return;
    if (Math.abs(event.deltaY) < 18 || event.ctrlKey) return;
    event.preventDefault();
    stepSection(event.deltaY > 0 ? 1 : -1);
  },
  { passive: false }
);

window.addEventListener('keydown', (event) => {
  if (isCompactViewport()) return;
  const nextKeys = ['ArrowDown', 'PageDown', 'Space'];
  const previousKeys = ['ArrowUp', 'PageUp'];

  if (nextKeys.includes(event.code)) {
    event.preventDefault();
    stepSection(1);
  }

  if (previousKeys.includes(event.code)) {
    event.preventDefault();
    stepSection(-1);
  }
});

window.addEventListener(
  'touchstart',
  (event) => {
    touchStartedInCarousel = Boolean(
      event.target.closest('.instruction-carousel, .updates-carousel')
    );
    touchStartY = event.touches[0]?.clientY ?? 0;
  },
  { passive: true }
);

window.addEventListener(
  'touchend',
  (event) => {
    if (isCompactViewport()) {
      touchStartedInCarousel = false;
      return;
    }
    if (touchStartedInCarousel) {
      touchStartedInCarousel = false;
      return;
    }
    const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY;
    const delta = touchStartY - touchEndY;
    if (Math.abs(delta) < 42) return;
    stepSection(delta > 0 ? 1 : -1);
  },
  { passive: true }
);

window.addEventListener('resize', () => {
  setActiveSection(nearestSectionIndex());
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    const index = snapSections.indexOf(target);
    if (index < 0) return;
    event.preventDefault();
    slideToSection(index);
  });
});

const carousel = document.querySelector('.instruction-carousel');
const carouselTrack = carousel?.querySelector('.instruction-gallery');
const carouselViewport = carousel?.querySelector('.instruction-viewport');

if (carousel && carouselTrack && carouselViewport) {
  const slideCount = carouselTrack.children.length;
  let activeSlide = 0;
  let slideStep = 0;
  let autoplayTimer = null;
  let isDragging = false;
  let dragStartX = 0;
  let dragDeltaX = 0;
  let baseTranslate = 0;

  function getGap() {
    return Number.parseFloat(window.getComputedStyle(carouselTrack).gap) || 0;
  }

  function measureCarousel() {
    const slide = carouselTrack.querySelector('article');
    if (!slide) return;
    slideStep = slide.getBoundingClientRect().width + getGap();
    jumpToSlide(activeSlide);
  }

  function setTrackTransition(enabled) {
    carouselTrack.style.transition = enabled ? 'transform 520ms ease' : 'none';
  }

  function normalizeSlide(index) {
    if (!slideCount) return 0;
    return (index + slideCount) % slideCount;
  }

  function jumpToSlide(index) {
    activeSlide = normalizeSlide(index);
    setTrackTransition(false);
    carouselTrack.style.transform = `translateX(${-activeSlide * slideStep}px)`;
    carouselTrack.offsetHeight;
    setTrackTransition(true);
  }

  function moveToSlide(index) {
    if (!slideStep) measureCarousel();
    activeSlide = normalizeSlide(index);
    setTrackTransition(true);
    carouselTrack.style.transform = `translateX(${-activeSlide * slideStep}px)`;
  }

  function nextInstruction() {
    moveToSlide(activeSlide + 1);
  }

  function previousInstruction() {
    moveToSlide(activeSlide - 1);
  }

  function startAutoplay() {
    window.clearInterval(autoplayTimer);
    autoplayTimer = window.setInterval(nextInstruction, 2600);
  }

  function pauseAutoplay() {
    window.clearInterval(autoplayTimer);
  }

  carouselViewport.addEventListener('pointerdown', (event) => {
    isDragging = true;
    dragStartX = event.clientX;
    dragDeltaX = 0;
    baseTranslate = -activeSlide * slideStep;
    pauseAutoplay();
    carouselTrack.classList.add('is-dragging');
    carouselViewport.setPointerCapture(event.pointerId);
  });

  carouselViewport.addEventListener('pointermove', (event) => {
    if (!isDragging) return;
    dragDeltaX = event.clientX - dragStartX;
    carouselTrack.style.transform = `translateX(${baseTranslate + dragDeltaX}px)`;
  });

  function finishDrag(event) {
    if (!isDragging) return;
    isDragging = false;
    carouselTrack.classList.remove('is-dragging');
    if (carouselViewport.hasPointerCapture?.(event.pointerId)) {
      carouselViewport.releasePointerCapture(event.pointerId);
    }
    const threshold = Math.max(48, slideStep * 0.18);

    if (dragDeltaX <= -threshold) {
      nextInstruction();
    } else if (dragDeltaX >= threshold) {
      previousInstruction();
    } else {
      moveToSlide(activeSlide);
    }

    startAutoplay();
  }

  carouselViewport.addEventListener('pointerup', finishDrag);
  carouselViewport.addEventListener('pointercancel', finishDrag);
  carouselViewport.addEventListener('mouseenter', pauseAutoplay);
  carouselViewport.addEventListener('mouseleave', () => {
    if (!isDragging) startAutoplay();
  });

  window.addEventListener('resize', measureCarousel);
  measureCarousel();
  startAutoplay();
}

const updatesCarousel = document.querySelector('.updates-carousel');
const updatesTrack = updatesCarousel?.querySelector('.updates-track');
const updatesViewport = updatesCarousel?.querySelector('.updates-viewport');

if (updatesCarousel && updatesTrack && updatesViewport) {
  let updateOffset = 0;
  let lastUpdateFrame = 0;
  let isUpdatePaused = false;
  let isUpdateDragging = false;
  let updateDragStartY = 0;
  let updateResumeTimer = null;
  const updateSpeed = 30;

  function getUpdateGap() {
    return Number.parseFloat(window.getComputedStyle(updatesTrack).gap) || 0;
  }

  function getUpdateStep(card) {
    if (!card) return 0;
    return card.getBoundingClientRect().height + getUpdateGap();
  }

  function applyUpdateOffset() {
    updatesTrack.style.transform = `translateY(${-updateOffset}px)`;
  }

  function normalizeUpdates() {
    let firstCard = updatesTrack.firstElementChild;
    let firstStep = getUpdateStep(firstCard);
    while (firstCard && firstStep > 0 && updateOffset >= firstStep) {
      updateOffset -= firstStep;
      updatesTrack.appendChild(firstCard);
      firstCard = updatesTrack.firstElementChild;
      firstStep = getUpdateStep(firstCard);
    }

    while (updateOffset < 0) {
      const lastCard = updatesTrack.lastElementChild;
      const lastStep = getUpdateStep(lastCard);
      if (!lastCard || lastStep <= 0) break;
      updatesTrack.prepend(lastCard);
      updateOffset += lastStep;
    }
  }

  function measureUpdates() {
    normalizeUpdates();
    applyUpdateOffset();
  }

  function pauseUpdateAutoplay() {
    isUpdatePaused = true;
    window.clearTimeout(updateResumeTimer);
  }

  function resumeUpdateAutoplaySoon(delay = 900) {
    window.clearTimeout(updateResumeTimer);
    updateResumeTimer = window.setTimeout(() => {
      if (!isUpdateDragging) isUpdatePaused = false;
    }, delay);
  }

  function moveUpdatesBy(delta) {
    updateOffset += delta;
    normalizeUpdates();
    applyUpdateOffset();
  }

  function animateUpdates(timestamp) {
    if (!lastUpdateFrame) lastUpdateFrame = timestamp;
    const elapsed = timestamp - lastUpdateFrame;
    lastUpdateFrame = timestamp;

    if (!isUpdatePaused && !isUpdateDragging) {
      moveUpdatesBy((updateSpeed * elapsed) / 1000);
    }

    window.requestAnimationFrame(animateUpdates);
  }

  updatesViewport.addEventListener(
    'wheel',
    (event) => {
      if (Math.abs(event.deltaY) < 8 || event.ctrlKey) return;
      event.preventDefault();
      event.stopPropagation();
      pauseUpdateAutoplay();
      moveUpdatesBy(event.deltaY * 0.9);
      resumeUpdateAutoplaySoon();
    },
    { passive: false }
  );

  updatesViewport.addEventListener('pointerdown', (event) => {
    isUpdateDragging = true;
    updateDragStartY = event.clientY;
    pauseUpdateAutoplay();
    updatesTrack.classList.add('is-dragging');
    updatesViewport.setPointerCapture(event.pointerId);
  });

  updatesViewport.addEventListener('pointermove', (event) => {
    if (!isUpdateDragging) return;
    const delta = event.clientY - updateDragStartY;
    updateDragStartY = event.clientY;
    moveUpdatesBy(-delta);
  });

  function finishUpdateDrag(event) {
    if (!isUpdateDragging) return;
    isUpdateDragging = false;
    updatesTrack.classList.remove('is-dragging');
    if (updatesViewport.hasPointerCapture?.(event.pointerId)) {
      updatesViewport.releasePointerCapture(event.pointerId);
    }
    resumeUpdateAutoplaySoon();
  }

  updatesViewport.addEventListener('pointerup', finishUpdateDrag);
  updatesViewport.addEventListener('pointercancel', finishUpdateDrag);
  updatesViewport.addEventListener('mouseenter', pauseUpdateAutoplay);
  updatesViewport.addEventListener('mouseleave', () => {
    if (!isUpdateDragging) resumeUpdateAutoplaySoon(120);
  });

  window.addEventListener('resize', measureUpdates);
  measureUpdates();
  window.requestAnimationFrame(animateUpdates);
}
