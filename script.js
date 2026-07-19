document.documentElement.classList.add('js');

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
const cleanupCallbacks = [];
let activeLenis = null;
let completeActiveThemeTransition = null;

function registerCleanup(callback) {
  if (typeof callback === 'function') cleanupCallbacks.push(callback);
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function listen(target, eventName, handler, options) {
  target.addEventListener(eventName, handler, options);
  return () => target.removeEventListener(eventName, handler, options);
}

function initializeThemeToggle() {
  const toggle = document.querySelector('.theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  let transitionInProgress = false;
  if (!toggle) return null;

  function storedTheme() {
    try {
      return localStorage.getItem('snapstat-theme');
    } catch {
      return null;
    }
  }

  function applyTheme(theme, persist = false) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = nextTheme;
    toggle.checked = nextTheme === 'dark';
    toggle.setAttribute(
      'aria-label',
      `Switch to ${nextTheme === 'dark' ? 'light' : 'dark'} mode`
    );
    toggle.setAttribute(
      'title',
      `Switch to ${nextTheme === 'dark' ? 'light' : 'dark'} mode`
    );
    themeMeta?.setAttribute(
      'content',
      nextTheme === 'dark' ? '#111421' : '#e8eeff'
    );
    if (persist) {
      try {
        localStorage.setItem('snapstat-theme', nextTheme);
      } catch {
        // The visual toggle still works when storage is unavailable.
      }
    }
  }

  function transitionToTheme(theme) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    const currentTheme = document.documentElement.dataset.theme === 'dark'
      ? 'dark'
      : 'light';

    if (transitionInProgress || nextTheme === currentTheme) {
      toggle.checked = currentTheme === 'dark';
      return;
    }

    if (reducedMotionQuery.matches) {
      applyTheme(nextTheme, true);
      return;
    }

    transitionInProgress = true;
    toggle.checked = nextTheme === 'dark';
    const directionClass = nextTheme === 'dark'
      ? 'theme-to-dark'
      : 'theme-to-light';
    let finished = false;
    let safetyTimer = 0;
    let startTimer = 0;
    let activeViewTransition = null;
    let transitionLayer = null;
    let fallbackWipe = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(safetyTimer);
      window.clearTimeout(startTimer);
      document.documentElement.classList.remove(directionClass);
      transitionInProgress = false;
      completeActiveThemeTransition = null;
    };

    const completeForInteraction = () => {
      if (finished) return;
      window.clearTimeout(startTimer);
      activeViewTransition?.skipTransition?.();
      fallbackWipe?.cancel();
      applyTheme(nextTheme, true);
      transitionLayer?.remove();
      finish();
    };

    completeActiveThemeTransition = completeForInteraction;

    const beginWipe = () => {
      startTimer = 0;
      document.documentElement.classList.add(directionClass);

      if (typeof document.startViewTransition === 'function') {
        activeViewTransition = document.startViewTransition(() => {
          applyTheme(nextTheme, true);
        });
        safetyTimer = window.setTimeout(() => {
          completeForInteraction();
        }, 1400);
        activeViewTransition.finished.then(finish, () => {
          applyTheme(nextTheme, true);
          finish();
        });
        return;
      }

      transitionLayer = document.createElement('div');
      transitionLayer.className = `theme-transition-layer is-${nextTheme}`;
      transitionLayer.setAttribute('aria-hidden', 'true');
      document.body.append(transitionLayer);
      const darkKeyframes = [
        { clipPath: 'polygon(0 0, 0 0, 0 0, 0 0)', offset: 0 },
        { clipPath: 'polygon(0 0, 100% 0, 0 100%, 0 100%)', offset: 0.5 },
        { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', offset: 1 },
      ];
      const lightKeyframes = [
        { clipPath: 'polygon(100% 100%, 100% 100%, 100% 100%, 100% 100%)', offset: 0 },
        { clipPath: 'polygon(100% 100%, 0 100%, 100% 0, 100% 0)', offset: 0.5 },
        { clipPath: 'polygon(0 0, 0 100%, 100% 100%, 100% 0)', offset: 1 },
      ];
      fallbackWipe = transitionLayer.animate(
        nextTheme === 'dark' ? darkKeyframes : lightKeyframes,
        { duration: 760, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' }
      );

      fallbackWipe.finished.then(() => {
        applyTheme(nextTheme, true);
        return transitionLayer.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          { duration: 140, easing: 'ease-out', fill: 'forwards' }
        ).finished;
      }).then(() => {
        transitionLayer.remove();
        finish();
      }, () => {
        applyTheme(nextTheme, true);
        transitionLayer?.remove();
        finish();
      });
    };

    startTimer = window.setTimeout(beginWipe, 330);
  }

  function onToggle() {
    transitionToTheme(toggle.checked ? 'dark' : 'light');
  }

  function onSystemThemeChange(event) {
    if (storedTheme()) return;
    applyTheme(event.matches ? 'dark' : 'light');
  }

  applyTheme(
    document.documentElement.dataset.theme ||
      (systemTheme.matches ? 'dark' : 'light')
  );
  toggle.addEventListener('change', onToggle);
  systemTheme.addEventListener?.('change', onSystemThemeChange);

  return () => {
    toggle.removeEventListener('change', onToggle);
    systemTheme.removeEventListener?.('change', onSystemThemeChange);
  };
}

