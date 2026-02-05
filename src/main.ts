import { createApp } from "vue";
import "./style.scss";
import App from "./App.vue";
import router from "./router.ts";
import { registerSW } from "virtual:pwa-register";

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
app.use(router);
app.mount("#app");
