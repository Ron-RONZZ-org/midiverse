<template>
  <div class="markmap-wrapper">
    <div v-if="renderError" class="render-error">
      <p class="error-title">⚠️ Failed to render markmap</p>
      <p class="error-message">{{ renderError }}</p>
      <button @click="retryRender" class="retry-btn">Retry</button>
    </div>
    <svg v-else ref="markmapRef" class="markmap-container"></svg>
    
    <!-- Zoom Control Panel (bottom-right) -->
    <div v-if="showControls && !renderError" class="zoom-controls">
      <button @click="zoomIn" class="zoom-btn" title="Zoom In">
        <span class="zoom-icon">+</span>
      </button>
      <div class="zoom-level">{{ zoomPercentage }}%</div>
      <button @click="zoomOut" class="zoom-btn" title="Zoom Out">
        <span class="zoom-icon">−</span>
      </button>
      <button @click="resetZoom" class="zoom-btn zoom-reset" title="Reset Zoom">
        <span class="zoom-icon">⟲</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Markmap, deriveOptions } from 'markmap-view'
import { Transformer } from 'markmap-lib'
import { loadCSS, loadJS } from 'markmap-common'

const props = withDefaults(defineProps<{
  markdown: string
  options?: {
    maxWidth?: number
    colorFreezeLevel?: number
    initialExpandLevel?: number
  }
  showControls?: boolean
}>(), {
  showControls: true
})

// Type for d3-zoom transform state
interface TransformState {
  x: number  // Pan horizontal position
  y: number  // Pan vertical position
  k: number  // Zoom scale factor (1.0 = 100%)
}

const markmapRef = ref<HTMLElement | null>(null)
let mm: any = null
const transformer = new Transformer()
let themeStyleElement: HTMLStyleElement | null = null
let savedState: any = null // Store the fold/unfold state
let savedTransform: TransformState | null = null // Store the zoom/pan transform state
const currentZoom = ref(1.0) // Track current zoom level
const zoomPercentage = computed(() => Math.round(currentZoom.value * 100))
const renderError = ref<string | null>(null)

// Detect if dark theme is active
const isDarkTheme = () => {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark-theme')
  }
  return false
}

// Apply dark theme styles to markmap SVG
const applyThemeStyles = () => {
  if (!markmapRef.value) return
  
  const svg = markmapRef.value
  const isDark = isDarkTheme()
  
  // Set the text color based on theme
  const textColor = isDark ? '#e0e0e0' : '#333333'
  const linkColor = isDark ? '#4da6ff' : '#007bff'
  
  // Apply styles to the SVG element
  svg.style.color = textColor
  
  // Create or update a style element for markmap SVG styling
  if (!themeStyleElement) {
    themeStyleElement = document.createElement('style')
    themeStyleElement.id = 'markmap-theme-styles'
    document.head.appendChild(themeStyleElement)
  }
  
  // Update the styles based on theme
  themeStyleElement.textContent = `
    .markmap-container text {
      fill: ${textColor} !important;
    }
    .markmap-container .markmap-link {
      stroke: ${isDark ? '#606060' : '#cccccc'} !important;
    }
    .markmap-container a {
      color: ${linkColor} !important;
      fill: ${linkColor} !important;
    }
  `
}

// Load required assets with improved LaTeX support
const loadAssets = async (assets: any) => {
  if (assets) {
    const { styles, scripts } = assets
    
    // Load CSS first (KaTeX styles need to be loaded before rendering)
    if (styles && styles.length > 0) {
      await loadCSS(styles)
    }
    
    // Load JS scripts (KaTeX library)
    if (scripts && scripts.length > 0) {
      await loadJS(scripts)
    }
    
    // Wait a bit for KaTeX to initialize if it was just loaded
    if (scripts && scripts.some((s: any) => {
      const src = s.data?.src || s.data || ''
      return typeof src === 'string' && src.toLowerCase().includes('katex')
    })) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
}

// Zoom control functions
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

// Process markdown to convert !{keynode} syntax to markdown links
const processKeynodes = (markdown: string): string => {
  // Replace !{keynode} patterns with [keynode](/search?keynode=keynode)
  return markdown.replace(/!\{([^}]+)\}/g, (match, keynode) => {
    const encodedKeynode = encodeURIComponent(keynode.trim())
    return `[${keynode.trim()}](/search?keynode=${encodedKeynode})`
  })
}

