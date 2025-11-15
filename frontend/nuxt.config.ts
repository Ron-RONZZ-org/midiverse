// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // HTTPS configuration
  devServer: {
    https: {
      key: './server.key',
      cert: './server.crt'
    },
    port: 3001
  },

  // Runtime config for API access
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000'
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
