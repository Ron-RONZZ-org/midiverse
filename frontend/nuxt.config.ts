import { existsSync } from 'fs'
import { resolve } from 'path'

// Check if SSL certificates exist
const keyPath = resolve(process.cwd(), 'server.key')
const certPath = resolve(process.cwd(), 'server.crt')
const hasSSLCerts = existsSync(keyPath) && existsSync(certPath)

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Modules
  modules: ['@nuxtjs/i18n'],

  // i18n configuration
  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' },
      { code: 'eo', name: 'Esperanto', file: 'eo.json' }
    ],
    lazy: true,
    langDir: 'locales',
    defaultLocale: 'en',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: false,
      fallbackLocale: 'en'
    }
  },

  // HTTPS configuration (optional - only if certificates exist)
  devServer: {
    ...(hasSSLCerts && {
      https: {
        key: keyPath,
        cert: certPath
      }
    }),
    port: 3001
  },

  // Runtime config for API access
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api',
      turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || ''
    }
  },

  // App configuration
  app: {
    head: {
      title: 'Midiverse - Markmap Visualization',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Create and visualize markmaps with Midiverse' }
      ]
    }
  },

  css: ['~/assets/css/main.css']
})
