<template>
  <div class="container">
    <h1>Search Markmaps</h1>

    <div class="search-form card">
      <form @submit.prevent="handleSearch">
        <div class="form-row">
          <div class="form-group">
            <label for="query">Search</label>
            <input 
              id="query" 
              v-model="searchForm.query" 
              type="text" 
              placeholder="Search by title or content"
            />
          </div>
          <div class="form-group">
            <label for="language">Language</label>
            <div class="autocomplete-wrapper">
              <input 
                id="language" 
                v-model="languageInput" 
                type="text" 
                placeholder="e.g., en, fr"
                @input="onLanguageInput"
                @focus="onLanguageInput"
                @blur="hideLanguageSuggestions"
              />
              <div v-if="showLanguageSuggestions && languageSuggestions.length > 0" class="suggestions-dropdown">
                <div 
                  v-for="suggestion in languageSuggestions" 
                  :key="suggestion.code"
                  class="suggestion-item"
                  @mousedown.prevent="selectLanguageSuggestion(suggestion)"
                >
                  <span class="suggestion-name">{{ suggestion.code }} - {{ suggestion.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="author">Author</label>
            <div class="autocomplete-wrapper">
              <input 
                id="author" 
                v-model="searchForm.author" 
                type="text" 
                placeholder="Filter by author username"
                @input="onAuthorInput"
                @focus="onAuthorInput"
                @blur="hideAuthorSuggestions"
              />
              <div v-if="showAuthorSuggestions && authorSuggestions.length > 0" class="suggestions-dropdown">
                <div 
                  v-for="suggestion in authorSuggestions" 
                  :key="suggestion.username"
                  class="suggestion-item"
                  @mousedown.prevent="selectAuthorSuggestion(suggestion)"
                >
                  <span class="suggestion-name">
                    {{ suggestion.username }}
                    <span v-if="suggestion.displayName" class="suggestion-detail">{{ suggestion.displayName }}</span>
                  </span>
                  <span class="suggestion-count">{{ suggestion.markmapCount }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label for="tags">Tags</label>
            <div class="tags-input-container">
              <div class="tags-list">
                <span v-for="(tag, index) in searchForm.tags" :key="index" class="tag-chip">
                  {{ tag }}
                  <button type="button" @click="removeTag(index)" class="tag-remove">&times;</button>
                </span>
              </div>
              <div class="tag-input-wrapper">
                <input 
                  id="tags" 
                  v-model="tagInput" 
                  type="text" 
                  placeholder="Add tags (e.g., #javascript)"
                  @input="onTagInput"
                  @keydown.enter.prevent="addTag"
                  @blur="hideTagSuggestions"
                />
                <div v-if="showTagSuggestions && tagSuggestions.length > 0" class="suggestions-dropdown">
                  <div 
                    v-for="suggestion in tagSuggestions" 
                    :key="suggestion.name"
                    class="suggestion-item"
                    @mousedown.prevent="selectTagSuggestion(suggestion.name)"
                  >
                    <span class="suggestion-name">{{ suggestion.name }}</span>
                    <span class="suggestion-count">{{ suggestion.count }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button type="submit" class="btn" :disabled="loading">
          {{ loading ? 'Searching...' : 'Search' }}
        </button>
      </form>
    </div>

    <div v-if="loading" class="loading">Searching...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="searched">
      <h2>Search Results ({{ results.length }})</h2>
      <div v-if="results.length === 0" class="no-results">
        No markmaps found matching your search criteria.
      </div>
      <div v-else class="markmap-grid">
        <NuxtLink 
          v-for="markmap in results" 
          :key="markmap.id" 
          :to="`/markmaps/${markmap.id}`"
          class="markmap-card"
        >
          <h3>{{ markmap.title }}</h3>
          <p class="meta">
            By {{ markmap.author?.username || 'Anonymous' }} • 
            {{ new Date(markmap.createdAt).toLocaleDateString() }}
          </p>
          <div class="tags">
            <span v-if="markmap.language" class="tag">{{ markmap.language }}</span>
            <span v-for="tag in markmap.tags" :key="tag.id" class="tag">{{ tag.tag.name }}</span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { authFetch } = useApi()

const searchForm = ref({
  query: '',
  language: '',
  author: '',
  tags: [] as string[]
})

const results = ref<any[]>([])
const loading = ref(false)
const error = ref('')
const searched = ref(false)

// Language suggestions
const languageInput = ref('')
const languageSuggestions = ref<{ code: string; name: string }[]>([])
const showLanguageSuggestions = ref(false)
let languageDebounceTimer: NodeJS.Timeout | null = null

// Author suggestions
const authorSuggestions = ref<any[]>([])
const showAuthorSuggestions = ref(false)
let authorDebounceTimer: NodeJS.Timeout | null = null

// Tag suggestions
const tagInput = ref('')
const tagSuggestions = ref<{ name: string; count: number }[]>([])
const showTagSuggestions = ref(false)
let tagDebounceTimer: NodeJS.Timeout | null = null

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

const fetchAuthorSuggestions = async (query: string) => {
  try {
    const response = await authFetch(`/markmaps/authors/suggestions?query=${encodeURIComponent(query)}`)
    if (response.ok) {
      authorSuggestions.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to fetch author suggestions', err)
  }
}

const fetchTagSuggestions = async (query: string) => {
  try {
    const response = await authFetch(`/markmaps/tags/suggestions?query=${encodeURIComponent(query)}`)
    if (response.ok) {
      tagSuggestions.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to fetch tag suggestions', err)
  }
}

const onLanguageInput = () => {
  showLanguageSuggestions.value = true
  
  if (languageDebounceTimer) {
    clearTimeout(languageDebounceTimer)
  }
  
  languageDebounceTimer = setTimeout(() => {
    fetchLanguageSuggestions(languageInput.value || '')
  }, 300)
}

const onAuthorInput = () => {
  showAuthorSuggestions.value = true
  
  if (authorDebounceTimer) {
    clearTimeout(authorDebounceTimer)
  }
  
  authorDebounceTimer = setTimeout(() => {
    if (searchForm.value.author.trim()) {
      fetchAuthorSuggestions(searchForm.value.author)
    }
  }, 300)
}

const onTagInput = () => {
  showTagSuggestions.value = true
  
  if (tagDebounceTimer) {
    clearTimeout(tagDebounceTimer)
  }
  
  tagDebounceTimer = setTimeout(() => {
    if (tagInput.value.trim()) {
      fetchTagSuggestions(tagInput.value)
    }
  }, 300)
}

const selectLanguageSuggestion = (language: { code: string; name: string }) => {
  searchForm.value.language = language.code
  languageInput.value = `${language.code} - ${language.name}`
  showLanguageSuggestions.value = false
}

const selectAuthorSuggestion = (author: any) => {
  searchForm.value.author = author.username
  showAuthorSuggestions.value = false
}

const selectTagSuggestion = (tagName: string) => {
  if (!searchForm.value.tags.includes(tagName)) {
    searchForm.value.tags.push(tagName)
    tagInput.value = ''
    showTagSuggestions.value = false
  }
}

const addTag = () => {
  const tag = tagInput.value.trim()
  if (tag && !searchForm.value.tags.includes(tag)) {
    const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`
    searchForm.value.tags.push(normalizedTag)
    tagInput.value = ''
    showTagSuggestions.value = false
  }
}

const removeTag = (index: number) => {
  searchForm.value.tags.splice(index, 1)
}

const hideLanguageSuggestions = () => {
  setTimeout(() => {
    showLanguageSuggestions.value = false
  }, 200)
}

const hideAuthorSuggestions = () => {
  setTimeout(() => {
    showAuthorSuggestions.value = false
  }, 200)
}

const hideTagSuggestions = () => {
  setTimeout(() => {
    showTagSuggestions.value = false
  }, 200)
}

const handleSearch = async () => {
  error.value = ''
  loading.value = true
  searched.value = true

  try {
    const params = new URLSearchParams()
    if (searchForm.value.query) params.append('query', searchForm.value.query)
    if (searchForm.value.language) params.append('language', searchForm.value.language)
    if (searchForm.value.author) params.append('author', searchForm.value.author)
    if (searchForm.value.tags.length > 0) {
      searchForm.value.tags.forEach(tag => params.append('tags', tag))
    }

    const queryString = params.toString()
    const url = queryString ? `/markmaps/search?${queryString}` : '/markmaps'

    const response = await authFetch(url)
    if (response.ok) {
      results.value = await response.json()
    } else {
      error.value = 'Search failed'
    }
  } catch (err: any) {
    error.value = err.message || 'Search failed'
  } finally {
    loading.value = false
  }
}

// Auto-search if query params are present
onMounted(() => {
  const route = useRoute()
  if (route.query.query || route.query.language || route.query.author) {
    searchForm.value = {
      query: (route.query.query as string) || '',
      language: (route.query.language as string) || '',
      author: (route.query.author as string) || '',
      tags: []
    }
    if (route.query.language) {
      languageInput.value = route.query.language as string
    }
    handleSearch()
  }
})
</script>

<style scoped>
h1 {
  margin-bottom: 2rem;
  color: #007bff;
}

.search-form {
  margin-bottom: 2rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.loading {
  text-align: center;
  padding: 4rem;
  color: #666;
}

.markmap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.markmap-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s;
}

.markmap-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.markmap-card h3 {
  margin-bottom: 0.5rem;
  color: #007bff;
}

.meta {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  background: #e9ecef;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
}

.no-results {
  text-align: center;
  padding: 4rem;
  color: #666;
}

.autocomplete-wrapper {
  position: relative;
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

.suggestion-item:hover {
  background: #f0f0f0;
}

.suggestion-name {
  color: #000;
  font-weight: 500;
}

.suggestion-detail {
  color: #666;
  font-size: 0.9em;
  margin-left: 0.5rem;
}

.suggestion-count {
  color: #999;
  font-size: 14px;
  margin-left: 8px;
}

</style>
