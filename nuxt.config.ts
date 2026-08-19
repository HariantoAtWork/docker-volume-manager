// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'dark'
  },
  icon: {
    serverBundle: {
      collections: ['lucide']
    },
    clientBundle: {
      scan: true,
      sizeLimitKb: 512
    },
    fallbackToApi: false
  },
  runtimeConfig: {
    dockerSocket: '',
    dockerHost: '',
    dockerVolumesDir: '',
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
  }
})
