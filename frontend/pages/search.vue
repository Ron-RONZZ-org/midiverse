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
          <div class="form-group">
            <label for="sortBy">Sort By</label>
            <select id="sortBy" v-model="searchForm.sortBy" class="form-control">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="relevant">Most Relevant</option>
              <option value="views">Most Views</option>
            </select>
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
            <label for="series">Series <span v-if="!searchForm.author" class="field-hint">(requires author)</span></label>
            <div class="autocomplete-wrapper">
              <input 
                id="series" 
                v-model="seriesInput" 
                type="text" 
                placeholder="Filter by series name"
                :disabled="!searchForm.author"
                @input="onSeriesInput"
                @focus="onSeriesInput"
                @blur="hideSeriesSuggestions"
              />
              <div v-if="showSeriesSuggestions && seriesSuggestions.length > 0" class="suggestions-dropdown">
                <div 
                  v-for="suggestion in seriesSuggestions" 
                  :key="suggestion.id"
                  class="suggestion-item"
                  @mousedown.prevent="selectSeriesSuggestion(suggestion)"
                >
                  <span class="suggestion-name">{{ suggestion.name }}</span>
                  <span class="suggestion-count">{{ suggestion.markmapCount }} markmaps</span>
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
          <div class="form-group">
            <label for="keynode">Keynode</label>
            <div class="autocomplete-wrapper">
              <input 
                id="keynode" 
                v-model="keynodeInput" 
                type="text" 
                placeholder="Filter by keynode (e.g., volcano)"
                @input="onKeynodeInput"
                @focus="onKeynodeInput"
                @blur="hideKeynoteSuggestions"
              />
              <div v-if="showKeynoteSuggestions && keynoteSuggestions.length > 0" class="suggestions-dropdown">
                <div 
                  v-for="suggestion in keynoteSuggestions" 
                  :key="suggestion.id"
                  class="suggestion-item"
                  @mousedown.prevent="selectKeynoteSuggestion(suggestion)"
                >
                  <span class="suggestion-name">{{ suggestion.name }}</span>
                  <span class="suggestion-category">{{ formatKeynodeCategory(suggestion.category) }}</span>
                  <span class="suggestion-count">{{ suggestion.childNodeCount }} nodes</span>
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
            By 
            <NuxtLink 
              v-if="markmap.author?.username" 
              :to="`/profile/${markmap.author.username}`"
              class="author-link"
              @click.stop
            >
              {{ markmap.author.username }}
            </NuxtLink>
            <span v-else>Anonymous</span>
            <span v-if="markmap.series">
              • Series: 
              <NuxtLink 
                :to="`/series/${markmap.author.username}/${markmap.series.slug}`"
                class="series-link"
                @click.stop
              >
                {{ markmap.series.name }}
              </NuxtLink>
            </span>
            • {{ new Date(markmap.createdAt).toLocaleDateString() }}
            <span v-if="markmap._count?.viewHistory">
               • {{ markmap._count.viewHistory }} views
            </span>
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
  series: '',
  tags: [] as string[],
  keynode: '',
  sortBy: 'newest' as 'newest' | 'oldest' | 'relevant' | 'views'
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

// Series suggestions
const seriesInput = ref('')
const seriesSuggestions = ref<any[]>([])
const showSeriesSuggestions = ref(false)
let seriesDebounceTimer: NodeJS.Timeout | null = null

// Tag suggestions
const tagInput = ref('')
const tagSuggestions = ref<{ name: string; count: number }[]>([])
const showTagSuggestions = ref(false)
let tagDebounceTimer: NodeJS.Timeout | null = null

// Keynode suggestions
const keynodeInput = ref('')
const keynoteSuggestions = ref<any[]>([])
const showKeynoteSuggestions = ref(false)
let keynodeDebounceTimer: NodeJS.Timeout | null = null

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
  
  // Clear series when author changes
  searchForm.value.series = ''
  seriesInput.value = ''
}

