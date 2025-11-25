<template>
  <div class="fullscreen-container">
    <div v-if="loading" class="loading">Loading keynode hierarchy...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="!hierarchyMarkdown" class="empty-state">No keynodes available yet.</div>
    <div v-else class="markmap-view fullscreen-view">
      <button @click="exitFullscreen" class="exit-fullscreen-btn" title="Exit Fullscreen">
        ✕
      </button>
      <div class="fullscreen-controls">
        <label class="toggle-control">
          <input 
            type="checkbox" 
            v-model="showReferenceCounts"
            @change="loadHierarchy"
          />
          <span>Show reference counts</span>
        </label>
      </div>
      <ClientOnly>
        <MarkmapViewer 
          :markdown="hierarchyMarkdown"
          :options="{
            maxWidth: 300,
            colorFreezeLevel: 2,
            initialExpandLevel: 2
          }"
        />
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const { authFetch } = useApi()

const hierarchyMarkdown = ref('')
const loading = ref(true)
const error = ref('')
const showReferenceCounts = ref(false)

const loadHierarchy = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const params = new URLSearchParams()
    params.set('showReferenceCounts', String(showReferenceCounts.value))
    const response = await authFetch(`/keynodes/hierarchy?${params.toString()}`)
    
    if (response.ok) {
      hierarchyMarkdown.value = await response.text()
    } else {
      error.value = 'Failed to load keynode hierarchy'
    }
  } catch (err: any) {
    console.error('Error fetching hierarchy:', err)
    error.value = err.message || 'Failed to load keynode hierarchy'
  } finally {
    loading.value = false
  }
}

const exitFullscreen = () => {
  router.push('/keynode')
}

onMounted(() => {
  loadHierarchy()
})
</script>

<style scoped>
.fullscreen-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: var(--bg-primary, white);
  overflow: hidden;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: var(--text-secondary, #666);
}

.error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: #dc3545;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: var(--text-secondary, #666);
  font-style: italic;
}

.markmap-view {
  height: 100%;
  width: 100%;
  position: relative;
}

.fullscreen-view {
  height: 100vh !important;
}

.exit-fullscreen-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.exit-fullscreen-btn:hover {
  background: rgba(0, 0, 0, 0.9);
}

.fullscreen-controls {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.toggle-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: white;
}

.toggle-control input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
</style>
