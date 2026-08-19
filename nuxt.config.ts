// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'dark'
  },
  runtimeConfig: {
    dockerSocket: '',
    dockerHost: '',
    volumeBind: '',
    volumePath: '',
    helperImage: 'alpine:3.21',
    public: {
      volumeBind: ''
    }
  },
  app: {
    head: {
      title: 'Harbour — Docker Volume Manager',
      htmlAttrs: {
        lang: 'en-GB'
      },
      meta: [
        { name: 'description', content: 'Inspect Docker volumes and edit the files they hold.' }
      ]
    }
  },
  vite: {
    optimizeDeps: {
      include: ['monaco-editor']
    }
  },
  nitro: {
    publicAssets: [
      {
        baseURL: '/monaco',
        dir: 'node_modules/monaco-editor/min',
        maxAge: 60 * 60 * 24 * 7
      }
    ]
  }
})
