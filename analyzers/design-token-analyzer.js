(() => {
  // --- Color extraction ---
  const colorMap = new Map();

  const colorRegex = /^(#[0-9a-fA-F]{3,8}|rgba?\(.+?\)|hsla?\(.+?\))$/;
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules || [])) {
          if (rule instanceof CSSStyleRule && (rule.selectorText === ':root' || (rule.selectorText && rule.selectorText.includes('[data-theme')))) {
            for (const prop of Array.from(rule.style)) {
              if (prop.startsWith('--')) {
                const val = rule.style.getPropertyValue(prop).trim();
                if (colorRegex.test(val)) {
                  const existing = colorMap.get(val);
                  if (existing) {
                    existing.count++;
                  } else {
                    colorMap.set(val, { count: 1, source: 'variable', variable: prop });
                  }
                }
              }
            }
          }
        }
      } catch (e) {}
    }
  } catch (e) {}

  // Computed color extraction (sampling)
  const colorProps = ['color', 'backgroundColor', 'borderColor'];
  const elements = document.querySelectorAll('body *');
  const sampleSize = Math.min(elements.length, 500);
  const step = Math.max(1, Math.floor(elements.length / sampleSize));

  for (let i = 0; i < elements.length; i += step) {
    const style = getComputedStyle(elements[i]);
    for (const prop of colorProps) {
      const val = style[prop];
      if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent') {
        const existing = colorMap.get(val);
        if (existing) {
          existing.count++;
        } else {
          colorMap.set(val, { count: 1, source: 'computed' });
        }
      }
    }
  }

  const colors = Array.from(colorMap.entries())
    .map(([value, data]) => ({ value, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  // --- Typography extraction ---
  const fontFamilyMap = new Map();

  for (let i = 0; i < elements.length; i += step) {
    const style = getComputedStyle(elements[i]);
    const family = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
    const size = style.fontSize;
    const weight = style.fontWeight;
    const lh = style.lineHeight;

    if (!fontFamilyMap.has(family)) {
      fontFamilyMap.set(family, {
        sizes: new Map(),
        weights: new Map(),
        lineHeights: new Map(),
      });
    }
    const entry = fontFamilyMap.get(family);
    entry.sizes.set(size, (entry.sizes.get(size) || 0) + 1);
    entry.weights.set(weight, (entry.weights.get(weight) || 0) + 1);
    if (lh !== 'normal') {
      entry.lineHeights.set(lh, (entry.lineHeights.get(lh) || 0) + 1);
    }
  }

  const typography = Array.from(fontFamilyMap.entries())
    .map(([fontFamily, data]) => ({
      fontFamily,
      sizes: Array.from(data.sizes.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      weights: Array.from(data.weights.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      lineHeights: Array.from(data.lineHeights.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => {
      const totalA = a.sizes.reduce((s, x) => s + x.count, 0);
      const totalB = b.sizes.reduce((s, x) => s + x.count, 0);
      return totalB - totalA;
    })
    .slice(0, 10);

  // --- Spacing extraction ---
  const spacingMap = new Map();
  const spacingProps = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'gap'];

  for (let i = 0; i < elements.length; i += step) {
    const style = getComputedStyle(elements[i]);
    for (const prop of spacingProps) {
      const val = style[prop];
      if (val && val !== '0px' && val !== 'normal' && val !== 'auto') {
        const propType = prop.startsWith('margin') ? 'margin' : prop.startsWith('padding') ? 'padding' : 'gap';
        const key = val + '|' + propType;
        const existing = spacingMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          spacingMap.set(key, { count: 1, property: propType });
        }
      }
    }
  }

  const spacing = Array.from(spacingMap.entries())
    .map(([key, data]) => ({ value: key.split('|')[0], ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  // --- Shadow extraction ---
  const shadowSet = new Set();
  for (let i = 0; i < elements.length; i += step) {
    const style = getComputedStyle(elements[i]);
    if (style.boxShadow && style.boxShadow !== 'none') {
      shadowSet.add(style.boxShadow);
    }
    if (style.textShadow && style.textShadow !== 'none') {
      shadowSet.add(style.textShadow);
    }
  }

  // --- Border radius extraction ---
  const borderRadiusSet = new Set();
  for (let i = 0; i < elements.length; i += step) {
    const val = getComputedStyle(elements[i]).borderRadius;
    if (val && val !== '0px') {
      borderRadiusSet.add(val);
    }
  }

  // --- Transition extraction ---
  const transitionSet = new Set();
  for (let i = 0; i < elements.length; i += step) {
    const val = getComputedStyle(elements[i]).transition;
    if (val && val !== 'all 0s ease 0s' && val !== 'none 0s ease 0s') {
      transitionSet.add(val);
    }
  }

  return JSON.stringify({
    colors,
    typography,
    spacing,
    shadows: Array.from(shadowSet).slice(0, 20),
    borderRadius: Array.from(borderRadiusSet).slice(0, 20),
    transitions: Array.from(transitionSet).slice(0, 20),
  });
})()
