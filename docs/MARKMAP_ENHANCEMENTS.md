# Markmap Enhancements Implementation

## Overview
This document describes the enhancements made to the markmap rendering system to improve LaTeX support, add zoom controls, and include branding.

## 1. LaTeX Rendering Improvements

### Changes Made
1. **Sequential Asset Loading**: Modified the `loadAssets` function in `MarkmapViewer.vue` to ensure CSS is loaded before JavaScript
2. **KaTeX Initialization Wait**: Added a 100ms delay after loading KaTeX scripts to allow proper initialization
3. **Post-Render Typesetting Wait**: Added a 50ms delay after rendering to allow KaTeX to process formulas
4. **Proper Asset Loading Order**: Ensured styles are loaded before scripts for better rendering reliability

### Technical Details
```typescript
// Load CSS first (KaTeX styles need to be loaded before rendering)
if (styles && styles.length > 0) {
  await loadCSS(styles)
}

// Load JS scripts (KaTeX library)
if (scripts && scripts.length > 0) {
  await loadJS(scripts)
}

// Wait for KaTeX to initialize if it was just loaded
if (scripts && scripts.some((s: string) => s.includes('katex'))) {
  await new Promise(resolve => setTimeout(resolve, 100))
}

// ... after rendering ...

// Ensure LaTeX is rendered by waiting for any pending typesetting
if (typeof window !== 'undefined' && (window as any).katex) {
  await new Promise(resolve => setTimeout(resolve, 50))
}
```

### LaTeX Support
The markmap library uses KaTeX 0.16.18 for LaTeX rendering. Supported syntax includes:
- Inline formulas: `$a = b + c$`
- Block formulas: `$$E = mc^2$$`
- Complex expressions: matrices, summations, integrals, etc.

### Known Limitations
- Requires CDN access to load KaTeX assets (markmap-lib uses jsdelivr.net by default)
- In environments that block CDN access, LaTeX formulas won't render
- This is a markmap-lib limitation, not an issue with our implementation

## 2. Zoom Control Panel

### Features
- **Position**: Bottom-right corner of the markmap viewer
- **Buttons**:
  - Zoom In (+): Increases zoom by 20% (multiplies by 1.2)
  - Zoom Out (−): Decreases zoom by 20% (multiplies by 0.8)
  - Reset (⟲): Resets zoom to 100% and fits content
- **Zoom Display**: Shows current zoom level as percentage (e.g., "100%", "120%")

### Implementation
```typescript
const currentZoom = ref(1.0)
const zoomPercentage = computed(() => Math.round(currentZoom.value * 100))

const zoomIn = () => {
  if (!mm) return
  const newScale = currentZoom.value * 1.2
  currentZoom.value = newScale
  mm.rescale(newScale)
}

const zoomOut = () => {
  if (!mm) return
  const newScale = currentZoom.value * 0.8
  currentZoom.value = newScale
  mm.rescale(newScale)
}

const resetZoom = () => {
  if (!mm) return
  currentZoom.value = 1.0
  mm.fit()
}
```

### Styling
- Minimalistic design with subtle borders
- Semi-transparent white background (rgba(255, 255, 255, 0.95))
- Dark theme support with inverted colors
- Hover effects for better UX
- Proper z-index (100) to stay visible
- Non-intrusive size (36px buttons, 50px min-width)

## 3. Midiverse Logo

### Features
- **Position**: Top-left corner in fullscreen mode only
- **Functionality**: Clickable link to home page (/)
- **Design**: Simple SVG text logo with "Midiverse" branding
- **Styling**: Subtle, non-intrusive with hover effects

### Implementation
Added to both markmap viewer pages:
- `/pages/markmaps/[id].vue`
- `/pages/markmaps/[username]/[...slug].vue`

```vue
<NuxtLink v-if="isFullscreen" to="/" class="midiverse-logo" title="Midiverse Home">
  <svg width="120" height="32" viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="5" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold" fill="currentColor">Midiverse</text>
  </svg>
</NuxtLink>
```

### Styling
- Semi-transparent white background
- Rounded corners (8px)
- Subtle shadow for depth
- Hover scale effect (1.05)
- Dark theme support
- z-index 1000 to stay above content

## 4. Component Configuration

### Props
The `MarkmapViewer` component now accepts:
```typescript
{
  markdown: string
  options?: {
    maxWidth?: number
    colorFreezeLevel?: number
    initialExpandLevel?: number
  }
  showControls?: boolean  // Default: true
}
```

The `showControls` prop allows hiding the zoom controls if needed (e.g., for embedded views).

## 5. Testing Recommendations

### LaTeX Rendering
Test with markdown containing:
```markdown
# Math Test

## Inline
- Simple: $a = b + c$
- Complex: $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$

## Block
$$E = mc^2$$

$$\int_0^\infty e^{-x} dx = 1$$
```

### Zoom Controls
1. Click zoom in (+) - should increase to 120%
2. Click zoom out (−) - should decrease by 20%
3. Click reset (⟲) - should return to 100% and fit content
4. Verify controls work in both normal and fullscreen modes

### Fullscreen Mode
1. Enter fullscreen mode
2. Verify Midiverse logo appears in top-left
3. Verify logo is clickable and links to home
4. Verify zoom controls remain visible
5. Test in both light and dark themes

## 6. Browser Compatibility

All features use standard web APIs:
- SVG for logo rendering
- CSS transforms for hover effects
- D3.js zoom behavior (via markmap-view)
- Modern JavaScript (ES6+)

Tested environments:
- Chrome/Chromium
- Firefox
- Safari (expected to work)
- Edge (expected to work)

## 7. Performance Considerations

- Minimal overhead: ~150ms delay for LaTeX initialization
- Zoom operations use markmap's built-in rescale() method
- No additional libraries required
- CSS is scoped to avoid style conflicts
- Theme observer uses MutationObserver (efficient)

## 8. Future Improvements

Potential enhancements for future versions:
1. Configurable zoom step (currently fixed at 20%)
2. Keyboard shortcuts for zoom (Ctrl+/Ctrl-)
3. Double-click to reset zoom
4. Pinch-to-zoom support for touch devices
5. Custom logo upload option
6. KaTeX bundling to avoid CDN dependency
