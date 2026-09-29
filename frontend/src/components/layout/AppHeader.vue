<script setup lang="ts">
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Compass,
  Heart,
  Menu,
  X,
} from "lucide-vue-next";
import { useAppPageContext } from "../../context/appPageContext";

const { go, page, store, mobileMenu, navItems, modal } = useAppPageContext();
</script>

<template>
  <header class="topbar">
    <button class="brand" aria-label="TravelMate home" @click="go('/')">
      <span class="brand-mark"><Compass :size="21" :stroke-width="1.8" /></span
      ><span>travelmate<span class="brand-period">.</span></span>
    </button>
    <nav class="desktop-nav" aria-label="Main navigation">
      <button
        v-for="item in navItems"
        :key="item.href"
        :class="{ active: page === item.href.slice(1) }"
        @click="go(item.href)"
      >
        {{ item.label }}
      </button>
    </nav>
    <div class="top-actions">
      <button
        class="icon-button nav-wishlist"
        title="Saved places"
        aria-label="Saved places"
        @click="go('/wishlist')"
      >
        <Heart :size="19" /><span
          v-if="store.wishlist.length"
          class="count-dot"
          >{{ store.wishlist.length }}</span
        ></button
      ><button
        v-if="store.user?.role === 'ADMIN'"
        class="button button-outline button-small"
        @click="go('/admin/dashboard')"
      >
        Admin dashboard
      </button>
      <button
        v-if="!store.user"
        class="button button-outline button-small register-button"
        @click="modal = 'register'"
      >
        Create account
      </button>
      <button
        v-if="store.user"
        class="profile-button"
        @click="go('/dashboard')"
      >
        <span class="avatar">{{
          store.user.name
            .split(" ")
            .map((name) => name[0])
            .join("")
            .slice(0, 2)
        }}</span
        ><span class="profile-name">{{ store.user.name.split(" ")[0] }}</span
        ><ChevronDown :size="15" /></button
      ><button
        v-else
        class="button button-dark button-small"
        @click="modal = 'login'"
      >
        Sign in <ArrowUpRight :size="15" /></button
      ><button
        class="mobile-toggle icon-button"
        aria-label="Toggle navigation"
        @click="mobileMenu = !mobileMenu"
      >
        <X v-if="mobileMenu" :size="21" /><Menu v-else :size="21" />
      </button>
    </div>
    <nav v-if="mobileMenu" class="mobile-menu" aria-label="Mobile navigation">
      <button v-for="item in navItems" :key="item.href" @click="go(item.href)">
        {{ item.label }} <ArrowRight :size="16" /></button
      ><button v-if="!store.user" @click="modal = 'login'">
        Sign in <ArrowRight :size="16" /></button
      ><button v-if="!store.user" @click="modal = 'register'">
        Create account <ArrowRight :size="16" /></button
      ><button
        v-if="store.user?.role === 'ADMIN'"
        @click="go('/admin/dashboard')"
      >
        Admin dashboard <ArrowRight :size="16" /></button
      ><button @click="go('/planner')">
        My trip planner <ArrowRight :size="16" /></button
      ><button @click="go('/dashboard')">
        Dashboard <ArrowRight :size="16" />
      </button>
    </nav>
  </header>
</template>
