<template>
  <div class="container">
    <div class="editor-header">
      <h1>{{ editMode ? 'Edit Markmap' : 'Create Markmap' }}</h1>
      <div class="editor-controls">
        <button @click="toggleFullscreen" class="btn btn-sm" type="button">
          {{ isFullscreen ? '↙ Exit Fullscreen' : '↗ Fullscreen' }}
        </button>
        <button @click="togglePreview" class="btn btn-sm" type="button" v-if="isFullscreen">
          {{ showPreview ? 'Hide Preview' : 'Show Preview' }}
        </button>
      </div>
    </div>

    <div v-if="!isAuthenticated" class="card">
      <p>You need to be logged in to create or edit markmaps.</p>
      <NuxtLink to="/login" class="btn">Login</NuxtLink>
    </div>

    <div v-else class="editor-layout" :class="{ 'fullscreen': isFullscreen, 'hide-preview': !showPreview }">
      <div class="editor-panel card">
        <h2>Editor</h2>
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="title">Title</label>
            <input id="title" v-model="form.title" type="text" required />
          </div>

          <div class="form-group">
            <label for="text">Markdown Content</label>
            <div class="textarea-wrapper">
              <textarea 
                id="text" 
                ref="textareaRef"
                v-model="form.text" 
                required
                placeholder="# Root
## Branch 1
### Sub-branch 1
### Sub-branch 2
## Branch 2

