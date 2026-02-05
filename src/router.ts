// src/router/index.ts など
import { createRouter, createWebHashHistory } from 'vue-router'
import RegisterView from './views/RegisterView.vue'
import ProductAdminView from './views/ProductAdminView.vue'
import SalesView from './views/SalesView.vue'
import SettingsView from './views/SettingsView.vue'
import SalesCancelView from './views/SalesCancelView.vue'
import AboutView from './views/AboutView.vue'
import AboutNotesView from './views/AboutNotesView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: RegisterView },
    { path: '/admin', component: ProductAdminView },
    { path: '/sales', component: SalesView },
    { path: '/sales/cancel', component: SalesCancelView },
    { path: '/settings', component: SettingsView },
    { path: '/about', component: AboutView },
    { path: '/about/notes', component: AboutNotesView },
  ]
})
export default router