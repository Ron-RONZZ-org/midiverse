<template>
  <div ref="markmapRef" class="markmap-container"></div>
</template>

<script setup lang="ts">
import { Markmap } from 'markmap-view'
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

const renderMarkmap = async () => {
  if (!markmapRef.value || !props.markdown) return

  try {
    // Transform markdown to markmap data and get assets
    const { root, features } = transformer.transform(props.markdown)
    const assets = transformer.getUsedAssets(features)
    
    // Load required assets
    await loadAssets(assets)

    // Create or update markmap
    if (mm) {
      mm.setData(root)
      mm.fit()
    } else {
      mm = Markmap.create(markmapRef.value, {
        maxWidth: props.options?.maxWidth || 0,
        colorFreezeLevel: props.options?.colorFreezeLevel || 0,
        initialExpandLevel: props.options?.initialExpandLevel || -1,
      }, root)
    }
  } catch (error) {
    console.error('Failed to render markmap:', error)
  }
}

onMounted(() => {
  renderMarkmap()
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
})
</script>

<style scoped>
.markmap-container {
  width: 100%;
  height: 100%;
}
</style>
