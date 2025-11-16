<template>
  <div class="container">
    <h1>{{ editMode ? 'Edit Markmap' : 'Create Markmap' }}</h1>

    <div v-if="!isAuthenticated" class="card">
      <p>You need to be logged in to create or edit markmaps.</p>
      <NuxtLink to="/login" class="btn">Login</NuxtLink>
    </div>

    <div v-else class="editor-layout">
      <div class="editor-panel card">
        <h2>Editor</h2>
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="title">Title</label>
            <input id="title" v-model="form.title" type="text" required />
          </div>

          <div class="form-group">
            <label for="text">Markdown Content</label>
            <textarea 
              id="text" 
              v-model="form.text" 
              required
              placeholder="# Root
## Branch 1
### Sub-branch 1
### Sub-branch 2
## Branch 2"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="language">Language</label>
              <input id="language" v-model="form.language" type="text" placeholder="e.g., en, es, fr" />
            </div>

            <div class="form-group">
              <label for="topic">Topic</label>
              <input id="topic" v-model="form.topic" type="text" placeholder="e.g., programming, tutorial" />
            </div>
          </div>

          <div class="form-group">
            <label for="tags">Tags (start with #)</label>
            <div class="tags-input-container">
              <div class="tags-list">
                <span v-for="(tag, index) in form.tags" :key="index" class="tag-chip">
                  {{ tag }}
                  <button type="button" @click="removeTag(index)" class="tag-remove">&times;</button>
                </span>
              </div>
              <div class="tag-input-wrapper">
                <input 
                  id="tags" 
                  v-model="tagInput" 
                  type="text" 
                  placeholder="Type to add tags (e.g., #javascript)"
                  @input="onTagInput"
                  @keydown.enter.prevent="addTag"
                  @keydown.tab="addTag"
                  @keydown.down="navigateSuggestions(1)"
                  @keydown.up.prevent="navigateSuggestions(-1)"
                  @blur="hideSuggestions"
                />
                <div v-if="showSuggestions && filteredSuggestions.length > 0" class="suggestions-dropdown">
                  <div 
                    v-for="(suggestion, index) in filteredSuggestions" 
                    :key="suggestion.name"
                    :class="['suggestion-item', { active: index === selectedSuggestionIndex }]"
                    @mousedown.prevent="selectSuggestion(suggestion.name)"
                    @mouseenter="selectedSuggestionIndex = index"
                  >
                    <span class="suggestion-name">{{ suggestion.name }}</span>
                    <span class="suggestion-count">{{ suggestion.count }}</span>
                  </div>
                </div>
                <div v-else-if="showSuggestions && tagInput.trim() && !tagExists(tagInput)" class="suggestions-dropdown">
                  <div 
                    class="suggestion-item create-new"
                    @mousedown.prevent="addTag"
                  >
                    <span class="suggestion-name">Create New: {{ normalizeTag(tagInput) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="maxWidth">Max Width</label>
              <input id="maxWidth" v-model.number="form.maxWidth" type="number" min="0" />
            </div>

            <div class="form-group">
              <label for="colorFreezeLevel">Color Freeze Level</label>
              <input id="colorFreezeLevel" v-model.number="form.colorFreezeLevel" type="number" min="0" />
            </div>

            <div class="form-group">
              <label for="initialExpandLevel">Initial Expand Level (-1 for all)</label>
              <input id="initialExpandLevel" v-model.number="form.initialExpandLevel" type="number" min="-1" />
            </div>
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" v-model="form.isPublic" />
              Make this markmap public
            </label>
          </div>

          <div v-if="error" class="error">{{ error }}</div>
          <div v-if="success" class="success">{{ success }}</div>

          <div class="form-actions">
            <button type="submit" class="btn" :disabled="loading">
              {{ loading ? 'Saving...' : (editMode ? 'Update' : 'Create') }}
            </button>
            <NuxtLink to="/profile" class="btn btn-secondary">Cancel</NuxtLink>
          </div>
        </form>
      </div>

      <div class="preview-panel card">
        <h2>Preview</h2>
        <div class="preview-container">
          <ClientOnly>
            <MarkmapViewer 
              v-if="form.text"
              :markdown="form.text"
              :options="{
                maxWidth: form.maxWidth,
                colorFreezeLevel: form.colorFreezeLevel,
                initialExpandLevel: form.initialExpandLevel
              }"
            />
            <div v-else class="preview-placeholder">
              Enter markdown content to see preview
            </div>
          </ClientOnly>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { authFetch } = useApi()
const { isAuthenticated } = useAuth()

const editMode = ref(false)
const markmapId = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

const form = ref({
  title: '',
  text: '',
  language: '',
  topic: '',
  tags: [] as string[],
  maxWidth: 0,
  colorFreezeLevel: 0,
  initialExpandLevel: -1,
  isPublic: true
})

const tagInput = ref('')
const suggestions = ref<{ name: string; count: number }[]>([])
const showSuggestions = ref(false)
const selectedSuggestionIndex = ref(0)
let debounceTimer: NodeJS.Timeout | null = null

const loadMarkmap = async (id: string) => {
  try {
    const response = await authFetch(`/markmaps/${id}`)
    if (response.ok) {
      const markmap = await response.json()
      form.value = {
        title: markmap.title,
        text: markmap.text,
        language: markmap.language || '',
        topic: markmap.topic || '',
        tags: markmap.tags?.map((t: any) => t.tag.name) || [],
        maxWidth: markmap.maxWidth,
        colorFreezeLevel: markmap.colorFreezeLevel,
        initialExpandLevel: markmap.initialExpandLevel,
        isPublic: markmap.isPublic
      }
    }
  } catch (err) {
    error.value = 'Failed to load markmap'
  }
}

const normalizeTag = (tag: string): string => {
  const trimmed = tag.trim()
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

const tagExists = (tag: string): boolean => {
  const normalized = normalizeTag(tag)
  return form.value.tags.some(t => t.toLowerCase() === normalized.toLowerCase())
}

const addTag = () => {
  const tag = tagInput.value.trim()
  if (tag && !tagExists(tag)) {
    form.value.tags.push(normalizeTag(tag))
    tagInput.value = ''
    showSuggestions.value = false
  }
}

const removeTag = (index: number) => {
  form.value.tags.splice(index, 1)
}

const selectSuggestion = (tagName: string) => {
  if (!tagExists(tagName)) {
    form.value.tags.push(tagName)
    tagInput.value = ''
    showSuggestions.value = false
  }
}

const navigateSuggestions = (direction: number) => {
  if (filteredSuggestions.value.length === 0) return
  
  selectedSuggestionIndex.value += direction
  if (selectedSuggestionIndex.value < 0) {
    selectedSuggestionIndex.value = filteredSuggestions.value.length - 1
  } else if (selectedSuggestionIndex.value >= filteredSuggestions.value.length) {
    selectedSuggestionIndex.value = 0
  }
}

const hideSuggestions = () => {
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

const fetchTagSuggestions = async (query: string) => {
  try {
    const response = await authFetch(`/markmaps/tags/suggestions?query=${encodeURIComponent(query)}`)
    if (response.ok) {
      suggestions.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to fetch tag suggestions', err)
  }
}

const onTagInput = () => {
  showSuggestions.value = true
  selectedSuggestionIndex.value = 0
  
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  
  debounceTimer = setTimeout(() => {
    if (tagInput.value.trim()) {
      fetchTagSuggestions(tagInput.value)
    }
  }, 300)
}

const filteredSuggestions = computed(() => {
  return suggestions.value.filter(s => !tagExists(s.name))
})

const handleSubmit = async () => {
  error.value = ''
  success.value = ''
  loading.value = true

  try {
    const url = editMode.value ? `/markmaps/${markmapId.value}` : '/markmaps'
    const method = editMode.value ? 'PATCH' : 'POST'

    const response = await authFetch(url, {
      method,
      body: JSON.stringify(form.value)
    })

    if (response.ok) {
      const data = await response.json()
      success.value = editMode.value ? 'Markmap updated successfully!' : 'Markmap created successfully!'
      setTimeout(() => {
        navigateTo(`/markmaps/${data.id}`)
      }, 1000)
    } else {
      const errorData = await response.json()
      error.value = errorData.message || 'Failed to save markmap'
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to save markmap'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const id = route.query.id as string
  if (id) {
    editMode.value = true
    markmapId.value = id
    loadMarkmap(id)
  }
})
</script>

<style scoped>
h1 {
  margin-bottom: 2rem;
  color: #007bff;
}

.editor-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

@media (max-width: 1024px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }
}

.editor-panel h2,
.preview-panel h2 {
  margin-bottom: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.form-group label {
  cursor: pointer;
}

.form-group input[type="checkbox"] {
  width: auto;
  margin-right: 0.5rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.preview-container {
  height: 500px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.tags-input-container {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  background: white;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  background: #007bff;
  color: white;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 14px;
}

.tag-remove {
  background: none;
  border: none;
  color: white;
  margin-left: 4px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0 4px;
}

.tag-remove:hover {
  color: #ffcccc;
}

.tag-input-wrapper {
  position: relative;
}

.tag-input-wrapper input {
  width: 100%;
  border: none;
  outline: none;
  padding: 4px 0;
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
  margin-top: 4px;
}

.suggestion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.suggestion-item:hover,
.suggestion-item.active {
  background: #f0f0f0;
}

.suggestion-name {
  color: #000;
  font-weight: 500;
}

.suggestion-count {
  color: #999;
  font-size: 14px;
  margin-left: 8px;
}

.suggestion-item.create-new .suggestion-name {
  color: #007bff;
  font-weight: 600;
}
</style>
