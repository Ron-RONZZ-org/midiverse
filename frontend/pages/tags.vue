<template>
  <div class="container">
    <h1>Trending Tags</h1>

    <div class="card">
      <h2>Most Popular Tags</h2>
      
      <div class="filter-buttons">
        <button 
          v-for="filter in timeFilters" 
          :key="filter.value"
          :class="['btn', 'btn-filter', { active: selectedFilter === filter.value }]"
          @click="selectedFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>

      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else ref="barChartRef" class="chart-container"></div>
    </div>

    <div class="card">
      <h2>Historical Trend</h2>
      
      <div class="form-group">
        <label for="tag-search">Search for a tag</label>
        <input 
          id="tag-search" 
          v-model="searchTag" 
          type="text" 
          placeholder="e.g., #javascript"
          @input="onSearchInput"
        />
      </div>

      <div v-if="trendLoading" class="loading">Loading trend data...</div>
      <div v-else-if="trendError" class="error">{{ trendError }}</div>
      <div v-else-if="trendData.length > 0" ref="lineChartRef" class="chart-container"></div>
      <div v-else class="empty-state">Enter a tag to see its historical trend</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { authFetch } = useApi()

// Dynamically import Plotly only on client side to avoid SSR issues
let Plotly: any = null
const plotlyLoaded = ref(false)

onMounted(async () => {
  if (process.client) {
    const module = await import('plotly.js-dist-min')
    Plotly = module.default
    plotlyLoaded.value = true
    // Trigger initial data fetch after Plotly is loaded
    fetchStatistics()
  }
})

const timeFilters = [
  { label: 'All Time', value: 'all' },
  { label: 'Last 24 Hours', value: '24h' },
  { label: 'Last Hour', value: '1h' }
]

const selectedFilter = ref('all')
const loading = ref(false)
const error = ref('')
const statistics = ref<{ name: string; count: number }[]>([])

const searchTag = ref('')
const trendLoading = ref(false)
const trendError = ref('')
const trendData = ref<{ date: string; count: number }[]>([])

const barChartRef = ref<HTMLElement | null>(null)
const lineChartRef = ref<HTMLElement | null>(null)

let searchDebounceTimer: NodeJS.Timeout | null = null

const fetchStatistics = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const response = await authFetch(`/markmaps/tags/statistics?timeFilter=${selectedFilter.value}`)
    if (response.ok) {
      statistics.value = await response.json()
      await nextTick()
      renderBarChart()
    } else {
      error.value = 'Failed to load tag statistics'
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load tag statistics'
  } finally {
    loading.value = false
  }
}

const fetchTrendData = async (tag: string) => {
  if (!tag.trim()) {
    trendData.value = []
    return
  }

  trendLoading.value = true
  trendError.value = ''
  
  try {
    const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`
    const response = await authFetch(`/markmaps/tags/trend/${encodeURIComponent(normalizedTag)}`)
    if (response.ok) {
      trendData.value = await response.json()
      await nextTick()
      renderLineChart()
    } else {
      trendError.value = 'Failed to load trend data'
    }
  } catch (err: any) {
    trendError.value = err.message || 'Failed to load trend data'
  } finally {
    trendLoading.value = false
  }
}

const renderBarChart = () => {
  if (!plotlyLoaded.value || !Plotly || !barChartRef.value || statistics.value.length === 0) return

  const data = [{
    x: statistics.value.map(s => s.name),
    y: statistics.value.map(s => s.count),
    type: 'bar',
    marker: {
      color: '#007bff'
    }
  }]

  const layout = {
    title: `Top 10 Tags (${timeFilters.find(f => f.value === selectedFilter.value)?.label})`,
    xaxis: {
      title: 'Tag',
      tickangle: -45
    },
    yaxis: {
      title: 'Number of Markmaps'
    },
    margin: {
      b: 100
    }
  }

  Plotly.newPlot(barChartRef.value, data as any, layout as any, { responsive: true })
}

const renderLineChart = () => {
  if (!plotlyLoaded.value || !Plotly || !lineChartRef.value || trendData.value.length === 0) return

  const data = [{
    x: trendData.value.map(d => d.date),
    y: trendData.value.map(d => d.count),
    type: 'scatter',
    mode: 'lines+markers',
    line: {
      color: '#28a745',
      width: 2
    },
    marker: {
      size: 6
    }
  }]

  const layout = {
    title: `Trend for ${searchTag.value} (Last 30 Days)`,
    xaxis: {
      title: 'Date'
    },
    yaxis: {
      title: 'Number of Markmaps'
    }
  }

  Plotly.newPlot(lineChartRef.value, data as any, layout as any, { responsive: true })
}

const onSearchInput = () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  
  searchDebounceTimer = setTimeout(() => {
    fetchTrendData(searchTag.value)
  }, 500)
}

watch(selectedFilter, () => {
  fetchStatistics()
})
</script>

<style scoped>
h1 {
  margin-bottom: 2rem;
  color: #007bff;
}

h2 {
  margin-bottom: 1.5rem;
}

.filter-buttons {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.btn-filter {
  padding: 0.5rem 1rem;
  background: #f0f0f0;
  border: 1px solid #ddd;
  color: #333;
}

.btn-filter.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.chart-container {
  min-height: 400px;
  margin-top: 1rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #999;
  font-style: italic;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  max-width: 400px;
}
</style>
