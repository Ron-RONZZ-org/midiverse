<template>
  <div class="preview-page">
    <div class="preview-header">
      <h1>{{ previewData.title }}</h1>
      <button @click="closeWindow" class="btn btn-sm">Close Preview</button>
    </div>
    <div class="preview-container">
      <ClientOnly>
        <MarkmapViewer 
          v-if="previewData.markdown"
          :markdown="previewData.markdown"
          :options="previewData.options"
        />
        <div v-else class="preview-placeholder">
          No preview data available
        </div>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
const previewData = ref({
  markdown: '',
  title: 'Preview',
  options: {
    maxWidth: 0,
    colorFreezeLevel: 0,
    initialExpandLevel: -1
  }
})

const closeWindow = () => {
  if (process.client) {
    window.close()
  }
}

onMounted(() => {
  if (process.client) {
    const stored = sessionStorage.getItem('markmap-preview')
    if (stored) {
      try {
        previewData.value = JSON.parse(stored)
      } catch (e) {
        console.error('Failed to load preview data:', e)
      }
    }
    
    // Listen for updates from the parent window
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'markmap-preview-update') {
        previewData.value = event.data.data
        // Also update sessionStorage so refreshing the page keeps the latest content
        sessionStorage.setItem('markmap-preview', JSON.stringify(event.data.data))
      }
    })
  }
})
</script>

<style scoped>
.preview-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  background: var(--bg-primary);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--border-color);
}

.preview-header h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.5rem;
}

.preview-container {
  flex: 1;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--card-bg);
  overflow: hidden;
}

.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}
</style>
