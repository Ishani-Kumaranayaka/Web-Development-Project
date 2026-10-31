<script setup lang="ts">
import { ArrowRight, Compass } from "lucide-vue-next";
import { useAppPageContext } from "../../context/appPageContext";

const { go, showToast, store } = useAppPageContext();
</script>

<template>
  <footer class="site-footer">
    <div class="footer-top">
      <div class="footer-brand-block">
        <button class="brand footer-brand" @click="go('/')">
          <span class="brand-mark"><Compass :size="20" /></span
          ><span>travelmate<span class="brand-period">.</span></span>
        </button>
        <p>Go a little further.<br />Feel a little more.</p>
      </div>
      <div class="footer-links">
        <div>
          <p class="eyebrow">THE ISLAND</p>
          <button @click="go('/destinations')">Destinations</button
          ><button @click="go('/hotels')">Places to stay</button
          ><button @click="go('/activities')">Experiences</button
          ><button @click="go('/packages')">Curated journeys</button>
        </div>
        <div>
          <p class="eyebrow">YOUR TRAVELMATE</p>
          <button @click="go('/planner')">Trip planner</button
          ><button v-if="!store.isAdmin" @click="go('/wishlist')">Saved places</button
          ><button @click="go('/bookings')">Bookings</button
          ><button @click="go('/dashboard')">My account</button>
        </div>
        <div class="footer-newsletter">
          <p class="eyebrow">POSTCARDS FROM HERE</p>
          <span>Good ideas for a little time away.</span>
          <form
            @submit.prevent="
              showToast('You are on the list. Look out for a postcard.')
            "
          >
            <input
              type="email"
              aria-label="Email address"
              placeholder="Your email address"
              required
            /><button aria-label="Subscribe">
              <ArrowRight :size="17" />
            </button>
          </form>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 TravelMate · Thoughtfully made for the curious</span
      ><span>Sri Lanka, with love <span class="footer-heart">♥</span></span
      ><button @click="go('/admin')">Admin</button>
    </div>
  </footer>
</template>
