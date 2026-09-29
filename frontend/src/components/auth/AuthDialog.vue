<script setup lang="ts">
import { ArrowRight, Compass, X } from "lucide-vue-next";
import { useAppPageContext } from "../../context/appPageContext";

const { modal, loginName, loginEmail, loginPassword, loginAsAdmin, signIn } =
  useAppPageContext();
</script>

<template>
  <div v-if="modal" class="modal-backdrop" @click.self="modal = ''">
    <section
      class="auth-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="modal === 'login' ? 'Sign in' : 'Create an account'"
    >
      <button
        class="modal-close quiet-button"
        aria-label="Close"
        @click="modal = ''"
      >
        <X :size="19" /></button
      ><span class="brand-mark modal-mark"><Compass :size="23" /></span>
      <p class="eyebrow">
        {{ modal === "login" ? "WELCOME BACK" : "YOUR ISLAND IS WAITING" }}
      </p>
      <h2>
        {{ modal === "login" ? "Find your way back." : "Let’s go somewhere." }}
      </h2>
      <p>
        {{
          modal === "login"
            ? "Sign in to pick up where you left off."
            : "Create an account and make this island yours."
        }}
      </p>
      <form @submit.prevent="signIn">
        <label v-if="modal === 'register'" class="field-label"
          >YOUR NAME<input
            v-model="loginName"
            required
            placeholder="Alex Morgan" /></label
        ><label class="field-label"
          >EMAIL ADDRESS<input
            v-model="loginEmail"
            required
            type="email"
            placeholder="you@example.com" /></label
        ><label class="field-label"
          >PASSWORD<input
            v-model="loginPassword"
            type="password"
            :required="!loginAsAdmin"
            :minlength="loginAsAdmin ? undefined : 8"
            placeholder="At least 8 characters" /></label
        ><label class="demo-role"
          ><input v-model="loginAsAdmin" type="checkbox" /> Use local admin
          demo</label
        ><button class="button button-dark wide-button" type="submit">
          {{ modal === "login" ? "Sign in" : "Create account" }}
          <ArrowRight :size="16" />
        </button>
      </form>
      <button
        class="modal-switch"
        @click="modal = modal === 'login' ? 'register' : 'login'"
      >
        {{
          modal === "login"
            ? "New here? Create an account"
            : "Already with us? Sign in"
        }}
      </button>
      <p class="demo-disclaimer">
        Demo mode · forms are stored in this browser
      </p>
    </section>
  </div>
</template>
