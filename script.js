const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const cleanupCallbacks = [];
const SECTION_SELECTOR =
  '.hero-section, .section-block, .customize-section, .workflow-section, ' +
  '.form-section, .security-section, .updates-section, .download-section';

function registerCleanup(callback) {
  if (typeof callback === 'function') cleanupCallbacks.push(callback);
}

function headerOffset() {
  return document.querySelector('.site-header')?.offsetHeight ?? 0;
}

function interactionBlocksPageNavigation() {
  const activeElement = document.activeElement;
  const isEditing =
    activeElement instanceof HTMLElement &&
    (activeElement.matches('input, textarea, select') ||
      activeElement.isContentEditable);

  if (isEditing) return true;

  return Boolean(
    document.querySelector(
      'dialog[open], [role="dialog"][aria-modal="true"]:not([hidden]), ' +
        '[aria-haspopup][aria-expanded="true"], [data-loop-pause="true"]'
    )
  );
}

function initializeDownloadFeedback() {
  const buttons = Array.from(document.querySelectorAll('a[download]'));
  const listeners = [];

  buttons.forEach((button) => {
    const onClick = () => {
      button.classList.add('is-downloading');
      window.setTimeout(() => button.classList.remove('is-downloading'), 1200);
    };
    button.addEventListener('click', onClick);
    listeners.push(() => button.removeEventListener('click', onClick));
  });

  return () => listeners.forEach((removeListener) => removeListener());
}