// Series functions
const fetchSeriesSuggestions = async (author: string) => {
  if (!author) {
    seriesSuggestions.value = []
    return
  }
  
  try {
    const response = await authFetch(`/series/suggestions?author=${encodeURIComponent(author)}`)
    if (response.ok) {
      seriesSuggestions.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to fetch series suggestions', err)
  }
}

const onSeriesInput = () => {
  showSeriesSuggestions.value = true
  
  if (!searchForm.value.author) {
    showSeriesSuggestions.value = false
    return
  }
  
  if (seriesDebounceTimer) {
    clearTimeout(seriesDebounceTimer)
  }
  
  seriesDebounceTimer = setTimeout(() => {
    fetchSeriesSuggestions(searchForm.value.author)
  }, 300)
}

const selectSeriesSuggestion = (series: any) => {
  searchForm.value.series = series.name
  seriesInput.value = series.name
  showSeriesSuggestions.value = false
}

const hideSeriesSuggestions = () => {
  setTimeout(() => {
    showSeriesSuggestions.value = false
  }, 200)
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

// Keynode functions
const formatKeynodeCategory = (category: string): string => {
  return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

const fetchKeynoteSuggestions = async (query: string) => {
  try {
    const response = await authFetch(`/keynodes/suggestions?query=${encodeURIComponent(query)}`)
    if (response.ok) {
      keynoteSuggestions.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to fetch keynode suggestions', err)
  }
}

const onKeynodeInput = () => {
  showKeynoteSuggestions.value = true
  
  if (keynodeDebounceTimer) {
    clearTimeout(keynodeDebounceTimer)
  }
  
  keynodeDebounceTimer = setTimeout(() => {
    if (keynodeInput.value.trim()) {
      fetchKeynoteSuggestions(keynodeInput.value)
    } else {
      fetchKeynoteSuggestions('')
    }
  }, 300)
}

const selectKeynoteSuggestion = (keynode: any) => {
  searchForm.value.keynode = keynode.name
  keynodeInput.value = keynode.name
  showKeynoteSuggestions.value = false
}

const hideKeynoteSuggestions = () => {
  setTimeout(() => {
    showKeynoteSuggestions.value = false
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
    if (searchForm.value.series) params.append('series', searchForm.value.series)
    if (searchForm.value.keynode) params.append('keynode', searchForm.value.keynode)
    if (searchForm.value.sortBy) params.append('sortBy', searchForm.value.sortBy)
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
  if (route.query.query || route.query.language || route.query.author || route.query.series || route.query.keynode) {
    searchForm.value = {
      query: (route.query.query as string) || '',
      language: (route.query.language as string) || '',
      author: (route.query.author as string) || '',
      series: (route.query.series as string) || '',
      keynode: (route.query.keynode as string) || '',
      tags: [],
      sortBy: (route.query.sortBy as any) || 'newest'
    }
    if (route.query.language) {
      languageInput.value = route.query.language as string
    }
    if (route.query.keynode) {
      keynodeInput.value = route.query.keynode as string
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
  color: var(--text-secondary);
}

.markmap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.markmap-card {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow);
  border: 1px solid var(--border-color);
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, background-color 0.3s ease;
}

.markmap-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 8px var(--shadow);
}

.markmap-card h3 {
  margin-bottom: 0.5rem;
  color: #007bff;
}

.meta {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.author-link, .series-link {
  color: var(--link-color, #007bff);
  text-decoration: none;
  font-weight: 500;
}

.author-link:hover, .series-link:hover {
  text-decoration: underline;
}

.tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.no-results {
  text-align: center;
  padding: 4rem;
  color: var(--text-secondary);
}

.autocomplete-wrapper {
  position: relative;
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
  transition: background-color 0.3s ease, border-color 0.3s ease;
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
  background: var(--input-border);
}

.suggestion-name {
  color: var(--text-primary);
  font-weight: 500;
}

.suggestion-detail {
  color: var(--text-secondary);
  font-size: 0.9em;
  margin-left: 0.5rem;
}

.suggestion-count {
  color: var(--text-tertiary);
  font-size: 14px;
  margin-left: 8px;
}

.suggestion-category {
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin-left: 0.5rem;
}

.field-hint {
  color: var(--text-secondary);
  font-size: 0.85em;
  font-weight: normal;
}

input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--bg-secondary) !important;
}

</style>