function initializePreloader() {
  let loaded = false;
  let revealTimer = 0;

  function revealSite() {
    if (loaded) return;
    loaded = true;
    window.clearTimeout(revealTimer);
    document.body.classList.add('is-loaded');
    document.body.classList.remove('is-loading');

    window.requestAnimationFrame(() => {
      document
        .querySelectorAll('.hero .reveal, .hero .split-text')
        .forEach((element) => element.classList.add('is-visible'));
    });
  }

  const onLoad = () => {
    revealTimer = window.setTimeout(revealSite, reducedMotionQuery.matches ? 0 : 2200);
  };

  if (document.readyState === 'complete') {
    onLoad();
  } else {
    window.addEventListener('load', onLoad, { once: true });
  }

  const fallbackTimer = window.setTimeout(revealSite, 4600);

  return () => {
    window.removeEventListener('load', onLoad);
    window.clearTimeout(revealTimer);
    window.clearTimeout(fallbackTimer);
  };
}

function initializeSplitText() {
  const targets = Array.from(document.querySelectorAll('.split-text'));

  targets.forEach((target) => {
    if (target.dataset.splitReady === 'true') return;
    const walker = document.createTreeWalker(
      target,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          return node.textContent.trim()
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        },
      }
    );
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((textNode) => {
      const fragment = document.createDocumentFragment();
      textNode.textContent.split(/(\s+)/).forEach((part) => {
        if (!part.trim()) {
          fragment.appendChild(document.createTextNode(part));
          return;
        }

        const word = document.createElement('span');
        const inner = document.createElement('span');
        word.className = 'word';
        inner.textContent = part;
        word.appendChild(inner);
        fragment.appendChild(word);
      });
      textNode.replaceWith(fragment);
    });

    target.dataset.splitReady = 'true';
  });
}

function initializeRevealObserver() {
  const targets = Array.from(
    document.querySelectorAll('.reveal, .split-text:not(.display-title)')
  );

  if (
    reducedMotionQuery.matches ||
    typeof IntersectionObserver !== 'function'
  ) {
    targets.forEach((target) => target.classList.add('is-visible'));
    return null;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: '0px 0px -8% 0px',
    }
  );

  targets.forEach((target) => observer.observe(target));
  return () => observer.disconnect();
}

