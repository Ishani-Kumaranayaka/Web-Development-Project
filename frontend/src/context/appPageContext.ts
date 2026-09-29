import { inject, type ComputedRef, type InjectionKey, type Ref } from "vue";
import type {
  Activity,
  CatalogKind,
  Destination,
  Hotel,
  Review,
  TourPackage,
} from "../types";
import type { useTravelStore } from "../stores/travel";

export type CatalogRecord = Destination | Hotel | Activity | TourPackage;
export type BookingRecord = Hotel | TourPackage;

export interface NavigationItem {
  label: string;
  href: string;
}

export interface AppPageContext {
  store: ReturnType<typeof useTravelStore>;
  page: ComputedRef<string>;
  detailKind: ComputedRef<string>;
  detailId: ComputedRef<string>;
  mobileMenu: Ref<boolean>;
  searchText: Ref<string>;
  provinceFilter: Ref<string>;
  categoryFilter: Ref<string>;
  sortBy: Ref<string>;
  modal: Ref<"login" | "register" | "">;
  loginEmail: Ref<string>;
  loginName: Ref<string>;
  loginPassword: Ref<string>;
  loginAsAdmin: Ref<boolean>;
  tripName: Ref<string>;
  tripStart: Ref<string>;
  tripEnd: Ref<string>;
  bookingItem: Ref<string>;
  bookingType: Ref<"Hotel" | "Package">;
  bookingStart: Ref<string>;
  bookingEnd: Ref<string>;
  guests: Ref<number>;
  specialRequest: Ref<string>;
  toast: Ref<string>;
  navItems: NavigationItem[];
  activities: Activity[];
  destinations: Destination[];
  hotels: Hotel[];
  packages: TourPackage[];
  reviews: Review[];
  destinationList: ComputedRef<Destination[]>;
  currentDetail: ComputedRef<CatalogRecord | undefined>;
  bookingOptions: ComputedRef<BookingRecord[]>;
  selectedBooking: ComputedRef<BookingRecord | undefined>;
  bookingNights: ComputedRef<number>;
  bookingTotal: ComputedRef<number>;
  detailReviews: ComputedRef<Review[]>;
  go: (path: string) => void;
  showToast: (message: string) => void;
  toggleSave: (kind: CatalogKind, id: string) => void;
  openDetail: (kind: CatalogKind, id: string) => void;
  createTrip: () => void;
  bookStay: () => void;
  signIn: () => Promise<void>;
  price: (value: number) => string;
  formattedDate: (value: string) => string;
}

export const appPageContextKey: InjectionKey<AppPageContext> =
  Symbol("app-page-context");

export function useAppPageContext(): AppPageContext {
  const context = inject(appPageContextKey);
  if (!context)
    throw new Error("Page components must be rendered inside App.vue");
  return context;
}
