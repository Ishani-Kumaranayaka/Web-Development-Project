<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { ArrowRight, ArrowUpRight, Heart } from "lucide-vue-next";

import { activities, packages } from "../../data";
import { destinations, hotels } from "../../services/catalog";
import { useAppPageContext } from "../../context/appPageContext";
import type { CatalogKind } from "../../types";

const emit = defineEmits<{
  (event: "toast", message: string): void;
}>();

const router = useRouter();
const { store, modal } = useAppPageContext();

const wishlistCards = computed(() => {
  // Never display saved items while signed out.
  if (!store.user) return [];

  return store.wishlist.flatMap((item) => {
    const source =
      item.kind === "destination"
        ? destinations
        : item.kind === "hotel"
          ? hotels
          : item.kind === "activity"
            ? activities
            : packages;

    const found = source.find(
      (entry) => entry.id === item.itemId,
    );

    return found ? [{ ...found, kind: item.kind }] : [];
  });
});

function openDetail(kind: CatalogKind, id: string): void {
  void router.push(`/${kind}/${id}`);
}

function removeItem(kind: CatalogKind, id: string): void {
  if (!store.user) {
    openSignIn();
    return;
  }

  store.toggleWishlist(kind, id);
  emit("toast", "Removed from your saved list");
}

function browseDestinations(): void {
  void router.push("/destinations");
}

function openSignIn(): void {
  modal.value = "login";
}
</script>

<template>
  <main class="content-page workspace-page">
    <div class="workspace-heading">
      <div>
        <p class="eyebrow">YOUR TRAVELMATE / SAVED</p>
        <h1>
          Little things to<br />
          <em>look forward to.</em>
        </h1>
      </div>

      <p>
        A collection of places, stays and experiences
        that caught your eye.
      </p>
    </div>

    <!-- Signed-out visitors see this message. -->
    <div v-if="!store.user" class="empty-state">
      <Heart :size="27" />

      <h3>Sign in to view your wishlist</h3>

      <p>
        Save your favourite places and stays
        in your own account.
      </p>

      <button
        type="button"
        class="button button-dark"
        @click="openSignIn"
      >
        Sign in
        <ArrowRight :size="16" />
      </button>
    </div>

    <!-- Signed-in users see their saved items. -->
    <div
      v-else-if="wishlistCards.length"
      class="catalog-grid saved-grid"
    >
      <article
        v-for="item in wishlistCards"
        :key="`${item.kind}-${item.id}`"
        class="catalog-card"
        @click="openDetail(item.kind, item.id)"
      >
        <div class="catalog-image">
          <img :src="item.image" :alt="item.name" />

          <span class="catalog-tag">
            {{ item.kind }}
          </span>

          <button
            type="button"
            class="save-button saved"
            :aria-label="`Remove ${item.name} from saved items`"
            @click.stop="removeItem(item.kind, item.id)"
          >
            <Heart :size="17" fill="currentColor" />
          </button>
        </div>

        <div class="catalog-card-copy">
          <div class="catalog-title-row">
            <h3>{{ item.name }}</h3>

            <button
              type="button"
              class="round-arrow"
              :aria-label="`View ${item.name}`"
              @click.stop="openDetail(item.kind, item.id)"
            >
              <ArrowUpRight :size="18" />
            </button>
          </div>

          <p>{{ item.description }}</p>
        </div>
      </article>
    </div>

    <!-- Signed-in users with no saved items see this. -->
    <div v-else class="empty-state">
      <Heart :size="27" />

      <h3>Your wishlist is empty</h3>

      <p>
        Tap the heart on a destination, stay or experience
        to save it here.
      </p>

      <button
        type="button"
        class="button button-dark"
        @click="browseDestinations"
      >
        Explore destinations
        <ArrowRight :size="16" />
      </button>
    </div>
  </main>
</template>