function initializeInstructionHorizontalScroll() {
  const carousel = document.querySelector('[data-instruction-carousel]');
  const cards = Array.from(
    carousel?.querySelectorAll('[data-instruction-card]') ?? []
  );

  if (!carousel || cards.length === 0) return null;

  let activeIndex = 0;
  let updateFrame = 0;
  let dragFrame = 0;
  let pendingDragLeft = null;
  const centeredFocusQuery = window.matchMedia(
    '(max-width: 820px), (pointer: coarse) and (max-width: 1100px)'
  );

  function maximumScrollLeft() {
    return Math.max(0, carousel.scrollWidth - carousel.clientWidth);
  }

  function clampScrollLeft(left) {
    return Math.max(0, Math.min(maximumScrollLeft(), left));
  }

  function cardTargetLeft(index) {
    const card = cards[index];
    if (!card) return 0;
    if (!centeredFocusQuery.matches) return clampScrollLeft(card.offsetLeft);

    return clampScrollLeft(
      card.offsetLeft + card.offsetWidth / 2 - carousel.clientWidth / 2
    );
  }

  function closestCardIndex(left = carousel.scrollLeft) {
    const focusPoint = centeredFocusQuery.matches
      ? left + carousel.clientWidth / 2
      : left;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const cardPoint = centeredFocusQuery.matches
        ? card.offsetLeft + card.offsetWidth / 2
        : card.offsetLeft;
      const distance = Math.abs(cardPoint - focusPoint);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }

  function renderState() {
    const focusPoint = centeredFocusQuery.matches
      ? carousel.scrollLeft + carousel.clientWidth / 2
      : carousel.scrollLeft;

    cards.forEach((card, index) => {
      const active = index === activeIndex;
      const cardPoint = centeredFocusQuery.matches
        ? card.offsetLeft + card.offsetWidth / 2
        : card.offsetLeft;
      const focus = Math.max(
        0,
        1 - Math.abs(cardPoint - focusPoint) / Math.max(1, card.offsetWidth)
      );
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-current', active ? 'step' : 'false');
      card.style.setProperty('--instruction-focus', focus.toFixed(3));
    });
  }

  function updateState() {
    updateFrame = 0;
    activeIndex = closestCardIndex();
    renderState();
  }

  function scheduleStateUpdate() {
    if (updateFrame) return;
    updateFrame = window.requestAnimationFrame(updateState);
  }

  function flushDragPosition() {
    if (pendingDragLeft === null) return;
    carousel.scrollLeft = pendingDragLeft;
    pendingDragLeft = null;
  }

  function scheduleDragPosition(left) {
    pendingDragLeft = clampScrollLeft(left);
    if (dragFrame) return;
    dragFrame = window.requestAnimationFrame(() => {
      dragFrame = 0;
      flushDragPosition();
      updateState();
    });
  }

  function goTo(index, smooth = true) {
    const nextIndex = Math.max(0, Math.min(cards.length - 1, index));
    if (dragFrame) {
      window.cancelAnimationFrame(dragFrame);
      dragFrame = 0;
    }
    flushDragPosition();
    carousel.classList.remove('is-touch-scrubbing');
    activeIndex = nextIndex;
    carousel.scrollTo({
      left: cardTargetLeft(nextIndex),
      top: 0,
      behavior:
        smooth && !reducedMotionQuery.matches ? 'smooth' : 'auto',
    });
    renderState();
  }

  function step(direction) {
    if (direction > 0 && activeIndex < cards.length - 1) {
      goTo(activeIndex + 1);
      return true;
    }
    if (direction < 0 && activeIndex > 0) {
      goTo(activeIndex - 1);
      return true;
    }
    return false;
  }

  function beginTouchScrub() {
    if (dragFrame) {
      window.cancelAnimationFrame(dragFrame);
      dragFrame = 0;
    }
    flushDragPosition();
    activeIndex = closestCardIndex();
    carousel.classList.add('is-touch-scrubbing');
    return {
      index: activeIndex,
      left: carousel.scrollLeft,
    };
  }

  function scrubTo(left) {
    const maximum = maximumScrollLeft();
    const clampedLeft = Math.max(0, Math.min(maximum, left));
    scheduleDragPosition(clampedLeft);
    return {
      beforeStart: Math.max(0, -left),
      afterEnd: Math.max(0, left - maximum),
    };
  }

  function finishTouchScrub(direction, startIndex, distance) {
    if (dragFrame) {
      window.cancelAnimationFrame(dragFrame);
      dragFrame = 0;
    }
    flushDragPosition();
    carousel.classList.remove('is-touch-scrubbing');

    let targetIndex = closestCardIndex();
    if (distance >= 42) {
      targetIndex =
        direction > 0
          ? Math.max(targetIndex, Math.min(cards.length - 1, startIndex + 1))
          : Math.min(targetIndex, Math.max(0, startIndex - 1));
    }
    goTo(targetIndex);
    return targetIndex;
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(activeIndex - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(activeIndex + 1);
    }
  }

  carousel.addEventListener('scroll', scheduleStateUpdate, { passive: true });
  carousel.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', scheduleStateUpdate, { passive: true });
  renderState();

  return {
    element: carousel,
    section: carousel.closest('#instructions'),
    step,
    goTo,
    beginTouchScrub,
    scrubTo,
    finishTouchScrub,
    lastIndex: cards.length - 1,
    first: () => goTo(0, false),
    last: () => goTo(cards.length - 1, false),
    cleanup() {
      carousel.removeEventListener('scroll', scheduleStateUpdate);
      carousel.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', scheduleStateUpdate);
      if (updateFrame) window.cancelAnimationFrame(updateFrame);
      if (dragFrame) window.cancelAnimationFrame(dragFrame);
      cards.forEach((card) => card.style.removeProperty('--instruction-focus'));
    },
  };
}

/**
 * Creates a three-cycle scroll track: previous copy, interactive original,
 * next copy. The viewport starts in the middle cycle. Crossing either cycle
 * boundary moves scrollTop by exactly one cycle height inside the same frame,
 * so every visible pixel remains identical while the scroll position wraps.
 *
 * This mirrors the full-track infinite approach used by Lenis' `infinite`
 * mode, but stays dependency-free and keeps only the middle copy interactive.
 */
