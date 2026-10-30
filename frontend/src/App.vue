<script setup lang="ts">
import { computed, provide, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { activities, packages, reviews } from "./data";
import { onMounted } from "vue";
import "./styles/catalog-notice.css";
import { destinations, hotels, catalogStatus, loadCatalog } from "./services/catalog";
import AppHeader from "./components/layout/AppHeader.vue";
import SiteFooter from "./components/layout/SiteFooter.vue";
import AuthDialog from "./components/auth/AuthDialog.vue";
import ToastNotification from "./components/feedback/ToastNotification.vue";
import FloatingTripPlanner from "./components/feedback/FloatingTripPlanner.vue";
import CatalogPage from "./components/pages/catalog/CatalogPage.vue";
import DetailPage from "./components/pages/catalog/DetailPage.vue";
import TripPlannerPage from "./components/pages/trips/TripPlannerPage.vue";
import BookingsPage from "./components/pages/bookings/BookingsPage.vue";
import UserDashboardPage from "./components/pages/dashboard/UserDashboardPage.vue";
import AdminDashboardPage from "./components/pages/admin/AdminDashboardPage.vue";
import AuthPage from "./components/pages/auth/AuthPage.vue";
import MainPage from "./components/pages/MainPage.vue";
import WishlistPage from "./components/pages/WishlistPage.vue";
import { appPageContextKey } from "./context/appPageContext";
import { api } from "./services/api";
import { useTravelStore } from "./stores/travel";
import type { CatalogKind } from "./types";

const route = useRoute();
const router = useRouter();
const store = useTravelStore();
function reloadCatalog(): void {
  void loadCatalog().catch(() => { /* Error is shown in the banner. */ });
}
onMounted(reloadCatalog);
const detailKind = computed(() => String(route.params.kind ?? ""));
const detailId = computed(() => String(route.params.id ?? ""));
const page = computed(() =>
  detailKind.value
    ? "detail"
    : String(route.params.page ?? route.meta.page ?? "home"),
);
const mobileMenu = ref(false);
const searchText = ref("");
const provinceFilter = ref("All regions");
const categoryFilter = ref("All types");
const sortBy = ref("Recommended");
const modal = ref<"login" | "register" | "">("");
const loginEmail = ref("");
const loginName = ref("");
const loginPassword = ref("");
const tripName = ref("");
const tripStart = ref("2026-11-04");
const tripEnd = ref("2026-11-12");
const bookingItem = ref("tea-trails");
const bookingType = ref<"Hotel" | "Package">("Hotel");
const bookingStart = ref("2026-11-06");
const bookingEnd = ref("2026-11-09");
const guests = ref(2);
const specialRequest = ref("");
const toast = ref("");

const navItems = [
  { label: "Destinations", href: "/destinations" },
  { label: "Stays", href: "/hotels" },
  { label: "Experiences", href: "/activities" },
  { label: "Journeys", href: "/packages" },
];
const destinationList = computed(() => {
  const search = searchText.value.trim().toLowerCase();
  const filtered = destinations.filter((item) => {
    const matchesSearch =
      !search ||
      `${item.name} ${item.location} ${item.description} ${item.category}`
        .toLowerCase()
        .includes(search);
    return (
      matchesSearch &&
      (provinceFilter.value === "All regions" ||
        item.province === provinceFilter.value) &&
      (categoryFilter.value === "All types" ||
        item.category === categoryFilter.value)
    );
  });
  if (sortBy.value === "Price: low to high")
    return [...filtered].sort((a, b) => a.averageCost - b.averageCost);
  if (sortBy.value === "Top rated")
    return [...filtered].sort((a, b) => b.rating - a.rating);
  return filtered;
});
const currentDetail = computed(() => {
  if (detailKind.value === "destination")
    return destinations.find((item) => item.id === detailId.value);
  if (detailKind.value === "hotel")
    return hotels.find((item) => item.id === detailId.value);
  if (detailKind.value === "activity")
    return activities.find((item) => item.id === detailId.value);
  if (detailKind.value === "package")
    return packages.find((item) => item.id === detailId.value);
  return undefined;
});
const bookingOptions = computed(() =>
  bookingType.value === "Hotel" ? hotels : packages,
);
const selectedBooking = computed(() =>
  bookingOptions.value.find((item) => item.id === bookingItem.value),
);
const bookingNights = computed(() =>
  Math.max(
    1,
    Math.ceil(
      (new Date(bookingEnd.value).getTime() -
        new Date(bookingStart.value).getTime()) /
        86400000,
    ),
  ),
);
const bookingTotal = computed(() => {
  if (!selectedBooking.value) return 0;
  return bookingType.value === "Hotel" &&
    "pricePerNight" in selectedBooking.value
    ? selectedBooking.value.pricePerNight * bookingNights.value
    : "price" in selectedBooking.value
      ? selectedBooking.value.price * guests.value
      : 0;
});
const detailReviews = computed(() =>
  [...reviews, ...store.userReviews].filter(
    (review) => review.itemId === detailId.value,
  ),
);
watch(bookingType, () => {
  bookingItem.value = bookingOptions.value[0]?.id ?? "";
});

function go(path: string): void {
  mobileMenu.value = false;
  void router.push(path);
}
function showToast(message: string): void {
  toast.value = message;
  window.setTimeout(() => {
    toast.value = "";
  }, 2600);
}
function toggleSave(kind: CatalogKind, id: string): void {
   if (!requireAccount()) return
  const exists = store.wishlist.some(
    (item) => item.kind === kind && item.itemId === id,
  );
  store.toggleWishlist(kind, id);
  showToast(exists ? "Removed from your saved list" : "Saved for later");
}
function openDetail(kind: CatalogKind, id: string): void {
  void router.push(`/${kind}/${id}`);
}
function createTrip(): void {
  if (!requireAccount()) return
  if (
    !tripName.value.trim() ||
    !tripStart.value ||
    !tripEnd.value ||
    tripEnd.value < tripStart.value
  )
    return;
   
  store.createTrip(tripName.value.trim(), tripStart.value, tripEnd.value);
  tripName.value = "";
  showToast("Your new journey is ready");
}
function bookStay(): void {
  if (!requireAccount()) return
  if (
    !selectedBooking.value ||
    !bookingStart.value ||
    !bookingEnd.value ||
    bookingEnd.value <= bookingStart.value
  )
    return;
  store.createBooking({
    itemName: selectedBooking.value.name,
    itemType: bookingType.value,
    checkIn: bookingStart.value,
    checkOut: bookingEnd.value,
    guests: guests.value,
    totalPrice: bookingTotal.value,
  });
  showToast("Booking request received");
  void router.push("/bookings");
}
async function signIn(): Promise<void> {
  try {
    const email = loginEmail.value.trim().toLowerCase();

    const response =
      modal.value === "register"
        ? await api.register({
            name: loginName.value.trim(),
            email,
            password: loginPassword.value,
          })
        : await api.login({
            email,
            password: loginPassword.value,
          });

    api.setToken(response.data.token);
    store.user = response.data.user;

    // Close the popup only after success.
    modal.value = "";
    loginPassword.value = "";

    showToast("Welcome to TravelMate");

    await router.push(
      response.data.user.role === "ADMIN"
        ? "/admin/dashboard"
        : "/dashboard",
    );
  } catch (error) {
    // Show the error and keep the popup open.
    showToast(api.getErrorMessage(error));
  }
}

function signOut(): void {
  store.logout()
  modal.value = ''
  mobileMenu.value = false
  showToast('You are signed out')
  void router.replace('/')
}

watch(() => store.user?.id, () => {
  mobileMenu.value = false
  modal.value = ''

  loginName.value = ''
  loginEmail.value = ''
  loginPassword.value = ''

  tripName.value = ''
  tripStart.value = ''
  tripEnd.value = ''

  bookingStart.value = ''
  bookingEnd.value = ''
  specialRequest.value = ''
  guests.value = 2

  bookingType.value = 'Hotel'
  bookingItem.value = bookingOptions.value[0]?.id ?? ''
}, { flush: 'sync' })

function requireAccount(): boolean {
  if (store.user) return true

  modal.value = 'login'
  showToast('Please sign in first.')
  return false
}

function price(value: number): string {
  return `$${value.toLocaleString()}`;
}
function formattedDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

provide(appPageContextKey, {
  store,
  page,
  detailKind,
  detailId,
  mobileMenu,
  searchText,
  provinceFilter,
  categoryFilter,
  sortBy,
  modal,
  loginEmail,
  loginName,
  loginPassword,
  tripName,
  tripStart,
  tripEnd,
  bookingItem,
  bookingType,
  bookingStart,
  bookingEnd,
  guests,
  specialRequest,
  toast,
  navItems,
  activities,
  destinations,
  hotels,
  packages,
  reviews,
  destinationList,
  currentDetail,
  bookingOptions,
  selectedBooking,
  bookingNights,
  bookingTotal,
  detailReviews,
  go,
  showToast,
  toggleSave,
  openDetail,
  createTrip,
  bookStay,
  signIn,
  signOut,
  price,
  formattedDate,
});
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <div
  v-if="store.sessionError"
  class="catalog-notice catalog-notice-error"
  role="alert"
>
  {{ store.sessionError }}
</div>

    <div v-if="catalogStatus.loading" class="catalog-notice" role="status">
      Loading destinations and stays...
    </div>
    <div v-else-if="catalogStatus.error" class="catalog-notice catalog-notice-error" role="alert">
      Could not load destinations and stays: {{ catalogStatus.error }}
      <button type="button" class="button button-outline button-small" @click="reloadCatalog">Try again</button>
    </div>

    <MainPage
      v-if="page === 'home'"
      v-model:search-text="searchText"
      @navigate="go"
      @save="toggleSave"
      @detail="openDetail"
    />

    <CatalogPage
      v-else-if="
        ['destinations', 'hotels', 'activities', 'packages'].includes(page)
      "
    />

    <DetailPage v-else-if="detailKind" />

    <TripPlannerPage v-else-if="page === 'planner'" />

    <WishlistPage v-else-if="page === 'wishlist'" @toast="showToast" />

    <BookingsPage v-else-if="page === 'bookings'" />

    <UserDashboardPage v-else-if="page === 'dashboard' || page === 'profile'" />

    <AdminDashboardPage v-else-if="page === 'admin'" />

   <AuthPage v-else />

    <SiteFooter />
    <AuthDialog />
    <ToastNotification /><FloatingTripPlanner v-if="page === 'home'" />
  </div>
</template>
