import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import { useTravelStore } from "./stores/travel";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: App, meta: { page: "home" } },
    { path: "/admin", redirect: "/admin/dashboard" },
    {
      path: "/admin/dashboard",
      component: App,
      meta: { page: "admin", requiresAdmin: true },
    },
    {
      path: "/:page(destinations|hotels|activities|packages|planner|wishlist|bookings|dashboard|admin|login|register|profile)",
      component: App,
    },
    {
      path: "/:kind(destination|hotel|activity|package)/:id",
      component: App,
      meta: { page: "detail" },
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior: () => ({ top: 0, behavior: "smooth" }),
});

router.beforeEach(async to => {
  const store = useTravelStore()

  await store.restoreSession()

  const targetPath =
    to.path.replace(/\/+$/, '').toLowerCase() || '/'

  const protectedPaths = [
    '/planner',
    '/wishlist',
    '/bookings',
    '/dashboard',
    '/profile',
    '/admin/dashboard',
  ]

  const requiresAdmin =
    targetPath === '/admin/dashboard' ||
    Boolean(to.meta.requiresAdmin)

  if (
    (protectedPaths.includes(targetPath) || requiresAdmin) &&
    !store.user
  ) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  if (requiresAdmin && !store.isAdmin) {
    return '/dashboard'
  }

  if (targetPath === '/dashboard' && store.isAdmin) {
    return '/admin/dashboard'
  }

  if (
    (targetPath === '/login' || targetPath === '/register') &&
    store.user
  ) {
    return store.isAdmin
      ? '/admin/dashboard'
      : '/dashboard'
  }
})

export default router;
