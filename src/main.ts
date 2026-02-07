import { createApp } from "vue";
import "./style.scss";
import App from "./App.vue";
import router from "./router.ts";
import { registerSW } from "virtual:pwa-register";
import { createGtm, useGtm } from '@gtm-support/vue-gtm';

// Service Workerの登録
registerSW({
  immediate: true,
  onRegistered(r) {
    console.log("SW Registered: ", r);
  },
  onRegisterError(error) {
    console.log("SW registration error", error);
  },
});

const app = createApp(App);

if (import.meta.env.PROD && navigator.onLine) {
  app.use(createGtm({
    id: import.meta.env.VITE_GTM_ID,
    defer: false, 
    compatibility: false,
    enabled: navigator.onLine,
    debug: import.meta.env.DEV,
    loadScript: true,
    //vueRouter: router,
    trackOnNextTick: false,
  }));
}

function getURL(path) {
  return location.origin + location.pathname.replace(/\/$/, "") + path
}

router.afterEach((to, from) => {
  const title = (to.meta.title as string) || 'Dレジ';
  document.title = title;
  
  const gtm = useGtm()
  if (gtm) {
    gtm.trackEvent({
      event: "content-view",
      page_referrer: getURL(from.fullPath),
      page_location: getURL(to.fullPath)
    })
  }
});

app.use(router);
app.mount("#app");
