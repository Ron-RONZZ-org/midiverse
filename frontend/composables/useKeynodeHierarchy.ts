/**
 * Composable for fetching keynode hierarchy data
 */
export const useKeynodeHierarchy = () => {
  const { authFetch } = useApi()

  const hierarchyMarkdown = ref('')
  const loading = ref(true)
  const error = ref('')
  const showReferenceCounts = ref(false)
  const availableCategories = ref<string[]>([])

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

  const loadCategories = async () => {
    try {
      const response = await authFetch('/keynodes/categories')

      if (response.ok) {
        const data = await response.json()
        availableCategories.value = data.available
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const formatCategory = (category: string): string => {
    return category.replace(/_/g, ' ')
  }

  return {
    hierarchyMarkdown,
    loading,
    error,
    showReferenceCounts,
    availableCategories,
    loadHierarchy,
    loadCategories,
    formatCategory,
  }
}
