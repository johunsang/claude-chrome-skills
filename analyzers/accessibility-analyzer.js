(() => {
  const result = {
    ariaAttributes: [],
    semanticElements: [],
    imagesWithAlt: 0,
    imagesWithoutAlt: 0,
    formLabels: { hasLabel: 0, missingLabel: 0 },
    tabIndex: 0,
    skipLinks: false,
    landmarks: [],
  };

  // ARIA attributes count
  const ariaMap = new Map();
  document.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('aria-')) {
        ariaMap.set(attr.name, (ariaMap.get(attr.name) || 0) + 1);
      }
    }
  });
  result.ariaAttributes = Array.from(ariaMap.entries()).map(([attribute, count]) => ({ attribute, count }));

  // Semantic elements count
  const semanticTags = ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer'];
  for (const tag of semanticTags) {
    const count = document.querySelectorAll(tag).length;
    if (count > 0) {
      result.semanticElements.push({ element: tag, count });
    }
  }

  // Image alt attributes
  document.querySelectorAll('img').forEach(img => {
    if (img.hasAttribute('alt')) {
      result.imagesWithAlt++;
    } else {
      result.imagesWithoutAlt++;
    }
  });

  // Form labels
  const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select');
  inputs.forEach(input => {
    const id = input.id;
    const hasLabel =
      (id && document.querySelector('label[for="' + id + '"]')) ||
      input.closest('label') ||
      input.getAttribute('aria-label') ||
      input.getAttribute('aria-labelledby');

    if (hasLabel) {
      result.formLabels.hasLabel++;
    } else {
      result.formLabels.missingLabel++;
    }
  });

  // Tab index elements
  result.tabIndex = document.querySelectorAll('[tabindex]').length;

  // Skip links
  const skipLinkSelectors = [
    'a[href="#main"]',
    'a[href="#main-content"]',
    'a[href="#content"]',
    'a[href="#maincontent"]',
    'a.skip-link',
    'a.skip-nav',
    'a.skip-to-content',
    'a.skiplink',
  ];
  result.skipLinks = skipLinkSelectors.some(sel => document.querySelector(sel) !== null);

  // Landmarks
  const landmarkRoles = ['banner', 'navigation', 'main', 'complementary', 'contentinfo', 'search', 'form', 'region'];
  const landmarkSet = new Set();
  for (const role of landmarkRoles) {
    if (document.querySelector('[role="' + role + '"]')) {
      landmarkSet.add(role);
    }
  }
  // Implicit landmarks from semantic elements
  if (document.querySelector('header')) landmarkSet.add('banner');
  if (document.querySelector('nav')) landmarkSet.add('navigation');
  if (document.querySelector('main')) landmarkSet.add('main');
  if (document.querySelector('aside')) landmarkSet.add('complementary');
  if (document.querySelector('footer')) landmarkSet.add('contentinfo');

  result.landmarks = [...landmarkSet];

  return JSON.stringify(result);
})()
