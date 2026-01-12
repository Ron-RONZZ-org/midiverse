<template>
  <svg ref="markmapRef" class="markmap-container"></svg>
</template>

<script setup lang="ts">
import { Markmap, deriveOptions } from 'markmap-view'
import { Transformer } from 'markmap-lib'
import { loadCSS, loadJS } from 'markmap-common'

const props = defineProps<{
  markdown: string
  options?: {
    maxWidth?: number
    colorFreezeLevel?: number
    initialExpandLevel?: number
  }
}>()

const markmapRef = ref<HTMLElement | null>(null)
let mm: any = null
const transformer = new Transformer()
let themeStyleElement: HTMLStyleElement | null = null
let savedState: any = null // Store the fold/unfold state

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

// Load required assets
const loadAssets = async (assets: any) => {
  if (assets) {
    const { styles, scripts } = assets
    if (styles && styles.length > 0) {
      await loadCSS(styles)
    }
    if (scripts && scripts.length > 0) {
      await loadJS(scripts)
    }
  }
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

const renderMarkmap = async () => {
  if (!markmapRef.value || !props.markdown) return

  try {
    // Save current fold/unfold state before re-rendering
    if (mm) {
      savedState = getMarkmapState()
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
    
    // Apply theme styles after rendering
    applyThemeStyles()
  } catch (error) {
    console.error('Failed to render markmap:', error)
  }
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
.markmap-container {
  width: 100%;
  height: 100%;
}
</style>
