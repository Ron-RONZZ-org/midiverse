export const useTheme = () => {
  const isDarkTheme = useState('darkTheme', () => false)

  const initTheme = () => {
    if (process.client) {
      // Load theme preference from localStorage or preferences API
      const savedTheme = localStorage.getItem('darkTheme')
      if (savedTheme !== null) {
        isDarkTheme.value = savedTheme === 'true'
        applyTheme(isDarkTheme.value)
      }
    }
  }

  const applyTheme = (isDark: boolean) => {
    if (process.client) {
      if (isDark) {
        document.documentElement.classList.add('dark-theme')
      } else {
        document.documentElement.classList.remove('dark-theme')
      }
    }
  }

  const toggleTheme = () => {
    isDarkTheme.value = !isDarkTheme.value
    if (process.client) {
      localStorage.setItem('darkTheme', String(isDarkTheme.value))
    }
    applyTheme(isDarkTheme.value)
  }

  const setTheme = (isDark: boolean) => {
    isDarkTheme.value = isDark
    if (process.client) {
      localStorage.setItem('darkTheme', String(isDark))
    }
    applyTheme(isDark)
  }

  return {
    isDarkTheme,
    initTheme,
    toggleTheme,
    setTheme,
    applyTheme
  }
}
