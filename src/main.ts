import { createApp } from "vue";
import "./style.scss";
import App from "./App.vue";
import router from "./router.ts";
import { registerSW } from "virtual:pwa-register";
import { createGtm } from '@gtm-support/vue-gtm';

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
    enabled: true,
    debug: false,
    loadScript: true,
    vueRouter: router,
    trackOnNextTick: false,
  }));
}

app.use(router);
app.mount("#app");