function initializeMenu() {
  const button = document.querySelector('.menu-toggle');
  const overlay = document.querySelector('.menu-overlay');
  const links = Array.from(overlay?.querySelectorAll('a') ?? []);
  const header = document.querySelector('.site-header');
  if (!button || !overlay) return null;
  let focusTimer = 0;

  function setOpen(open) {
    window.clearTimeout(focusTimer);
    focusTimer = 0;
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close site menu' : 'Open site menu');
    overlay.classList.toggle('is-open', open);
    overlay.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('menu-open', open);
    window.dispatchEvent(
      new CustomEvent('snapstat:menu-toggle', { detail: { open } })
    );
    if (open) {
      header?.classList.remove('is-hidden');
      focusTimer = window.setTimeout(() => {
        links[0]?.focus();
        focusTimer = 0;
      }, 120);
    }
  }

  function onButtonClick() {
    completeActiveThemeTransition?.();
    setOpen(button.getAttribute('aria-expanded') !== 'true');
  }

  function onButtonPointerDown() {
    /* A full-page theme snapshot can visually cover live interface changes.
       Finish it as soon as the user reaches for the menu control. */
    completeActiveThemeTransition?.();
  }

  function onKeyDown(event) {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      button.focus();
    }
  }

  const removers = [
    listen(button, 'pointerdown', onButtonPointerDown),
    listen(button, 'click', onButtonClick),
    listen(window, 'keydown', onKeyDown),
    ...links.map((link) => listen(link, 'click', () => setOpen(false))),
  ];

  return () => {
    setOpen(false);
    window.clearTimeout(focusTimer);
    removers.forEach((remove) => remove());
  };
}

function initializeAnimationBridge() {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const Lenis = window.Lenis;

  if (
    reducedMotionQuery.matches ||
    !gsap ||
    !ScrollTrigger ||
    !Lenis
  ) {
    return null;
  }

  gsap.registerPlugin(ScrollTrigger);
  const touchDevice =
    'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const iosDevice =
    /iP(?:ad|hone|od)/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const iosVersionMatch = navigator.userAgent.match(/(?:OS|Version) (\d+)[._]/);
  const iosMajorVersion = iosVersionMatch
    ? Number.parseInt(iosVersionMatch[1], 10)
    : null;
  /* Modern touch devices use the same interpolated scroll value as the
     pinned scenes, so cards follow the finger instead of catching up in a
     visible step. Legacy iOS keeps its safe native-scroll fallback. */
  const synchronizeTouch =
    touchDevice && (!iosDevice || iosMajorVersion === null || iosMajorVersion >= 16);
  const lenis = new Lenis({
    autoRaf: false,
    duration: 1.05,
    easing: (value) => 1 - Math.pow(1 - value, 3),
    lerp: 0.105,
    smoothWheel: true,
    syncTouch: synchronizeTouch,
    syncTouchLerp: 0.11,
    touchInertiaExponent: 1.65,
    wheelMultiplier: touchDevice ? 0.6 : 0.85,
    touchMultiplier: 1,
    anchors: false,
    stopInertiaOnNavigate: true,
    prevent: (node) =>
      node instanceof Element &&
      Boolean(node.closest('[data-lenis-prevent], .menu-overlay')),
  });
  activeLenis = lenis;

  const updateScrollTrigger = () => {
    ScrollTrigger.update();
    window.dispatchEvent(new Event('snapstat:smooth-scroll'));
  };
  const tickerCallback = (time) => lenis.raf(time * 1000);
  const onMenuToggle = (event) => {
    if (event.detail?.open) lenis.stop();
    else lenis.start();
  };
  const onReducedMotionChange = (event) => {
    if (event.matches) lenis.stop();
    else lenis.start();
  };
  const onLoad = () => ScrollTrigger.refresh();

  lenis.on('scroll', updateScrollTrigger);
  gsap.ticker.add(tickerCallback);
  gsap.ticker.lagSmoothing(0);
  window.addEventListener('snapstat:menu-toggle', onMenuToggle);
  window.addEventListener('load', onLoad, { once: true });
  reducedMotionQuery.addEventListener?.('change', onReducedMotionChange);

  return () => {
    window.removeEventListener('snapstat:menu-toggle', onMenuToggle);
    window.removeEventListener('load', onLoad);
    reducedMotionQuery.removeEventListener?.('change', onReducedMotionChange);
    lenis.off?.('scroll', updateScrollTrigger);
    gsap.ticker.remove(tickerCallback);
    gsap.ticker.lagSmoothing(500, 33);
    lenis.destroy();
    if (activeLenis === lenis) activeLenis = null;
  };
}