// Helper to get the fold/unfold state from the markmap
const getMarkmapState = () => {
  if (!mm || !mm.state) return null
  
  try {
    // Store which nodes are folded
    const state: any = {}
    const traverse = (node: any, path: string[] = []) => {
      if (!node) return
      
      const currentPath = [...path, node.content || '']
      const pathKey = currentPath.join('|')
      
      // Store fold state (false = folded, true/undefined = unfolded)
      if (node.payload?.fold !== undefined) {
        state[pathKey] = node.payload.fold
      }
      
      if (node.children) {
        node.children.forEach((child: any) => traverse(child, currentPath))
      }
    }
    
    traverse(mm.state.data)
    return state
  } catch (error) {
    console.error('Failed to get markmap state:', error)
    return null
  }
}

// Helper to restore fold/unfold state to the markmap
const restoreMarkmapState = (state: any) => {
  if (!mm || !mm.state || !state) return
  
  try {
    const traverse = (node: any, path: string[] = []) => {
      if (!node) return
      
      const currentPath = [...path, node.content || '']
      const pathKey = currentPath.join('|')
      
      // Restore fold state if we have it saved
      if (state[pathKey] !== undefined) {
        if (!node.payload) node.payload = {}
        node.payload.fold = state[pathKey]
      }
      
      if (node.children) {
        node.children.forEach((child: any) => traverse(child, currentPath))
      }
    }
    
    traverse(mm.state.data)
    mm.renderData()
  } catch (error) {
    console.error('Failed to restore markmap state:', error)
  }
}

// Helper to get the current zoom/pan transform state
const getTransformState = (): TransformState | null => {
  if (!mm || !mm.svg) return null
  
  try {
    // The 'g' element contains the transform with zoom/pan info
    const gElement = mm.svg.select('g').node()
    if (!gElement) return null
    
    // Get the current transform from d3-zoom
    // Note: __zoom is an internal d3-zoom property, but it's the standard way to
    // access transform state between re-renders. This is a well-documented pattern
    // in the d3 community and is stable across d3-zoom versions.
    const transform = gElement.__zoom
    
    if (transform) {
      return {
        x: transform.x,
        y: transform.y,
        k: transform.k // k = scale/zoom level
      }
    }
    return null
  } catch (error) {
    console.error('Failed to get transform state:', error)
    return null
  }
}

// Helper to restore zoom/pan transform state
const restoreTransformState = (transformState: TransformState | null) => {
  if (!mm || !mm.svg || !transformState) return
  
  try {
    const gElement = mm.svg.select('g')
    if (!gElement.node()) return
    
    // Create a transform object with the saved values
    const transform: TransformState = {
      x: transformState.x,
      y: transformState.y,
      k: transformState.k
    }
    
    // Apply the transform directly to the g element
    gElement.attr('transform', `translate(${transform.x},${transform.y})scale(${transform.k})`)
    
    // Also update the __zoom property used by d3-zoom
    // Note: __zoom is an internal d3-zoom property, but this is the standard way to
    // programmatically set transform state. This ensures d3-zoom's internal state
    // matches the visual transform, preventing inconsistencies.
    gElement.node().__zoom = transform
    
    // Update our tracked zoom value
    currentZoom.value = transform.k
  } catch (error) {
    console.error('Failed to restore transform state:', error)
  }
}

