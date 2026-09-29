<script setup lang="ts">
import { ArrowRight } from "lucide-vue-next";

const emit = defineEmits<{
  (event: "explore"): void;
}>();
</script>

<template>
  <section class="hero-wrap">
    <div class="hero-image"></div>
    <div class="hero-copy">
      <p class="eyebrow light"><span></span> YOUR ISLAND, YOUR WAY</p>
      <h1>Explore.<br />Experience.<br /><em>Remember.</em></h1>
      <p class="hero-subtitle">
        Plan unforgettable journeys and discover the best destinations, stays
        and experiences.
      </p>
      <button class="button button-lime" @click="emit('explore')">
        Find your somewhere <ArrowRight :size="17" />
      </button>
    </div>
    <div class="hero-caption">
      <span>01 / 06</span><span>Ella, Sri Lanka</span
      ><span class="caption-line"></span>
    </div>
    <div class="hero-vertical">
      CURATED ISLAND JOURNEYS <span>·</span> EST. 2024
    </div>
  </section>
</template>
