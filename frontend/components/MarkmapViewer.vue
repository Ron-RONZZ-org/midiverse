<template>
  <div ref="markmapRef" class="markmap-container"></div>
</template>

<script setup lang="ts">
import { Markmap } from 'markmap-view'
import { Transformer } from 'markmap-lib'

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

const renderMarkmap = () => {
  if (!markmapRef.value || !props.markdown) return

  try {
    // Transform markdown to markmap data
    const transformer = new Transformer()
    const { root } = transformer.transform(props.markdown)

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