Use !{keynode} to reference keynodes (e.g., !{volcano})"
                @input="onTextInput"
                @keydown="onTextKeydown"
              ></textarea>
              <div v-if="showKeynoteSuggestions && keynodeSuggestions.length > 0" class="suggestions-dropdown keynode-suggestions" :style="keynodeSuggestionsPosition">
                <div 
                  v-for="(suggestion, index) in keynodeSuggestions.slice(0, 3)" 
                  :key="suggestion.id"
                  :class="['suggestion-item', { active: index === selectedKeynoteSuggestionIndex }]"
                  @mousedown.prevent="selectKeynoteSuggestion(suggestion)"
                  @mouseenter="selectedKeynoteSuggestionIndex = index"
                >
                  <span class="suggestion-name">{{ suggestion.name }}</span>
                  <span class="suggestion-category">{{ formatKeynodeCategory(suggestion.category) }}</span>
                  <span class="suggestion-count">{{ suggestion.childNodeCount }} nodes</span>
                </div>
                <div 
                  v-if="keynodeInput && !keynodeSuggestions.some(s => s.name.toLowerCase() === keynodeInput.toLowerCase())"
                  class="suggestion-item create-new"
                  :class="{ active: selectedKeynoteSuggestionIndex === keynodeSuggestions.slice(0, 3).length }"
                  @mousedown.prevent="showCreateKeynodeModal = true"
                  @mouseenter="selectedKeynoteSuggestionIndex = keynodeSuggestions.slice(0, 3).length"
                >
                  <span class="suggestion-name">Create new: {{ keynodeInput }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="language">Language</label>
              <div class="autocomplete-wrapper">
                <input 
                  id="language" 
                  v-model="languageInput" 
                  type="text" 
                  placeholder="e.g., en - English, fr - Français"
                  @input="onLanguageInput"
                  @focus="onLanguageInput"
                  @blur="hideLanguageSuggestions"
                />
                <div v-if="showLanguageSuggestions && languageSuggestions.length > 0" class="suggestions-dropdown">
                  <div 
                    v-for="(suggestion, index) in languageSuggestions" 
                    :key="suggestion.code"
                    :class="['suggestion-item', { active: index === selectedLanguageSuggestionIndex }]"
                    @mousedown.prevent="selectLanguageSuggestion(suggestion)"
                    @mouseenter="selectedLanguageSuggestionIndex = index"
                  >
                    <span class="suggestion-name">{{ suggestion.code }} - {{ suggestion.name }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="series">Series (optional)</label>
              <div class="series-select-container">
                <select id="series" v-model="form.seriesId">
                  <option value="">No series</option>
                  <option v-for="series in userSeries" :key="series.id" :value="series.id">
                    {{ series.name }}
                  </option>
                </select>
                <button type="button" @click="showCreateSeriesModal = true" class="btn btn-sm">+ New</button>
              </div>
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
            <NuxtLink :to="cancelUrl" class="btn btn-secondary">Cancel</NuxtLink>
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

    <!-- Create Series Modal -->
    <div v-if="showCreateSeriesModal" class="modal-overlay" @click.self="showCreateSeriesModal = false">
      <div class="modal">
        <h2>Create New Series</h2>
        <div v-if="seriesError" class="error">{{ seriesError }}</div>
        <form @submit.prevent="createSeries">
          <div class="form-group">
            <label for="seriesName">Series Name</label>
            <input 
              id="seriesName" 
              v-model="newSeriesName" 
              type="text" 
              required
              placeholder="My Learning Series"
            />
          </div>
          <div class="form-group">
            <label for="seriesDescription">Description (optional)</label>
            <textarea 
              id="seriesDescription" 
              v-model="newSeriesDescription" 
              rows="3"
              placeholder="A collection of markmaps about..."
            ></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showCreateSeriesModal = false" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn" :disabled="seriesLoading">
              {{ seriesLoading ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Create Keynode Modal -->
    <div v-if="showCreateKeynodeModal" class="modal-overlay" @click.self="showCreateKeynodeModal = false">
      <div class="modal">
        <h2>Create New Keynode</h2>
        <div v-if="keynodeError" class="error">{{ keynodeError }}</div>
        <form @submit.prevent="createKeynode">
          <div class="form-group">
            <label for="keynode-name">Name</label>
            <input 
              id="keynode-name" 
              v-model="newKeynode.name" 
              type="text" 
              required
              placeholder="volcano"
            />
          </div>
          <div class="form-group">
            <label for="keynode-category">Category</label>
            <select id="keynode-category" v-model="newKeynode.category" required>
              <option value="">Select a category</option>
              <option value="person">Person</option>
              <option value="fictional_character">Fictional Character</option>
              <option value="geographical_location">Geographical Location</option>
              <option value="date_time">Date/Time</option>
              <option value="historical_event">Historical Event</option>
              <option value="biological_species">Biological Species</option>
              <option value="abstract_concept">Abstract Concept</option>
              <option value="others">Others</option>
            </select>
          </div>
          <div class="form-group">
            <label for="keynode-parent">Parent Keynode (optional)</label>
            <div class="autocomplete-wrapper">
              <input 
                id="keynode-parent" 
                v-model="parentKeynodeInput" 
                type="text" 
                placeholder="Search for parent keynode (e.g., mountain)"
                @input="onParentKeynodeInput"
                @focus="onParentKeynodeInput"
                @blur="hideParentKeynoteSuggestions"
              />
              <div v-if="showParentKeynoteSuggestions && parentKeynoteSuggestions.length > 0" class="suggestions-dropdown">
                <div 
                  v-for="suggestion in parentKeynoteSuggestions" 
                  :key="suggestion.id"
                  class="suggestion-item"
                  @mousedown.prevent="selectParentKeynode(suggestion)"
                >
                  <span class="suggestion-name">{{ suggestion.name }}</span>
                  <span class="suggestion-category">{{ formatKeynodeCategory(suggestion.category) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showCreateKeynodeModal = false" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn" :disabled="keynodeLoading">
              {{ keynodeLoading ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { authFetch } = useApi()
const { isAuthenticated, currentUser } = useAuth()

const editMode = ref(false)
const markmapId = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

const form = ref({
  title: '',
  text: '',
  language: '',
  seriesId: '',
  tags: [] as string[],
  keynodes: [] as string[],
  maxWidth: 0,
  colorFreezeLevel: 0,
  initialExpandLevel: -1,
  isPublic: true
})

// Series state
const userSeries = ref<any[]>([])
const showCreateSeriesModal = ref(false)
const newSeriesName = ref('')
const newSeriesDescription = ref('')
const seriesLoading = ref(false)
const seriesError = ref('')

const tagInput = ref('')
const suggestions = ref<{ name: string; count: number }[]>([])
const showSuggestions = ref(false)
const selectedSuggestionIndex = ref(0)
let debounceTimer: NodeJS.Timeout | null = null

// Language suggestions
const languageInput = ref('')
const languageSuggestions = ref<{ code: string; name: string }[]>([])
const showLanguageSuggestions = ref(false)
const selectedLanguageSuggestionIndex = ref(0)
let languageDebounceTimer: NodeJS.Timeout | null = null

// Keynode suggestions
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const keynodeInput = ref('')
const keynodeSuggestions = ref<any[]>([])
const showKeynoteSuggestions = ref(false)
const selectedKeynoteSuggestionIndex = ref(0)
const keynodeSuggestionsPosition = ref({ top: '0px', left: '0px' })
let keynodeDebounceTimer: NodeJS.Timeout | null = null
let keynodeStartPos = 0

// Keynode creation modal
const showCreateKeynodeModal = ref(false)
const newKeynode = ref({
  name: '',
  category: '',
  parentId: ''
})
const keynodeLoading = ref(false)
const keynodeError = ref('')

// Parent keynode selection
const parentKeynodeInput = ref('')
const parentKeynoteSuggestions = ref<any[]>([])
const showParentKeynoteSuggestions = ref(false)
let parentKeynodeDebounceTimer: NodeJS.Timeout | null = null

const cancelUrl = computed(() => {
  if (currentUser.value?.username) {
    return `/profile/${currentUser.value.username}`
  }
  return '/profile'
})

// Fullscreen mode
const isFullscreen = ref(false)
const showPreview = ref(true)

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  if (!isFullscreen.value) {
    showPreview.value = true
  }
}

const togglePreview = () => {
  showPreview.value = !showPreview.value
}

const loadMarkmap = async (id: string) => {
  try {
    const response = await authFetch(`/markmaps/${id}`)
    if (response.ok) {
      const markmap = await response.json()
      form.value = {
        title: markmap.title,
        text: markmap.text,
        language: markmap.language || '',
        seriesId: markmap.seriesId || '',
        tags: markmap.tags?.map((t: any) => t.tag.name) || [],
        keynodes: markmap.keynodes?.map((k: any) => k.keynode.name) || [],
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

const loadUserSeries = async () => {
  try {
    if (currentUser.value?.username) {
      const response = await authFetch(`/series/user/${currentUser.value.username}`)
      if (response.ok) {
        userSeries.value = await response.json()
      }
    }
  } catch (err) {
    console.error('Failed to load series', err)
  }
}

const createSeries = async () => {
  if (!newSeriesName.value.trim()) {
    seriesError.value = 'Series name is required'
    return
  }

  seriesLoading.value = true
  seriesError.value = ''

  try {
    const response = await authFetch('/series', {
      method: 'POST',
      body: JSON.stringify({
        name: newSeriesName.value,
        description: newSeriesDescription.value,
        isPublic: true
      })
    })

    if (response.ok) {
      const newSeries = await response.json()
      userSeries.value.push(newSeries)
      form.value.seriesId = newSeries.id
      showCreateSeriesModal.value = false
      newSeriesName.value = ''
      newSeriesDescription.value = ''
    } else {
      const errorData = await response.json()
      seriesError.value = errorData.message || 'Failed to create series'
    }
  } catch (err: any) {
    seriesError.value = err.message || 'Failed to create series'
  } finally {
    seriesLoading.value = false
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

const fetchLanguageSuggestions = async (query: string) => {
  try {
    const response = await authFetch(`/markmaps/languages/suggestions?query=${encodeURIComponent(query)}`)
    if (response.ok) {
      languageSuggestions.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to fetch language suggestions', err)
  }
}

const onLanguageInput = () => {
  showLanguageSuggestions.value = true
  selectedLanguageSuggestionIndex.value = 0
  
  if (languageDebounceTimer) {
    clearTimeout(languageDebounceTimer)
  }
  
  languageDebounceTimer = setTimeout(() => {
    if (languageInput.value.trim()) {
      fetchLanguageSuggestions(languageInput.value)
    } else {
      fetchLanguageSuggestions('')
    }
  }, 300)
}

const selectLanguageSuggestion = (language: { code: string; name: string }) => {
  form.value.language = language.code
  languageInput.value = `${language.code} - ${language.name}`
  showLanguageSuggestions.value = false
}

const hideLanguageSuggestions = () => {
  setTimeout(() => {
    showLanguageSuggestions.value = false
  }, 200)
}

// Keynode functions
const formatKeynodeCategory = (category: string): string => {
  return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

const detectKeynodeInput = (text: string, cursorPos: number): { start: number; query: string } | null => {
  // Find the last !{ before cursor
  const beforeCursor = text.substring(0, cursorPos)
  const lastOpenBrace = beforeCursor.lastIndexOf('!{')
  
  if (lastOpenBrace === -1) return null
  
  // Check if there's a closing brace after the last opening brace
  const afterOpenBrace = text.substring(lastOpenBrace)
  const closeBracePos = afterOpenBrace.indexOf('}')
  
  // If cursor is after closing brace, no input
  if (closeBracePos !== -1 && closeBracePos < (cursorPos - lastOpenBrace)) {
    return null
  }
  
  // Extract the query between !{ and cursor
  const query = beforeCursor.substring(lastOpenBrace + 2)
  
  return { start: lastOpenBrace, query }
}

const fetchKeynoteSuggestions = async (query: string) => {
  try {
    const response = await authFetch(`/keynodes/suggestions?query=${encodeURIComponent(query)}`)
    if (response.ok) {
      keynodeSuggestions.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to fetch keynode suggestions', err)
  }
}

const onTextInput = () => {
  if (!textareaRef.value) return
  
  const cursorPos = textareaRef.value.selectionStart
  const detection = detectKeynodeInput(form.value.text, cursorPos)
  
  if (detection) {
    keynodeInput.value = detection.query
    keynodeStartPos = detection.start
    showKeynoteSuggestions.value = true
    selectedKeynoteSuggestionIndex.value = 0
    
    // Position the suggestions dropdown below the textarea
    // Using a fixed position relative to the textarea wrapper
    keynodeSuggestionsPosition.value = {
      top: '100%',
      left: '0'
    }
    
    if (keynodeDebounceTimer) {
      clearTimeout(keynodeDebounceTimer)
    }
    
    keynodeDebounceTimer = setTimeout(() => {
      if (detection.query.trim()) {
        fetchKeynoteSuggestions(detection.query)
      } else {
        fetchKeynoteSuggestions('')
      }
    }, 300)
  } else {
    showKeynoteSuggestions.value = false
    keynodeInput.value = ''
  }
}

const onTextKeydown = (event: KeyboardEvent) => {
  if (!showKeynoteSuggestions.value) return
  
  const maxIndex = Math.min(3, keynodeSuggestions.value.length)
  const hasCreateOption = keynodeInput.value && !keynodeSuggestions.value.some(
    s => s.name.toLowerCase() === keynodeInput.value.toLowerCase()
  )
  const totalOptions = maxIndex + (hasCreateOption ? 1 : 0)
  
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedKeynoteSuggestionIndex.value = (selectedKeynoteSuggestionIndex.value + 1) % totalOptions
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedKeynoteSuggestionIndex.value = (selectedKeynoteSuggestionIndex.value - 1 + totalOptions) % totalOptions
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const maxSuggestions = Math.min(3, keynodeSuggestions.value.length)
    
    if (selectedKeynoteSuggestionIndex.value < maxSuggestions) {
      selectKeynoteSuggestion(keynodeSuggestions.value[selectedKeynoteSuggestionIndex.value])
    } else if (hasCreateOption) {
      newKeynode.value.name = keynodeInput.value
      showCreateKeynodeModal.value = true
      showKeynoteSuggestions.value = false
    }
  } else if (event.key === 'Escape') {
    showKeynoteSuggestions.value = false
  }
}

const selectKeynoteSuggestion = (keynode: any) => {
  if (!textareaRef.value) return
  
  const cursorPos = textareaRef.value.selectionStart
  const text = form.value.text
  const beforeKeynode = text.substring(0, keynodeStartPos)
  const afterCursor = text.substring(cursorPos)
  
  // Create markdown link to search page with keynode filter
  const keynodeLink = `[${keynode.name}](/search?keynode=${encodeURIComponent(keynode.name)})`
  
  form.value.text = beforeKeynode + keynodeLink + afterCursor
  
  // Add keynode to form data
  if (!form.value.keynodes.includes(keynode.name)) {
    form.value.keynodes.push(keynode.name)
  }
  
  showKeynoteSuggestions.value = false
  keynodeInput.value = ''
  
  // Set cursor after the inserted link
  nextTick(() => {
    if (textareaRef.value) {
      const newCursorPos = beforeKeynode.length + keynodeLink.length
      textareaRef.value.setSelectionRange(newCursorPos, newCursorPos)
      textareaRef.value.focus()
    }
  })
}

const fetchParentKeynoteSuggestions = async (query: string) => {
  try {
    const response = await authFetch(`/keynodes/suggestions?query=${encodeURIComponent(query)}`)
    if (response.ok) {
      parentKeynoteSuggestions.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to fetch parent keynode suggestions', err)
  }
}

const onParentKeynodeInput = () => {
  showParentKeynoteSuggestions.value = true
  
  if (parentKeynodeDebounceTimer) {
    clearTimeout(parentKeynodeDebounceTimer)
  }
  
  parentKeynodeDebounceTimer = setTimeout(() => {
    if (parentKeynodeInput.value.trim()) {
      fetchParentKeynoteSuggestions(parentKeynodeInput.value)
    } else {
      fetchParentKeynoteSuggestions('')
    }
  }, 300)
}

const selectParentKeynode = (keynode: any) => {
  newKeynode.value.parentId = keynode.id
  parentKeynodeInput.value = keynode.name
  showParentKeynoteSuggestions.value = false
}

const hideParentKeynoteSuggestions = () => {
  setTimeout(() => {
    showParentKeynoteSuggestions.value = false
  }, 200)
}

const createKeynode = async () => {
  if (!newKeynode.value.name.trim() || !newKeynode.value.category) {
    keynodeError.value = 'Name and category are required'
    return
  }
  
  keynodeLoading.value = true
  keynodeError.value = ''
  
  try {
    const payload: any = {
      name: newKeynode.value.name,
      category: newKeynode.value.category
    }
    
    if (newKeynode.value.parentId) {
      payload.parentId = newKeynode.value.parentId
    }
    
    const response = await authFetch('/keynodes', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    
    if (response.ok) {
      const createdKeynode = await response.json()
      
      // Insert the keynode into the text
      if (textareaRef.value) {
        const cursorPos = textareaRef.value.selectionStart
        const text = form.value.text
        const beforeKeynode = text.substring(0, keynodeStartPos)
        const afterCursor = text.substring(cursorPos)
        
        const keynodeLink = `[${createdKeynode.name}](/search?keynode=${encodeURIComponent(createdKeynode.name)})`
        form.value.text = beforeKeynode + keynodeLink + afterCursor
        
        // Add to keynodes array
        if (!form.value.keynodes.includes(createdKeynode.name)) {
          form.value.keynodes.push(createdKeynode.name)
        }
        
        // Set cursor after the inserted link
        nextTick(() => {
          if (textareaRef.value) {
            const newCursorPos = beforeKeynode.length + keynodeLink.length
            textareaRef.value.setSelectionRange(newCursorPos, newCursorPos)
            textareaRef.value.focus()
          }
        })
      }
      
      showCreateKeynodeModal.value = false
      showKeynoteSuggestions.value = false
      newKeynode.value = { name: '', category: '', parentId: '' }
      parentKeynodeInput.value = ''
    } else {
      const errorData = await response.json()
      keynodeError.value = errorData.message || 'Failed to create keynode'
    }
  } catch (err) {
    keynodeError.value = 'Failed to create keynode'
  } finally {
    keynodeLoading.value = false
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

    // Clean the form data - convert empty seriesId to undefined
    const submitData = {
      ...form.value,
      seriesId: form.value.seriesId || undefined
    }

    const response = await authFetch(url, {
      method,
      body: JSON.stringify(submitData)
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
  loadUserSeries()
})
</script>

<style scoped>
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.editor-header h1 {
  margin: 0;
}

.editor-controls {
  display: flex;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

h1 {
  margin-bottom: 2rem;
  color: #007bff;
}

.editor-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  transition: all 0.3s ease;
}

.editor-layout.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: #f5f5f5;
  padding: 1rem;
  margin: 0;
  gap: 1rem;
  grid-template-columns: 1fr 1fr;
}

.editor-layout.fullscreen.hide-preview {
  grid-template-columns: 1fr;
}

.editor-layout.fullscreen .preview-panel {
  display: block;
}

.editor-layout.fullscreen.hide-preview .preview-panel {
  display: none;
}

.editor-layout.fullscreen .editor-panel,
.editor-layout.fullscreen .preview-panel {
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
}

@media (max-width: 1024px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }
  
  .editor-layout.fullscreen {
    grid-template-columns: 1fr;
  }
  
  .editor-layout.fullscreen.hide-preview {
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

.editor-layout.fullscreen .preview-container {
  height: calc(100vh - 150px);
}

.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.tags-input-container {
  border: 1px solid var(--input-border);
  border-radius: 4px;
  padding: 8px;
  background: var(--input-bg);
  transition: background-color 0.3s ease, border-color 0.3s ease;
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
  background: transparent;
  color: var(--text-primary);
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--card-bg);
  border: 1px solid var(--input-border);
  border-radius: 4px;
  box-shadow: 0 2px 8px var(--shadow);
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
  margin-top: 4px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
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
  background: var(--input-border);
}

.suggestion-name {
  color: var(--text-primary);
  font-weight: 500;
}

.suggestion-count {
  color: var(--text-secondary);
  font-size: 14px;
  margin-left: 8px;
}

.suggestion-item.create-new .suggestion-name {
  color: #007bff;
  font-weight: 600;
}

.autocomplete-wrapper {
  position: relative;
}

.series-select-container {
  display: flex;
  gap: 0.5rem;
}

.series-select-container select {
  flex: 1;
}

.series-select-container .btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  white-space: nowrap;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h2 {
  margin-bottom: 1.5rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.textarea-wrapper {
  position: relative;
}

.keynode-suggestions {
  position: absolute;
  z-index: 1000;
  max-width: 400px;
  min-width: 300px;
}

.suggestion-category {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-left: 0.5rem;
}

</style>