function initializeCircularVerticalScroll() {
  const main = document.querySelector('main');
  const supportsRequiredFeatures =
    main &&
    typeof window.requestAnimationFrame === 'function' &&
    typeof window.scrollTo === 'function' &&
    typeof Element.prototype.cloneNode === 'function';

  if (!supportsRequiredFeatures || reducedMotionQuery.matches) return null;

  const initialDocumentTop = window.scrollY;
  const originalParent = main.parentNode;
  const originalNextSibling = main.nextSibling;
  const viewport = document.createElement('div');
  const track = document.createElement('div');
  viewport.className = 'infinite-scroll-viewport';
  viewport.setAttribute('data-infinite-scroll-viewport', '');
  track.className = 'infinite-scroll-track';

  function createInertCopy(position) {
    const copy = document.createElement('div');
    copy.className = `infinite-scroll-copy infinite-scroll-copy-${position}`;
    copy.setAttribute('aria-hidden', 'true');
    copy.setAttribute('inert', '');
    Array.from(main.children).forEach((section) => {
      const sectionCopy = section.cloneNode(true);
      sectionCopy.removeAttribute('id');
      sectionCopy.querySelectorAll('[id]').forEach((element) => {
        element.removeAttribute('id');
      });
      sectionCopy
        .querySelectorAll('a, button, input, textarea, select, [tabindex]')
        .forEach((element) => {
          element.setAttribute('tabindex', '-1');
          if (element.matches('a[href]')) element.removeAttribute('href');
        });
      copy.appendChild(sectionCopy);
    });
    return copy;
  }

  const previousCopy = createInertCopy('previous');
  const nextCopy = createInertCopy('next');
  originalParent.insertBefore(viewport, main);
  viewport.appendChild(track);
  track.append(previousCopy, main, nextCopy);

  let cycleHeight = 0;
  let middleStart = 0;
  let scrollFrame = 0;
  let resizeFrame = 0;
  let repositioning = false;

  function measure() {
    const oldCycleHeight = cycleHeight;
    const oldMiddleStart = middleStart;
    const logicalProgress =
      oldCycleHeight > 0
        ? Math.max(
            0,
            Math.min(
              1,
              (viewport.scrollTop - oldMiddleStart) / oldCycleHeight
            )
          )
        : 0;

    cycleHeight = Math.max(1, main.getBoundingClientRect().height);
    middleStart = main.offsetTop;
    document.body.style.setProperty(
      '--vertical-loop-cycle-height',
      `${cycleHeight}px`
    );

    if (oldCycleHeight > 0 && !repositioning) {
      performInvisibleRebase(
        middleStart + logicalProgress * cycleHeight
      );
    }
  }

  function performInvisibleRebase(targetTop) {
    if (repositioning) return;
    repositioning = true;
    document.documentElement.classList.add('is-loop-repositioning');
    viewport.scrollTop = Math.max(0, targetTop);
    window.requestAnimationFrame(() => {
      document.documentElement.classList.remove('is-loop-repositioning');
      repositioning = false;
    });
  }

  function checkPosition() {
    scrollFrame = 0;
    if (
      repositioning ||
      reducedMotionQuery.matches ||
      interactionBlocksPageNavigation()
    ) {
      return;
    }

    const currentTop = viewport.scrollTop;
    if (currentTop >= middleStart + cycleHeight) {
      performInvisibleRebase(currentTop - cycleHeight);
    } else if (currentTop < middleStart) {
      performInvisibleRebase(currentTop + cycleHeight);
    }
  }

  function schedulePositionCheck() {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(checkPosition);
  }

  function scheduleMeasure() {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      measure();
    });
  }

  const resizeObserver =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(scheduleMeasure)
      : null;

  document.documentElement.classList.add('has-infinite-scroll');
  document.body.classList.add('has-infinite-scroll');
  viewport.addEventListener('scroll', schedulePositionCheck, { passive: true });
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  window.addEventListener('load', scheduleMeasure, { once: true });
  resizeObserver?.observe(main);
  resizeObserver?.observe(viewport);
  measure();
  performInvisibleRebase(middleStart + Math.max(0, initialDocumentTop));
  window.scrollTo(0, 0);
  viewport.classList.add('is-ready');

  return {
    surface: viewport,
    scrollTop: () => viewport.scrollTop,
    sectionTarget(section) {
      return (
        section.getBoundingClientRect().top -
        viewport.getBoundingClientRect().top +
        viewport.scrollTop
      );
    },
    nextHeroTarget() {
      const section = nextCopy.querySelector('.hero-section');
      return section
        ? section.getBoundingClientRect().top -
            viewport.getBoundingClientRect().top +
            viewport.scrollTop
        : 0;
    },
    scrollTo(targetTop, behavior = 'smooth') {
      viewport.scrollTo({
        top: targetTop,
        left: 0,
        behavior,
      });
    },
    scrollBackwardTo(targetTop, behavior = 'smooth') {
      performInvisibleRebase(viewport.scrollTop + cycleHeight);
      window.requestAnimationFrame(() => {
        viewport.scrollTo({
          top: targetTop,
          left: 0,
          behavior,
        });
      });
    },
    cleanup() {
      const logicalTop = Math.max(0, viewport.scrollTop - middleStart);
      viewport.removeEventListener('scroll', schedulePositionCheck);
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('load', scheduleMeasure);
      resizeObserver?.disconnect();
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      originalParent.insertBefore(main, originalNextSibling);
      viewport.remove();
      document.documentElement.classList.remove('has-infinite-scroll');
      document.body.classList.remove('has-infinite-scroll');
      document.body.style.removeProperty('--vertical-loop-cycle-height');
      document.documentElement.classList.remove('is-loop-repositioning');
      window.scrollTo(0, logicalTop);
    },
  };
}

