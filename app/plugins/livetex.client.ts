export default defineNuxtPlugin({
  name: 'livetex-client',
  setup() {
    const config = useRuntimeConfig();
    const loaderSrc = config.public.livetex.loaderSrc as string | undefined;
    const contactPointId = config.public.livetex.contactPointId as string | undefined;

    if (import.meta.dev) console.log('[livetex] plugin setup', { loaderSrc, contactPointId });

    if (!loaderSrc || !contactPointId) {
      console.warn('[livetex] loaderSrc / contactPointId is not set — chat disabled');
      return;
    }

    if (document.getElementById('livetex-loader')) return;

    // Globals the classic client.js reads on load (mirrors the LiveTex install snippet).
    window.liveTex = true;
    window.liveTexID = Number(contactPointId);
    window.liveTex_object = true;

    const script = document.createElement('script');
    script.id = 'livetex-loader';
    script.async = true;
    script.src = loaderSrc;
    // This widget build does not invoke onLiveTexReady, so poll for the API and hide the default
    // label once available — the chat is driven from our own header button.
    script.onload = () => {
      const start = Date.now();
      const timer = setInterval(() => {
        if (typeof window.LiveTex?.hideLabel === 'function') {
          clearInterval(timer);
          window.LiveTex.hideLabel();
          if (import.meta.dev) console.log('[livetex] ready — hideLabel called');
        } else if (Date.now() - start >= 10_000) {
          clearInterval(timer);
        }
      }, 200);
    };
    script.onerror = e => console.error('[livetex] client.js failed to load', e);
    document.head.appendChild(script);
  },
});