const renderMarkmap = async () => {
  if (!props.markdown) {
    renderError.value = 'No markdown content provided'
    return
  }
  
  if (!markmapRef.value) {
    renderError.value = 'Markmap container not ready'
    return
  }

  try {
    renderError.value = null // Clear any previous error
    
    // Save current fold/unfold state and transform state before re-rendering
    if (mm) {
      savedState = getMarkmapState()
      savedTransform = getTransformState()
    }
    
    // Process keynodes in the markdown before rendering
    const processedMarkdown = processKeynodes(props.markdown)
    
    // Transform markdown to markmap data and get assets
    const { root, features } = transformer.transform(processedMarkdown)
    const assets = transformer.getUsedAssets(features)
    
    // Load required assets
    await loadAssets(assets)

    // Create or update markmap
    // Always recreate the markmap when options change since setOptions doesn't work properly
    // for all options (especially colorFreezeLevel)
    if (mm) {
      mm.destroy()
      mm = null
    }
    
    // Use deriveOptions to convert JSON options (with colorFreezeLevel as number)
    // to IMarkmapOptions (with color as function)
    const jsonOptions = {
      maxWidth: Number(props.options?.maxWidth ?? 0),
      colorFreezeLevel: Number(props.options?.colorFreezeLevel ?? 0),
      initialExpandLevel: Number(props.options?.initialExpandLevel ?? -1),
    }
    
    const options = deriveOptions(jsonOptions)
    
    mm = Markmap.create(markmapRef.value, options, root)
    
    // Restore fold/unfold state after creating the new markmap
    if (savedState) {
      // Use nextTick to ensure the markmap is fully rendered
      await nextTick()
      restoreMarkmapState(savedState)
    }
    
    // Restore zoom/pan transform state after creating the new markmap
    if (savedTransform) {
      await nextTick()
      restoreTransformState(savedTransform)
    }
    
    // Apply theme styles after rendering
    applyThemeStyles()
    
    // Ensure LaTeX is rendered by waiting for any pending typesetting
    if (typeof window !== 'undefined') {
      const win = window as Window & { katex?: any }
      if (win.katex) {
        // Give KaTeX time to process any formulas
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }
    
    // Only reset zoom to 1.0 if we didn't restore a saved transform
    if (!savedTransform) {
      currentZoom.value = 1.0
    }
  } catch (error) {
    console.error('Failed to render markmap:', error)
    renderError.value = error instanceof Error ? error.message : 'An unknown error occurred while rendering the markmap'
  }
}

const retryRender = () => {
  renderError.value = null
  renderMarkmap()
}

// Watch for theme changes using MutationObserver
let themeObserver: MutationObserver | null = null

onMounted(() => {
  renderMarkmap()
  
  // Watch for theme changes on the html element
  if (typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          applyThemeStyles()
        }
      })
    })
    
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
  }
})

watch(() => props.markdown, () => {
  renderMarkmap()
})

watch(() => props.options, () => {
  renderMarkmap()
}, { deep: true })

onUnmounted(() => {
  if (mm) {
    mm.destroy()
  }
  if (themeObserver) {
    themeObserver.disconnect()
  }
  if (themeStyleElement) {
    themeStyleElement.remove()
  }
})
</script>

<style scoped>
.markmap-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.markmap-container {
  width: 100%;
  height: 100%;
}

.render-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  background: var(--bg-secondary, #f8f9fa);
  border-radius: 8px;
}

.error-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--danger-color, #dc3545);
  margin-bottom: 0.5rem;
}

.error-message {
  color: var(--text-secondary, #666);
  margin-bottom: 1rem;
  max-width: 600px;
}

.retry-btn {
  background: var(--primary-color, #007bff);
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: var(--primary-hover, #0056b3);
}

.zoom-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 50px;
}

.dark-theme .zoom-controls {
  background: rgba(40, 40, 40, 0.95);
  border-color: rgba(255, 255, 255, 0.15);
}

.zoom-btn {
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: var(--text-primary, #333);
  font-size: 18px;
  padding: 0;
}

.dark-theme .zoom-btn {
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--text-primary, #e0e0e0);
}

.zoom-btn:hover {
  background: rgba(0, 123, 255, 0.1);
  border-color: rgba(0, 123, 255, 0.5);
}

.zoom-btn:active {
  transform: scale(0.95);
}

.zoom-icon {
  display: block;
  line-height: 1;
  font-weight: bold;
}

.zoom-level {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #333);
  padding: 4px 0;
  min-width: 45px;
}

.dark-theme .zoom-level {
  color: var(--text-primary, #e0e0e0);
}

.zoom-reset {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  margin-top: 4px;
  padding-top: 4px;
}

.dark-theme .zoom-reset {
  border-top-color: rgba(255, 255, 255, 0.1);
}
</style>
