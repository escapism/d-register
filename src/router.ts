import { createRouter, createWebHashHistory } from 'vue-router'
import RegisterView from '@/views/RegisterView.vue'
import ProductAdminView from '@/views/ProductAdminView.vue'
import SalesView from '@/views/SalesView.vue'
import SettingsView from '@/views/SettingsView.vue'
import SalesCancelView from '@/views/SalesCancelView.vue'
import AboutView from '@/views/AboutView.vue'
import AboutNotesView from '@/views/AboutNotesView.vue'
import ProductCategoryAdminView from '@/views/ProductAdminCategoryView.vue'
import SettingsProductView from '@/views/SettingsProductView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: RegisterView},
    { path: '/admin', component: ProductAdminView, meta: {title: "頒布物登録・編集"} },
    { path: '/admin/category', component: ProductCategoryAdminView, meta: {title: "カテゴリー管理"} },
    { path: '/sales', component: SalesView, meta: {title: "売上確認"} },
    { path: '/sales/cancel', component: SalesCancelView, meta: {title: "精算履歴・取消"} },
    { path: '/settings', component: SettingsView, meta: {title: "設定"} },
    { path: '/settings/product', component: SettingsProductView, meta: {title: "頒布物設定"} },
    { path: '/about', component: AboutView, meta: {title: "このアプリについて"} },
    { path: '/about/notes', component: AboutNotesView, meta: {title: "ご利用上の注意"} },
  ],
  scrollBehavior() {return {top: 0}},
})

export default router