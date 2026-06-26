const downloadButtons = document.querySelectorAll('a[download]');

downloadButtons.forEach((button) => {
  button.addEventListener('click', () => {
    button.classList.add('is-downloading');
    window.setTimeout(() => button.classList.remove('is-downloading'), 1200);
  });
});

const snapSections = Array.from(
  document.querySelectorAll(
    '.hero-section, .quick-strip, .section-block, .showcase-section, .workflow-section, .form-section, .download-section'
  )
);

let isSectionScrolling = false;

function nearestSectionIndex() {
  const headerOffset = window.innerWidth <= 680 ? 142 : 82;
  const targetTop = window.scrollY + headerOffset;
  let nearest = 0;
  let nearestDistance = Infinity;

  snapSections.forEach((section, index) => {
    const distance = Math.abs(section.offsetTop - targetTop);
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  });

  return nearest;
}

function slideToSection(index) {
  if (!snapSections[index]) return;
  isSectionScrolling = true;
  snapSections[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.setTimeout(() => {
    isSectionScrolling = false;
  }, 760);
}

window.addEventListener(
  'wheel',
  (event) => {
    if (Math.abs(event.deltaY) < 32 || isSectionScrolling || event.ctrlKey) return;
    const current = nearestSectionIndex();
    const currentSection = snapSections[current];
    const headerOffset = window.innerWidth <= 680 ? 142 : 82;
    const rect = currentSection.getBoundingClientRect();
    const tallSection = rect.height > window.innerHeight - headerOffset;

    if (tallSection) {
      const scrollingDownInside = event.deltaY > 0 && rect.bottom > window.innerHeight + 12;
      const scrollingUpInside = event.deltaY < 0 && rect.top < headerOffset - 12;
      if (scrollingDownInside || scrollingUpInside) return;
    }

    event.preventDefault();
    const next = event.deltaY > 0 ? current + 1 : current - 1;
    slideToSection(Math.max(0, Math.min(snapSections.length - 1, next)));
  },
  { passive: false }
);