function initializeSectionSnapping(instructions, circularLoop) {
  const originalMain = document.querySelector('main#top');
  const sections = Array.from(
    originalMain?.querySelectorAll(SECTION_SELECTOR) ?? []
  );
  if (sections.length === 0) return null;

  const scrollSurface = circularLoop?.surface ?? window;
  const instructionIndex = sections.indexOf(instructions?.section);
  let currentSectionIndex = 0;
  let navigationLocked = false;
  let unlockTimer = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchDirection = 0;
  let touchIsControlled = false;
  let touchAxisLocked = '';
  let touchDeltaY = 0;
  let touchStartedInInstructions = false;
  let instructionScrubStarted = false;
  let instructionTouchStartLeft = 0;
  let instructionTouchStartIndex = 0;
  let instructionBoundaryOverflow = 0;

  function currentScrollTop() {
    return circularLoop
      ? circularLoop.scrollTop()
      : window.scrollY + headerOffset();
  }

  function sectionTop(section) {
    return circularLoop
      ? circularLoop.sectionTarget(section)
      : Math.max(0, section.offsetTop - headerOffset());
  }

  function nearestSectionIndex() {
    const currentTop = currentScrollTop();
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    sections.forEach((section, index) => {
      const distance = Math.abs(sectionTop(section) - currentTop);
      if (distance < nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    });

    return nearest;
  }

  function lockNavigation(duration = 650) {
    navigationLocked = true;
    window.clearTimeout(unlockTimer);
    unlockTimer = window.setTimeout(() => {
      navigationLocked = false;
    }, duration);
  }

  function scrollToTarget(targetTop) {
    if (circularLoop) {
      circularLoop.scrollTo(
        targetTop,
        reducedMotionQuery.matches ? 'auto' : 'smooth'
      );
      return;
    }

    window.scrollTo({
      top: targetTop,
      left: 0,
      behavior: reducedMotionQuery.matches ? 'auto' : 'smooth',
    });
  }

  function moveToSection(index, direction) {
    const nextIndex = Math.max(0, Math.min(sections.length - 1, index));
    if (nextIndex === instructionIndex && nextIndex !== currentSectionIndex) {
      if (direction > 0) instructions?.first();
      if (direction < 0) instructions?.last();
    }

    currentSectionIndex = nextIndex;
    lockNavigation();
    scrollToTarget(sectionTop(sections[nextIndex]));
  }

  function moveThroughLoop(direction) {
    if (!circularLoop) return false;
    lockNavigation(760);
    if (direction > 0) {
      scrollToTarget(circularLoop.nextHeroTarget());
    } else {
      currentSectionIndex = sections.length - 1;
      circularLoop.scrollBackwardTo(
        sectionTop(sections[currentSectionIndex]),
        reducedMotionQuery.matches ? 'auto' : 'smooth'
      );
    }
    return true;
  }

  function stepPage(direction) {
    if (navigationLocked || interactionBlocksPageNavigation()) return false;

    currentSectionIndex = nearestSectionIndex();

    if (
      currentSectionIndex === instructionIndex &&
      instructions?.step(direction)
    ) {
      lockNavigation(500);
      return true;
    }

    if (direction > 0 && currentSectionIndex === sections.length - 1) {
      return moveThroughLoop(1);
    }

    if (direction < 0 && currentSectionIndex === 0) {
      return moveThroughLoop(-1);
    }
    moveToSection(currentSectionIndex + direction, direction);
    return true;
  }

  function onWheel(event) {
    if (
      reducedMotionQuery.matches ||
      event.ctrlKey ||
      Math.abs(event.deltaY) < 18 ||
      event.target.closest('.updates-carousel')
    ) {
      return;
    }

    event.preventDefault();
    stepPage(event.deltaY > 0 ? 1 : -1);
  }

  function onKeyDown(event) {
    if (
      reducedMotionQuery.matches ||
      interactionBlocksPageNavigation()
    ) {
      return;
    }

    if (
      event.code === 'Space' &&
      event.target instanceof Element &&
      event.target.closest('a, button, [role="button"]')
    ) {
      return;
    }

    const nextKeys = ['ArrowDown', 'PageDown', 'Space'];
    const previousKeys = ['ArrowUp', 'PageUp'];
    if (nextKeys.includes(event.code)) {
      event.preventDefault();
      stepPage(1);
    } else if (previousKeys.includes(event.code)) {
      event.preventDefault();
      stepPage(-1);
    }
  }

  function onTouchStart(event) {
    touchStartX = event.touches[0]?.clientX ?? 0;
    touchStartY = event.touches[0]?.clientY ?? 0;
    touchDirection = 0;
    touchIsControlled = false;
    touchAxisLocked = '';
    touchDeltaY = 0;
    instructionScrubStarted = false;
    instructionBoundaryOverflow = 0;
    touchStartedInInstructions =
      instructionIndex >= 0 &&
      nearestSectionIndex() === instructionIndex;
  }

  function onTouchMove(event) {
    if (
      reducedMotionQuery.matches ||
      interactionBlocksPageNavigation() ||
      event.target.closest('.updates-carousel')
    ) {
      return;
    }

    const currentX = event.touches[0]?.clientX ?? touchStartX;
    const currentY = event.touches[0]?.clientY ?? touchStartY;
    const deltaX = touchStartX - currentX;
    const deltaY = touchStartY - currentY;
    if (!touchAxisLocked && Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= 10) {
      touchAxisLocked =
        Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
    }
    if (touchAxisLocked !== 'vertical' || Math.abs(deltaY) < 12) return;

    event.preventDefault();
    touchDirection = deltaY > 0 ? 1 : -1;
    touchDeltaY = deltaY;
    touchIsControlled = true;

    if (touchStartedInInstructions && instructions) {
      if (!instructionScrubStarted) {
        const startState = instructions.beginTouchScrub();
        instructionTouchStartLeft = startState.left;
        instructionTouchStartIndex = startState.index;
        instructionScrubStarted = true;
      }

      const boundary = instructions.scrubTo(
        instructionTouchStartLeft + deltaY * 1.08
      );
      instructionBoundaryOverflow =
        touchDirection > 0 ? boundary.afterEnd : boundary.beforeStart;
    }
  }

  function onTouchEnd() {
    if (!touchIsControlled) {
      touchStartedInInstructions = false;
      instructionScrubStarted = false;
      return;
    }
    const direction = touchDirection;
    const distance = Math.abs(touchDeltaY);
    const wasInstructionScrub =
      touchStartedInInstructions && instructionScrubStarted && instructions;
    const shouldLeaveInstructions =
      wasInstructionScrub &&
      distance >= 60 &&
      instructionBoundaryOverflow >= 28 &&
      ((direction > 0 &&
        instructionTouchStartIndex === instructions.lastIndex) ||
        (direction < 0 && instructionTouchStartIndex === 0));

    touchIsControlled = false;
    touchStartedInInstructions = false;
    instructionScrubStarted = false;

    if (wasInstructionScrub) {
      instructions.finishTouchScrub(
        direction,
        instructionTouchStartIndex,
        distance
      );
      if (navigationLocked) return;
      if (shouldLeaveInstructions) {
        stepPage(direction);
      } else {
        lockNavigation(420);
      }
      return;
    }

    if (navigationLocked) return;
    stepPage(direction);
  }

  function onTouchCancel() {
    if (instructionScrubStarted && instructions) {
      instructions.finishTouchScrub(
        touchDirection || 1,
        instructionTouchStartIndex,
        0
      );
    }
    touchIsControlled = false;
    touchStartedInInstructions = false;
    instructionScrubStarted = false;
  }

  function onResize() {
    currentSectionIndex = nearestSectionIndex();
  }

  scrollSurface.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKeyDown);
  scrollSurface.addEventListener('touchstart', onTouchStart, { passive: true });
  scrollSurface.addEventListener('touchmove', onTouchMove, { passive: false });
  scrollSurface.addEventListener('touchend', onTouchEnd, { passive: true });
  scrollSurface.addEventListener('touchcancel', onTouchCancel, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

  return {
    stepPage,
    cleanup() {
      scrollSurface.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      scrollSurface.removeEventListener('touchstart', onTouchStart);
      scrollSurface.removeEventListener('touchmove', onTouchMove);
      scrollSurface.removeEventListener('touchend', onTouchEnd);
      scrollSurface.removeEventListener('touchcancel', onTouchCancel);
      window.removeEventListener('resize', onResize);
      window.clearTimeout(unlockTimer);
    },
  };
}

function initializeAnchorNavigation(instructions, circularLoop) {
  const links = Array.from(document.querySelectorAll('a[href^="#"]'));
  const listeners = [];

  links.forEach((link) => {
    const onClick = (event) => {
      const selector = link.getAttribute('href');
      if (!selector || selector === '#') return;
      const target = document.querySelector(selector);
      if (!target) return;

      event.preventDefault();
      if (target.id === 'instructions') instructions?.first();

      const navigate = () => {
        if (circularLoop) {
          circularLoop.scrollTo(
            circularLoop.sectionTarget(target),
            reducedMotionQuery.matches ? 'auto' : 'smooth'
          );
        } else {
          window.scrollTo({
            top: Math.max(0, target.offsetTop - headerOffset()),
            left: 0,
            behavior: reducedMotionQuery.matches ? 'auto' : 'smooth',
          });
        }
      };

      navigate();
    };

    link.addEventListener('click', onClick);
    listeners.push(() => link.removeEventListener('click', onClick));
  });

  return () => listeners.forEach((removeListener) => removeListener());
}

function initializeUpdatesCarousel() {
  const track = document.querySelector('main#top .updates-track');
  const viewport = document.querySelector('main#top .updates-viewport');
  if (!track || !viewport) return null;

  let updateOffset = 0;
  let lastFrame = 0;
  let animationFrame = 0;
  let paused = reducedMotionQuery.matches;
  let dragging = false;
  let dragStartY = 0;
  let resumeTimer = 0;
  const speed = 30;

  function gap() {
    return Number.parseFloat(window.getComputedStyle(track).gap) || 0;
  }

  function cardStep(card) {
    return card ? card.getBoundingClientRect().height + gap() : 0;
  }

  function applyOffset() {
    track.style.transform = `translateY(${-updateOffset}px)`;
  }

  function normalize() {
    let first = track.firstElementChild;
    let firstStep = cardStep(first);
    while (first && firstStep > 0 && updateOffset >= firstStep) {
      updateOffset -= firstStep;
      track.appendChild(first);
      first = track.firstElementChild;
      firstStep = cardStep(first);
    }

    while (updateOffset < 0) {
      const last = track.lastElementChild;
      const lastStep = cardStep(last);
      if (!last || lastStep <= 0) break;
      track.prepend(last);
      updateOffset += lastStep;
    }
  }

  function moveBy(delta) {
    updateOffset += delta;
    normalize();
    applyOffset();
  }

  function pause() {
    paused = true;
    window.clearTimeout(resumeTimer);
  }

  function resumeSoon(delay = 900) {
    if (reducedMotionQuery.matches) return;
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      if (!dragging) paused = false;
    }, delay);
  }

  function animate(timestamp) {
    animationFrame = 0;
    if (!lastFrame) lastFrame = timestamp;
    const elapsed = timestamp - lastFrame;
    lastFrame = timestamp;
    if (!paused && !dragging) moveBy((speed * elapsed) / 1000);
    if (!reducedMotionQuery.matches) {
      animationFrame = window.requestAnimationFrame(animate);
    }
  }

  function startAnimation() {
    if (animationFrame || reducedMotionQuery.matches) return;
    lastFrame = 0;
    animationFrame = window.requestAnimationFrame(animate);
  }

  function onWheel(event) {
    if (Math.abs(event.deltaY) < 8 || event.ctrlKey) return;
    event.preventDefault();
    event.stopPropagation();
    pause();
    moveBy(event.deltaY * 0.9);
    resumeSoon();
  }

  function onPointerDown(event) {
    dragging = true;
    dragStartY = event.clientY;
    pause();
    track.classList.add('is-dragging');
    viewport.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (!dragging) return;
    const delta = event.clientY - dragStartY;
    dragStartY = event.clientY;
    moveBy(-delta);
  }

  function finishDrag(event) {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
    if (viewport.hasPointerCapture?.(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
    resumeSoon();
  }

  function onReducedMotionChange(event) {
    paused = event.matches;
    if (event.matches) {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    } else {
      resumeSoon(0);
      startAnimation();
    }
  }

  function onMouseLeave() {
    resumeSoon(120);
  }

  viewport.addEventListener('wheel', onWheel, { passive: false });
  viewport.addEventListener('pointerdown', onPointerDown);
  viewport.addEventListener('pointermove', onPointerMove);
  viewport.addEventListener('pointerup', finishDrag);
  viewport.addEventListener('pointercancel', finishDrag);
  viewport.addEventListener('mouseenter', pause);
  viewport.addEventListener('mouseleave', onMouseLeave);
  reducedMotionQuery.addEventListener?.('change', onReducedMotionChange);
  applyOffset();
  startAnimation();

  return () => {
    viewport.removeEventListener('wheel', onWheel);
    viewport.removeEventListener('pointerdown', onPointerDown);
    viewport.removeEventListener('pointermove', onPointerMove);
    viewport.removeEventListener('pointerup', finishDrag);
    viewport.removeEventListener('pointercancel', finishDrag);
    viewport.removeEventListener('mouseenter', pause);
    viewport.removeEventListener('mouseleave', onMouseLeave);
    reducedMotionQuery.removeEventListener?.('change', onReducedMotionChange);
    window.clearTimeout(resumeTimer);
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
  };
}

registerCleanup(initializeDownloadFeedback());

const instructions = initializeInstructionHorizontalScroll();
registerCleanup(instructions?.cleanup);

const circularLoop = initializeCircularVerticalScroll();
registerCleanup(circularLoop?.cleanup);

const sectionSnapping = initializeSectionSnapping(instructions, circularLoop);
registerCleanup(sectionSnapping?.cleanup);
registerCleanup(initializeAnchorNavigation(instructions, circularLoop));
registerCleanup(initializeUpdatesCarousel());

window.addEventListener('pagehide', (event) => {
  if (event.persisted) return;
  cleanupCallbacks.splice(0).forEach((cleanup) => cleanup());
});
