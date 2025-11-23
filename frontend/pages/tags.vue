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
      <div v-else>
        <div v-if="statistics.length === 0" class="empty-state">No tag data available</div>
        <div v-else ref="barChartRef" class="chart-container"></div>
      </div>
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
      <div v-else>
        <div v-if="trendData.length === 0" class="empty-state">Enter a tag to see its historical trend</div>
        <div v-else ref="lineChartRef" class="chart-container"></div>
      </div>
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
    try {
      const module = await import('plotly.js-dist-min')
      Plotly = module.default
      plotlyLoaded.value = true
      // Trigger initial data fetch after Plotly is loaded
      fetchStatistics()
    } catch (err) {
      console.error('Failed to load Plotly:', err)
      error.value = 'Failed to load chart library'
    }
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
      const data = await response.json()
      statistics.value = data
    } else {
      const errorText = await response.text()
      console.error('Failed to load tag statistics:', errorText)
      error.value = 'Failed to load tag statistics'
    }
  } catch (err: any) {
    console.error('Error fetching statistics:', err)
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
  if (!plotlyLoaded.value || !Plotly || !barChartRef.value || statistics.value.length === 0) {
    return
  }

  try {
    // Check if dark theme is active
    const isDark = document.documentElement.classList.contains('dark-theme')
    const bgColor = isDark ? '#2d2d2d' : '#ffffff'
    const textColor = isDark ? '#e0e0e0' : '#333333'
    const gridColor = isDark ? '#404040' : '#e0e0e0'

    const data = [{
      x: statistics.value.map(s => s.name),
      y: statistics.value.map(s => s.count),
      type: 'bar',
      marker: {
        color: '#007bff'
      }
    }]

    const layout = {
      title: {
        text: `Top 10 Tags (${timeFilters.find(f => f.value === selectedFilter.value)?.label})`,
        font: { size: 24, color: textColor }
      },
      xaxis: {
        title: {
          text: 'Tag',
          font: { size: 18, color: textColor }
        },
        tickangle: -45,
        tickfont: { size: 16, color: textColor },
        gridcolor: gridColor,
        color: textColor
      },
      yaxis: {
        title: {
          text: 'Number of Markmaps',
          font: { size: 18, color: textColor }
        },
        tickfont: { size: 16, color: textColor },
        gridcolor: gridColor,
        color: textColor
      },
      margin: {
        b: 120,
        l: 80,
        r: 40,
        t: 80
      },
      font: { size: 16, color: textColor },
      paper_bgcolor: bgColor,
      plot_bgcolor: bgColor
    }

    Plotly.newPlot(barChartRef.value, data as any, layout as any, { responsive: true })
  } catch (err) {
    console.error('Error rendering bar chart:', err)
    error.value = `Failed to render chart: ${err}`
  }
}

const renderLineChart = () => {
  if (!plotlyLoaded.value || !Plotly || !lineChartRef.value || trendData.value.length === 0) {
    return
  }

  try {
    // Check if dark theme is active
    const isDark = document.documentElement.classList.contains('dark-theme')
    const bgColor = isDark ? '#2d2d2d' : '#ffffff'
    const textColor = isDark ? '#e0e0e0' : '#333333'
    const gridColor = isDark ? '#404040' : '#e0e0e0'

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
      title: {
        text: `Trend for ${searchTag.value} (Last 30 Days)`,
        font: { size: 24, color: textColor }
      },
      xaxis: {
        title: {
          text: 'Date',
          font: { size: 18, color: textColor }
        },
        tickfont: { size: 16, color: textColor },
        gridcolor: gridColor,
        color: textColor
      },
      yaxis: {
        title: {
          text: 'Number of Markmaps',
          font: { size: 18, color: textColor }
        },
        tickfont: { size: 16, color: textColor },
        gridcolor: gridColor,
        color: textColor
      },
      margin: {
        l: 80,
        r: 40,
        t: 80,
        b: 60
      },
      font: { size: 16, color: textColor },
      paper_bgcolor: bgColor,
      plot_bgcolor: bgColor
    }

    Plotly.newPlot(lineChartRef.value, data as any, layout as any, { responsive: true })
  } catch (err) {
    console.error('Error rendering line chart:', err)
    trendError.value = `Failed to render chart: ${err}`
  }
}

const onSearchInput = () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  
  searchDebounceTimer = setTimeout(() => {
    fetchTrendData(searchTag.value)
  }, 500)
}

// Watch for changes in statistics data and loading state to automatically render bar chart
watch([statistics, loading, plotlyLoaded], async () => {
  if (!loading.value && plotlyLoaded.value) {
    await nextTick()
    renderBarChart()
  }
})

// Watch for changes in trend data and loading state to automatically render line chart
watch([trendData, trendLoading, plotlyLoaded], async () => {
  if (!trendLoading.value && plotlyLoaded.value) {
    await nextTick()
    renderLineChart()
  }
})

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
