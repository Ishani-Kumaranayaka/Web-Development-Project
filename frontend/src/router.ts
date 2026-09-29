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

router.beforeEach((to) => {
  const user = useTravelStore().user;

  if (to.path === "/admin/dashboard") {
    if (!user) return { path: "/login", query: { redirect: to.fullPath } };
    if (user.role !== "ADMIN") return "/dashboard";
  }

  if (to.path === "/dashboard") {
    if (!user) return { path: "/login", query: { redirect: to.fullPath } };
    if (user.role === "ADMIN") return "/admin/dashboard";
  }
});

export default router;
