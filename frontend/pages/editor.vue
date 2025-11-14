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
  maxWidth: 0,
  colorFreezeLevel: 0,
  initialExpandLevel: -1,
  isPublic: true
})

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
</style>
