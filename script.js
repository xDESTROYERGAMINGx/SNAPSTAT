const downloadButtons = document.querySelectorAll('a[download]');

downloadButtons.forEach((button) => {
  button.addEventListener('click', () => {
    button.classList.add('is-downloading');
    window.setTimeout(() => button.classList.remove('is-downloading'), 1200);
  });
});

const snapSections = Array.from(
  document.querySelectorAll(
    '.hero-section, .section-block, .customize-section, .workflow-section, .form-section, .download-section'
  )
);

let currentSectionIndex = 0;
let isSectionScrolling = false;
let touchStartY = 0;
let touchStartedInCarousel = false;

function headerOffset() {
  return document.querySelector('.site-header')?.offsetHeight ?? 0;
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
  if (isSectionScrolling) return;
  setActiveSection(nearestSectionIndex());
  slideToSection(currentSectionIndex + direction);
}

window.addEventListener(
  'wheel',
  (event) => {
    if (Math.abs(event.deltaY) < 18 || event.ctrlKey) return;
    event.preventDefault();
    stepSection(event.deltaY > 0 ? 1 : -1);
  },
  { passive: false }
);

window.addEventListener('keydown', (event) => {
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
    touchStartedInCarousel = Boolean(event.target.closest('.instruction-carousel'));
    touchStartY = event.touches[0]?.clientY ?? 0;
  },
  { passive: true }
);

window.addEventListener(
  'touchend',
  (event) => {
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
const lightbox = document.querySelector('.instruction-lightbox');
const lightboxImage = lightbox?.querySelector('img');
const lightboxCaption = lightbox?.querySelector('p');
const lightboxClose = lightbox?.querySelector('.lightbox-close');

if (carousel && carouselTrack && carouselViewport) {
  const slideCount = carouselTrack.children.length;
  let activeSlide = 0;
  let slideStep = 0;
  let autoplayTimer = null;
  let isDragging = false;
  let dragStartX = 0;
  let dragDeltaX = 0;
  let baseTranslate = 0;
  let didDrag = false;

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
    didDrag = false;
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
    if (Math.abs(dragDeltaX) > 6) didDrag = true;
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

  carouselTrack.addEventListener('click', (event) => {
    if (didDrag && Math.abs(dragDeltaX) > 8) {
      didDrag = false;
      return;
    }
    didDrag = false;
    const slide = event.target.closest('article');
    const image = slide?.querySelector('img');
    const caption = slide?.querySelector('h3')?.textContent ?? image?.alt ?? '';
    if (!image || !lightbox || !lightboxImage || !lightboxCaption) return;
    pauseAutoplay();
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = caption;
    lightbox.hidden = false;
  });

  function closeLightbox() {
    if (!lightbox || !lightboxImage || !lightboxCaption) return;
    lightbox.hidden = true;
    lightboxImage.src = '';
    lightboxCaption.textContent = '';
    startAutoplay();
  }

  lightboxClose?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  window.addEventListener('keydown', (event) => {
    if (!lightbox || lightbox.hidden) return;
    if (event.code === 'Escape') closeLightbox();
  });

  window.addEventListener('resize', measureCarousel);
  measureCarousel();
  startAutoplay();
}
