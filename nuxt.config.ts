export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: '2024-11-01',
  modules: ['@pinia/nuxt', 'nuxt-svgo'],
  runtimeConfig: {
    public: {
      livetex: {
        loaderSrc: process.env.NUXT_PUBLIC_LIVETEX_LOADER_SRC,
        contactPointId: process.env.NUXT_PUBLIC_LIVETEX_CONTACT_POINT_ID,
      },
    },
  },
})