function initializeHeaderMotion() {
  const header = document.querySelector('.site-header');
  if (!header) return null;

  let lastScroll = window.scrollY;
  let scheduled = false;

  function update() {
    scheduled = false;
    const currentScroll = window.scrollY;
    if (document.body.classList.contains('is-navigating')) {
      header.classList.remove('is-hidden');
      lastScroll = currentScroll;
      return;
    }
    const movingDown = currentScroll > lastScroll;
    header.classList.toggle(
      'is-hidden',
      movingDown && currentScroll > window.innerHeight * 0.6
    );
    lastScroll = currentScroll;
  }

  function onScroll() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}

function initializeScrollScenes() {
  const storySection = document.querySelector('.horizontal-story');
  const storySticky = storySection?.querySelector('.story-sticky');
  const storyTrack = storySection?.querySelector('.story-track');
  const storyCards = Array.from(storyTrack?.querySelectorAll('.story-card') ?? []);
  const storyProgress = storySection?.querySelector('.story-progress span');

  const instructionSection = document.querySelector('.instructions');
  const instructionSticky = instructionSection?.querySelector(
    '.instructions-sticky'
  );
  const instructionCards = Array.from(
    instructionSection?.querySelectorAll('.instruction-card') ?? []
  );
  const instructionProgress = instructionSection?.querySelector(
    '.instruction-progress span'
  );
  const heroDevice = document.querySelector('.hero-device');
  const heroGrid = document.querySelector('.hero-grid');
  const customizeVisual = document.querySelector('.customize-visual');
  const paperImage = document.querySelector('.paper-stage > img');
  const touchLayout =
    'ontouchstart' in window || navigator.maxTouchPoints > 0;

  let frame = 0;
  let stableViewportWidth = window.innerWidth;
  let stableViewportHeight = window.innerHeight;

  function refreshViewportMetrics() {
    const widthChanged =
      Math.abs(window.innerWidth - stableViewportWidth) > 2;
    /* On phones, browser chrome creates height-only resize events while the
       user scrolls. Ignore those transient changes; a width change still
       refreshes both values for rotation and real layout resizing. */
    if (!touchLayout || widthChanged) {
      stableViewportHeight = window.innerHeight;
    }
    stableViewportWidth = window.innerWidth;
  }

  function sectionProgress(section, stickyViewport) {
    if (!section) return 0;
    const rect = section.getBoundingClientRect();
    /* The sticky element uses 100svh, which stays stable while mobile browser
       chrome expands or collapses. Reading its rendered height prevents a
       height-only viewport resize from jumping the scene forward. */
    const pinnedHeight = stickyViewport?.offsetHeight || window.innerHeight;
    const travel = Math.max(1, section.offsetHeight - pinnedHeight);
    return clamp(-rect.top / travel);
  }

  function updateStory() {
    if (!storySection || !storySticky || !storyTrack) return;
    const progress = sectionProgress(storySection, storySticky);
    const firstCard = storyCards[0];
    const lastCard = storyCards[storyCards.length - 1];
    const startTranslation = firstCard
      ? window.innerWidth / 2 -
        (storyTrack.offsetLeft + firstCard.offsetLeft + firstCard.offsetWidth / 2)
      : 0;
    const endTranslation = lastCard
      ? window.innerWidth / 2 -
        (storyTrack.offsetLeft + lastCard.offsetLeft + lastCard.offsetWidth / 2)
      : -Math.max(0, storyTrack.scrollWidth - storySticky.clientWidth);
    const translation =
      startTranslation + (endTranslation - startTranslation) * progress;
    storyTrack.style.transform = `translate3d(${translation.toFixed(2)}px, 0, 0)`;
    if (storyProgress) {
      storyProgress.style.transform = `scaleX(${progress.toFixed(4)})`;
    }

    const viewportCenter = window.innerWidth / 2;
    storyCards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const normalizedDistance = clamp(
        Math.abs(cardCenter - viewportCenter) / window.innerWidth,
        0,
        1
      );
      const direction = clamp(
        (cardCenter - viewportCenter) / window.innerWidth,
        -1,
        1
      );
      const scale = 1 - normalizedDistance * 0.055;
      card.style.opacity = String(1 - normalizedDistance * 0.38);
      card.style.transform = `perspective(1200px) rotateY(${(-direction * 3.8).toFixed(2)}deg) scale(${scale.toFixed(4)})`;
    });
  }

  function updateInstructions() {
    if (!instructionSection || instructionCards.length === 0) return;
    const progress = sectionProgress(instructionSection, instructionSticky);
    const position = progress * (instructionCards.length - 1);
    if (instructionProgress) {
      instructionProgress.style.transform = `scaleX(${progress.toFixed(4)})`;
    }

    instructionCards.forEach((card, index) => {
      const delta = index - position;
      const distance = Math.abs(delta);
      const opacity = clamp(1 - distance * 0.7);
      const scale = 1 - Math.min(0.16, distance * 0.075);
      const translateY = delta * 72;
      const translateZ = -distance * 125;
      const rotateX = delta * -3.2;

      card.classList.toggle('is-active', distance < 0.48);
      card.style.zIndex = String(100 - Math.round(distance * 10));
      card.style.opacity = opacity.toFixed(4);
      card.style.transform =
        `translate3d(0, ${translateY.toFixed(2)}px, ${translateZ.toFixed(2)}px) ` +
        `rotateX(${rotateX.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      card.style.pointerEvents = distance < 0.55 ? 'auto' : 'none';
    });
  }

  function updateParallax() {
    const scroll = window.scrollY;
    if (heroDevice) {
      heroDevice.style.transform = `translate3d(0, ${(scroll * 0.09).toFixed(2)}px, 0)`;
    }
    if (heroGrid) {
      heroGrid.style.transform = `translate3d(0, ${(scroll * 0.035).toFixed(2)}px, 0)`;
    }

    [
      [customizeVisual, -0.055],
      [paperImage, -0.04],
    ].forEach(([element, speed]) => {
      if (!(element instanceof HTMLElement)) return;
      const rect = element.getBoundingClientRect();
      const centerOffset =
        rect.top + rect.height / 2 - stableViewportHeight / 2;
      element.style.setProperty(
        '--scroll-parallax',
        `${(centerOffset * speed).toFixed(2)}px`
      );
    });
  }

  function render() {
    frame = 0;
    if (reducedMotionQuery.matches) return;
    updateStory();
    updateInstructions();
    updateParallax();
  }

  function schedule() {
    if (frame) return;
    frame = window.requestAnimationFrame(render);
  }

  function onResize() {
    refreshViewportMetrics();
    schedule();
  }

  function clearMotionStyles() {
    if (storyTrack) storyTrack.style.removeProperty('transform');
    if (storyProgress) storyProgress.style.removeProperty('transform');
    storyCards.forEach((card) => {
      card.style.removeProperty('opacity');
      card.style.removeProperty('transform');
    });
    if (instructionProgress) {
      instructionProgress.style.removeProperty('transform');
    }
    instructionCards.forEach((card) => {
      card.style.removeProperty('z-index');
      card.style.removeProperty('opacity');
      card.style.removeProperty('transform');
      card.style.removeProperty('pointer-events');
    });
    heroDevice?.style.removeProperty('transform');
    heroGrid?.style.removeProperty('transform');
  }

  function onReducedMotionChange(event) {
    if (event.matches) clearMotionStyles();
    else schedule();
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('snapstat:smooth-scroll', schedule);
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('load', schedule, { once: true });
  reducedMotionQuery.addEventListener?.('change', onReducedMotionChange);
  schedule();

  return () => {
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('snapstat:smooth-scroll', schedule);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('load', schedule);
    reducedMotionQuery.removeEventListener?.('change', onReducedMotionChange);
    if (frame) window.cancelAnimationFrame(frame);
    clearMotionStyles();
  };
}

function initializePointerEffects() {
  if (!finePointerQuery.matches || reducedMotionQuery.matches) return null;

  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  const magneticElements = Array.from(document.querySelectorAll('.magnetic'));
  const tiltCards = Array.from(document.querySelectorAll('.tilt-card'));
  if (!(dot instanceof HTMLElement) || !(ring instanceof HTMLElement)) {
    return null;
  }

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let ringX = targetX;
  let ringY = targetY;
  let animationFrame = 0;

  function animateCursor() {
    ringX += (targetX - ringX) * 0.16;
    ringY += (targetY - ringY) * 0.16;
    dot.style.transform = `translate3d(${(targetX - 3.5).toFixed(2)}px, ${(targetY - 3.5).toFixed(2)}px, 0)`;
    ring.style.transform = `translate3d(${(ringX - ring.offsetWidth / 2).toFixed(2)}px, ${(ringY - ring.offsetHeight / 2).toFixed(2)}px, 0)`;
    animationFrame = window.requestAnimationFrame(animateCursor);
  }

  function onPointerMove(event) {
    targetX = event.clientX;
    targetY = event.clientY;
  }

  const removers = [listen(window, 'pointermove', onPointerMove)];

  magneticElements.forEach((element) => {
    const onMove = (event) => {
      const bounds = element.getBoundingClientRect();
      const x = (event.clientX - (bounds.left + bounds.width / 2)) * 0.16;
      const y = (event.clientY - (bounds.top + bounds.height / 2)) * 0.2;
      element.style.setProperty('--magnetic-x', `${x.toFixed(2)}px`);
      element.style.setProperty('--magnetic-y', `${y.toFixed(2)}px`);
      document.body.classList.add('cursor-active');
    };
    const onLeave = () => {
      element.style.setProperty('--magnetic-x', '0px');
      element.style.setProperty('--magnetic-y', '0px');
      document.body.classList.remove('cursor-active');
    };
    removers.push(
      listen(element, 'pointermove', onMove),
      listen(element, 'pointerleave', onLeave)
    );
  });

  tiltCards.forEach((card) => {
    const onMove = (event) => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / Math.max(1, bounds.width) - 0.5;
      const y = (event.clientY - bounds.top) / Math.max(1, bounds.height) - 0.5;
      card.style.setProperty('--tilt-x', `${(-y * 7).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${(x * 8).toFixed(2)}deg`);
    };
    const onLeave = () => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    };
    removers.push(
      listen(card, 'pointermove', onMove),
      listen(card, 'pointerleave', onLeave)
    );
  });

  animationFrame = window.requestAnimationFrame(animateCursor);

  return () => {
    removers.forEach((remove) => remove());
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    document.body.classList.remove('cursor-active');
    magneticElements.forEach((element) => {
      element.style.removeProperty('--magnetic-x');
      element.style.removeProperty('--magnetic-y');
    });
    tiltCards.forEach((card) => {
      card.style.removeProperty('--tilt-x');
      card.style.removeProperty('--tilt-y');
    });
  };
}

function initializeImageZoom() {
  if (!finePointerQuery.matches) return null;

  const figures = Array.from(document.querySelectorAll('[data-zoomable]'));
  const removers = [];

  figures.forEach((figure) => {
    const image = figure.querySelector('img');
    const preview = figure.querySelector('.image-zoom-preview');
    if (!(image instanceof HTMLImageElement) || !(preview instanceof HTMLElement)) {
      return;
    }

    const syncImage = () => {
      preview.style.backgroundImage = `url("${image.currentSrc || image.src}")`;
    };

    const onPointerEnter = () => {
      syncImage();
      figure.classList.add('is-zooming');
    };

    const onPointerMove = (event) => {
      const bounds = image.getBoundingClientRect();
      const x = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width));
      const y = clamp((event.clientY - bounds.top) / Math.max(1, bounds.height));
      const safeX = clamp(x, 0.12, 0.88);
      const safeY = clamp(y, 0.12, 0.88);

      figure.style.setProperty('--zoom-left', `${(safeX * 100).toFixed(2)}%`);
      figure.style.setProperty('--zoom-top', `${(safeY * 100).toFixed(2)}%`);
      preview.style.backgroundPosition = `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`;
    };

    const onPointerLeave = () => figure.classList.remove('is-zooming');

    removers.push(
      listen(figure, 'pointerenter', onPointerEnter),
      listen(figure, 'pointermove', onPointerMove),
      listen(figure, 'pointerleave', onPointerLeave),
      listen(image, 'load', syncImage)
    );
    syncImage();
  });

  return () => {
    removers.forEach((remove) => remove());
    figures.forEach((figure) => {
      figure.classList.remove('is-zooming');
      figure.style.removeProperty('--zoom-left');
      figure.style.removeProperty('--zoom-top');
    });
  };
}

function initializeMobileImageViewer() {
  const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)');
  const viewer = document.querySelector('.mobile-image-viewer');
  const viewerImage = viewer?.querySelector('img');
  const closeButton = viewer?.querySelector('.mobile-image-viewer-close');
  const triggers = Array.from(document.querySelectorAll('[data-mobile-lightbox]'));
  if (
    !coarsePointer.matches ||
    !viewer ||
    !viewerImage ||
    !closeButton ||
    triggers.length === 0
  ) {
    return null;
  }

  let returnFocus = null;

  function closeViewer() {
    viewer.hidden = true;
    viewerImage.removeAttribute('src');
    viewerImage.alt = '';
    document.body.classList.remove('mobile-image-viewer-open');
    returnFocus?.focus?.();
    returnFocus = null;
  }

  function openViewer(trigger) {
    if (!coarsePointer.matches) return;
    const image = trigger.querySelector('img');
    if (!(image instanceof HTMLImageElement)) return;
    returnFocus = trigger;
    viewerImage.src = image.currentSrc || image.src;
    viewerImage.alt = image.alt || 'Expanded image';
    viewer.hidden = false;
    document.body.classList.add('mobile-image-viewer-open');
    closeButton.focus();
  }

  const removers = triggers.map((trigger) => {
    trigger.tabIndex = 0;
    trigger.setAttribute('role', 'button');
    const onClick = () => openViewer(trigger);
    const onKeyDown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openViewer(trigger);
      }
    };
    return [
      listen(trigger, 'click', onClick),
      listen(trigger, 'keydown', onKeyDown),
    ];
  }).flat();

  const onBackdropClick = (event) => {
    if (event.target === viewer) closeViewer();
  };
  const onKeyDown = (event) => {
    if (event.key === 'Escape' && !viewer.hidden) closeViewer();
  };

  removers.push(
    listen(closeButton, 'click', closeViewer),
    listen(viewer, 'click', onBackdropClick),
    listen(window, 'keydown', onKeyDown)
  );

  return () => {
    closeViewer();
    removers.forEach((remove) => remove());
    triggers.forEach((trigger) => {
      trigger.removeAttribute('role');
      trigger.removeAttribute('tabindex');
    });
  };
}

function initializeAnchorScrolling() {
  const links = Array.from(document.querySelectorAll('a[href^="#"]'));
  const listeners = [];
  const header = document.querySelector('.site-header');
  let landingObserver = null;
  let landingTimer = 0;

  function anchorDestination(target) {
    const headerHeight = header?.offsetHeight ?? 0;
    const bounds = target.getBoundingClientRect();
    const targetTop = window.scrollY + bounds.top;

    if (target.matches('.hero, .horizontal-story, .instructions')) {
      return Math.max(0, targetTop);
    }

    if (target.matches('.customize')) {
      const context = target.querySelector('.customize-copy') || target;
      const contextTop = window.scrollY + context.getBoundingClientRect().top;
      return Math.max(0, contextTop - headerHeight - 16);
    }

    const availableHeight = Math.max(1, window.innerHeight - headerHeight);
    const availableCenter = headerHeight + availableHeight / 2;
    return Math.max(0, targetTop + bounds.height / 2 - availableCenter);
  }

  function settleLanding(target) {
    const correctPosition = () => {
      const correctedDestination = anchorDestination(target);
      activeLenis?.resize?.();
      if (activeLenis && !reducedMotionQuery.matches) {
        activeLenis.scrollTo(correctedDestination, {
          immediate: true,
          force: true,
        });
      } else {
        window.scrollTo({ top: correctedDestination, behavior: 'auto' });
      }
      header?.classList.remove('is-hidden');
    };

    window.clearTimeout(landingTimer);
    landingObserver?.disconnect();
    landingObserver = null;
    correctPosition();

    if (typeof ResizeObserver === 'function') {
      landingObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(correctPosition);
      });
      landingObserver.observe(document.body);
    }

    landingTimer = window.setTimeout(() => {
      correctPosition();
      landingObserver?.disconnect();
      landingObserver = null;
      document.body.classList.remove('is-navigating');
      landingTimer = 0;
    }, 700);
  }

  links.forEach((link) => {
    const onClick = (event) => {
      const selector = link.getAttribute('href');
      if (!selector || selector === '#') return;
      const target = document.querySelector(selector);
      if (!target) return;
      event.preventDefault();
      const destination = anchorDestination(target);
      document.body.classList.add('is-navigating');
      header?.classList.remove('is-hidden');
      if (window.history?.replaceState) {
        window.history.replaceState(null, '', selector);
      }
      if (activeLenis && !reducedMotionQuery.matches) {
        activeLenis.scrollTo(destination, {
          duration: 1.05,
          onComplete: () => settleLanding(target),
        });
      } else {
        window.scrollTo({
          top: destination,
          behavior: reducedMotionQuery.matches ? 'auto' : 'smooth',
        });
        landingTimer = window.setTimeout(() => settleLanding(target), 1100);
      }
    };
    link.addEventListener('click', onClick);
    listeners.push(() => link.removeEventListener('click', onClick));
  });

  return () => {
    listeners.forEach((remove) => remove());
    window.clearTimeout(landingTimer);
    landingObserver?.disconnect();
    document.body.classList.remove('is-navigating');
  };
}

initializeSplitText();
registerCleanup(initializeThemeToggle());
registerCleanup(initializePreloader());
registerCleanup(initializeRevealObserver());
registerCleanup(initializeMenu());
registerCleanup(initializeAnimationBridge());
registerCleanup(initializeHeaderMotion());
registerCleanup(initializeScrollScenes());
registerCleanup(initializePointerEffects());
registerCleanup(initializeImageZoom());
registerCleanup(initializeMobileImageViewer());
registerCleanup(initializeAnchorScrolling());

window.addEventListener('pagehide', (event) => {
  if (event.persisted) return;
  cleanupCallbacks
    .splice(0)
    .reverse()
    .forEach((cleanup) => cleanup());
});
