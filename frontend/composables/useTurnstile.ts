export const useTurnstile = () => {
  const config = useRuntimeConfig()
  const siteKey = config.public.turnstileSiteKey
  const isConfigured = siteKey && siteKey !== '' && siteKey !== 'your-turnstile-site-key'

  const loadTurnstileScript = () => {
    return new Promise<void>((resolve, reject) => {
      // Skip if not configured
      if (!isConfigured) {
        resolve()
        return
      }

      // Check if script already loaded
      if (window.turnstile) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Turnstile script'))
      document.head.appendChild(script)
    })
  }

  const renderTurnstile = (containerId: string, callback: (token: string) => void) => {
    return new Promise<string>((resolve, reject) => {
      // Skip if not configured
      if (!isConfigured) {
        console.warn('Turnstile site key not configured, skipping widget rendering')
        callback('dev-bypass-token') // Provide a dummy token for development
        resolve('dev-bypass')
        return
      }

      loadTurnstileScript()
        .then(() => {
          if (!window.turnstile) {
            reject(new Error('Turnstile not loaded'))
            return
          }

          const widgetId = window.turnstile.render(`#${containerId}`, {
            sitekey: siteKey,
            callback: (token: string) => {
              callback(token)
              resolve(widgetId)
            },
            'error-callback': () => {
              reject(new Error('Turnstile verification failed'))
            },
            theme: 'light',                                                                                                      │
            size: 'normal',
          })
        })
        .catch(reject)
    })
  }

  const resetTurnstile = (widgetId?: string) => {
    if (window.turnstile && widgetId) {
      window.turnstile.reset(widgetId)
    }
  }

  const removeTurnstile = (widgetId?: string) => {
    if (window.turnstile && widgetId) {
      window.turnstile.remove(widgetId)
    }
  }

  return {
    siteKey,
    isConfigured,
    loadTurnstileScript,
    renderTurnstile,
    resetTurnstile,
    removeTurnstile,
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          'error-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          size?: 'normal' | 'compact'
        },
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}
