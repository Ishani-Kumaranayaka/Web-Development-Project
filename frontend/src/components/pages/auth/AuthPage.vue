<script setup lang="ts">
import { ArrowRight, ArrowUpRight } from "lucide-vue-next";
import { useAppPageContext } from "../../../context/appPageContext";

const { destinations, modal } = useAppPageContext();
</script>

<template>
  <main class="content-page auth-page">
    <div class="auth-image">
      <img
        v-if="destinations.length"
        :src="destinations[0]?.image"
        alt="Sri Lanka's highlands"
      />
      <span>YOUR ISLAND, YOUR WAY.</span>
    </div>

    <div class="auth-copy">
      <p class="eyebrow">TRAVELMATE / YOUR ACCOUNT</p>

      <h1>
        Good journeys<br />
        start <em>somewhere.</em>
      </h1>

      <p>
        Keep your saved places, plans and island memories together.
      </p>

      <button
        type="button"
        class="button button-dark"
        @click="modal = 'login'"
      >
        Sign in
        <ArrowRight :size="16" />
      </button>

      <button
        type="button"
        class="text-link auth-register"
        @click="modal = 'register'"
      >
        New to TravelMate? Create an account
        <ArrowUpRight :size="15" />
      </button>
    </div>
  </main>
</template>