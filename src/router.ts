import { createRouter, createWebHashHistory } from "vue-router";
import RegisterView from "./views/RegisterView.vue";
import ProductAdminView from "./views/ProductAdminView.vue";
import SalesView from "./views/SalesView.vue";
import SettingsView from "./views/SettingsView.vue";
import SalesCancelView from "./views/SalesCancelView.vue";
import AboutView from "./views/AboutView.vue";
import AboutNotesView from "./views/AboutNotesView.vue";
import ProductAdminTermView from "./views/ProductAdminTermView.vue";
import SettingsProductView from "./views/SettingsProductView.vue";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "hone", component: RegisterView },
    {
      path: "/admin",
      name: "admin",
      component: ProductAdminView,
      meta: { title: "頒布物登録・編集" },
    },
    {
      path: "/admin/terms/:tax",
      name: "admin-term",
      component: ProductAdminTermView,
      meta: { title: "管理" },
    },
    {
      path: "/sales",
      name: "sales",
      component: SalesView,
      meta: { title: "売上確認" },
    },
    {
      path: "/sales/cancel",
      name: "sales-cancel",
      component: SalesCancelView,
      meta: { title: "精算履歴・取消" },
    },
    {
      path: "/settings",
      name: "setting",
      component: SettingsView,
      meta: { title: "設定" },
    },
    {
      path: "/settings/product",
      name: "setting-product",
      component: SettingsProductView,
      meta: { title: "頒布物設定" },
    },
    {
      path: "/about",
      name: "about",
      component: AboutView,
      meta: { title: "このアプリについて" },
    },
    {
      path: "/about/notes",
      name: "about-note",
      component: AboutNotesView,
      meta: { title: "ご利用上の注意" },
    },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
